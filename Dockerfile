# Utiliser l'image Node.js officielle
FROM node:18-alpine

# Créer le répertoire de l'application
WORKDIR /app

# Copier les fichiers package.json
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Installer les dépendances
RUN npm ci --only=production

# Copier le code source
COPY . .

# Générer le client Prisma
RUN cd backend && npx prisma generate

# Build le projet
RUN npm run build

# Exposer le port
EXPOSE 5000

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=5000

# Commande de démarrage
CMD ["npm", "start"]