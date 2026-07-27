"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TASK_XP_PRESETS } from "@/lib/xp";

export type TaskItem = {
  id: string;
  title: string;
  topic: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "PENDING" | "IN_PROGRESS" | "DONE";
  xp: number;
};

const PRIORITY_LABEL = { LOW: "Baixa", MEDIUM: "Média", HIGH: "Alta" } as const;
const PRIORITY_TONE = { LOW: "neutral", MEDIUM: "warning", HIGH: "danger" } as const;
const STATUS_ORDER = ["PENDING", "IN_PROGRESS", "DONE"] as const;
const STATUS_LABEL = {
  PENDING: "Pendente",
  IN_PROGRESS: "Em progresso",
  DONE: "Concluída",
} as const;

export function TaskManager({
  subjectId,
  topics,
  tasks,
  accentColor,
}: {
  subjectId: string;
  topics: string[];
  tasks: TaskItem[];
  accentColor: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [priority, setPriority] = useState<TaskItem["priority"]>("MEDIUM");
  const [xp, setXp] = useState<number>(TASK_XP_PRESETS.quick);
  const [xpToast, setXpToast] = useState<number | null>(null);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function createTask(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;

    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        subjectId,
        topic: topic || null,
        priority,
        xp,
      }),
    });

    setTitle("");
    setTopic("");
    refresh();
  }

  async function cycleStatus(task: TaskItem) {
    const nextIndex = (STATUS_ORDER.indexOf(task.status) + 1) % STATUS_ORDER.length;
    const nextStatus = STATUS_ORDER[nextIndex];

    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });

    if (nextStatus === "DONE") {
      setXpToast(task.xp);
      setTimeout(() => setXpToast(null), 1800);
    }

    refresh();
  }

  async function removeTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    refresh();
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl text-foreground">Tarefas</h2>
        {xpToast !== null && (
          <span className="animate-pulse text-sm font-semibold text-emerald-400">
            +{xpToast} XP
          </span>
        )}
      </div>

      <form
        onSubmit={createTask}
        className="grid gap-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-[1fr_auto]"
      >
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Nova tarefa"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent"
        />
        <Button type="submit" disabled={isPending || !title.trim()}>
          Adicionar
        </Button>

        <div className="grid gap-3 sm:col-span-2 sm:grid-cols-3">
          <select
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
          >
            <option value="">Sem tópico</option>
            {topics.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value as TaskItem["priority"])}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
          >
            <option value="LOW">Prioridade baixa</option>
            <option value="MEDIUM">Prioridade média</option>
            <option value="HIGH">Prioridade alta</option>
          </select>

          <select
            value={xp}
            onChange={(event) => setXp(Number(event.target.value))}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
          >
            <option value={TASK_XP_PRESETS.quick}>{TASK_XP_PRESETS.quick} XP · rápida</option>
            <option value={TASK_XP_PRESETS.standard}>
              {TASK_XP_PRESETS.standard} XP · padrão
            </option>
            <option value={TASK_XP_PRESETS.topicReview}>
              {TASK_XP_PRESETS.topicReview} XP · revisão de tópico
            </option>
          </select>
        </div>
      </form>

      <ul className="space-y-2">
        {tasks.length === 0 && (
          <li className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted">
            Nenhuma tarefa ainda.
          </li>
        )}

        {tasks.map((task) => (
          <li
            key={task.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3"
          >
            <button
              type="button"
              onClick={() => cycleStatus(task)}
              title={`Status: ${STATUS_LABEL[task.status]}`}
              className={clsx(
                "size-4 shrink-0 rounded-full border-2 transition-colors",
                task.status === "DONE" && "border-transparent",
                task.status === "IN_PROGRESS" && "border-amber-400",
                task.status === "PENDING" && "border-muted",
              )}
              style={
                task.status === "DONE" ? { backgroundColor: accentColor } : undefined
              }
            />

            <div className="min-w-0 flex-1">
              <p
                className={clsx(
                  "truncate text-sm",
                  task.status === "DONE" ? "text-muted line-through" : "text-foreground",
                )}
              >
                {task.title}
              </p>
              {task.topic && <p className="truncate text-xs text-muted">{task.topic}</p>}
            </div>

            <Badge tone={PRIORITY_TONE[task.priority]}>{PRIORITY_LABEL[task.priority]}</Badge>
            <span className="text-xs text-muted">{task.xp} XP</span>

            <Button variant="ghost" onClick={() => removeTask(task.id)} aria-label="Excluir">
              ×
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
