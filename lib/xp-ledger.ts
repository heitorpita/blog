import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { XpSource } from "@/lib/generated/prisma/enums";

/**
 * Aceita tanto o client normal quanto o de dentro de `$transaction`. Toda
 * escrita de XP acontece na mesma transação da mutação que a originou: se uma
 * falhar, a outra não fica para trás.
 */
export type XpDb = Prisma.TransactionClient;

type XpEventInput = {
  source: XpSource;
  amount: number;
  description: string;
  subjectId?: string | null;
  taskId?: string | null;
  topicId?: string | null;
  sessionId?: string | null;
  milestoneDays?: number | null;
};

/** Registra XP no ledger. O total do personagem é sempre a soma dos eventos. */
export async function recordXp(input: XpEventInput, db: XpDb = prisma) {
  return db.xpEvent.create({ data: input });
}

/**
 * Estorna o XP de uma origem apagando o evento em vez de gravar um valor
 * negativo — assim o feed de eventos não acumula ruído de idas e voltas.
 *
 * O tipo é uma união fechada de propósito: com `{ taskId?, topicId? }` uma
 * chamada com objeto vazio viraria `deleteMany({ where: {} })`, que apaga o
 * ledger inteiro. O guard em runtime cobre o caso de o valor chegar `undefined`
 * apesar do tipo (dado vindo de JSON, por exemplo).
 */
export async function revokeXp(
  where: { taskId: string } | { topicId: string },
  db: XpDb = prisma,
) {
  const id = "taskId" in where ? where.taskId : where.topicId;

  if (!id) {
    throw new Error("revokeXp exige taskId ou topicId — recusando apagar o ledger inteiro");
  }

  return db.xpEvent.deleteMany({ where });
}

/**
 * Concede o bônus de um marco de streak, uma vez só.
 *
 * A unicidade é do banco (`@@unique([milestoneDays])`), não de uma consulta
 * antes de gravar: o findFirst+create anterior tinha corrida, e usava a string
 * da descrição como chave — bastava renomear "Streak de 7 dias" para todos os
 * bônus históricos serem concedidos de novo.
 */
export async function awardStreakMilestone(days: number, amount: number, db: XpDb = prisma) {
  const existing = await db.xpEvent.findUnique({
    where: { milestoneDays: days },
    select: { id: true },
  });

  if (existing) return null;

  try {
    return await recordXp(
      {
        source: "STREAK",
        amount,
        description: `Streak de ${days} dias`,
        milestoneDays: days,
      },
      db,
    );
  } catch {
    // Corrida perdida: outro pedido gravou o mesmo marco entre a checagem e o
    // insert. O bônus já está no ledger, que é o resultado desejado.
    return null;
  }
}

export async function getTotalXp() {
  const { _sum } = await prisma.xpEvent.aggregate({ _sum: { amount: true } });
  return _sum.amount ?? 0;
}
