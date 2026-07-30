import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { requireSession } from "@/lib/session";
import { listJournalPosts } from "@/lib/queries/journal";
import { formatDate } from "@/lib/format";

export default async function JournalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession();

  const posts = await listJournalPosts();

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      <nav className="lg:w-56 lg:shrink-0">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-serif text-lg text-foreground">Jornada</h2>
          <Link
            href="/journal/new"
            className={buttonClasses("secondary", "px-2.5 py-1 text-xs")}
          >
            Novo post
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
