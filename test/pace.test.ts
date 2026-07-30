import { test } from "node:test";
import assert from "node:assert/strict";
import { comparePace } from "@/lib/pace";

test("crescimento vira percentual positivo", () => {
  const p = comparePace(600, 500);
  assert.equal(p.deltaPercent, 20);
  assert.equal(p.thisWeek, 600);
  assert.equal(p.lastWeek, 500);
});

test("queda vira percentual negativo", () => {
  assert.equal(comparePace(425, 500).deltaPercent, -15);
});

test("semana igual dá zero, não null", () => {
  assert.equal(comparePace(300, 300).deltaPercent, 0);
});

test("semana anterior zerada devolve null, não +100%", () => {
  // Não existe variação percentual a partir de zero. Inventar um número aqui
  // ficaria bonito na tela e seria mentira.
  assert.equal(comparePace(500, 0).deltaPercent, null);
});

test("duas semanas zeradas também devolvem null", () => {
  const p = comparePace(0, 0);
  assert.equal(p.deltaPercent, null);
  assert.equal(p.thisWeek, 0);
});

test("parar de estudar é -100%", () => {
  assert.equal(comparePace(0, 400).deltaPercent, -100);
});

test("valores negativos ou quebrados são normalizados", () => {
  const p = comparePace(-50, 100.4);
  assert.equal(p.thisWeek, 0, "minuto negativo não existe");
  assert.equal(p.lastWeek, 100);
  assert.equal(p.deltaPercent, -100);
});

test("o percentual é arredondado, não fracionário", () => {
  const p = comparePace(333, 1000);
  assert.ok(Number.isInteger(p.deltaPercent), "a UI mostra inteiro");
  assert.equal(p.deltaPercent, -67);
});
