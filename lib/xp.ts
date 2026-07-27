const XP_PER_LEVEL_UNIT = 100;

export const XP_PER_MINUTE_STUDIED = 1;

export const TASK_XP_PRESETS = {
  quick: 10,
  standard: 20,
  topicReview: 30,
} as const;

/** XP por marcar um tópico da ementa como estudado. */
export const TOPIC_COMPLETION_XP = 30;

export function levelForXp(totalXp: number): number {
  return Math.floor(Math.sqrt(Math.max(totalXp, 0) / XP_PER_LEVEL_UNIT));
}

export function xpForLevel(level: number): number {
  return level * level * XP_PER_LEVEL_UNIT;
}

/** Títulos por faixa de nível. `minLevel` em ordem crescente. */
export const LEVEL_TITLES = [
  { minLevel: 0, title: "Iniciante" },
  { minLevel: 2, title: "Aprendiz" },
  { minLevel: 5, title: "Estudioso" },
  { minLevel: 10, title: "Mestre" },
] as const;

export function levelTitle(level: number): string {
  let title: string = LEVEL_TITLES[0].title;
  for (const tier of LEVEL_TITLES) {
    if (level >= tier.minLevel) title = tier.title;
  }
  return title;
}

/** Marcos de streak que rendem bônus, em dias. */
export const STREAK_MILESTONES = [7, 30, 100] as const;

export function streakBonusXp(days: number): number {
  return days * 5;
}

export function xpProgress(totalXp: number) {
  const xp = Math.max(totalXp, 0);
  const level = levelForXp(xp);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const xpIntoLevel = xp - currentLevelXp;
  const xpNeededForNext = nextLevelXp - currentLevelXp;
  const progress = xpNeededForNext === 0 ? 1 : xpIntoLevel / xpNeededForNext;

  return {
    level,
    title: levelTitle(level),
    xp,
    currentLevelXp,
    nextLevelXp,
    xpIntoLevel,
    xpNeededForNext,
    progress,
    percent: Math.round(progress * 100),
  };
}

export function xpForStudyMinutes(minutes: number): number {
  return Math.round(Math.max(minutes, 0) * XP_PER_MINUTE_STUDIED);
}
