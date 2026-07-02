import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Database,
  Folder,
  Table2,
  Columns3,
  Loader2,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SchemaSearch } from "@/components/schema/SchemaSearch";
import { useConnectionStore } from "@/stores/connectionStore";
import { nodeKey, useSchemaStore } from "@/stores/schemaStore";
import { useQueryStore, useSchemaCompletionStore } from "@/stores/queryStore";
import { cn } from "@/lib/utils";

export function SchemaTree() {
  const connections = useConnectionStore((s) => s.connections);
  const activeConnectionId = useConnectionStore((s) => s.activeConnectionId);
  const activeConnection = connections.find((c) => c.id === activeConnectionId);
  const connectedDatabase = activeConnection?.database ?? null;
  const databases = useSchemaStore((s) => s.databases);
  const schemas = useSchemaStore((s) => s.schemas);
  const tables = useSchemaStore((s) => s.tables);
  const columns = useSchemaStore((s) => s.columns);
  const expanded = useSchemaStore((s) => s.expanded);
  const loading = useSchemaStore((s) => s.loading);
  const selectedDatabase = useSchemaStore((s) => s.selectedDatabase);
  const loadSchemas = useSchemaStore((s) => s.loadSchemas);
  const loadTables = useSchemaStore((s) => s.loadTables);
  const loadColumns = useSchemaStore((s) => s.loadColumns);
  const toggleExpanded = useSchemaStore((s) => s.toggleExpanded);
  const setSelectedDatabase = useSchemaStore((s) => s.setSelectedDatabase);
  const addTab = useQueryStore((s) => s.addTab);
  const setCompletionItems = useSchemaCompletionStore((s) => s.setItems);
  const [search, setSearch] = useState("");

  const filteredSchemas = useMemo(() => {
    if (!selectedDatabase) return [];
    const dbSchemas = schemas[selectedDatabase] ?? [];
    if (!search.trim()) return dbSchemas;

    const term = search.toLowerCase();
    return dbSchemas.filter((schema) => {
      if (schema.toLowerCase().includes(term)) return true;
      const schemaTables = tables[schema] ?? [];
      return schemaTables.some((t) => t.name.toLowerCase().includes(term));
    });
  }, [schemas, selectedDatabase, search, tables]);

  const updateCompletionItems = () => {
    if (!selectedDatabase) return;
    const items: { label: string; type: "table" | "column" }[] = [];
    for (const schema of schemas[selectedDatabase] ?? []) {
      for (const table of tables[schema] ?? []) {
        items.push({ label: `${schema}.${table.name}`, type: "table" });
        for (const col of columns[`${schema}.${table.name}`] ?? []) {
          items.push({ label: col.name, type: "column" });
        }
      }
    }
    setCompletionItems(items);
  };

  if (!activeConnectionId) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-xs text-[var(--color-muted-foreground)]">
        Conectá una base de datos para explorar el schema
      </div>
    );
  }

  const handleToggleDatabase = async (database: string) => {
    if (connectedDatabase && database !== connectedDatabase) {
      return;
    }
    const key = nodeKey("db", database);
    toggleExpanded(key);
    setSelectedDatabase(database);
    if (!expanded[key]) {
      await loadSchemas(activeConnectionId, database);
    }
    updateCompletionItems();
  };

  const handleToggleSchema = async (schema: string) => {
    const key = nodeKey("schema", schema);
    toggleExpanded(key);
    if (!expanded[key]) {
      await loadTables(activeConnectionId, schema);
    }
    updateCompletionItems();
  };

  const handleToggleTable = async (schema: string, table: string) => {
    const key = nodeKey("table", schema, table);
    toggleExpanded(key);
    if (!expanded[key]) {
      await loadColumns(activeConnectionId, schema, table);
    }
    updateCompletionItems();
  };

  const handleOpenTable = (schema: string, table: string) => {
    addTab(`SELECT * FROM "${schema}"."${table}" LIMIT 100;`, table);
  };

  return (
    <div className="flex h-full flex-col">
      <SchemaSearch value={search} onChange={setSearch} />

      <ScrollArea className="flex-1">
        <div className="space-y-0.5 px-2 pb-4">
          {databases.map((database) => {
            const dbKey = nodeKey("db", database);
            const isExpanded = expanded[dbKey];
            const isLoading = loading[nodeKey("schemas", activeConnectionId, database)];

            return (
              <div key={database}>
                <button
                  type="button"
                  className="flex w-full items-center gap-1 rounded px-1 py-1 text-left text-sm hover:bg-[var(--color-accent)]"
                  onClick={() => void handleToggleDatabase(database)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  )}
                  <Database className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                  <span className="truncate">{database}</span>
                  {isLoading && <Loader2 className="ml-auto h-3 w-3 animate-spin" />}
                </button>

                {isExpanded && selectedDatabase === database && (
                  <div className="ml-4 border-l border-[var(--color-border)] pl-2">
                    {filteredSchemas.map((schema) => {
                      const schemaKey = nodeKey("schema", schema);
                      const schemaExpanded = expanded[schemaKey];
                      const schemaLoading = loading[nodeKey("tables", activeConnectionId, schema)];
                      const schemaTables = tables[schema] ?? [];

                      return (
                        <div key={schema}>
                          <button
                            type="button"
                            className="flex w-full items-center gap-1 rounded px-1 py-1 text-left text-sm hover:bg-[var(--color-accent)]"
                            onClick={() => void handleToggleSchema(schema)}
                          >
                            {schemaExpanded ? (
                              <ChevronDown className="h-4 w-4 shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 shrink-0" />
                            )}
                            <Folder className="h-4 w-4 shrink-0 text-amber-400" />
                            <span className="truncate">{schema}</span>
                            {schemaLoading && (
                              <Loader2 className="ml-auto h-3 w-3 animate-spin" />
                            )}
                          </button>

                          {schemaExpanded && (
                            <div className="ml-4 border-l border-[var(--color-border)] pl-2">
                              {schemaTables
                                .filter((t) =>
                                  !search.trim()
                                    ? true
                                    : t.name.toLowerCase().includes(search.toLowerCase()),
                                )
                                .map((table) => {
                                  const tableKey = nodeKey("table", schema, table.name);
                                  const tableExpanded = expanded[tableKey];
                                  const tableLoading = loading[
                                    nodeKey("columns", activeConnectionId, schema, table.name)
                                  ];
                                  const tableColumns =
                                    columns[`${schema}.${table.name}`] ?? [];

                                  return (
                                    <div key={table.name}>
                                      <div className="flex items-center">
                                        <button
                                          type="button"
                                          className="flex flex-1 items-center gap-1 rounded px-1 py-1 text-left text-sm hover:bg-[var(--color-accent)]"
                                          onClick={() =>
                                            void handleToggleTable(schema, table.name)
                                          }
                                        >
                                          {tableExpanded ? (
                                            <ChevronDown className="h-4 w-4 shrink-0" />
                                          ) : (
                                            <ChevronRight className="h-4 w-4 shrink-0" />
                                          )}
                                          <Table2 className="h-4 w-4 shrink-0 text-emerald-400" />
                                          <span className="truncate">{table.name}</span>
                                          {tableLoading && (
                                            <Loader2 className="ml-auto h-3 w-3 animate-spin" />
                                          )}
                                        </button>
                                        <button
                                          type="button"
                                          className="rounded px-1 text-[10px] text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)]"
                                          onClick={() => handleOpenTable(schema, table.name)}
                                        >
                                          Ver
                                        </button>
                                      </div>

                                      {tableExpanded && (
                                        <div className="ml-6 space-y-0.5 border-l border-[var(--color-border)] pl-2">
                                          {tableColumns.map((col) => (
                                            <div
                                              key={col.name}
                                              className="flex items-center gap-2 rounded px-1 py-0.5 text-xs text-[var(--color-muted-foreground)]"
                                            >
                                              <Columns3 className="h-3 w-3 shrink-0" />
                                              <span
                                                className={cn(
                                                  col.isPrimaryKey && "text-amber-400",
                                                )}
                                              >
                                                {col.name}
                                              </span>
                                              <span className="truncate opacity-70">
                                                {col.dataType}
                                                {!col.nullable ? " NOT NULL" : ""}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
