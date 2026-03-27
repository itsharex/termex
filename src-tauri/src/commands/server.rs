use serde::Deserialize;
use tauri::State;

use crate::crypto::aes;
use crate::state::AppState;
use crate::storage::models::{AuthType, Server, ServerGroup};

// ── Input types ────────────────────────────────────────────────

/// Input for creating or updating a server.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerInput {
    pub name: String,
    pub host: String,
    #[serde(default = "default_port")]
    pub port: i32,
    pub username: String,
    pub auth_type: AuthType,
    /// Plaintext password — encrypted before storage, never persisted as-is.
    pub password: Option<String>,
    pub key_path: Option<String>,
    /// Plaintext passphrase — encrypted before storage.
    pub passphrase: Option<String>,
    pub group_id: Option<String>,
    pub proxy_id: Option<String>,
    pub startup_cmd: Option<String>,
    #[serde(default = "default_encoding")]
    pub encoding: String,
    #[serde(default)]
    pub tags: Vec<String>,
}

fn default_port() -> i32 {
    22
}
fn default_encoding() -> String {
    "UTF-8".into()
}

/// Input for creating or updating a group.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GroupInput {
    pub name: String,
    #[serde(default = "default_color")]
    pub color: String,
    #[serde(default = "default_icon")]
    pub icon: String,
    pub parent_id: Option<String>,
}

fn default_color() -> String {
    "#6366f1".into()
}
fn default_icon() -> String {
    "folder".into()
}

/// Input for reordering items.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReorderItem {
    pub id: String,
    pub sort_order: i32,
}

// ── Server commands ────────────────────────────────────────────

/// Lists all servers with their group info.
#[tauri::command]
pub fn server_list(state: State<'_, AppState>) -> Result<Vec<Server>, String> {
    state
        .db
        .with_conn(|conn| {
            let mut stmt = conn.prepare(
                "SELECT id, name, host, port, username, auth_type, password_enc, key_path,
                        passphrase_enc, group_id, sort_order, proxy_id, startup_cmd,
                        encoding, tags, last_connected, created_at, updated_at
                 FROM servers ORDER BY sort_order, name",
            )?;
            let rows = stmt
                .query_map([], |row| {
                    let tags_json: Option<String> = row.get(14)?;
                    let tags: Vec<String> = tags_json
                        .and_then(|s| serde_json::from_str(&s).ok())
                        .unwrap_or_default();
                    let auth_str: String = row.get(5)?;
                    Ok(Server {
                        id: row.get(0)?,
                        name: row.get(1)?,
                        host: row.get(2)?,
                        port: row.get(3)?,
                        username: row.get(4)?,
                        auth_type: AuthType::from_str(&auth_str)
                            .unwrap_or(AuthType::Password),
                        password_enc: row.get(6)?,
                        key_path: row.get(7)?,
                        passphrase_enc: row.get(8)?,
                        group_id: row.get(9)?,
                        sort_order: row.get(10)?,
                        proxy_id: row.get(11)?,
                        startup_cmd: row.get(12)?,
                        encoding: row.get(13)?,
                        tags,
                        last_connected: row.get(15)?,
                        created_at: row.get(16)?,
                        updated_at: row.get(17)?,
                    })
                })?
                .filter_map(|r| r.ok())
                .collect();
            Ok(rows)
        })
        .map_err(|e| e.to_string())
}

/// Creates a new server connection.
#[tauri::command]
pub fn server_create(
    state: State<'_, AppState>,
    input: ServerInput,
) -> Result<Server, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let tags_json = serde_json::to_string(&input.tags).unwrap_or_else(|_| "[]".into());

    let password_enc = encrypt_optional(&state, input.password.as_deref())?;
    let passphrase_enc = encrypt_optional(&state, input.passphrase.as_deref())?;

    state
        .db
        .with_conn(|conn| {
            conn.execute(
                "INSERT INTO servers (id, name, host, port, username, auth_type,
                    password_enc, key_path, passphrase_enc, group_id, sort_order,
                    proxy_id, startup_cmd, encoding, tags, created_at, updated_at)
                 VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17)",
                rusqlite::params![
                    id,
                    input.name,
                    input.host,
                    input.port,
                    input.username,
                    input.auth_type.as_str(),
                    password_enc,
                    input.key_path,
                    passphrase_enc,
                    input.group_id,
                    0,
                    input.proxy_id,
                    input.startup_cmd,
                    input.encoding,
                    tags_json,
                    now,
                    now,
                ],
            )?;
            Ok(())
        })
        .map_err(|e| e.to_string())?;

    Ok(Server {
        id,
        name: input.name,
        host: input.host,
        port: input.port,
        username: input.username,
        auth_type: input.auth_type,
        password_enc: None,
        key_path: input.key_path,
        passphrase_enc: None,
        group_id: input.group_id,
        sort_order: 0,
        proxy_id: input.proxy_id,
        startup_cmd: input.startup_cmd,
        encoding: input.encoding,
        tags: input.tags,
        last_connected: None,
        created_at: now.clone(),
        updated_at: now,
    })
}

/// Updates an existing server.
#[tauri::command]
pub fn server_update(
    state: State<'_, AppState>,
    id: String,
    input: ServerInput,
) -> Result<Server, String> {
    let now = chrono::Utc::now().to_rfc3339();
    let tags_json = serde_json::to_string(&input.tags).unwrap_or_else(|_| "[]".into());

    let password_enc = encrypt_optional(&state, input.password.as_deref())?;
    let passphrase_enc = encrypt_optional(&state, input.passphrase.as_deref())?;

    state
        .db
        .with_conn(|conn| {
            let affected = conn.execute(
                "UPDATE servers SET name=?1, host=?2, port=?3, username=?4, auth_type=?5,
                    password_enc=COALESCE(?6, password_enc), key_path=?7,
                    passphrase_enc=COALESCE(?8, passphrase_enc), group_id=?9,
                    proxy_id=?10, startup_cmd=?11, encoding=?12, tags=?13, updated_at=?14
                 WHERE id=?15",
                rusqlite::params![
                    input.name,
                    input.host,
                    input.port,
                    input.username,
                    input.auth_type.as_str(),
                    password_enc,
                    input.key_path,
                    passphrase_enc,
                    input.group_id,
                    input.proxy_id,
                    input.startup_cmd,
                    input.encoding,
                    tags_json,
                    now,
                    id,
                ],
            )?;
            if affected == 0 {
                return Err(rusqlite::Error::QueryReturnedNoRows);
            }
            Ok(())
        })
        .map_err(|e| e.to_string())?;

    Ok(Server {
        id,
        name: input.name,
        host: input.host,
        port: input.port,
        username: input.username,
        auth_type: input.auth_type,
        password_enc: None,
        key_path: input.key_path,
        passphrase_enc: None,
        group_id: input.group_id,
        sort_order: 0,
        proxy_id: input.proxy_id,
        startup_cmd: input.startup_cmd,
        encoding: input.encoding,
        tags: input.tags,
        last_connected: None,
        created_at: String::new(),
        updated_at: now,
    })
}

/// Deletes a server by ID.
#[tauri::command]
pub fn server_delete(state: State<'_, AppState>, id: String) -> Result<(), String> {
    state
        .db
        .with_conn(|conn| {
            conn.execute("DELETE FROM servers WHERE id = ?1", rusqlite::params![id])?;
            Ok(())
        })
        .map_err(|e| e.to_string())
}

/// Updates the last_connected timestamp for a server.
#[tauri::command]
pub fn server_touch(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let now = chrono::Utc::now().to_rfc3339();
    state
        .db
        .with_conn(|conn| {
            conn.execute(
                "UPDATE servers SET last_connected = ?1, updated_at = ?1 WHERE id = ?2",
                rusqlite::params![now, id],
            )?;
            Ok(())
        })
        .map_err(|e| e.to_string())
}

/// Reorders servers/groups by updating sort_order.
#[tauri::command]
pub fn server_reorder(
    state: State<'_, AppState>,
    orders: Vec<ReorderItem>,
) -> Result<(), String> {
    state
        .db
        .with_conn(|conn| {
            for item in &orders {
                conn.execute(
                    "UPDATE servers SET sort_order = ?1 WHERE id = ?2",
                    rusqlite::params![item.sort_order, item.id],
                )?;
            }
            Ok(())
        })
        .map_err(|e| e.to_string())
}

// ── Group commands ─────────────────────────────────────────────

/// Lists all server groups.
#[tauri::command]
pub fn group_list(state: State<'_, AppState>) -> Result<Vec<ServerGroup>, String> {
    state
        .db
        .with_conn(|conn| {
            let mut stmt = conn.prepare(
                "SELECT id, name, color, icon, parent_id, sort_order, created_at, updated_at
                 FROM groups ORDER BY sort_order, name",
            )?;
            let rows = stmt
                .query_map([], |row| {
                    Ok(ServerGroup {
                        id: row.get(0)?,
                        name: row.get(1)?,
                        color: row.get(2)?,
                        icon: row.get(3)?,
                        parent_id: row.get(4)?,
                        sort_order: row.get(5)?,
                        created_at: row.get(6)?,
                        updated_at: row.get(7)?,
                    })
                })?
                .filter_map(|r| r.ok())
                .collect();
            Ok(rows)
        })
        .map_err(|e| e.to_string())
}

/// Creates a new server group.
#[tauri::command]
pub fn group_create(
    state: State<'_, AppState>,
    input: GroupInput,
) -> Result<ServerGroup, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    state
        .db
        .with_conn(|conn| {
            conn.execute(
                "INSERT INTO groups (id, name, color, icon, parent_id, sort_order, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, ?6)",
                rusqlite::params![id, input.name, input.color, input.icon, input.parent_id, now],
            )?;
            Ok(())
        })
        .map_err(|e| e.to_string())?;

    Ok(ServerGroup {
        id,
        name: input.name,
        color: input.color,
        icon: input.icon,
        parent_id: input.parent_id,
        sort_order: 0,
        created_at: now.clone(),
        updated_at: now,
    })
}

/// Updates an existing group.
#[tauri::command]
pub fn group_update(
    state: State<'_, AppState>,
    id: String,
    input: GroupInput,
) -> Result<ServerGroup, String> {
    let now = chrono::Utc::now().to_rfc3339();

    state
        .db
        .with_conn(|conn| {
            let affected = conn.execute(
                "UPDATE groups SET name=?1, color=?2, icon=?3, parent_id=?4, updated_at=?5
                 WHERE id=?6",
                rusqlite::params![input.name, input.color, input.icon, input.parent_id, now, id],
            )?;
            if affected == 0 {
                return Err(rusqlite::Error::QueryReturnedNoRows);
            }
            Ok(())
        })
        .map_err(|e| e.to_string())?;

    Ok(ServerGroup {
        id,
        name: input.name,
        color: input.color,
        icon: input.icon,
        parent_id: input.parent_id,
        sort_order: 0,
        created_at: String::new(),
        updated_at: now,
    })
}

/// Deletes a group. Servers in the group become ungrouped (SET NULL).
#[tauri::command]
pub fn group_delete(state: State<'_, AppState>, id: String) -> Result<(), String> {
    state
        .db
        .with_conn(|conn| {
            conn.execute("DELETE FROM groups WHERE id = ?1", rusqlite::params![id])?;
            Ok(())
        })
        .map_err(|e| e.to_string())
}

/// Reorders groups by updating sort_order.
#[tauri::command]
pub fn group_reorder(
    state: State<'_, AppState>,
    orders: Vec<ReorderItem>,
) -> Result<(), String> {
    state
        .db
        .with_conn(|conn| {
            for item in &orders {
                conn.execute(
                    "UPDATE groups SET sort_order = ?1 WHERE id = ?2",
                    rusqlite::params![item.sort_order, item.id],
                )?;
            }
            Ok(())
        })
        .map_err(|e| e.to_string())
}

// ── Helpers ────────────────────────────────────────────────────

/// Encrypts an optional plaintext value using the master key.
/// Returns `None` if the input is `None` or empty.
fn encrypt_optional(
    state: &State<'_, AppState>,
    plaintext: Option<&str>,
) -> Result<Option<Vec<u8>>, String> {
    let Some(text) = plaintext.filter(|s| !s.is_empty()) else {
        return Ok(None);
    };

    let mk = state.master_key.read().expect("master_key lock poisoned");
    let Some(ref key) = *mk else {
        // No master password set — store as unencrypted marker.
        // This allows the app to work without a master password.
        return Ok(None);
    };

    aes::encrypt(key, text.as_bytes())
        .map(Some)
        .map_err(|e| e.to_string())
}
