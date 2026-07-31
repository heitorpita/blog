import { prisma } from "@/lib/db";
import { comparePace, type Pace } from "@/lib/pace";

// Somas de tempo estudado feitas no Postgres, não em JavaScript. As páginas
// carregavam TODAS as linhas de StudySession só para somar `durationMinutes` —
// em quatro lugares diferentes — e essa é a tabela que mais cresce no app.
//
// Nada aqui checa sessão: quem chama (page ou layout) já chamou
// `requireSession()`. A autorização neste app é binária, e `requireSession()`
// redireciona — pôr um redirect na camada de dados viraria armadilha no dia em
// que uma destas funções fosse usada dentro de uma rota de API.

/** Minutos estudados por matéria, indexados por `subjectId`. */
export async function getStudyMinutesBySubject(): Promise<ReadonlyMap<string, number>> {
  const rows = await prisma.studySession.groupBy({
    by: ["subjectId"],
    _sum: { durationMinutes: true },
  });

  // Matéria sem sessão nenhuma não aparece no groupBy — quem lê resolve com `?? 0`.
  return new Map(rows.map((row) => [row.subjectId, row._sum.durationMinutes ?? 0]));
}

/**
 * Minutos estudados nos últimos N dias. O tamanho da janela é escolha de quem
 * chama; a conta da data fica aqui porque `Date.now()` no corpo de um componente
 * é chamada impura — o React Compiler recusa, e com razão.
 */
export async function getStudyMinutesInLastDays(days: number): Promise<number> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const { _sum } = await prisma.studySession.aggregate({
    where: { endedAt: { gte: since } },
    _sum: { durationMinutes: true },
  });

  return _sum.durationMinutes ?? 0;
}

/**
 * Ritmo: últimos 7 dias contra os 7 anteriores.
 *
 * Janela deslizante, não semana civil, para casar com o texto que o card do
 * dashboard já usa ("Últimos 7 dias") — e porque a pergunta real é "estou
 * estudando menos do que vinha estudando", que não espera domingo para valer.
 */
export async function getWeeklyPace(): Promise<Pace> {
  const agora = Date.now();
  const DIA = 24 * 60 * 60 * 1000;
  const inicioAtual = new Date(agora - 7 * DIA);
  const inicioAnterior = new Date(agora - 14 * DIA);

  const [atual, anterior] = await Promise.all([
    prisma.studySession.aggregate({
      where: { endedAt: { gte: inicioAtual } },
      _sum: { durationMinutes: true },
    }),
    prisma.studySession.aggregate({
      where: { endedAt: { gte: inicioAnterior, lt: inicioAtual } },
      _sum: { durationMinutes: true },
    }),
  ]);

  return comparePace(
    atual._sum.durationMinutes ?? 0,
    anterior._sum.durationMinutes ?? 0,
  );
}
