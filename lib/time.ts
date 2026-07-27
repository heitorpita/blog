// O banco guarda UTC, mas "dias estudados" precisam usar o fuso de quem estuda:
// uma sessão às 22h em Brasília é 01h UTC do dia seguinte e cairia no dia errado
// no streak, no heatmap e no gráfico de XP.
export const APP_TIMEZONE = process.env.APP_TIMEZONE ?? "America/Sao_Paulo";

/** Chave YYYY-MM-DD do dia local. `en-CA` já formata nesse formato. */
export function dayKey(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: APP_TIMEZONE });
}

export function todayKey(): string {
  return dayKey(new Date());
}

/** Soma dias a uma chave YYYY-MM-DD sem esbarrar em horário de verão. */
export function shiftDayKey(key: string, days: number): string {
  const [year, month, day] = key.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export function formatDayLabel(key: string): string {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}
