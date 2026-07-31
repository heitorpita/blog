export type HoursGoal = {
  /** Horas estudadas, com uma casa decimal. */
  done: number;
  /** Carga horária da disciplina. */
  target: number;
  /** 0 a 1, limitado no teto — passar da meta não estica a barra. */
  progress: number;
  percent: number;
  /** Horas que faltam, nunca negativo. */
  remaining: number;
  reached: boolean;
};

/**
 * Progresso contra a carga horária da matéria.
 *
 * `Subject.hours` existia no banco desde o começo e só era exibido como texto.
 * É a única meta que o app já tinha e não usava: 90h de Cálculo I não é
 * decoração, é o tamanho do semestre.
 *
 * `target` zero devolve progresso zero em vez de dividir por zero — matéria sem
 * carga horária definida simplesmente não tem meta.
 */
export function hoursGoal(minutesStudied: number, targetHours: number): HoursGoal {
  const done = Math.round(Math.max(0, minutesStudied) / 6) / 10;
  const target = Math.max(0, Math.round(targetHours));

  if (target === 0) {
    return { done, target: 0, progress: 0, percent: 0, remaining: 0, reached: false };
  }

  const bruto = done / target;
  const progress = Math.min(bruto, 1);

  return {
    done,
    target,
    progress,
    percent: Math.round(bruto * 100),
    remaining: Math.max(0, Math.round((target - done) * 10) / 10),
    reached: done >= target,
  };
}
