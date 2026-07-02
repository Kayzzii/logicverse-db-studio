use serde::{Deserialize, Serialize};

use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DatabaseDriver {
    Postgres,
    Mysql,
    Sqlite,
}

impl DatabaseDriver {
    pub fn parse(value: &str) -> AppResult<Self> {
        match value.to_lowercase().as_str() {
            "postgres" | "postgresql" | "pg" => Ok(Self::Postgres),
            "mysql" | "mariadb" => Ok(Self::Mysql),
            "sqlite" | "sqlite3" => Ok(Self::Sqlite),
            other => Err(AppError::Message(format!("Unsupported database driver: {other}"))),
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Self::Postgres => "postgres",
            Self::Mysql => "mysql",
            Self::Sqlite => "sqlite",
        }
    }

    pub fn display_name(self) -> &'static str {
        match self {
            Self::Postgres => "PostgreSQL",
            Self::Mysql => "MySQL",
            Self::Sqlite => "SQLite",
        }
    }

    pub fn default_port(self) -> u16 {
        match self {
            Self::Postgres => 5432,
            Self::Mysql => 3306,
            Self::Sqlite => 0,
        }
    }
}

pub fn default_driver_str() -> String {
    DatabaseDriver::Postgres.as_str().to_string()
}
