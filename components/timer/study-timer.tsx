"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchJson, jsonBody } from "@/lib/fetch-json";
import { XP_PER_MINUTE_STUDIED } from "@/lib/xp";
import {
  announcePhase,
  elapsedSeconds,
  getTimerServerSnapshot,
  getTimerSnapshot,
  pendingMinutes as pendingMinutesOf,
  phaseSeconds,
  requestPhaseNotifications,
  resetRun,
  rollPomodoro,
  setTimerState,
  subscribeToTimer,
} from "@/components/timer/timer-store";

type SubjectOption = { id: string; name: string; color: string };

function formatClock(seconds: number) {
  const safe = Math.max(seconds, 0);
  const mm = String(Math.floor(safe / 60)).padStart(2, "0");
  const ss = String(safe % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function StudyTimer({ subjects }: { subjects: SubjectOption[] }) {
  const router = useRouter();
  const state = useSyncExternalStore(
    subscribeToTimer,
    getTimerSnapshot,
    getTimerServerSnapshot,
  );

  // Só existe para repintar o relógio; o tempo real vem de `state.startedAt`.
  const [now, setNow] = useState(() => Date.now());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (state.startedAt === null) return;

    const id = setInterval(() => {
      const tick = Date.now();
      setNow(tick);

      // Fecha as fases vencidas aqui, onde o tempo de fato avança. Devolve o
      // mesmo objeto quando não há nada a fechar, então não gera renderização.
      setTimerState((current) => {
        const rolled = rollPomodoro(current, tick);
        if (rolled !== current) {
          // Fora do updater não dá: é aqui que sabemos que a fase virou. O
          // aviso é efeito colateral no callback do intervalo, não no render.
          queueMicrotask(() => announcePhase(rolled.phase, rolled.banked - current.banked));
        }
        return rolled;
      });
    }, 500);

    return () => clearInterval(id);
  }, [state.startedAt]);

  // A matéria guardada pode ter sido apagada desde a última sessão; resolver na
  // renderização cobre isso e o caso de não haver nada guardado.
  const subjectId =
    state.subjectId && subjects.some((subject) => subject.id === state.subjectId)
      ? state.subjectId
      : (subjects[0]?.id ?? "");

  const elapsed = elapsedSeconds(state, now);
  const phaseLength = phaseSeconds(state);
  const running = state.startedAt !== null;
  const pendingMinutes = pendingMinutesOf(state, now);
  const display = state.mode === "FREE" ? elapsed : Math.max(phaseLength - elapsed, 0);

  function toggleRunning() {
    // O navegador só aceita o pedido de permissão dentro de um gesto do usuário,
    // e este é o momento em que ela passa a fazer sentido.
    if (state.startedAt === null && state.mode === "POMODORO") {
      requestPhaseNotifications();
    }

    setTimerState((current) =>
      current.startedAt === null
        ? { ...current, startedAt: Date.now(), notice: null }
        : {
            ...current,
            startedAt: null,
            carried: elapsedSeconds(current, Date.now()),
          },
    );
  }

  async function finish() {
    if (!subjectId || pendingMinutes < 1) {
      setTimerState((current) => ({
        ...current,
        notice: "Estude pelo menos 1 minuto antes de salvar.",
      }));
      return;
    }

    setSaving(true);
    const result = await fetchJson<{ xpEarned: number }>(
      "/api/sessions",
      jsonBody("POST", {
        subjectId,
        mode: state.mode,
        durationMinutes: pendingMinutes,
      }),
    );
    setSaving(false);

    // O estado NÃO é zerado quando falha: os minutos estudados continuam ali
    // para uma segunda tentativa. Perder a sessão por causa de um erro de rede
    // seria o pior desfecho possível nesta tela.
    if (!result.ok) {
      setTimerState((current) => ({
        ...current,
        notice: `${result.message} Seus ${pendingMinutes} min continuam guardados.`,
      }));
      return;
    }

    setTimerState((current) => ({
      ...resetRun(current),
      notice: `Sessão salva: ${pendingMinutes} min · +${result.data.xpEarned} XP`,
    }));
    router.refresh();
  }

  return (
    <Card className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <select
          value={subjectId}
          onChange={(event) =>
            setTimerState((current) => ({ ...current, subjectId: event.target.value }))
          }
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
              onClick={() =>
                setTimerState((current) => ({ ...resetRun(current), mode: option }))
              }
              className={clsx(
                "rounded px-3 py-1.5 text-sm transition-colors",
                state.mode === option
                  ? "bg-surface-raised text-foreground"
                  : "text-muted hover:text-foreground",
              )}
            >
              {option === "FREE" ? "Livre" : "Pomodoro"}
            </button>
          ))}
        </div>
      </div>

      {state.mode === "POMODORO" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-muted">
            Foco (min)
            <input
              type="number"
              min={1}
              max={120}
              value={state.focusMinutes}
              onChange={(event) =>
                setTimerState((current) => ({
                  ...current,
                  focusMinutes: Number(event.target.value) || 0,
                }))
              }
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </label>
          <label className="text-xs text-muted">
            Pausa (min)
            <input
              type="number"
              min={1}
              max={60}
              value={state.breakMinutes}
              onChange={(event) =>
                setTimerState((current) => ({
                  ...current,
                  breakMinutes: Number(event.target.value) || 0,
                }))
              }
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </label>
        </div>
      )}

      <div className="text-center">
        {state.mode === "POMODORO" && (
          <p className="text-xs uppercase tracking-wide text-muted">
            {state.phase === "FOCUS" ? "Foco" : "Pausa"}
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
        <Button onClick={toggleRunning}>{running ? "Pausar" : "Iniciar"}</Button>
        <Button variant="secondary" onClick={() => setTimerState(resetRun)}>
          Zerar
        </Button>
        <Button variant="secondary" onClick={finish} disabled={saving || pendingMinutes < 1}>
          {saving ? "Salvando…" : "Finalizar e salvar"}
        </Button>
      </div>

      {state.notice && <p className="text-center text-sm text-accent">{state.notice}</p>}
    </Card>
  );
}
