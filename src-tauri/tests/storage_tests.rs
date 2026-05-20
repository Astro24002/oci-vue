use std::fs;

use oci_vue_lib::credentials::{decrypt_secret, encrypt_secret};
use oci_vue_lib::models::RegistryConnection;
use oci_vue_lib::storage::{ConnectionStore, FileConnectionStore};
use tempfile::tempdir;

#[test]
fn saves_and_loads_connections() {
    let dir = tempdir().expect("tempdir");
    let store = FileConnectionStore::new(dir.path().to_path_buf());
    let connection = RegistryConnection {
        id: "abc".to_string(),
        name: "Harbor Prod".to_string(),
        registry_url: "harbor.company.local".to_string(),
        username: "robot".to_string(),
        remember_secret: true,
    };

    store.save_connections(&[connection.clone()]).expect("save");
    let loaded = store.load_connections().expect("load");

    assert_eq!(loaded, vec![connection]);
}

#[test]
fn repeated_save_replaces_existing_connections() {
    let dir = tempdir().expect("tempdir");
    let store = FileConnectionStore::new(dir.path().to_path_buf());
    let first = RegistryConnection {
        id: "abc".to_string(),
        name: "Harbor Prod".to_string(),
        registry_url: "harbor.company.local".to_string(),
        username: "robot".to_string(),
        remember_secret: true,
    };
    let second = RegistryConnection {
        id: "def".to_string(),
        name: "GHCR".to_string(),
        registry_url: "ghcr.io".to_string(),
        username: "developer".to_string(),
        remember_secret: false,
    };

    store.save_connections(&[first]).expect("first save");
    store.save_connections(&[second.clone()]).expect("second save");

    assert_eq!(store.load_connections().expect("load"), vec![second]);
}

#[test]
fn encrypts_without_storing_plaintext() {
    let encrypted = encrypt_secret("token-value", "local-key").expect("encrypt");

    assert!(!encrypted.contains("token-value"));
    assert_eq!(decrypt_secret(&encrypted, "local-key").expect("decrypt"), "token-value");
}

#[test]
fn corrupted_connections_file_returns_error() {
    let dir = tempdir().expect("tempdir");
    fs::write(dir.path().join("connections.json"), "not-json").expect("write corrupted file");
    let store = FileConnectionStore::new(dir.path().to_path_buf());

    assert!(store.load_connections().is_err());
}

#[test]
fn malformed_encrypted_payload_returns_error() {
    assert!(decrypt_secret("not-encrypted", "local-key").is_err());
}

#[test]
fn wrong_key_decrypt_returns_error() {
    let encrypted = encrypt_secret("token-value", "local-key").expect("encrypt");

    assert!(decrypt_secret(&encrypted, "wrong-key").is_err());
}

#[test]
fn short_nonce_returns_error_without_panic() {
    let result = std::panic::catch_unwind(|| decrypt_secret("AAAA:AAAA", "local-key"));

    assert!(result.is_ok());
    assert!(result.expect("no panic").is_err());
}

#[test]
fn empty_key_material_returns_error() {
    assert!(encrypt_secret("token-value", "").is_err());
    assert!(decrypt_secret("AAAA:AAAA", "").is_err());
}
