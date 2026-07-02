import { SchemaTree } from "@/components/schema/SchemaTree";

export function Sidebar() {
  return (
    <aside className="flex h-full w-[240px] flex-col bg-[var(--bg-panel)]">
      <div className="shrink-0 px-2.5 pb-2 pt-2.5">
        <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.9px] text-[var(--text-dim)]">
          Database Navigator
        </h2>
      </div>
      <div className="min-h-0 flex-1">
        <SchemaTree />
      </div>
    </aside>
  );
}
