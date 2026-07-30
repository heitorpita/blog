// Freio de força bruta para o login. O app tem uma senha só, sem segundo fator
// e sem bloqueio de conta: sem isso, um script tenta milhares de senhas por
// minuto contra um endpoint que responde na hora.
//
// O estado vive em memória porque o app roda em um container só. Reiniciar o
// processo zera a contagem — aceitável: o atacante perde o progresso junto.

const MAX_FAILURES_PER_IP = 5;
const MAX_FAILURES_GLOBAL = 60;

/** Silêncio nesse tempo desde a última tentativa e a contagem é esquecida. */
const WINDOW_MS = 15 * 60 * 1000;

const FIRST_BLOCK_MS = 30 * 1000;
const MAX_BLOCK_MS = 15 * 60 * 1000;

/** Teto de chaves rastreadas, para uma enxurrada de IPs forjados não crescer sem fim. */
const MAX_TRACKED_IPS = 5_000;

type Bucket = { failures: number; lastAttempt: number; blockedUntil: number };

const perIp = new Map<string, Bucket>();
const global: Bucket = { failures: 0, lastAttempt: 0, blockedUntil: 0 };

function fresh(): Bucket {
  return { failures: 0, lastAttempt: 0, blockedUntil: 0 };
}

/** Zera o balde se a janela expirou, para quem erra a senha uma vez por semana não acumular. */
function current(bucket: Bucket, now: number): Bucket {
  if (bucket.blockedUntil <= now && now - bucket.lastAttempt > WINDOW_MS) {
    bucket.failures = 0;
    bucket.blockedUntil = 0;
  }
  return bucket;
}

function blockDuration(failures: number, limit: number): number {
  // Dobra a cada erro além do limite: 30s, 1min, 2min… até o teto.
  const step = Math.max(0, failures - limit);
  return Math.min(FIRST_BLOCK_MS * 2 ** step, MAX_BLOCK_MS);
}

function prune(now: number) {
  if (perIp.size <= MAX_TRACKED_IPS) return;

  for (const [key, bucket] of perIp) {
    if (bucket.blockedUntil <= now && now - bucket.lastAttempt > WINDOW_MS) perIp.delete(key);
  }

  // Ainda cheio depois da limpeza: descarta o mais antigo (Map preserva a ordem
  // de inserção) para o mapa nunca virar vetor de memória.
  while (perIp.size > MAX_TRACKED_IPS) {
    const oldest = perIp.keys().next();
    if (oldest.done) break;
    perIp.delete(oldest.value);
  }
}

/**
 * Identidade da tentativa. `x-forwarded-for` é falsificável quando o app está
 * exposto direto, e é por isso que existe também o limite global: forjar IP
 * escapa do balde por IP, mas não do teto geral.
 */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "desconhecido";
}

export type ThrottleVerdict = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export function checkLoginAllowed(key: string, now = Date.now()): ThrottleVerdict {
  const blockedUntil = Math.max(
    current(perIp.get(key) ?? fresh(), now).blockedUntil,
    current(global, now).blockedUntil,
  );

  if (blockedUntil > now) {
    return { allowed: false, retryAfterSeconds: Math.ceil((blockedUntil - now) / 1000) };
  }

  return { allowed: true };
}

export function registerLoginFailure(key: string, now = Date.now()): void {
  prune(now);

  const bucket = current(perIp.get(key) ?? fresh(), now);
  bucket.failures += 1;
  bucket.lastAttempt = now;
  if (bucket.failures >= MAX_FAILURES_PER_IP) {
    bucket.blockedUntil = now + blockDuration(bucket.failures, MAX_FAILURES_PER_IP);
  }
  perIp.set(key, bucket);

  const total = current(global, now);
  total.failures += 1;
  total.lastAttempt = now;
  if (total.failures >= MAX_FAILURES_GLOBAL) {
    total.blockedUntil = now + blockDuration(total.failures, MAX_FAILURES_GLOBAL);
  }

  if (bucket.blockedUntil > now) {
    console.warn(
      `[login] ${bucket.failures} tentativas falhas de ${key}; bloqueado por ${Math.ceil(
        (bucket.blockedUntil - now) / 1000,
      )}s`,
    );
  }
}

/** Acertou a senha: o IP volta a ficar limpo e o contador global recua. */
export function registerLoginSuccess(key: string): void {
  perIp.delete(key);
  global.failures = 0;
  global.blockedUntil = 0;
}
