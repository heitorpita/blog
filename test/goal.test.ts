import { test } from "node:test";
import assert from "node:assert/strict";
import { hoursGoal } from "@/lib/goal";

test("minutos viram horas com uma casa decimal", () => {
  const meta = hoursGoal(90, 60);
  assert.equal(meta.done, 1.5);
  assert.equal(meta.target, 60);
});

test("progresso e percentual batem com a carga horária", () => {
  const meta = hoursGoal(60 * 60, 90); // 60h de 90h
  assert.equal(meta.done, 60);
  assert.equal(meta.percent, 67);
  assert.equal(meta.remaining, 30);
  assert.equal(meta.reached, false);
});

test("passar da meta não estica a barra além do fim", () => {
  const meta = hoursGoal(120 * 60, 90);
  assert.equal(meta.progress, 1, "a barra para no cheio");
  assert.equal(meta.percent, 133, "mas o número diz que passou");
  assert.equal(meta.reached, true);
  assert.equal(meta.remaining, 0, "não existe 'faltam -30h'");
});

test("bater a meta exatamente conta como batida", () => {
  const meta = hoursGoal(90 * 60, 90);
  assert.equal(meta.reached, true);
  assert.equal(meta.percent, 100);
  assert.equal(meta.remaining, 0);
});

test("matéria sem carga horária simplesmente não tem meta", () => {
  const meta = hoursGoal(300, 0);
  assert.equal(meta.progress, 0, "sem divisão por zero");
  assert.equal(meta.percent, 0);
  assert.equal(meta.reached, false);
  assert.equal(meta.done, 5, "as horas estudadas continuam sendo contadas");
});

test("nada estudado ainda", () => {
  const meta = hoursGoal(0, 90);
  assert.equal(meta.done, 0);
  assert.equal(meta.progress, 0);
  assert.equal(meta.remaining, 90);
});

test("minutos negativos não viram progresso negativo", () => {
  const meta = hoursGoal(-600, 90);
  assert.equal(meta.done, 0);
  assert.equal(meta.progress, 0);
});

test("o progresso nunca sai da faixa 0..1", () => {
  for (const [minutos, alvo] of [
    [0, 0],
    [0, 90],
    [10, 1],
    [100_000, 90],
    [-5, 60],
  ] as const) {
    const meta = hoursGoal(minutos, alvo);
    assert.ok(
      meta.progress >= 0 && meta.progress <= 1,
      `progresso fora de faixa em ${minutos}min/${alvo}h`,
    );
  }
});
