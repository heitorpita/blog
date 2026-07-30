import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkLoginAllowed,
  clientKey,
  registerLoginFailure,
  registerLoginSuccess,
} from "@/lib/login-throttle";

const T0 = 1_700_000_000_000;
const min = (n: number) => n * 60_000;

// O estado do freio é de módulo, então cada teste usa uma chave própria para
// não contaminar o vizinho.
let contador = 0;
const novoIp = () => `198.51.100.${(contador += 1)}`;

test("as primeiras tentativas passam", () => {
  const ip = novoIp();
  for (let i = 0; i < 4; i += 1) {
    assert.equal(checkLoginAllowed(ip, T0).allowed, true, `tentativa ${i + 1}`);
    registerLoginFailure(ip, T0);
  }
  assert.equal(checkLoginAllowed(ip, T0).allowed, true, "4 erros ainda não bloqueiam");
});

test("o quinto erro bloqueia e informa quanto esperar", () => {
  const ip = novoIp();
  for (let i = 0; i < 5; i += 1) registerLoginFailure(ip, T0);

  const veredito = checkLoginAllowed(ip, T0);
  assert.equal(veredito.allowed, false);
  assert.ok(!veredito.allowed && veredito.retryAfterSeconds > 0);
});

test("o bloqueio cresce a cada erro além do limite", () => {
  const ip = novoIp();
  for (let i = 0; i < 5; i += 1) registerLoginFailure(ip, T0);
  const primeiro = checkLoginAllowed(ip, T0);

  registerLoginFailure(ip, T0);
  const segundo = checkLoginAllowed(ip, T0);

  assert.ok(
    !primeiro.allowed && !segundo.allowed && segundo.retryAfterSeconds > primeiro.retryAfterSeconds,
    "backoff exponencial",
  );
});

test("passado o tempo, volta a aceitar", () => {
  const ip = novoIp();
  for (let i = 0; i < 5; i += 1) registerLoginFailure(ip, T0);

  assert.equal(checkLoginAllowed(ip, T0).allowed, false);
  assert.equal(checkLoginAllowed(ip, T0 + min(20)).allowed, true);
});

test("o bloqueio é por IP: quem não errou não paga", () => {
  const culpado = novoIp();
  const inocente = novoIp();

  for (let i = 0; i < 5; i += 1) registerLoginFailure(culpado, T0);

  assert.equal(checkLoginAllowed(culpado, T0).allowed, false);
  assert.equal(checkLoginAllowed(inocente, T0).allowed, true);
});

test("acertar a senha limpa o histórico do IP", () => {
  const ip = novoIp();
  for (let i = 0; i < 5; i += 1) registerLoginFailure(ip, T0);
  assert.equal(checkLoginAllowed(ip, T0).allowed, false);

  registerLoginSuccess(ip);
  assert.equal(checkLoginAllowed(ip, T0).allowed, true);
});

test("clientKey lê o primeiro IP do x-forwarded-for", () => {
  const req = new Request("http://x/", {
    headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" },
  });
  assert.equal(clientKey(req), "203.0.113.9");
});

test("clientKey cai para x-real-ip e depois para um rótulo fixo", () => {
  assert.equal(
    clientKey(new Request("http://x/", { headers: { "x-real-ip": "203.0.113.10" } })),
    "203.0.113.10",
  );
  assert.equal(clientKey(new Request("http://x/")), "desconhecido");
});

// Deixado por último de propósito: o teto global é estado compartilhado e, uma
// vez estourado, afeta qualquer chave.
test("teto global segura enxurrada de IPs forjados", () => {
  const t = T0 + min(60);
  for (let i = 0; i < 60; i += 1) registerLoginFailure(`10.0.${i}.1`, t);

  assert.equal(
    checkLoginAllowed("10.0.99.99", t).allowed,
    false,
    "forjar x-forwarded-for escapa do balde por IP, mas não do teto geral",
  );
});
