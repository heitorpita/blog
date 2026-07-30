import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PostEditor } from "@/components/journal/post-editor";
import { requireSession } from "@/lib/session";

export default async function EditJournalPostPage({
  params,
}: PageProps<"/journal/[slug]/edit">) {
  await requireSession();

  const { slug } = await params;

  const [post, subjects] = await Promise.all([
    prisma.journalPost.findUnique({
      where: { slug },
      select: { slug: true, title: true, content: true, subjectId: true },
    }),
    prisma.subject.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!post) notFound();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl text-foreground">Editar post</h1>
        <p className="mt-1 text-sm text-muted">
          O endereço do post não muda ao renomear o título — links [[wiki]] que já apontam
          para ele continuam funcionando.
        </p>
      </header>

      <PostEditor subjects={subjects} post={post} />
    </div>
  );
}
