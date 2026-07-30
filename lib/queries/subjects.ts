import { prisma } from "@/lib/db";
import { getStudyMinutesBySubject } from "@/lib/queries/study-sessions";

export type SubjectProgress = {
  id: string;
  code: string;
  name: string;
  teacher: string;
  color: string;
  topicsTotal: number;
  topicsDone: number;
  minutes: number;
};

/**
 * Matérias com o progresso resolvido. Atende a página de Matérias e a do
 * Cronômetro, que mostravam o mesmo número calculado de dois jeitos.
 *
 * Os tópicos vêm como linhas porque são poucos e limitados (a rota de criação
 * aceita no máximo 100 por matéria) e porque o `_count` do Prisma não devolve
 * total e concluídos de uma vez só. As sessões, essas sim sem teto, ficam no
 * groupBy.
 */
export async function listSubjectsWithProgress(): Promise<SubjectProgress[]> {
  const [subjects, minutesBySubject] = await Promise.all([
    prisma.subject.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        teacher: true,
        color: true,
        topics: { select: { completed: true } },
      },
    }),
    getStudyMinutesBySubject(),
  ]);

  return subjects.map(({ topics, ...subject }) => ({
    ...subject,
    topicsTotal: topics.length,
    topicsDone: topics.filter((topic) => topic.completed).length,
    minutes: minutesBySubject.get(subject.id) ?? 0,
  }));
}

/**
 * Uma matéria com tópicos, tarefas e o peso do que sairia junto numa exclusão.
 * Devolve `null` quando não existe: navegação é decisão da página.
 */
export async function getSubjectDetail(id: string) {
  const [subject, sessions, xp] = await Promise.all([
    prisma.subject.findUnique({
      where: { id },
      include: {
        topics: { orderBy: { order: "asc" } },
        tasks: { orderBy: [{ status: "asc" }, { createdAt: "desc" }] },
      },
    }),
    prisma.studySession.aggregate({
      where: { subjectId: id },
      _sum: { durationMinutes: true },
      _count: true,
    }),
    prisma.xpEvent.aggregate({ where: { subjectId: id }, _sum: { amount: true } }),
  ]);

  if (!subject) return null;

  return {
    ...subject,
    topicsDone: subject.topics.filter((topic) => topic.completed).length,
    minutes: sessions._sum.durationMinutes ?? 0,
    sessionCount: sessions._count,
    xpTotal: xp._sum.amount ?? 0,
  };
}
