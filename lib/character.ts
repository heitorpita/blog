import { prisma } from "@/lib/db";

export async function addXp(delta: number) {
  if (delta === 0) {
    return getCharacter();
  }

  return prisma.characterState.upsert({
    where: { id: 1 },
    update: { totalXp: { increment: delta } },
    create: { id: 1, totalXp: Math.max(delta, 0) },
  });
}

export async function getCharacter() {
  return prisma.characterState.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, totalXp: 0 },
  });
}
