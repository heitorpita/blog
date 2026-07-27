import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { getCharacter } from "@/lib/character";
import { xpProgress } from "@/lib/xp";
import { formatMinutes } from "@/lib/format";

const PRIORITY_LABEL = { LOW: "Baixa", MEDIUM: "Média", HIGH: "Alta" } as const;
const PRIORITY_TONE = { LOW: "neutral", MEDIUM: "warning", HIGH: "danger" } as const;

async function findSessionsThisWeek() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  return prisma.studySession.findMany({
    where: { endedAt: { gte: weekAgo } },
    select: { durationMinutes: true },
  });
}

export default async function DashboardPage() {
  const [character, subjects, weekSessions, upcomingTasks] = await Promise.all([
    getCharacter(),
    prisma.subject.findMany({
      orderBy: { name: "asc" },
      include: { tasks: { select: { status: true } } },
    }),
    findSessionsThisWeek(),
    prisma.task.findMany({
      where: { status: { not: "DONE" } },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      take: 6,
      include: { subject: { select: { name: true, color: true, id: true } } },
    }),
  ]);

  const { level, xp, xpIntoLevel, xpNeededForNext, progress } = xpProgress(character.totalXp);
  const weekMinutes = weekSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const totalDone = subjects.reduce(
    (sum, subject) => sum + subject.tasks.filter((t) => t.status === "DONE").length,
    0,
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-3xl text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">Sua evolução no semestre.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted">Nível</p>
          <p className="mt-1 font-serif text-3xl text-foreground">{level}</p>
          <div className="mt-3 space-y-1.5">
            <ProgressBar progress={progress} />
            <p className="text-xs text-muted">
              {xpIntoLevel}/{xpNeededForNext} XP para o nível {level + 1}
            </p>
          </div>
        </Card>

        <Card>
          <p className="text-xs uppercase tracking-wide text-muted">XP total</p>
          <p className="mt-1 font-serif text-3xl text-foreground">{xp}</p>
          <p className="mt-3 text-xs text-muted">{totalDone} tarefas concluídas</p>
        </Card>

        <Card>
          <p className="text-xs uppercase tracking-wide text-muted">Estudo na semana</p>
          <p className="mt-1 font-serif text-3xl text-foreground">
            {formatMinutes(weekMinutes)}
          </p>
          <p className="mt-3 text-xs text-muted">Últimos 7 dias</p>
        </Card>
      </div>

      <section className="space-y-4">
        <h2 className="font-serif text-xl text-foreground">Progresso por matéria</h2>
        <Card className="space-y-4">
          {subjects.map((subject) => {
            const total = subject.tasks.length;
            const done = subject.tasks.filter((task) => task.status === "DONE").length;

            return (
              <div key={subject.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <Link
                    href={`/subjects/${subject.id}`}
                    className="text-foreground transition-colors hover:text-accent"
                  >
                    {subject.name}
                  </Link>
                  <span className="text-xs text-muted">
                    {done}/{total}
                  </span>
                </div>
                <ProgressBar
                  progress={total === 0 ? 0 : done / total}
                  color={subject.color}
                />
              </div>
            );
          })}
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-xl text-foreground">Próximas tarefas</h2>
        <Card>
          <ul className="divide-y divide-border">
            {upcomingTasks.length === 0 && (
              <li className="py-3 text-sm text-muted">Nada pendente. Bom trabalho.</li>
            )}
            {upcomingTasks.map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <Link
                    href={`/subjects/${task.subject.id}`}
                    className="block truncate text-sm text-foreground transition-colors hover:text-accent"
                  >
                    {task.title}
                  </Link>
                  <p className="truncate text-xs text-muted">{task.subject.name}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={PRIORITY_TONE[task.priority]}>
                    {PRIORITY_LABEL[task.priority]}
                  </Badge>
                  <span className="text-xs text-muted">{task.xp} XP</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
