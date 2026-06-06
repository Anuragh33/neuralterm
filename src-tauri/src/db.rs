use serde::{Deserialize, Serialize};
use sqlx::{
    sqlite::{SqliteConnectOptions, SqlitePoolOptions},
    Row, SqlitePool,
};
use std::{fs, sync::OnceLock};
use tauri::{AppHandle, Manager, State};

const DEFAULT_WORKSPACE_ID: &str = "local";

#[derive(Default)]
pub struct DbState {
    pool: OnceLock<SqlitePool>,
}

impl DbState {
    fn pool(&self) -> Result<&SqlitePool, String> {
        self.pool
            .get()
            .ok_or_else(|| "Database has not been initialized".to_string())
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PersistenceSnapshot {
    pub workspaces: Vec<WorkspaceRecord>,
    pub sessions: Vec<SessionRecord>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceRecord {
    pub id: String,
    pub name: String,
    pub color: String,
    pub collapsed: bool,
    pub sort_order: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SessionRecord {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub session_type: String,
    pub workspace_id: String,
    pub created_at: String,
    pub last_active_at: String,
    pub cwd: String,
    pub status: String,
    pub is_pinned: bool,
    pub is_watched: bool,
    pub pty_started: bool,
    pub launch_command: Option<String>,
    pub scrollback: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AiMessageRecord {
    pub id: String,
    pub role: String,
    pub content: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceCollapsedRequest {
    pub id: String,
    pub collapsed: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenameSessionRequest {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionActivityRequest {
    pub id: String,
    pub last_active_at: String,
    pub cwd: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CloseSessionRequest {
    pub id: String,
    pub closed_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiMessagesRequest {
    pub session_id: String,
    pub messages: Vec<AiMessageRecord>,
}

pub async fn initialize_database(app: AppHandle, state: &DbState) -> Result<(), String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&data_dir).map_err(|error| error.to_string())?;
    let db_path = data_dir.join("neuralterm.sqlite3");

    let options = SqliteConnectOptions::new()
        .filename(db_path)
        .create_if_missing(true);
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await
        .map_err(|error| error.to_string())?;

    run_migrations(&pool).await?;
    state
        .pool
        .set(pool)
        .map_err(|_| "Database was already initialized".to_string())
}

async fn run_migrations(pool: &SqlitePool) -> Result<(), String> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS workspaces (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            color TEXT NOT NULL,
            collapsed INTEGER NOT NULL DEFAULT 0,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| error.to_string())?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            session_type TEXT NOT NULL,
            workspace_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            last_active_at TEXT NOT NULL,
            cwd TEXT NOT NULL DEFAULT '',
            scroll_position TEXT,
            message_history TEXT,
            is_pinned INTEGER NOT NULL DEFAULT 0,
            is_watched INTEGER NOT NULL DEFAULT 0,
            launch_command TEXT,
            closed_at TEXT,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(workspace_id) REFERENCES workspaces(id)
        );
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| error.to_string())?;

    sqlx::query(
        r#"
        INSERT OR IGNORE INTO workspaces (id, name, color, collapsed, sort_order)
        VALUES (?1, 'Local', '#7f77dd', 0, 0);
        "#,
    )
    .bind(DEFAULT_WORKSPACE_ID)
    .execute(pool)
    .await
    .map_err(|error| error.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn get_persistence_snapshot(
    state: State<'_, DbState>,
) -> Result<PersistenceSnapshot, String> {
    let pool = state.pool()?;
    let workspace_rows = sqlx::query(
        r#"
        SELECT id, name, color, collapsed, sort_order
        FROM workspaces
        ORDER BY sort_order ASC, created_at ASC;
        "#,
    )
    .fetch_all(pool)
    .await
    .map_err(|error| error.to_string())?;

    let workspaces = workspace_rows
        .into_iter()
        .map(|row| WorkspaceRecord {
            id: row.get("id"),
            name: row.get("name"),
            color: row.get("color"),
            collapsed: row.get::<i64, _>("collapsed") != 0,
            sort_order: row.get("sort_order"),
        })
        .collect();

    let session_rows = sqlx::query(
        r#"
        SELECT
            id, name, session_type, workspace_id, created_at, last_active_at,
            cwd, is_pinned, is_watched, launch_command, scroll_position
        FROM sessions
        WHERE closed_at IS NULL
        ORDER BY last_active_at DESC, created_at DESC;
        "#,
    )
    .fetch_all(pool)
    .await
    .map_err(|error| error.to_string())?;

    let sessions = session_rows
        .into_iter()
        .map(|row| {
            let session_type: String = row.get("session_type");
            SessionRecord {
                id: row.get("id"),
                name: row.get("name"),
                session_type: session_type.clone(),
                workspace_id: row.get("workspace_id"),
                created_at: row.get("created_at"),
                last_active_at: row.get("last_active_at"),
                cwd: row.get("cwd"),
                status: if session_type == "claude-code" || session_type == "her" {
                    "idle".to_string()
                } else {
                    "running".to_string()
                },
                is_pinned: row.get::<i64, _>("is_pinned") != 0,
                is_watched: row.get::<i64, _>("is_watched") != 0,
                pty_started: false,
                launch_command: row.get("launch_command"),
                scrollback: row
                    .get::<Option<String>, _>("scroll_position")
                    .unwrap_or_default(),
            }
        })
        .collect();

    Ok(PersistenceSnapshot {
        workspaces,
        sessions,
    })
}

#[tauri::command]
pub async fn create_workspace(
    state: State<'_, DbState>,
    workspace: WorkspaceRecord,
) -> Result<(), String> {
    sqlx::query(
        r#"
        INSERT INTO workspaces (id, name, color, collapsed, sort_order)
        VALUES (?1, ?2, ?3, ?4, ?5)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            color = excluded.color,
            collapsed = excluded.collapsed,
            sort_order = excluded.sort_order,
            updated_at = CURRENT_TIMESTAMP;
        "#,
    )
    .bind(workspace.id)
    .bind(workspace.name)
    .bind(workspace.color)
    .bind(bool_to_i64(workspace.collapsed))
    .bind(workspace.sort_order)
    .execute(state.pool()?)
    .await
    .map(|_| ())
    .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn set_workspace_collapsed(
    state: State<'_, DbState>,
    request: WorkspaceCollapsedRequest,
) -> Result<(), String> {
    sqlx::query(
        r#"
        UPDATE workspaces
        SET collapsed = ?2, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?1;
        "#,
    )
    .bind(request.id)
    .bind(bool_to_i64(request.collapsed))
    .execute(state.pool()?)
    .await
    .map(|_| ())
    .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn delete_workspace(
    state: State<'_, DbState>,
    workspace_id: String,
) -> Result<(), String> {
    if workspace_id == DEFAULT_WORKSPACE_ID {
        return Err("The Local workspace cannot be deleted".to_string());
    }

    let mut transaction = state
        .pool()?
        .begin()
        .await
        .map_err(|error| error.to_string())?;
    sqlx::query(
        r#"
        UPDATE sessions
        SET workspace_id = ?1, updated_at = CURRENT_TIMESTAMP
        WHERE workspace_id = ?2;
        "#,
    )
    .bind(DEFAULT_WORKSPACE_ID)
    .bind(&workspace_id)
    .execute(&mut *transaction)
    .await
    .map_err(|error| error.to_string())?;
    sqlx::query("DELETE FROM workspaces WHERE id = ?1;")
        .bind(workspace_id)
        .execute(&mut *transaction)
        .await
        .map_err(|error| error.to_string())?;
    transaction
        .commit()
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn upsert_session(
    state: State<'_, DbState>,
    session: SessionRecord,
) -> Result<(), String> {
    sqlx::query(
        r#"
        INSERT INTO sessions (
            id, name, session_type, workspace_id, created_at, last_active_at,
            cwd, is_pinned, is_watched, launch_command, closed_at
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, NULL)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            session_type = excluded.session_type,
            workspace_id = excluded.workspace_id,
            last_active_at = excluded.last_active_at,
            cwd = excluded.cwd,
            is_pinned = excluded.is_pinned,
            is_watched = excluded.is_watched,
            launch_command = excluded.launch_command,
            closed_at = NULL,
            updated_at = CURRENT_TIMESTAMP;
        "#,
    )
    .bind(session.id)
    .bind(session.name)
    .bind(session.session_type)
    .bind(session.workspace_id)
    .bind(session.created_at)
    .bind(session.last_active_at)
    .bind(session.cwd)
    .bind(bool_to_i64(session.is_pinned))
    .bind(bool_to_i64(session.is_watched))
    .bind(session.launch_command)
    .execute(state.pool()?)
    .await
    .map(|_| ())
    .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn rename_session(
    state: State<'_, DbState>,
    request: RenameSessionRequest,
) -> Result<(), String> {
    sqlx::query(
        r#"
        UPDATE sessions
        SET name = ?2, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?1;
        "#,
    )
    .bind(request.id)
    .bind(request.name)
    .execute(state.pool()?)
    .await
    .map(|_| ())
    .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn persist_session_activity(
    state: State<'_, DbState>,
    request: SessionActivityRequest,
) -> Result<(), String> {
    sqlx::query(
        r#"
        UPDATE sessions
        SET
            last_active_at = ?2,
            cwd = COALESCE(?3, cwd),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?1;
        "#,
    )
    .bind(request.id)
    .bind(request.last_active_at)
    .bind(request.cwd)
    .execute(state.pool()?)
    .await
    .map(|_| ())
    .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn close_session(
    state: State<'_, DbState>,
    request: CloseSessionRequest,
) -> Result<(), String> {
    sqlx::query(
        r#"
        UPDATE sessions
        SET closed_at = ?2, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?1;
        "#,
    )
    .bind(request.id)
    .bind(request.closed_at)
    .execute(state.pool()?)
    .await
    .map(|_| ())
    .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn get_ai_messages(
    state: State<'_, DbState>,
    session_id: String,
) -> Result<Vec<AiMessageRecord>, String> {
    let row = sqlx::query(
        r#"
        SELECT message_history
        FROM sessions
        WHERE id = ?1;
        "#,
    )
    .bind(session_id)
    .fetch_optional(state.pool()?)
    .await
    .map_err(|error| error.to_string())?;

    let Some(row) = row else {
        return Ok(Vec::new());
    };

    let history = row
        .get::<Option<String>, _>("message_history")
        .unwrap_or_default();
    if history.trim().is_empty() {
        return Ok(Vec::new());
    }

    serde_json::from_str(&history).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn save_ai_messages(
    state: State<'_, DbState>,
    request: AiMessagesRequest,
) -> Result<(), String> {
    let history = serde_json::to_string(&request.messages).map_err(|error| error.to_string())?;
    sqlx::query(
        r#"
        UPDATE sessions
        SET message_history = ?2, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?1;
        "#,
    )
    .bind(request.session_id)
    .bind(history)
    .execute(state.pool()?)
    .await
    .map(|_| ())
    .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn save_terminal_scrollback(
    state: State<'_, DbState>,
    session_id: String,
    scrollback: String,
) -> Result<(), String> {
    sqlx::query(
        r#"
        UPDATE sessions
        SET scroll_position = ?2, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?1;
        "#,
    )
    .bind(session_id)
    .bind(scrollback)
    .execute(state.pool()?)
    .await
    .map(|_| ())
    .map_err(|error| error.to_string())
}

fn bool_to_i64(value: bool) -> i64 {
    if value {
        1
    } else {
        0
    }
}
