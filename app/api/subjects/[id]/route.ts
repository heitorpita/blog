import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const updateSubjectSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  code: z.string().trim().min(1).max(30).optional(),
  hours: z.number().int().min(0).max(1000).optional(),
  teacher: z.string().trim().max(200).optional(),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Cor deve estar no formato #rrggbb")
    .optional(),
});

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/subjects/[id]">) {
  const { id } = await ctx.params;

  const subject = await prisma.subject.findUnique({
    where: { id },
    include: { topics: { orderBy: { order: "asc" } } },
  });

  if (!subject) {
    return Response.json({ error: "Matéria não encontrada" }, { status: 404 });
  }

  return Response.json(subject);
}

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/subjects/[id]">) {
  const { id } = await ctx.params;
  const parsed = updateSubjectSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  if (!(await prisma.subject.findUnique({ where: { id }, select: { id: true } }))) {
    return Response.json({ error: "Matéria não encontrada" }, { status: 404 });
  }

  const subject = await prisma.subject.update({
    where: { id },
    data: parsed.data,
    include: { topics: { orderBy: { order: "asc" } } },
  });

  return Response.json(subject);
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/subjects/[id]">) {
  const { id } = await ctx.params;

  if (!(await prisma.subject.findUnique({ where: { id }, select: { id: true } }))) {
    return Response.json({ error: "Matéria não encontrada" }, { status: 404 });
  }

  // Tópicos, tarefas, sessões e os eventos de XP correspondentes saem em cascata,
  // então o XP total cai junto — é o comportamento correto para o ledger.
  await prisma.subject.delete({ where: { id } });

  return new Response(null, { status: 204 });
}
