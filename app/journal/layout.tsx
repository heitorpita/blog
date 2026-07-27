import Link from "next/link";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

export default async function JournalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const posts = await prisma.journalPost.findMany({
    orderBy: { publishedAt: "desc" },
    include: { subject: { select: { name: true, color: true } } },
  });

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      <nav className="lg:w-56 lg:shrink-0">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-serif text-lg text-foreground">Jornada</h2>
          <Link href="/journal/new">
            <Button variant="secondary" className="px-2.5 py-1 text-xs">
              Novo post
            </Button>
          </Link>
        </div>

        <ul className="mt-4 space-y-1 border-l border-border pl-3">
          {posts.length === 0 && <li className="text-xs text-muted">Nenhum post ainda.</li>}
          {posts.map((post) => (
            <li key={post.id}>
              <Link
                href={`/journal/${post.slug}`}
                className="block rounded px-2 py-1.5 text-sm text-muted transition-colors hover:bg-surface-raised hover:text-foreground"
              >
                <span className="line-clamp-2">{post.title}</span>
                <span className="mt-0.5 block text-xs text-muted/70">
                  {formatDate(post.publishedAt)}
                  {post.subject ? ` · ${post.subject.name}` : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
