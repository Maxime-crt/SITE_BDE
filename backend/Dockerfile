# Backend Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copier les fichiers package
COPY package*.json ./
COPY prisma ./prisma/

# Installer les dépendances
RUN npm ci

# Copier le reste du code
COPY . .

# Générer le client Prisma
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Exposer le port
EXPOSE 3001

# Démarrer l'application
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
