use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub theme: String,
    pub max_rows: u32,
}

pub struct SettingsStore {
    path: std::path::PathBuf,
}

impl SettingsStore {
    pub fn new(path: std::path::PathBuf) -> Self {
        Self { path }
    }

    pub fn load(&self) -> crate::error::AppResult<AppSettings> {
        if !self.path.exists() {
            return Ok(AppSettings {
                theme: "dark".into(),
                max_rows: 100_000,
            });
        }

        let content = std::fs::read_to_string(&self.path)?;
        Ok(serde_json::from_str(&content)?)
    }

    pub fn save(&self, settings: &AppSettings) -> crate::error::AppResult<()> {
        if let Some(parent) = self.path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let content = serde_json::to_string_pretty(settings)?;
        std::fs::write(&self.path, content)?;
        Ok(())
    }
}
