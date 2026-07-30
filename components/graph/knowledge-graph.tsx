"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import clsx from "clsx";
import { buttonClasses } from "@/components/ui/button";
import { NODE_TYPE_LABEL, type GraphData, type GraphEdge, type GraphNode } from "@/lib/graph-types";

type SimNode = GraphNode & { x?: number; y?: number };
type SimEdge = { source: string | SimNode; target: string | SimNode; kind: GraphEdge["kind"] };

// `dynamic()` apaga os genéricos da biblioteca, então as props que usamos são
// declaradas aqui — o cast é a única parte sem checagem, o resto fica tipado.
type ForceGraphProps = {
  width: number;
  height: number;
  graphData: { nodes: SimNode[]; links: SimEdge[] };
  backgroundColor?: string;
  nodeRelSize?: number;
  cooldownTicks?: number;
  linkColor?: (link: SimEdge) => string;
  linkWidth?: (link: SimEdge) => number;
  linkDirectionalParticles?: (link: SimEdge) => number;
  linkDirectionalParticleWidth?: number;
  onEngineStop?: () => void;
  onNodeClick?: (node: SimNode) => void;
  onBackgroundClick?: () => void;
  nodeCanvasObject?: (node: SimNode, ctx: CanvasRenderingContext2D, scale: number) => void;
  nodePointerAreaPaint?: (node: SimNode, color: string, ctx: CanvasRenderingContext2D) => void;
};

type ForceGraphHandle = { zoomToFit: (durationMs?: number, padding?: number) => void };

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
}) as unknown as React.ForwardRefExoticComponent<
  ForceGraphProps & React.RefAttributes<ForceGraphHandle>
>;

const TYPE_STYLE: Record<GraphNode["type"], { shape: "circle" | "square" | "diamond"; base: number }> = {
  SUBJECT: { shape: "circle", base: 7 },
  TOPIC: { shape: "circle", base: 4 },
  TASK: { shape: "square", base: 3.5 },
  STUDY: { shape: "diamond", base: 4 },
  POST: { shape: "square", base: 4.5 },
  UNRESOLVED: { shape: "diamond", base: 3 },
};

function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: "circle" | "square" | "diamond",
  x: number,
  y: number,
  r: number,
) {
  ctx.beginPath();
  if (shape === "circle") {
    ctx.arc(x, y, r, 0, 2 * Math.PI);
  } else if (shape === "square") {
    ctx.rect(x - r, y - r, r * 2, r * 2);
  } else {
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r, y);
    ctx.closePath();
  }
  ctx.fill();
}

export function KnowledgeGraph({ data }: { data: GraphData }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphHandle | null>(null);
  const [size, setSize] = useState({ width: 0, height: 520 });
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<string>("");

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: entry.contentRect.width,
        height: Math.max(420, Math.min(640, entry.contentRect.width * 0.6)),
      });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Filtrar por matéria isola o cluster dela; links não resolvidos ficam sempre
  // visíveis porque não pertencem a matéria nenhuma.
  const graph = useMemo(() => {
    if (!subjectFilter) {
      return { nodes: data.nodes.map((n) => ({ ...n })), links: data.edges.map((e) => ({ ...e })) };
    }

    const nodes = data.nodes.filter((node) => node.subjectId === subjectFilter);
    const visible = new Set(nodes.map((node) => node.id));

    return {
      nodes: nodes.map((n) => ({ ...n })),
      links: data.edges
        .filter((edge) => visible.has(edge.source) && visible.has(edge.target))
        .map((e) => ({ ...e })),
    };
  }, [data, subjectFilter]);

  // Pulso dos nós recentes: um relógio próprio evita depender do tempo do canvas.
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPulse((value) => (value + 1) % 60), 50);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSubjectFilter("")}
          className={clsx(
            "rounded-full border px-3 py-1 text-xs transition-colors",
            subjectFilter === ""
              ? "border-accent text-foreground"
              : "border-border text-muted hover:text-foreground",
          )}
        >
          Tudo
        </button>
        {data.subjects.map((subject) => (
          <button
            key={subject.id}
            type="button"
            onClick={() => setSubjectFilter(subject.id === subjectFilter ? "" : subject.id)}
            className={clsx(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
              subject.id === subjectFilter
                ? "text-foreground"
                : "border-border text-muted hover:text-foreground",
            )}
            style={
              subject.id === subjectFilter ? { borderColor: subject.color } : undefined
            }
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: subject.color }}
            />
            {subject.name}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div
          ref={containerRef}
          className="min-w-0 flex-1 overflow-hidden rounded-lg border border-border bg-surface"
        >
          {size.width > 0 && (
            <ForceGraph2D
              width={size.width}
              height={size.height}
              ref={graphRef}
              graphData={graph}
              backgroundColor="rgba(0,0,0,0)"
              nodeRelSize={1}
              cooldownTicks={120}
              // Sem isso o grafo assenta maior que o canvas e clusters somem nas bordas.
              onEngineStop={() => graphRef.current?.zoomToFit(400, 50)}
              linkColor={(link) =>
                link.kind === "WIKI" ? "rgba(124,157,255,0.55)" : "rgba(255,255,255,0.12)"
              }
              linkWidth={(link) => (link.kind === "WIKI" ? 1.4 : 0.8)}
              linkDirectionalParticles={(link) => (link.kind === "WIKI" ? 2 : 0)}
              linkDirectionalParticleWidth={1.6}
              onNodeClick={(node) => setSelected(node)}
              onBackgroundClick={() => setSelected(null)}
              nodeCanvasObject={(node, ctx, scale) => {
                const style = TYPE_STYLE[node.type];
                const radius = style.base + Math.sqrt(node.degree) * 1.4;
                const x = node.x ?? 0;
                const y = node.y ?? 0;

                if (node.recent) {
                  const wave = (Math.sin((pulse / 60) * Math.PI * 2) + 1) / 2;
                  ctx.globalAlpha = 0.18 + wave * 0.22;
                  ctx.fillStyle = node.color;
                  drawShape(ctx, style.shape, x, y, radius + 4 + wave * 3);
                  ctx.globalAlpha = 1;
                }

                ctx.fillStyle = node.type === "UNRESOLVED" ? "transparent" : node.color;
                drawShape(ctx, style.shape, x, y, radius);

                if (node.type === "UNRESOLVED" || selected?.id === node.id) {
                  ctx.strokeStyle = selected?.id === node.id ? "#ffffff" : node.color;
                  ctx.lineWidth = 1.5 / scale;
                  ctx.stroke();
                }

                // Rótulos só a partir de certo zoom, senão viram uma mancha ilegível.
                if (scale > 1.4 || node.type === "SUBJECT") {
                  ctx.font = `${Math.max(10 / scale, 3)}px Inter, sans-serif`;
                  ctx.textAlign = "center";
                  ctx.textBaseline = "top";
                  ctx.fillStyle = "rgba(233,232,240,0.85)";
                  ctx.fillText(node.label, x, y + radius + 2);
                }
              }}
              nodePointerAreaPaint={(node, color, ctx) => {
                const style = TYPE_STYLE[node.type];
                ctx.fillStyle = color;
                drawShape(ctx, style.shape, node.x ?? 0, node.y ?? 0, style.base + 5);
              }}
            />
          )}
        </div>

        <aside className="lg:w-64 lg:shrink-0">
          {selected ? (
            <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">
                  {NODE_TYPE_LABEL[selected.type]}
                </p>
                <h3 className="mt-1 font-serif text-lg leading-snug text-foreground">
                  {selected.label}
                </h3>
              </div>

              <p className="text-sm text-muted">{selected.detail}</p>

              <p className="text-xs text-muted">
                {selected.degree} {selected.degree === 1 ? "conexão" : "conexões"}
                {selected.recent && " · ativo nas últimas 24h"}
              </p>

              {selected.href && (
                <Link
                  href={selected.href}
                  className={buttonClasses("secondary", "w-full")}
                >
                  {selected.type === "UNRESOLVED" ? "Criar este post" : "Abrir"}
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3 rounded-lg border border-dashed border-border p-4">
              <p className="text-sm text-muted">
                Clique num nó para ver os detalhes. Arraste para reorganizar, role para dar zoom.
              </p>
              <ul className="space-y-1.5 text-xs text-muted">
                {(Object.keys(NODE_TYPE_LABEL) as GraphNode["type"][]).map((type) => (
                  <li key={type} className="flex items-center gap-2">
                    <span
                      className={clsx(
                        "size-2.5 bg-muted",
                        TYPE_STYLE[type].shape === "circle" && "rounded-full",
                        TYPE_STYLE[type].shape === "diamond" && "rotate-45",
                      )}
                    />
                    {NODE_TYPE_LABEL[type]}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted">
                O tamanho do nó cresce com o número de conexões. Nós pulsando tiveram
                atividade nas últimas 24h.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
