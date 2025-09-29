# BDE Covoiturage IESEG

Application de covoiturage pour étudiants de l'IESEG permettant de partager les frais d'Uber après les soirées étudiantes.

## 🚀 Fonctionnalités

- **Authentification** : Inscription/connexion avec email IESEG (@ieseg.fr)
- **Gestion d'événements** : Consultation des soirées à venir
- **Création de trajets** : Proposer un covoiturage avec destination et horaire
- **Participation** : Rejoindre un trajet existant
- **Chat en temps réel** : Communication entre participants
- **Système de notation** : Évaluer les autres participants
- **Gestion des remboursements** : Suivi des paiements

## 🛠 Stack Technique

- **Frontend** : React 19 + TypeScript + Vite + Tailwind CSS
- **Backend** : Node.js + Express + TypeScript
- **Base de données** : SQLite + Prisma ORM
- **Temps réel** : Socket.io
- **Authentification** : JWT + bcrypt

## 📁 Structure du projet

```
SITE_BDE/
├── package.json                 # Configuration mono-repo
├── frontend/                    # Application React
│   ├── src/
│   │   ├── components/         # Composants réutilisables
│   │   ├── pages/             # Pages de l'application
│   │   ├── services/          # API client
│   │   ├── types/             # Types TypeScript
│   │   └── hooks/             # Custom hooks
│   └── package.json
├── backend/                     # API Node.js
│   ├── src/
│   │   ├── routes/            # Routes API
│   │   ├── middleware/        # Middlewares Express
│   │   ├── utils/             # Utilitaires
│   │   └── index.ts           # Point d'entrée
│   ├── prisma/
│   │   └── schema.prisma      # Schéma base de données
│   └── package.json
└── README.md
```

## 🚀 Installation et démarrage

### Prérequis
- Node.js 18+
- npm

### Installation
```bash
# Cloner le projet
git clone <repository-url>
cd SITE_BDE

# Installer toutes les dépendances
npm run install:all

# Configurer la base de données
cd backend
npm run db:generate
npm run db:push
```

### Démarrage en développement
```bash
# Démarrer frontend + backend simultanément
npm run dev

# OU séparément :
npm run dev:frontend  # React sur http://localhost:5173
npm run dev:backend   # API sur http://localhost:3001
```

## 📱 Utilisation

### Pour les organisateurs
1. Créer un événement avec date/lieu/horaires
2. Les étudiants peuvent consulter l'événement et créer des trajets

### Pour créer un trajet
1. Cliquer sur "+" depuis la page événement
2. Indiquer destination et heure de départ
3. Définir le nombre maximum de passagers

### Pour rejoindre un trajet
1. Consulter les trajets disponibles sur la page événement
2. Cliquer "Rejoindre" si l'horaire/destination convient
3. Confirmer sa participation

### Après le trajet
1. Le créateur saisit le coût total
2. Les participants marquent leur remboursement
3. Chacun peut noter les autres participants

## 🔐 Sécurité

- Authentification obligatoire avec email IESEG
- Tokens JWT avec expiration
- Validation des données côté serveur
- Protection CORS configurée

## 📊 Base de données

Le schéma inclut :
- **Users** : Utilisateurs avec système de notation
- **Events** : Événements/soirées
- **Rides** : Trajets de covoiturage
- **RideParticipants** : Participants aux trajets
- **Ratings** : Système de notation

## 🔄 APIs disponibles

### Auth
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/me` - Profil utilisateur

### Events
- `GET /api/events` - Liste des événements
- `GET /api/events/:id` - Détail événement
- `POST /api/events` - Créer événement

### Rides
- `POST /api/rides` - Créer trajet
- `POST /api/rides/:id/join` - Rejoindre trajet
- `PATCH /api/rides/:id/confirm` - Confirmer participation
- `PATCH /api/rides/:id/cost` - Enregistrer coût
- `PATCH /api/rides/:id/reimburse` - Marquer remboursement

### Users
- `POST /api/users/:id/rate` - Noter utilisateur
- `GET /api/users/:id/rides` - Trajets utilisateur

## 🎯 Prochaines fonctionnalités

- [ ] Interface d'administration pour créer les événements
- [ ] Notifications push pour nouveaux trajets
- [ ] Système de points/récompenses
- [ ] Analyse automatique des reçus Uber
- [ ] Géolocalisation pour suggestions de trajets
- [ ] Forum d'amélioration

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit (`git commit -m 'Ajout nouvelle fonctionnalité'`)
4. Push (`git push origin feature/nouvelle-fonctionnalite`)
5. Ouvrir une Pull Request