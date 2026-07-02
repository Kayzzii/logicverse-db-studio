use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use rand::RngCore;
use sha2::{Digest, Sha256};

use crate::error::{AppError, AppResult};

const NONCE_SIZE: usize = 12;

/// Deriva una clave AES-256 a partir de identificadores de la máquina.
pub fn derive_machine_key() -> AppResult<[u8; 32]> {
    let host = hostname::get()
        .map(|h| h.to_string_lossy().into_owned())
        .unwrap_or_else(|_| "logicverse-db-studio".to_string());

    let mut hasher = Sha256::new();
    hasher.update(b"logicverse-db-studio-v1");
    hasher.update(host.as_bytes());
    hasher.update(std::env::consts::OS.as_bytes());
    hasher.update(std::env::consts::ARCH.as_bytes());

    let result = hasher.finalize();
    let mut key = [0u8; 32];
    key.copy_from_slice(&result);
    Ok(key)
}

pub fn encrypt(plaintext: &str) -> AppResult<String> {
    if plaintext.is_empty() {
        return Ok(String::new());
    }

    let key = derive_machine_key()?;
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

    let key = derive_machine_key()?;
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
