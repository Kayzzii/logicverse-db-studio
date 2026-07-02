import { useEffect, useState } from "react";
import { Bookmark, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SavedQuery, tauriApi } from "@/lib/tauri";
import { truncateText } from "@/lib/formatters";
import { useQueryStore } from "@/stores/queryStore";
import { useSettingsStore } from "@/stores/settingsStore";

interface SavedQueriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SavedQueriesDialog({ open, onOpenChange }: SavedQueriesDialogProps) {
  const [queries, setQueries] = useState<SavedQuery[]>([]);
  const [loading, setLoading] = useState(false);
  const loadSqlIntoActiveTab = useQueryStore((s) => s.loadSqlIntoActiveTab);
  const addToast = useSettingsStore((s) => s.addToast);

  const loadQueries = async () => {
    setLoading(true);
    try {
      const list = await tauriApi.listSavedQueries();
      setQueries(list);
    } catch (error) {
      addToast("error", error instanceof Error ? error.message : String(error));
      setQueries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void loadQueries();
  }, [open]);

  const handleLoad = (query: SavedQuery) => {
    loadSqlIntoActiveTab(query.sql, query.name);
    onOpenChange(false);
    addToast("success", `Query "${query.name}" cargada`);
  };

  const handleDelete = async (query: SavedQuery) => {
    if (!confirm(`¿Eliminar la query guardada "${query.name}"?`)) return;
    try {
      await tauriApi.deleteSavedQuery(query.id);
      setQueries((prev) => prev.filter((q) => q.id !== query.id));
      addToast("success", "Query eliminada");
    } catch (error) {
      addToast("error", error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-lg overflow-hidden border-[var(--border)] bg-[var(--bg-panel)] p-0">
        <DialogHeader className="border-b border-[var(--border)] px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-[var(--text-primary)]">
            <Bookmark className="h-4 w-4 text-[var(--accent)]" />
            Saved Queries
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[360px]">
          <div className="space-y-0.5 p-2">
            {loading && (
              <p className="px-2 py-4 text-center font-mono-db text-xs text-[var(--text-muted)]">
                Cargando...
              </p>
            )}
            {!loading && queries.length === 0 && (
              <p className="px-2 py-4 text-center font-mono-db text-xs text-[var(--text-muted)]">
                No hay queries guardadas
              </p>
            )}
            {queries.map((query) => (
              <div
                key={query.id}
                className="group flex items-start gap-2 rounded-[3px] border border-transparent p-2 hover:border-[var(--border)] hover:bg-[var(--bg-hover)]"
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => handleLoad(query)}
                  title={query.sql}
                >
                  <p className="font-ui text-xs font-medium text-[var(--text-primary)]">
                    {query.name}
                  </p>
                  <p className="mt-0.5 truncate font-mono-db text-[10px] text-[var(--text-muted)]">
                    {truncateText(query.sql, 100)}
                  </p>
                  <p className="mt-1 font-mono-db text-[10px] text-[var(--text-ghost)]">
                    {new Date(query.savedAt).toLocaleString("es-AR")}
                  </p>
                </button>
                <button
                  type="button"
                  className="shrink-0 rounded p-1 text-[var(--text-ghost)] opacity-0 transition-opacity hover:text-[var(--red)] group-hover:opacity-100"
                  onClick={() => void handleDelete(query)}
                  title="Eliminar"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
