import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { awardStreakMilestone, recordXp } from "@/lib/xp-ledger";
import { getStreak } from "@/lib/brain";
import { STREAK_MILESTONES, streakBonusXp, xpForStudyMinutes } from "@/lib/xp";

const createSessionSchema = z.object({
  subjectId: z.string().trim().min(1),
  mode: z.enum(["FREE", "POMODORO"]).default("FREE"),
  durationMinutes: z.number().int().min(1).max(24 * 60),
  startedAt: z.coerce.date().optional(),
});

export async function GET(request: NextRequest) {
  const subjectId = request.nextUrl.searchParams.get("subjectId");

  const sessions = await prisma.studySession.findMany({
    where: subjectId ? { subjectId } : undefined,
    orderBy: { endedAt: "desc" },
    take: 100,
  });

  return Response.json(sessions);
}

export async function POST(request: NextRequest) {
  const parsed = createSessionSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { subjectId, mode, durationMinutes, startedAt } = parsed.data;
  const endedAt = new Date();
  const start = startedAt ?? new Date(endedAt.getTime() - durationMinutes * 60_000);
  const xpEarned = xpForStudyMinutes(durationMinutes);

  const session = await prisma.studySession.create({
    data: { subjectId, mode, durationMinutes, startedAt: start, endedAt, xpEarned },
  });

  await recordXp({
    source: "SESSION",
    amount: xpEarned,
    description: `Sessão de estudo: ${durationMinutes} min`,
    subjectId: session.subjectId,
    sessionId: session.id,
  });

  // A sessão pode ter acabado de fechar um marco de streak.
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
