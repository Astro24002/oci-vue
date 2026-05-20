use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RegistryConnection {
    pub id: String,
    pub name: String,
    pub registry_url: String,
    pub username: String,
    pub remember_secret: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct NewRegistryConnection {
    pub name: String,
    pub registry_url: String,
    pub username: String,
    pub secret: String,
    pub remember_secret: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ImageSummary {
    pub name: String,
    pub latest_tag: Option<String>,
    pub digest: Option<String>,
    pub media_type: Option<String>,
    pub size: Option<u64>,
    pub updated: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PagedImages {
    pub items: Vec<ImageSummary>,
    pub page: u32,
    pub page_size: u32,
    pub total: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TagSummary {
    pub name: String,
    pub digest: Option<String>,
    pub media_type: Option<String>,
    pub size: Option<u64>,
    pub created: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ManifestSummary {
    pub schema_version: u32,
    pub media_type: Option<String>,
    pub config_digest: Option<String>,
    pub config_media_type: Option<String>,
    pub config_size: Option<u64>,
    pub layers: Vec<LayerSummary>,
    pub raw_json: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct LayerSummary {
    pub digest: String,
    pub media_type: Option<String>,
    pub size: Option<u64>,
    pub history: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ImageConfigSummary {
    pub created: Option<String>,
    pub architecture: Option<String>,
    pub os: Option<String>,
    pub layer_history: Vec<HistoryEntry>,
    pub empty_history: Vec<HistoryEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct HistoryEntry {
    pub created_by: Option<String>,
}
