//! Portable mode detection command.

/// Returns whether the app is running in portable mode.
#[tauri::command]
pub fn is_portable() -> bool {
    crate::paths::is_portable()
}
