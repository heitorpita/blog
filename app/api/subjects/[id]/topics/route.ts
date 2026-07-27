import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const createTopicSchema = z.object({
  title: z.string().trim().min(1).max(200),
});

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/subjects/[id]/topics">) {
  const { id } = await ctx.params;

  const topics = await prisma.topic.findMany({
    where: { subjectId: id },
    orderBy: { order: "asc" },
  });

  return Response.json(topics);
}

export async function POST(request: NextRequest, ctx: RouteContext<"/api/subjects/[id]/topics">) {
  const { id } = await ctx.params;
  const parsed = createTopicSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  if (!(await prisma.subject.findUnique({ where: { id }, select: { id: true } }))) {
    return Response.json({ error: "Matéria não encontrada" }, { status: 404 });
  }

  const last = await prisma.topic.findFirst({
    where: { subjectId: id },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const topic = await prisma.topic.create({
    data: {
      title: parsed.data.title,
      subjectId: id,
      order: last ? last.order + 1 : 0,
    },
  });

  return Response.json(topic, { status: 201 });
}
