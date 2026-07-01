# =========================
# Builder
# =========================
FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y openssl

COPY package*.json ./

<<<<<<< HEAD
RUN npm install && npm cache clean --force
=======
RUN npm ci
>>>>>>> 5ef2ed08aadf0d26425b7f51e483aaab8eb80ef3

COPY . .

RUN npx prisma generate

RUN npm run build

# =========================
# Production
# =========================
FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y openssl

COPY package*.json ./

<<<<<<< HEAD
RUN npm install && npm cache clean --force
=======
RUN npm ci --omit=dev
>>>>>>> 5ef2ed08aadf0d26425b7f51e483aaab8eb80ef3

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node","dist/main"]