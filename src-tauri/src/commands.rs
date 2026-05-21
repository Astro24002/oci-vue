use uuid::Uuid;

use crate::errors::UiError;
use crate::models::{ImageSummary, NewRegistryConnection, PagedImages, RegistryConnection, TagSummary};
use crate::registry_client::RegistryClient;
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

#[tauri::command]
pub async fn list_images(
    connection_id: String,
    page: u32,
    page_size: u32,
    search: Option<String>,
) -> Result<PagedImages, UiError> {
    let store = FileConnectionStore::new(default_app_data_dir().map_err(UiError::from)?);
    let connections = store.load_connections().map_err(UiError::from)?;
    let connection = find_connection(connections, &connection_id)?;
    let client = RegistryClient::new(&connection.registry_url, &connection.username, "")
        .map_err(UiError::from)?;
    let repositories = client.catalog(page_size, None).await.map_err(UiError::from)?;
    let filtered = repositories
        .into_iter()
        .filter(|name| search.as_ref().map(|term| name.contains(term)).unwrap_or(true));
    let mut items = Vec::new();
    for name in filtered {
        let tags = client.tags(&name).await.unwrap_or_default();
        let latest_tag = if tags.iter().any(|tag| tag == "latest") {
            Some("latest".to_string())
        } else {
            tags.last().cloned()
        };
        items.push(ImageSummary {
            name,
            latest_tag,
            digest: None,
            media_type: None,
            size: None,
            updated: None,
        });
    }
    Ok(PagedImages { items, page, page_size, total: None })
}

#[tauri::command]
pub async fn list_tags(connection_id: String, image_name: String) -> Result<Vec<TagSummary>, UiError> {
    let store = FileConnectionStore::new(default_app_data_dir().map_err(UiError::from)?);
    let connections = store.load_connections().map_err(UiError::from)?;
    let connection = find_connection(connections, &connection_id)?;
    let client = RegistryClient::new(&connection.registry_url, &connection.username, "")
        .map_err(UiError::from)?;
    let tags = client.tags(&image_name).await.map_err(UiError::from)?;
    Ok(tags
        .into_iter()
        .map(|name| TagSummary {
            name,
            digest: None,
            media_type: None,
            size: None,
            created: None,
        })
        .collect())
}

fn find_connection(
    connections: Vec<RegistryConnection>,
    connection_id: &str,
) -> Result<RegistryConnection, UiError> {
    connections
        .into_iter()
        .find(|connection| connection.id == connection_id)
        .ok_or_else(|| UiError { message: "connection not found".to_string() })
}
