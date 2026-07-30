"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { fetchJson, jsonBody } from "@/lib/fetch-json";

type SubjectOption = { id: string; name: string };

function renderPreview(markdown: string) {
  return markdown
    .split("\n\n")
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, index) => {
      const heading = /^(#{1,4})\s+(.*)$/.exec(block);
      if (heading) {
        const level = heading[1].length;
        const sizes = ["text-2xl", "text-xl", "text-lg", "text-base"];
        return (
          <p key={index} className={`font-serif ${sizes[level - 1]} text-foreground`}>
            {heading[2]}
          </p>
        );
      }
      return (
        <p key={index} className="text-sm leading-relaxed text-muted">
          {block}
        </p>
      );
    });
}

export function PostEditor({ subjects }: { subjects: SubjectOption[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const result = await fetchJson<{ slug: string }>(
      "/api/journal",
      jsonBody("POST", { title, content, subjectId: subjectId || null }),
    );

    setSaving(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    router.push(`/journal/${result.data.slug}`);
    router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Título do post"
          className="rounded-md border border-border bg-surface px-3 py-2 font-serif text-lg text-foreground outline-none placeholder:text-muted focus:border-accent"
        />
        <select
          value={subjectId}
          onChange={(event) => setSubjectId(event.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
        >
          <option value="">Sem matéria</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder={"## Tópico\n\nO que estudei hoje…"}
          rows={20}
          className="rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground outline-none placeholder:text-muted focus:border-accent"
        />
        <div className="min-h-40 space-y-3 overflow-auto rounded-md border border-border bg-surface p-4">
          {content.trim() ? (
            renderPreview(content)
          ) : (
            <p className="text-sm text-muted">A prévia aparece aqui.</p>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <Button type="submit" disabled={saving || !title.trim() || !content.trim()}>
        {saving ? "Publicando…" : "Publicar"}
      </Button>
    </form>
  );
}
