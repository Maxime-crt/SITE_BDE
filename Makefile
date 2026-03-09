.PHONY: up down restart build logs ps clean

# Redémarrer le projet (stop + rebuild + start)
restart: down up

# Démarrer les containers (crée le réseau si nécessaire)
up:
	docker network inspect site-bde-network >/dev/null 2>&1 || docker network create site-bde-network
	docker compose up -d --build

# Arrêter les containers
down:
	docker compose down

# Rebuild sans cache
build:
	docker compose build --no-cache

# Voir les logs
logs:
	docker compose logs -f

# Voir l'état des containers
ps:
	docker compose ps

# Nettoyage complet (containers + images + volumes orphelins)
clean:
	docker compose down --rmi local --volumes --remove-orphans
