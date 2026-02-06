import { useMemo } from "react";
import { Table2, Key, Link2 } from "lucide-react";
import type { SchemaData, TableInfo } from "@/lib/schema-types";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LayerViewProps {
  schema: SchemaData;
  searchQuery: string;
  onTableClick: (table: TableInfo) => void;
}

type Layer = { name: string; color: string; tables: TableInfo[] };

export function LayerView({ schema, searchQuery, onTableClick }: LayerViewProps) {
  const layers = useMemo<Layer[]>(() => {
    // Classify tables into layers based on FK relationships
    const inDegree: Record<string, number> = {};
    const outDegree: Record<string, number> = {};
    schema.tables.forEach(t => { inDegree[t.name] = 0; outDegree[t.name] = 0; });
    schema.foreignKeys.forEach(fk => {
      outDegree[fk.sourceTable] = (outDegree[fk.sourceTable] || 0) + 1;
      inDegree[fk.targetTable] = (inDegree[fk.targetTable] || 0) + 1;
    });

    const reference: TableInfo[] = []; // Referenced a lot, no outgoing FKs (lookup tables)
    const core: TableInfo[] = [];      // Both in and out FKs (main entities)
    const junction: TableInfo[] = [];  // Many outgoing FKs, few/no incoming (join tables)
    const leaf: TableInfo[] = [];      // No relationships

    schema.tables.forEach(t => {
      const inD = inDegree[t.name] || 0;
      const outD = outDegree[t.name] || 0;
      if (inD === 0 && outD === 0) leaf.push(t);
      else if (outD >= 2 && inD === 0) junction.push(t);
      else if (inD > 0 && outD === 0) reference.push(t);
      else core.push(t);
    });

    return [
      { name: "Reference / Lookup", color: "text-warning", tables: reference },
      { name: "Core Entities", color: "text-primary", tables: core },
      { name: "Junction / Bridge", color: "text-info", tables: junction },
      { name: "Standalone", color: "text-muted-foreground", tables: leaf },
    ].filter(l => l.tables.length > 0);
  }, [schema]);

  const query = searchQuery.toLowerCase();

  return (
    <ScrollArea className="h-full w-full">
      <div className="p-6 max-w-[1000px] mx-auto space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Layer View</h2>
          <p className="text-sm text-muted-foreground">Tables organized by their role in the schema architecture.</p>
        </div>

        {layers.map(layer => {
          const filtered = layer.tables.filter(t =>
            !query || t.name.toLowerCase().includes(query)
          );
          if (filtered.length === 0) return null;
          return (
            <div key={layer.name}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`h-3 w-1 rounded-full ${layer.color.replace("text-", "bg-")}`} />
                <h3 className={`text-sm font-semibold ${layer.color}`}>{layer.name}</h3>
                <span className="text-[10px] text-muted-foreground">({filtered.length})</span>
              </div>
              <div className="rounded-lg border border-border/40 bg-card/50 p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filtered.map(table => (
                    <button
                      key={table.name}
                      className="text-left p-3 rounded-md border border-border/30 hover:border-primary/40 hover:bg-primary/5 transition-all"
                      onClick={() => onTableClick(table)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Table2 className="h-3.5 w-3.5 text-primary" />
                        <span className="font-medium text-xs text-foreground truncate">{table.name}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{table.columns.length} cols</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
