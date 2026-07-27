import "dotenv/config";
import { subjects } from "../data/subjects";
import { prisma } from "../lib/db";

async function main() {
  for (const subject of subjects) {
    await prisma.subject.upsert({
      where: { id: subject.id },
      update: {
        code: subject.code,
        name: subject.name,
        hours: subject.hours,
        teacher: subject.teacher,
        color: subject.color,
        topics: subject.topics,
      },
      create: subject,
    });
  }

  await prisma.characterState.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, totalXp: 0 },
  });

  console.log(`Seeded ${subjects.length} subjects and character state.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
