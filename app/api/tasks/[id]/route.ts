import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { readJson } from "@/lib/http";
import { denyWithoutSession } from "@/lib/session";
import { recordXp, revokeXp } from "@/lib/xp-ledger";

const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  topicId: z.string().trim().min(1).nullish(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "DONE"]).optional(),
  xp: z.number().int().min(0).max(1000).optional(),
});

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/tasks/[id]">) {
  const denied = await denyWithoutSession();
  if (denied) return denied;

  const { id } = await ctx.params;
  const body = await readJson(request, updateTaskSchema);
  if (!body.ok) return body.response;

  const existing = await prisma.task.findUnique({ where: { id } });

  if (!existing) {
    return Response.json({ error: "Tarefa não encontrada" }, { status: 404 });
  }

  const wasDone = existing.status === "DONE";
  const nextStatus = body.data.status ?? existing.status;
  const isDone = nextStatus === "DONE";

  // Mutação e XP na mesma transação: a tarefa nunca fica concluída sem o evento
  // correspondente, nem o contrário.
  const task = await prisma.$transaction(async (tx) => {
    // Compare-and-swap: o `where` exige o status que acabamos de ler, então de
    // dois PATCH concorrentes (duplo clique no checkbox) só um encontra a linha
    // para atualizar. O segundo vê `count: 0` e não concede XP de novo.
    const claimed = await tx.task.updateMany({
      where: { id, status: existing.status },
      data: {
        ...body.data,
        status: nextStatus,
        completedAt: isDone ? (existing.completedAt ?? new Date()) : null,
      },
    });

    const updated = await tx.task.findUniqueOrThrow({ where: { id } });

    if (claimed.count === 0) return updated;

    if (!wasDone && isDone) {
      await recordXp(
        {
          source: "TASK",
          amount: updated.xp,
          description: `Tarefa concluída: ${updated.title}`,
          subjectId: updated.subjectId,
          taskId: updated.id,
        },
        tx,
      );
    } else if (wasDone && !isDone) {
      await revokeXp({ taskId: updated.id }, tx);
    }

    return updated;
  });

  return Response.json(task);
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/tasks/[id]">) {
  const denied = await denyWithoutSession();
  if (denied) return denied;

  const { id } = await ctx.params;
  const existing = await prisma.task.findUnique({ where: { id } });

  if (!existing) {
    return Response.json({ error: "Tarefa não encontrada" }, { status: 404 });
  }

  // Os eventos de XP da tarefa saem junto via ON DELETE CASCADE.
  await prisma.task.delete({ where: { id } });

  return new Response(null, { status: 204 });
}
