use uuid::Uuid;

use crate::errors::UiError;
use crate::models::{ImageSummary, NewRegistryConnection, PagedImages, RegistryConnection, TagSummary};
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
    _connection_id: String,
    page: u32,
    page_size: u32,
    search: Option<String>,
) -> Result<PagedImages, UiError> {
    let mut items = vec![
        ImageSummary {
            name: "platform/api".to_string(),
            latest_tag: Some("v1.8.2".to_string()),
            digest: Some("sha256:9f2a8d".to_string()),
            media_type: Some("OCI Image".to_string()),
            size: Some(88_604_672),
            updated: Some("2026-05-18".to_string()),
        },
        ImageSummary {
            name: "infra/charts/nginx".to_string(),
            latest_tag: Some("0.4.1".to_string()),
            digest: Some("sha256:69abc4".to_string()),
            media_type: Some("Helm Chart".to_string()),
            size: Some(319_488),
            updated: Some("2026-05-16".to_string()),
        },
    ];
    if let Some(search) = search {
        items.retain(|image| image.name.contains(&search));
    }
    Ok(PagedImages { items, page, page_size, total: Some(2) })
}

#[tauri::command]
pub async fn list_tags(_connection_id: String, _image_name: String) -> Result<Vec<TagSummary>, UiError> {
    Ok(vec![
        TagSummary {
            name: "v1.8.2".to_string(),
            digest: Some("sha256:9f2a8d".to_string()),
            media_type: Some("OCI Image".to_string()),
            size: Some(88_604_672),
            created: Some("2026-05-18".to_string()),
        },
        TagSummary {
            name: "latest".to_string(),
            digest: Some("sha256:9f2a8d".to_string()),
            media_type: Some("OCI Image".to_string()),
            size: Some(88_604_672),
            created: Some("2026-05-18".to_string()),
        },
    ])
}
