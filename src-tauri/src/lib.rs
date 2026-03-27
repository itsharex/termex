mod commands;
pub mod crypto;
pub mod ssh;
pub mod storage;
mod state;

use state::AppState;

/// Initializes and runs the Tauri application.
pub fn run() {
    // MVP: no master password — database is unencrypted.
    // When user sets a master password, it encrypts credential fields via AES-256-GCM.
    let app_state = AppState::new(None).expect("failed to initialize database");

    tauri::Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            // Master password
            commands::crypto::master_password_exists,
            commands::crypto::master_password_set,
            commands::crypto::master_password_verify,
            commands::crypto::master_password_change,
            commands::crypto::master_password_lock,
            // Server & group management
            commands::server::server_list,
            commands::server::server_create,
            commands::server::server_update,
            commands::server::server_delete,
            commands::server::server_touch,
            commands::server::server_reorder,
            commands::server::group_list,
            commands::server::group_create,
            commands::server::group_update,
            commands::server::group_delete,
            commands::server::group_reorder,
            // SSH
            commands::ssh::ssh_connect,
            commands::ssh::ssh_disconnect,
            commands::ssh::ssh_write,
            commands::ssh::ssh_resize,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Termex");
}
