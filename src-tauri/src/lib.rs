pub mod commands;
pub mod credentials;
pub mod errors;
pub mod manifest;
pub mod models;
pub mod registry_client;
pub mod storage;

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::list_connections,
            commands::save_connection
        ])
        .run(tauri::generate_context!())
        .expect("error while running OCI Vue");
}
