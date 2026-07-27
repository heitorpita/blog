import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "studyfolio_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

// A chave de assinatura deriva da própria senha: trocar a senha invalida
// automaticamente todas as sessões abertas.
function signingKey(password: string) {
  return createHash("sha256").update(password).digest();
}

function sign(payload: string, password: string) {
  return createHmac("sha256", signingKey(password)).update(payload).digest("hex");
}

function safeEqualHex(a: string, b: string) {
  const bufferA = Buffer.from(a, "hex");
  const bufferB = Buffer.from(b, "hex");

  if (bufferA.length === 0 || bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export function createSessionToken(password: string) {
  const expiresAt = String(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  return `${expiresAt}.${sign(expiresAt, password)}`;
}

export function isValidSessionToken(token: string | undefined, password: string) {
  if (!token) return false;

  const [expiresAt, signature] = token.split(".");
  if (!expiresAt || !signature) return false;
  if (!safeEqualHex(signature, sign(expiresAt, password))) return false;

  const expiry = Number(expiresAt);
  return Number.isFinite(expiry) && expiry > Date.now();
}

export function isCorrectPassword(attempt: string, password: string) {
  // Compara digests (sempre do mesmo tamanho) para não vazar o tamanho da senha.
  return timingSafeEqual(
    createHash("sha256").update(attempt).digest(),
    createHash("sha256").update(password).digest(),
  );
}
