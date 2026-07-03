import { SchemaTree } from "@/components/schema/SchemaTree";
import { RefreshCw } from "lucide-react";
import { useConnectionStore } from "@/stores/connectionStore";
import { useSchemaStore } from "@/stores/schemaStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const activeConnectionId = useConnectionStore((s) => s.activeConnectionId);
  const connections = useConnectionStore((s) => s.connections);
  const reloadSchema = useSchemaStore((s) => s.reloadSchema);
  const loading = useSchemaStore((s) => s.loading);
  const addToast = useSettingsStore((s) => s.addToast);

  const activeConnection = connections.find((c) => c.id === activeConnectionId);
  const isReloading = activeConnectionId
    ? Boolean(loading[`databases::${activeConnectionId}`])
    : false;

  const handleReloadSchema = async () => {
    if (!activeConnectionId) return;
    try {
      await reloadSchema(activeConnectionId, activeConnection?.database ?? null);
      addToast("success", "Schema recargado");
    } catch (error) {
      addToast("error", error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <aside
      id="schema-browser"
      className="flex h-full w-full overflow-hidden flex-col bg-[var(--bg-panel)]"
    >
      <div className="flex shrink-0 items-center justify-between px-2.5 pb-2 pt-2.5">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.9px] text-[var(--text-dim)]">
          Database Navigator
        </h2>
        <button
          type="button"
          title="Recargar schema"
          disabled={!activeConnectionId || isReloading}
          onClick={() => void handleReloadSchema()}
          className={cn(
            "rounded p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]",
            (!activeConnectionId || isReloading) && "pointer-events-none opacity-40",
          )}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isReloading && "animate-spin")} />
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <SchemaTree />
      </div>
    </aside>
  );
}
