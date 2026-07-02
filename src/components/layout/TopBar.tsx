import { PanelLeftClose, PanelLeftOpen, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/stores/settingsStore";
import { useConnectionStore } from "@/stores/connectionStore";

export function TopBar() {
  const sidebarCollapsed = useSettingsStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useSettingsStore((s) => s.toggleSidebar);
  const activeConnectionId = useConnectionStore((s) => s.activeConnectionId);
  const connections = useConnectionStore((s) => s.connections);

  const activeConnection = connections.find((c) => c.id === activeConnectionId);

  return (
    <header className="flex h-12 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-card)] px-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          {sidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-[var(--color-primary)]" />
          <div>
            <h1 className="text-sm font-semibold leading-none">LogicVerse DB Studio</h1>
            <p className="text-[10px] text-[var(--color-muted-foreground)]">
              by Kayzzii / LogicVerse
            </p>
          </div>
        </div>
      </div>

      <div className="text-xs text-[var(--color-muted-foreground)]">
        {activeConnection ? (
          <span>
            Conectado: <strong className="text-[var(--color-foreground)]">{activeConnection.name}</strong>
          </span>
        ) : (
          "Sin conexión activa"
        )}
      </div>
    </header>
  );
}
