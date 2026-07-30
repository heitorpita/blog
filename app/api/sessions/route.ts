import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { readJson } from "@/lib/http";
import { denyWithoutSession } from "@/lib/session";
import { awardStreakMilestone, recordXp } from "@/lib/xp-ledger";
import { getStreak } from "@/lib/brain";
import { STREAK_MILESTONES, streakBonusXp, xpForStudyMinutes } from "@/lib/xp";

const createSessionSchema = z.object({
  subjectId: z.string().trim().min(1),
  topicId: z.string().trim().min(1).nullish(),
  mode: z.enum(["FREE", "POMODORO"]).default("FREE"),
  durationMinutes: z.number().int().min(1).max(24 * 60),
  note: z.string().trim().max(500).nullish(),
  /** Quando o estudo começou. Ausente = agora, que é o caso do cronômetro ao vivo. */
  startedAt: z.coerce.date().optional(),
});

export async function GET(request: NextRequest) {
  const denied = await denyWithoutSession();
  if (denied) return denied;

  const subjectId = request.nextUrl.searchParams.get("subjectId");

  const sessions = await prisma.studySession.findMany({
    where: subjectId ? { subjectId } : undefined,
    orderBy: { endedAt: "desc" },
    take: 100,
  });

  return Response.json(sessions);
}

export async function POST(request: NextRequest) {
  const denied = await denyWithoutSession();
  if (denied) return denied;

  const body = await readJson(request, createSessionSchema);
  if (!body.ok) return body.response;

  const { subjectId, topicId, mode, durationMinutes, note, startedAt } = body.data;

  // Com `startedAt`, o fim é calculado a partir dele — é o que permite lançar
  // estudo de ontem. Sem, a sessão acabou agora (cronômetro ao vivo). `endedAt`
  // é o que define o dia no streak, no heatmap e na curva de XP, então errar
  // aqui joga a sessão no dia errado.
  const start = startedAt ?? new Date(Date.now() - durationMinutes * 60_000);
  const endedAt = startedAt
    ? new Date(startedAt.getTime() + durationMinutes * 60_000)
    : new Date();

  const xpEarned = xpForStudyMinutes(durationMinutes);

  // Sessão e XP na mesma transação: minuto estudado que não vira XP é o mesmo
  // que minuto perdido.
  const session = await prisma.$transaction(async (tx) => {
    const created = await tx.studySession.create({
      data: {
        subjectId,
        topicId: topicId ?? null,
        mode,
        durationMinutes,
        note: note ?? null,
        startedAt: start,
        endedAt,
        xpEarned,
      },
    });

    await recordXp(
      {
        source: "SESSION",
        amount: xpEarned,
        description: `Sessão de estudo: ${durationMinutes} min`,
        subjectId: created.subjectId,
        sessionId: created.id,
      },
      tx,
    );

    return created;
  });

  // A sessão pode ter acabado de fechar um marco de streak. Fica fora da
  // transação de propósito: o bônus é um extra, e falhar aqui não pode
  // desfazer a sessão que o usuário acabou de estudar.
  const { current } = await getStreak();
  const milestone = STREAK_MILESTONES.find((days) => days === current);
  const streakBonus = milestone
    ? await awardStreakMilestone(milestone, streakBonusXp(milestone))
    : null;

  return Response.json(
    { ...session, streak: current, streakBonus: streakBonus?.amount ?? null },
    { status: 201 },
  );
}
