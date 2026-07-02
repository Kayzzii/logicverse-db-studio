import { useEffect } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { TopBar } from "@/components/layout/TopBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { MainPanel } from "@/components/layout/MainPanel";
import { StatusBar } from "@/components/layout/StatusBar";
import { EditorCursorProvider } from "@/components/layout/EditorCursorContext";
import { ToastContainer } from "@/components/shared/Toast";
import { useConnectionStore } from "@/stores/connectionStore";
import { useQueryStore } from "@/stores/queryStore";
import { useSettingsStore } from "@/stores/settingsStore";

function App() {
  const loadConnections = useConnectionStore((s) => s.loadConnections);
  const refreshActiveConnection = useConnectionStore((s) => s.refreshActiveConnection);
  const addTab = useQueryStore((s) => s.addTab);
  const tabs = useQueryStore((s) => s.tabs);
  const activeTabId = useQueryStore((s) => s.activeTabId);
  const closeTab = useQueryStore((s) => s.closeTab);
  const sidebarCollapsed = useSettingsStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useSettingsStore((s) => s.toggleSidebar);
  const loadSettings = useSettingsStore((s) => s.loadSettings);

  useEffect(() => {
    void loadConnections();
    void refreshActiveConnection();
    void loadSettings();
  }, [loadConnections, refreshActiveConnection, loadSettings]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        addTab();
      }
      if (event.ctrlKey && event.key.toLowerCase() === "b") {
        event.preventDefault();
        toggleSidebar();
      }
      if (event.ctrlKey && event.key.toLowerCase() === "w") {
        event.preventDefault();
        const current = activeTabId ?? tabs[0]?.id;
        if (current) closeTab(current);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [addTab, closeTab, activeTabId, tabs, toggleSidebar]);

  return (
    <EditorCursorProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg-app)]">
        <TopBar />
        <div className="min-h-0 flex-1">
          <Group
            key={sidebarCollapsed ? "collapsed" : "expanded"}
            orientation="horizontal"
            id="lv-main-layout"
          >
            {!sidebarCollapsed && (
              <>
                <Panel
                  id="sidebar"
                  defaultSize="240px"
                  minSize="180px"
                  maxSize="400px"
                  className="min-w-[180px]"
                >
                  <Sidebar />
                </Panel>
                <Separator className="panel-resize-handle" />
              </>
            )}
            <Panel id="main" minSize="40%">
              <MainPanel />
            </Panel>
          </Group>
        </div>
        <StatusBar />
        <ToastContainer />
      </div>
    </EditorCursorProvider>
  );
}

export default App;
