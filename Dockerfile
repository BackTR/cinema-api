# Stage 1 — Builder
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

# Pakai npm install untuk lebih toleran terhadap lock file differences
RUN npm install && npm cache clean --force

COPY . .

RUN npx prisma generate
RUN npm run build
RUN npm prune --production

# Stage 2 — Production
FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache curl

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

ENV NODE_ENV=production

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]