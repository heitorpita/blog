import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { getCharacter } from "@/lib/character";
import { levelForXp, xpForLevel, xpProgress } from "@/lib/xp";
import { formatMinutes } from "@/lib/format";

export default async function CharacterPage() {
  const [character, taskXp, sessions] = await Promise.all([
    getCharacter(),
    prisma.task.aggregate({ where: { status: "DONE" }, _sum: { xp: true } }),
    prisma.studySession.aggregate({
      _sum: { xpEarned: true, durationMinutes: true },
      _count: true,
    }),
  ]);

  const { level, xp, xpIntoLevel, xpNeededForNext, progress } = xpProgress(character.totalXp);
  const nextMilestones = [level + 1, level + 2, level + 3];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-3xl text-foreground">Personagem</h1>
        <p className="mt-1 text-sm text-muted">
          Nível {level} · {xp} XP acumulados
        </p>
      </header>

      <Card className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="font-serif text-2xl text-foreground">Nível {level}</span>
          <span className="text-xs text-muted">
            faltam {xpNeededForNext - xpIntoLevel} XP para o nível {level + 1}
          </span>
        </div>
        <ProgressBar progress={progress} />
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted">XP de tarefas</p>
          <p className="mt-1 font-serif text-2xl text-foreground">{taskXp._sum.xp ?? 0}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted">XP de estudo</p>
          <p className="mt-1 font-serif text-2xl text-foreground">
            {sessions._sum.xpEarned ?? 0}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted">Tempo total</p>
          <p className="mt-1 font-serif text-2xl text-foreground">
            {formatMinutes(sessions._sum.durationMinutes ?? 0)}
          </p>
          <p className="mt-2 text-xs text-muted">{sessions._count} sessões</p>
        </Card>
      </div>

      <Card>
        <h2 className="font-serif text-lg text-foreground">Próximos níveis</h2>
        <ul className="mt-4 divide-y divide-border text-sm">
          {nextMilestones.map((milestone) => (
            <li key={milestone} className="flex justify-between py-3">
              <span className="text-foreground">Nível {milestone}</span>
              <span className="text-xs text-muted">{xpForLevel(milestone)} XP totais</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted">
          Fórmula: nível = ⌊√(XP / 100)⌋ — a cada nível o personagem ganha um novo anel
          orbitando e muda de cor. Você está no nível {levelForXp(xp)}.
        </p>
      </Card>
    </div>
  );
}
