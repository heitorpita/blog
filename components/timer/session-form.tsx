"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchJson, jsonBody } from "@/lib/fetch-json";

// Lançamento manual de horas.
//
// Até aqui a única forma de registrar tempo era o cronômetro rodando ao vivo:
// esquecer de ligar, assistir aula, fazer monitoria ou estudar no papel não
// tinham como entrar. Isso torna o total de horas — que é metade do valor do
// app — sistematicamente menor que a realidade.

export type SubjectOption = {
  id: string;
  name: string;
  topics: { id: string; title: string }[];
};

export type SessionDraft = {
  id: string;
  subjectId: string;
  topicId: string | null;
  durationMinutes: number;
  note: string | null;
  startedAt: string;
};

/** `datetime-local` só aceita "YYYY-MM-DDTHH:mm" no fuso do navegador. */
function toLocalInput(date: Date): string {
  const deslocado = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return deslocado.toISOString().slice(0, 16);
}

export function SessionForm({
  subjects,
  session,
  onDone,
}: {
  subjects: SubjectOption[];
  /** Presente = editando; ausente = lançando uma sessão nova. */
  session?: SessionDraft;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [subjectId, setSubjectId] = useState(session?.subjectId ?? subjects[0]?.id ?? "");
  const [topicId, setTopicId] = useState(session?.topicId ?? "");
  const [minutes, setMinutes] = useState(session?.durationMinutes ?? 60);
  const [note, setNote] = useState(session?.note ?? "");
  const [startedAt, setStartedAt] = useState(
    session ? toLocalInput(new Date(session.startedAt)) : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topics = subjects.find((subject) => subject.id === subjectId)?.topics ?? [];

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (!subjectId) {
      setError("Escolha uma matéria.");
      return;
    }
    if (!startedAt) {
      setError("Escolha quando o estudo começou.");
      return;
    }

    setSaving(true);
    setError(null);

    // `datetime-local` devolve horário do navegador; o Date converte para o
    // instante correto e o servidor guarda em UTC. O dia mostrado no heatmap e
    // no streak sai de APP_TIMEZONE (ver lib/time.ts).
    const payload = {
      subjectId,
      topicId: topicId || null,
      durationMinutes: minutes,
      note: note.trim() || null,
      startedAt: new Date(startedAt).toISOString(),
    };

    const result = session
      ? await fetchJson(`/api/sessions/${session.id}`, jsonBody("PATCH", payload))
      : await fetchJson("/api/sessions", jsonBody("POST", { ...payload, mode: "FREE" }));

    setSaving(false);

    if (!result.ok) {
      setError(
        result.status === 400
          ? "Confira os campos: a duração precisa ser de 1 a 1440 minutos."
          : result.message,
      );
      return;
    }

    if (!session) {
      setNote("");
      setTopicId("");
    }

    onDone?.();
    router.refresh();
  }

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-serif text-lg text-foreground">
          {session ? "Editar sessão" : "Lançar estudo que já aconteceu"}
        </h2>
        {!session && (
          <p className="mt-1 text-xs text-muted">
            Aula, monitoria, estudo no papel — o que o cronômetro não pegou.
          </p>
        )}
      </div>

      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-muted">
            Matéria
            <select
              value={subjectId}
              onChange={(event) => {
                setSubjectId(event.target.value);
                setTopicId("");
              }}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            >
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-muted">
            Tópico (opcional)
            <select
              value={topicId}
              onChange={(event) => setTopicId(event.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            >
              <option value="">Sem tópico</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.title}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-muted">
            Começou em
            <input
              type="datetime-local"
              value={startedAt}
              onChange={(event) => setStartedAt(event.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </label>

          <label className="text-xs text-muted">
            Duração (min) · vale {Math.max(minutes || 0, 0)} XP
            <input
              type="number"
              min={1}
              max={1440}
              value={minutes}
              onChange={(event) => setMinutes(Number(event.target.value) || 0)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </label>
        </div>

        <label className="block text-xs text-muted">
          O que você estudou (opcional)
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Lista 3 de integrais por partes"
            maxLength={500}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent"
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-rose-400">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={saving || minutes < 1 || !subjectId}>
            {saving ? "Salvando…" : session ? "Salvar alterações" : "Lançar sessão"}
          </Button>
          {onDone && (
            <Button type="button" variant="ghost" onClick={onDone}>
              Cancelar
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
