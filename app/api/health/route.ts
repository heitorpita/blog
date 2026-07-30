import { prisma } from "@/lib/db";

// Sonda de saúde do container. NÃO exige sessão de propósito: quem chama é o
// Docker/Coolify, que não tem cookie. Em compensação não devolve nada além de
// "consigo ou não falar com o banco" — nenhum dado, nenhuma versão, nenhum
// detalhe de erro que ajude quem estiver fuçando de fora.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    return Response.json({ status: "sem banco" }, { status: 503 });
  }

  return Response.json({ status: "ok" });
}
