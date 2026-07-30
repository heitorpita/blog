// Estado do cronômetro fora do React, por dois motivos:
//
// 1. O tempo NUNCA pode ser contado somando ticks. Navegador em aba oculta
//    estrangula `setInterval` para até uma chamada por minuto, e contar tick a
//    tick faria um pomodoro de 25 min em segundo plano registrar poucos minutos
//    — justamente o caso de uso principal, que é estudar com o cronômetro fora
//    da vista. A verdade é o instante em que a fase começou; o intervalo só
//    repinta a tela.
// 2. O que estava rodando precisa sobreviver a F5, a fechar a aba e a navegar
//    para outra página do app (que desmonta o componente). Guardar em
//    `localStorage` resolve, e um store externo é o jeito que o React oferece
//    de ler isso sem descasar da hidratação: durante a hidratação ele usa
//    `getServerSnapshot`, e só depois de montar troca para o valor do cliente.

export type Mode = "FREE" | "POMODORO";
export type Phase = "FOCUS" | "BREAK";

export type TimerState = {
  subjectId: string;
  mode: Mode;
  focusMinutes: number;
  breakMinutes: number;
  phase: Phase;
  /** Epoch ms de quando a fase atual voltou a correr. `null` = pausado. */
  startedAt: number | null;
  /** Segundos já corridos na fase atual antes da última pausa. */
  carried: number;
  /** Minutos de foco já fechados nos ciclos anteriores. */
  banked: number;
  /** Recado para o usuário (fim de ciclo, sessão salva). Não é persistido. */
  notice: string | null;
};

const STORAGE_KEY = "sinapse:timer";

/** Corrida restaurada com mais que isso de idade é lixo esquecido, não estudo. */
const STALE_AFTER_MS = 12 * 60 * 60 * 1000;

/**
 * Instância única e estável — `getServerSnapshot` precisa devolver sempre o
 * mesmo objeto, senão o React entra em laço de renderização.
 */
export const EMPTY_TIMER: TimerState = {
  subjectId: "",
  mode: "FREE",
  focusMinutes: 25,
  breakMinutes: 5,
  phase: "FOCUS",
  startedAt: null,
  carried: 0,
  banked: 0,
  notice: null,
};

export function phaseSeconds(state: TimerState): number {
  const raw = state.phase === "FOCUS" ? state.focusMinutes : state.breakMinutes;
  const minutes = Number.isFinite(raw) ? Math.round(raw) : 0;
  return Math.max(1, minutes) * 60;
}

export function elapsedSeconds(state: TimerState, now: number): number {
  if (state.startedAt === null) return state.carried;
  return state.carried + Math.max(0, Math.floor((now - state.startedAt) / 1000));
}

export function pendingMinutes(state: TimerState, now: number): number {
  const elapsed = elapsedSeconds(state, now);
  const inFocus = state.mode === "FREE" || state.phase === "FOCUS";
  return state.banked + (inFocus ? Math.floor(elapsed / 60) : 0);
}

/**
 * Fecha quantas fases do pomodoro couberem no tempo já corrido. O laço existe
 * porque uma aba que ficou em segundo plano pode voltar depois de vários ciclos:
 * um único tick precisa dar conta de todos eles. Devolve o próprio `state`
 * quando não há nada a fechar, para o React poder pular a renderização.
 */
export function rollPomodoro(state: TimerState, now: number): TimerState {
  if (state.mode !== "POMODORO" || state.startedAt === null) return state;

  let next = state;

  // O teto é só uma trava contra laço infinito.
  for (let guard = 0; guard < 500; guard += 1) {
    const length = phaseSeconds(next);
    if (elapsedSeconds(next, now) < length) break;

    const leavingFocus = next.phase === "FOCUS";

    next = {
      ...next,
      phase: leavingFocus ? "BREAK" : "FOCUS",
      banked: leavingFocus ? next.banked + Math.round(length / 60) : next.banked,
      // O excedente escorre para a fase seguinte em vez de ser descartado.
      startedAt: next.startedAt! + (length - next.carried) * 1000,
      carried: 0,
    };
  }

  if (next === state) return state;

  const gained = next.banked - state.banked;

  return {
    ...next,
    notice:
      gained > 0
        ? `Foco concluído! ${gained} min guardados.${
            next.phase === "BREAK" ? " Hora da pausa." : ""
          }`
        : "Pausa concluída. Bora pro próximo ciclo.",
  };
}

/** Zera a corrida mantendo as preferências (matéria, modo, durações). */
export function resetRun(state: TimerState): TimerState {
  return { ...state, phase: "FOCUS", startedAt: null, carried: 0, banked: 0, notice: null };
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * Lê o estado salvo. Cada campo cai no padrão se vier corrompido — melhor um
 * cronômetro parcialmente restaurado do que descartar a sessão inteira.
 */
function loadState(now: number): TimerState | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // localStorage bloqueado (aba privada, permissões)
  }
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;

  const stored = parsed as Record<string, unknown>;

  const startedAt =
    typeof stored.startedAt === "number" && Number.isFinite(stored.startedAt)
      ? stored.startedAt
      : null;

  // Cronômetro deixado correndo de ontem não vira uma sessão de 14 horas.
  if (startedAt !== null && now - startedAt > STALE_AFTER_MS) return null;

  return {
    subjectId: typeof stored.subjectId === "string" ? stored.subjectId : "",
    mode: stored.mode === "POMODORO" ? "POMODORO" : "FREE",
    focusMinutes: num(stored.focusMinutes, EMPTY_TIMER.focusMinutes),
    breakMinutes: num(stored.breakMinutes, EMPTY_TIMER.breakMinutes),
    phase: stored.phase === "BREAK" ? "BREAK" : "FOCUS",
    startedAt,
    carried: Math.max(0, num(stored.carried, 0)),
    banked: Math.max(0, num(stored.banked, 0)),
    notice: null,
  };
}

// Lido uma vez na carga do módulo. No servidor fica no vazio; no cliente o
// valor restaurado só aparece depois da hidratação, via `getSnapshot`.
let snapshot: TimerState =
  typeof window === "undefined" ? EMPTY_TIMER : (loadState(Date.now()) ?? EMPTY_TIMER);

const listeners = new Set<() => void>();

export function subscribeToTimer(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getTimerSnapshot(): TimerState {
  return snapshot;
}

export function getTimerServerSnapshot(): TimerState {
  return EMPTY_TIMER;
}

export function setTimerState(
  update: TimerState | ((current: TimerState) => TimerState),
): void {
  const next = typeof update === "function" ? update(snapshot) : update;
  if (next === snapshot) return;

  snapshot = next;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Sem persistência o cronômetro ainda funciona; só não sobrevive a recarga.
  }

  for (const listener of listeners) listener();
}
