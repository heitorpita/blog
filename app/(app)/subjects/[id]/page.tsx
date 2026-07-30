import { notFound } from "next/navigation";
import { ProgressBar } from "@/components/ui/progress-bar";
import { TaskManager } from "@/components/tasks/task-manager";
import { TopicChecklist } from "@/components/topics/topic-checklist";
import { SubjectSettings } from "@/components/subjects/subject-settings";
import { requireSession } from "@/lib/session";
import { getSubjectDetail } from "@/lib/queries/subjects";
import { formatMinutes } from "@/lib/format";

export default async function SubjectPage({ params }: PageProps<"/subjects/[id]">) {
  await requireSession();

  const { id } = await params;
  const subject = await getSubjectDetail(id);

  if (!subject) notFound();

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {subject.code} · {subject.hours}h · {subject.teacher}
            </p>
            <h1 className="mt-1 font-serif text-3xl text-foreground">{subject.name}</h1>
          </div>

          <SubjectSettings
            subject={{
              id: subject.id,
              name: subject.name,
              code: subject.code,
              teacher: subject.teacher,
              hours: subject.hours,
              color: subject.color,
            }}
            counts={{
              topics: subject.topics.length,
              tasks: subject.tasks.length,
              sessions: subject.sessionCount,
              xp: subject.xpTotal,
            }}
          />
        </div>

        <ProgressBar
          progress={
            subject.topics.length === 0 ? 0 : subject.topicsDone / subject.topics.length
          }
          color={subject.color}
        />
        <div className="flex justify-between text-xs text-muted">
          <span>
            {subject.topicsDone}/{subject.topics.length} tópicos estudados
          </span>
          <span>{formatMinutes(subject.minutes)} estudados</span>
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
