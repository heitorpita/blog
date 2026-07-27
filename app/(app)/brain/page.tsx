import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { XpChart } from "@/components/brain/xp-chart";
import { StudyHeatmap } from "@/components/brain/study-heatmap";
import { SubjectBreakdown } from "@/components/brain/subject-breakdown";
import { EventFeed } from "@/components/brain/event-feed";
import { getTotalXp } from "@/lib/xp-ledger";
import {
  getRecentXpEvents,
  getStreak,
  getStudyHeatmap,
  getXpBySubject,
  getXpOverTime,
} from "@/lib/brain";
import { LEVEL_TITLES, STREAK_MILESTONES, xpForLevel, xpProgress } from "@/lib/xp";
import { formatMinutes } from "@/lib/format";

export default async function BrainPage() {
  const [totalXp, streak, xpOverTime, heatmap, bySubject, events, sessions] =
    await Promise.all([
      getTotalXp(),
      getStreak(),
      getXpOverTime(),
      getStudyHeatmap(),
      getXpBySubject(),
      getRecentXpEvents(),
      prisma.studySession.aggregate({
        _sum: { durationMinutes: true },
        _count: true,
      }),
    ]);

  const { level, title, xp, xpIntoLevel, xpNeededForNext, progress, percent } =
    xpProgress(totalXp);

  const nextMilestone = STREAK_MILESTONES.find((days) => days > streak.current);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-3xl text-foreground">Cérebro</h1>
        <p className="mt-1 text-sm text-muted">
          {title} · nível {level} · {xp} XP acumulados
        </p>
      </header>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-serif text-2xl text-foreground">{title}</span>
          <span className="text-sm text-muted">
            <span className="font-medium text-foreground">{percent}%</span> até o nível{" "}
            {level + 1}
          </span>
        </div>

        <ProgressBar progress={progress} />

        <div className="flex flex-wrap justify-between gap-2 text-xs text-muted">
          <span>
            {xpIntoLevel} de {xpNeededForNext} XP nesta faixa
          </span>
          <span>faltam {xpNeededForNext - xpIntoLevel} XP</span>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted">Sequência</p>
          <p className="mt-1 font-serif text-3xl text-foreground">
            {streak.current > 0 ? `🔥 ${streak.current}` : "—"}
          </p>
          <p className="mt-2 text-xs text-muted">
            {streak.current > 0
              ? `${streak.current === 1 ? "dia seguido" : "dias seguidos"}`
              : "Estude hoje para começar"}
            {nextMilestone && ` · próximo bônus aos ${nextMilestone}`}
          </p>
        </Card>

        <Card>
          <p className="text-xs uppercase tracking-wide text-muted">Maior sequência</p>
          <p className="mt-1 font-serif text-3xl text-foreground">{streak.longest}</p>
          <p className="mt-2 text-xs text-muted">
            {streak.longest === 1 ? "dia" : "dias"} consecutivos
          </p>
        </Card>

        <Card>
          <p className="text-xs uppercase tracking-wide text-muted">Tempo total</p>
          <p className="mt-1 font-serif text-3xl text-foreground">
            {formatMinutes(sessions._sum.durationMinutes ?? 0)}
          </p>
          <p className="mt-2 text-xs text-muted">{sessions._count} sessões</p>
        </Card>
      </div>

      <Card>
        <h2 className="font-serif text-lg text-foreground">XP acumulado</h2>
        <p className="mt-1 text-xs text-muted">Últimos 90 dias</p>
        <div className="mt-4">
          <XpChart data={xpOverTime} />
        </div>
      </Card>

      <Card>
        <h2 className="font-serif text-lg text-foreground">Dias de estudo</h2>
        <p className="mt-1 text-xs text-muted">
          Intensidade por minutos estudados no dia · últimas 26 semanas
        </p>
        <div className="mt-4">
          <StudyHeatmap data={heatmap} />
        </div>
      </Card>

      <Card>
        <h2 className="font-serif text-lg text-foreground">De onde veio o XP</h2>
        <div className="mt-4">
          <SubjectBreakdown data={bySubject} />
        </div>
      </Card>

      <Card>
        <h2 className="font-serif text-lg text-foreground">Atividade recente</h2>
        <div className="mt-2">
          <EventFeed events={events} />
        </div>
      </Card>

      <Card>
        <h2 className="font-serif text-lg text-foreground">Faixas de nível</h2>
        <ul className="mt-4 divide-y divide-border text-sm">
          {LEVEL_TITLES.map((tier) => (
            <li key={tier.title} className="flex justify-between py-3">
              <span className={tier.title === title ? "text-foreground" : "text-muted"}>
                {tier.title}
              </span>
              <span className="text-xs text-muted">
                nível {tier.minLevel}+ · {xpForLevel(tier.minLevel)} XP
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted">
          Nível = ⌊√(XP / 100)⌋. A rede neural ganha neurônios e sinapses a cada nível.
        </p>
      </Card>
    </div>
  );
}
