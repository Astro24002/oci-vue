use std::fs;
use std::io;
use std::path::{Path, PathBuf};

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
        let destination_path = self.file_path();
        fs::write(&temp_path, contents).map_err(|err| AppError::Storage(err.to_string()))?;
        replace_file_with_temp(&temp_path, &destination_path, |from, to| fs::rename(from, to))
    }
}

pub fn replace_file_with_temp<F>(
    temp_path: &Path,
    destination_path: &Path,
    mut rename: F,
) -> Result<(), AppError>
where
    F: FnMut(&Path, &Path) -> io::Result<()>,
{
    if !destination_path.exists() {
        return rename(temp_path, destination_path).map_err(|err| AppError::Storage(err.to_string()));
    }

    let backup_path = destination_path.with_extension("json.bak");
    if backup_path.exists() {
        fs::remove_file(&backup_path).map_err(|err| AppError::Storage(err.to_string()))?;
    }
    rename(destination_path, &backup_path).map_err(|err| AppError::Storage(err.to_string()))?;

    if let Err(rename_error) = rename(temp_path, destination_path) {
        rename(&backup_path, destination_path).map_err(|restore_error| {
            AppError::Storage(format!(
                "failed to replace connections file: {}; failed to restore backup: {}",
                rename_error, restore_error
            ))
        })?;
        return Err(AppError::Storage(rename_error.to_string()));
    }

    fs::remove_file(backup_path).map_err(|err| AppError::Storage(err.to_string()))
}

pub fn default_app_data_dir() -> Result<PathBuf, AppError> {
    dirs::data_local_dir()
        .map(|dir| dir.join("oci-vue"))
        .ok_or_else(|| AppError::Storage("unable to resolve local app data directory".to_string()))
}
