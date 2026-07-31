"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { fetchJson, jsonBody } from "@/lib/fetch-json";

// A API já tinha PATCH e DELETE de matéria desde sempre; faltava o botão. Sem
// isto, errar o nome ou a cor de uma matéria era irreversível pela interface.

const COLOR_CHOICES = ["#e63946", "#3a86ff", "#2a9d8f", "#f4a261", "#9b5de5", "#7c9dff"];

export type SubjectSettingsProps = {
  subject: { id: string; name: string; code: string; teacher: string; hours: number; color: string };
  /** Contagens reais, para a confirmação de exclusão dizer o tamanho do estrago. */
  counts: { topics: number; tasks: number; sessions: number; xp: number };
};

export function SubjectSettings({ subject, counts }: SubjectSettingsProps) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(subject.name);
  const [code, setCode] = useState(subject.code);
  const [teacher, setTeacher] = useState(subject.teacher);
  const [hours, setHours] = useState(subject.hours);
  const [color, setColor] = useState(subject.color);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const result = await fetchJson(
      `/api/subjects/${subject.id}`,
      jsonBody("PATCH", {
        name,
        code,
        teacher: teacher.trim() || "A definir",
        hours,
        color,
      }),
    );

    setSaving(false);

    if (!result.ok) {
      setError(
        result.status === 400
          ? "Confira os campos: nome e código não podem ficar vazios."
          : result.message,
      );
      return;
    }

    setOpen(false);
    router.refresh();
  }

  async function remove() {
    // A exclusão cascateia por tópicos, tarefas e sessões. O XP dessas origens
    // vai junto; só o XP que já perdeu vínculo permanece no total. Dizer os
    // números evita que a pessoa descubra o tamanho da perda depois.
    const detalhes = [
      `${counts.topics} tópico${counts.topics === 1 ? "" : "s"}`,
      `${counts.tasks} tarefa${counts.tasks === 1 ? "" : "s"}`,
      `${counts.sessions} sessão${counts.sessions === 1 ? "" : "ões"} de estudo`,
    ].join(", ");

    const ok = await confirm({
      title: `Excluir "${subject.name}"?`,
      description:
        `Isso apaga também: ${detalhes}.\n` +
        `Os ${counts.xp} XP dessas origens vão embora junto.\n\n` +
        `Não dá para desfazer.`,
      confirmLabel: "Excluir matéria",
      tone: "danger",
    });

    if (!ok) return;

    setSaving(true);
    setError(null);

    const result = await fetchJson(`/api/subjects/${subject.id}`, jsonBody("DELETE"));

    if (!result.ok) {
      setSaving(false);
      setError(result.message);
      return;
    }

    router.push("/subjects");
    router.refresh();
  }

  if (!open) {
    return (
      <>
        {dialog}
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Editar matéria
        </Button>
      </>
    );
  }

  return (
    <Card className="w-full space-y-4">
      {dialog}
      <h2 className="font-serif text-lg text-foreground">Editar matéria</h2>

      <form onSubmit={save} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-muted">
            Nome
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </label>

          <label className="text-xs text-muted">
            Código
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </label>

          <label className="text-xs text-muted">
            Professor
            <input
              value={teacher}
              onChange={(event) => setTeacher(event.target.value)}
              placeholder="A definir"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent"
            />
          </label>

          <label className="text-xs text-muted">
            Carga horária
            <input
              type="number"
              min={0}
              max={1000}
              value={hours}
              onChange={(event) => setHours(Number(event.target.value) || 0)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </label>
        </div>

        <div className="text-xs text-muted">
          Cor
          <div className="mt-1.5 flex gap-2">
            {COLOR_CHOICES.map((choice) => (
              <button
                key={choice}
                type="button"
                onClick={() => setColor(choice)}
                aria-label={`Cor ${choice}`}
                aria-pressed={color === choice}
                className="size-7 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: choice,
                  borderColor: color === choice ? "var(--foreground)" : "transparent",
                }}
              />
            ))}
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-rose-400">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={saving || !name.trim() || !code.trim()}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setOpen(false);
              setError(null);
            }}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={remove}
            disabled={saving}
            className="ml-auto text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
          >
            Excluir matéria
          </Button>
        </div>
      </form>
    </Card>
  );
}
