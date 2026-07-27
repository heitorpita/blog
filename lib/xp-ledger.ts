import { prisma } from "@/lib/db";
import type { XpSource } from "@/lib/generated/prisma/enums";

type XpEventInput = {
  source: XpSource;
  amount: number;
  description: string;
  subjectId?: string | null;
  taskId?: string | null;
  topicId?: string | null;
  sessionId?: string | null;
};

/** Registra XP no ledger. O total do personagem é sempre a soma dos eventos. */
export async function recordXp(input: XpEventInput) {
  return prisma.xpEvent.create({ data: input });
}

/**
 * Estorna o XP de uma origem apagando o evento em vez de gravar um valor
 * negativo — assim o feed de eventos não acumula ruído de idas e voltas.
 */
export async function revokeXp(where: { taskId?: string; topicId?: string }) {
  return prisma.xpEvent.deleteMany({ where });
}

/**
 * Concede o bônus de um marco de streak, se ainda não foi concedido.
 * O próprio evento é o registro de "já ganhou": a descrição carrega o marco,
 * então não precisa de campo extra no schema para evitar duplicata.
 */
export async function awardStreakMilestone(days: number, amount: number) {
  const description = `Streak de ${days} dias`;

  const already = await prisma.xpEvent.findFirst({
    where: { source: "STREAK", description },
    select: { id: true },
  });

  if (already) return null;

  return recordXp({ source: "STREAK", amount, description });
}

export async function getTotalXp() {
  const { _sum } = await prisma.xpEvent.aggregate({ _sum: { amount: true } });
  return _sum.amount ?? 0;
}
