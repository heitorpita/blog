import { prisma } from "@/lib/db";
import { dayKey, daysBetween, shiftDayKey, todayKey } from "@/lib/time";

export type StreakInfo = {
  current: number;
  longest: number;
  studiedToday: boolean;
};

export type XpPoint = { day: string; gained: number; total: number };
export type HeatmapDay = { day: string; minutes: number };
export type SubjectXp = { id: string; name: string; color: string; xp: number };
export type XpEventItem = {
  id: string;
  source: string;
  amount: number;
  description: string;
  createdAt: Date;
  subjectName: string | null;
  subjectColor: string | null;
};

/** Dias distintos com pelo menos uma sessão, no fuso local, do mais recente ao mais antigo. */
async function studiedDays(): Promise<string[]> {
  const sessions = await prisma.studySession.findMany({ select: { endedAt: true } });
  const today = todayKey();

  return [...new Set(sessions.map((session) => dayKey(session.endedAt)))]
    // Um relógio adiantado gravaria uma sessão "de amanhã", e aí o dia mais
    // recente não seria hoje nem ontem — zerando o streak sem motivo.
    .filter((day) => day <= today)
    .sort()
    .reverse();
}

export async function getStreak(): Promise<StreakInfo> {
  const days = await studiedDays();

  if (days.length === 0) {
    return { current: 0, longest: 0, studiedToday: false };
  }

  const today = todayKey();
  const studiedToday = days[0] === today;

  // O streak continua vivo se você estudou hoje ou ontem — ainda dá tempo de manter.
  let current = 0;
  if (studiedToday || days[0] === shiftDayKey(today, -1)) {
    current = 1;
    for (let i = 1; i < days.length; i += 1) {
      if (daysBetween(days[i], days[i - 1]) !== 1) break;
      current += 1;
    }
  }

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i += 1) {
    if (daysBetween(days[i], days[i - 1]) === 1) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  return { current, longest: Math.max(longest, current), studiedToday };
}

export async function getXpOverTime(days = 90): Promise<XpPoint[]> {
  const since = new Date(Date.now() - days * 86_400_000);

  const events = await prisma.xpEvent.findMany({
    where: { createdAt: { gte: since } },
    select: { amount: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  // XP anterior à janela entra como ponto de partida, senão a linha começa do zero
  // e parece que o progresso foi perdido.
  const before = await prisma.xpEvent.aggregate({
    where: { createdAt: { lt: since } },
    _sum: { amount: true },
  });

  const perDay = new Map<string, number>();
  for (const event of events) {
    const key = dayKey(event.createdAt);
    perDay.set(key, (perDay.get(key) ?? 0) + event.amount);
  }

  if (perDay.size === 0) return [];

  const keys = [...perDay.keys()].sort();
  const points: XpPoint[] = [];
  let total = before._sum.amount ?? 0;

  // Preenche os dias sem evento para a linha não "pular" no tempo.
  for (let key = keys[0]; daysBetween(key, todayKey()) >= 0; key = shiftDayKey(key, 1)) {
    const gained = perDay.get(key) ?? 0;
    total += gained;
    points.push({ day: key, gained, total });
  }

  return points;
}

export async function getStudyHeatmap(weeks = 26): Promise<HeatmapDay[]> {
  const since = new Date(Date.now() - weeks * 7 * 86_400_000);

  const sessions = await prisma.studySession.findMany({
    where: { endedAt: { gte: since } },
    select: { endedAt: true, durationMinutes: true },
  });

  const perDay = new Map<string, number>();
  for (const session of sessions) {
    const key = dayKey(session.endedAt);
    perDay.set(key, (perDay.get(key) ?? 0) + session.durationMinutes);
  }

  // A grade começa num domingo para as colunas virarem semanas alinhadas.
  const start = shiftDayKey(todayKey(), -(weeks * 7 - 1));
  const startWeekday = new Date(`${start}T12:00:00Z`).getUTCDay();
  const gridStart = shiftDayKey(start, -startWeekday);

  const result: HeatmapDay[] = [];
  for (let key = gridStart; daysBetween(key, todayKey()) >= 0; key = shiftDayKey(key, 1)) {
    result.push({ day: key, minutes: perDay.get(key) ?? 0 });
  }

  return result;
}

export async function getXpBySubject(): Promise<SubjectXp[]> {
  const [grouped, subjects] = await Promise.all([
    prisma.xpEvent.groupBy({
      by: ["subjectId"],
      _sum: { amount: true },
      where: { subjectId: { not: null } },
    }),
    prisma.subject.findMany({ select: { id: true, name: true, color: true } }),
  ]);

  return grouped
    .map((row) => {
      const subject = subjects.find((item) => item.id === row.subjectId);
      return {
        id: row.subjectId!,
        name: subject?.name ?? "Matéria removida",
        color: subject?.color ?? "#5c5870",
        xp: row._sum.amount ?? 0,
      };
    })
    .filter((row) => row.xp > 0)
    .sort((a, b) => b.xp - a.xp);
}

export async function getRecentXpEvents(limit = 12): Promise<XpEventItem[]> {
  const events = await prisma.xpEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { subject: { select: { name: true, color: true } } },
  });

  return events.map((event) => ({
    id: event.id,
    source: event.source,
    amount: event.amount,
    description: event.description,
    createdAt: event.createdAt,
    subjectName: event.subject?.name ?? null,
    subjectColor: event.subject?.color ?? null,
  }));
}
