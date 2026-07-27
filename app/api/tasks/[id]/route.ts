import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { addXp } from "@/lib/character";

const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  topic: z.string().trim().min(1).max(200).nullish(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "DONE"]).optional(),
  xp: z.number().int().min(0).max(1000).optional(),
});

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/tasks/[id]">) {
  const { id } = await ctx.params;
  const parsed = updateTaskSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  const existing = await prisma.task.findUnique({ where: { id } });

  if (!existing) {
    return Response.json({ error: "Tarefa não encontrada" }, { status: 404 });
  }

  const nextStatus = parsed.data.status ?? existing.status;
  const wasDone = existing.status === "DONE";
  const isDone = nextStatus === "DONE";

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...parsed.data,
      completedAt: isDone ? (existing.completedAt ?? new Date()) : null,
    },
  });

  if (!wasDone && isDone) {
    await addXp(task.xp);
  } else if (wasDone && !isDone) {
    await addXp(-existing.xp);
  }

  return Response.json(task);
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/tasks/[id]">) {
  const { id } = await ctx.params;
  const existing = await prisma.task.findUnique({ where: { id } });

  if (!existing) {
    return Response.json({ error: "Tarefa não encontrada" }, { status: 404 });
  }

  await prisma.task.delete({ where: { id } });

  if (existing.status === "DONE") {
    await addXp(-existing.xp);
  }

  return new Response(null, { status: 204 });
}
