import { test } from "node:test";
import assert from "node:assert/strict";
import { dayKey, daysBetween, shiftDayKey } from "@/lib/time";

// O PROGRESS.md registra que já houve bug real de fuso aqui: usar UTC fazia
// estudo da noite contar como o dia seguinte. Estes testes existem para isso
// não voltar. O fuso padrão é America/Sao_Paulo (UTC-3, sem horário de verão
// desde 2019).

test("estudo às 22h em São Paulo conta como HOJE, não amanhã", () => {
  // 22h de 15/03 em São Paulo = 01h de 16/03 em UTC.
  const noite = new Date("2026-03-16T01:00:00Z");
  assert.equal(
    dayKey(noite),
    "2026-03-15",
    "toISOString().slice(0,10) daria 2026-03-16 — é exatamente o bug que isto trava",
  );
});

test("virada de meia-noite local cai no dia novo", () => {
  // 23h59 local = 02h59 UTC do dia seguinte.
  assert.equal(dayKey(new Date("2026-03-16T02:59:00Z")), "2026-03-15");
  // 00h01 local = 03h01 UTC do mesmo dia civil seguinte.
  assert.equal(dayKey(new Date("2026-03-16T03:01:00Z")), "2026-03-16");
});

test("madrugada em UTC ainda é o dia anterior no Brasil", () => {
  assert.equal(dayKey(new Date("2026-01-01T02:00:00Z")), "2025-12-31");
});

test("shiftDayKey anda o calendário sem escorregar", () => {
  assert.equal(shiftDayKey("2026-03-15", 1), "2026-03-16");
  assert.equal(shiftDayKey("2026-03-15", -1), "2026-03-14");
  assert.equal(shiftDayKey("2026-03-15", 0), "2026-03-15");
});

test("shiftDayKey atravessa fim de mês, ano e ano bissexto", () => {
  assert.equal(shiftDayKey("2026-01-31", 1), "2026-02-01");
  assert.equal(shiftDayKey("2026-12-31", 1), "2027-01-01");
  assert.equal(shiftDayKey("2027-01-01", -1), "2026-12-31");
  assert.equal(shiftDayKey("2028-02-28", 1), "2028-02-29", "2028 é bissexto");
  assert.equal(shiftDayKey("2026-02-28", 1), "2026-03-01", "2026 não é bissexto");
});

test("shiftDayKey não perde nem ganha dia em datas de horário de verão", () => {
  // O Brasil não tem mais DST, mas o cálculo usa Date.UTC de propósito para não
  // depender disso. Estas eram as antigas viradas (terceiro domingo de outubro
  // e terceiro de fevereiro) — em fuso local ingênuo, dariam 23h ou 25h.
  assert.equal(shiftDayKey("2018-10-20", 1), "2018-10-21");
  assert.equal(shiftDayKey("2019-02-16", 1), "2019-02-17");
});

test("shiftDayKey compõe: +30 dias é o mesmo que 30 passos de 1", () => {
  let passo = "2026-01-15";
  for (let i = 0; i < 30; i += 1) passo = shiftDayKey(passo, 1);
  assert.equal(passo, shiftDayKey("2026-01-15", 30));
});

test("daysBetween conta a distância com sinal", () => {
  assert.equal(daysBetween("2026-03-15", "2026-03-16"), 1);
  assert.equal(daysBetween("2026-03-16", "2026-03-15"), -1);
  assert.equal(daysBetween("2026-03-15", "2026-03-15"), 0);
  assert.equal(daysBetween("2026-02-28", "2026-03-01"), 1);
  assert.equal(daysBetween("2026-01-01", "2026-12-31"), 364);
});

test("daysBetween e shiftDayKey são inversos", () => {
  for (const dias of [1, 7, 30, 100, 365]) {
    const destino = shiftDayKey("2026-05-10", dias);
    assert.equal(daysBetween("2026-05-10", destino), dias);
  }
});
