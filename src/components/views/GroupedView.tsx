import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Key, Link2, Table2 } from "lucide-react";
import type { SchemaData, TableInfo } from "@/lib/schema-types";
import { ScrollArea } from "@/components/ui/scroll-area";

interface GroupedViewProps {
  schema: SchemaData;
  searchQuery: string;
  onTableClick: (table: TableInfo) => void;
}

export function GroupedView({ schema, searchQuery, onTableClick }: GroupedViewProps) {
  const groups = useMemo(() => {
    // Auto-cluster tables by FK relationships using union-find
    const parent: Record<string, string> = {};
    const find = (x: string): string => {
      if (!parent[x]) parent[x] = x;
      return parent[x] === x ? x : (parent[x] = find(parent[x]));
    };
    const union = (a: string, b: string) => { parent[find(a)] = find(b); };

    schema.tables.forEach(t => { parent[t.name] = t.name; });
    schema.foreignKeys.forEach(fk => union(fk.sourceTable, fk.targetTable));

    const clusters: Record<string, TableInfo[]> = {};
    schema.tables.forEach(t => {
      const root = find(t.name);
      if (!clusters[root]) clusters[root] = [];
      clusters[root].push(t);
    });

    // Name each cluster by its largest table or root
    return Object.entries(clusters)
      .map(([root, tables]) => ({
        name: tables.length > 1
          ? `${root} group (${tables.length} tables)`
          : root,
        tables,
      }))
      .sort((a, b) => b.tables.length - a.tables.length);
  }, [schema]);

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(groups.map(g => g.name))
  );

  const toggleGroup = (name: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const filteredGroups = groups.map(g => ({
    ...g,
    tables: g.tables.filter(t =>
      !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.columns.some(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    ),
  })).filter(g => g.tables.length > 0);

  return (
    <ScrollArea className="h-full w-full">
      <div className="p-6 space-y-4 max-w-[1000px] mx-auto">
        {filteredGroups.map(group => (
          <div key={group.name} className="rounded-lg border border-border/50 overflow-hidden">
            <button
              className="flex items-center gap-3 w-full px-4 py-3 bg-secondary/20 hover:bg-secondary/30 transition-colors"
              onClick={() => toggleGroup(group.name)}
            >
              {expandedGroups.has(group.name) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span className="font-semibold text-sm text-foreground">{group.name}</span>
              <span className="ml-auto text-[10px] text-muted-foreground">{group.tables.length} table{group.tables.length > 1 ? "s" : ""}</span>
            </button>

            {expandedGroups.has(group.name) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                {group.tables.map(table => (
                  <button
                    key={table.name}
                    className="text-left rounded-lg border border-border/40 bg-card p-3 hover:border-primary/40 hover:bg-primary/5 transition-all group"
                    onClick={() => onTableClick(table)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Table2 className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm text-foreground">{table.name}</span>
                    </div>
                    <div className="space-y-0.5">
                      {table.columns.slice(0, 5).map(col => (
                        <div key={col.name} className="flex items-center gap-1.5 text-[10px]">
                          {col.isPrimaryKey && <Key className="h-2.5 w-2.5 text-warning" />}
                          {col.isForeignKey && !col.isPrimaryKey && <Link2 className="h-2.5 w-2.5 text-info" />}
                          {!col.isPrimaryKey && !col.isForeignKey && <span className="w-2.5" />}
                          <span className="text-muted-foreground">{col.name}</span>
                          <span className="ml-auto font-mono text-muted-foreground/60">{col.dataType}</span>
                        </div>
                      ))}
                      {table.columns.length > 5 && (
                        <p className="text-[10px] text-muted-foreground/50 pl-4">+{table.columns.length - 5} more</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
