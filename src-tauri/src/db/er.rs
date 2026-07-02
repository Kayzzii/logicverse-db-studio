use crate::db::backend::DatabaseBackend;
use crate::db::types::{ErDiagramData, ErRelation, ErTable};
use crate::error::AppResult;

pub async fn get_table_relations(backend: &dyn DatabaseBackend, schema: &str) -> AppResult<ErDiagramData> {
    let tables = backend.list_tables(schema).await?;
    let mut er_tables = Vec::new();
    let mut relations = Vec::new();

    for table in tables {
        let columns = backend.list_columns(schema, &table.name).await?;
        for column in &columns {
            if let Some(fk) = &column.foreign_key {
                relations.push(ErRelation {
                    from_schema: schema.to_string(),
                    from_table: table.name.clone(),
                    from_column: column.name.clone(),
                    to_schema: fk.schema.clone(),
                    to_table: fk.table.clone(),
                    to_column: fk
                        .column
                        .clone()
                        .unwrap_or_else(|| column.name.clone()),
                });
            }
        }

        er_tables.push(ErTable {
            schema: schema.to_string(),
            name: table.name,
            columns,
        });
    }

    Ok(ErDiagramData {
        tables: er_tables,
        relations,
    })
}
