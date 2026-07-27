-- Tópicos viram tabela própria (antes: Subject.topics String[]) e o XP passa a ter
-- um ledger como fonte única de verdade (antes: contador CharacterState.totalXp).
--
-- A ordem importa: cria as estruturas novas, migra os dados existentes e só então
-- derruba as colunas/tabelas antigas. Nada é descartado sem antes ser convertido.

-- CreateEnum
CREATE TYPE "XpSource" AS ENUM ('TASK', 'TOPIC', 'SESSION', 'STREAK', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subjectId" TEXT NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XpEvent" (
    "id" TEXT NOT NULL,
    "source" "XpSource" NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subjectId" TEXT,
    "taskId" TEXT,
    "topicId" TEXT,
    "sessionId" TEXT,

    CONSTRAINT "XpEvent_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "topicId" TEXT;

-- CreateIndex
CREATE INDEX "Topic_subjectId_idx" ON "Topic"("subjectId");
CREATE INDEX "XpEvent_createdAt_idx" ON "XpEvent"("createdAt");
CREATE INDEX "XpEvent_subjectId_idx" ON "XpEvent"("subjectId");
CREATE INDEX "StudySession_endedAt_idx" ON "StudySession"("endedAt");
CREATE INDEX "Task_topicId_idx" ON "Task"("topicId");

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "XpEvent" ADD CONSTRAINT "XpEvent_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "XpEvent" ADD CONSTRAINT "XpEvent_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "XpEvent" ADD CONSTRAINT "XpEvent_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "XpEvent" ADD CONSTRAINT "XpEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StudySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: cada item de Subject.topics vira uma linha em Topic, preservando a ordem do array.
INSERT INTO "Topic" ("id", "title", "order", "subjectId", "createdAt")
SELECT gen_random_uuid()::text, item.title, item.ord - 1, s."id", CURRENT_TIMESTAMP
FROM "Subject" s, LATERAL unnest(s."topics") WITH ORDINALITY AS item(title, ord);

-- Backfill: Task.topic era texto livre; liga à linha de Topic correspondente da mesma matéria.
UPDATE "Task" t
SET "topicId" = tp."id"
FROM "Topic" tp
WHERE tp."subjectId" = t."subjectId" AND tp."title" = t."topic";

-- Backfill: histórico de XP das tarefas já concluídas.
INSERT INTO "XpEvent" ("id", "source", "amount", "description", "createdAt", "subjectId", "taskId")
SELECT gen_random_uuid()::text, 'TASK', t."xp", 'Tarefa concluída: ' || t."title",
       COALESCE(t."completedAt", t."createdAt"), t."subjectId", t."id"
FROM "Task" t
WHERE t."status" = 'DONE';

-- Backfill: histórico de XP das sessões de estudo.
INSERT INTO "XpEvent" ("id", "source", "amount", "description", "createdAt", "subjectId", "sessionId")
SELECT gen_random_uuid()::text, 'SESSION', s."xpEarned",
       'Sessão de estudo: ' || s."durationMinutes" || ' min',
       s."endedAt", s."subjectId", s."id"
FROM "StudySession" s;

-- Se o contador antigo não bater com a soma dos eventos reconstruídos, registra a
-- diferença como ajuste para o XP total do usuário não mudar por causa da migração.
INSERT INTO "XpEvent" ("id", "source", "amount", "description", "createdAt")
SELECT gen_random_uuid()::text, 'ADJUSTMENT', d.diff,
       'Ajuste da migração para o ledger de XP', CURRENT_TIMESTAMP
FROM (
  SELECT COALESCE((SELECT "totalXp" FROM "CharacterState" WHERE "id" = 1), 0)
       - COALESCE((SELECT SUM("amount") FROM "XpEvent"), 0) AS diff
) d
WHERE d.diff <> 0;

-- Só agora o que virou legado pode sair.
ALTER TABLE "Subject" DROP COLUMN "topics";
ALTER TABLE "Task" DROP COLUMN "topic";
DROP TABLE "CharacterState";
