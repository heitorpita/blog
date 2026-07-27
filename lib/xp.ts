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

export function xpProgress(totalXp: number) {
  const xp = Math.max(totalXp, 0);
  const level = levelForXp(xp);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const xpIntoLevel = xp - currentLevelXp;
  const xpNeededForNext = nextLevelXp - currentLevelXp;

  return {
    level,
    xp,
    currentLevelXp,
    nextLevelXp,
    xpIntoLevel,
    xpNeededForNext,
    progress: xpNeededForNext === 0 ? 1 : xpIntoLevel / xpNeededForNext,
  };
}

export function xpForStudyMinutes(minutes: number): number {
  return Math.round(Math.max(minutes, 0) * XP_PER_MINUTE_STUDIED);
}
