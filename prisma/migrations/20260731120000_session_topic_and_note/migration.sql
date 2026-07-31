-- Sessão de estudo ganha assunto e anotação.
--
-- Antes a sessão só apontava para a matéria, então "3h de Cálculo" não dizia
-- 3h de quê. Com o tópico, dá para ver onde o tempo está indo dentro da ementa.
-- `note` responde "o que eu fiz nessas 3h" — sem ela, sessão é bloco anônimo.
--
-- SET NULL no tópico, não CASCADE: apagar um item da ementa não pode apagar as
-- horas que você gastou nele. Mesma regra já adotada em XpEvent.subjectId na
-- migration 20260730130000.

-- AlterTable
ALTER TABLE "StudySession" ADD COLUMN     "note" TEXT,
ADD COLUMN     "topicId" TEXT;

-- CreateIndex
CREATE INDEX "StudySession_topicId_idx" ON "StudySession"("topicId");

-- AddForeignKey
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
