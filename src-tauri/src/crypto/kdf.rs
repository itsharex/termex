use argon2::{Argon2, Algorithm, Params, Version};
use ring::rand::{SecureRandom, SystemRandom};

use super::CryptoError;

/// Salt length in bytes.
const SALT_LEN: usize = 16;

/// Argon2id parameters matching the security spec:
/// m=64MB, t=3 iterations, p=4 parallelism.
fn argon2_params() -> Params {
    Params::new(64 * 1024, 3, 4, Some(32)).expect("valid Argon2 params")
}

/// Generates a cryptographically secure random salt.
pub fn generate_salt() -> Result<[u8; SALT_LEN], CryptoError> {
    let rng = SystemRandom::new();
    let mut salt = [0u8; SALT_LEN];
    rng.fill(&mut salt)
        .map_err(|_| CryptoError::RngFailed)?;
    Ok(salt)
}

/// Derives a 32-byte master key from a password and salt using Argon2id.
pub fn derive_key(password: &str, salt: &[u8; SALT_LEN]) -> Result<[u8; 32], CryptoError> {
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, argon2_params());

    let mut key = [0u8; 32];
    argon2
        .hash_password_into(password.as_bytes(), salt, &mut key)
        .map_err(|_| CryptoError::KdfFailed)?;

    Ok(key)
}

/// Derives a key and returns both the key and a newly generated salt.
/// Used when setting a master password for the first time.
pub fn derive_key_new(password: &str) -> Result<([u8; 32], [u8; SALT_LEN]), CryptoError> {
    let salt = generate_salt()?;
    let key = derive_key(password, &salt)?;
    Ok((key, salt))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_derive_key_deterministic() {
        let salt = [0xABu8; SALT_LEN];
        let key1 = derive_key("my-password", &salt).unwrap();
        let key2 = derive_key("my-password", &salt).unwrap();
        assert_eq!(key1, key2);
    }

    #[test]
    fn test_different_passwords_different_keys() {
        let salt = [0xABu8; SALT_LEN];
        let key1 = derive_key("password-a", &salt).unwrap();
        let key2 = derive_key("password-b", &salt).unwrap();
        assert_ne!(key1, key2);
    }

    #[test]
    fn test_different_salts_different_keys() {
        let salt1 = [0xAAu8; SALT_LEN];
        let salt2 = [0xBBu8; SALT_LEN];
        let key1 = derive_key("same-password", &salt1).unwrap();
        let key2 = derive_key("same-password", &salt2).unwrap();
        assert_ne!(key1, key2);
    }

    #[test]
    fn test_derive_key_new_generates_unique_salt() {
        let (_, salt1) = derive_key_new("password").unwrap();
        let (_, salt2) = derive_key_new("password").unwrap();
        assert_ne!(salt1, salt2);
    }

    #[test]
    fn test_key_length() {
        let (key, _) = derive_key_new("password").unwrap();
        assert_eq!(key.len(), 32);
    }
}
