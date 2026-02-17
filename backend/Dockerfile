# Stage 1: Build
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./

# npm ci = clean install from lockfile (no cache, no stale packages)
RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

# Stage 2: Production (minimal)
FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./

# Production deps only — clean install
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

RUN npx prisma generate

EXPOSE 8080

CMD ["npm", "run", "start:railway"]
