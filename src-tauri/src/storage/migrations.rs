use rusqlite::Connection;

/// All migration SQL statements, ordered by version.
/// Each entry is `(version, description, sql)`.
const MIGRATIONS: &[(i32, &str, &str)] = &[(1, "initial schema", MIGRATION_V1)];

/// Runs all pending migrations in order.
pub fn run_migrations(conn: &Connection) -> Result<(), rusqlite::Error> {
    // Ensure the migrations tracking table exists
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS _migrations (
            version     INTEGER PRIMARY KEY,
            description TEXT NOT NULL,
            applied_at  TEXT NOT NULL
        );",
    )?;

    let current_version: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM _migrations",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    for &(version, description, sql) in MIGRATIONS {
        if version > current_version {
            conn.execute_batch(sql)?;
            conn.execute(
                "INSERT INTO _migrations (version, description, applied_at) VALUES (?1, ?2, ?3)",
                rusqlite::params![
                    version,
                    description,
                    chrono::Utc::now().to_rfc3339(),
                ],
            )?;
        }
    }

    Ok(())
}

// ============================================================
// V1: Initial schema
// ============================================================

const MIGRATION_V1: &str = "
-- 服务器分组
CREATE TABLE groups (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    color       TEXT DEFAULT '#6366f1',
    icon        TEXT DEFAULT 'folder',
    parent_id   TEXT,
    sort_order  INTEGER DEFAULT 0,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    FOREIGN KEY (parent_id) REFERENCES groups(id) ON DELETE SET NULL
);

-- 服务器连接
CREATE TABLE servers (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    host            TEXT NOT NULL,
    port            INTEGER DEFAULT 22,
    username        TEXT NOT NULL,
    auth_type       TEXT NOT NULL,
    password_enc    BLOB,
    key_path        TEXT,
    passphrase_enc  BLOB,
    group_id        TEXT,
    sort_order      INTEGER DEFAULT 0,
    proxy_id        TEXT,
    startup_cmd     TEXT,
    encoding        TEXT DEFAULT 'UTF-8',
    tags            TEXT,
    last_connected  TEXT,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL
);

-- SSH 密钥管理
CREATE TABLE ssh_keys (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    key_type        TEXT NOT NULL,
    bits            INTEGER,
    file_path       TEXT NOT NULL,
    public_key      TEXT,
    has_passphrase  INTEGER DEFAULT 0,
    passphrase_enc  BLOB,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

-- 端口转发规则
CREATE TABLE port_forwards (
    id              TEXT PRIMARY KEY,
    server_id       TEXT NOT NULL,
    forward_type    TEXT NOT NULL,
    local_host      TEXT DEFAULT '127.0.0.1',
    local_port      INTEGER NOT NULL,
    remote_host     TEXT,
    remote_port     INTEGER,
    auto_start      INTEGER DEFAULT 0,
    enabled         INTEGER DEFAULT 1,
    created_at      TEXT NOT NULL,
    FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
);

-- AI Provider 配置
CREATE TABLE ai_providers (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    provider_type   TEXT NOT NULL,
    api_key_enc     BLOB,
    api_base_url    TEXT,
    model           TEXT NOT NULL,
    is_default      INTEGER DEFAULT 0,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

-- 应用设置 (KV 存储)
CREATE TABLE settings (
    key             TEXT PRIMARY KEY,
    value           TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

-- 主机指纹
CREATE TABLE known_hosts (
    host            TEXT NOT NULL,
    port            INTEGER NOT NULL,
    key_type        TEXT NOT NULL,
    fingerprint     TEXT NOT NULL,
    first_seen      TEXT NOT NULL,
    last_seen       TEXT NOT NULL,
    PRIMARY KEY (host, port, key_type)
);

-- 索引
CREATE INDEX idx_servers_group ON servers(group_id);
CREATE INDEX idx_servers_name ON servers(name);
CREATE INDEX idx_port_forwards_server ON port_forwards(server_id);
CREATE INDEX idx_ai_providers_default ON ai_providers(is_default);
";

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_migrations_idempotent() {
        let conn = Connection::open_in_memory().unwrap();
        conn.pragma_update(None, "foreign_keys", "ON").unwrap();

        // Run twice — second run should be a no-op
        run_migrations(&conn).unwrap();
        run_migrations(&conn).unwrap();

        let version: i32 = conn
            .query_row("SELECT MAX(version) FROM _migrations", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(version, 1);
    }
}
