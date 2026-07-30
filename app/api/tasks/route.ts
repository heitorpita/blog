import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { readJson } from "@/lib/http";
import { denyWithoutSession } from "@/lib/session";
import { recordXp } from "@/lib/xp-ledger";

const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  subjectId: z.string().trim().min(1),
  topicId: z.string().trim().min(1).nullish(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  status: z.enum(["PENDING", "IN_PROGRESS", "DONE"]).default("PENDING"),
  xp: z.number().int().min(0).max(1000).default(10),
});

export async function GET(request: NextRequest) {
  const denied = await denyWithoutSession();
  if (denied) return denied;

  const subjectId = request.nextUrl.searchParams.get("subjectId");

  const tasks = await prisma.task.findMany({
    where: subjectId ? { subjectId } : undefined,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return Response.json(tasks);
}

export async function POST(request: NextRequest) {
  const denied = await denyWithoutSession();
  if (denied) return denied;

  const body = await readJson(request, createTaskSchema);
  if (!body.ok) return body.response;

  const { status, xp, ...rest } = body.data;
  const completed = status === "DONE";

  // Criar a tarefa já concluída e registrar o XP são um passo só: sem transação,
  // uma falha entre os dois deixaria tarefa concluída sem XP no ledger.
  const task = await prisma.$transaction(async (tx) => {
    const created = await tx.task.create({
      data: {
        ...rest,
        status,
        xp,
        completedAt: completed ? new Date() : null,
      },
    });

    if (completed) {
      await recordXp(
        {
          source: "TASK",
          amount: xp,
          description: `Tarefa concluída: ${created.title}`,
          subjectId: created.subjectId,
          taskId: created.id,
        },
        tx,
      );
    }

    return created;
  });

  return Response.json(task, { status: 201 });
}
