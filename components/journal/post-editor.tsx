"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/journal/markdown";
import { fetchJson, jsonBody } from "@/lib/fetch-json";

type SubjectOption = { id: string; name: string };

/** Presente = editando um post existente; ausente = escrevendo um novo. */
export type EditingPost = {
  slug: string;
  title: string;
  content: string;
  subjectId: string | null;
};

export function PostEditor({
  subjects,
  post,
}: {
  subjects: SubjectOption[];
  post?: EditingPost;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(post?.title ?? "");
  const [subjectId, setSubjectId] = useState(post?.subjectId ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const payload = { title, content, subjectId: subjectId || null };

    // Editar mantém o slug de propósito: ele já pode estar em links [[wiki]] de
    // outros posts e em endereços salvos. Renomear o título não deve quebrá-los.
    const result = post
      ? await fetchJson<{ slug: string }>(`/api/journal/${post.slug}`, jsonBody("PATCH", payload))
      : await fetchJson<{ slug: string }>("/api/journal", jsonBody("POST", payload));

    setSaving(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    router.push(`/journal/${result.data.slug}`);
    router.refresh();
  }

  async function remove() {
    if (!post) return;

    if (!window.confirm(`Excluir "${post.title}"? Não dá para desfazer.`)) return;

    setSaving(true);
    setError(null);

    const result = await fetchJson(`/api/journal/${post.slug}`, jsonBody("DELETE"));

    if (!result.ok) {
      setSaving(false);
      setError(result.message);
      return;
    }

    router.push("/journal");
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
        {/* Mesmo componente da leitura do post: o que aparece aqui é exatamente
            o que vai ser publicado. */}
        <div className="prose prose-journal min-h-40 max-w-none overflow-auto rounded-md border border-border bg-surface p-4 prose-headings:font-serif prose-pre:bg-surface-raised">
          {content.trim() ? (
            <Markdown>{content}</Markdown>
          ) : (
            <p className="text-sm text-muted">A prévia aparece aqui.</p>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-rose-400">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={saving || !title.trim() || !content.trim()}>
          {saving ? "Salvando…" : post ? "Salvar alterações" : "Publicar"}
        </Button>

        {post && (
          <Button
            type="button"
            variant="ghost"
            onClick={remove}
            disabled={saving}
            className="ml-auto text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
          >
            Excluir post
          </Button>
        )}
      </div>
    </form>
  );
}
