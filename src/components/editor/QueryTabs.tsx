import { useEffect, useRef, useState } from "react";
import { FileText, GitBranch, Plus, Table2, X } from "lucide-react";
import { useQueryStore } from "@/stores/queryStore";
import { cn } from "@/lib/utils";

export function QueryTabs() {
  const tabs = useQueryStore((s) => s.tabs);
  const activeTabId = useQueryStore((s) => s.activeTabId);
  const addTab = useQueryStore((s) => s.addTab);
  const closeTab = useQueryStore((s) => s.closeTab);
  const setActiveTab = useQueryStore((s) => s.setActiveTab);
  const renameTab = useQueryStore((s) => s.renameTab);

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

  const startRename = (tabId: string, currentTitle: string) => {
    setEditingId(tabId);
    setEditValue(currentTitle);
  };

  const commitRename = () => {
    if (editingId && editValue.trim()) {
      renameTab(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  const handleClose = (tabId: string, sql: string) => {
    const hasContent = sql.trim() !== "" && sql.trim() !== "SELECT 1;";
    if (hasContent && !confirm("¿Cerrar esta pestaña? Hay contenido sin guardar.")) {
      return;
    }
    closeTab(tabId);
  };

  const isTableTab = (tab: { title: string; tableView: unknown; view: string }) =>
    tab.view === "er" ||
    !!tab.tableView ||
    (!tab.title.toLowerCase().startsWith("query") && tab.title !== "Query");

  return (
    <div className="flex h-[34px] shrink-0 items-end overflow-x-auto border-b border-[var(--border)] bg-[var(--bg-panel)]">
      {tabs.map((tab) => {
        const isActive = currentActive === tab.id;
        const showTableIcon = isTableTab(tab);
        const isErTab = tab.view === "er";

        return (
          <div
            key={tab.id}
            className={cn(
              "group flex h-8 max-w-[200px] items-center gap-1.5 border-t-2 px-[13px] text-xs transition-colors",
              isActive
                ? "border-t-[var(--accent)] bg-[var(--bg-app)] text-[var(--text-primary)]"
                : "border-t-transparent bg-[var(--bg-panel)] text-[var(--text-dim)] hover:text-[var(--text-secondary)]",
            )}
          >
            {isErTab ? (
              <GitBranch
                className={cn(
                  "h-3 w-3 shrink-0",
                  isActive ? "text-[var(--accent)]" : "text-[var(--text-ghost)]",
                )}
                strokeWidth={1.75}
              />
            ) : showTableIcon ? (
              <Table2
                className={cn(
                  "h-3 w-3 shrink-0",
                  isActive ? "text-[var(--accent)]" : "text-[var(--text-ghost)]",
                )}
                strokeWidth={1.75}
              />
            ) : (
              <FileText
                className={cn(
                  "h-3 w-3 shrink-0",
                  isActive ? "text-[var(--accent)]" : "text-[var(--text-ghost)]",
                )}
                strokeWidth={1.75}
              />
            )}

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
                className="truncate font-ui text-xs"
                onClick={() => setActiveTab(tab.id)}
                onDoubleClick={() => startRename(tab.id, tab.title)}
              >
                {tab.title}
                {tab.executing && " •"}
              </button>
            )}

            {(tabs.length > 1 || tab.sql.trim() !== "SELECT 1;") && (
              <button
                type="button"
                className="shrink-0 opacity-[0.35] transition-opacity hover:opacity-70"
                onClick={() => handleClose(tab.id, tab.sql)}
              >
                <X className="h-[11px] w-[11px]" strokeWidth={2} />
              </button>
            )}
          </div>
        );
      })}

      <button
        type="button"
        className="flex h-8 w-8 shrink-0 items-center justify-center text-[var(--text-ghost)] transition-colors hover:text-[var(--accent)]"
        onClick={() => addTab()}
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}
