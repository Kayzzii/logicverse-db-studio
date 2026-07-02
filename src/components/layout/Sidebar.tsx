import { ConnectionList } from "@/components/connections/ConnectionList";
import { SchemaTree } from "@/components/schema/SchemaTree";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettingsStore } from "@/stores/settingsStore";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const collapsed = useSettingsStore((s) => s.sidebarCollapsed);

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-[var(--color-border)] bg-[var(--color-card)] transition-all duration-200",
        collapsed ? "w-0 overflow-hidden opacity-0" : "w-80 opacity-100",
      )}
    >
      <Tabs defaultValue="connections" className="flex h-full flex-col">
        <TabsList className="mx-2 mt-2 grid w-auto grid-cols-2">
          <TabsTrigger value="connections">Conexiones</TabsTrigger>
          <TabsTrigger value="schema">Schema</TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="mt-0 flex-1 overflow-hidden">
          <ConnectionList />
        </TabsContent>

        <TabsContent value="schema" className="mt-0 flex-1 overflow-hidden">
          <SchemaTree />
        </TabsContent>
      </Tabs>

      <Separator />
    </aside>
  );
}
