"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Button } from "@/components/ui/button";
import { fetchJson, jsonBody } from "@/lib/fetch-json";
import { TOPIC_COMPLETION_XP } from "@/lib/xp";

export type TopicItem = {
  id: string;
  title: string;
  completed: boolean;
};

export function TopicChecklist({
  subjectId,
  topics,
  accentColor,
}: {
  subjectId: string;
  topics: TopicItem[];
  accentColor: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [xpToast, setXpToast] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function toggle(topic: TopicItem) {
    setError(null);
    setBusyId(topic.id);
    const result = await fetchJson(
      `/api/topics/${topic.id}`,
      jsonBody("PATCH", { completed: !topic.completed }),
    );
    setBusyId(null);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    // Só comemora depois que o servidor confirmou que o XP entrou.
    if (!topic.completed) {
      setXpToast(TOPIC_COMPLETION_XP);
      setTimeout(() => setXpToast(null), 1800);
    }

    refresh();
  }

  async function addTopic(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;

    setError(null);
    const result = await fetchJson(
      `/api/subjects/${subjectId}/topics`,
      jsonBody("POST", { title }),
    );

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setTitle("");
    refresh();
  }

  async function removeTopic(topic: TopicItem) {
    // Tópico estudado carrega XP; excluir devolve em cascata, e o nível cai.
    const aviso = topic.completed
      ? `Excluir "${topic.title}"? Os ${TOPIC_COMPLETION_XP} XP de tê-lo estudado voltam atrás.`
      : `Excluir "${topic.title}"?`;

    if (!window.confirm(aviso)) return;

    setError(null);
    setBusyId(topic.id);
    const result = await fetchJson(`/api/topics/${topic.id}`, jsonBody("DELETE"));
    setBusyId(null);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    refresh();
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl text-foreground">Tópicos da ementa</h2>
        {xpToast !== null && (
          <span className="animate-pulse text-sm font-semibold text-emerald-400">
            +{xpToast} XP
          </span>
        )}
      </div>

      <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
        {topics.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-muted">
            Nenhum tópico ainda. Adicione os itens da ementa abaixo.
          </li>
        )}

        {topics.map((topic) => (
          <li
            key={topic.id}
            className={clsx(
              "group flex items-center gap-3 px-4 py-2.5 transition-opacity",
              busyId === topic.id && "opacity-60",
            )}
          >
            <button
              type="button"
              onClick={() => toggle(topic)}
              disabled={busyId === topic.id}
              aria-pressed={topic.completed}
              aria-label={`Marcar "${topic.title}" como estudado`}
              className={clsx(
                "flex size-4 shrink-0 items-center justify-center rounded border-2 transition-colors",
                topic.completed ? "border-transparent" : "border-muted hover:border-accent",
              )}
              style={topic.completed ? { backgroundColor: accentColor } : undefined}
            >
              {topic.completed && (
                <svg viewBox="0 0 12 12" className="size-3 text-[#0f0f14]" aria-hidden="true">
                  <path
                    d="M2.5 6.5l2.5 2.5 4.5-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>

            <span
              className={clsx(
                "min-w-0 flex-1 truncate text-sm",
                topic.completed ? "text-muted line-through" : "text-foreground",
              )}
            >
              {topic.title}
            </span>

            <button
              type="button"
              onClick={() => removeTopic(topic)}
              disabled={busyId === topic.id}
              aria-label={`Excluir tópico "${topic.title}"`}
              className="text-muted opacity-0 transition-opacity hover:text-rose-400 focus:opacity-100 group-hover:opacity-100"
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="text-sm text-rose-400">
          {error}
        </p>
      )}

      <form onSubmit={addTopic} className="flex gap-2">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Adicionar tópico"
          className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent"
        />
        <Button type="submit" variant="secondary" disabled={isPending || !title.trim()}>
          Adicionar tópico
        </Button>
      </form>
    </section>
  );
}
