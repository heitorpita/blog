import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { KnowledgeGraph } from "@/components/graph/knowledge-graph";
import { requireSession } from "@/lib/session";
import { getWeeklyPace } from "@/lib/queries/study-sessions";
import { PRIORITY_LABEL, PRIORITY_TONE } from "@/lib/labels";
import { getTotalXp } from "@/lib/xp-ledger";
import { buildGraph } from "@/lib/graph";
import { xpProgress } from "@/lib/xp";
import { formatMinutes } from "@/lib/format";

export default async function DashboardPage() {
  await requireSession();

  const [totalXp, pace, nextTask, graph] = await Promise.all([
    getTotalXp(),
    getWeeklyPace(),
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
            {formatMinutes(pace.thisWeek)}
          </p>
          {/* A cor nunca carrega o sinal sozinha: a seta e o texto dizem o mesmo,
              seguindo a regra de daltonismo já adotada nos gráficos. */}
          <p className="mt-3 text-xs text-muted">
            Últimos 7 dias ·{" "}
            {pace.deltaPercent === null ? (
              <span>primeira semana registrada</span>
            ) : pace.deltaPercent === 0 ? (
              <span>igual à semana anterior</span>
            ) : (
              <span
                className={
                  pace.deltaPercent > 0 ? "text-emerald-400" : "text-amber-400"
                }
              >
                {pace.deltaPercent > 0 ? "↑" : "↓"} {Math.abs(pace.deltaPercent)}% vs. semana
                anterior
              </span>
            )}
          </p>
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
