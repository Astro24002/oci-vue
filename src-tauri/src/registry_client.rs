use serde::Deserialize;

use crate::errors::AppError;

#[derive(Debug, Deserialize)]
struct CatalogResponse {
    repositories: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct TagsResponse {
    tags: Option<Vec<String>>,
}

#[derive(Debug, Clone)]
pub struct RegistryClient {
    client: reqwest::Client,
    base_url: String,
    username: String,
    secret: String,
}

impl RegistryClient {
    pub fn new(registry_url: &str, username: &str, secret: &str) -> Result<Self, AppError> {
        let base_url = normalize_registry_url(registry_url)?;
        Ok(Self {
            client: reqwest::Client::new(),
            base_url,
            username: username.to_string(),
            secret: secret.to_string(),
        })
    }

    pub async fn catalog(&self, page_size: u32, last: Option<&str>) -> Result<Vec<String>, AppError> {
        let mut url = format!("{}/v2/_catalog?n={}", self.base_url, page_size);
        if let Some(last) = last {
            url.push_str("&last=");
            url.push_str(last);
        }
        let response = self
            .client
            .get(url)
            .basic_auth(&self.username, Some(&self.secret))
            .send()
            .await
            .map_err(|err| AppError::Registry(err.to_string()))?
            .error_for_status()
            .map_err(|err| AppError::Registry(err.to_string()))?
            .text()
            .await
            .map_err(|err| AppError::Registry(err.to_string()))?;
        parse_catalog_response(&response)
    }

    pub async fn tags(&self, image: &str) -> Result<Vec<String>, AppError> {
        let url = format!("{}/v2/{}/tags/list", self.base_url, image);
        let response = self
            .client
            .get(url)
            .basic_auth(&self.username, Some(&self.secret))
            .send()
            .await
            .map_err(|err| AppError::Registry(err.to_string()))?
            .error_for_status()
            .map_err(|err| AppError::Registry(err.to_string()))?
            .text()
            .await
            .map_err(|err| AppError::Registry(err.to_string()))?;
        parse_tags_response(&response)
    }

    pub async fn manifest(&self, image: &str, reference: &str) -> Result<String, AppError> {
        let url = format!("{}/v2/{}/manifests/{}", self.base_url, image, reference);
        self.client
            .get(url)
            .basic_auth(&self.username, Some(&self.secret))
            .header("Accept", "application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json")
            .send()
            .await
            .map_err(|err| AppError::Registry(err.to_string()))?
            .error_for_status()
            .map_err(|err| AppError::Registry(err.to_string()))?
            .text()
            .await
            .map_err(|err| AppError::Registry(err.to_string()))
    }
}

pub fn parse_catalog_response(raw: &str) -> Result<Vec<String>, AppError> {
    let response: CatalogResponse = serde_json::from_str(raw)?;
    Ok(response.repositories)
}

pub fn parse_tags_response(raw: &str) -> Result<Vec<String>, AppError> {
    let response: TagsResponse = serde_json::from_str(raw)?;
    Ok(response.tags.unwrap_or_default())
}

fn normalize_registry_url(input: &str) -> Result<String, AppError> {
    let trimmed = input.trim().trim_end_matches('/');
    if trimmed.is_empty() || trimmed.contains("/v2") {
        return Err(AppError::InvalidRegistryAddress);
    }
    if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        Ok(trimmed.to_string())
    } else {
        Ok(format!("https://{}", trimmed))
    }
}
