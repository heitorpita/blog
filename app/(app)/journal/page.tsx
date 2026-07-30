import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/lib/session";
import { formatDate } from "@/lib/format";

export default async function JournalPage() {
  await requireSession();

  const posts = await prisma.journalPost.findMany({
    orderBy: { publishedAt: "desc" },
    include: { subject: { select: { name: true, color: true } } },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl text-foreground">Diário de estudos</h1>
        <p className="mt-1 text-sm text-muted">
          Registros do que você aprendeu, organizados por data e matéria.
        </p>
      </header>

      {posts.length === 0 && (
        <Card className="text-sm text-muted">
          Nenhum post ainda. Comece escrevendo o primeiro registro da sua jornada.
        </Card>
      )}

      <div className="space-y-4">
        {posts.map((post) => (
          <Link key={post.id} href={`/journal/${post.slug}`} className="block">
            <Card className="transition-colors hover:border-accent/40">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span>{formatDate(post.publishedAt)}</span>
                {post.subject && (
                  <Badge
                    style={{
                      backgroundColor: `${post.subject.color}22`,
                      color: post.subject.color,
                    }}
                  >
                    {post.subject.name}
                  </Badge>
                )}
              </div>
              <h2 className="mt-2 font-serif text-xl text-foreground">{post.title}</h2>
              {post.excerpt && (
                <p className="mt-2 line-clamp-2 text-sm text-muted">{post.excerpt}</p>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
