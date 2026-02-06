import { memo, type FC } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Key, Link2, ArrowUpRight, Eye, Columns3 } from "lucide-react";
import type { ColumnInfo } from "@/lib/schema-types";

interface DrillNodeData {
  label: string;
  columns: ColumnInfo[];
  columnCount: number;
  highlighted?: boolean;
  isCenter?: boolean;
}

const DrillNode: FC<NodeProps> = memo(({ data }) => {
  const { label, columns, highlighted, isCenter } = data as unknown as DrillNodeData;
  const cols = columns as ColumnInfo[];
  const pks = cols.filter(c => c.isPrimaryKey);
  const fks = cols.filter(c => c.isForeignKey);
  const regular = cols.filter(c => !c.isPrimaryKey && !c.isForeignKey);

  // Radial layout: center node is large, others are compact
  if (isCenter) {
    return (
      <div className="rounded-xl border-2 border-primary bg-card shadow-xl shadow-primary/20 min-w-[280px] max-w-[320px]">
        <Handle type="target" position={Position.Top} className="!bg-primary !w-3 !h-3 !border-2 !border-background" />
        <Handle type="target" position={Position.Left} className="!bg-primary !w-3 !h-3 !border-2 !border-background" />

        <div className="px-4 py-3 bg-primary/10 rounded-t-xl border-b border-primary/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground text-sm font-bold">
              {(label as string).charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">{label as string}</h3>
              <p className="text-[10px] text-muted-foreground">{cols.length} columns · Focus table</p>
            </div>
          </div>
        </div>

        <div className="p-3 space-y-2 max-h-[250px] overflow-auto custom-scrollbar">
          {pks.length > 0 && (
            <div className="space-y-0.5">
              {pks.map(col => (
                <div key={col.name} className="flex items-center gap-2 text-[11px] py-0.5">
                  <Key className="h-3 w-3 text-warning shrink-0" />
                  <span className="font-semibold text-warning">{col.name}</span>
                  <span className="ml-auto font-mono text-[9px] text-muted-foreground">{col.dataType}</span>
                </div>
              ))}
            </div>
          )}
          {fks.length > 0 && (
            <div className="space-y-0.5 pt-1 border-t border-border/20">
              {fks.map(col => (
                <div key={col.name} className="flex items-center gap-2 text-[11px] py-0.5">
                  <Link2 className="h-3 w-3 text-info shrink-0" />
                  <span className="text-info">{col.name}</span>
                  {col.references && (
                    <span className="text-[9px] text-info/50">→ {col.references.table}</span>
                  )}
                  <span className="ml-auto font-mono text-[9px] text-muted-foreground">{col.dataType}</span>
                </div>
              ))}
            </div>
          )}
          {regular.length > 0 && (
            <div className="space-y-0.5 pt-1 border-t border-border/20">
              {regular.slice(0, 6).map(col => (
                <div key={col.name} className="flex items-center gap-2 text-[10px] py-0.5">
                  <span className="w-3 text-center text-muted-foreground/30">·</span>
                  <span className="text-foreground/60">{col.name}</span>
                  <span className="ml-auto font-mono text-[9px] text-muted-foreground/40">{col.dataType}</span>
                </div>
              ))}
              {regular.length > 6 && (
                <p className="text-[9px] text-muted-foreground/40 pl-5">+{regular.length - 6} more</p>
              )}
            </div>
          )}
        </div>

        <Handle type="source" position={Position.Bottom} className="!bg-primary !w-3 !h-3 !border-2 !border-background" />
        <Handle type="source" position={Position.Right} className="!bg-primary !w-3 !h-3 !border-2 !border-background" />
      </div>
    );
  }

  // Satellite nodes — compact card design
  return (
    <div
      className={`rounded-xl border min-w-[180px] max-w-[220px] transition-all duration-200 ${
        highlighted
          ? "border-info/60 bg-info/5 shadow-lg shadow-info/10"
          : "border-border/40 bg-card shadow-sm hover:border-border/60"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-info !w-2 !h-2 !border-2 !border-background" />
      <Handle type="target" position={Position.Left} className="!bg-info !w-2 !h-2 !border-2 !border-background" />

      <div className={`px-3 py-2.5 rounded-t-xl flex items-center gap-2 ${
        highlighted ? "bg-info/10" : "bg-secondary/20"
      }`}>
        <div className={`flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold ${
          highlighted ? "bg-info/20 text-info" : "bg-secondary/50 text-muted-foreground"
        }`}>
          {(label as string).charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[11px] text-foreground truncate">{label as string}</h3>
          <p className="text-[9px] text-muted-foreground">{cols.length} cols</p>
        </div>
      </div>

      <div className="px-3 py-2 space-y-1">
        {pks.length > 0 && (
          <div className="flex items-center gap-1.5 text-[10px]">
            <Key className="h-2.5 w-2.5 text-warning" />
            <span className="text-warning/80 truncate">{pks.map(p => p.name).join(", ")}</span>
          </div>
        )}
        {fks.length > 0 && (
          <div className="flex items-center gap-1.5 text-[10px]">
            <Link2 className="h-2.5 w-2.5 text-info" />
            <span className="text-info/80">{fks.length} FK{fks.length > 1 ? "s" : ""}</span>
          </div>
        )}
        <div className="flex flex-wrap gap-1 mt-1">
          {cols.slice(0, 3).map(col => (
            <span key={col.name} className="text-[8px] px-1.5 py-0.5 rounded bg-secondary/40 text-muted-foreground/70">
              {col.name}
            </span>
          ))}
          {cols.length > 3 && (
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-secondary/20 text-muted-foreground/40">
              +{cols.length - 3}
            </span>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-info !w-2 !h-2 !border-2 !border-background" />
      <Handle type="source" position={Position.Right} className="!bg-info !w-2 !h-2 !border-2 !border-background" />
    </div>
  );
});

DrillNode.displayName = "DrillNode";

export default DrillNode;
