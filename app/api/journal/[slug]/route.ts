import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { readJson } from "@/lib/http";
import { denyWithoutSession } from "@/lib/session";
import { parseWikiLinks } from "@/lib/wikilinks";

const updatePostSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  content: z.string().trim().min(1).optional(),
  excerpt: z.string().trim().max(300).nullish(),
  subjectId: z.string().trim().min(1).nullish(),
});

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/journal/[slug]">) {
  const denied = await denyWithoutSession();
  if (denied) return denied;

  const { slug } = await ctx.params;
  const post = await prisma.journalPost.findUnique({ where: { slug } });

  if (!post) {
    return Response.json({ error: "Post não encontrado" }, { status: 404 });
  }

  return Response.json(post);
}

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/journal/[slug]">) {
  const denied = await denyWithoutSession();
  if (denied) return denied;

  const { slug } = await ctx.params;
  const body = await readJson(request, updatePostSchema);
  if (!body.ok) return body.response;

  // Sem esta checagem o Prisma lança P2025 e a rota devolve 500, enquanto todas
  // as outras devolvem 404 para recurso inexistente.
  if (!(await prisma.journalPost.findUnique({ where: { slug }, select: { id: true } }))) {
    return Response.json({ error: "Post não encontrado" }, { status: 404 });
  }

  const post = await prisma.journalPost.update({
    where: { slug },
    data: {
      ...body.data,
      // Editar o conteúdo reescreve os backlinks do zero: é mais simples e
      // confiável que tentar casar quais mudaram.
      ...(body.data.content !== undefined && {
        links: {
          deleteMany: {},
          create: parseWikiLinks(body.data.content).map((target) => ({ target })),
        },
      }),
    },
  });

  return Response.json(post);
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/journal/[slug]">) {
  const denied = await denyWithoutSession();
  if (denied) return denied;

  const { slug } = await ctx.params;

  if (!(await prisma.journalPost.findUnique({ where: { slug }, select: { id: true } }))) {
    return Response.json({ error: "Post não encontrado" }, { status: 404 });
  }

  // Os backlinks (JournalLink) saem junto via ON DELETE CASCADE.
  await prisma.journalPost.delete({ where: { slug } });

  return new Response(null, { status: 204 });
}
