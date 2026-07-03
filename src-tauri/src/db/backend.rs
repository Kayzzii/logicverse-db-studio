use async_trait::async_trait;

use crate::config::connections::ConnectionConfig;
use crate::db::introspection::{mysql, postgres, sqlite};
use crate::db::pool::DatabasePool;
use crate::db::types::{ColumnInfo, TableInfo};
use crate::error::AppResult;

#[async_trait]
pub trait DatabaseBackend: Send + Sync {
    fn pool(&self) -> &DatabasePool;

    async fn list_databases(&self) -> AppResult<Vec<String>>;
    async fn list_schemas(&self, database: &str) -> AppResult<Vec<String>>;
    async fn list_tables(&self, schema: &str) -> AppResult<Vec<TableInfo>>;
    async fn list_columns(&self, schema: &str, table: &str) -> AppResult<Vec<ColumnInfo>>;
    async fn server_version(&self) -> AppResult<String>;
    async fn close(&self);
}

pub struct ConnectedBackend {
    pool: DatabasePool,
    config: ConnectionConfig,
}

impl ConnectedBackend {
    pub async fn connect_with_endpoint(
        config: ConnectionConfig,
        host: &str,
        port: u16,
    ) -> AppResult<Self> {
        let url = config.build_url_with_endpoint(host, port)?;
        let pool = DatabasePool::connect(&url, config.driver).await?;
        Ok(Self { pool, config })
    }

    pub async fn test_with_endpoint(config: &ConnectionConfig, host: &str, port: u16) -> AppResult<()> {
        let url = config.build_url_with_endpoint(host, port)?;
        let pool = DatabasePool::connect_test(&url, config.driver).await?;
        pool.ping().await?;
        pool.close().await;
        Ok(())
    }
}

#[async_trait]
impl DatabaseBackend for ConnectedBackend {
    fn pool(&self) -> &DatabasePool {
        &self.pool
    }

    async fn list_databases(&self) -> AppResult<Vec<String>> {
        match &self.pool {
            DatabasePool::Postgres(pool) => postgres::list_databases(pool).await,
            DatabasePool::MySql(pool) => mysql::list_databases(pool).await,
            DatabasePool::Sqlite(pool) => {
                sqlite::list_databases(pool, &self.config.database).await
            }
        }
    }

    async fn list_schemas(&self, database: &str) -> AppResult<Vec<String>> {
        match &self.pool {
            DatabasePool::Postgres(pool) => {
                postgres::list_schemas(pool, database, &self.config.database).await
            }
            DatabasePool::MySql(pool) => {
                mysql::list_schemas(pool, database, &self.config.database).await
            }
            DatabasePool::Sqlite(pool) => {
                sqlite::list_schemas(pool, database, &self.config.database).await
            }
        }
    }

    async fn list_tables(&self, schema: &str) -> AppResult<Vec<TableInfo>> {
        match &self.pool {
            DatabasePool::Postgres(pool) => postgres::list_tables(pool, schema).await,
            DatabasePool::MySql(pool) => mysql::list_tables(pool, schema).await,
            DatabasePool::Sqlite(pool) => sqlite::list_tables(pool, schema).await,
        }
    }

    async fn list_columns(&self, schema: &str, table: &str) -> AppResult<Vec<ColumnInfo>> {
        match &self.pool {
            DatabasePool::Postgres(pool) => postgres::list_columns(pool, schema, table).await,
            DatabasePool::MySql(pool) => mysql::list_columns(pool, schema, table).await,
            DatabasePool::Sqlite(pool) => sqlite::list_columns(pool, schema, table).await,
        }
    }

    async fn server_version(&self) -> AppResult<String> {
        match &self.pool {
            DatabasePool::Postgres(pool) => postgres::server_version(pool).await,
            DatabasePool::MySql(pool) => mysql::server_version(pool).await,
            DatabasePool::Sqlite(pool) => sqlite::server_version(pool).await,
        }
    }

    async fn close(&self) {
        self.pool.close().await;
    }
}
