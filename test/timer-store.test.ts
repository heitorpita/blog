import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EMPTY_TIMER,
  elapsedSeconds,
  pendingMinutes,
  rollPomodoro,
  type TimerState,
} from "@/components/timer/timer-store";

const T0 = 1_700_000_000_000;
const min = (n: number) => n * 60_000;

// O motivo destes testes: contar tempo somando ticks quebrava com a aba em
// segundo plano, porque o navegador estrangula setInterval para até uma chamada
// por minuto. Aqui o tempo vem sempre da diferença de instantes.

test("modo livre credita o tempo real, não o número de ticks", () => {
  const livre: TimerState = { ...EMPTY_TIMER, mode: "FREE", startedAt: T0 };
  assert.equal(elapsedSeconds(livre, T0 + min(50)), 3000);
  assert.equal(pendingMinutes(livre, T0 + min(50)), 50);
});

test("pausado congela o tempo", () => {
  const pausado: TimerState = { ...EMPTY_TIMER, startedAt: null, carried: 600 };
  assert.equal(elapsedSeconds(pausado, T0 + min(120)), 600);
});

test("retomar soma o tempo anterior ao novo trecho", () => {
  const retomado: TimerState = { ...EMPTY_TIMER, startedAt: T0, carried: 600 };
  assert.equal(elapsedSeconds(retomado, T0 + min(5)), 900, "10 min guardados + 5 correndo");
});

test("relógio para trás não gera tempo negativo", () => {
  const rodando: TimerState = { ...EMPTY_TIMER, startedAt: T0, carried: 60 };
  assert.equal(elapsedSeconds(rodando, T0 - min(10)), 60);
});

const pomodoro: TimerState = {
  ...EMPTY_TIMER,
  mode: "POMODORO",
  focusMinutes: 25,
  breakMinutes: 5,
  startedAt: T0,
};

test("um tick depois de 50 min ausente fecha os ciclos vencidos", () => {
  const depois = rollPomodoro(pomodoro, T0 + min(50));
  assert.equal(depois.banked, 25, "o primeiro foco fechou");
  assert.equal(depois.phase, "FOCUS", "pausa de 5 min também passou");
  assert.equal(elapsedSeconds(depois, T0 + min(50)), 1200, "20 min no ciclo atual");
  assert.equal(pendingMinutes(depois, T0 + min(50)), 45);
});

test("três horas ausente fecha seis ciclos de 30 min", () => {
  assert.equal(rollPomodoro(pomodoro, T0 + min(180)).banked, 150);
});

test("nada vencido devolve o MESMO objeto — React pula a renderização", () => {
  assert.equal(rollPomodoro(pomodoro, T0 + min(10)), pomodoro);
});

test("o excedente escorre para a fase seguinte em vez de sumir", () => {
  // 26 min: fecha o foco de 25 e já corre 1 min de pausa.
  const depois = rollPomodoro(pomodoro, T0 + min(26));
  assert.equal(depois.phase, "BREAK");
  assert.equal(elapsedSeconds(depois, T0 + min(26)), 60);
});

test("durante a pausa os minutos não contam como estudo", () => {
  const naPausa = rollPomodoro(pomodoro, T0 + min(28));
  assert.equal(naPausa.phase, "BREAK");
  assert.equal(pendingMinutes(naPausa, T0 + min(28)), 25, "só o foco fechado conta");
});

test("duração zerada (campo apagado no input) não trava nem divide por zero", () => {
  const zerado: TimerState = { ...EMPTY_TIMER, mode: "POMODORO", focusMinutes: 0, startedAt: T0 };
  const depois = rollPomodoro(zerado, T0 + min(3));
  assert.ok(Number.isFinite(depois.banked));
  assert.ok(depois.banked >= 1, "foco 0 é tratado como 1 minuto");
});

test("duração NaN não contamina o estado", () => {
  const nan: TimerState = { ...EMPTY_TIMER, mode: "POMODORO", focusMinutes: NaN, startedAt: T0 };
  const depois = rollPomodoro(nan, T0 + min(3));
  assert.ok(Number.isFinite(depois.banked), "banked continuou numérico");
});

test("modo livre nunca fecha ciclo", () => {
  const livre: TimerState = { ...EMPTY_TIMER, mode: "FREE", startedAt: T0 };
  assert.equal(rollPomodoro(livre, T0 + min(300)), livre);
});

test("pomodoro pausado não avança fase", () => {
  const parado: TimerState = { ...pomodoro, startedAt: null, carried: 9999 };
  assert.equal(rollPomodoro(parado, T0 + min(300)), parado);
});
