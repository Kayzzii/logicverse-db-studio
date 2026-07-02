import { useState } from "react";
import { PanelLeft, PanelLeftClose, Plug, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConnectionIndicator } from "@/components/shared/ConnectionIndicator";
import { ConnectionList } from "@/components/connections/ConnectionList";
import { useConnectionStore } from "@/stores/connectionStore";
import { useSettingsStore } from "@/stores/settingsStore";

export function TopBar() {
  const activeConnectionId = useConnectionStore((s) => s.activeConnectionId);
  const connections = useConnectionStore((s) => s.connections);
  const sidebarCollapsed = useSettingsStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useSettingsStore((s) => s.toggleSidebar);
  const [connectionsOpen, setConnectionsOpen] = useState(false);

  const activeConnection = connections.find((c) => c.id === activeConnectionId);

  return (
    <header className="flex h-10 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-[var(--color-text-muted)]"
          onClick={toggleSidebar}
        >
          {sidebarCollapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
        <span className="text-sm font-semibold text-[var(--color-text-primary)]">
          LogicVerse DB Studio
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Dialog open={connectionsOpen} onOpenChange={setConnectionsOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-2 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
            >
              <Plug className="h-3.5 w-3.5" />
              {activeConnection ? (
                <>
                  <ConnectionIndicator connected />
                  <span>
                    Conectado:{" "}
                    <span className="font-medium text-[var(--color-text-primary)]">
                      {activeConnection.name}
                    </span>
                  </span>
                </>
              ) : (
                <>
                  <ConnectionIndicator connected={false} />
                  <span>Sin conexión</span>
                </>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] max-w-md overflow-hidden p-0">
            <DialogHeader className="border-b border-[var(--color-border)] px-4 py-3">
              <DialogTitle>Conexiones</DialogTitle>
            </DialogHeader>
            <div className="h-[420px]">
              <ConnectionList />
            </div>
          </DialogContent>
        </Dialog>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]"
          disabled
          title="Configuración (próximamente)"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
