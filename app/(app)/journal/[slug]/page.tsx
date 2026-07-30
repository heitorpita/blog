import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/journal/markdown";
import { requireSession } from "@/lib/session";
import { extractToc } from "@/lib/toc";
import { formatDate } from "@/lib/format";

export default async function JournalPostPage({ params }: PageProps<"/journal/[slug]">) {
  await requireSession();

  const { slug } = await params;

  const post = await prisma.journalPost.findUnique({
    where: { slug },
    include: { subject: { select: { name: true, color: true } } },
  });

  if (!post) notFound();

  const toc = extractToc(post.content);

  return (
    <article className="flex flex-col gap-8 2xl:flex-row">
      {toc.length > 0 && (
        <nav className="order-last 2xl:w-52 2xl:shrink-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Nesta página
          </p>
          <ul className="mt-3 space-y-1.5 border-l border-border pl-3 text-sm">
            {toc.map((entry) => (
              <li key={entry.slug} style={{ paddingLeft: (entry.depth - 2) * 12 }}>
                <a
                  href={`#${entry.slug}`}
                  className="text-muted transition-colors hover:text-foreground"
                >
                  {entry.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="min-w-0 flex-1">
        <header className="mb-6 space-y-3">
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
          <h1 className="font-serif text-3xl leading-tight text-foreground">{post.title}</h1>
        </header>

        <div className="prose prose-journal max-w-none prose-headings:font-serif prose-pre:bg-surface-raised">
          <Markdown>{post.content}</Markdown>
        </div>
      </div>
    </article>
  );
}
