import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Plug,
  PlugZap,
  Loader2,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ConnectionForm } from "@/components/connections/ConnectionForm";
import { useConnectionStore } from "@/stores/connectionStore";
import { useSchemaStore } from "@/stores/schemaStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { ConnectionSummary } from "@/lib/tauri";
import { cn } from "@/lib/utils";

export function ConnectionList() {
  const connections = useConnectionStore((s) => s.connections);
  const activeConnectionId = useConnectionStore((s) => s.activeConnectionId);
  const loadConnections = useConnectionStore((s) => s.loadConnections);
  const connect = useConnectionStore((s) => s.connect);
  const disconnect = useConnectionStore((s) => s.disconnect);
  const deleteConnection = useConnectionStore((s) => s.deleteConnection);
  const loadDatabases = useSchemaStore((s) => s.loadDatabases);
  const resetSchema = useSchemaStore((s) => s.reset);
  const addToast = useSettingsStore((s) => s.addToast);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ConnectionSummary | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    void loadConnections();
  }, [loadConnections]);

  const handleConnect = async (connection: ConnectionSummary) => {
    setBusyId(connection.id);
    try {
      if (activeConnectionId === connection.id) {
        await disconnect(connection.id);
        resetSchema();
        addToast("info", `Desconectado de ${connection.name}`);
      } else {
        await connect(connection.id);
        resetSchema();
        await loadDatabases(connection.id);
        addToast("success", `Conectado a ${connection.name}`);
      }
    } catch (error) {
      addToast("error", error instanceof Error ? error.message : String(error));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (connection: ConnectionSummary) => {
    if (!confirm(`¿Eliminar la conexión "${connection.name}"?`)) return;
    try {
      await deleteConnection(connection.id);
      resetSchema();
      addToast("success", "Conexión eliminada");
    } catch (error) {
      addToast("error", error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
          Conexiones
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <Separator />

      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {connections.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-[var(--color-muted-foreground)]">
              No hay conexiones guardadas
            </p>
          )}

          {connections.map((connection) => {
            const isActive = activeConnectionId === connection.id;
            const isBusy = busyId === connection.id;

            return (
              <div
                key={connection.id}
                className={cn(
                  "group rounded-md border border-transparent p-2 transition-colors hover:border-[var(--color-border)] hover:bg-[var(--color-accent)]/40",
                  isActive && "border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10",
                )}
              >
                <div className="flex items-start gap-2">
                  <Database className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{connection.name}</span>
                      {isActive && <Badge variant="success">Activa</Badge>}
                    </div>
                    <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                      {connection.username}@{connection.host}:{connection.port}/{connection.database}
                    </p>
                  </div>
                </div>

                <div className="mt-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant={isActive ? "secondary" : "default"}
                    size="sm"
                    className="h-7 flex-1"
                    disabled={isBusy}
                    onClick={() => void handleConnect(connection)}
                  >
                    {isBusy ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : isActive ? (
                      <>
                        <Plug className="h-3 w-3" />
                        Desconectar
                      </>
                    ) : (
                      <>
                        <PlugZap className="h-3 w-3" />
                        Conectar
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      setEditing(connection);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-[var(--color-destructive)]"
                    onClick={() => void handleDelete(connection)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <ConnectionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        connection={editing}
        onSaved={() => {
          setFormOpen(false);
          setEditing(null);
        }}
      />
    </div>
  );
}
