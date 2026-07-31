"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { fetchJson, jsonBody } from "@/lib/fetch-json";
import { formatMinutes } from "@/lib/format";
import { TOPIC_COMPLETION_XP } from "@/lib/xp";

export type TopicItem = {
  id: string;
  title: string;
  completed: boolean;
  /** Minutos de estudo lançados neste tópico. */
  minutes: number;
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
  const { confirm, dialog } = useConfirm();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [colando, setColando] = useState(false);
  const [xpToast, setXpToast] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // O checkbox responde na hora em vez de esperar o ida-e-volta com o servidor
  // e o re-render da página inteira. Se a requisição falhar, o React desfaz
  // sozinho ao terminar a transição — o estado volta a ser o do servidor.
  const [optimistic, applyOptimistic] = useOptimistic(
    topics,
    (current: TopicItem[], change: { id: string; completed: boolean }) =>
      current.map((topic) =>
        topic.id === change.id ? { ...topic, completed: change.completed } : topic,
      ),
  );

  // Modo de seleção: enquanto ativo, o checkbox da esquerda seleciona em vez de
  // marcar como estudado. Dois checkboxes por linha confundiriam mais do que
  // ajudam — o texto riscado continua mostrando o que já foi estudado.
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function exitSelection() {
    setSelecting(false);
    setSelected(new Set());
  }

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allSelected = optimistic.length > 0 && selected.size === optimistic.length;

  function toggle(topic: TopicItem) {
    setError(null);

    startTransition(async () => {
      applyOptimistic({ id: topic.id, completed: !topic.completed });

      const result = await fetchJson(
        `/api/topics/${topic.id}`,
        jsonBody("PATCH", { completed: !topic.completed }),
      );

      if (!result.ok) {
        setError(result.message);
        return;
      }

      if (!topic.completed) {
        setXpToast(TOPIC_COMPLETION_XP);
        setTimeout(() => setXpToast(null), 1800);
      }

      router.refresh();
    });
  }

  async function addTopics(event: React.FormEvent) {
    event.preventDefault();

    // Colar a ementa inteira: uma linha por tópico, vazias descartadas.
    const titles = title
      .split("\n")
      .map((linha) => linha.trim())
      .filter(Boolean);

    if (titles.length === 0) return;

    setError(null);
    const result = await fetchJson<{ created: number; skipped: number }>(
      `/api/subjects/${subjectId}/topics`,
      jsonBody("POST", { titles }),
    );

    if (!result.ok) {
      setError(result.message);
      return;
    }

    if (result.data.created === 0) {
      setError("Esses tópicos já estão na ementa.");
      return;
    }

    if (result.data.skipped > 0) {
      setError(`${result.data.created} adicionados · ${result.data.skipped} já existiam.`);
    }

    setTitle("");
    setColando(false);
    startTransition(() => router.refresh());
  }

  async function removeTopic(topic: TopicItem) {
    const ok = await confirm({
      title: `Excluir "${topic.title}"?`,
      description: topic.completed
        ? `Os ${TOPIC_COMPLETION_XP} XP de tê-lo estudado voltam atrás.`
        : undefined,
      confirmLabel: "Excluir",
      tone: "danger",
    });

    if (!ok) return;

    setError(null);
    setBusyId(topic.id);
    const result = await fetchJson(`/api/topics/${topic.id}`, jsonBody("DELETE"));
    setBusyId(null);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    startTransition(() => router.refresh());
  }

  async function removeSelected() {
    const alvos = optimistic.filter((topic) => selected.has(topic.id));
    if (alvos.length === 0) return;

    const estudados = alvos.filter((topic) => topic.completed).length;
    const xpPerdido = estudados * TOPIC_COMPLETION_XP;

    const ok = await confirm({
      title:
        alvos.length === 1
          ? `Excluir "${alvos[0].title}"?`
          : `Excluir ${alvos.length} tópicos?`,
      description:
        estudados > 0
          ? `${estudados} ${estudados === 1 ? "está estudado" : "estão estudados"} — ${xpPerdido} XP voltam atrás.\nNão dá para desfazer.`
          : "Não dá para desfazer.",
      confirmLabel: `Excluir ${alvos.length}`,
      tone: "danger",
    });

    if (!ok) return;

    setError(null);
    const result = await fetchJson(
      `/api/subjects/${subjectId}/topics`,
      jsonBody("DELETE", { ids: alvos.map((topic) => topic.id) }),
    );

    if (!result.ok) {
      setError(result.message);
      return;
    }

    exitSelection();
    startTransition(() => router.refresh());
  }

  return (
    <section className="space-y-4">
      {dialog}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-serif text-xl text-foreground">Tópicos da ementa</h2>

        <div className="flex items-center gap-2">
          {xpToast !== null && (
            <span className="animate-pulse text-sm font-semibold text-emerald-400">
              +{xpToast} XP
            </span>
          )}

          {optimistic.length > 0 &&
            (selecting ? (
              <Button variant="ghost" className="px-2.5 py-1 text-xs" onClick={exitSelection}>
                Cancelar
              </Button>
            ) : (
              <Button
                variant="secondary"
                className="px-2.5 py-1 text-xs"
                onClick={() => setSelecting(true)}
              >
                Selecionar
              </Button>
            ))}
        </div>
      </div>

      {selecting && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-raised px-4 py-2.5">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() =>
                setSelected(allSelected ? new Set() : new Set(optimistic.map((t) => t.id)))
              }
              className="size-4 accent-accent"
            />
            Selecionar todos
          </label>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted">
              {selected.size} de {optimistic.length}
            </span>
            <Button
              variant="danger"
              className="px-2.5 py-1 text-xs"
              onClick={removeSelected}
              disabled={selected.size === 0}
            >
              Excluir selecionados
            </Button>
          </div>
        </div>
      )}

      <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
        {optimistic.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-muted">
            Nenhum tópico ainda. Cole a ementa abaixo, uma linha por tópico.
          </li>
        )}

        {optimistic.map((topic) => (
          <li
            key={topic.id}
            className={clsx(
              "flex items-center gap-3 px-4 py-2.5 transition-opacity",
              busyId === topic.id && "opacity-60",
            )}
          >
            {selecting ? (
              <input
                type="checkbox"
                checked={selected.has(topic.id)}
                onChange={() => toggleSelected(topic.id)}
                aria-label={`Selecionar "${topic.title}"`}
                className="size-4 shrink-0 accent-accent"
              />
            ) : (
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
            )}

            <span
              className={clsx(
                "min-w-0 flex-1 truncate text-sm",
                topic.completed ? "text-muted line-through" : "text-foreground",
              )}
            >
              {topic.title}
            </span>

            {/* Onde o tempo foi parar dentro da ementa. Só aparece quando há o
                que mostrar, para não encher a lista de "0min". */}
            {topic.minutes > 0 && (
              <span className="shrink-0 text-xs tabular-nums text-muted">
                {formatMinutes(topic.minutes)}
              </span>
            )}

            {/* Sempre visível e com alvo de toque de verdade. Antes era
                `opacity-0 group-hover:opacity-100` com ~10px: no celular, onde
                não existe hover, o botão simplesmente não aparecia. */}
            {!selecting && (
              <button
                type="button"
                onClick={() => removeTopic(topic)}
                disabled={busyId === topic.id}
                aria-label={`Excluir tópico "${topic.title}"`}
                className="flex size-8 shrink-0 items-center justify-center rounded text-lg leading-none text-muted/60 transition-colors hover:bg-rose-500/10 hover:text-rose-400 focus-visible:text-rose-400"
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="text-sm text-rose-400">
          {error}
        </p>
      )}

      <form onSubmit={addTopics} className="space-y-2">
        {colando ? (
          <textarea
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            rows={6}
            autoFocus
            placeholder={"Cole a ementa aqui, uma linha por tópico:\n\nLimites\nDerivadas\nIntegrais"}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent"
          />
        ) : (
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Adicionar tópico"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent"
          />
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="secondary" disabled={isPending || !title.trim()}>
            {colando ? "Adicionar tópicos" : "Adicionar tópico"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setColando((valor) => !valor)}
          >
            {colando ? "Adicionar um por vez" : "Colar ementa inteira"}
          </Button>
        </div>
      </form>
    </section>
  );
}
