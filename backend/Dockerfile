FROM node:22-alpine AS build

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src

RUN npm run build

FROM node:22-alpine

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production

COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node --from=build /app/prisma ./prisma
COPY --chown=node:node --from=build /app/package.json ./package.json
COPY --chown=node:node --from=build /app/tsconfig.json ./tsconfig.json

USER node
EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && npm run db:seed && exec node dist/main.js"]
