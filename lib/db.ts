import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@/lib/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pool?: Pool;
};

const pool =
  globalForPrisma.pool ?? new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Consultas lentas aparecem no terminal em desenvolvimento.
 *
 * A régua antes da otimização: `getStreak()` e `getTotalXp()` rodam em TODA
 * página (o shell os chama), e `buildGraph()` monta o grafo inteiro na home.
 * Com os volumes de um semestre isso é irrelevante, então não vale reescrever
 * consulta nenhuma no escuro — vale saber o número. Se algo passar do limiar de
 * forma consistente, aí sim há o que otimizar.
 */
const SLOW_QUERY_MS = 50;

/**
 * O tipo do client só expõe `$on("query")` quando o genérico de log é fixado, e
 * fixá-lo estraga a inferência dos payloads no app inteiro. O cast fica confinado
 * a esta assinatura, e só é usado em desenvolvimento.
 */
type QueryLogger = {
  $on: (event: "query", callback: (event: Prisma.QueryEvent) => void) => void;
};

function createClient(): PrismaClient {
  const isDev = process.env.NODE_ENV !== "production";

  const client = new PrismaClient({
    adapter: new PrismaPg(pool),
    log: isDev ? [{ emit: "event", level: "query" }] : [],
  });

  if (isDev) {
    (client as unknown as QueryLogger).$on("query", (event) => {
      if (event.duration < SLOW_QUERY_MS) return;
      console.warn(`[prisma] ${event.duration}ms · ${event.query.slice(0, 160)}`);
    });
  }

  return client;
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.pool = pool;
  globalForPrisma.prisma = prisma;
}
