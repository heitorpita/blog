import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { readJson } from "@/lib/http";
import { denyWithoutSession } from "@/lib/session";

// Aceita uma lista para dar conta de colar a ementa inteira de uma vez. Um item
// só é o caso comum, e continua sendo uma lista de um.
const createTopicsSchema = z.object({
  titles: z.array(z.string().trim().min(1).max(200)).min(1).max(200),
});

const deleteTopicsSchema = z.object({
  ids: z.array(z.string().trim().min(1)).min(1).max(500),
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
  const body = await readJson(request, createTopicsSchema);
  if (!body.ok) return body.response;

  if (!(await prisma.subject.findUnique({ where: { id }, select: { id: true } }))) {
    return Response.json({ error: "Matéria não encontrada" }, { status: 404 });
  }

  const existing = await prisma.topic.findMany({
    where: { subjectId: id },
    select: { title: true, order: true },
  });

  // Colar uma ementa duas vezes não pode duplicar tudo. Comparação exata do
  // título, como o seed já faz.
  const known = new Set(existing.map((topic) => topic.title));
  const nextOrder = existing.reduce((max, topic) => Math.max(max, topic.order + 1), 0);

  const novos: string[] = [];
  for (const title of body.data.titles) {
    if (known.has(title)) continue;
    known.add(title);
    novos.push(title);
  }

  if (novos.length === 0) {
    return Response.json({ created: 0, skipped: body.data.titles.length }, { status: 200 });
  }

  await prisma.topic.createMany({
    data: novos.map((title, index) => ({ title, subjectId: id, order: nextOrder + index })),
  });

  return Response.json(
    { created: novos.length, skipped: body.data.titles.length - novos.length },
    { status: 201 },
  );
}

/**
 * Exclusão em lote. Apagar a ementa inteira um item por vez era inviável — e,
 * com `window.confirm`, o navegador parava de perguntar depois do terceiro.
 */
export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<"/api/subjects/[id]/topics">,
) {
  const denied = await denyWithoutSession();
  if (denied) return denied;

  const { id } = await ctx.params;
  const body = await readJson(request, deleteTopicsSchema);
  if (!body.ok) return body.response;

  // `subjectId` no where não é decoração: impede que um id de outra matéria
  // entre no lote por engano ou por payload adulterado.
  const { count } = await prisma.topic.deleteMany({
    where: { id: { in: body.data.ids }, subjectId: id },
  });

  // Uma instrução só, então já é atômica. O XP dos tópicos concluídos sai em
  // cascata pelo FK, igual à exclusão individual.
  return Response.json({ removed: count });
}
