# 🎉 BDE IESEG - Plateforme de Billetterie

Plateforme web moderne de billetterie pour le Bureau des Étudiants de l'IESEG permettant aux étudiants de réserver et acheter leurs billets pour les événements du BDE (CB, Mini CB, Afterwork, etc.).

---

## 📋 Table des matières

- [Fonctionnalités](#-fonctionnalités)
- [Stack Technique](#-stack-technique)
- [Architecture](#-architecture)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Utilisation](#-utilisation)
- [API Documentation](#-api-documentation)
- [Déploiement](#-déploiement)
- [Sécurité](#-sécurité)
- [Support](#-support)

---

## ✨ Fonctionnalités

### Pour les étudiants
- **Authentification sécurisée** : Inscription et connexion avec email IESEG (@ieseg.fr)
- **Vérification email** : Code de vérification à 6 chiffres envoyé par email
- **Catalogue d'événements** : Consultation de tous les événements à venir
- **Achat de billets** : Paiement sécurisé via Stripe avec carte bancaire
- **Mes billets** : Visualisation de tous vos billets avec QR codes
- **QR Code** : Chaque billet possède un QR code unique pour validation
- **Notation d'événements** : Noter les événements après participation (1-5 étoiles + commentaire)
- **Support** : Système de messagerie avec le BDE
  - Modification de messages (max 2 fois)
  - Suppression de messages
  - Indicateurs de lecture (double check WhatsApp)
  - Statut de lecture en temps réel
- **Profil** : Gestion du compte utilisateur

### Pour les administrateurs
- **Dashboard admin** : Interface dédiée de gestion
- **Gestion d'événements** :
  - Création/modification d'événements
  - Publication/brouillons
  - Gestion de la capacité et des prix
  - Types d'événements : CB, Mini CB, Afterwork, Autre (personnalisable)
- **Gestion des utilisateurs** :
  - Liste de tous les utilisateurs
  - Promotion au rôle administrateur
  - Auto-promotion pour certains emails (@ieseg.fr configurables)
- **Scan de billets** :
  - Scanner les QR codes à l'entrée
  - Validation en temps réel
  - Détection des billets déjà utilisés
- **Support** : Gestion des conversations avec les étudiants
  - Vue de toutes les conversations
  - Statut en ligne/hors ligne des utilisateurs
  - Badge "Nouveau" pour messages non lus
  - Indicateurs de lecture (double check)
  - Réponses en temps réel
- **Statistiques** : Visualisation des ventes et participations

### Fonctionnalités transversales
- **Authentification requise** : Accès à l'application uniquement pour utilisateurs connectés
- **Design responsive** : Optimisé mobile, tablette et desktop
- **Dark mode** : Thème sombre disponible sur toutes les pages (y compris login/register)
- **Temps réel** : Mise à jour automatique des données (React Query)
- **Notifications** : Toasts centrés pour feedback utilisateur
- **Sécurité** : Protection CORS, validation des données, JWT

---

## 🛠 Stack Technique

### Frontend
- **React 18** - Framework UI avec dernières fonctionnalités
- **TypeScript** - Typage statique pour plus de robustesse
- **Vite** - Build tool ultra-rapide avec HMR
- **Tailwind CSS** - Framework CSS utility-first
- **Shadcn/ui** - Composants UI réutilisables et accessibles
- **React Router** - Navigation côté client
- **React Query (TanStack Query)** - Gestion de cache et état serveur
- **Axios** - Client HTTP
- **Stripe Elements** - Intégration paiement
- **React Hot Toast** - Notifications toast
- **Lucide React** - Icônes modernes
- **QRCode.react** - Génération de QR codes
- **html5-qrcode** - Scanner de QR codes

### Backend
- **Node.js** - Runtime JavaScript
- **Express** - Framework web minimaliste
- **TypeScript** - Code backend typé
- **Prisma ORM** - ORM moderne pour base de données
- **SQLite** - Base de données (production ready avec migrations)
- **JWT** - Authentification par tokens
- **bcryptjs** - Hashage des mots de passe
- **Stripe** - Traitement des paiements
- **Nodemailer** - Envoi d'emails de vérification
- **express-validator** - Validation des données
- **CORS** - Protection cross-origin

### DevOps
- **Docker** - Conteneurisation de l'application
- **Render** - Plateforme de déploiement
- **Concurrently** - Exécution parallèle des scripts
- **Nodemon** - Rechargement automatique en développement

---

## 📁 Architecture

```
SITE_BDE/
├── frontend/                    # Application React
│   ├── src/
│   │   ├── components/         # Composants réutilisables
│   │   │   ├── ui/            # Composants UI de base (Shadcn)
│   │   │   ├── EventCard.tsx  # Carte d'événement
│   │   │   ├── TicketCard.tsx # Carte de billet
│   │   │   ├── Navbar.tsx     # Navigation
│   │   │   ├── Footer.tsx     # Pied de page
│   │   │   ├── ProtectedRoute.tsx # Route protégée
│   │   │   └── ThemeToggle.tsx # Bouton de changement de thème
│   │   ├── pages/             # Pages de l'application
│   │   │   ├── Login.tsx      # Connexion
│   │   │   ├── Register.tsx   # Inscription
│   │   │   ├── VerifyEmail.tsx # Vérification email
│   │   │   ├── Dashboard.tsx  # Accueil étudiant
│   │   │   ├── EventDetails.tsx # Détails événement
│   │   │   ├── PurchaseTicket.tsx # Paiement Stripe
│   │   │   ├── MyTickets.tsx  # Mes billets
│   │   │   ├── Support.tsx    # Support/messagerie étudiant
│   │   │   ├── AdminDashboard.tsx # Dashboard admin
│   │   │   ├── AdminUsers.tsx # Gestion utilisateurs
│   │   │   ├── AdminSupport.tsx # Gestion conversations support
│   │   │   ├── ScanTickets.tsx # Scanner QR codes
│   │   │   └── Profile.tsx    # Profil utilisateur
│   │   ├── contexts/          # Contextes React
│   │   │   └── ThemeContext.tsx # Contexte thème dark/light
│   │   ├── services/          # Services API
│   │   │   └── api.ts         # Client API centralisé
│   │   ├── types/             # Types TypeScript
│   │   │   └── index.ts       # Interfaces et types
│   │   ├── lib/               # Utilitaires
│   │   │   └── utils.ts       # Fonctions utilitaires
│   │   ├── App.tsx            # Composant racine
│   │   └── main.tsx           # Point d'entrée
│   ├── public/                # Assets statiques
│   ├── index.html             # Template HTML
│   ├── vite.config.ts         # Configuration Vite
│   ├── tailwind.config.js     # Configuration Tailwind
│   └── package.json           # Dépendances frontend
│
├── backend/                    # API Node.js
│   ├── src/
│   │   ├── routes/            # Routes API Express
│   │   │   ├── auth.ts        # Authentification
│   │   │   ├── events.ts      # Événements
│   │   │   ├── tickets.ts     # Billets
│   │   │   ├── ratings.ts     # Notations
│   │   │   ├── support.ts     # Support
│   │   │   ├── users.ts       # Utilisateurs
│   │   │   └── admin.ts       # Administration
│   │   ├── middleware/        # Middlewares
│   │   │   ├── auth.ts        # Vérification JWT
│   │   │   └── admin.ts       # Vérification admin
│   │   ├── utils/             # Utilitaires
│   │   │   ├── prisma.ts      # Client Prisma
│   │   │   └── email.ts       # Service email
│   │   └── index.ts           # Serveur Express
│   ├── prisma/
│   │   ├── schema.prisma      # Schéma base de données
│   │   └── migrations/        # Migrations SQL
│   ├── .env                   # Variables d'environnement
│   ├── Dockerfile             # Container backend
│   └── package.json           # Dépendances backend
│
├── package.json               # Configuration mono-repo
├── Dockerfile                 # Container racine
├── render.yaml                # Configuration Render
└── README.md                  # Documentation (ce fichier)
```

---

## 🚀 Installation

### Prérequis
- **Node.js** 18+ ([Télécharger](https://nodejs.org/))
- **npm** 8+ (inclus avec Node.js)
- **Git** ([Télécharger](https://git-scm.com/))

### Clonage et installation

```bash
# Cloner le repository
git clone <repository-url>
cd SITE_BDE

# Installer toutes les dépendances (frontend + backend)
npm run install:all
```

### Configuration de la base de données

```bash
# Se placer dans le backend
cd backend

# Générer le client Prisma
npm run db:generate

# Créer/mettre à jour la base de données
npm run db:push

# Retourner à la racine
cd ..
```

---

## ⚙️ Configuration

### Variables d'environnement Backend

Créer un fichier `.env` dans le dossier `backend/` :

```env
# Base de données
DATABASE_URL="file:./dev.db"

# JWT Secret (générer une clé aléatoire sécurisée)
JWT_SECRET="votre-secret-jwt-tres-securise-minimum-32-caracteres"

# Port du serveur
PORT=3001

# CORS
FRONTEND_URL="http://localhost:5173"

# Stripe (https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."

# Email (Gmail avec App Password recommandé)
# Pour créer un App Password Gmail :
# 1. Activer la vérification en 2 étapes
# 2. Aller sur https://myaccount.google.com/apppasswords
# 3. Générer un mot de passe d'application
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="votre-email@gmail.com"
EMAIL_PASSWORD="votre-app-password-gmail"
EMAIL_FROM="BDE IESEG <votre-email@gmail.com>"

# Auto-promotion admin (emails séparés par des virgules)
AUTO_ADMIN_EMAILS="prenom.nom@ieseg.fr,autre.admin@ieseg.fr"
```

### Variables d'environnement Frontend

Créer un fichier `.env` dans le dossier `frontend/` :

```env
# URL de l'API backend
VITE_API_URL="http://localhost:3001"

# Clé publique Stripe (même que STRIPE_PUBLISHABLE_KEY du backend)
VITE_STRIPE_PUBLIC_KEY="pk_test_..."
```

### Configuration Stripe

1. Créer un compte sur [Stripe](https://stripe.com)
2. Récupérer les clés API (test mode) dans le [Dashboard](https://dashboard.stripe.com/apikeys)
3. Ajouter les clés dans les fichiers `.env`

### Configuration Email

**Option recommandée : Gmail avec App Password**

1. Activer la vérification en 2 étapes sur votre compte Google
2. Générer un mot de passe d'application : https://myaccount.google.com/apppasswords
3. Utiliser ce mot de passe dans `EMAIL_PASSWORD`

Limites : 500 emails/jour (largement suffisant)

**Autres options :**
- Outlook/Hotmail (300 emails/jour)
- Email IESEG si disponible (le plus professionnel)
- Services tiers (SendGrid, Mailgun) si volume important

---

## 💻 Utilisation

### Développement

#### Démarrage rapide (frontend + backend simultanément)

```bash
# À la racine du projet
npm run dev
```

Cela démarre :
- **Frontend** : http://localhost:5173
- **Backend** : http://localhost:3001

#### Démarrage séparé

```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

### Build de production

```bash
# Build frontend + backend
npm run build

# Démarre le serveur de production
npm start
```

Le frontend est servi par le backend sur http://localhost:3001

### Scripts disponibles

**Racine (`package.json`) :**
- `npm run dev` - Démarre frontend + backend
- `npm run dev:frontend` - Démarre uniquement le frontend
- `npm run dev:backend` - Démarre uniquement le backend
- `npm run build` - Build production (frontend + backend)
- `npm start` - Démarre le serveur de production
- `npm run install:all` - Installe toutes les dépendances

**Backend (`backend/package.json`) :**
- `npm run dev` - Serveur de développement (nodemon)
- `npm run build` - Compilation TypeScript
- `npm start` - Serveur de production
- `npm run db:generate` - Génère le client Prisma
- `npm run db:push` - Synchronise la DB avec le schéma
- `npm run db:studio` - Ouvre Prisma Studio (GUI)
- `npm run db:migrate` - Crée une migration

**Frontend (`frontend/package.json`) :**
- `npm run dev` - Serveur de développement Vite
- `npm run build` - Build de production
- `npm run preview` - Prévisualise le build

---

## 📡 API Documentation

### Base URL
`http://localhost:3001/api`

### Authentification

Toutes les routes protégées nécessitent un header :
```
Authorization: Bearer <token-jwt>
```

### Routes publiques

#### `POST /api/auth/register`
Inscription d'un nouvel utilisateur

**Body :**
```json
{
  "email": "prenom.nom@ieseg.fr",
  "password": "motdepasse123",
  "firstName": "Prénom",
  "lastName": "Nom",
  "phone": "0612345678"
}
```

#### `POST /api/auth/verify-email`
Vérifier le code email

**Body :**
```json
{
  "email": "prenom.nom@ieseg.fr",
  "code": "123456"
}
```

**Response :**
```json
{
  "token": "eyJhbGciOiJIUzI1...",
  "user": { ... }
}
```

#### `POST /api/auth/resend-code`
Renvoyer le code de vérification

**Body :**
```json
{
  "email": "prenom.nom@ieseg.fr"
}
```

#### `POST /api/auth/login`
Connexion

**Body :**
```json
{
  "email": "prenom.nom@ieseg.fr",
  "password": "motdepasse123"
}
```

**Response :**
```json
{
  "token": "eyJhbGciOiJIUzI1...",
  "user": {
    "id": "...",
    "email": "prenom.nom@ieseg.fr",
    "firstName": "Prénom",
    "lastName": "Nom",
    "isAdmin": false
  }
}
```

### Routes protégées (utilisateur connecté)

#### `GET /api/auth/me`
Profil utilisateur actuel

#### `GET /api/events`
Liste de tous les événements publiés

**Response :**
```json
[
  {
    "id": "...",
    "name": "CB de Noël",
    "description": "Grande soirée...",
    "location": "Lille Grand Palais",
    "type": "CB",
    "startDate": "2024-12-20T20:00:00Z",
    "endDate": "2024-12-21T02:00:00Z",
    "capacity": 200,
    "ticketPrice": 15.00,
    "rating": 4.5,
    "ratingCount": 23,
    "_count": { "tickets": 87 }
  }
]
```

#### `GET /api/events/:id`
Détails d'un événement

#### `POST /api/tickets/create-payment-intent`
Créer une intention de paiement Stripe

**Body :**
```json
{
  "eventId": "event-id"
}
```

**Response :**
```json
{
  "clientSecret": "pi_3..."
}
```

#### `POST /api/tickets/confirm-payment`
Confirmer le paiement et créer le billet

**Body :**
```json
{
  "paymentIntentId": "pi_3...",
  "eventId": "event-id"
}
```

#### `GET /api/tickets/my-tickets`
Mes billets

**Response :**
```json
[
  {
    "id": "...",
    "qrCode": "TICKET-...",
    "status": "VALID",
    "purchasePrice": 15.00,
    "purchasedAt": "2024-12-01T10:00:00Z",
    "event": { ... }
  }
]
```

#### `POST /api/ratings`
Noter un événement

**Body :**
```json
{
  "eventId": "event-id",
  "rating": 5,
  "comment": "Super soirée !"
}
```

#### `GET /api/support/messages`
Mes messages de support

#### `POST /api/support/messages`
Envoyer un message au support

**Body :**
```json
{
  "message": "J'ai un problème avec..."
}
```

#### `PUT /api/support/messages/:id`
Modifier un message (max 2 fois)

**Body :**
```json
{
  "message": "Message corrigé"
}
```

#### `DELETE /api/support/messages/:id`
Supprimer un message

**Response :**
```json
{
  "message": "Message supprimé avec succès"
}
```

### Routes admin (utilisateur admin uniquement)

#### `POST /api/events`
Créer un événement

**Body :**
```json
{
  "name": "CB de Noël",
  "description": "Description...",
  "location": "Lille Grand Palais",
  "type": "CB",
  "startDate": "2024-12-20T20:00:00Z",
  "endDate": "2024-12-21T02:00:00Z",
  "capacity": 200,
  "ticketPrice": 15.00,
  "publishedAt": "2024-11-01T00:00:00Z"
}
```

#### `PUT /api/events/:id`
Modifier un événement

#### `DELETE /api/events/:id`
Supprimer un événement

#### `GET /api/admin/users`
Liste de tous les utilisateurs

#### `PATCH /api/admin/users/:id/toggle-active`
Activer/désactiver un utilisateur

#### `PATCH /api/admin/users/:id/toggle-admin`
Promouvoir/rétrograder un admin

#### `POST /api/admin/scan-ticket`
Scanner un QR code

**Body :**
```json
{
  "qrCode": "TICKET-..."
}
```

**Response :**
```json
{
  "valid": true,
  "ticket": { ... },
  "user": { ... }
}
```

#### `GET /api/support/admin/all-conversations`
Toutes les conversations de support

#### `POST /api/support/admin/reply`
Répondre à un utilisateur

**Body :**
```json
{
  "userId": "user-id",
  "message": "Réponse du BDE..."
}
```

---

## 🚢 Déploiement

### Avec Docker

```bash
# Build de l'image
docker build -t fuelers .

# Lancer le container
docker run -p 3001:3001 \
  -e DATABASE_URL="file:./prod.db" \
  -e JWT_SECRET="votre-secret" \
  -e STRIPE_SECRET_KEY="sk_..." \
  -e EMAIL_USER="..." \
  -e EMAIL_PASSWORD="..." \
  fuelers
```

### Avec Render

Voir le guide complet : [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md)

**Déploiement rapide :**
1. Push le projet sur GitHub
2. Connecter le repository sur [Render](https://render.com)
3. New → Blueprint
4. Sélectionner le repo (Render lit automatiquement `render.yaml`)
5. Configurer les variables secrètes dans le dashboard

Variables à configurer manuellement dans Render :
```
EMAIL_USER=...
EMAIL_PASSWORD=...
STRIPE_SECRET_KEY=...
FRONTEND_URL=https://www.fuelers.fr
```

### Migration de la base de données en production

```bash
# Lors du premier déploiement ou après modification du schéma
cd backend
npx prisma migrate deploy
```

---

## 🔒 Sécurité

### Mesures implémentées

- **Authentification** : JWT avec expiration (24h par défaut)
- **Hashage** : Mots de passe hashés avec bcrypt (10 rounds)
- **Validation** : Toutes les entrées validées côté serveur
- **CORS** : Configured pour autoriser uniquement le frontend
- **Email** : Vérification obligatoire avec code à 6 chiffres
- **IESEG only** : Seuls les emails @ieseg.fr peuvent s'inscrire
- **Rate limiting** : Recommandé en production
- **HTTPS** : Obligatoire en production
- **Stripe** : Clés API sécurisées, aucune donnée bancaire stockée
- **Admin** : Middleware de vérification pour routes admin
- **SQL Injection** : Protection via Prisma ORM
- **XSS** : Protection via React (échappement automatique)

### Recommandations production

1. **Utiliser HTTPS** partout (Let's Encrypt gratuit)
2. **Changer JWT_SECRET** avec une clé longue et aléatoire
3. **Passer Stripe en mode Live** et sécuriser les webhooks
4. **Implémenter rate limiting** (express-rate-limit)
5. **Logger les erreurs** (Sentry, LogRocket)
6. **Backups base de données** réguliers
7. **Monitoring** (UptimeRobot, Datadog)
8. **Variables d'environnement** sécurisées (ne jamais commit .env)

---

## 💬 Support

### Pour les utilisateurs

Utilisez la fonctionnalité "Support" directement dans l'application :
1. Connectez-vous à votre compte
2. Cliquez sur "Support" dans le menu
3. Envoyez votre message au BDE
4. Vous pouvez modifier votre message jusqu'à 2 fois
5. Vous pouvez supprimer vos messages à tout moment
6. Les double-checks indiquent si le BDE a lu votre message
7. Le BDE vous répondra dans les 24h

### Pour les développeurs

- **Issues** : Ouvrir une issue GitHub
- **Pull Requests** : Contributions bienvenues !
- **Documentation** : Ce README

### Workflow de contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit les changements (`git commit -m 'Ajout nouvelle fonctionnalité'`)
4. Push vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Ouvrir une Pull Request

---

## 📊 Modèle de données

### User
- Email IESEG unique
- Mot de passe hashé
- Statut de vérification email
- Rôle admin
- Historique de connexion

### Event
- Informations de l'événement
- Type (CB, Mini CB, Afterwork, Autre)
- Dates et lieu
- Capacité et prix
- Statut (publié/brouillon)
- Note moyenne et nombre d'avis

### Ticket
- QR code unique
- Statut (VALID, USED, CANCELLED, REFUNDED)
- Prix d'achat
- ID de paiement Stripe
- Date d'achat et d'utilisation

### EventRating
- Note (1-5 étoiles)
- Commentaire optionnel
- Unique par utilisateur et événement

### SupportMessage
- Message texte
- Expéditeur (utilisateur ou BDE)
- Compteur de modifications (max 2)
- Statut de lecture (isRead)
- Thread de réponses

---

## 📈 Roadmap / Améliorations futures

- [ ] **Notifications push** pour nouveaux événements
- [ ] **Système de points/fidélité** pour les participants réguliers
- [ ] **Partage de billets** entre étudiants
- [ ] **Paiement en plusieurs fois** pour événements chers
- [ ] **Export Excel** des participants (admin)
- [ ] **Analytics** avancées (Dashboard admin)
- [ ] **Remboursements automatiques** via Stripe
- [ ] **Photos d'événements** uploadées par les admins
- [ ] **Système de parrainage** avec réductions
- [ ] **API publique** pour intégrations tierces
- [ ] **App mobile** (React Native)
- [ ] **SSO IESEG** si disponible

---

## 📝 Licence

Projet privé - BDE IESEG

---

## 👥 Auteurs

- **Développeur** : Maxime Coriton
- **Organisation** : BDE IESEG

---

## 🙏 Remerciements

- IESEG School of Management
- Tous les étudiants qui utilisent la plateforme
- Contributeurs open-source des bibliothèques utilisées

---

**Version** : 1.0.0
**Dernière mise à jour** : Octobre 2025
