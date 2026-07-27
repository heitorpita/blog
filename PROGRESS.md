# Progresso — Melhorias Studyfolio

> Leia este arquivo antes de começar qualquer tarefa. Ele é atualizado a cada etapa concluída.

## Status geral

- [ ] 1. Dashboard → Grafo de conexões
- [x] 2. Matérias → CRUD de matérias + tópicos com checkbox ✅ **concluída**
- [ ] 3. Cérebro → renomear + XP turbinado

**Próximo passo: tarefa 1 (grafo).** A fundação do ledger de XP já está pronta, o que adianta
boa parte da tarefa 3 também.

---

## Diagnóstico do código atual (feito em 2026-07-27)

Verificado direto no código, não suposto:

### O "bug" da aba Matérias não é um bug — a feature nunca existiu

- Não existe `app/api/subjects/` (as únicas rotas são `journal`, `sessions`, `tasks`,
  `login`, `logout`). A hipótese do prompt estava certa.
- Também **não existe UI** para criar matéria. A página `/subjects` só lista o que veio do seed.
- `Subject.topics` é um `String[]` no schema, populado por `prisma/seed.ts` a partir de
  `data/subjects.ts`. É **somente leitura** na interface: vira chips estáticos na página da
  matéria e preenche o dropdown de tópico do `TaskManager`.

Ou seja: a tarefa 2 é "construir a feature", não "corrigir um bug".

### XP: os gráficos da tarefa 3 são deriváveis, mas o total pode divergir

- `CharacterState` guarda **só** `totalXp: Int`. Não há histórico de XP.
- **Boa notícia:** os itens 3.4 (XP no tempo), 3.6 (breakdown por matéria) e 3.7 (feed de
  eventos) *são* deriváveis do que já existe — `Task.completedAt` + `xp` + `subjectId` e
  `StudySession.endedAt` + `xpEarned` + `subjectId`. Não é obrigatório criar tabela nova.
- **Risco:** `totalXp` é um contador independente, incrementado por `lib/character.ts`. Ele pode
  divergir da soma real das tarefas/sessões (ex: se uma matéria for deletada em cascata, o XP
  dela some das linhas mas continua no contador).
- **Bloqueio real:** bônus de streak (item 3.3) e XP de tópico (tarefa 2) não têm nenhuma linha
  de origem onde morar — precisam de um lugar no schema.

### Escala do grafo (tarefa 1)

`StudySession` cresce sem limite: cada pomodoro é uma linha. Num semestre são centenas de nós de
sessão, que afogam a estrutura que interessa (matéria → tópico → tarefa → post).

---

## 1. Dashboard (grafo)

- Decisão tomada: **pendente** — ver "Decisões abertas".
- Biblioteca escolhida: **`react-force-graph-2d`** (proposta, ver justificativa abaixo).
- Arquivos criados/alterados: nenhum ainda.
- Próximo passo: fechar as decisões abertas e implementar.

### Por que 2D e não 3D

`react-force-graph-2d@1.29.1` (canvas 2D) vs `react-force-graph-3d@1.29.1` (puxa
`3d-force-graph` → `three >=0.179 <1`, compatível com o `three@0.185` já instalado).
Ambos funcionam; a escolha é pelo 2D porque:

1. **Legibilidade** — o grafo existe para *ler* relações. Em 3D os rótulos se sobrepõem e ficam
   ocultos atrás de nós.
2. **Interações pedidas** — arrastar nós é nativo e preciso em 2D; em 3D é impreciso.
3. **Custo de WebGL** — o painel do Cérebro já renderiza um `<Canvas>` Three.js em **todas** as
   páginas, inclusive o dashboard. Um segundo contexto WebGL na mesma tela é caro e navegadores
   limitam contextos ativos.
4. **Hierarquia visual** — o 3D é a identidade do Cérebro. Deixar o dashboard também em 3D dilui
   esse destaque.

---

## 2. Matérias — CONCLUÍDA

- Diagnóstico do bug: **rota `/api/subjects` inexistente e nenhuma UI de criação** (ver acima).
- Migration aplicada? **sim** — `20260727180000_topics_and_xp_ledger` (escrita à mão, ver abaixo).
- Rotas implementadas: [x] GET [x] POST [x] PATCH [x] DELETE (`/api/subjects` e `/api/subjects/[id]`)
- Rotas de tópico: [x] `GET/POST /api/subjects/[id]/topics` [x] `PATCH/DELETE /api/topics/[id]`
- UI de checklist implementada? **sim** — `components/topics/topic-checklist.tsx`
- UI de criar matéria? **sim** — `components/subjects/subject-creator.tsx` (form inline, sem modal)
- XP de tópico: **sim, 30 XP** (`TOPIC_COMPLETION_XP` em `lib/xp.ts`). Desmarcar estorna.

### Por que a migration foi escrita à mão

`prisma migrate dev` exige confirmação interativa para drops e o ambiente é não interativo. O SQL
foi gerado com `prisma migrate diff --from-config-datasource` e reordenado à mão para
**criar → migrar dados → só então dropar**. Nada foi descartado sem antes ser convertido:

- `Subject.topics` (String[]) → 50 linhas em `Topic`, com a ordem do array preservada em `order`.
- `Task.topic` (texto livre) → FK `Task.topicId`, casando por título dentro da mesma matéria.
- Tarefas concluídas e sessões → eventos no ledger; conferiu 225 XP, igual ao contador antigo
  (por isso o evento de `ADJUSTMENT` não chegou a ser criado).

### Mudança de escopo além do pedido

`Task.topic` era texto livre e virou relação real com `Topic`. Não estava no pedido, mas é o que
permite a aresta Tarefa→Tópico no grafo da tarefa 1 — e fazer depois custaria uma terceira
migration. **`TaskItem.topic` virou `TaskItem.topicId`** em `components/tasks/task-manager.tsx`.

### Progresso da matéria mudou de base

Antes era `tarefas concluídas / tarefas totais`; agora é `tópicos estudados / tópicos totais`,
tanto no card da lista quanto no cabeçalho da matéria — que é o que o pedido descreve.

### Arquivos criados/alterados

Criados: `app/api/subjects/route.ts`, `app/api/subjects/[id]/route.ts`,
`app/api/subjects/[id]/topics/route.ts`, `app/api/topics/[id]/route.ts`,
`components/topics/topic-checklist.tsx`, `components/subjects/subject-creator.tsx`,
`prisma/migrations/20260727180000_topics_and_xp_ledger/`.

Alterados: `prisma/schema.prisma`, `prisma/seed.ts` (idempotente, não apaga tópicos já marcados),
`lib/character.ts` (reescrito para o ledger), `lib/xp.ts`, `components/layout/app-shell.tsx`,
`components/tasks/task-manager.tsx`, `app/(app)/subjects/page.tsx`,
`app/(app)/subjects/[id]/page.tsx`, `app/api/tasks/route.ts`, `app/api/tasks/[id]/route.ts`,
`app/api/sessions/route.ts`.

---

## 3. Cérebro

- Renomeação feita em: nada ainda.
- Features de XP implementadas: [ ] títulos por nível [ ] streak [ ] gráfico XP no tempo
  [ ] heatmap [ ] breakdown por matéria [ ] histórico de eventos [ ] animação level up
- **A fundação já existe:** o ledger `XpEvent` foi criado na tarefa 2. Os itens de gráfico no
  tempo, heatmap, breakdown por matéria e feed de eventos agora são consultas diretas nele —
  não precisam de schema novo. Só o bônus de streak precisa gravar (`source: "STREAK"`).
- Próximo passo (quando chegar a vez): renomear Personagem → Cérebro e consumir o ledger.

---

## Decisões fechadas (2026-07-27)

1. **Sessões no grafo: agregadas por matéria + dia.** Um nó de estudo por matéria por dia, tamanho
   proporcional aos minutos. Evita centenas de nós de pomodoro sem perder o sinal de atividade.
2. **Criar ledger `XpEvent`.** Vira a fonte única de verdade do XP. Resolve de uma vez o gráfico no
   tempo, heatmap, breakdown por matéria, feed de eventos e os bônus de streak — e elimina o risco
   do contador divergir.
3. **Ordem: 2 → 1 → 3.** Desbloqueia o uso primeiro; e com `Topic` virando tabela, o grafo da
   tarefa 1 já nasce com tópicos como nós de primeira classe.

### Consequência da decisão 2 no escopo da tarefa 2

O ledger entra **agora**, junto da tarefa 2, porque o XP de tópico precisa de onde morar. Fazer
depois exigiria duas migrations. `CharacterState` é removido: `totalXp` passa a ser
`SUM(XpEvent.amount)`, então não existe mais contador para divergir.

---

## Decisões e observações importantes

- O app é protegido por senha única (`APP_PASSWORD`) via `proxy.ts`. **Qualquer rota de API nova
  já nasce protegida** pelo matcher do proxy — não precisa adicionar auth manualmente, mas
  lembre que testes via `curl` precisam do cookie de sessão.
- As páginas do app vivem no route group `app/(app)/` (que carrega o `AppShell`). O route group
  não aparece na URL. `/login` fica fora dele de propósito.
- `app/(app)/layout.tsx` tem `export const dynamic = "force-dynamic"` porque o shell lê o banco.
  Não prerenderizar é intencional: o banco não existe durante o build no Coolify.
- Prisma 7: a connection string vive em `prisma.config.ts`, **nunca** no `schema.prisma` (o
  campo `url` no datasource é erro de validação). O client usa o adapter `@prisma/adapter-pg`.
- O client do Prisma é gerado em `lib/generated/` (gitignored, recriado pelo `postinstall`).
- **Estorno de XP apaga o evento** em vez de gravar um valor negativo, para o feed da tarefa 3 não
  encher de ruído de idas e voltas. Deletar tarefa/tópico/matéria remove o XP em cascata (FK).
- **Migrations com drop precisam ser escritas à mão** neste ambiente (não interativo). Use
  `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`,
  reordene para backfillar antes dos drops, e aplique com `npx prisma migrate deploy`.
- Ao adicionar rota nova, rode `npx next typegen` antes do `tsc` — senão `RouteContext<"...">`
  falha com "does not satisfy the constraint AppRouteHandlerRoutes" (tipos ainda não gerados).
- Evite dois botões com o mesmo rótulo na mesma página ("Adicionar" × 2 quebrou teste e leitor de
  tela); hoje são "Adicionar tópico" e "Adicionar tarefa".
