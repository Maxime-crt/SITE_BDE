# Utiliser l'image Node.js officielle avec glibc (pas Alpine)
FROM node:18-slim

# Installer les dépendances système nécessaires pour Prisma
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Créer le répertoire de l'application
WORKDIR /app

# Copier les fichiers package.json
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Installer toutes les dépendances (dev + prod pour le build)
RUN npm ci

# Copier le code source
COPY . .

# Générer le client Prisma avec le bon binary target
RUN cd backend && npx prisma generate

# Build le projet
RUN npm run build

# Nettoyer les devDependencies après build
RUN npm prune --production

# Exposer le port
EXPOSE 5000

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=5000

# Commande de démarrage
CMD ["npm", "start"]