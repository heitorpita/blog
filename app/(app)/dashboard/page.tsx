import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { KnowledgeGraph } from "@/components/graph/knowledge-graph";
import { requireSession } from "@/lib/session";
import { PRIORITY_LABEL, PRIORITY_TONE } from "@/lib/labels";
import { getTotalXp } from "@/lib/xp-ledger";
import { buildGraph } from "@/lib/graph";
import { xpProgress } from "@/lib/xp";
import { formatMinutes } from "@/lib/format";

async function findMinutesThisWeek() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const sessions = await prisma.studySession.findMany({
    where: { endedAt: { gte: weekAgo } },
    select: { durationMinutes: true },
  });

  return sessions.reduce((sum, session) => sum + session.durationMinutes, 0);
}

export default async function DashboardPage() {
  await requireSession();

  const [totalXp, weekMinutes, nextTask, graph] = await Promise.all([
    getTotalXp(),
    findMinutesThisWeek(),
    prisma.task.findFirst({
      where: { status: { not: "DONE" } },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      include: { subject: { select: { id: true, name: true } } },
    }),
    buildGraph(),
  ]);

  const { level, xp, xpIntoLevel, xpNeededForNext, progress } = xpProgress(totalXp);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Como suas matérias, tópicos, tarefas e anotações se conectam.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted">Nível</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-serif text-3xl text-foreground">{level}</span>
            <span className="text-xs text-muted">{xp} XP</span>
          </div>
          <div className="mt-3 space-y-1.5">
            <ProgressBar progress={progress} />
            <p className="text-xs text-muted">
              {xpIntoLevel}/{xpNeededForNext} XP para o nível {level + 1}
            </p>
          </div>
        </Card>

        <Card>
          <p className="text-xs uppercase tracking-wide text-muted">Estudo na semana</p>
          <p className="mt-1 font-serif text-3xl text-foreground">
            {formatMinutes(weekMinutes)}
          </p>
          <p className="mt-3 text-xs text-muted">Últimos 7 dias</p>
        </Card>

        <Card>
          <p className="text-xs uppercase tracking-wide text-muted">Próxima tarefa</p>
          {nextTask ? (
            <>
              <Link
                href={`/subjects/${nextTask.subject.id}`}
                className="mt-1 block truncate font-serif text-lg text-foreground transition-colors hover:text-accent"
              >
                {nextTask.title}
              </Link>
              <div className="mt-3 flex items-center gap-2">
                <Badge tone={PRIORITY_TONE[nextTask.priority]}>
                  {PRIORITY_LABEL[nextTask.priority]}
                </Badge>
                <span className="truncate text-xs text-muted">{nextTask.subject.name}</span>
              </div>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted">Nada pendente. Bom trabalho.</p>
          )}
        </Card>
      </div>

      <KnowledgeGraph data={graph} />
    </div>
  );
}
