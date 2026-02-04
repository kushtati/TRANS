# Stage 1: Build
FROM node:20-alpine AS builder

# Installer OpenSSL pour Prisma
RUN apk add --no-cache openssl

# Définir le répertoire de travail
WORKDIR /app

# Copier package.json
COPY package*.json ./

# Installer TOUTES les dépendances (dev incluses pour build)
RUN npm install && npm cache clean --force

# Copier le code source
COPY . .

# Générer Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

# Installer OpenSSL pour Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copier package.json
COPY package*.json ./

# Installer seulement les dépendances de production
RUN npm install --production && npm cache clean --force

# Copier le code build depuis le stage builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Générer Prisma Client en production
RUN npx prisma generate

# Exposer le port
EXPOSE 5000

# Démarrer l'application
CMD ["npm", "run", "start:railway"]
