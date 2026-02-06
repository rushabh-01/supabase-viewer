import { memo, type FC } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Lock, Link2, Minus } from "lucide-react";
import type { ColumnInfo } from "@/lib/schema-types";

interface UMLNodeData {
  label: string;
  columns: ColumnInfo[];
  columnCount: number;
  highlighted?: boolean;
}

const UMLClassNode: FC<NodeProps> = memo(({ data }) => {
  const { label, columns, highlighted } = data as unknown as UMLNodeData;
  const cols = columns as ColumnInfo[];
  const pks = cols.filter(c => c.isPrimaryKey);
  const fks = cols.filter(c => c.isForeignKey && !c.isPrimaryKey);
  const attrs = cols.filter(c => !c.isPrimaryKey && !c.isForeignKey);

  return (
    <div
      className={`rounded-lg border bg-card min-w-[280px] max-w-[320px] transition-all duration-200 font-mono text-xs shadow-xl ${
        highlighted ? "border-primary glow" : "border-border/50"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-primary !w-3 !h-3 !border-2 !border-background" />

      {/* Stereotype & Name */}
      <div className="px-4 py-3 border-b border-border/30 bg-primary/8 rounded-t-lg text-center">
        <span className="text-[10px] text-muted-foreground/60 italic">«table»</span>
        <h3 className="font-bold text-sm text-foreground mt-0.5">{label as string}</h3>
      </div>

      {/* PK compartment */}
      {pks.length > 0 && (
        <div className="border-b border-border/20 px-3 py-2 bg-warning/5">
          <div className="text-[9px] text-muted-foreground/40 uppercase tracking-wider mb-1">Primary Keys</div>
          {pks.map(col => (
            <div key={col.name} className="flex items-center gap-2 py-0.5 text-warning">
              <Lock className="h-3 w-3 shrink-0" />
              <span className="underline decoration-warning/30 font-semibold">{col.name}</span>
              <span className="ml-auto text-muted-foreground/50">{col.dataType}</span>
            </div>
          ))}
        </div>
      )}

      {/* FK compartment */}
      {fks.length > 0 && (
        <div className="border-b border-border/20 px-3 py-2 bg-info/5">
          <div className="text-[9px] text-muted-foreground/40 uppercase tracking-wider mb-1">Foreign Keys</div>
          {fks.map(col => (
            <div key={col.name} className="flex items-center gap-2 py-0.5 text-info">
              <Link2 className="h-3 w-3 shrink-0" />
              <span>{col.name}</span>
              <span className="ml-auto text-muted-foreground/50">{col.dataType}</span>
            </div>
          ))}
        </div>
      )}

      {/* Attributes */}
      {attrs.length > 0 && (
        <div className="px-3 py-2 max-h-[200px] overflow-y-auto">
          <div className="text-[9px] text-muted-foreground/40 uppercase tracking-wider mb-1">Attributes</div>
          {attrs.map(col => (
            <div key={col.name} className="flex items-center gap-2 py-0.5 text-foreground/70">
              <Minus className="h-3 w-3 shrink-0 text-muted-foreground/30" />
              <span>{col.name}</span>
              <span className="ml-auto text-muted-foreground/50">{col.dataType}</span>
              {col.isNullable && <span className="text-muted-foreground/30 text-[9px]">[0..1]</span>}
            </div>
          ))}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-3 !h-3 !border-2 !border-background" />
    </div>
  );
});

UMLClassNode.displayName = "UMLClassNode";

export default UMLClassNode;
