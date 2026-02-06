import { useState } from "react";
import { Key, Link2, ChevronDown, ChevronRight } from "lucide-react";
import type { SchemaData, TableInfo } from "@/lib/schema-types";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SpreadsheetViewProps {
  schema: SchemaData;
  searchQuery: string;
  onTableClick: (table: TableInfo) => void;
}

export function SpreadsheetView({ schema, searchQuery, onTableClick }: SpreadsheetViewProps) {
  const [expandedTables, setExpandedTables] = useState<Set<string>>(
    new Set(schema.tables.map(t => t.name))
  );

  const tables = schema.tables.filter(t =>
    !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.columns.some(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggle = (name: string) => {
    setExpandedTables(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <ScrollArea className="h-full w-full">
      <div className="p-6 space-y-4 max-w-[1200px] mx-auto">
        {tables.map(table => {
          const expanded = expandedTables.has(table.name);
          return (
            <div key={table.name} className="rounded-lg border border-border/60 bg-card overflow-hidden">
              {/* Table header */}
              <div
                className="flex items-center gap-3 px-4 py-3 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors"
                onClick={() => toggle(table.name)}
              >
                {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                <h3 className="font-semibold text-sm text-foreground">{table.name}</h3>
                <span className="text-[10px] text-muted-foreground ml-1">{table.columns.length} columns</span>
                <button
                  className="ml-auto text-xs text-primary hover:underline"
                  onClick={(e) => { e.stopPropagation(); onTableClick(table); }}
                >
                  View Details
                </button>
              </div>

              {expanded && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/40 bg-secondary/20">
                        <th className="text-left px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-8">#</th>
                        <th className="text-left px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Column</th>
                        <th className="text-left px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                        <th className="text-center px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Nullable</th>
                        <th className="text-center px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Key</th>
                        <th className="text-left px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Default</th>
                        <th className="text-left px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">References</th>
                      </tr>
                    </thead>
                    <tbody>
                      {table.columns.map((col, i) => (
                        <tr
                          key={col.name}
                          className={`border-b border-border/20 hover:bg-secondary/30 transition-colors ${
                            i % 2 === 0 ? "bg-secondary/5" : ""
                          }`}
                        >
                          <td className="px-4 py-2 text-[10px] text-muted-foreground/50 font-mono">{i + 1}</td>
                          <td className="px-4 py-2 font-medium text-foreground flex items-center gap-2">
                            {col.isPrimaryKey && <Key className="h-3 w-3 text-warning shrink-0" />}
                            {col.isForeignKey && !col.isPrimaryKey && <Link2 className="h-3 w-3 text-info shrink-0" />}
                            {col.name}
                          </td>
                          <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{col.dataType}</td>
                          <td className="px-4 py-2 text-center">
                            {col.isNullable
                              ? <span className="text-success text-xs">Yes</span>
                              : <span className="text-destructive/60 text-xs">No</span>}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {col.isPrimaryKey && <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-warning/20 text-warning">PK</span>}
                            {col.isForeignKey && !col.isPrimaryKey && <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-info/20 text-info">FK</span>}
                            {col.isUnique && !col.isPrimaryKey && <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-accent/20 text-accent ml-1">UQ</span>}
                          </td>
                          <td className="px-4 py-2 font-mono text-[10px] text-muted-foreground max-w-[150px] truncate">
                            {col.defaultValue || "—"}
                          </td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">
                            {col.references ? `${col.references.table}.${col.references.column}` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
