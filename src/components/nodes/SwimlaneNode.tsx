import { memo, type FC } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Key, Link2 } from "lucide-react";
import type { ColumnInfo } from "@/lib/schema-types";

interface SwimlaneNodeData {
  label: string;
  columns: ColumnInfo[];
  columnCount: number;
  highlighted?: boolean;
  laneColor?: string;
}

const SwimlaneNode: FC<NodeProps> = memo(({ data }) => {
  const { label, columns, highlighted, laneColor } = data as unknown as SwimlaneNodeData;

  return (
    <div
      className={`rounded-md border bg-card min-w-[200px] transition-all duration-200 ${
        highlighted ? "border-primary glow" : "border-border/60"
      }`}
      style={{ borderLeftWidth: 3, borderLeftColor: laneColor || "hsl(250, 80%, 68%)" }}
    >
      <Handle type="target" position={Position.Left} className="!bg-primary !w-2.5 !h-2.5 !border-2 !border-background" />

      <div className="px-3 py-2 border-b border-border/30">
        <h3 className="font-semibold text-xs text-foreground">{label as string}</h3>
        <span className="text-[9px] text-muted-foreground">{(columns as ColumnInfo[]).length} cols</span>
      </div>

      <div className="max-h-[120px] overflow-y-auto">
        {(columns as ColumnInfo[]).slice(0, 6).map(col => (
          <div key={col.name} className="flex items-center gap-1.5 px-3 py-0.5 text-[10px]">
            {col.isPrimaryKey && <Key className="h-2.5 w-2.5 text-warning" />}
            {col.isForeignKey && !col.isPrimaryKey && <Link2 className="h-2.5 w-2.5 text-info" />}
            {!col.isPrimaryKey && !col.isForeignKey && <span className="w-2.5" />}
            <span className="text-foreground/80">{col.name}</span>
            <span className="ml-auto font-mono text-muted-foreground/60">{col.dataType}</span>
          </div>
        ))}
        {(columns as ColumnInfo[]).length > 6 && (
          <div className="px-3 py-0.5 text-[9px] text-muted-foreground/50">+{(columns as ColumnInfo[]).length - 6} more</div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-primary !w-2.5 !h-2.5 !border-2 !border-background" />
    </div>
  );
});

SwimlaneNode.displayName = "SwimlaneNode";

export default SwimlaneNode;
