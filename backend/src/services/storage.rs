use std::path::{Path, PathBuf};
use tokio::fs;

#[derive(Clone)]
pub struct StorageService {
    base_dir: PathBuf,
}

impl StorageService {
    pub async fn new(base_dir: &str) -> std::io::Result<Self> {
        let path = PathBuf::from(base_dir);
        fs::create_dir_all(&path).await?;
        fs::create_dir_all(path.join("documents")).await?;
        fs::create_dir_all(path.join("attachments")).await?;
        Ok(Self { base_dir: path })
    }

    pub async fn save_document(&self, file_id: &str, extension: &str, data: &[u8]) -> std::io::Result<String> {
        let filename = format!("{}.{}", file_id, extension.trim_start_matches('.'));
        let rel_path = Path::new("documents").join(filename);
        let abs_path = self.base_dir.join(&rel_path);
        fs::write(&abs_path, data).await?;
        Ok(rel_path.to_string_lossy().to_string())
    }

    pub async fn save_attachment(&self, file_id: &str, extension: &str, data: &[u8]) -> std::io::Result<String> {
        let filename = format!("{}.{}", file_id, extension.trim_start_matches('.'));
        let rel_path = Path::new("attachments").join(filename);
        let abs_path = self.base_dir.join(&rel_path);
        fs::write(&abs_path, data).await?;
        Ok(rel_path.to_string_lossy().to_string())
    }

    pub async fn read_file(&self, rel_path: &str) -> std::io::Result<Vec<u8>> {
        let abs_path = self.base_dir.join(rel_path);
        fs::read(abs_path).await
    }

    pub async fn delete_file(&self, rel_path: &str) -> std::io::Result<()> {
        let abs_path = self.base_dir.join(rel_path);
        if abs_path.exists() {
            fs::remove_file(abs_path).await?;
        }
        Ok(())
    }
}
