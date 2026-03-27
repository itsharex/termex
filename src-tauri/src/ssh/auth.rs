use std::sync::Arc;

use russh::client;
use russh_keys::key;

use super::SshError;

/// SSH client handler that accepts all host keys (MVP).
/// TODO: Implement known_hosts verification in a later step.
pub struct ClientHandler;

#[async_trait::async_trait]
impl client::Handler for ClientHandler {
    type Error = SshError;

    /// Called when the server sends its public key.
    /// MVP: accepts all keys. Will be replaced with known_hosts verification.
    async fn check_server_key(
        &mut self,
        _server_public_key: &key::PublicKey,
    ) -> Result<bool, Self::Error> {
        Ok(true)
    }
}

/// Authenticates with the SSH server using a password.
pub async fn auth_password(
    handle: &mut client::Handle<ClientHandler>,
    username: &str,
    password: &str,
) -> Result<(), SshError> {
    let result = handle
        .authenticate_password(username, password)
        .await
        .map_err(|e| SshError::AuthFailed(e.to_string()))?;

    if !result {
        return Err(SshError::AuthFailed("password rejected".into()));
    }
    Ok(())
}

/// Authenticates with the SSH server using a private key file.
pub async fn auth_key(
    handle: &mut client::Handle<ClientHandler>,
    username: &str,
    key_path: &str,
    passphrase: Option<&str>,
) -> Result<(), SshError> {
    let key_pair = russh_keys::load_secret_key(key_path, passphrase)?;

    let result = handle
        .authenticate_publickey(username, Arc::new(key_pair))
        .await
        .map_err(|e| SshError::AuthFailed(e.to_string()))?;

    if !result {
        return Err(SshError::AuthFailed("key rejected".into()));
    }
    Ok(())
}
