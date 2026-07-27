"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { XP_PER_MINUTE_STUDIED } from "@/lib/xp";

type Mode = "FREE" | "POMODORO";
type Phase = "FOCUS" | "BREAK";

type SubjectOption = { id: string; name: string; color: string };

function formatClock(seconds: number) {
  const safe = Math.max(seconds, 0);
  const mm = String(Math.floor(safe / 60)).padStart(2, "0");
  const ss = String(safe % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function StudyTimer({ subjects }: { subjects: SubjectOption[] }) {
  const router = useRouter();
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [mode, setMode] = useState<Mode>("FREE");
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [phase, setPhase] = useState<Phase>("FOCUS");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [banked, setBanked] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const phaseLength = (phase === "FOCUS" ? focusMinutes : breakMinutes) * 60;
  const remaining = phaseLength - elapsed;

  const onTick = useEffectEvent(() => {
    const next = elapsed + 1;

    if (mode !== "POMODORO" || next < phaseLength) {
      setElapsed(next);
      return;
    }

    if (phase === "FOCUS") {
      setBanked((value) => value + focusMinutes);
      setPhase("BREAK");
      setMessage(`Foco concluído! ${focusMinutes} min guardados. Hora da pausa.`);
    } else {
      setPhase("FOCUS");
      setMessage("Pausa concluída. Bora pro próximo ciclo.");
    }
    setElapsed(0);
  });

  useEffect(() => {
    if (!running) return;

    const id = setInterval(onTick, 1000);
    return () => clearInterval(id);
  }, [running]);

  function reset() {
    setRunning(false);
    setElapsed(0);
    setBanked(0);
    setPhase("FOCUS");
  }

  const pendingMinutes =
    banked + (mode === "FREE" || phase === "FOCUS" ? Math.floor(elapsed / 60) : 0);

  async function finish() {
    if (!subjectId || pendingMinutes < 1) {
      setMessage("Estude pelo menos 1 minuto antes de salvar.");
      return;
    }

    setSaving(true);
    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId, mode, durationMinutes: pendingMinutes }),
    });
    setSaving(false);

    if (!response.ok) {
      setMessage("Não foi possível salvar a sessão.");
      return;
    }

    const session = await response.json();
    setMessage(`Sessão salva: ${pendingMinutes} min · +${session.xpEarned} XP`);
    reset();
    router.refresh();
  }

  const display = mode === "FREE" ? elapsed : Math.max(remaining, 0);

  return (
    <Card className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <select
          value={subjectId}
          onChange={(event) => setSubjectId(event.target.value)}
          className="min-w-48 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
        >
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>

        <div className="flex rounded-md border border-border p-1">
          {(["FREE", "POMODORO"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setMode(option);
                reset();
              }}
              className={clsx(
                "rounded px-3 py-1.5 text-sm transition-colors",
                mode === option
                  ? "bg-surface-raised text-foreground"
                  : "text-muted hover:text-foreground",
              )}
            >
              {option === "FREE" ? "Livre" : "Pomodoro"}
            </button>
          ))}
        </div>
      </div>

      {mode === "POMODORO" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-muted">
            Foco (min)
            <input
              type="number"
              min={1}
              max={120}
              value={focusMinutes}
              onChange={(event) => setFocusMinutes(Number(event.target.value))}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </label>
          <label className="text-xs text-muted">
            Pausa (min)
            <input
              type="number"
              min={1}
              max={60}
              value={breakMinutes}
              onChange={(event) => setBreakMinutes(Number(event.target.value))}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </label>
        </div>
      )}

      <div className="text-center">
        {mode === "POMODORO" && (
          <p className="text-xs uppercase tracking-wide text-muted">
            {phase === "FOCUS" ? "Foco" : "Pausa"}
          </p>
        )}
        <p className="font-serif text-6xl tabular-nums text-foreground">
          {formatClock(display)}
        </p>
        <p className="mt-2 text-xs text-muted">
          {pendingMinutes} min acumulados · vale {pendingMinutes * XP_PER_MINUTE_STUDIED} XP
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={() => setRunning((value) => !value)}>
          {running ? "Pausar" : "Iniciar"}
        </Button>
        <Button variant="secondary" onClick={reset}>
          Zerar
        </Button>
        <Button variant="secondary" onClick={finish} disabled={saving || pendingMinutes < 1}>
          {saving ? "Salvando…" : "Finalizar e salvar"}
        </Button>
      </div>

      {message && <p className="text-center text-sm text-accent">{message}</p>}
    </Card>
  );
}
