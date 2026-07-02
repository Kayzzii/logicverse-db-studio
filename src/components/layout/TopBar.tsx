import { useEffect, useRef, useState } from "react";
import { LayoutGrid, Moon, Settings, Sun } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConnectionList } from "@/components/connections/ConnectionList";
import { useConnectionStore } from "@/stores/connectionStore";
import { Theme, useSettingsStore } from "@/stores/settingsStore";
import { cn } from "@/lib/utils";

export function TopBar() {
  const activeConnectionId = useConnectionStore((s) => s.activeConnectionId);
  const connections = useConnectionStore((s) => s.connections);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const [connectionsOpen, setConnectionsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  const activeConnection = connections.find((c) => c.id === activeConnectionId);
  const dbLabel = activeConnection?.database ?? activeConnection?.name ?? "Sin conexión";

  useEffect(() => {
    if (!settingsOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [settingsOpen]);

  const handleThemeChange = (next: Theme) => {
    void setTheme(next);
    setSettingsOpen(false);
  };

  return (
    <header className="flex h-9 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-panel)] px-3">
      <div className="flex items-center gap-2">
        <LayoutGrid className="h-4 w-4 text-[var(--accent)]" strokeWidth={1.75} />
        <span className="text-[13px] font-semibold text-[var(--text-primary)]">LogicVerse</span>
        <span className="text-[13px] font-normal text-[var(--text-muted)]">DB Studio</span>
      </div>

      <div className="flex items-center gap-2.5">
        <Dialog open={connectionsOpen} onOpenChange={setConnectionsOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded px-1.5 py-0.5 transition-colors hover:bg-[var(--bg-hover)]"
            >
              {activeConnection ? (
                <>
                  <span
                    className="inline-block h-[7px] w-[7px] rounded-full bg-[var(--green)]"
                    style={{ boxShadow: "var(--connection-glow)" }}
                    aria-hidden
                  />
                  <span className="font-mono-db text-xs font-medium text-[var(--text-primary)]">
                    {dbLabel}
                  </span>
                </>
              ) : (
                <>
                  <span
                    className="inline-block h-[7px] w-[7px] rounded-full bg-[var(--text-ghost)]"
                    aria-hidden
                  />
                  <span className="font-mono-db text-xs text-[var(--text-muted)]">
                    Sin conexión
                  </span>
                </>
              )}
            </button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] max-w-md overflow-hidden border-[var(--border)] bg-[var(--bg-panel)] p-0">
            <DialogHeader className="border-b border-[var(--border)] px-4 py-3">
              <DialogTitle className="text-[var(--text-primary)]">Conexiones</DialogTitle>
            </DialogHeader>
            <div className="h-[420px]">
              <ConnectionList />
            </div>
          </DialogContent>
        </Dialog>

        <div className="relative" ref={settingsRef}>
          <button
            type="button"
            className={cn(
              "rounded p-1 text-[var(--text-muted)] transition-opacity hover:opacity-80",
              settingsOpen ? "opacity-80" : "opacity-[0.45]",
            )}
            onClick={() => setSettingsOpen((open) => !open)}
            title="Configuración"
          >
            <Settings className="h-[15px] w-[15px]" strokeWidth={1.5} />
          </button>

          {settingsOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-[3px] border border-[var(--border)] bg-[var(--bg-panel)] py-1 shadow-lg">
              <p className="px-3 py-1.5 font-ui text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dim)]">
                Tema
              </p>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 font-ui text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]",
                  theme === "dark" && "text-[var(--text-primary)]",
                )}
                onClick={() => handleThemeChange("dark")}
              >
                <Moon className="h-3.5 w-3.5" />
                Dark
              </button>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 font-ui text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]",
                  theme === "light" && "text-[var(--text-primary)]",
                )}
                onClick={() => handleThemeChange("light")}
              >
                <Sun className="h-3.5 w-3.5" />
                Light
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
