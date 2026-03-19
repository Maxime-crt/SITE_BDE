# Frontend Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copier les fichiers package et config npm
COPY package*.json ./
COPY .npmrc ./

# Installer les dépendances
RUN npm install

# Copier le reste du code
COPY . .

# Récupérer les variables d'environnement Railway au moment du build
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build pour production
RUN npm run build

# Stage 2 - Servir avec nginx
FROM nginx:alpine

# Copier le build
COPY --from=builder /app/dist /usr/share/nginx/html

# Copier la config nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
