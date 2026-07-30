import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SubjectCreator } from "@/components/subjects/subject-creator";
import { requireSession } from "@/lib/session";
import { formatMinutes } from "@/lib/format";

export default async function SubjectsPage() {
  await requireSession();

  const subjects = await prisma.subject.findMany({
    orderBy: { name: "asc" },
    include: {
      topics: { select: { completed: true } },
      sessions: { select: { durationMinutes: true } },
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Matérias</h1>
          <p className="mt-1 text-sm text-muted">Progresso por disciplina do semestre.</p>
        </div>
        <SubjectCreator />
      </header>

      {subjects.length === 0 && (
        <Card className="text-sm text-muted">
          Nenhuma matéria ainda. Crie a primeira para começar a registrar seus estudos.
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {subjects.map((subject) => {
          const total = subject.topics.length;
          const done = subject.topics.filter((topic) => topic.completed).length;
          const minutes = subject.sessions.reduce((sum, s) => sum + s.durationMinutes, 0);

          return (
            <Link key={subject.id} href={`/subjects/${subject.id}`}>
              <Card className="h-full transition-colors hover:border-accent/40">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted">
                      {subject.code}
                    </p>
                    <h2 className="mt-1 font-serif text-lg leading-snug text-foreground">
                      {subject.name}
                    </h2>
                  </div>
                  <span
                    className="mt-1 size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: subject.color }}
                  />
                </div>

                <p className="mt-3 text-xs text-muted">{subject.teacher}</p>

                <div className="mt-4 space-y-2">
                  <ProgressBar
                    progress={total === 0 ? 0 : done / total}
                    color={subject.color}
                  />
                  <div className="flex justify-between text-xs text-muted">
                    <span>
                      {done}/{total} tópicos
                    </span>
                    <span>{formatMinutes(minutes)} estudados</span>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
