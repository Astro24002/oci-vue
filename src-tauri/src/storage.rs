use std::fs;
use std::path::PathBuf;

use crate::errors::AppError;
use crate::models::RegistryConnection;

pub trait ConnectionStore {
    fn load_connections(&self) -> Result<Vec<RegistryConnection>, AppError>;
    fn save_connections(&self, connections: &[RegistryConnection]) -> Result<(), AppError>;
}

#[derive(Debug, Clone)]
pub struct FileConnectionStore {
    base_dir: PathBuf,
}

impl FileConnectionStore {
    pub fn new(base_dir: PathBuf) -> Self {
        Self { base_dir }
    }

    fn file_path(&self) -> PathBuf {
        self.base_dir.join("connections.json")
    }
}

impl ConnectionStore for FileConnectionStore {
    fn load_connections(&self) -> Result<Vec<RegistryConnection>, AppError> {
        let path = self.file_path();
        if !path.exists() {
            return Ok(Vec::new());
        }
        let contents = fs::read_to_string(path).map_err(|err| AppError::Storage(err.to_string()))?;
        serde_json::from_str(&contents).map_err(AppError::from)
    }

    fn save_connections(&self, connections: &[RegistryConnection]) -> Result<(), AppError> {
        fs::create_dir_all(&self.base_dir).map_err(|err| AppError::Storage(err.to_string()))?;
        let contents = serde_json::to_string_pretty(connections).map_err(AppError::from)?;
        let temp_path = self.base_dir.join("connections.json.tmp");
        fs::write(&temp_path, contents).map_err(|err| AppError::Storage(err.to_string()))?;
        fs::rename(temp_path, self.file_path()).map_err(|err| AppError::Storage(err.to_string()))
    }
}

pub fn default_app_data_dir() -> Result<PathBuf, AppError> {
    dirs::data_local_dir()
        .map(|dir| dir.join("oci-vue"))
        .ok_or_else(|| AppError::Storage("unable to resolve local app data directory".to_string()))
}
