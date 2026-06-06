use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    io::{Read, Write},
    sync::Mutex,
    thread,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter, State};

pub struct PtyState {
    sessions: Mutex<HashMap<String, PtyProcess>>,
}

impl Default for PtyState {
    fn default() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
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

    let child = pair
        .slave
        .spawn_command(command)
        .map_err(|error| error.to_string())?;
    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|error| error.to_string())?;
    let writer = pair.master.take_writer().map_err(|error| error.to_string())?;

    let session_id = request.session_id.clone();
    let event_session_id = request.session_id.clone();
    thread::spawn(move || {
        let mut buffer = [0_u8; 8192];
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
                    break;
                }
                Ok(size) => {
                    let data = String::from_utf8_lossy(&buffer[..size]).to_string();
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
                    break;
                }
            }
        }
    });

    let mut sessions = state
        .sessions
        .lock()
        .map_err(|_| "PTY state lock was poisoned".to_string())?;
    sessions.insert(
        request.session_id.clone(),
        PtyProcess {
            master: pair.master,
            writer,
            child,
        },
    );

    Ok(PtySpawned { session_id })
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
    let Some(command) = command.filter(|value| !value.trim().is_empty()).map(str::trim) else {
        return CommandBuilder::new(shell);
    };

    let mut builder = CommandBuilder::new(shell);
    #[cfg(windows)]
    builder.arg("/C");
    #[cfg(not(windows))]
    builder.arg("-lc");
    builder.arg(command);
    builder
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
            while !value.is_char_boundary(safe_start) {
                safe_start += 1;
            }
            while !value.is_char_boundary(safe_end) {
                safe_end -= 1;
            }
            return value[safe_start..safe_end].trim().to_string();
        }
    }

    if value.len() <= 2_000 {
        return value.to_string();
    }

    let mut start = value.len().saturating_sub(2_000);
    while !value.is_char_boundary(start) {
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
    use super::{detect_error_title, excerpt};

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
    fn excerpt_is_bounded_and_unicode_safe() {
        let input = format!("{} error: broken {}", "é".repeat(900), "x".repeat(2_500));
        let result = excerpt(&input);
        assert!(result.contains("error: broken"));
        assert!(result.len() <= 2_100);
    }
}
