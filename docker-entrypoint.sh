#!/bin/bash
set -e

echo "🚀 Starting Site BDE..."

# Attendre que la base de données soit prête (si DATABASE_URL est défini)
if [ -n "$DATABASE_URL" ]; then
    echo "⏳ Waiting for database to be ready..."

    # Utiliser DB_HOST/DB_PORT si définis, sinon extraire de DATABASE_URL
    # Format: postgresql://user:password@host:port/database
    if [ -z "$DB_HOST" ]; then
        DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    fi
    if [ -z "$DB_PORT" ]; then
        DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    fi

    # Attendre que le port soit accessible (max 30 secondes)
    RETRIES=30
    until nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null || [ $RETRIES -eq 0 ]; do
        echo "   Waiting for database at $DB_HOST:$DB_PORT... ($RETRIES retries left)"
        RETRIES=$((RETRIES-1))
        sleep 1
    done

    if [ $RETRIES -eq 0 ]; then
        echo "❌ Database connection timeout"
        exit 1
    fi

    echo "✅ Database is ready!"

    # Exécuter les migrations Prisma
    echo "📦 Running database migrations..."
    cd /app/backend
    npx prisma migrate deploy
    echo "✅ Migrations completed!"
    cd /app
fi

echo "🎉 Starting application..."

# Exécuter la commande passée (CMD du Dockerfile)
exec "$@"
