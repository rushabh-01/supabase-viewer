import { useState } from "react";
import { ChevronRight, ChevronDown, Key, Link2, Search, Table2, Database, Hash } from "lucide-react";
import type { SchemaData, TableInfo, ColumnInfo } from "@/lib/schema-types";
import { Input } from "@/components/ui/input";

interface ExplorerViewProps {
  schema: SchemaData;
  searchQuery: string;
  onTableClick: (table: TableInfo) => void;
}

export function ExplorerView({ schema, searchQuery, onTableClick }: ExplorerViewProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const query = localSearch.toLowerCase();
  const tables = schema.tables.filter(t =>
    !query || t.name.toLowerCase().includes(query) ||
    t.columns.some(c => c.name.toLowerCase().includes(query))
  );

  const toggle = (name: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const getRelationships = (tableName: string) =>
    schema.foreignKeys.filter(fk => fk.sourceTable === tableName || fk.targetTable === tableName);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border/40 shrink-0">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter tables and columns..."
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            className="pl-9 h-8 text-sm bg-secondary/30 border-border/30"
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">{tables.length} tables found</p>
      </div>
      <div className="flex-1 overflow-auto min-h-0">
        <div className="p-4 space-y-1">
          {tables.map(table => {
            const isExpanded = expanded.has(table.name);
            const rels = getRelationships(table.name);
            return (
              <div key={table.name}>
                <button
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm hover:bg-secondary/30 transition-colors group"
                  onClick={() => toggle(table.name)}
                >
                  {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                  <Table2 className="h-4 w-4 text-primary" />
                  <span className="font-medium text-foreground">{table.name}</span>
                  <span className="text-[10px] text-muted-foreground ml-1">({table.columns.length})</span>
                  {rels.length > 0 && <span className="text-[10px] text-info ml-auto">{rels.length} rel</span>}
                  <span
                    className="text-[10px] text-primary opacity-0 group-hover:opacity-100 ml-2 hover:underline"
                    onClick={(e) => { e.stopPropagation(); onTableClick(table); }}
                  >
                    details
                  </span>
                </button>

                {isExpanded && (
                  <div className="ml-8 border-l border-border/30 pl-3 py-1 space-y-0.5">
                    {table.columns.map(col => (
                      <div key={col.name} className="flex items-center gap-2 px-2 py-1 text-xs rounded hover:bg-secondary/20">
                        {col.isPrimaryKey && <Key className="h-3 w-3 text-warning shrink-0" />}
                        {col.isForeignKey && !col.isPrimaryKey && <Link2 className="h-3 w-3 text-info shrink-0" />}
                        {!col.isPrimaryKey && !col.isForeignKey && <span className="w-3 shrink-0 text-muted-foreground/30">─</span>}
                        <span className={col.isPrimaryKey ? "text-warning" : col.isForeignKey ? "text-info" : "text-foreground/80"}>
                          {col.name}
                        </span>
                        <span className="ml-auto font-mono text-[10px] text-muted-foreground">{col.dataType}</span>
                        {col.isNullable && <span className="text-muted-foreground/40 text-[10px]">null</span>}
                      </div>
                    ))}
                    {rels.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/20">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase mb-1">Relationships</p>
                        {rels.map(fk => (
                          <div key={fk.constraintName} className="text-[10px] text-info/80 px-2 py-0.5">
                            {fk.sourceTable === table.name
                              ? `${fk.sourceColumn} → ${fk.targetTable}.${fk.targetColumn}`
                              : `${fk.sourceTable}.${fk.sourceColumn} → ${fk.targetColumn}`}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
