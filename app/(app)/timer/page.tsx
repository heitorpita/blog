import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { StudyTimer } from "@/components/timer/study-timer";
import { SessionForm } from "@/components/timer/session-form";
import { SessionList } from "@/components/timer/session-list";
import { HoursChart } from "@/components/timer/hours-chart";
import { requireSession } from "@/lib/session";
import { listSubjectsWithProgress } from "@/lib/queries/subjects";
import { formatMinutes } from "@/lib/format";

export default async function TimerPage() {
  await requireSession();

  const [progresso, subjects, sessions] = await Promise.all([
    listSubjectsWithProgress(),
    prisma.subject.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        color: true,
        topics: { orderBy: { order: "asc" }, select: { id: true, title: true } },
      },
    }),
    prisma.studySession.findMany({
      orderBy: { endedAt: "desc" },
      take: 10,
      include: {
        subject: { select: { name: true, color: true } },
        topic: { select: { title: true } },
      },
    }),
  ]);

  const chartData = progresso.map((subject) => ({
    name: subject.code,
    hours: Math.round((subject.minutes / 60) * 10) / 10,
    color: subject.color,
  }));

  // Datas viram string aqui: o componente é cliente, e Date atravessando a
  // fronteira serializa de qualquer jeito — melhor ser explícito.
  const rows = sessions.map((session) => ({
    id: session.id,
    subjectId: session.subjectId,
    topicId: session.topicId,
    durationMinutes: session.durationMinutes,
    note: session.note,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt.toISOString(),
    xpEarned: session.xpEarned,
    subjectName: session.subject.name,
    subjectColor: session.subject.color,
    topicTitle: session.topic?.title ?? null,
  }));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-3xl text-foreground">Cronômetro</h1>
        <p className="mt-1 text-sm text-muted">
          Cada minuto estudado vale 1 XP para o seu personagem.
        </p>
      </header>

      <StudyTimer subjects={subjects} />

      <SessionForm subjects={subjects} />

      <Card>
        <h2 className="font-serif text-lg text-foreground">Horas por matéria</h2>
        <div className="mt-4">
          <HoursChart data={chartData} />
        </div>
      </Card>

      <Card>
        <h2 className="font-serif text-lg text-foreground">Sessões recentes</h2>
        <p className="mt-1 text-xs text-muted">
          Total registrado: {formatMinutes(progresso.reduce((s, m) => s + m.minutes, 0))}
        </p>
        <div className="mt-4">
          <SessionList sessions={rows} subjects={subjects} />
        </div>
      </Card>
    </div>
  );
}
