import "dotenv/config";
import { subjects } from "../data/subjects";
import { prisma } from "../lib/db";

async function main() {
  for (const { topics, ...subject } of subjects) {
    await prisma.subject.upsert({
      where: { id: subject.id },
      update: subject,
      create: subject,
    });

    // Só cria os tópicos que ainda não existem, para o seed poder rodar de novo
    // sem duplicar nem apagar o que já foi marcado como estudado.
    const existing = await prisma.topic.findMany({
      where: { subjectId: subject.id },
      select: { title: true },
    });
    const known = new Set(existing.map((topic) => topic.title));

    const missing = topics
      .map((title, index) => ({ title, order: index, subjectId: subject.id }))
      .filter((topic) => !known.has(topic.title));

    if (missing.length > 0) {
      await prisma.topic.createMany({ data: missing });
    }
  }

  console.log(`Seed concluído: ${subjects.length} matérias e seus tópicos.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
