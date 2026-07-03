import { useCallback, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AboutDialog } from "@/components/layout/AboutDialog";
import { KeyboardShortcutsDialog } from "@/components/layout/KeyboardShortcutsDialog";
import { useAppActionsStore } from "@/stores/appActionsStore";
import { useQueryStore } from "@/stores/queryStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUiStore } from "@/stores/uiStore";

interface MenuBarProps {
  onToggleSidebar: () => void;
}

export function MenuBar({ onToggleSidebar }: MenuBarProps) {
  const invoke = useAppActionsStore((s) => s.invoke);
  const addTab = useQueryStore((s) => s.addTab);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const addToast = useSettingsStore((s) => s.addToast);

  const aboutOpen = useUiStore((s) => s.aboutOpen);
  const shortcutsOpen = useUiStore((s) => s.shortcutsOpen);
  const setAboutOpen = useUiStore((s) => s.setAboutOpen);
  const setShortcutsOpen = useUiStore((s) => s.setShortcutsOpen);
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);
  const openNewConnection = useUiStore((s) => s.openNewConnection);
  const setConnectionsDialogOpen = useUiStore((s) => s.setConnectionsDialogOpen);
  const setSavedQueriesOpen = useUiStore((s) => s.setSavedQueriesOpen);
  const setQueryHistoryOpen = useUiStore((s) => s.setQueryHistoryOpen);
  const zoomIn = useUiStore((s) => s.zoomIn);
  const zoomOut = useUiStore((s) => s.zoomOut);
  const resetZoom = useUiStore((s) => s.resetZoom);

  const handleExit = useCallback(async () => {
    try {
      await getCurrentWindow().close();
    } catch {
      addToast("info", "Exit solo disponible en la app de escritorio");
    }
  }, [addToast]);

  const generateUuid = () => {
    invoke("insertInEditor", crypto.randomUUID());
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === ",") {
        event.preventDefault();
        setSettingsOpen(true);
      }
      if (event.ctrlKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setShortcutsOpen(true);
      }
      if (event.ctrlKey && event.key.toLowerCase() === "q") {
        event.preventDefault();
        void handleExit();
      }
      if (event.ctrlKey && event.key === "=") {
        event.preventDefault();
        zoomIn();
      }
      if (event.ctrlKey && event.key === "-") {
        event.preventDefault();
        zoomOut();
      }
      if (event.ctrlKey && event.key === "0") {
        event.preventDefault();
        resetZoom();
      }
      if (event.key === "F5") {
        event.preventDefault();
        invoke("refreshSchema");
      }
      if (event.ctrlKey && event.key === "1") {
        event.preventDefault();
        invoke("goToSchemaBrowser");
      }
      if (event.ctrlKey && event.key === "2") {
        event.preventDefault();
        invoke("goToEditor");
      }
      if (event.ctrlKey && event.key === "3") {
        event.preventDefault();
        invoke("goToResults");
      }
      if (event.ctrlKey && event.key.toLowerCase() === "f" && !event.shiftKey) {
        event.preventDefault();
        invoke("focusSchemaSearch");
      }
      if (event.ctrlKey && event.key === "Tab" && event.shiftKey) {
        event.preventDefault();
        invoke("prevTab");
      } else if (event.ctrlKey && event.key === "Tab") {
        event.preventDefault();
        invoke("nextTab");
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    handleExit,
    invoke,
    resetZoom,
    setSettingsOpen,
    setShortcutsOpen,
    zoomIn,
    zoomOut,
  ]);

  const menuTriggerClass =
    "flex h-full items-center px-2.5 text-xs text-[var(--text-muted)] outline-none hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] data-[state=open]:bg-[var(--bg-hover)] data-[state=open]:text-[var(--text-primary)]";

  return (
    <>
      <nav
        className="flex h-7 shrink-0 items-stretch border-b border-[var(--border)] bg-[var(--bg-panel)] px-1"
        aria-label="Application menu"
      >
        <DropdownMenu modal>
          <DropdownMenuTrigger className={menuTriggerClass}>File</DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="rounded-md">
            <DropdownMenuItem onClick={() => addTab()}>
              New Query Tab
              <DropdownMenuShortcut>Ctrl+N</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              Open SQL File...
              <DropdownMenuShortcut>Ctrl+O</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => invoke("saveQuery")}>
              Save Query
              <DropdownMenuShortcut>Ctrl+S</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              Save As...
              <DropdownMenuShortcut>Ctrl+Shift+S</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>Import Data...</DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Export Results</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => invoke("exportResults", "csv")}>
                  CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => invoke("exportResults", "json")}>
                  JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => invoke("exportResults", "sql")}>
                  SQL
                </DropdownMenuItem>
                <DropdownMenuItem disabled>Parquet</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => invoke("renameTab")}>Rename Tab</DropdownMenuItem>
            <DropdownMenuItem onClick={() => invoke("refreshSchema")}>
              Refresh
              <DropdownMenuShortcut>F5</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
              Settings
              <DropdownMenuShortcut>Ctrl+,</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void handleExit()}>
              Exit
              <DropdownMenuShortcut>Ctrl+Q</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu modal>
          <DropdownMenuTrigger className={menuTriggerClass}>Edit</DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => invoke("undoEditor")}>
              Undo
              <DropdownMenuShortcut>Ctrl+Z</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => invoke("redoEditor")}>
              Redo
              <DropdownMenuShortcut>Ctrl+Shift+Z</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => invoke("cutEditor")}>
              Cut
              <DropdownMenuShortcut>Ctrl+X</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => invoke("copyEditor")}>
              Copy
              <DropdownMenuShortcut>Ctrl+C</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => invoke("pasteEditor")}>
              Paste
              <DropdownMenuShortcut>Ctrl+V</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => invoke("deleteEditor")}>
              Delete
              <DropdownMenuShortcut>Del</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => invoke("selectAllEditor")}>
              Select All
              <DropdownMenuShortcut>Ctrl+A</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              Find and Replace
              <DropdownMenuShortcut>Ctrl+H</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={generateUuid}>Generate UUID</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu modal>
          <DropdownMenuTrigger className={menuTriggerClass}>Navigate</DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => invoke("goToSchemaBrowser")}>
              Go to Schema Browser
              <DropdownMenuShortcut>Ctrl+1</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => invoke("goToEditor")}>
              Go to Editor
              <DropdownMenuShortcut>Ctrl+2</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => invoke("goToResults")}>
              Go to Results
              <DropdownMenuShortcut>Ctrl+3</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => invoke("nextTab")}>
              Next Tab
              <DropdownMenuShortcut>Ctrl+Tab</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => invoke("prevTab")}>
              Previous Tab
              <DropdownMenuShortcut>Ctrl+Shift+Tab</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              Open Database Object...
              <DropdownMenuShortcut>Ctrl+Shift+O</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              Backward History
              <DropdownMenuShortcut>Alt+Left</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              Forward History
              <DropdownMenuShortcut>Alt+Right</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu modal>
          <DropdownMenuTrigger className={menuTriggerClass}>Search</DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => invoke("focusSchemaSearch")}>
              Quick Search...
              <DropdownMenuShortcut>Ctrl+F</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              Find in Editor
              <DropdownMenuShortcut>Ctrl+Shift+F</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => invoke("searchTables")}>
              Search Tables...
            </DropdownMenuItem>
            <DropdownMenuItem disabled>Search Columns...</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu modal>
          <DropdownMenuTrigger className={menuTriggerClass}>SQL Editor</DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => invoke("executeQuery")}>
              Execute Query
              <DropdownMenuShortcut>Ctrl+Enter</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => invoke("executeSelection")}>
              Execute Selection
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => invoke("explainQuery")}>Explain Query</DropdownMenuItem>
            <DropdownMenuItem disabled>Format SQL</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => addTab()}>
              New SQL Script
              <DropdownMenuShortcut>Ctrl+N</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>Open SQL Console</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setQueryHistoryOpen(true)}>
              Query History
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSavedQueriesOpen(true)}>
              Saved Queries
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu modal>
          <DropdownMenuTrigger className={menuTriggerClass}>Database</DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={openNewConnection}>New Connection</DropdownMenuItem>
            <DropdownMenuItem onClick={() => invoke("connectSelected")}>Connect</DropdownMenuItem>
            <DropdownMenuItem onClick={() => invoke("disconnectSelected")}>
              Disconnect
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => invoke("disconnectAll")}>
              Disconnect All
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              Reconnect
              <DropdownMenuShortcut>Ctrl+Shift+R</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>Read-only Mode</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => invoke("refreshSchema")}>
              Refresh Schema
              <DropdownMenuShortcut>F5</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => invoke("viewErDiagram")}>View ER Diagram</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>Driver Manager</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu modal>
          <DropdownMenuTrigger className={menuTriggerClass}>Window</DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={onToggleSidebar}>
              Toggle Sidebar
              <DropdownMenuShortcut>Ctrl+B</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => void setTheme(theme === "dark" ? "light" : "dark")}
            >
              Toggle Dark/Light Theme
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Editor Layout</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem disabled>Horizontal Split</DropdownMenuItem>
                <DropdownMenuItem disabled>Vertical Split</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={zoomIn}>
              Zoom In
              <DropdownMenuShortcut>Ctrl+=</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={zoomOut}>
              Zoom Out
              <DropdownMenuShortcut>Ctrl+-</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={resetZoom}>
              Reset Zoom
              <DropdownMenuShortcut>Ctrl+0</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setConnectionsDialogOpen(true)}>
              Show Connections Panel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setQueryHistoryOpen(true)}>
              Show Query History Panel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu modal>
          <DropdownMenuTrigger className={menuTriggerClass}>Help</DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setAboutOpen(true)}>
              About LogicVerse DB Studio
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                void openUrl("https://github.com/Kayzzii/logicverse-db-studio")
              }
            >
              GitHub Repository
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                void openUrl("https://github.com/Kayzzii/logicverse-db-studio/issues")
              }
            >
              Report Bug
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShortcutsOpen(true)}>
              Keyboard Shortcuts
              <DropdownMenuShortcut>Ctrl+K</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>Tip of the Day</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>

      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </>
  );
}
