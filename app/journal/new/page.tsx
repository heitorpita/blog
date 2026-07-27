import { prisma } from "@/lib/db";
import { PostEditor } from "@/components/journal/post-editor";

export default async function NewJournalPostPage() {
  const subjects = await prisma.subject.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl text-foreground">Novo post</h1>
        <p className="mt-1 text-sm text-muted">
          Escreva em Markdown — a prévia aparece ao lado.
        </p>
      </header>

      <PostEditor subjects={subjects} />
    </div>
  );
}
