import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryStore } from "@/stores/queryStore";
import { cn } from "@/lib/utils";

export function QueryTabs() {
  const tabs = useQueryStore((s) => s.tabs);
  const activeTabId = useQueryStore((s) => s.activeTabId);
  const addTab = useQueryStore((s) => s.addTab);
  const closeTab = useQueryStore((s) => s.closeTab);
  const setActiveTab = useQueryStore((s) => s.setActiveTab);

  const [titleOverrides, setTitleOverrides] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const currentActive = activeTabId ?? tabs[0]?.id ?? null;

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const getTitle = (tabId: string, defaultTitle: string) =>
    titleOverrides[tabId] ?? defaultTitle;

  const startRename = (tabId: string, currentTitle: string) => {
    setEditingId(tabId);
    setEditValue(currentTitle);
  };

  const commitRename = () => {
    if (editingId && editValue.trim()) {
      setTitleOverrides((prev) => ({ ...prev, [editingId]: editValue.trim() }));
    }
    setEditingId(null);
  };

  const handleClose = (tabId: string, sql: string) => {
    const hasContent = sql.trim() !== "" && sql.trim() !== "SELECT 1;";
    if (hasContent && !confirm("¿Cerrar esta pestaña? Hay contenido sin guardar.")) {
      return;
    }
    closeTab(tabId);
    setTitleOverrides((prev) => {
      const next = { ...prev };
      delete next[tabId];
      return next;
    });
  };

  return (
    <div className="flex h-9 shrink-0 items-end gap-0.5 overflow-x-auto border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-1">
      {tabs.map((tab) => {
        const title = getTitle(tab.id, tab.title);
        const isActive = currentActive === tab.id;

        return (
          <div
            key={tab.id}
            className={cn(
              "group relative flex max-w-[200px] items-center gap-1 rounded-t px-2.5 py-1.5 text-xs transition-colors",
              isActive
                ? "border border-b-0 border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[var(--color-primary)]"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-secondary)]",
            )}
          >
            {editingId === tab.id ? (
              <input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") setEditingId(null);
                }}
                className="w-24 bg-transparent font-mono-db text-xs outline-none"
              />
            ) : (
              <button
                type="button"
                className="truncate font-mono-db"
                onClick={() => setActiveTab(tab.id)}
                onDoubleClick={() => startRename(tab.id, title)}
              >
                {title}
                {tab.executing && " •"}
              </button>
            )}

            {(tabs.length > 1 || tab.sql.trim() !== "SELECT 1;") && (
              <button
                type="button"
                className="rounded p-0.5 opacity-0 transition-opacity hover:bg-[var(--color-bg-hover)] group-hover:opacity-100"
                onClick={() => handleClose(tab.id, tab.sql)}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        );
      })}

      <Button
        variant="ghost"
        size="icon"
        className="mb-0.5 h-7 w-7 shrink-0 text-[var(--color-text-muted)]"
        onClick={() => addTab()}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
