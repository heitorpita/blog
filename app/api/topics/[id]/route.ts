import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { recordXp, revokeXp } from "@/lib/xp-ledger";
import { TOPIC_COMPLETION_XP } from "@/lib/xp";

const updateTopicSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  completed: z.boolean().optional(),
  order: z.number().int().min(0).max(1000).optional(),
});

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/topics/[id]">) {
  const { id } = await ctx.params;
  const parsed = updateTopicSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  const existing = await prisma.topic.findUnique({ where: { id } });

  if (!existing) {
    return Response.json({ error: "Tópico não encontrado" }, { status: 404 });
  }

  const nextCompleted = parsed.data.completed ?? existing.completed;

  const topic = await prisma.topic.update({
    where: { id },
    data: {
      ...parsed.data,
      completedAt: nextCompleted ? (existing.completedAt ?? new Date()) : null,
    },
  });

  if (!existing.completed && nextCompleted) {
    await recordXp({
      source: "TOPIC",
      amount: TOPIC_COMPLETION_XP,
      description: `Tópico estudado: ${topic.title}`,
      subjectId: topic.subjectId,
      topicId: topic.id,
    });
  } else if (existing.completed && !nextCompleted) {
    await revokeXp({ topicId: topic.id });
  }

  return Response.json(topic);
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/topics/[id]">) {
  const { id } = await ctx.params;

  if (!(await prisma.topic.findUnique({ where: { id }, select: { id: true } }))) {
    return Response.json({ error: "Tópico não encontrado" }, { status: 404 });
  }

  // O evento de XP do tópico sai em cascata; tarefas ligadas ficam sem tópico (SetNull).
  await prisma.topic.delete({ where: { id } });

  return new Response(null, { status: 204 });
}
