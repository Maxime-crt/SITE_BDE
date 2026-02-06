# ============================================
# Multi-stage build pour Site BDE
# Frontend (React/Vite) + Backend (Express/Prisma)
# ============================================

# Stage 1: Builder
FROM node:18-slim AS builder

# Installer les dépendances système nécessaires pour Prisma
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copier les fichiers package.json
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Installer toutes les dépendances (dev + prod pour le build)
RUN npm ci

# Copier le code source
COPY . .

# Générer le client Prisma
RUN cd backend && npx prisma generate

# Build le frontend et le backend
RUN npm run build

# ============================================
# Stage 2: Production
# ============================================
FROM node:18-slim AS production

# Installer les dépendances système nécessaires pour Prisma et le script de démarrage
RUN apt-get update -y && apt-get install -y openssl ca-certificates netcat-openbsd && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copier les fichiers package.json
COPY package*.json ./
COPY backend/package*.json ./backend/

# Installer uniquement les dépendances de production
RUN npm ci --omit=dev --workspace=backend

# Copier le schema Prisma et générer le client (sans les générateurs optionnels)
COPY backend/prisma ./backend/prisma
RUN cd backend && npx prisma generate --generator client

# Copier les fichiers buildés depuis le stage builder
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/public ./backend/public

# Copier le script de démarrage
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Exposer le port
EXPOSE 5000

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=5000

# Utiliser le script d'entrypoint pour gérer les migrations
ENTRYPOINT ["/docker-entrypoint.sh"]

# Commande de démarrage
CMD ["node", "backend/dist/index.js"]
