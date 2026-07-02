import { useEffect } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { MainPanel } from "@/components/layout/MainPanel";
import { StatusBar } from "@/components/layout/StatusBar";
import { ToastContainer } from "@/components/shared/Toast";
import { useConnectionStore } from "@/stores/connectionStore";
import { useQueryStore } from "@/stores/queryStore";

function App() {
  const loadConnections = useConnectionStore((s) => s.loadConnections);
  const refreshActiveConnection = useConnectionStore((s) => s.refreshActiveConnection);
  const addTab = useQueryStore((s) => s.addTab);
  const tabs = useQueryStore((s) => s.tabs);
  const activeTabId = useQueryStore((s) => s.activeTabId);
  const closeTab = useQueryStore((s) => s.closeTab);

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
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--color-background)]">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1">
          <MainPanel />
        </main>
      </div>
      <StatusBar />
      <ToastContainer />
    </div>
  );
}

export default App;
