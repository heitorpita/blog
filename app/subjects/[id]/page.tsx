import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { TaskManager } from "@/components/tasks/task-manager";
import { formatMinutes } from "@/lib/format";

export default async function SubjectPage({ params }: PageProps<"/subjects/[id]">) {
  const { id } = await params;

  const subject = await prisma.subject.findUnique({
    where: { id },
    include: {
      tasks: { orderBy: [{ status: "asc" }, { createdAt: "desc" }] },
      sessions: { select: { durationMinutes: true } },
    },
  });

  if (!subject) notFound();

  const done = subject.tasks.filter((task) => task.status === "DONE").length;
  const minutes = subject.sessions.reduce((sum, s) => sum + s.durationMinutes, 0);

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {subject.code} · {subject.hours}h · {subject.teacher}
        </p>
        <h1 className="font-serif text-3xl text-foreground">{subject.name}</h1>
        <ProgressBar
          progress={subject.tasks.length === 0 ? 0 : done / subject.tasks.length}
          color={subject.color}
        />
        <div className="flex justify-between text-xs text-muted">
          <span>
            {done}/{subject.tasks.length} tarefas concluídas
          </span>
          <span>{formatMinutes(minutes)} estudados</span>
        </div>
      </header>

      <Card>
        <h2 className="font-serif text-lg text-foreground">Tópicos da ementa</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {subject.topics.map((topic) => (
            <li
              key={topic}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted"
            >
              {topic}
            </li>
          ))}
        </ul>
      </Card>

      <TaskManager
        subjectId={subject.id}
        topics={subject.topics}
        tasks={subject.tasks}
        accentColor={subject.color}
      />
    </div>
  );
}
