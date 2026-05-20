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
fn encrypts_without_storing_plaintext() {
    let encrypted = encrypt_secret("token-value", "local-key").expect("encrypt");

    assert!(!encrypted.contains("token-value"));
    assert_eq!(decrypt_secret(&encrypted, "local-key").expect("decrypt"), "token-value");
}
