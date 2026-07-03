import { useCallback, useEffect, useRef, useState } from "react";
import { Group, Panel, Separator, useGroupRef } from "react-resizable-panels";
import { Loader2 } from "lucide-react";
import { QueryTabs } from "@/components/editor/QueryTabs";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { QueryEditor, QueryEditorHandle } from "@/components/editor/QueryEditor";
import { ResultsPanel } from "@/components/results/ResultsPanel";
import { ERDiagram } from "@/components/schema/ERDiagram";
import { SavedQueriesDialog } from "@/components/editor/SavedQueriesDialog";
import { useConnectionStore } from "@/stores/connectionStore";
import { useQueryStore } from "@/stores/queryStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAppActionsStore } from "@/stores/appActionsStore";
import { useUiStore } from "@/stores/uiStore";
import { tauriApi } from "@/lib/tauri";
import { downloadTextFile } from "@/lib/formatters";

export function MainPanel() {
  const activeConnectionId = useConnectionStore((s) => s.activeConnectionId);
  const tabs = useQueryStore((s) => s.tabs);
  const activeTabId = useQueryStore((s) => s.activeTabId);
  const setActiveTab = useQueryStore((s) => s.setActiveTab);
  const renameTab = useQueryStore((s) => s.renameTab);
  const updateTabSql = useQueryStore((s) => s.updateTabSql);
  const executeTab = useQueryStore((s) => s.executeTab);
  const explainTab = useQueryStore((s) => s.explainTab);
  const cancelTab = useQueryStore((s) => s.cancelTab);
  const addToast = useSettingsStore((s) => s.addToast);
  const registerActions = useAppActionsStore((s) => s.registerActions);
  const savedQueriesOpen = useUiStore((s) => s.savedQueriesOpen);
  const setSavedQueriesOpen = useUiStore((s) => s.setSavedQueriesOpen);

  const groupRef = useGroupRef();
  const editorRef = useRef<QueryEditorHandle>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [editorMaximized, setEditorMaximized] = useState(false);

  const currentTab = tabs.find((t) => t.id === (activeTabId ?? tabs[0]?.id)) ?? tabs[0];

  const runQuery = async (selection?: string) => {
    if (!activeConnectionId) {
      addToast("error", "Conectá una base de datos primero");
      return;
    }
    if (!currentTab || currentTab.view === "er") return;

    const sql = selection || currentTab.sql;
    if (!sql.trim()) {
      addToast("error", "La query está vacía");
      return;
    }

    await executeTab(currentTab.id, sql, activeConnectionId);
  };

  const runExplain = async () => {
    if (!activeConnectionId) {
      addToast("error", "Conectá una base de datos primero");
      return;
    }
    if (!currentTab || currentTab.view === "er") return;

    const sql = currentTab.sql;
    if (!sql.trim()) {
      addToast("error", "La query está vacía");
      return;
    }

    await explainTab(currentTab.id, sql, activeConnectionId);
    addToast("success", "Plan de ejecución generado — ver Messages");
  };

  const saveCurrentQuery = useCallback(async () => {
    if (!currentTab || currentTab.view === "er") return;
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
      addToast("success", `"${name.trim()}" guardada`);
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

  const runEditorCommand = (command: "cut" | "copy" | "paste" | "delete") => {
    editorRef.current?.focus();
    document.execCommand(command);
  };

  const handleRenameTab = useCallback(() => {
    if (!currentTab) return;
    const next = prompt("Nuevo nombre de la pestaña:", currentTab.title);
    if (next?.trim()) renameTab(currentTab.id, next.trim());
  }, [currentTab, renameTab]);

  const handleExport = useCallback(
    async (format: "csv" | "json" | "sql") => {
      if (!currentTab?.result) {
        addToast("error", "No hay resultados para exportar");
        return;
      }
      try {
        const payload = await tauriApi.exportResults(
          currentTab.result,
          format,
          "public",
          "exported_table",
        );
        downloadTextFile(payload.content, payload.filename);
        addToast("success", `Exportado como ${payload.filename}`);
      } catch (error) {
        addToast("error", error instanceof Error ? error.message : String(error));
      }
    },
    [addToast, currentTab?.result],
  );

  const cycleTab = useCallback(
    (direction: 1 | -1) => {
      if (tabs.length <= 1) return;
      const currentIndex = tabs.findIndex((t) => t.id === (activeTabId ?? tabs[0]?.id));
      const nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
      setActiveTab(tabs[nextIndex].id);
    },
    [activeTabId, setActiveTab, tabs],
  );

  useEffect(() => {
    registerActions({
      executeQuery: () => void runQuery(),
      executeSelection: () => editorRef.current?.executeSelection(),
      explainQuery: () => void runExplain(),
      saveQuery: () => void saveCurrentQuery(),
      renameTab: handleRenameTab,
      exportResults: (format) => void handleExport(format),
      insertInEditor: (text) => editorRef.current?.insertText(text),
      focusEditor: () => editorRef.current?.focus(),
      selectAllEditor: () => editorRef.current?.selectAll(),
      undoEditor: () => editorRef.current?.undo(),
      redoEditor: () => editorRef.current?.redo(),
      cutEditor: () => runEditorCommand("cut"),
      copyEditor: () => runEditorCommand("copy"),
      pasteEditor: () => runEditorCommand("paste"),
      deleteEditor: () => runEditorCommand("delete"),
      goToEditor: () => editorRef.current?.focus(),
      goToResults: () => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
      nextTab: () => cycleTab(1),
      prevTab: () => cycleTab(-1),
      openSavedQueries: () => setSavedQueriesOpen(true),
      openQueryHistory: () => useUiStore.getState().setQueryHistoryOpen(true),
    });
  }, [
    cycleTab,
    handleExport,
    handleRenameTab,
    registerActions,
    runExplain,
    runQuery,
    saveCurrentQuery,
    setSavedQueriesOpen,
  ]);

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

  if (currentTab.view === "er" && currentTab.erData) {
    return (
      <div className="flex h-full flex-col bg-[var(--bg-app)]">
        <QueryTabs />
        <ERDiagram data={currentTab.erData} />
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
        onExplain={() => void runExplain()}
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
            <div ref={resultsRef} id="results-panel" className="h-full min-h-0">
              {currentTab.executing ? (
                <div className="flex h-full items-center justify-center gap-2 font-mono-db text-sm text-[var(--text-muted)]">
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />
                  Ejecutando…
                </div>
              ) : (
                <ResultsPanel tab={currentTab} />
              )}
            </div>
          </Panel>
        </Group>
      </div>
      <SavedQueriesDialog open={savedQueriesOpen} onOpenChange={setSavedQueriesOpen} />
    </div>
  );
}
