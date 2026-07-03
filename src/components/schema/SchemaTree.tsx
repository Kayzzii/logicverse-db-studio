import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronRight,
  Database,
  Eye,
  Folder,
  Key,
  Link2,
  List,
  Loader2,
  Minus,
  RefreshCw,
  Settings,
  Table2,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SchemaSearch, SchemaSearchHandle } from "@/components/schema/SchemaSearch";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useConnectionStore } from "@/stores/connectionStore";
import { nodeKey, useSchemaStore } from "@/stores/schemaStore";
import { buildCountSql, useQueryStore, useSchemaCompletionStore } from "@/stores/queryStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAppActionsStore } from "@/stores/appActionsStore";
import { ColumnInfo } from "@/lib/tauri";
import { tauriApi } from "@/lib/tauri";
import { copyToClipboard } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const INDENT = { db: 0, schema: 16, table: 32, column: 48 } as const;

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="ml-auto shrink-0 rounded-[2px] bg-[var(--bg-deep)] px-1 py-px font-mono-db text-[9.5px] text-[var(--text-ghost)]">
      {type}
    </span>
  );
}

function CountBadge({ count, muted }: { count: number; muted?: boolean }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-[2px] px-[5px] font-mono-db text-[10px]",
        muted
          ? "bg-[var(--bg-deep)] text-[var(--text-ghost)]"
          : "bg-[#313244] text-[var(--text-muted)]",
      )}
    >
      {count}
    </span>
  );
}

function TreeRow({
  indent,
  expanded,
  loading,
  icon,
  label,
  labelClassName,
  suffix,
  active,
  onToggle,
  onClick,
  onDoubleClick,
  className,
  children,
}: {
  indent: number;
  expanded?: boolean;
  loading?: boolean;
  icon: ReactNode;
  label: string;
  labelClassName?: string;
  suffix?: ReactNode;
  active?: boolean;
  onToggle?: () => void;
  onClick?: () => void;
  onDoubleClick?: () => void;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        className={cn(
          "flex w-full items-center gap-[5px] py-[3px] pr-2 text-left transition-colors hover:bg-[var(--bg-hover)]",
          active && "border-l-2 border-l-[var(--accent)] bg-[var(--bg-active)]",
          className,
        )}
        style={{ paddingLeft: `${indent + (active ? 6 : 8)}px` }}
        onClick={() => {
          if (onToggle) onToggle();
          else onClick?.();
        }}
        onDoubleClick={(e) => {
          e.preventDefault();
          onDoubleClick?.();
        }}
      >
        {onToggle ? (
          expanded ? (
            <ChevronDown
              className={cn(
                "h-2 w-2 shrink-0",
                active ? "text-[var(--green)]" : "text-[var(--text-muted)]",
              )}
              strokeWidth={2.5}
            />
          ) : (
            <ChevronRight className="h-2 w-2 shrink-0 text-[var(--text-muted)]" strokeWidth={2.5} />
          )
        ) : (
          <span className="w-2 shrink-0" />
        )}
        {icon}
        <span
          className={cn(
            "min-w-0 flex-1 truncate font-mono-db text-xs",
            labelClassName ?? "text-[var(--text-primary)]",
          )}
        >
          {label}
        </span>
        {suffix}
        {loading && <Loader2 className="h-3 w-3 shrink-0 animate-spin text-[var(--accent)]" />}
      </button>
      {children}
    </div>
  );
}

function ColumnRow({ indent, col }: { indent: number; col: ColumnInfo }) {
  return (
    <div
      className="flex items-center gap-[5px] py-[3px] pr-2 hover:bg-[var(--bg-hover)]"
      style={{ paddingLeft: `${indent + 8}px` }}
    >
      <span className="w-2 shrink-0" />
      {col.isPrimaryKey ? (
        <Key className="h-3 w-3 shrink-0 text-[var(--yellow)]" strokeWidth={1.75} />
      ) : col.foreignKey ? (
        <Link2 className="h-3 w-3 shrink-0 text-[var(--accent)]" strokeWidth={1.75} />
      ) : (
        <Minus className="h-[7px] w-[7px] shrink-0 text-[var(--text-ghost)]" strokeWidth={1} />
      )}
      <span className="truncate font-mono-db text-[11px] text-[var(--text-secondary)]">
        {col.name}
      </span>
      <TypeBadge type={col.dataType} />
    </div>
  );
}

export function SchemaTree() {
  const activeConnectionId = useConnectionStore((s) => s.activeConnectionId);
  const connectionList = useConnectionStore((s) => s.connections);
  const activeConnection = connectionList.find((c) => c.id === activeConnectionId);
  const connectedDatabase = activeConnection?.database ?? null;
  const driver = activeConnection?.driver ?? "postgres";

  const databases = useSchemaStore((s) => s.databases);
  const schemas = useSchemaStore((s) => s.schemas);
  const tables = useSchemaStore((s) => s.tables);
  const columns = useSchemaStore((s) => s.columns);
  const expanded = useSchemaStore((s) => s.expanded);
  const loading = useSchemaStore((s) => s.loading);
  const selectedDatabase = useSchemaStore((s) => s.selectedDatabase);
  const loadDatabases = useSchemaStore((s) => s.loadDatabases);
  const reloadSchema = useSchemaStore((s) => s.reloadSchema);
  const loadSchemas = useSchemaStore((s) => s.loadSchemas);
  const loadTables = useSchemaStore((s) => s.loadTables);
  const loadColumns = useSchemaStore((s) => s.loadColumns);
  const toggleExpanded = useSchemaStore((s) => s.toggleExpanded);
  const setSelectedDatabase = useSchemaStore((s) => s.setSelectedDatabase);

  const openTableView = useQueryStore((s) => s.openTableView);
  const openErTab = useQueryStore((s) => s.openErTab);
  const setCompletionItems = useSchemaCompletionStore((s) => s.setItems);
  const addToast = useSettingsStore((s) => s.addToast);
  const registerActions = useAppActionsStore((s) => s.registerActions);

  const searchRef = useRef<SchemaSearchHandle>(null);
  const [search, setSearch] = useState("");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({});
  const [countLoading, setCountLoading] = useState<Record<string, boolean>>({});

  const filteredSchemas = useMemo(() => {
    if (!selectedDatabase) return [];
    const dbSchemas = schemas[selectedDatabase] ?? [];
    if (!search.trim()) return dbSchemas;
    const term = search.toLowerCase();
    return dbSchemas.filter((schema) => {
      if (schema.toLowerCase().includes(term)) return true;
      return (tables[schema] ?? []).some((t) => t.name.toLowerCase().includes(term));
    });
  }, [schemas, selectedDatabase, search, tables]);

  const updateCompletionItems = useCallback(() => {
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
  }, [columns, schemas, selectedDatabase, setCompletionItems, tables]);

  const fetchTableCount = useCallback(
    async (schema: string, table: string) => {
      if (!activeConnectionId) return;
      const key = `${schema}.${table}`;
      if (tableCounts[key] !== undefined || countLoading[key]) return;

      setCountLoading((prev) => ({ ...prev, [key]: true }));
      try {
        const queryId = await tauriApi.generateQueryId();
        const result = await tauriApi.executeQuery(
          activeConnectionId,
          queryId,
          buildCountSql(driver, schema, table),
        );
        const count = Number(result.rows[0]?.[0] ?? 0);
        setTableCounts((prev) => ({ ...prev, [key]: count }));
      } catch {
        setTableCounts((prev) => ({ ...prev, [key]: -1 }));
      } finally {
        setCountLoading((prev) => ({ ...prev, [key]: false }));
      }
    },
    [activeConnectionId, countLoading, driver, tableCounts],
  );

  const handleOpenTable = (schema: string, table: string) => {
    setSelectedTable(`${schema}.${table}`);
    if (activeConnectionId) {
      void openTableView(schema, table, activeConnectionId, driver);
    }
  };

  const handleOpenErDiagram = useCallback(
    async (schema: string) => {
      if (!activeConnectionId) return;
      try {
        const data = await tauriApi.getTableRelations(activeConnectionId, schema);
        openErTab(schema, data);
      } catch (error) {
        addToast("error", error instanceof Error ? error.message : String(error));
      }
    },
    [activeConnectionId, addToast, openErTab],
  );

  const handleRefreshSchema = useCallback(async () => {
    if (!activeConnectionId) {
      addToast("error", "Conectá una base de datos primero");
      return;
    }
    try {
      await reloadSchema(activeConnectionId, connectedDatabase);
      addToast("success", "Schema recargado");
    } catch (error) {
      addToast("error", error instanceof Error ? error.message : String(error));
    }
  }, [activeConnectionId, addToast, connectedDatabase, reloadSchema]);

  useEffect(() => {
    registerActions({
      refreshSchema: () => void handleRefreshSchema(),
      focusSchemaSearch: () => {
        document.getElementById("schema-browser")?.scrollIntoView({ behavior: "smooth" });
        searchRef.current?.focus();
      },
      searchTables: () => {
        searchRef.current?.focus();
      },
      goToSchemaBrowser: () => {
        document.getElementById("schema-browser")?.scrollIntoView({ behavior: "smooth" });
        searchRef.current?.focus();
      },
      viewErDiagram: () => {
        const schema = filteredSchemas[0] ?? "public";
        void handleOpenErDiagram(schema);
      },
    });
  }, [filteredSchemas, handleOpenErDiagram, handleRefreshSchema, registerActions]);

  const handleCopy = async (text: string, message: string) => {
    await copyToClipboard(text);
    addToast("success", message);
  };

  const refreshTable = async (schema: string, table: string) => {
    if (!activeConnectionId) return;
    const key = `${schema}.${table}`;
    setTableCounts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    try {
      await loadColumns(activeConnectionId, schema, table, { force: true });
      await fetchTableCount(schema, table);
      updateCompletionItems();
    } catch (error) {
      addToast("error", error instanceof Error ? error.message : String(error));
    }
  };

  useEffect(() => {
    if (activeConnectionId && databases.length === 0) {
      void loadDatabases(activeConnectionId, {
        expandDatabase: connectedDatabase ?? undefined,
      }).catch((error) => {
        addToast("error", error instanceof Error ? error.message : String(error));
      });
    }
  }, [activeConnectionId, connectedDatabase, databases.length, loadDatabases, addToast]);

  useEffect(() => {
    updateCompletionItems();
  }, [updateCompletionItems]);

  if (!activeConnectionId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
        <Database className="h-8 w-8 text-[var(--text-muted)]" />
        <p className="text-xs text-[var(--text-muted)]">
          Conectá una base de datos para explorar el schema
        </p>
      </div>
    );
  }

  const handleToggleDatabase = async (database: string) => {
    if (connectedDatabase && database !== connectedDatabase) return;
    const key = nodeKey("db", database);
    toggleExpanded(key);
    setSelectedDatabase(database);
    if (!expanded[key]) await loadSchemas(activeConnectionId, database);
    updateCompletionItems();
  };

  const handleToggleSchema = async (schema: string) => {
    const key = nodeKey("schema", schema);
    toggleExpanded(key);
    if (!expanded[key]) await loadTables(activeConnectionId, schema);
    updateCompletionItems();
  };

  const handleToggleTable = async (schema: string, table: string) => {
    const key = nodeKey("table", schema, table);
    setSelectedTable(`${schema}.${table}`);
    toggleExpanded(key);
    if (!expanded[key]) {
      await loadColumns(activeConnectionId, schema, table);
      void fetchTableCount(schema, table);
    }
    updateCompletionItems();
  };

  return (
    <div className="flex h-full flex-col">
      <SchemaSearch ref={searchRef} value={search} onChange={setSearch} />
      <ScrollArea className="flex-1">
        <div className="pb-2">
          {databases.map((database) => {
            const dbKey = nodeKey("db", database);
            const isDbExpanded = expanded[dbKey];
            const isActive = database === connectedDatabase;
            const dbLoading = loading[nodeKey("schemas", activeConnectionId, database)];

            return (
              <div key={database}>
                <TreeRow
                  indent={INDENT.db}
                  expanded={isDbExpanded}
                  loading={dbLoading}
                  icon={<Database className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" strokeWidth={1.75} />}
                  label={database}
                  suffix={
                    isActive ? (
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--green)]"
                        aria-hidden
                      />
                    ) : null
                  }
                  onToggle={() => void handleToggleDatabase(database)}
                />

                {isDbExpanded && selectedDatabase === database && (
                  <div className="tree-node-enter">
                    {filteredSchemas.map((schema) => {
                      const schemaKey = nodeKey("schema", schema);
                      const schemaExpanded = expanded[schemaKey];
                      const schemaLoading = loading[nodeKey("tables", activeConnectionId, schema)];
                      const schemaTables = (tables[schema] ?? []).filter((t) =>
                        !search.trim()
                          ? true
                          : t.name.toLowerCase().includes(search.toLowerCase()),
                      );

                      return (
                        <ContextMenu key={schema}>
                          <ContextMenuTrigger asChild>
                            <div>
                          <TreeRow
                            indent={INDENT.schema}
                            expanded={schemaExpanded}
                            loading={schemaLoading}
                            icon={
                              <Folder
                                className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]"
                                strokeWidth={1.75}
                                fill="rgba(137,180,250,0.12)"
                              />
                            }
                            label={schema}
                            labelClassName="text-[var(--text-secondary)]"
                            onToggle={() => void handleToggleSchema(schema)}
                          />

                          {schemaExpanded && (
                            <div className="tree-node-enter">
                              {schemaTables.map((table) => {
                                const tableKey = nodeKey("table", schema, table.name);
                                const tableExpanded = expanded[tableKey];
                                const tableLoading = loading[
                                  nodeKey("columns", activeConnectionId, schema, table.name)
                                ];
                                const countKey = `${schema}.${table.name}`;
                                const count = tableCounts[countKey];
                                const isTableActive = selectedTable === countKey;
                                const isCollapsed = !tableExpanded;

                                const tableColumns = columns[countKey] ?? [];

                                return (
                                  <ContextMenu key={table.name}>
                                    <ContextMenuTrigger asChild>
                                      <div>
                                        <TreeRow
                                          indent={INDENT.table}
                                          expanded={tableExpanded}
                                          loading={tableLoading}
                                          active={isTableActive}
                                          icon={
                                            <Table2
                                              className="h-[13px] w-[13px] shrink-0 text-[var(--green)]"
                                              strokeWidth={1.75}
                                            />
                                          }
                                          label={table.name}
                                          labelClassName={
                                            isCollapsed && !isTableActive
                                              ? "text-[var(--text-muted)]"
                                              : "text-[var(--text-primary)]"
                                          }
                                          suffix={
                                            count !== undefined && count >= 0 ? (
                                              <CountBadge
                                                count={count}
                                                muted={isCollapsed && !isTableActive}
                                              />
                                            ) : countLoading[countKey] ? (
                                              <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : null
                                          }
                                          onToggle={() =>
                                            void handleToggleTable(schema, table.name)
                                          }
                                          onDoubleClick={() =>
                                            handleOpenTable(schema, table.name)
                                          }
                                        />

                                        {tableExpanded && (
                                          <div className="tree-node-enter">
                                            {tableColumns.map((col) => (
                                              <ColumnRow
                                                key={col.name}
                                                indent={INDENT.column}
                                                col={col}
                                              />
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </ContextMenuTrigger>
                                    <ContextMenuContent>
                                      <ContextMenuItem
                                        onClick={() => handleOpenTable(schema, table.name)}
                                      >
                                        View Data
                                      </ContextMenuItem>
                                      <ContextMenuItem
                                        onClick={() =>
                                          void handleCopy(table.name, "Nombre copiado")
                                        }
                                      >
                                        Copy Name
                                      </ContextMenuItem>
                                      <ContextMenuItem
                                        onClick={() =>
                                          void handleCopy(
                                            `${schema}.${table.name}`,
                                            "Nombre calificado copiado",
                                          )
                                        }
                                      >
                                        Copy qualified name
                                      </ContextMenuItem>
                                      <ContextMenuSeparator />
                                      <ContextMenuItem
                                        onClick={() => void refreshTable(schema, table.name)}
                                      >
                                        <RefreshCw className="mr-2 h-3.5 w-3.5" />
                                        Refresh
                                      </ContextMenuItem>
                                    </ContextMenuContent>
                                  </ContextMenu>
                                );
                              })}

                              <TreeRow
                                indent={INDENT.table}
                                icon={
                                  <Eye className="h-3.5 w-3.5 shrink-0 text-[var(--text-ghost)]" />
                                }
                                label="Views"
                                labelClassName="text-[var(--text-ghost)]"
                              />
                              <TreeRow
                                indent={INDENT.table}
                                icon={
                                  <Settings className="h-3.5 w-3.5 shrink-0 text-[var(--text-ghost)]" />
                                }
                                label="Functions"
                                labelClassName="text-[var(--text-ghost)]"
                              />
                              <TreeRow
                                indent={INDENT.table}
                                icon={
                                  <List className="h-3.5 w-3.5 shrink-0 text-[var(--text-ghost)]" />
                                }
                                label="Sequences"
                                labelClassName="text-[var(--text-ghost)]"
                              />
                            </div>
                          )}
                            </div>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem onClick={() => void handleOpenErDiagram(schema)}>
                              View ER Diagram
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {databases.length === 0 && (
            <button
              type="button"
              className="mx-2.5 mt-2 flex w-[calc(100%-20px)] items-center justify-center gap-2 rounded border border-dashed border-[var(--border)] py-3 font-mono-db text-xs text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
              onClick={() => void handleRefreshSchema()}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Cargar schema
            </button>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
