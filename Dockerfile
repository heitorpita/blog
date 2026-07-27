FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# O CLI do Prisma não faz parte do output standalone, então vive num diretório
# próprio com apenas as dependências necessárias para rodar `migrate deploy`.
FROM node:22-alpine AS migrator
WORKDIR /migrate
COPY package.json ./app-package.json
RUN npm init -y > /dev/null \
 && npm pkg set type=module \
 && npm install --no-fund --no-audit \
      "prisma@$(node -p "require('./app-package.json').dependencies.prisma")" \
      "dotenv@$(node -p "require('./app-package.json').devDependencies.dotenv")" \
 && rm app-package.json
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=migrator /migrate /migrate

EXPOSE 3000

CMD ["sh", "-c", "cd /migrate && ./node_modules/.bin/prisma migrate deploy && cd /app && node server.js"]
