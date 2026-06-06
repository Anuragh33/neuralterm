#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ai;
mod db;
mod pty;
mod session;

use ai::{get_anthropic_api_key, open_path, read_text_file, run_shell_command, set_anthropic_api_key};
use db::{
    close_session, create_workspace, delete_workspace, get_ai_messages, get_persistence_snapshot,
    initialize_database, persist_session_activity, rename_session, save_ai_messages,
    save_terminal_scrollback, set_workspace_collapsed, upsert_session, DbState,
};
use pty::{kill_pty, resize_pty, spawn_pty, write_pty, PtyState};
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(PtyState::default())
        .manage(DbState::default())
        .setup(|app| {
            let handle = app.handle().clone();
            let state = app.state::<DbState>();
            tauri::async_runtime::block_on(initialize_database(handle, &state)).map_err(
                |error| -> Box<dyn std::error::Error> {
                    Box::new(std::io::Error::new(std::io::ErrorKind::Other, error))
                },
            )?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            spawn_pty,
            write_pty,
            resize_pty,
            kill_pty,
            get_persistence_snapshot,
            create_workspace,
            delete_workspace,
            set_workspace_collapsed,
            upsert_session,
            rename_session,
            persist_session_activity,
            close_session,
            get_ai_messages,
            save_ai_messages,
            save_terminal_scrollback,
            read_text_file,
            run_shell_command,
            open_path,
            get_anthropic_api_key,
            set_anthropic_api_key
        ])
        .run(tauri::generate_context!())
        .expect("failed to run NeuralTerm");
}
