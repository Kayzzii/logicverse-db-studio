use std::path::Path;

use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use rand::RngCore;

use crate::error::{AppError, AppResult};

const NONCE_SIZE: usize = 12;
const MASTER_KEY_FILE: &str = "master.key";
const KEY_SIZE: usize = 32;

/// Obtiene o crea una master key aleatoria almacenada en `config_dir/master.key`.
pub fn get_or_create_master_key(config_dir: &Path) -> AppResult<[u8; 32]> {
    std::fs::create_dir_all(config_dir)?;

    let key_path = config_dir.join(MASTER_KEY_FILE);

    if key_path.exists() {
        let bytes = std::fs::read(&key_path)?;
        if bytes.len() == KEY_SIZE {
            let mut key = [0u8; KEY_SIZE];
            key.copy_from_slice(&bytes);
            return Ok(key);
        }
    }

    let mut key = [0u8; KEY_SIZE];
    rand::thread_rng().fill_bytes(&mut key);

    std::fs::write(&key_path, key)?;
    set_owner_only_permissions(&key_path)?;

    Ok(key)
}

fn set_owner_only_permissions(path: &Path) -> AppResult<()> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;

        let mut perms = std::fs::metadata(path)?.permissions();
        perms.set_mode(0o600);
        std::fs::set_permissions(path, perms)?;
    }

    #[cfg(not(unix))]
    {
        let _ = path;
    }

    Ok(())
}

pub fn encrypt(config_dir: &Path, plaintext: &str) -> AppResult<String> {
    use base64::{engine::general_purpose::STANDARD as BASE64, Engine};

    if plaintext.is_empty() {
        return Ok(String::new());
    }

    let key = get_or_create_master_key(config_dir)?;
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| AppError::Crypto(format!("Invalid key: {e}")))?;

    let mut nonce_bytes = [0u8; NONCE_SIZE];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| AppError::Crypto(format!("Encryption failed: {e}")))?;

    let mut payload = nonce_bytes.to_vec();
    payload.extend_from_slice(&ciphertext);
    Ok(BASE64.encode(payload))
}

pub fn decrypt(config_dir: &Path, encoded: &str) -> AppResult<String> {
    use base64::{engine::general_purpose::STANDARD as BASE64, Engine};

    if encoded.is_empty() {
        return Ok(String::new());
    }

    let key = get_or_create_master_key(config_dir)?;
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| AppError::Crypto(format!("Invalid key: {e}")))?;

    let payload = BASE64
        .decode(encoded)
        .map_err(|e| AppError::Crypto(format!("Invalid base64: {e}")))?;

    if payload.len() < NONCE_SIZE {
        return Err(AppError::Crypto("Ciphertext too short".into()));
    }

    let (nonce_bytes, ciphertext) = payload.split_at(NONCE_SIZE);
    let nonce = Nonce::from_slice(nonce_bytes);

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| AppError::Crypto(format!("Decryption failed: {e}")))?;

    String::from_utf8(plaintext).map_err(|e| AppError::Crypto(format!("Invalid UTF-8: {e}")))
}
