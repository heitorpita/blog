import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const updatePostSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  content: z.string().trim().min(1).optional(),
  excerpt: z.string().trim().max(300).nullish(),
  subjectId: z.string().trim().min(1).nullish(),
});

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/journal/[slug]">) {
  const { slug } = await ctx.params;
  const post = await prisma.journalPost.findUnique({ where: { slug } });

  if (!post) {
    return Response.json({ error: "Post não encontrado" }, { status: 404 });
  }

  return Response.json(post);
}

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/journal/[slug]">) {
  const { slug } = await ctx.params;
  const parsed = updatePostSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  const post = await prisma.journalPost.update({
    where: { slug },
    data: parsed.data,
  });

  return Response.json(post);
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/journal/[slug]">) {
  const { slug } = await ctx.params;
  await prisma.journalPost.delete({ where: { slug } });
  return new Response(null, { status: 204 });
}
