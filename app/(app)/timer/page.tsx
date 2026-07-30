import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { StudyTimer } from "@/components/timer/study-timer";
import { HoursChart } from "@/components/timer/hours-chart";
import { requireSession } from "@/lib/session";
import { listSubjectsWithProgress } from "@/lib/queries/subjects";
import { formatDate, formatMinutes } from "@/lib/format";

export default async function TimerPage() {
  await requireSession();

  const [subjects, sessions] = await Promise.all([
    listSubjectsWithProgress(),
    prisma.studySession.findMany({
      orderBy: { endedAt: "desc" },
      take: 10,
      include: { subject: { select: { name: true, color: true } } },
    }),
  ]);

  const chartData = subjects.map((subject) => ({
    name: subject.code,
    hours: Math.round((subject.minutes / 60) * 10) / 10,
    color: subject.color,
  }));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-3xl text-foreground">Cronômetro</h1>
        <p className="mt-1 text-sm text-muted">
          Cada minuto estudado vale 1 XP para o seu personagem.
        </p>
      </header>

      <StudyTimer subjects={subjects.map(({ id, name, color }) => ({ id, name, color }))} />

      <Card>
        <h2 className="font-serif text-lg text-foreground">Horas por matéria</h2>
        <div className="mt-4">
          <HoursChart data={chartData} />
        </div>
      </Card>

      <Card>
        <h2 className="font-serif text-lg text-foreground">Sessões recentes</h2>
        <ul className="mt-4 divide-y divide-border">
          {sessions.length === 0 && (
            <li className="py-4 text-sm text-muted">Nenhuma sessão ainda.</li>
          )}
          {sessions.map((session) => (
            <li key={session.id} className="flex items-center justify-between py-3 text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: session.subject.color }}
                />
                <span className="text-foreground">{session.subject.name}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted">
                <span>{formatMinutes(session.durationMinutes)}</span>
                <span>+{session.xpEarned} XP</span>
                <span>{formatDate(session.endedAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
