-- Uma tarefa/tópico concede XP no máximo uma vez.
--
-- Antes de criar a restrição, apaga as duplicatas que dois cliques rápidos no
-- checkbox podem ter gravado (a rota concedia XP fora de transação e sem trava),
-- mantendo o evento mais antigo de cada origem — que é o que a regra sempre quis
-- dizer. `id` entra no critério só para desempatar eventos do mesmo instante.
DELETE FROM "XpEvent" AS a
USING "XpEvent" AS b
WHERE a."taskId" IS NOT NULL
  AND a."taskId" = b."taskId"
  AND (a."createdAt", a."id") > (b."createdAt", b."id");

DELETE FROM "XpEvent" AS a
USING "XpEvent" AS b
WHERE a."topicId" IS NOT NULL
  AND a."topicId" = b."topicId"
  AND (a."createdAt", a."id") > (b."createdAt", b."id");

-- No Postgres um índice único trata NULLs como distintos, então os eventos de
-- sessão e de streak (que têm taskId/topicId nulos) continuam sem limite.

-- CreateIndex
CREATE UNIQUE INDEX "XpEvent_taskId_key" ON "XpEvent"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "XpEvent_topicId_key" ON "XpEvent"("topicId");
