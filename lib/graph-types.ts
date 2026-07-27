// Tipos e rótulos do grafo ficam separados de `lib/graph.ts` de propósito:
// aquele módulo importa o Prisma, e o componente do grafo roda no cliente.
// Importar dele arrastaria o driver `pg` (e o módulo `dns` do Node) para o
// bundle do navegador, quebrando o build.

export type GraphNodeType = "SUBJECT" | "TOPIC" | "TASK" | "STUDY" | "POST" | "UNRESOLVED";

export type GraphNode = {
  id: string;
  type: GraphNodeType;
  label: string;
  color: string;
  /** Grau de conexões — a UI usa para dimensionar o nó. */
  degree: number;
  /** Tocado nas últimas 24h; a UI faz o nó pulsar. */
  recent: boolean;
  subjectId: string | null;
  href: string | null;
  detail: string;
};

export type GraphEdge = {
  source: string;
  target: string;
  /** `WIKI` são backlinks do diário; o resto é a estrutura vinda das FKs. */
  kind: "STRUCTURE" | "WIKI";
};

export type GraphData = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  subjects: { id: string; name: string; color: string }[];
};

export const NODE_TYPE_LABEL: Record<GraphNodeType, string> = {
  SUBJECT: "Matéria",
  TOPIC: "Tópico",
  TASK: "Tarefa",
  STUDY: "Estudo",
  POST: "Post",
  UNRESOLVED: "Link sem destino",
};
