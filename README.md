# Sinapse

Site pessoal de gestão de estudos: um "segundo cérebro" onde matérias, tópicos, tarefas e
anotações formam um grafo de conexões, combinado com progressão de personagem em 3D. Cada tarefa
concluída, tópico estudado e minuto de estudo viram XP.

Stack: Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Prisma 7 + PostgreSQL ·
React Three Fiber · Recharts.

## Funcionalidades

- **Dashboard** — grafo interativo estilo Obsidian ligando matérias, tópicos, tarefas, sessões e
  posts. Zoom, arrastar nós, filtro por matéria e painel de detalhes. Acima dele, um resumo
  compacto com nível, estudo na semana e próxima tarefa.
- **Matérias** — CRUD de matérias, checklist de tópicos da ementa (30 XP cada) e tarefas com
  prioridade, status e XP.
- **Cronômetro** — modo livre e Pomodoro configurável, vinculado a uma matéria; converte tempo em XP.
- **Jornada** — diário em Markdown com sidebar de navegação, sumário automático e editor com prévia.
- **Cérebro** — rede neural 3D que ganha neurônios e sinapses a cada nível, com animação na
  subida. Títulos por faixa (Iniciante → Aprendiz → Estudioso → Mestre), streak de dias
  consecutivos com bônus em marcos, curva de XP acumulado, heatmap de dias estudados,
  breakdown de XP por matéria e feed de atividade.

## Acesso

App de uso pessoal, protegido por uma senha única definida na env `APP_PASSWORD`. O
[proxy.ts](proxy.ts) bloqueia todas as páginas e rotas de API até o login, que grava um cookie
`HttpOnly` assinado com HMAC-SHA256 ([lib/auth.ts](lib/auth.ts)) e vale 30 dias.

A chave de assinatura deriva da própria senha: **trocar `APP_PASSWORD` derruba todas as sessões**.

Em produção o app **falha fechado** — sem `APP_PASSWORD` definida, tudo responde 503 em vez de
ficar aberto. Em desenvolvimento, sem a env var o login é dispensado.

## Regras de XP

Definidas em [lib/xp.ts](lib/xp.ts):

- Tarefa: 10 XP (rápida), 20 XP (padrão) ou 30 XP (revisão de tópico).
- Tópico da ementa marcado como estudado: 30 XP.
- Estudo: 1 XP por minuto.
- Bônus de streak: 5 XP por dia do marco (7, 30 e 100 dias), concedido uma única vez.
- Nível: `⌊√(XP / 100)⌋` — nível 1 aos 100 XP, nível 2 aos 400, nível 3 aos 900.
- Faixas de título em `LEVEL_TITLES`, editável.

Desmarcar ou excluir uma tarefa/tópico devolve o XP. O total vem de `SUM(XpEvent.amount)` — não
existe contador separado que possa divergir das linhas de origem.

## Desenvolvimento

Sobe um Postgres local (porta 5433, para não colidir com outros bancos na máquina):

```bash
docker compose up -d db
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

A aplicação fica em http://localhost:3000. O `.env` já aponta para esse banco local.

Scripts úteis:

| Script | O que faz |
| --- | --- |
| `npm run db:migrate` | Cria e aplica migrations |
| `npm run db:seed` | Popula as matérias e seus tópicos (idempotente) |
| `npm run db:studio` | Abre o Prisma Studio |
| `npm run lint` | ESLint |

## Modelo de dados

`Subject`, `Topic`, `Task`, `StudySession`, `JournalPost`, `JournalLink` e `XpEvent` — ver
[prisma/schema.prisma](prisma/schema.prisma). As matérias iniciais vêm de
[data/subjects.ts](data/subjects.ts).

`XpEvent` é o ledger de XP: toda origem (tarefa, tópico, sessão) grava um evento, e estornar
apaga o evento em vez de gravar um valor negativo.

No Prisma 7 a connection string fica em [prisma.config.ts](prisma.config.ts), não no schema, e o
client é instanciado com o adapter `@prisma/adapter-pg` em [lib/db.ts](lib/db.ts).

## API

| Rota | Métodos |
| --- | --- |
| `/api/subjects` | `GET`, `POST` |
| `/api/subjects/[id]` | `GET`, `PATCH`, `DELETE` |
| `/api/subjects/[id]/topics` | `GET`, `POST` |
| `/api/topics/[id]` | `PATCH`, `DELETE` |
| `/api/tasks` | `GET` (filtro opcional `?subjectId=`), `POST` |
| `/api/tasks/[id]` | `PATCH`, `DELETE` |
| `/api/sessions` | `GET`, `POST` |
| `/api/journal` | `GET`, `POST` |
| `/api/journal/[slug]` | `GET`, `PATCH`, `DELETE` |

## O grafo do dashboard

Montado em [lib/graph.ts](lib/graph.ts) e desenhado com `react-force-graph-2d` (canvas 2D, não
WebGL — o painel do Cérebro já usa um contexto WebGL em toda página).

A estrutura sai das FKs: Matéria → Tópico → Tarefa, mais posts e sessões. **Sessões são agregadas
por matéria + dia**, senão cada pomodoro viraria um nó e afogaria o grafo.

Além disso, escrever `[[Título]]` num post da Jornada cria um backlink, como no Obsidian. Os
alvos são gravados em `JournalLink` ao salvar, mas **resolvidos só na hora de montar o grafo** —
assim um link nunca aponta para um título que já mudou, e menções a algo que ainda não existe
aparecem como nós "sem destino", clicáveis para criar o post.

O tamanho do nó cresce com o número de conexões; nós com atividade nas últimas 24h pulsam.

## Fuso horário

"Dias estudados" (streak, heatmap, curva de XP) usam o fuso de `APP_TIMEZONE`
(padrão `America/Sao_Paulo`), não UTC — senão estudar às 22h contaria como o dia seguinte.
Ver [lib/time.ts](lib/time.ts).

## Deploy (Coolify)

A imagem é multi-stage e usa o output `standalone` do Next. O CLI do Prisma vive num diretório
separado (`/migrate`) dentro da imagem, porque ele não faz parte do bundle standalone — o container
roda `prisma migrate deploy` antes de subir o servidor.

1. Suba um **PostgreSQL** dedicado (New Resource → Database) e copie a connection string interna.
   Um banco novo já nasce com o usuário como dono, então não precisa de `GRANT` nenhum.
2. **Build Pack**: Dockerfile.
3. **Environment Variables**:
   ```
   DATABASE_URL=<connection string interna do Postgres>
   APP_PASSWORD=<a senha de acesso ao app>
   NODE_ENV=production
   # opcional, padrão America/Sao_Paulo
   APP_TIMEZONE=America/Sao_Paulo
   ```
   Nenhuma delas é build variable — o build não toca no banco nem na senha.
4. Garanta que a aplicação esteja na mesma rede Docker do Postgres.
5. Adicione o domínio (SSL via Let's Encrypt é automático) e faça o deploy.

O cookie de sessão usa o flag `Secure` em produção, então o acesso precisa ser por **HTTPS** — o
que o Coolify já provisiona.

O seed não roda no deploy. Para popular as matérias em produção, rode `npm run db:seed` uma vez
com o `DATABASE_URL` de produção.

As rotas que leem o banco são todas dinâmicas, então o banco não precisa existir durante o build.
