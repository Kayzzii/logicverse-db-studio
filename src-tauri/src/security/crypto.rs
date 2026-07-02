use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use keyring::Entry;
use rand::RngCore;

use crate::error::{AppError, AppResult};

const NONCE_SIZE: usize = 12;
const KEYRING_SERVICE: &str = "logicverse-db-studio";
const KEYRING_USER: &str = "master-key";

/// Obtiene o crea una master key aleatoria almacenada en el keyring del SO.
pub fn get_or_create_master_key() -> AppResult<[u8; 32]> {
    let entry = Entry::new(KEYRING_SERVICE, KEYRING_USER)
        .map_err(|e| AppError::Crypto(format!("Keyring error: {e}")))?;

    match entry.get_password() {
        Ok(encoded) => {
            let bytes = BASE64
                .decode(encoded.trim())
                .map_err(|e| AppError::Crypto(format!("Invalid key: {e}")))?;

            if bytes.len() != 32 {
                return Err(AppError::Crypto("Invalid master key length".into()));
            }

            let mut key = [0u8; 32];
            key.copy_from_slice(&bytes);
            Ok(key)
        }
        Err(_) => {
            let mut key = [0u8; 32];
            rand::thread_rng().fill_bytes(&mut key);

            entry
                .set_password(&BASE64.encode(key))
                .map_err(|e| AppError::Crypto(format!("Keyring save error: {e}")))?;

            Ok(key)
        }
    }
}

pub fn encrypt(plaintext: &str) -> AppResult<String> {
    if plaintext.is_empty() {
        return Ok(String::new());
    }

    let key = get_or_create_master_key()?;
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

pub fn decrypt(encoded: &str) -> AppResult<String> {
    if encoded.is_empty() {
        return Ok(String::new());
    }

    let key = get_or_create_master_key()?;
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
