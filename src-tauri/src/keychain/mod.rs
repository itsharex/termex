//! OS Keychain integration for secure credential storage.
//!
//! Uses the `keyring` crate to access platform-native credential stores:
//! - macOS: Keychain Services (Secure Enclave)
//! - Windows: Credential Manager (DPAPI)
//! - Linux: Secret Service (GNOME Keyring / KDE Wallet)
//!
//! All credentials are stored in a **single keychain entry** as a JSON object,
//! so the OS only prompts for the keychain password once per app session.
//! An in-memory cache serves all reads after the initial load.

use std::collections::HashMap;
use std::sync::{OnceLock, RwLock};

use thiserror::Error;

const SERVICE_NAME: &str = "com.termex.app";
/// Single keychain entry that holds all credentials as JSON.
const STORE_KEY: &str = "__termex_store__";

#[derive(Debug, Error)]
pub enum KeychainError {
    #[error("keychain not available: {0}")]
    NotAvailable(String),
    #[error("credential not found: {0}")]
    NotFound(String),
    #[error("keychain operation failed: {0}")]
    OperationFailed(String),
}

/// Global availability flag, computed once.
static AVAILABLE: OnceLock<bool> = OnceLock::new();

/// Returns a reference to the global in-memory credential cache.
fn cache() -> &'static RwLock<HashMap<String, String>> {
    static CACHE: OnceLock<RwLock<HashMap<String, String>>> = OnceLock::new();
    CACHE.get_or_init(|| RwLock::new(HashMap::new()))
}

/// Initializes the keychain module.
///
/// Reads all credentials from the single keychain entry into memory.
/// On first launch, creates the entry. Returns whether keychain is available.
/// **Triggers at most 1 OS password prompt per app session.**
pub fn init() -> bool {
    *AVAILABLE.get_or_init(|| {
        let entry = match keyring::Entry::new(SERVICE_NAME, STORE_KEY) {
            Ok(e) => e,
            Err(_) => return false,
        };
        match entry.get_password() {
            Ok(json_str) => {
                // Parse and load into cache
                if let Ok(map) = serde_json::from_str::<HashMap<String, String>>(&json_str) {
                    if let Ok(mut c) = cache().write() {
                        *c = map;
                    }
                }
                true
            }
            Err(keyring::Error::NoEntry) => {
                // First launch: create empty store
                entry.set_password("{}").is_ok()
            }
            Err(_) => false,
        }
    })
}

/// Returns whether the OS keychain is available. Calls `init()` lazily.
pub fn is_available() -> bool {
    init()
}

/// Writes the entire in-memory cache to the single keychain entry.
fn flush() {
    let map = match cache().read() {
        Ok(c) => c.clone(),
        Err(_) => return,
    };
    let json_str = match serde_json::to_string(&map) {
        Ok(s) => s,
        Err(_) => return,
    };
    if let Ok(entry) = keyring::Entry::new(SERVICE_NAME, STORE_KEY) {
        let _ = entry.set_password(&json_str);
    }
}

/// Stores a credential in the cache and flushes to keychain.
pub fn store(key: &str, value: &str) -> Result<(), KeychainError> {
    if let Ok(mut c) = cache().write() {
        c.insert(key.to_string(), value.to_string());
    }
    flush();
    Ok(())
}

/// Retrieves a credential from the in-memory cache.
/// Never touches the OS keychain — all reads are from memory.
pub fn get(key: &str) -> Result<String, KeychainError> {
    if let Ok(c) = cache().read() {
        if let Some(value) = c.get(key) {
            return Ok(value.clone());
        }
    }
    Err(KeychainError::NotFound(key.to_string()))
}

/// Deletes a credential from the cache and flushes to keychain.
pub fn delete(key: &str) -> Result<(), KeychainError> {
    let removed = if let Ok(mut c) = cache().write() {
        c.remove(key).is_some()
    } else {
        false
    };
    if removed {
        flush();
    }
    Ok(())
}

/// One-time migration: reads credentials from old individual keychain entries
/// into the single-store format. Call once after upgrading from per-entry storage.
/// After this runs, all subsequent startups only need 1 keychain read.
pub fn consolidate_from_individual(keys: &[String]) {
    if !is_available() || keys.is_empty() {
        return;
    }
    let mut found_any = false;
    {
        let mut c = match cache().write() {
            Ok(c) => c,
            Err(_) => return,
        };
        for key in keys {
            // Skip if already in the new single store
            if c.contains_key(key) {
                continue;
            }
            // Try reading from old individual keychain entry
            if let Ok(entry) = keyring::Entry::new(SERVICE_NAME, key) {
                if let Ok(value) = entry.get_password() {
                    c.insert(key.clone(), value);
                    found_any = true;
                }
            }
        }
    }
    if found_any {
        flush();
    }
}

/// Generates a keychain key for an SSH server password.
pub fn ssh_password_key(server_id: &str) -> String {
    format!("termex:ssh:password:{server_id}")
}

/// Generates a keychain key for an SSH passphrase.
pub fn ssh_passphrase_key(server_id: &str) -> String {
    format!("termex:ssh:passphrase:{server_id}")
}

/// Generates a keychain key for an AI provider API key.
pub fn ai_apikey_key(provider_id: &str) -> String {
    format!("termex:ai:apikey:{provider_id}")
}
