"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchJson, jsonBody } from "@/lib/fetch-json";

const COLOR_CHOICES = [
  "#e63946",
  "#3a86ff",
  "#2a9d8f",
  "#f4a261",
  "#9b5de5",
  "#7c9dff",
];

export function SubjectCreator() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [teacher, setTeacher] = useState("");
  const [hours, setHours] = useState(60);
  const [color, setColor] = useState(COLOR_CHOICES[0]);
  const [topics, setTopics] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setCode("");
    setTeacher("");
    setHours(60);
    setColor(COLOR_CHOICES[0]);
    setTopics("");
    setError(null);
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const result = await fetchJson(
      "/api/subjects",
      jsonBody("POST", {
        name,
        code,
        hours,
        teacher: teacher.trim() || "A definir",
        color,
        topics: topics
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
      }),
    );

    setSaving(false);

    if (!result.ok) {
      // 400 é erro de preenchimento; o resto vem com a mensagem do helper.
      setError(
        result.status === 400
          ? "Confira os campos: nome e código são obrigatórios."
          : result.message,
      );
      return;
    }

    reset();
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Nova matéria
      </Button>
    );
  }

  return (
    <Card className="space-y-4">
      <h2 className="font-serif text-lg text-foreground">Nova matéria</h2>

      <form onSubmit={create} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-muted">
            Nome
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Cálculo Diferencial e Integral II"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent"
            />
          </label>

          <label className="text-xs text-muted">
            Código
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="ECT3208"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent"
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
              onChange={(event) => setHours(Number(event.target.value))}
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

        <label className="block text-xs text-muted">
          Tópicos da ementa — um por linha (opcional, dá para adicionar depois)
          <textarea
            value={topics}
            onChange={(event) => setTopics(event.target.value)}
            rows={5}
            placeholder={"Limites\nDerivadas\nIntegrais"}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent"
          />
        </label>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <div className="flex gap-2">
          <Button type="submit" disabled={saving || !name.trim() || !code.trim()}>
            {saving ? "Criando…" : "Criar matéria"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              reset();
              setOpen(false);
            }}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
