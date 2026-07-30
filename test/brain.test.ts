import { test } from "node:test";
import assert from "node:assert/strict";
import { streakFromDays } from "@/lib/brain";

const HOJE = "2026-03-15";

test("sem nenhum dia estudado, tudo zero", () => {
  assert.deepEqual(streakFromDays([], HOJE), {
    current: 0,
    longest: 0,
    studiedToday: false,
  });
});

test("estudou hoje: streak de 1", () => {
  const s = streakFromDays([HOJE], HOJE);
  assert.equal(s.current, 1);
  assert.equal(s.studiedToday, true);
});

test("três dias seguidos terminando hoje", () => {
  const s = streakFromDays(["2026-03-13", "2026-03-14", "2026-03-15"], HOJE);
  assert.equal(s.current, 3);
  assert.equal(s.longest, 3);
  assert.equal(s.studiedToday, true);
});

test("estudou ontem mas ainda não hoje: o streak continua vivo", () => {
  // Regra de produto: ainda dá tempo de manter a sequência hoje.
  const s = streakFromDays(["2026-03-13", "2026-03-14"], HOJE);
  assert.equal(s.current, 2);
  assert.equal(s.studiedToday, false);
});

test("último estudo foi anteontem: streak zerado, recorde preservado", () => {
  const s = streakFromDays(["2026-03-11", "2026-03-12", "2026-03-13"], HOJE);
  assert.equal(s.current, 0, "dois dias de buraco quebram a sequência");
  assert.equal(s.longest, 3, "mas o recorde histórico fica");
});

test("buraco no meio corta o streak atual no ponto certo", () => {
  const s = streakFromDays(
    ["2026-03-01", "2026-03-02", "2026-03-03", "2026-03-14", "2026-03-15"],
    HOJE,
  );
  assert.equal(s.current, 2, "só os dois últimos dias são consecutivos");
  assert.equal(s.longest, 3, "a sequência antiga de três continua sendo o recorde");
});

test("dias repetidos (várias sessões no mesmo dia) contam uma vez só", () => {
  const s = streakFromDays([HOJE, HOJE, HOJE, "2026-03-14"], HOJE);
  assert.equal(s.current, 2, "quatro sessões em dois dias é streak de 2");
});

test("ordem de entrada não importa", () => {
  const bagunçado = ["2026-03-15", "2026-03-13", "2026-03-14"];
  const ordenado = ["2026-03-13", "2026-03-14", "2026-03-15"];
  assert.deepEqual(streakFromDays(bagunçado, HOJE), streakFromDays(ordenado, HOJE));
});

test("relógio adiantado: sessão 'de amanhã' é ignorada em vez de zerar o streak", () => {
  // Este bug aconteceu de verdade com dados de demonstração: o dia mais recente
  // não era nem hoje nem ontem, e o streak ia a zero sem motivo.
  const s = streakFromDays(["2026-03-16", "2026-03-14", "2026-03-15"], HOJE);
  assert.equal(s.current, 2, "descarta o futuro e mantém 14+15");
  assert.equal(s.studiedToday, true);
});

test("só há registro no futuro: comporta-se como se não houvesse nada", () => {
  const s = streakFromDays(["2026-03-20"], HOJE);
  assert.equal(s.current, 0);
  assert.equal(s.longest, 0);
  assert.equal(s.studiedToday, false);
});

test("longest nunca fica abaixo do streak atual", () => {
  const s = streakFromDays(["2026-03-14", "2026-03-15"], HOJE);
  assert.ok(s.longest >= s.current);
});

test("streak longo atravessando virada de mês", () => {
  const dias: string[] = [];
  for (let d = 25; d <= 28; d += 1) dias.push(`2026-02-${d}`);
  for (let d = 1; d <= 15; d += 1) dias.push(`2026-03-${String(d).padStart(2, "0")}`);

  const s = streakFromDays(dias, HOJE);
  assert.equal(s.current, 19, "4 dias de fevereiro + 15 de março, sem buraco");
});
