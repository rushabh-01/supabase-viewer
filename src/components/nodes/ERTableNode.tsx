import { memo, type FC } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Key, Link2, Hash } from "lucide-react";
import type { ColumnInfo } from "@/lib/schema-types";

interface ERNodeData {
  label: string;
  columns: ColumnInfo[];
  columnCount: number;
  highlighted?: boolean;
}

const ERTableNode: FC<NodeProps> = memo(({ data }) => {
  const { label, columns, highlighted } = data as unknown as ERNodeData;
  const cols = columns as ColumnInfo[];

  return (
    <div
      className={`rounded-lg border bg-card shadow-xl min-w-[260px] max-w-[300px] transition-all duration-200 ${
        highlighted ? "border-primary glow" : "border-border/50"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-primary !w-3 !h-3 !border-2 !border-background" />

      {/* Header */}
      <div className="px-4 py-2.5 border-b border-border/30 bg-primary/8 rounded-t-lg flex items-center gap-2">
        <Hash className="h-3.5 w-3.5 text-primary/60" />
        <h3 className="font-bold text-sm text-foreground tracking-wide">{label as string}</h3>
        <span className="ml-auto text-[9px] text-muted-foreground/60 bg-secondary/50 px-1.5 py-0.5 rounded">{cols.length}</span>
      </div>

      {/* Columns */}
      <div className="divide-y divide-border/10 max-h-[300px] overflow-y-auto">
        {cols.map((col) => (
          <div key={col.name} className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-secondary/20 transition-colors group">
            <span className="w-4 flex justify-center shrink-0">
              {col.isPrimaryKey ? <Key className="h-3 w-3 text-warning" /> :
               col.isForeignKey ? <Link2 className="h-3 w-3 text-info" /> :
               <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/20" />}
            </span>
            <span className={`font-medium truncate ${col.isPrimaryKey ? "text-warning" : col.isForeignKey ? "text-info" : "text-foreground/90"}`}>
              {col.name}
            </span>
            <span className="ml-auto text-muted-foreground/50 font-mono text-[10px] shrink-0">{col.dataType}</span>
            {!col.isNullable && <span className="text-destructive/40 text-[8px] shrink-0">NOT NULL</span>}
          </div>
        ))}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-3 !h-3 !border-2 !border-background" />
    </div>
  );
});

ERTableNode.displayName = "ERTableNode";

export default ERTableNode;
