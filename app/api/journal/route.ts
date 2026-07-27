import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/slug";

const createPostSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1),
  excerpt: z.string().trim().max(300).nullish(),
  subjectId: z.string().trim().min(1).nullish(),
});

export async function GET(request: NextRequest) {
  const subjectId = request.nextUrl.searchParams.get("subjectId");

  const posts = await prisma.journalPost.findMany({
    where: subjectId ? { subjectId } : undefined,
    orderBy: { publishedAt: "desc" },
  });

  return Response.json(posts);
}

export async function POST(request: NextRequest) {
  const parsed = createPostSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { title, content, excerpt, subjectId } = parsed.data;
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
      excerpt: excerpt ?? content.replace(/[#*_`>-]/g, "").trim().slice(0, 180),
      subjectId: subjectId ?? null,
    },
  });

  return Response.json(post, { status: 201 });
}
