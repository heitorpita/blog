export type Pace = {
  /** Minutos estudados nos últimos 7 dias. */
  thisWeek: number;
  /** Minutos nos 7 dias anteriores a esses. */
  lastWeek: number;
  /** Variação percentual arredondada, ou `null` quando não existe base. */
  deltaPercent: number | null;
};

/**
 * Compara duas janelas de 7 dias.
 *
 * `null` quando a semana anterior foi zero: não existe variação percentual a
 * partir de zero, e mostrar "+100%" para quem saiu de 0 min seria mentira que
 * fica boa na tela. Nesse caso a UI diz "primeira semana registrada" em vez de
 * inventar um número.
 */
export function comparePace(thisWeek: number, lastWeek: number): Pace {
  const atual = Math.max(0, Math.round(thisWeek));
  const anterior = Math.max(0, Math.round(lastWeek));

  return {
    thisWeek: atual,
    lastWeek: anterior,
    deltaPercent: anterior === 0 ? null : Math.round(((atual - anterior) / anterior) * 100),
  };
}
