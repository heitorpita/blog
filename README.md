# Studyfolio

Site pessoal de gestão de estudos: documentação estilo GitBook combinada com progressão de
personagem em 3D. Cada tarefa concluída e cada minuto estudado viram XP.

Stack: Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Prisma 7 + PostgreSQL ·
React Three Fiber · Recharts.

## Funcionalidades

- **Dashboard** — XP total, nível, horas estudadas na semana, progresso por matéria e próximas tarefas.
- **Matérias** — tópicos da ementa e CRUD de tarefas com prioridade, status e XP.
- **Cronômetro** — modo livre e Pomodoro configurável, vinculado a uma matéria; converte tempo em XP.
- **Jornada** — diário em Markdown com sidebar de navegação, sumário automático e editor com prévia.
- **Personagem** — cena 3D que evolui de cor e ganha anéis/partículas a cada nível.

## Regras de XP

Definidas em [lib/xp.ts](lib/xp.ts):

- Tarefa: 10 XP (rápida), 20 XP (padrão) ou 30 XP (revisão de tópico).
- Estudo: 1 XP por minuto.
- Nível: `⌊√(XP / 100)⌋` — nível 1 aos 100 XP, nível 2 aos 400, nível 3 aos 900.

Desmarcar ou excluir uma tarefa concluída devolve o XP correspondente.

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
| `npm run db:seed` | Popula as matérias e o estado inicial do personagem |
| `npm run db:studio` | Abre o Prisma Studio |
| `npm run lint` | ESLint |

## Modelo de dados

`Subject`, `Task`, `StudySession`, `JournalPost` e `CharacterState` — ver
[prisma/schema.prisma](prisma/schema.prisma). As matérias iniciais vêm de
[data/subjects.ts](data/subjects.ts).

No Prisma 7 a connection string fica em [prisma.config.ts](prisma.config.ts), não no schema, e o
client é instanciado com o adapter `@prisma/adapter-pg` em [lib/db.ts](lib/db.ts).

## API

| Rota | Métodos |
| --- | --- |
| `/api/tasks` | `GET` (filtro opcional `?subjectId=`), `POST` |
| `/api/tasks/[id]` | `PATCH`, `DELETE` |
| `/api/sessions` | `GET`, `POST` |
| `/api/journal` | `GET`, `POST` |
| `/api/journal/[slug]` | `GET`, `PATCH`, `DELETE` |

## Deploy (Coolify)

A imagem é multi-stage e usa o output `standalone` do Next. O CLI do Prisma vive num diretório
separado (`/migrate`) dentro da imagem, porque ele não faz parte do bundle standalone — o container
roda `prisma migrate deploy` antes de subir o servidor.

1. **Build Pack**: Dockerfile.
2. **Environment Variables**:
   ```
   DATABASE_URL=postgresql://usuario:senha@HOST_POSTGRES:5432/studyfolio?schema=public
   NODE_ENV=production
   ```
   `HOST_POSTGRES` é o hostname interno do container Postgres na rede Docker do Coolify.
3. Crie um database e um usuário dedicados no Postgres existente, isolados dos outros projetos:
   ```sql
   CREATE DATABASE studyfolio;
   CREATE USER studyfolio_user WITH ENCRYPTED PASSWORD 'senha-forte';
   GRANT ALL PRIVILEGES ON DATABASE studyfolio TO studyfolio_user;
   ```
4. Garanta que a aplicação esteja na mesma rede Docker do Postgres.
5. Adicione o domínio (SSL via Let's Encrypt é automático) e faça o deploy.

O seed não roda no deploy. Para popular as matérias em produção, rode `npm run db:seed` uma vez
com o `DATABASE_URL` de produção.

Como todo o conteúdo é dinâmico (o layout lê o estado do personagem no banco), o app é renderizado
sob demanda — nada é prerenderizado em build time, então o banco não precisa existir durante o build.
