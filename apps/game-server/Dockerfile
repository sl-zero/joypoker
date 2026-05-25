FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/game-server/package.json ./apps/game-server/
COPY packages/cards-core/package.json ./packages/cards-core/
COPY packages/rules-schema/package.json ./packages/rules-schema/

RUN npm install --ignore-scripts --legacy-peer-deps

COPY . .

RUN npm run build -w @poker/cards-core
RUN npm run build -w @poker/rules-schema
RUN npx prisma generate --schema=apps/web/prisma/schema.prisma
RUN npm run build -w @poker/game-server

ENV NODE_ENV=production

CMD ["node", "apps/game-server/dist/index.js"]
