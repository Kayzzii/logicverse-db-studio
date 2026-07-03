import { useCallback, useEffect, useRef, useState } from "react";
import SplashScreen from "@/components/SplashScreen";
import { MenuBar } from "@/components/layout/MenuBar";
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
  const setSidebarCollapsed = useSettingsStore((s) => s.setSidebarCollapsed);
  const loadSettings = useSettingsStore((s) => s.loadSettings);

  const [showSplash, setShowSplash] = useState(true);
  const [appReady, setAppReady] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const lastWidthRef = useRef(240);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(
        180,
        Math.min(450, startWidth + (moveEvent.clientX - startX)),
      );
      lastWidthRef.current = newWidth;
      setSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const toggleSidebar = useCallback(() => {
    if (sidebarCollapsed) {
      setSidebarWidth(lastWidthRef.current);
      setSidebarCollapsed(false);
    } else {
      lastWidthRef.current = sidebarWidth;
      setSidebarCollapsed(true);
    }
  }, [sidebarCollapsed, setSidebarCollapsed, sidebarWidth]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([loadConnections(), refreshActiveConnection(), loadSettings()]).finally(() => {
      if (!cancelled) {
        setAppReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
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

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} ready={appReady} />;
  }

  return (
    <EditorCursorProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg-app)]">
        <MenuBar onToggleSidebar={toggleSidebar} />
        <TopBar />
        <div className="min-h-0 flex-1">
          <div className="flex h-full overflow-hidden">
            {!sidebarCollapsed && (
              <>
                <div
                  className="h-full overflow-y-auto overflow-x-hidden border-r border-[var(--border)]"
                  style={{
                    width: sidebarWidth,
                    minWidth: 180,
                    maxWidth: 450,
                    flexShrink: 0,
                  }}
                >
                  <Sidebar />
                </div>
                <div
                  className="w-[4px] flex-shrink-0 cursor-col-resize bg-[var(--border)] hover:bg-[var(--accent)]"
                  onMouseDown={handleMouseDown}
                />
              </>
            )}
            <div className="min-w-0 flex-1 overflow-hidden">
              <MainPanel />
            </div>
          </div>
        </div>
        <StatusBar />
        <ToastContainer />
      </div>
    </EditorCursorProvider>
  );
}

export default App;