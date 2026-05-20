use serde::Deserialize;
use url::Url;

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

    pub async fn catalog(
        &self,
        page_size: u32,
        last: Option<&str>,
    ) -> Result<Vec<String>, AppError> {
        let url = build_catalog_url(&self.base_url, page_size, last)?;
        let response = self
            .client
            .get(url)
            .basic_auth(&self.username, Some(&self.secret))
            .send()
            .await
            .map_err(|err| AppError::Registry(format!("catalog request failed: {}", err)))?
            .error_for_status()
            .map_err(|err| AppError::Registry(format!("catalog request failed: {}", err)))?
            .text()
            .await
            .map_err(|err| AppError::Registry(format!("catalog request failed: {}", err)))?;
        parse_catalog_response(&response)
    }

    pub async fn tags(&self, image: &str) -> Result<Vec<String>, AppError> {
        let url = build_tags_url(&self.base_url, image)?;
        let response = self
            .client
            .get(url)
            .basic_auth(&self.username, Some(&self.secret))
            .send()
            .await
            .map_err(|err| {
                AppError::Registry(format!(
                    "tags request failed for image '{}': {}",
                    image, err
                ))
            })?
            .error_for_status()
            .map_err(|err| {
                AppError::Registry(format!(
                    "tags request failed for image '{}': {}",
                    image, err
                ))
            })?
            .text()
            .await
            .map_err(|err| {
                AppError::Registry(format!(
                    "tags request failed for image '{}': {}",
                    image, err
                ))
            })?;
        parse_tags_response(&response)
    }

    pub async fn manifest(&self, image: &str, reference: &str) -> Result<String, AppError> {
        let url = build_manifest_url(&self.base_url, image, reference)?;
        self.client
            .get(url)
            .basic_auth(&self.username, Some(&self.secret))
            .header("Accept", "application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json")
            .send()
            .await
            .map_err(|err| AppError::Registry(format!("manifest request failed for image '{}' reference '{}': {}", image, reference, err)))?
            .error_for_status()
            .map_err(|err| AppError::Registry(format!("manifest request failed for image '{}' reference '{}': {}", image, reference, err)))?
            .text()
            .await
            .map_err(|err| AppError::Registry(format!("manifest request failed for image '{}' reference '{}': {}", image, reference, err)))
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

pub fn build_catalog_url(
    base_url: &str,
    page_size: u32,
    last: Option<&str>,
) -> Result<Url, AppError> {
    let mut url = normalized_base_url(base_url)?;
    url.path_segments_mut()
        .map_err(|_| AppError::InvalidRegistryAddress)?
        .extend(["v2", "_catalog"]);
    {
        let mut query = url.query_pairs_mut();
        query.append_pair("n", &page_size.to_string());
        if let Some(last) = last {
            query.append_pair("last", last);
        }
    }
    Ok(url)
}

pub fn build_tags_url(base_url: &str, image: &str) -> Result<Url, AppError> {
    let mut url = normalized_base_url(base_url)?;
    let segments = repository_segments(image)?;
    url.path_segments_mut()
        .map_err(|_| AppError::InvalidRegistryAddress)?
        .push("v2")
        .extend(segments)
        .extend(["tags", "list"]);
    Ok(url)
}

pub fn build_manifest_url(base_url: &str, image: &str, reference: &str) -> Result<Url, AppError> {
    if has_path_injection_chars(reference) || reference.is_empty() {
        return Err(AppError::InvalidRegistryAddress);
    }

    let mut url = normalized_base_url(base_url)?;
    let segments = repository_segments(image)?;
    url.path_segments_mut()
        .map_err(|_| AppError::InvalidRegistryAddress)?
        .push("v2")
        .extend(segments)
        .push("manifests")
        .push(reference);
    Ok(url)
}

pub fn normalize_registry_url(input: &str) -> Result<String, AppError> {
    let mut url = parse_registry_url(input)?;
    if url.path() == "/v2" || url.path() == "/v2/" {
        return Err(AppError::InvalidRegistryAddress);
    }

    url.set_path("");
    Ok(url.to_string().trim_end_matches('/').to_string())
}

fn normalized_base_url(input: &str) -> Result<Url, AppError> {
    Url::parse(&normalize_registry_url(input)?).map_err(|_| AppError::InvalidRegistryAddress)
}

fn parse_registry_url(input: &str) -> Result<Url, AppError> {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return Err(AppError::InvalidRegistryAddress);
    }

    let with_scheme = if trimmed.contains("://") {
        trimmed.to_string()
    } else {
        format!("https://{}", trimmed)
    };

    let url = Url::parse(&with_scheme).map_err(|_| AppError::InvalidRegistryAddress)?;
    if !matches!(url.scheme(), "http" | "https")
        || url.host_str().is_none()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.query().is_some()
        || url.fragment().is_some()
        || !matches!(url.path(), "" | "/" | "/v2" | "/v2/")
    {
        return Err(AppError::InvalidRegistryAddress);
    }
    Ok(url)
}

fn repository_segments(image: &str) -> Result<Vec<&str>, AppError> {
    if has_path_injection_chars(image) {
        return Err(AppError::InvalidRegistryAddress);
    }

    let segments: Vec<&str> = image.split('/').collect();
    if segments.is_empty() || segments.iter().any(|segment| segment.is_empty()) {
        return Err(AppError::InvalidRegistryAddress);
    }
    Ok(segments)
}

fn has_path_injection_chars(value: &str) -> bool {
    value.contains('?') || value.contains('#')
}
