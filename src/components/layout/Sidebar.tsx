import { SchemaTree } from "@/components/schema/SchemaTree";

export function Sidebar() {
  return (
    <aside className="flex h-full flex-col bg-[var(--color-bg-secondary)]">
      <div className="border-b border-[var(--color-border)] px-3 py-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Database Navigator
        </h2>
      </div>
      <div className="min-h-0 flex-1">
        <SchemaTree />
      </div>
    </aside>
  );
}
