import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronRight,
  Database,
  Eye,
  FolderOpen,
  Hash,
  Key,
  Link2,
  List,
  Loader2,
  RefreshCw,
  Settings,
  Table2,
  Type,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { SchemaSearch } from "@/components/schema/SchemaSearch";
import { DataTypeIcon } from "@/components/shared/DataTypeIcon";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useConnectionStore } from "@/stores/connectionStore";
import { nodeKey, useSchemaStore } from "@/stores/schemaStore";
import { useQueryStore, useSchemaCompletionStore } from "@/stores/queryStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { ColumnInfo } from "@/lib/tauri";
import { tauriApi } from "@/lib/tauri";
import { copyToClipboard } from "@/lib/formatters";
import { cn } from "@/lib/utils";

function TreeRow({
  depth,
  expanded,
  loading,
  icon,
  label,
  suffix,
  onToggle,
  onDoubleClick,
  className,
  children,
}: {
  depth: number;
  expanded?: boolean;
  loading?: boolean;
  icon: ReactNode;
  label: string;
  suffix?: ReactNode;
  onToggle?: () => void;
  onDoubleClick?: () => void;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        className={cn(
          "flex w-full items-center gap-1 rounded-sm py-0.5 pr-2 text-left transition-colors duration-100 hover:bg-[var(--color-bg-hover)]",
          className,
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        onClick={onToggle}
        onDoubleClick={(e) => {
          e.preventDefault();
          onDoubleClick?.();
        }}
      >
        {onToggle ? (
          expanded ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />
          )
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        {icon}
        <span className="min-w-0 flex-1 truncate font-mono-db text-xs text-[var(--color-text-primary)]">
          {label}
        </span>
        {suffix}
        {loading && <Loader2 className="h-3 w-3 shrink-0 animate-spin text-[var(--color-primary)]" />}
      </button>
      {children}
    </div>
  );
}

function SectionLabel({ depth, label }: { depth: number; label: string }) {
  return (
    <div
      className="py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]"
      style={{ paddingLeft: `${depth * 12 + 24}px` }}
    >
      {label}
    </div>
  );
}

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
  const loadDatabases = useSchemaStore((s) => s.loadDatabases);
  const loadSchemas = useSchemaStore((s) => s.loadSchemas);
  const loadTables = useSchemaStore((s) => s.loadTables);
  const loadColumns = useSchemaStore((s) => s.loadColumns);
  const toggleExpanded = useSchemaStore((s) => s.toggleExpanded);
  const setSelectedDatabase = useSchemaStore((s) => s.setSelectedDatabase);

  const addTab = useQueryStore((s) => s.addTab);
  const setCompletionItems = useSchemaCompletionStore((s) => s.setItems);
  const addToast = useSettingsStore((s) => s.addToast);

  const [search, setSearch] = useState("");
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
          `SELECT COUNT(*) FROM "${schema}"."${table}"`,
        );
        const count = Number(result.rows[0]?.[0] ?? 0);
        setTableCounts((prev) => ({ ...prev, [key]: count }));
      } catch {
        setTableCounts((prev) => ({ ...prev, [key]: -1 }));
      } finally {
        setCountLoading((prev) => ({ ...prev, [key]: false }));
      }
    },
    [activeConnectionId, countLoading, tableCounts],
  );

  const handleOpenTable = (schema: string, table: string) => {
    addTab(`SELECT * FROM "${schema}"."${table}" LIMIT 100;`, table);
  };

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
    await loadColumns(activeConnectionId, schema, table);
    await fetchTableCount(schema, table);
    updateCompletionItems();
  };

  useEffect(() => {
    updateCompletionItems();
  }, [updateCompletionItems]);

  if (!activeConnectionId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
        <Database className="h-8 w-8 text-[var(--color-text-muted)]" />
        <p className="text-xs text-[var(--color-text-muted)]">
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
    toggleExpanded(key);
    if (!expanded[key]) {
      await loadColumns(activeConnectionId, schema, table);
      void fetchTableCount(schema, table);
    }
    updateCompletionItems();
  };

  const renderColumns = (schema: string, table: string, tableColumns: ColumnInfo[], depth: number) => {
    const colsKey = nodeKey("cols", schema, table);
    const colsExpanded = expanded[colsKey];

    return (
      <TreeRow
        depth={depth}
        expanded={colsExpanded}
        icon={<Type className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-secondary)]" />}
        label="Columns"
        onToggle={() => toggleExpanded(colsKey)}
      >
        {colsExpanded && (
          <div className="tree-node-enter">
            {tableColumns.map((col) => (
              <div
                key={col.name}
                className="flex items-center gap-1 py-0.5 pr-2 hover:bg-[var(--color-bg-hover)]"
                style={{ paddingLeft: `${(depth + 1) * 12 + 28}px` }}
              >
                {col.isPrimaryKey ? (
                  <Key className="h-3 w-3 shrink-0 text-[var(--color-accent-yellow)]" />
                ) : col.foreignKey ? (
                  <Link2 className="h-3 w-3 shrink-0 text-[var(--color-primary)]" />
                ) : (
                  <span className="w-3 shrink-0" />
                )}
                <DataTypeIcon type={col.dataType} />
                <span className="truncate font-mono-db text-xs text-[var(--color-text-primary)]">
                  {col.name}
                </span>
                <span className="truncate text-[10px] text-[var(--color-text-muted)]">
                  {col.dataType}
                  {!col.nullable ? " NOT NULL" : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </TreeRow>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <SchemaSearch value={search} onChange={setSearch} />
      <ScrollArea className="flex-1">
        <div className="py-1">
          {databases.map((database) => {
            const dbKey = nodeKey("db", database);
            const isDbExpanded = expanded[dbKey];
            const isActive = database === connectedDatabase;
            const dbLoading = loading[nodeKey("schemas", activeConnectionId, database)];

            return (
              <div key={database}>
                <TreeRow
                  depth={0}
                  expanded={isDbExpanded}
                  loading={dbLoading}
                  icon={<Database className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />}
                  label={database}
                  suffix={
                    isActive ? (
                      <Badge variant="outline" className="h-4 px-1 text-[9px]">
                        activa
                      </Badge>
                    ) : null
                  }
                  onToggle={() => void handleToggleDatabase(database)}
                />

                {isDbExpanded && selectedDatabase === database && (
                  <div className="tree-node-enter">
                    <SectionLabel depth={1} label="Schemas" />
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
                        <div key={schema}>
                          <TreeRow
                            depth={1}
                            expanded={schemaExpanded}
                            loading={schemaLoading}
                            icon={
                              <FolderOpen className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent-yellow)]" />
                            }
                            label={schema}
                            onToggle={() => void handleToggleSchema(schema)}
                          />

                          {schemaExpanded && (
                            <div className="tree-node-enter">
                              <SectionLabel depth={2} label="Tables" />
                              {schemaTables.map((table) => {
                                const tableKey = nodeKey("table", schema, table.name);
                                const tableExpanded = expanded[tableKey];
                                const tableLoading = loading[
                                  nodeKey("columns", activeConnectionId, schema, table.name)
                                ];
                                const countKey = `${schema}.${table.name}`;
                                const count = tableCounts[countKey];

                                const tableColumns = columns[countKey] ?? [];
                                const fkColumns = tableColumns.filter((c) => c.foreignKey);

                                return (
                                  <ContextMenu key={table.name}>
                                    <ContextMenuTrigger asChild>
                                      <div>
                                        <TreeRow
                                          depth={2}
                                          expanded={tableExpanded}
                                          loading={tableLoading}
                                          icon={
                                            <Table2 className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent-green)]" />
                                          }
                                          label={table.name}
                                          suffix={
                                            count !== undefined && count >= 0 ? (
                                              <Badge
                                                variant="secondary"
                                                className="h-4 px-1 font-mono-db text-[9px]"
                                              >
                                                {count}
                                              </Badge>
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
                                            {renderColumns(
                                              schema,
                                              table.name,
                                              tableColumns,
                                              3,
                                            )}

                                            <TreeRow
                                              depth={3}
                                              icon={
                                                <Hash className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />
                                              }
                                              label="Indexes"
                                              suffix={
                                                <span className="text-[10px] text-[var(--color-text-muted)]">
                                                  —
                                                </span>
                                              }
                                            />

                                            <TreeRow
                                              depth={3}
                                              expanded={expanded[nodeKey("fk", schema, table.name)]}
                                              icon={
                                                <Link2 className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />
                                              }
                                              label="Foreign Keys"
                                              suffix={
                                                fkColumns.length > 0 ? (
                                                  <Badge
                                                    variant="outline"
                                                    className="h-4 px-1 text-[9px]"
                                                  >
                                                    {fkColumns.length}
                                                  </Badge>
                                                ) : undefined
                                              }
                                              onToggle={() =>
                                                toggleExpanded(nodeKey("fk", schema, table.name))
                                              }
                                            >
                                              {expanded[nodeKey("fk", schema, table.name)] &&
                                                fkColumns.map((col) => (
                                                  <div
                                                    key={col.name}
                                                    className="font-mono-db text-[10px] text-[var(--color-text-muted)]"
                                                    style={{ paddingLeft: `${4 * 12 + 28}px` }}
                                                  >
                                                    {col.name} → {col.foreignKey?.schema}.
                                                    {col.foreignKey?.table}
                                                  </div>
                                                ))}
                                            </TreeRow>
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
                                depth={2}
                                icon={<Eye className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />}
                                label="Views"
                              />
                              <TreeRow
                                depth={2}
                                icon={
                                  <Settings className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />
                                }
                                label="Functions"
                              />
                              <TreeRow
                                depth={2}
                                icon={<List className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />}
                                label="Sequences"
                              />
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

          {databases.length === 0 && (
            <button
              type="button"
              className="mx-2 mt-2 flex w-[calc(100%-1rem)] items-center justify-center gap-2 rounded border border-dashed border-[var(--color-border)] py-3 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]"
              onClick={() => void loadDatabases(activeConnectionId)}
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
