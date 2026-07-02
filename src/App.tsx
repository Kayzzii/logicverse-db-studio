import { useEffect } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { TopBar } from "@/components/layout/TopBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { MainPanel } from "@/components/layout/MainPanel";
import { StatusBar } from "@/components/layout/StatusBar";
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

  useEffect(() => {
    void loadConnections();
    void refreshActiveConnection();
  }, [loadConnections, refreshActiveConnection]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        addTab();
      }
      if (event.ctrlKey && event.key.toLowerCase() === "w") {
        event.preventDefault();
        const current = activeTabId ?? tabs[0]?.id;
        if (current) closeTab(current);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [addTab, closeTab, activeTabId, tabs]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--color-bg-primary)]">
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
                defaultSize="20%"
                minSize="15%"
                maxSize="31%"
                className="min-w-[200px] max-w-[400px]"
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
  );
}

export default App;
