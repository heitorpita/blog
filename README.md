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

1. Suba um **PostgreSQL** dedicado (New Resource → Database) e copie a connection string interna.
   Um banco novo já nasce com o usuário como dono, então não precisa de `GRANT` nenhum.
2. **Build Pack**: Dockerfile.
3. **Environment Variables**:
   ```
   DATABASE_URL=<connection string interna do Postgres>
   APP_PASSWORD=<a senha de acesso ao app>
   NODE_ENV=production
   ```
   Nenhuma delas é build variable — o build não toca no banco nem na senha.
4. Garanta que a aplicação esteja na mesma rede Docker do Postgres.
5. Adicione o domínio (SSL via Let's Encrypt é automático) e faça o deploy.

O cookie de sessão usa o flag `Secure` em produção, então o acesso precisa ser por **HTTPS** — o
que o Coolify já provisiona.

O seed não roda no deploy. Para popular as matérias em produção, rode `npm run db:seed` uma vez
com o `DATABASE_URL` de produção.

As rotas que leem o banco são todas dinâmicas, então o banco não precisa existir durante o build.
