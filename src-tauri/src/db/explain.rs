use std::time::Instant;

use serde_json::Value;
use tokio_util::sync::CancellationToken;

use crate::db::pool::DatabasePool;
use crate::db::query::{self, CancelHandle};
use crate::db::types::{ExplainPlanNode, ExplainResult};
use crate::error::{AppError, AppResult};

pub async fn explain_query(
    pool: DatabasePool,
    sql: String,
    token: CancellationToken,
    cancel_handle: CancelHandle,
) -> AppResult<ExplainResult> {
    let driver = pool.driver();
    let trimmed = sql.trim().trim_end_matches(';');
    if trimmed.is_empty() {
        return Err(AppError::Message("Query is empty".into()));
    }

    let start = Instant::now();
    let explain_sql = build_explain_sql(driver, trimmed)?;

    let result = query::execute_query(pool, explain_sql, token, cancel_handle).await?;

    let root = match driver {
        crate::db::DatabaseDriver::Postgres => parse_postgres_explain(&result)?,
        crate::db::DatabaseDriver::Mysql => parse_mysql_explain(&result)?,
        crate::db::DatabaseDriver::Sqlite => parse_sqlite_explain(&result)?,
    };

    Ok(ExplainResult {
        driver: driver.as_str().to_string(),
        execution_time_ms: start.elapsed().as_millis() as u64,
        root,
    })
}

fn build_explain_sql(driver: crate::db::DatabaseDriver, sql: &str) -> AppResult<String> {
    match driver {
        crate::db::DatabaseDriver::Postgres => Ok(format!(
            "EXPLAIN (ANALYZE, FORMAT JSON) {sql}"
        )),
        crate::db::DatabaseDriver::Mysql => Ok(format!("EXPLAIN FORMAT=JSON {sql}")),
        crate::db::DatabaseDriver::Sqlite => Ok(format!("EXPLAIN QUERY PLAN {sql}")),
    }
}

fn parse_postgres_explain(result: &crate::db::types::QueryResult) -> AppResult<ExplainPlanNode> {
    let json_text = result
        .rows
        .first()
        .and_then(|row| row.first())
        .and_then(|v| v.as_ref())
        .ok_or_else(|| AppError::Message("Empty EXPLAIN result".into()))?;

    let value: Value = serde_json::from_str(json_text)?;
    let plan = value
        .get(0)
        .and_then(|entry| entry.get("Plan"))
        .ok_or_else(|| AppError::Message("Invalid PostgreSQL EXPLAIN JSON".into()))?;

    Ok(parse_pg_plan_node(plan))
}

fn parse_pg_plan_node(plan: &Value) -> ExplainPlanNode {
    let node_type = plan
        .get("Node Type")
        .and_then(|v| v.as_str())
        .unwrap_or("Unknown")
        .to_string();

    let estimated_rows = plan.get("Plan Rows").and_then(|v| v.as_f64());
    let actual_rows = plan
        .get("Actual Rows")
        .or_else(|| plan.get("Plan Rows"))
        .and_then(|v| v.as_f64());
    let estimated_cost = plan.get("Total Cost").and_then(|v| v.as_f64());
    let actual_time_ms = plan
        .get("Actual Total Time")
        .and_then(|v| v.as_f64());

    let children = plan
        .get("Plans")
        .and_then(|v| v.as_array())
        .map(|plans| plans.iter().map(parse_pg_plan_node).collect())
        .unwrap_or_default();

    let rows_ratio = ratio(actual_rows, estimated_rows);

    ExplainPlanNode {
        node_type,
        relation_name: plan
            .get("Relation Name")
            .and_then(|v| v.as_str())
            .map(str::to_string),
        alias: plan.get("Alias").and_then(|v| v.as_str()).map(str::to_string),
        estimated_rows,
        actual_rows,
        estimated_cost,
        actual_time_ms,
        rows_ratio,
        children,
    }
}

fn parse_mysql_explain(result: &crate::db::types::QueryResult) -> AppResult<ExplainPlanNode> {
    let json_text = result
        .rows
        .first()
        .and_then(|row| row.first())
        .and_then(|v| v.as_ref())
        .ok_or_else(|| AppError::Message("Empty EXPLAIN result".into()))?;

    let value: Value = serde_json::from_str(json_text)?;
    let query_block = value
        .get("query_block")
        .ok_or_else(|| AppError::Message("Invalid MySQL EXPLAIN JSON".into()))?;

    let estimated_rows = query_block
        .get("cost_info")
        .and_then(|c| c.get("query_cost"))
        .and_then(|v| v.as_f64());

    let table = query_block.get("table");
    let node_type = table
        .and_then(|t| t.get("access_type"))
        .and_then(|v| v.as_str())
        .unwrap_or("query_block")
        .to_string();

    let relation_name = table
        .and_then(|t| t.get("table_name"))
        .and_then(|v| v.as_str())
        .map(str::to_string);

    let actual_rows = table
        .and_then(|t| t.get("rows_examined"))
        .and_then(|v| v.as_f64());

    let estimated_table_rows = table
        .and_then(|t| t.get("rows"))
        .and_then(|v| v.as_f64());

    Ok(ExplainPlanNode {
        node_type,
        relation_name,
        alias: None,
        estimated_rows: estimated_table_rows.or(estimated_rows),
        actual_rows,
        estimated_cost: estimated_rows,
        actual_time_ms: None,
        rows_ratio: ratio(actual_rows, estimated_table_rows.or(estimated_rows)),
        children: Vec::new(),
    })
}

fn parse_sqlite_explain(result: &crate::db::types::QueryResult) -> AppResult<ExplainPlanNode> {
    if result.rows.is_empty() {
        return Err(AppError::Message("Empty EXPLAIN result".into()));
    }

    let mut children = Vec::new();
    for row in &result.rows {
        let detail = row
            .get(3)
            .or_else(|| row.get(2))
            .or_else(|| row.get(1))
            .or_else(|| row.get(0))
            .and_then(|v| v.as_ref())
            .cloned()
            .unwrap_or_else(|| "step".into());

        children.push(ExplainPlanNode {
            node_type: detail,
            relation_name: row.get(0).and_then(|v| v.clone()),
            alias: None,
            estimated_rows: None,
            actual_rows: None,
            estimated_cost: None,
            actual_time_ms: None,
            rows_ratio: None,
            children: Vec::new(),
        });
    }

    Ok(ExplainPlanNode {
        node_type: "QUERY PLAN".into(),
        relation_name: None,
        alias: None,
        estimated_rows: None,
        actual_rows: None,
        estimated_cost: None,
        actual_time_ms: None,
        rows_ratio: None,
        children,
    })
}

fn ratio(actual: Option<f64>, estimated: Option<f64>) -> Option<f64> {
    match (actual, estimated) {
        (Some(a), Some(e)) if e > 0.0 => Some(a / e),
        _ => None,
    }
}
