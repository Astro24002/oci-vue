use serde::Deserialize;

use crate::errors::AppError;
use crate::models::{HistoryEntry, ImageConfigSummary, LayerSummary, ManifestSummary};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawManifest {
    schema_version: u32,
    media_type: Option<String>,
    config: Option<RawDescriptor>,
    layers: Option<Vec<RawDescriptor>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawDescriptor {
    media_type: Option<String>,
    digest: String,
    size: Option<u64>,
}

#[derive(Debug, Deserialize)]
struct RawConfig {
    created: Option<String>,
    architecture: Option<String>,
    os: Option<String>,
    history: Option<Vec<RawHistoryEntry>>,
}

#[derive(Debug, Deserialize)]
struct RawHistoryEntry {
    created_by: Option<String>,
    empty_layer: Option<bool>,
}

pub fn parse_manifest_summary(raw_json: &str) -> Result<ManifestSummary, AppError> {
    let raw: RawManifest = serde_json::from_str(raw_json)?;
    let config = raw
        .config
        .ok_or_else(|| AppError::Parse("manifest is missing config".to_string()))?;
    let layers = raw
        .layers
        .ok_or_else(|| AppError::Parse("manifest is missing layers".to_string()))?
        .into_iter()
        .map(|layer| LayerSummary {
            digest: layer.digest,
            media_type: layer.media_type,
            size: layer.size,
            history: None,
        })
        .collect();

    Ok(ManifestSummary {
        schema_version: raw.schema_version,
        media_type: raw.media_type,
        config_digest: Some(config.digest),
        config_media_type: config.media_type,
        config_size: config.size,
        layers,
        raw_json: raw_json.to_string(),
    })
}

pub fn parse_image_config(raw_json: &str) -> Result<ImageConfigSummary, AppError> {
    let raw: RawConfig = serde_json::from_str(raw_json)?;
    let mut layer_history = Vec::new();
    let mut empty_history = Vec::new();

    for history in raw.history.unwrap_or_default() {
        let entry = HistoryEntry { created_by: history.created_by };
        if history.empty_layer.unwrap_or(false) {
            empty_history.push(entry);
        } else {
            layer_history.push(entry);
        }
    }

    Ok(ImageConfigSummary {
        created: raw.created,
        architecture: raw.architecture,
        os: raw.os,
        layer_history,
        empty_history,
    })
}

pub fn attach_history(mut manifest: ManifestSummary, config: &ImageConfigSummary) -> Result<ManifestSummary, AppError> {
    if config.layer_history.len() != manifest.layers.len() {
        return Err(AppError::Parse(format!(
            "manifest layer count {} does not match config history count {}",
            manifest.layers.len(),
            config.layer_history.len()
        )));
    }

    for (index, layer) in manifest.layers.iter_mut().enumerate() {
        layer.history = config.layer_history.get(index).and_then(|entry| entry.created_by.clone());
    }
    Ok(manifest)
}
