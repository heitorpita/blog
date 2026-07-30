import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { readJson } from "@/lib/http";
import { denyWithoutSession } from "@/lib/session";
import { recordXp, revokeXp } from "@/lib/xp-ledger";
import { TOPIC_COMPLETION_XP } from "@/lib/xp";

const updateTopicSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  completed: z.boolean().optional(),
  order: z.number().int().min(0).max(1000).optional(),
});

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/topics/[id]">) {
  const denied = await denyWithoutSession();
  if (denied) return denied;

  const { id } = await ctx.params;
  const body = await readJson(request, updateTopicSchema);
  if (!body.ok) return body.response;

  const existing = await prisma.topic.findUnique({ where: { id } });

  if (!existing) {
    return Response.json({ error: "Tópico não encontrado" }, { status: 404 });
  }

  const nextCompleted = body.data.completed ?? existing.completed;

  // Mesma transação e mesmo compare-and-swap da rota de tarefas: dois cliques
  // rápidos no checkbox não podem virar dois eventos de XP.
  const topic = await prisma.$transaction(async (tx) => {
    const claimed = await tx.topic.updateMany({
      where: { id, completed: existing.completed },
      data: {
        ...body.data,
        completed: nextCompleted,
        completedAt: nextCompleted ? (existing.completedAt ?? new Date()) : null,
      },
    });

    const updated = await tx.topic.findUniqueOrThrow({ where: { id } });

    if (claimed.count === 0) return updated;

    if (!existing.completed && nextCompleted) {
      await recordXp(
        {
          source: "TOPIC",
          amount: TOPIC_COMPLETION_XP,
          description: `Tópico estudado: ${updated.title}`,
          subjectId: updated.subjectId,
          topicId: updated.id,
        },
        tx,
      );
    } else if (existing.completed && !nextCompleted) {
      await revokeXp({ topicId: updated.id }, tx);
    }

    return updated;
  });

  return Response.json(topic);
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/topics/[id]">) {
  const denied = await denyWithoutSession();
  if (denied) return denied;

  const { id } = await ctx.params;

  if (!(await prisma.topic.findUnique({ where: { id }, select: { id: true } }))) {
    return Response.json({ error: "Tópico não encontrado" }, { status: 404 });
  }

  // O evento de XP do tópico sai em cascata; tarefas ligadas ficam sem tópico (SetNull).
  await prisma.topic.delete({ where: { id } });

  return new Response(null, { status: 204 });
}
