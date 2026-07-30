import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ProgressBar } from "@/components/ui/progress-bar";
import { TaskManager } from "@/components/tasks/task-manager";
import { TopicChecklist } from "@/components/topics/topic-checklist";
import { requireSession } from "@/lib/session";
import { formatMinutes } from "@/lib/format";

export default async function SubjectPage({ params }: PageProps<"/subjects/[id]">) {
  await requireSession();

  const { id } = await params;

  const subject = await prisma.subject.findUnique({
    where: { id },
    include: {
      topics: { orderBy: { order: "asc" } },
      tasks: { orderBy: [{ status: "asc" }, { createdAt: "desc" }] },
      sessions: { select: { durationMinutes: true } },
    },
  });

  if (!subject) notFound();

  const topicsDone = subject.topics.filter((topic) => topic.completed).length;
  const minutes = subject.sessions.reduce((sum, s) => sum + s.durationMinutes, 0);

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {subject.code} · {subject.hours}h · {subject.teacher}
        </p>
        <h1 className="font-serif text-3xl text-foreground">{subject.name}</h1>
        <ProgressBar
          progress={subject.topics.length === 0 ? 0 : topicsDone / subject.topics.length}
          color={subject.color}
        />
        <div className="flex justify-between text-xs text-muted">
          <span>
            {topicsDone}/{subject.topics.length} tópicos estudados
          </span>
          <span>{formatMinutes(minutes)} estudados</span>
        </div>
      </header>

      <TopicChecklist
        subjectId={subject.id}
        topics={subject.topics}
        accentColor={subject.color}
      />

      <TaskManager
        subjectId={subject.id}
        topics={subject.topics}
        tasks={subject.tasks}
        accentColor={subject.color}
      />
    </div>
  );
}
