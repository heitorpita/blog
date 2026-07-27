import { prisma } from "@/lib/db";
import { linkKey } from "@/lib/wikilinks";
import type { GraphData, GraphEdge, GraphNode } from "@/lib/graph-types";

export type { GraphData, GraphEdge, GraphNode, GraphNodeType } from "@/lib/graph-types";
export { NODE_TYPE_LABEL } from "@/lib/graph-types";

const DAY_MS = 24 * 60 * 60 * 1000;

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function buildGraph(): Promise<GraphData> {
  const since = new Date(Date.now() - DAY_MS);

  const [subjects, sessions, posts] = await Promise.all([
    prisma.subject.findMany({
      orderBy: { name: "asc" },
      include: {
        topics: { orderBy: { order: "asc" } },
        tasks: { orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.studySession.findMany({
      orderBy: { endedAt: "desc" },
      select: { subjectId: true, endedAt: true, durationMinutes: true },
    }),
    prisma.journalPost.findMany({
      orderBy: { publishedAt: "desc" },
      include: { links: { select: { target: true } } },
    }),
  ]);

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Índice para resolver `[[Alvo]]` contra matérias, tópicos e posts.
  const byTitle = new Map<string, string>();
  const remember = (title: string, nodeId: string) => {
    const key = linkKey(title);
    if (!byTitle.has(key)) byTitle.set(key, nodeId);
  };

  for (const subject of subjects) {
    const subjectNodeId = `subject:${subject.id}`;

    nodes.push({
      id: subjectNodeId,
      type: "SUBJECT",
      label: subject.name,
      color: subject.color,
      degree: 0,
      recent: false,
      subjectId: subject.id,
      href: `/subjects/${subject.id}`,
      detail: `${subject.code} · ${subject.teacher}`,
    });
    remember(subject.name, subjectNodeId);
    remember(subject.code, subjectNodeId);

    for (const topic of subject.topics) {
      const topicNodeId = `topic:${topic.id}`;

      nodes.push({
        id: topicNodeId,
        type: "TOPIC",
        label: topic.title,
        color: subject.color,
        degree: 0,
        recent: topic.completedAt !== null && topic.completedAt >= since,
        subjectId: subject.id,
        href: `/subjects/${subject.id}`,
        detail: topic.completed ? "Estudado" : "Ainda não estudado",
      });
      edges.push({ source: subjectNodeId, target: topicNodeId, kind: "STRUCTURE" });
      remember(topic.title, topicNodeId);
    }

    for (const task of subject.tasks) {
      const taskNodeId = `task:${task.id}`;

      nodes.push({
        id: taskNodeId,
        type: "TASK",
        label: task.title,
        color: subject.color,
        degree: 0,
        recent: task.updatedAt >= since,
        subjectId: subject.id,
        href: `/subjects/${subject.id}`,
        detail: `${task.status === "DONE" ? "Concluída" : task.status === "IN_PROGRESS" ? "Em progresso" : "Pendente"} · ${task.xp} XP`,
      });

      // Pendura a tarefa no tópico quando existir, senão direto na matéria.
      edges.push({
        source: task.topicId ? `topic:${task.topicId}` : subjectNodeId,
        target: taskNodeId,
        kind: "STRUCTURE",
      });
    }
  }

  // Sessões viram um nó por matéria + dia, para um semestre de pomodoros não
  // virar centenas de nós soltos afogando a estrutura.
  const studyBuckets = new Map<string, { subjectId: string; day: string; minutes: number; last: Date }>();

  for (const session of sessions) {
    const day = dayKey(session.endedAt);
    const key = `${session.subjectId}:${day}`;
    const bucket = studyBuckets.get(key);

    if (bucket) {
      bucket.minutes += session.durationMinutes;
      if (session.endedAt > bucket.last) bucket.last = session.endedAt;
    } else {
      studyBuckets.set(key, {
        subjectId: session.subjectId,
        day,
        minutes: session.durationMinutes,
        last: session.endedAt,
      });
    }
  }

  for (const [key, bucket] of studyBuckets) {
    const studyNodeId = `study:${key}`;

    nodes.push({
      id: studyNodeId,
      type: "STUDY",
      label: new Date(`${bucket.day}T12:00:00`).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
      }),
      color: subjects.find((s) => s.id === bucket.subjectId)?.color ?? "#7c9dff",
      degree: 0,
      recent: bucket.last >= since,
      subjectId: bucket.subjectId,
      href: "/timer",
      detail: `${bucket.minutes} min estudados`,
    });
    edges.push({
      source: `subject:${bucket.subjectId}`,
      target: studyNodeId,
      kind: "STRUCTURE",
    });
  }

  for (const post of posts) {
    const postNodeId = `post:${post.id}`;

    nodes.push({
      id: postNodeId,
      type: "POST",
      label: post.title,
      color: subjects.find((s) => s.id === post.subjectId)?.color ?? "#c9c6d8",
      degree: 0,
      recent: post.updatedAt >= since,
      subjectId: post.subjectId,
      href: `/journal/${post.slug}`,
      detail: post.excerpt?.slice(0, 90) ?? "Post da jornada",
    });
    remember(post.title, postNodeId);

    if (post.subjectId) {
      edges.push({
        source: `subject:${post.subjectId}`,
        target: postNodeId,
        kind: "STRUCTURE",
      });
    }
  }

  // Backlinks só podem ser resolvidos depois que todos os títulos estão indexados.
  const unresolved = new Map<string, string>();

  for (const post of posts) {
    for (const { target } of post.links) {
      const key = linkKey(target);
      const resolved = byTitle.get(key);

      if (resolved) {
        edges.push({ source: `post:${post.id}`, target: resolved, kind: "WIKI" });
        continue;
      }

      const missingId = `missing:${key}`;
      if (!unresolved.has(missingId)) {
        unresolved.set(missingId, target);
        nodes.push({
          id: missingId,
          type: "UNRESOLVED",
          label: target,
          color: "#5c5870",
          degree: 0,
          recent: false,
          subjectId: null,
          href: "/journal/new",
          detail: "Mencionado mas ainda não existe",
        });
      }

      edges.push({ source: `post:${post.id}`, target: missingId, kind: "WIKI" });
    }
  }

  // Descarta arestas órfãs antes de contar grau, senão a força do grafo quebra.
  const known = new Set(nodes.map((node) => node.id));
  const validEdges = edges.filter((edge) => known.has(edge.source) && known.has(edge.target));

  const degrees = new Map<string, number>();
  for (const edge of validEdges) {
    degrees.set(edge.source, (degrees.get(edge.source) ?? 0) + 1);
    degrees.set(edge.target, (degrees.get(edge.target) ?? 0) + 1);
  }
  for (const node of nodes) {
    node.degree = degrees.get(node.id) ?? 0;
  }

  return {
    nodes,
    edges: validEdges,
    subjects: subjects.map(({ id, name, color }) => ({ id, name, color })),
  };
}
