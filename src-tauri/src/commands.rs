use uuid::Uuid;

use crate::errors::UiError;
use crate::models::{NewRegistryConnection, RegistryConnection};
use crate::storage::{default_app_data_dir, ConnectionStore, FileConnectionStore};

#[tauri::command]
pub async fn list_connections() -> Result<Vec<RegistryConnection>, UiError> {
    let store = FileConnectionStore::new(default_app_data_dir().map_err(UiError::from)?);
    store.load_connections().map_err(UiError::from)
}

#[tauri::command]
pub async fn save_connection(input: NewRegistryConnection) -> Result<RegistryConnection, UiError> {
    let store = FileConnectionStore::new(default_app_data_dir().map_err(UiError::from)?);
    let mut connections = store.load_connections().map_err(UiError::from)?;
    let connection = RegistryConnection {
        id: Uuid::new_v4().to_string(),
        name: input.name,
        registry_url: input.registry_url,
        username: input.username,
        remember_secret: input.remember_secret,
    };
    connections.push(connection.clone());
    store.save_connections(&connections).map_err(UiError::from)?;
    Ok(connection)
}
