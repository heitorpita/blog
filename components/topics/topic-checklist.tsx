"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Button } from "@/components/ui/button";
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

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function toggle(topic: TopicItem) {
    await fetch(`/api/topics/${topic.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !topic.completed }),
    });

    if (!topic.completed) {
      setXpToast(TOPIC_COMPLETION_XP);
      setTimeout(() => setXpToast(null), 1800);
    }

    refresh();
  }

  async function addTopic(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;

    await fetch(`/api/subjects/${subjectId}/topics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });

    setTitle("");
    refresh();
  }

  async function removeTopic(id: string) {
    await fetch(`/api/topics/${id}`, { method: "DELETE" });
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
          <li key={topic.id} className="group flex items-center gap-3 px-4 py-2.5">
            <button
              type="button"
              onClick={() => toggle(topic)}
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
              onClick={() => removeTopic(topic.id)}
              aria-label={`Excluir tópico "${topic.title}"`}
              className="text-muted opacity-0 transition-opacity hover:text-rose-400 focus:opacity-100 group-hover:opacity-100"
            >
              ×
            </button>
          </li>
        ))}
      </ul>

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
