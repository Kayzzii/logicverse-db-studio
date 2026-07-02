import { useCallback, useEffect, useRef, useState } from "react";
import { Group, Panel, Separator, useGroupRef } from "react-resizable-panels";
import { Loader2 } from "lucide-react";
import { QueryTabs } from "@/components/editor/QueryTabs";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { QueryEditor, QueryEditorHandle } from "@/components/editor/QueryEditor";
import { ResultsPanel } from "@/components/results/ResultsPanel";
import { useConnectionStore } from "@/stores/connectionStore";
import { useQueryStore } from "@/stores/queryStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { tauriApi } from "@/lib/tauri";

export function MainPanel() {
  const activeConnectionId = useConnectionStore((s) => s.activeConnectionId);
  const tabs = useQueryStore((s) => s.tabs);
  const activeTabId = useQueryStore((s) => s.activeTabId);
  const updateTabSql = useQueryStore((s) => s.updateTabSql);
  const executeTab = useQueryStore((s) => s.executeTab);
  const cancelTab = useQueryStore((s) => s.cancelTab);
  const addToast = useSettingsStore((s) => s.addToast);

  const groupRef = useGroupRef();
  const editorRef = useRef<QueryEditorHandle>(null);
  const [editorMaximized, setEditorMaximized] = useState(false);

  const currentTab = tabs.find((t) => t.id === (activeTabId ?? tabs[0]?.id)) ?? tabs[0];

  const runQuery = async (selection?: string) => {
    if (!activeConnectionId) {
      addToast("error", "Conectá una base de datos primero");
      return;
    }
    if (!currentTab) return;

    const sql = selection || currentTab.sql;
    if (!sql.trim()) {
      addToast("error", "La query está vacía");
      return;
    }

    await executeTab(currentTab.id, sql, activeConnectionId);
  };

  const saveCurrentQuery = useCallback(async () => {
    if (!currentTab) return;
    const sql = currentTab.sql.trim();
    if (!sql) {
      addToast("error", "No hay SQL para guardar");
      return;
    }

    const name = prompt("Nombre de la query guardada:", currentTab.title);
    if (!name?.trim()) return;

    try {
      await tauriApi.saveQuery({
        name: name.trim(),
        sql,
        connectionId: activeConnectionId ?? undefined,
      });
      addToast("success", `Query "${name.trim()}" guardada`);
    } catch (error) {
      addToast("error", error instanceof Error ? error.message : String(error));
    }
  }, [activeConnectionId, addToast, currentTab]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveCurrentQuery();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [saveCurrentQuery]);

  const togglePanelLayout = () => {
    const group = groupRef.current;
    if (!group) return;
    if (editorMaximized) {
      group.setLayout({ editor: 50, results: 50 });
    } else {
      group.setLayout({ editor: 82, results: 18 });
    }
    setEditorMaximized(!editorMaximized);
  };

  if (!currentTab) {
    return (
      <div className="flex h-full items-center justify-center font-mono-db text-sm text-[var(--text-muted)]">
        Creá una nueva pestaña de query
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[var(--bg-app)]">
      <QueryTabs />
      <EditorToolbar
        executing={currentTab.executing}
        onExecute={() => void runQuery()}
        onExecuteSelection={() => editorRef.current?.executeSelection()}
        onCancel={() => void cancelTab(currentTab.id)}
        onSave={() => void saveCurrentQuery()}
      />

      <div className="min-h-0 flex-1">
        <Group
          groupRef={groupRef}
          orientation="vertical"
          id="lv-editor-results"
          defaultLayout={{ editor: 50, results: 50 }}
        >
          <Panel id="editor" defaultSize="50%" minSize="20%">
            <QueryEditor
              key={currentTab.id}
              ref={editorRef}
              value={currentTab.sql}
              onChange={(sql) => updateTabSql(currentTab.id, sql)}
              onExecute={(selection) => void runQuery(selection)}
            />
          </Panel>
          <Separator className="panel-resize-handle" onDoubleClick={togglePanelLayout} />
          <Panel id="results" defaultSize="50%" minSize="15%">
            {currentTab.executing ? (
              <div className="flex h-full items-center justify-center gap-2 font-mono-db text-sm text-[var(--text-muted)]">
                <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />
                Ejecutando query…
              </div>
            ) : (
              <ResultsPanel tab={currentTab} />
            )}
          </Panel>
        </Group>
      </div>
    </div>
  );
}
