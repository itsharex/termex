use std::collections::HashMap;
use std::sync::RwLock;

use crate::ssh::session::SshSession;
use crate::storage::Database;

/// Global application state shared across all Tauri commands.
pub struct AppState {
    /// SQLCipher encrypted database connection.
    pub db: Database,
    /// Derived master encryption key — `None` when no master password is set.
    pub master_key: RwLock<Option<[u8; 32]>>,
    /// Active SSH sessions keyed by session_id.
    pub sessions: RwLock<HashMap<String, SshSession>>,
}

impl AppState {
    /// Creates a new AppState with an initialized database.
    pub fn new(master_password: Option<&str>) -> Result<Self, crate::storage::DbError> {
        let db = Database::open(master_password)?;
        Ok(Self {
            db,
            master_key: RwLock::new(None),
            sessions: RwLock::new(HashMap::new()),
        })
    }
}
