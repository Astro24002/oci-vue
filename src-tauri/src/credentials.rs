use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Nonce};
use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use rand::RngCore;
use sha2::{Digest, Sha256};

use crate::errors::AppError;

pub fn encrypt_secret(secret: &str, local_key: &str) -> Result<String, AppError> {
    let key = derive_key(local_key)?;
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|err| AppError::Storage(err.to_string()))?;
    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher
        .encrypt(nonce, secret.as_bytes())
        .map_err(|err| AppError::Storage(err.to_string()))?;

    Ok(format!("{}:{}", STANDARD.encode(nonce_bytes), STANDARD.encode(ciphertext)))
}

pub fn decrypt_secret(encrypted: &str, local_key: &str) -> Result<String, AppError> {
    let (nonce, ciphertext) = encrypted
        .split_once(':')
        .ok_or_else(|| AppError::Storage("invalid encrypted secret format".to_string()))?;
    let nonce = STANDARD.decode(nonce).map_err(|err| AppError::Storage(err.to_string()))?;
    if nonce.len() != 12 {
        return Err(AppError::Storage("invalid encrypted secret nonce length".to_string()));
    }
    let ciphertext = STANDARD.decode(ciphertext).map_err(|err| AppError::Storage(err.to_string()))?;
    let key = derive_key(local_key)?;
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|err| AppError::Storage(err.to_string()))?;
    let plaintext = cipher
        .decrypt(Nonce::from_slice(&nonce), ciphertext.as_ref())
        .map_err(|err| AppError::Storage(err.to_string()))?;

    String::from_utf8(plaintext).map_err(|err| AppError::Storage(err.to_string()))
}

fn derive_key(local_key: &str) -> Result<[u8; 32], AppError> {
    if local_key.is_empty() {
        return Err(AppError::Storage("local key material must not be empty".to_string()));
    }

    Ok(Sha256::digest(local_key.as_bytes()).into())
}
