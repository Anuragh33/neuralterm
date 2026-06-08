use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    io::{Read, Write},
    sync::{Arc, Mutex},
    thread,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter, State};

pub struct PtyState {
    sessions: Arc<Mutex<HashMap<String, PtyProcess>>>,
}

impl Default for PtyState {
    fn default() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

struct PtyProcess {
    master: Box<dyn MasterPty + Send>,
    writer: Box<dyn Write + Send>,
    child: Box<dyn Child + Send>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpawnPtyRequest {
    pub session_id: String,
    pub command: Option<String>,
    pub cwd: Option<String>,
    pub cols: u16,
    pub rows: u16,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PtySpawned {
    pub session_id: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PtyData {
    pub session_id: String,
    pub data: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PtyFailure {
    pub session_id: String,
    pub message: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AiBridgeSuggestion {
    pub id: String,
    pub session_id: String,
    pub title: String,
    pub excerpt: String,
    pub created_at: String,
}

#[tauri::command]
pub fn spawn_pty(
    app: AppHandle,
    state: State<'_, PtyState>,
    request: SpawnPtyRequest,
) -> Result<PtySpawned, String> {
    {
        let sessions = state
            .sessions
            .lock()
            .map_err(|_| "PTY state lock was poisoned".to_string())?;
        if sessions.contains_key(&request.session_id) {
            return Ok(PtySpawned {
                session_id: request.session_id,
            });
        }
    }

    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows: request.rows.max(1),
            cols: request.cols.max(1),
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|error| error.to_string())?;

    let mut command = build_command(request.command.as_deref());
    if let Some(cwd) = request.cwd.as_ref().filter(|cwd| !cwd.is_empty()) {
        command.cwd(cwd);
    }

    let mut child = pair
        .slave
        .spawn_command(command)
        .map_err(|error| error.to_string())?;
    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|error| error.to_string())?;
    let writer = pair
        .master
        .take_writer()
        .map_err(|error| error.to_string())?;

    let session_id = request.session_id.clone();
    let event_session_id = request.session_id.clone();
    let reader_sessions = Arc::clone(&state.sessions);
    {
        let mut sessions = state
            .sessions
            .lock()
            .map_err(|_| "PTY state lock was poisoned".to_string())?;
        if sessions.contains_key(&request.session_id) {
            // A concurrent spawn raced us; clean up and return the existing session.
            let _ = child.kill();
            return Ok(PtySpawned { session_id });
        }
        sessions.insert(
            request.session_id.clone(),
            PtyProcess {
                master: pair.master,
                writer,
                child,
            },
        );
    }

    thread::spawn(move || {
        let mut buffer = [0_u8; 8192];
        let mut carry: Vec<u8> = Vec::new();
        let mut last_bridge_alert = Instant::now() - Duration::from_secs(60);
        loop {
            match reader.read(&mut buffer) {
                Ok(0) => {
                    let _ = app.emit(
                        "pty-exit",
                        PtyFailure {
                            session_id: event_session_id.clone(),
                            message: "PTY stream closed".to_string(),
                        },
                    );
                    remove_finished_pty(&reader_sessions, &event_session_id);
                    break;
                }
                Ok(size) => {
                    carry.extend_from_slice(&buffer[..size]);
                    let boundary = last_complete_utf8_boundary(&carry);
                    let data = String::from_utf8_lossy(&carry[..boundary]).to_string();
                    carry = carry[boundary..].to_vec();
                    if data.is_empty() {
                        continue;
                    }
                    if let Some(title) = detect_error_title(&data) {
                        if last_bridge_alert.elapsed() >= Duration::from_secs(12) {
                            last_bridge_alert = Instant::now();
                            let _ = app.emit(
                                "ai-bridge-suggestion",
                                AiBridgeSuggestion {
                                    id: format!("bridge-{}-{}", event_session_id, now_millis()),
                                    session_id: event_session_id.clone(),
                                    title,
                                    excerpt: excerpt(&data),
                                    created_at: now_millis().to_string(),
                                },
                            );
                        }
                    }
                    let _ = app.emit(
                        "pty-data",
                        PtyData {
                            session_id: event_session_id.clone(),
                            data,
                        },
                    );
                }
                Err(error) => {
                    let _ = app.emit(
                        "pty-error",
                        PtyFailure {
                            session_id: event_session_id.clone(),
                            message: error.to_string(),
                        },
                    );
                    remove_finished_pty(&reader_sessions, &event_session_id);
                    break;
                }
            }
        }
    });

    Ok(PtySpawned { session_id })
}

fn remove_finished_pty(sessions: &Arc<Mutex<HashMap<String, PtyProcess>>>, session_id: &str) {
    if let Ok(mut sessions) = sessions.lock() {
        sessions.remove(session_id);
    }
}

#[tauri::command]
pub fn write_pty(
    state: State<'_, PtyState>,
    session_id: String,
    data: String,
) -> Result<(), String> {
    let mut sessions = state
        .sessions
        .lock()
        .map_err(|_| "PTY state lock was poisoned".to_string())?;
    let session = sessions
        .get_mut(&session_id)
        .ok_or_else(|| format!("No PTY session found for {session_id}"))?;

    session
        .writer
        .write_all(data.as_bytes())
        .map_err(|error| error.to_string())?;
    session.writer.flush().map_err(|error| error.to_string())
}

#[tauri::command]
pub fn resize_pty(
    state: State<'_, PtyState>,
    session_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let sessions = state
        .sessions
        .lock()
        .map_err(|_| "PTY state lock was poisoned".to_string())?;
    let session = sessions
        .get(&session_id)
        .ok_or_else(|| format!("No PTY session found for {session_id}"))?;

    session
        .master
        .resize(PtySize {
            rows: rows.max(1),
            cols: cols.max(1),
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn kill_pty(
    app: AppHandle,
    state: State<'_, PtyState>,
    session_id: String,
) -> Result<(), String> {
    let mut sessions = state
        .sessions
        .lock()
        .map_err(|_| "PTY state lock was poisoned".to_string())?;

    if let Some(mut session) = sessions.remove(&session_id) {
        let _ = session.child.kill();
        let _ = app.emit(
            "pty-exit",
            PtyFailure {
                session_id,
                message: "PTY session closed".to_string(),
            },
        );
    }

    Ok(())
}

fn build_command(command: Option<&str>) -> CommandBuilder {
    let shell = default_shell();
    let mut builder = CommandBuilder::new(shell);
    builder.env("TERM", "xterm-256color");
    builder.env("COLORTERM", "truecolor");
    builder.env("LANG", "en_US.UTF-8");
    builder.env("LC_ALL", "en_US.UTF-8");
    builder.env("TERM_PROGRAM", "NeuralTerm");

    let Some(command) = command
        .filter(|value| !value.trim().is_empty())
        .map(str::trim)
    else {
        #[cfg(not(windows))]
        builder.arg("-li");
        return builder;
    };

    #[cfg(windows)]
    builder.arg("/C");
    #[cfg(not(windows))]
    builder.arg("-lc");
    builder.arg(command);
    builder
}

// Returns the largest N such that bytes[..N] contains only complete UTF-8 sequences.
// Keeps any trailing incomplete multi-byte sequence in the carry buffer.
fn last_complete_utf8_boundary(bytes: &[u8]) -> usize {
    if bytes.is_empty() {
        return 0;
    }
    // Walk backward from the end — at most 3 bytes back (max UTF-8 seq is 4 bytes).
    let check_start = bytes.len().saturating_sub(3);
    for i in (check_start..bytes.len()).rev() {
        let b = bytes[i];
        if b & 0xC0 == 0x80 {
            continue; // continuation byte — keep scanning back
        }
        // Start byte or ASCII: determine expected sequence length.
        let expected = if b & 0xF8 == 0xF0 { 4 }
            else if b & 0xF0 == 0xE0 { 3 }
            else if b & 0xE0 == 0xC0 { 2 }
            else { 1 };
        let available = bytes.len() - i;
        if available < expected {
            return i; // incomplete sequence at end — split before it
        }
        break;
    }
    bytes.len()
}

fn default_shell() -> String {
    #[cfg(windows)]
    {
        std::env::var("COMSPEC").unwrap_or_else(|_| "powershell.exe".to_string())
    }
    #[cfg(not(windows))]
    {
        std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string())
    }
}

fn detect_error_title(data: &str) -> Option<String> {
    let lower = data.to_lowercase();
    if lower.contains("traceback (most recent call last)") {
        return Some("Python traceback detected".to_string());
    }
    if lower.contains("uncaught") {
        return Some("Uncaught exception detected".to_string());
    }
    if lower.contains("exception") {
        return Some("Exception detected".to_string());
    }
    if lower.contains("segmentation fault") || lower.contains("sigsegv") {
        return Some("Segmentation fault detected".to_string());
    }
    if lower.contains("fatal:") {
        return Some("Fatal error detected".to_string());
    }
    if lower.contains("npm err!") || lower.contains("pnpm err!") || lower.contains("yarn error") {
        return Some("Package manager error detected".to_string());
    }
    if lower.contains("permission denied") || lower.contains("access denied") {
        return Some("Permission error detected".to_string());
    }
    if lower.contains("timed out") || lower.contains("timeout") {
        return Some("Timeout detected".to_string());
    }
    if lower.contains("exit code") || lower.contains("exited with code") {
        return Some("Non-zero exit detected".to_string());
    }
    if lower.contains("failed") || lower.contains("failure") {
        return Some("Command failed".to_string());
    }
    if lower.contains("panic") {
        return Some("Process panic detected".to_string());
    }
    if lower.contains("error:") || lower.contains("error ") {
        return Some("Error output detected".to_string());
    }
    None
}

fn excerpt(data: &str) -> String {
    let value = data.trim();
    let lower = value.to_lowercase();
    for needle in [
        "traceback",
        "uncaught",
        "exception",
        "segmentation fault",
        "fatal:",
        "npm err!",
        "error:",
        "failed",
        "panic",
    ] {
        if let Some(position) = lower.find(needle) {
            let start = position.saturating_sub(700);
            let end = (position + 1_300).min(value.len());
            let mut safe_start = start;
            let mut safe_end = end;
            while safe_start < safe_end && !value.is_char_boundary(safe_start) {
                safe_start += 1;
            }
            while safe_end > safe_start && !value.is_char_boundary(safe_end) {
                safe_end -= 1;
            }
            if safe_start >= safe_end {
                continue;
            }
            return value[safe_start..safe_end].trim().to_string();
        }
    }

    if value.len() <= 2_000 {
        return value.to_string();
    }

    let mut start = value.len().saturating_sub(2_000);
    while start < value.len() && !value.is_char_boundary(start) {
        start += 1;
    }
    value[start..].to_string()
}

fn now_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::{build_command, detect_error_title, excerpt, last_complete_utf8_boundary};

    #[test]
    fn launches_default_shell_interactively() {
        let command = build_command(None);
        #[cfg(not(windows))]
        assert_eq!(
            command.get_argv().last().and_then(|arg| arg.to_str()),
            Some("-li")
        );
        assert_eq!(
            command.get_env("TERM").and_then(|value| value.to_str()),
            Some("xterm-256color")
        );
    }

    #[test]
    fn detects_common_terminal_failures() {
        assert_eq!(
            detect_error_title("npm ERR! build failed"),
            Some("Package manager error detected".to_string())
        );
        assert_eq!(
            detect_error_title("fatal: not a git repository"),
            Some("Fatal error detected".to_string())
        );
        assert_eq!(detect_error_title("all good"), None);
    }

    #[test]
    fn utf8_boundary_detects_split_sequences() {
        // ─ is U+2500, encoded as [0xE2, 0x94, 0x80] (3-byte sequence)
        let full = "─".as_bytes(); // [0xe2, 0x94, 0x80]
        assert_eq!(last_complete_utf8_boundary(full), 3);

        // Two bytes of a 3-byte sequence — split mid-char
        let partial = &full[..2]; // [0xe2, 0x94]
        assert_eq!(last_complete_utf8_boundary(partial), 0);

        // One leading byte of a 3-byte sequence
        let leading = &full[..1]; // [0xe2]
        assert_eq!(last_complete_utf8_boundary(leading), 0);

        // ASCII is never split
        let ascii = b"hello";
        assert_eq!(last_complete_utf8_boundary(ascii), 5);

        // Valid text followed by a partial sequence
        let mut mixed = b"abc".to_vec();
        mixed.extend_from_slice(&full[..2]);
        assert_eq!(last_complete_utf8_boundary(&mixed), 3);
    }

    #[test]
    fn excerpt_is_bounded_and_unicode_safe() {
        let input = format!("{} error: broken {}", "é".repeat(900), "x".repeat(2_500));
        let result = excerpt(&input);
        assert!(result.contains("error: broken"));
        assert!(result.len() <= 2_100);
    }
}
