use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("invalid registry address")]
    InvalidRegistryAddress,
    #[error("storage error: {0}")]
    Storage(String),
    #[error("registry request failed: {0}")]
    Registry(String),
    #[error("parse error: {0}")]
    Parse(String),
}

#[derive(Debug, Serialize)]
pub struct UiError {
    pub message: String,
}

impl From<AppError> for UiError {
    fn from(value: AppError) -> Self {
        Self { message: value.to_string() }
    }
}

impl From<serde_json::Error> for AppError {
    fn from(value: serde_json::Error) -> Self {
        Self::Parse(value.to_string())
    }
}
