use serde::Serialize;
use std::process::Stdio;
use tokio::{process::Command, time};

const MAX_TEXT_BYTES: usize = 80_000;
const KEYCHAIN_SERVICE: &str = "NeuralTerm";
const ANTHROPIC_ACCOUNT: &str = "anthropic_api_key";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShellCommandOutput {
    pub status: Option<i32>,
    pub stdout: String,
    pub stderr: String,
}

#[tauri::command]
pub fn get_anthropic_api_key() -> Result<String, String> {
    let entry = keyring::Entry::new(KEYCHAIN_SERVICE, ANTHROPIC_ACCOUNT)
        .map_err(|error| error.to_string())?;
    match entry.get_password() {
        Ok(password) => Ok(password),
        Err(keyring::Error::NoEntry) => Ok(String::new()),
        Err(error) => Err(error.to_string()),
    }
}

#[tauri::command]
pub fn set_anthropic_api_key(api_key: String) -> Result<(), String> {
    let entry = keyring::Entry::new(KEYCHAIN_SERVICE, ANTHROPIC_ACCOUNT)
        .map_err(|error| error.to_string())?;
    if api_key.trim().is_empty() {
        match entry.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(error) => Err(error.to_string()),
        }
    } else {
        entry.set_password(&api_key).map_err(|error| error.to_string())
    }
}

#[tauri::command]
pub async fn read_text_file(path: String) -> Result<String, String> {
    let contents = tokio::fs::read_to_string(path)
        .await
        .map_err(|error| error.to_string())?;
    Ok(truncate(contents, MAX_TEXT_BYTES))
}

#[tauri::command]
pub async fn run_shell_command(
    command: String,
    cwd: Option<String>,
) -> Result<ShellCommandOutput, String> {
    if command.trim().is_empty() {
        return Err("Command cannot be empty".to_string());
    }

    let mut process = shell_command(&command);
    if let Some(cwd) = cwd.filter(|value| !value.trim().is_empty()) {
        process.current_dir(cwd);
    }
    process.stdout(Stdio::piped()).stderr(Stdio::piped());

    let output = time::timeout(time::Duration::from_secs(30), process.output())
        .await
        .map_err(|_| "Command timed out after 30 seconds".to_string())?
        .map_err(|error| error.to_string())?;

    Ok(ShellCommandOutput {
        status: output.status.code(),
        stdout: truncate(String::from_utf8_lossy(&output.stdout).to_string(), MAX_TEXT_BYTES),
        stderr: truncate(String::from_utf8_lossy(&output.stderr).to_string(), MAX_TEXT_BYTES),
    })
}

fn shell_command(command: &str) -> Command {
    #[cfg(windows)]
    {
        let mut process = Command::new("cmd.exe");
        process.arg("/C").arg(command);
        process
    }

    #[cfg(not(windows))]
    {
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_string());
        let mut process = Command::new(shell);
        process.arg("-lc").arg(command);
        process
    }
}

fn truncate(mut value: String, max_bytes: usize) -> String {
    if value.len() <= max_bytes {
        return value;
    }

    value.truncate(max_bytes);
    while !value.is_char_boundary(value.len()) {
        value.pop();
    }
    value.push_str("\n\n[Output truncated]");
    value
}
