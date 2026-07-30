import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { readJson } from "@/lib/http";
import { denyWithoutSession } from "@/lib/session";
import { slugify } from "@/lib/slug";
import { parseWikiLinks } from "@/lib/wikilinks";

const createPostSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1),
  excerpt: z.string().trim().max(300).nullish(),
  subjectId: z.string().trim().min(1).nullish(),
});

export async function GET(request: NextRequest) {
  const denied = await denyWithoutSession();
  if (denied) return denied;

  const subjectId = request.nextUrl.searchParams.get("subjectId");

  const posts = await prisma.journalPost.findMany({
    where: subjectId ? { subjectId } : undefined,
    orderBy: { publishedAt: "desc" },
  });

  return Response.json(posts);
}

export async function POST(request: NextRequest) {
  const denied = await denyWithoutSession();
  if (denied) return denied;

  const body = await readJson(request, createPostSchema);
  if (!body.ok) return body.response;

  const { title, content, excerpt, subjectId } = body.data;
  const baseSlug = slugify(title) || "post";

  const existingSlugs = await prisma.journalPost.findMany({
    where: { slug: { startsWith: baseSlug } },
    select: { slug: true },
  });

  const taken = new Set(existingSlugs.map((post) => post.slug));
  let slug = baseSlug;
  let suffix = 2;
  while (taken.has(slug)) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const post = await prisma.journalPost.create({
    data: {
      slug,
      title,
      content,
      excerpt: excerpt ?? content.replace(/[#*_`>[\]-]/g, "").trim().slice(0, 180),
      subjectId: subjectId ?? null,
      links: { create: parseWikiLinks(content).map((target) => ({ target })) },
    },
  });

  return Response.json(post, { status: 201 });
}
