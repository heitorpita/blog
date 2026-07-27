import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { addXp } from "@/lib/character";
import { xpForStudyMinutes } from "@/lib/xp";

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

  await addXp(xpEarned);

  return Response.json(session, { status: 201 });
}
