import { prisma } from "@/lib/db";
import { getStudyMinutesBySubject } from "@/lib/queries/study-sessions";

export type SubjectProgress = {
  id: string;
  code: string;
  name: string;
  teacher: string;
  color: string;
  /** Carga horária da disciplina. Vira a meta do semestre. */
  hours: number;
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
        hours: true,
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
  const [subject, sessions, xp, minutesByTopic] = await Promise.all([
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
    // Tempo por assunto: "3h de Cálculo" não dizia 3h de quê.
    prisma.studySession.groupBy({
      by: ["topicId"],
      where: { subjectId: id, topicId: { not: null } },
      _sum: { durationMinutes: true },
    }),
  ]);

  if (!subject) return null;

  const minutosPorTopico = new Map(
    minutesByTopic.map((row) => [row.topicId, row._sum.durationMinutes ?? 0]),
  );

  return {
    ...subject,
    topics: subject.topics.map((topic) => ({
      ...topic,
      minutes: minutosPorTopico.get(topic.id) ?? 0,
    })),
    topicsDone: subject.topics.filter((topic) => topic.completed).length,
    minutes: sessions._sum.durationMinutes ?? 0,
    sessionCount: sessions._count,
    xpTotal: xp._sum.amount ?? 0,
  };
}

export type StaleTopic = {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  /** Última vez que este tópico recebeu estudo, ou a criação se nunca recebeu. */
  lastActivity: Date;
  everStudied: boolean;
};

/**
 * Tópicos pendentes há mais tempo sem receber estudo.
 *
 * Responde a pergunta que nenhum gráfico respondia: "o que eu estou empurrando
 * com a barriga". Um tópico nunca estudado conta a partir da data em que entrou
 * na ementa — senão ele nunca apareceria por não ter atividade nenhuma.
 */
export async function getStaleTopics(limit = 5): Promise<StaleTopic[]> {
  const topics = await prisma.topic.findMany({
    where: { completed: false },
    select: {
      id: true,
      title: true,
      createdAt: true,
      subjectId: true,
      subject: { select: { name: true, color: true } },
    },
  });

  if (topics.length === 0) return [];

  const ultimaSessao = await prisma.studySession.groupBy({
    by: ["topicId"],
    where: { topicId: { in: topics.map((topic) => topic.id) } },
    _max: { endedAt: true },
  });

  const porTopico = new Map(ultimaSessao.map((row) => [row.topicId, row._max.endedAt]));

  return topics
    .map((topic) => {
      const estudadoEm = porTopico.get(topic.id) ?? null;
      return {
        id: topic.id,
        title: topic.title,
        subjectId: topic.subjectId,
        subjectName: topic.subject.name,
        subjectColor: topic.subject.color,
        lastActivity: estudadoEm ?? topic.createdAt,
        everStudied: estudadoEm !== null,
      };
    })
    .sort((a, b) => a.lastActivity.getTime() - b.lastActivity.getTime())
    .slice(0, limit);
}
