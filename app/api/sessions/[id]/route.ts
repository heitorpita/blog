import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { readJson } from "@/lib/http";
import { denyWithoutSession } from "@/lib/session";
import { xpForStudyMinutes } from "@/lib/xp";

const updateSessionSchema = z.object({
  subjectId: z.string().trim().min(1).optional(),
  topicId: z.string().trim().min(1).nullish(),
  durationMinutes: z.number().int().min(1).max(24 * 60).optional(),
  note: z.string().trim().max(500).nullish(),
  startedAt: z.coerce.date().optional(),
});

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/sessions/[id]">) {
  const denied = await denyWithoutSession();
  if (denied) return denied;

  const { id } = await ctx.params;
  const body = await readJson(request, updateSessionSchema);
  if (!body.ok) return body.response;

  const existing = await prisma.studySession.findUnique({ where: { id } });

  if (!existing) {
    return Response.json({ error: "Sessão não encontrada" }, { status: 404 });
  }

  const durationMinutes = body.data.durationMinutes ?? existing.durationMinutes;
  const startedAt = body.data.startedAt ?? existing.startedAt;
  const endedAt = new Date(startedAt.getTime() + durationMinutes * 60_000);
  const xpEarned = xpForStudyMinutes(durationMinutes);

  // Corrigir a duração TEM que corrigir o XP junto. Sem isto, digitar 500 min no
  // lugar de 50 deixaria 500 XP no ledger para sempre — e é justamente esse erro
  // que hoje não tem conserto nenhum.
  const session = await prisma.$transaction(async (tx) => {
    const updated = await tx.studySession.update({
      where: { id },
      data: {
        ...body.data,
        durationMinutes,
        startedAt,
        endedAt,
        xpEarned,
      },
    });

    await tx.xpEvent.updateMany({
      where: { sessionId: id },
      data: {
        amount: xpEarned,
        description: `Sessão de estudo: ${durationMinutes} min`,
        subjectId: updated.subjectId,
      },
    });

    return updated;
  });

  return Response.json(session);
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/sessions/[id]">) {
  const denied = await denyWithoutSession();
  if (denied) return denied;

  const { id } = await ctx.params;

  if (!(await prisma.studySession.findUnique({ where: { id }, select: { id: true } }))) {
    return Response.json({ error: "Sessão não encontrada" }, { status: 404 });
  }

  // O evento de XP da sessão sai em cascata pelo FK. O bônus de streak que essa
  // sessão possa ter ajudado a fechar NÃO é estornado — recalcular marcos a cada
  // exclusão custaria mais do que vale.
  await prisma.studySession.delete({ where: { id } });

  return new Response(null, { status: 204 });
}
