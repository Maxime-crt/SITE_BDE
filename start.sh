#!/bin/bash

# Script de démarrage pour Railway
echo "🚀 Starting BDE Covoiturage application..."

# Créer la base de données et appliquer les migrations
echo "📊 Setting up database..."
cd backend && npx prisma db push --accept-data-loss

# Démarrer l'application
echo "▶️ Starting server..."
npm start