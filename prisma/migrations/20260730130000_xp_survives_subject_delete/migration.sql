-- Duas mudanças no ledger de XP.
--
-- 1. Apagar uma matéria deixa de apagar o XP dela.
--    Com ON DELETE CASCADE, arquivar uma matéria do semestre passado derrubava o
--    total, REGREDIA o nível e encolhia o cérebro 3D. O esforço aconteceu; a
--    matéria ter saído não desfaz as horas estudadas. `getXpBySubject` já tratava
--    o caso com o rótulo "Matéria removida" — até agora, código inalcançável.
--
-- 2. O bônus de streak passa a ser identificado por número, não por texto.
--    A idempotência dependia de casar a descrição exata ("Streak de 7 dias"), então
--    renomear o texto reconcederia todos os bônus históricos.

-- DropForeignKey
ALTER TABLE "XpEvent" DROP CONSTRAINT "XpEvent_subjectId_fkey";

-- AlterTable
ALTER TABLE "XpEvent" ADD COLUMN     "milestoneDays" INTEGER;

-- Backfill: extrai o número dos eventos de streak já concedidos, para que eles
-- continuem valendo como "já ganhou" depois da troca de chave. Sem isto, o
-- primeiro estudo após o deploy reconcederia todos os marcos.
UPDATE "XpEvent"
SET "milestoneDays" = CAST(substring("description" FROM '\d+') AS INTEGER)
WHERE "source" = 'STREAK'
  AND "description" ~ '\d+';

-- Se houver duplicata histórica do mesmo marco (o findFirst+create anterior tinha
-- corrida), mantém a mais antiga — senão o índice único abaixo não sobe.
DELETE FROM "XpEvent" AS a
USING "XpEvent" AS b
WHERE a."milestoneDays" IS NOT NULL
  AND a."milestoneDays" = b."milestoneDays"
  AND (a."createdAt", a."id") > (b."createdAt", b."id");

-- CreateIndex
CREATE UNIQUE INDEX "XpEvent_milestoneDays_key" ON "XpEvent"("milestoneDays");

-- AddForeignKey
ALTER TABLE "XpEvent" ADD CONSTRAINT "XpEvent_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
