import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { recordXp } from "@/lib/character";

const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  subjectId: z.string().trim().min(1),
  topicId: z.string().trim().min(1).nullish(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  status: z.enum(["PENDING", "IN_PROGRESS", "DONE"]).default("PENDING"),
  xp: z.number().int().min(0).max(1000).default(10),
});

export async function GET(request: NextRequest) {
  const subjectId = request.nextUrl.searchParams.get("subjectId");

  const tasks = await prisma.task.findMany({
    where: subjectId ? { subjectId } : undefined,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return Response.json(tasks);
}

export async function POST(request: NextRequest) {
  const parsed = createTaskSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { status, xp, ...rest } = parsed.data;
  const completed = status === "DONE";

  const task = await prisma.task.create({
    data: {
      ...rest,
      status,
      xp,
      completedAt: completed ? new Date() : null,
    },
  });

  if (completed) {
    await recordXp({
      source: "TASK",
      amount: xp,
      description: `Tarefa concluída: ${task.title}`,
      subjectId: task.subjectId,
      taskId: task.id,
    });
  }

  return Response.json(task, { status: 201 });
}
