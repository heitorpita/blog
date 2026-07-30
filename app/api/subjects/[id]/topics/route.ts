import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { readJson } from "@/lib/http";
import { denyWithoutSession } from "@/lib/session";

const createTopicSchema = z.object({
  title: z.string().trim().min(1).max(200),
});

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/subjects/[id]/topics">) {
  const denied = await denyWithoutSession();
  if (denied) return denied;

  const { id } = await ctx.params;

  const topics = await prisma.topic.findMany({
    where: { subjectId: id },
    orderBy: { order: "asc" },
  });

  return Response.json(topics);
}

export async function POST(request: NextRequest, ctx: RouteContext<"/api/subjects/[id]/topics">) {
  const denied = await denyWithoutSession();
  if (denied) return denied;

  const { id } = await ctx.params;
  const body = await readJson(request, createTopicSchema);
  if (!body.ok) return body.response;

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
      title: body.data.title,
      subjectId: id,
      order: last ? last.order + 1 : 0,
    },
  });

  return Response.json(topic, { status: 201 });
}
