import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/slug";

const createSubjectSchema = z.object({
  name: z.string().trim().min(1).max(200),
  code: z.string().trim().min(1).max(30),
  hours: z.number().int().min(0).max(1000).default(60),
  teacher: z.string().trim().max(200).default("A definir"),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Cor deve estar no formato #rrggbb")
    .default("#7c9dff"),
  topics: z.array(z.string().trim().min(1).max(200)).max(100).default([]),
});

export async function GET() {
  const subjects = await prisma.subject.findMany({
    orderBy: { name: "asc" },
    include: { topics: { orderBy: { order: "asc" } } },
  });

  return Response.json(subjects);
}

export async function POST(request: NextRequest) {
  const parsed = createSubjectSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { topics, ...subject } = parsed.data;
  const baseId = slugify(subject.name) || slugify(subject.code) || "materia";

  const taken = new Set(
    (
      await prisma.subject.findMany({
        where: { id: { startsWith: baseId } },
        select: { id: true },
      })
    ).map((item) => item.id),
  );

  let id = baseId;
  let suffix = 2;
  while (taken.has(id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }

  const created = await prisma.subject.create({
    data: {
      id,
      ...subject,
      topics: {
        create: topics.map((title, index) => ({ title, order: index })),
      },
    },
    include: { topics: { orderBy: { order: "asc" } } },
  });

  return Response.json(created, { status: 201 });
}
