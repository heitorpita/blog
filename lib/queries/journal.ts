import { cache } from "react";
import { prisma } from "@/lib/db";

/**
 * Posts da Jornada, do mais recente para o mais antigo.
 *
 * O layout (a sidebar) e a página de índice pediam esta mesma lista no mesmo
 * render — duas idas ao banco para o mesmo resultado. O `cache` do React
 * memoiza por requisição e colapsa em uma. A memoização não atravessa
 * requisições: post novo aparece no `router.refresh()` seguinte, sem
 * invalidação manual.
 */
export const listJournalPosts = cache(async () => {
  return prisma.journalPost.findMany({
    orderBy: { publishedAt: "desc" },
    include: { subject: { select: { name: true, color: true } } },
  });
});
