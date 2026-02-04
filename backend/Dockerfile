# Utiliser Node.js 20 (LTS)
FROM node:20-alpine

# Installer OpenSSL pour Prisma
RUN apk add --no-cache openssl

# Définir le répertoire de travail
WORKDIR /app

# Copier package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production && npm cache clean --force

# Copier le code source
COPY . .

# Générer Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Exposer le port (Railway utilise la variable PORT)
EXPOSE 5000

# Démarrer l'application
CMD ["npm", "run", "start:railway"]
