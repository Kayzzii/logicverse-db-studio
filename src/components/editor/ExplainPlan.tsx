import { ExplainPlanNode } from "@/lib/tauri";

function ratioColor(ratio: number | null | undefined): string {
  if (ratio == null) return "text-[var(--text-secondary)]";
  if (ratio <= 1) return "text-[var(--green)]";
  if (ratio <= 2) return "text-[var(--yellow)]";
  if (ratio <= 10) return "text-[var(--peach)]";
  return "text-[var(--red)]";
}

function PlanNode({ node, depth = 0 }: { node: ExplainPlanNode; depth?: number }) {
  const label = [node.nodeType, node.relationName, node.alias ? `as ${node.alias}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="font-mono-db text-xs">
      <div
        className="rounded-[3px] border border-[var(--border)] bg-[var(--bg-panel)] px-2 py-1.5"
        style={{ marginLeft: depth * 16 }}
      >
        <div className="font-ui text-[11px] font-medium text-[var(--text-primary)]">{label}</div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-[var(--text-muted)]">
          {node.estimatedRows != null && <span>est rows: {node.estimatedRows.toFixed(0)}</span>}
          {node.actualRows != null && (
            <span className={ratioColor(node.rowsRatio)}>actual rows: {node.actualRows.toFixed(0)}</span>
          )}
          {node.estimatedCost != null && <span>cost: {node.estimatedCost.toFixed(2)}</span>}
          {node.actualTimeMs != null && <span>time: {node.actualTimeMs.toFixed(2)}ms</span>}
          {node.rowsRatio != null && (
            <span className={ratioColor(node.rowsRatio)}>
              ratio: {node.rowsRatio.toFixed(2)}x
            </span>
          )}
        </div>
      </div>
      {node.children.length > 0 && (
        <div className="mt-1 space-y-1">
          {node.children.map((child, i) => (
            <PlanNode key={`${depth}-${i}-${child.nodeType}`} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

interface ExplainPlanProps {
  root: ExplainPlanNode;
  driver: string;
  executionTimeMs: number;
}

export function ExplainPlan({ root, driver, executionTimeMs }: ExplainPlanProps) {
  return (
    <div className="space-y-2 p-3">
      <div className="font-mono-db text-[10px] text-[var(--text-muted)]">
        {driver.toUpperCase()} · {executionTimeMs}ms
      </div>
      <PlanNode node={root} />
    </div>
  );
}
