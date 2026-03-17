# Fuelers - Plateforme BDE IESEG

Plateforme web du Bureau des Etudiants (liste BDE Fuelers) de l'IESEG. Gestion d'evenements, trajets partages et support en temps reel.

## Stack technique

| Couche | Technologies |
|--------|-------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query |
| **Backend** | Node.js, Express, TypeScript, Prisma ORM, Socket.io |
| **Base de donnees** | PostgreSQL |
| **Infra** | Docker Compose (dev), Railway (prod) |
| **Services** | Cloudinary (images), Resend (emails), OSRM (routing) |

## Fonctionnalites

### Utilisateurs
- Inscription avec email IESEG (@ieseg.fr) + verification par code
- Mot de passe oublie avec lien de reinitialisation par email
- Charte d'utilisation obligatoire
- Profil avec adresse, genre, Instagram
- Catalogue d'evenements avec calendrier interactif
- Notation d'evenements (1-5 etoiles + commentaire)
- Support / messagerie avec le BDE (edition, suppression, indicateurs de lecture)

### Trajets partages 
- Demande de trajet retour apres un evenement
- Matching automatique par proximite de destination, horaire et preferences
- Algorithme de routing via OSRM (detour acceptable, optimisation TSP)
- Estimation du cout UberX partagee entre passagers
- Carte interactive avec itineraire optimise
- Possibilite d'annuler ou quitter un groupe a tout moment

### Administration
- Dashboard avec statistiques (membres, en ligne, messages non lus)
- Gestion des evenements (creation, edition, publication, associations)
- Recherche de membres avec filtres
- Support : vue de toutes les conversations, reponses, edition/suppression

## Architecture

```
SITE_BDE/
├── frontend/                # React SPA
│   └── src/
│       ├── components/      # Composants reutilisables (Navbar, Footer, modals...)
│       ├── pages/           # Pages (Login, Register, LandingPage, Profile...)
│       ├── services/        # Client API (axios)
│       ├── utils/           # Utilitaires (authGuard, dateUtils...)
│       └── types/           # Interfaces TypeScript
│
├── backend/                 # API Express
│   └── src/
│       ├── routes/          # auth, events, uberRides, support, eventRatings
│       ├── services/        # matching, pricing, routing, geocoding, socket
│       ├── middleware/       # auth JWT
│       ├── utils/           # prisma, email, jwt
│       └── config/          # admins
│
├── docker-compose.yml       # Dev environment (app + postgres)
└── README.md
```

## Installation (dev)

### Prerequis
- Docker & Docker Compose
- Node.js 18+

### Demarrage

```bash
# Cloner le repo
git clone https://github.com/Maxime-crt/SITE_BDE.git
cd SITE_BDE

# Lancer l'environnement
docker compose up -d

# L'app est disponible sur http://localhost:5000
```

Le Docker Compose monte les sources en volume pour le hot-reload (nodemon backend, Vite frontend).

### Variables d'environnement

Configurees dans `docker-compose.yml` et `.env` :

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | URL PostgreSQL |
| `JWT_SECRET` | Secret pour les tokens JWT |
| `RESEND_API_KEY` | Cle API Resend pour l'envoi d'emails |
| `FRONTEND_URL` | URL du frontend (pour les liens dans les emails) |
| `VITE_API_URL` | URL de l'API depuis le frontend |

### Base de donnees

```bash
# Migrations
cd backend && npx prisma migrate deploy

# Interface Prisma Studio
npx prisma studio
```

## Tests

```bash
# Tests backend (Jest)
cd backend ; npm test

# Tests frontend (Vitest)
cd frontend ; npx vitest --run
```

## CI

Une pipeline GitHub Actions (`ci.yml`) s'execute sur chaque push et PR : lint, build et tests (backend + frontend).

## Deploiement (prod)

Deploye sur **Railway** avec 3 services :
- **backend** (`api.fuelers.fr`) - API Express + Prisma
- **frontend** (`fuelers.fr`) - Build Vite statique
- **postgres** - Base de donnees PostgreSQL

Les images sont hebergees sur **Cloudinary** (cloud: `dk93ledz2`).
Les emails transactionnels sont envoyes via **Resend** (domaine: `fuelers.fr`).

## Auteur

Maxime Coriton 
