import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LEVEL_TITLES,
  levelForXp,
  levelTitle,
  streakBonusXp,
  xpForLevel,
  xpForStudyMinutes,
  xpProgress,
} from "@/lib/xp";

test("nível é ⌊√(XP/100)⌋ e cada faixa vira na fronteira exata", () => {
  assert.equal(levelForXp(0), 0);
  assert.equal(levelForXp(99), 0);
  assert.equal(levelForXp(100), 1, "100 XP fecha o nível 1");
  assert.equal(levelForXp(399), 1);
  assert.equal(levelForXp(400), 2, "400 XP fecha o nível 2");
  assert.equal(levelForXp(900), 3);
});

test("XP negativo não gera nível negativo", () => {
  assert.equal(levelForXp(-500), 0);
  assert.equal(xpProgress(-500).level, 0);
  assert.equal(xpProgress(-500).xp, 0);
});

test("xpForLevel é o inverso exato de levelForXp na fronteira", () => {
  for (let level = 0; level <= 12; level += 1) {
    const limiar = xpForLevel(level);
    assert.equal(levelForXp(limiar), level, `${limiar} XP deveria ser nível ${level}`);
    if (level > 0) {
      assert.equal(levelForXp(limiar - 1), level - 1, `${limiar - 1} XP ainda é ${level - 1}`);
    }
  }
});

test("xpProgress nunca passa de 100% nem cai abaixo de 0%", () => {
  for (const xp of [0, 1, 99, 100, 250, 399, 400, 12_345]) {
    const { percent, progress, xpIntoLevel, xpNeededForNext } = xpProgress(xp);
    assert.ok(progress >= 0 && progress <= 1, `progresso fora de faixa em ${xp} XP`);
    assert.ok(percent >= 0 && percent <= 100, `percentual fora de faixa em ${xp} XP`);
    assert.ok(xpIntoLevel >= 0, `xpIntoLevel negativo em ${xp} XP`);
    assert.ok(xpIntoLevel < xpNeededForNext, `xpIntoLevel deveria já ter virado de nível`);
  }
});

test("xpProgress: 250 XP é nível 1 com 150 de 300 para o nível 2", () => {
  const p = xpProgress(250);
  assert.equal(p.level, 1);
  assert.equal(p.currentLevelXp, 100);
  assert.equal(p.nextLevelXp, 400);
  assert.equal(p.xpIntoLevel, 150);
  assert.equal(p.xpNeededForNext, 300);
  assert.equal(p.percent, 50);
});

test("títulos acompanham as faixas declaradas", () => {
  assert.equal(levelTitle(0), "Iniciante");
  assert.equal(levelTitle(1), "Iniciante");
  assert.equal(levelTitle(2), "Aprendiz");
  assert.equal(levelTitle(4), "Aprendiz");
  assert.equal(levelTitle(5), "Estudioso");
  assert.equal(levelTitle(9), "Estudioso");
  assert.equal(levelTitle(10), "Mestre");
  assert.equal(levelTitle(999), "Mestre", "nível altíssimo não perde o título");
});

test("LEVEL_TITLES está em ordem crescente — levelTitle depende disso", () => {
  for (let i = 1; i < LEVEL_TITLES.length; i += 1) {
    assert.ok(
      LEVEL_TITLES[i].minLevel > LEVEL_TITLES[i - 1].minLevel,
      "levelTitle percorre a lista assumindo ordem crescente",
    );
  }
});

test("minuto estudado vira 1 XP, sem negativo", () => {
  assert.equal(xpForStudyMinutes(0), 0);
  assert.equal(xpForStudyMinutes(25), 25);
  assert.equal(xpForStudyMinutes(-10), 0);
  assert.equal(xpForStudyMinutes(12.4), 12, "arredonda em vez de gerar XP fracionário");
});

test("bônus de streak é 5 XP por dia do marco", () => {
  assert.equal(streakBonusXp(7), 35);
  assert.equal(streakBonusXp(30), 150);
  assert.equal(streakBonusXp(100), 500);
});
