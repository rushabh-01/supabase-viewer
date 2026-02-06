import dagre from "dagre";
import type { Node, Edge } from "@xyflow/react";

export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: "TB" | "LR" = "TB",
  nodeWidth = 280,
  nodeHeight = 200
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, ranksep: 80, nodesep: 60 });

  nodes.forEach((node) => {
    const h = node.data?.columnCount
      ? 60 + (node.data.columnCount as number) * 28
      : nodeHeight;
    g.setNode(node.id, { width: nodeWidth, height: h });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const n = g.node(node.id);
    return {
      ...node,
      position: { x: n.x - nodeWidth / 2, y: n.y - (n.height || nodeHeight) / 2 },
    };
  });

  return { nodes: layoutedNodes, edges };
}
