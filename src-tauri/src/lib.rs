pub mod credentials;
pub mod errors;
pub mod manifest;
pub mod models;
pub mod storage;

pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running OCI Vue");
}
