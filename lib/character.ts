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

export async function getTotalXp() {
  const { _sum } = await prisma.xpEvent.aggregate({ _sum: { amount: true } });
  return _sum.amount ?? 0;
}

export async function getCharacter() {
  return { totalXp: await getTotalXp() };
}
