# Guide des Tests - Site BDE IESEG

Ce document décrit la stratégie de test et comment exécuter les tests unitaires pour le projet.

## 📋 Vue d'ensemble

Le projet utilise deux frameworks de test différents :
- **Backend** : Jest avec ts-jest pour TypeScript
- **Frontend** : Vitest avec React Testing Library

## 🚀 Exécuter les tests

### 🎯 Depuis la racine du projet (Recommandé)

```bash
# Exécuter TOUS les tests (backend + frontend)
npm test

# Générer un rapport de couverture complet
npm run test:coverage

# Tests backend uniquement
npm run test:backend

# Tests frontend uniquement
npm run test:frontend
```

### Backend (Jest)

```bash
cd backend

# Exécuter tous les tests
npm test

# Exécuter les tests en mode watch (développement)
npm run test:watch

# Générer un rapport de couverture
npm run test:coverage
```

### Frontend (Vitest)

```bash
cd frontend

# Exécuter tous les tests
npm test

# Exécuter les tests avec l'interface UI
npm run test:ui

# Générer un rapport de couverture
npm run test:coverage
```

## 📁 Structure des tests

### Backend (`backend/src/__tests__/`)

```
backend/src/__tests__/
├── auth.test.ts          # Tests des routes d'authentification
├── events.test.ts        # Tests de gestion des événements (CRUD)
├── tickets.test.ts       # Tests d'achat et validation de billets
├── support.test.ts       # Tests du système de support
├── ratings.test.ts       # Tests du système de notation
├── jwt.test.ts           # Tests des utilitaires JWT
└── email.test.ts         # Tests des utilitaires email
```

### Frontend (`frontend/src/`)

```
frontend/src/
├── components/__tests__/
│   └── StarRating.test.tsx    # Tests du composant StarRating
└── services/__tests__/
    └── api.test.ts            # Tests des services API
```

## ✅ Couverture des tests

### Backend

Les tests backend couvrent :

**Authentification** (`auth.test.ts`)
- ✅ Inscription avec validation email @ieseg.fr uniquement
- ✅ Rejet des emails avec caractère "+"
- ✅ Vérification d'email avec code à 6 chiffres
- ✅ Gestion des comptes existants
- ✅ Codes de vérification expirés

**Événements** (`events.test.ts`)
- ✅ Création d'événements (admin seulement)
- ✅ Modification d'événements (admin seulement)
- ✅ Suppression d'événements (admin seulement)
- ✅ Récupération de tous les événements (avec filtres admin/user)
- ✅ Récupération d'un événement par ID
- ✅ Validation des champs requis

**Billets** (`tickets.test.ts`)
- ✅ Création de paiement Stripe pour achat de billet
- ✅ Récupération des billets de l'utilisateur avec QR code
- ✅ Validation de billet par QR code (admin seulement)
- ✅ Vérification de la capacité de l'événement
- ✅ Prévention d'achats multiples pour le même événement
- ✅ Vérification des billets déjà utilisés

**Support** (`support.test.ts`)
- ✅ Envoi de messages de support par les utilisateurs
- ✅ Réponse aux messages par les admins
- ✅ Modification de ses propres messages
- ✅ Suppression de ses propres messages
- ✅ Marquage des messages comme lus
- ✅ Récupération des conversations (admin)
- ✅ Permissions utilisateur/admin

**Notation** (`ratings.test.ts`)
- ✅ Création de notation (0-5 étoiles)
- ✅ Vérification que l'utilisateur a un billet
- ✅ Vérification que l'événement est terminé
- ✅ Prévention de notations multiples
- ✅ Modification de sa propre notation
- ✅ Suppression de sa propre notation
- ✅ Calcul de la moyenne des notes

**Utilitaires**
- ✅ Génération et validation de tokens JWT (`jwt.test.ts`)
- ✅ Génération de codes de vérification à 6 chiffres (`email.test.ts`)
- ✅ Gestion des erreurs (tokens expirés, codes invalides, etc.)

### Frontend

Les tests frontend couvrent :
- ✅ Composant StarRating (affichage, interaction, modes readonly)
- ✅ Services API (auth, events, tickets)
- ✅ Requêtes HTTP avec authentification
- ✅ Gestion des erreurs API

## 🧪 Exemples de tests

### Test d'authentification (Backend)

```typescript
it('should register a new user with @ieseg.fr email', async () => {
  const response = await request(app)
    .post('/auth/register')
    .send({
      email: 'test@ieseg.fr',
      firstName: 'John',
      lastName: 'Doe',
      phone: '0612345678',
      password: 'password123',
    });

  expect(response.status).toBe(201);
  expect(response.body.user.email).toBe('test@ieseg.fr');
});
```

### Test de composant (Frontend)

```typescript
it('should call onRatingChange when a star is clicked', () => {
  const handleRatingChange = vi.fn();
  const { container } = render(
    <StarRating rating={0} onRatingChange={handleRatingChange} />
  );

  const stars = container.querySelectorAll('button');
  fireEvent.click(stars[2]);

  expect(handleRatingChange).toHaveBeenCalledWith(3);
});
```

## 🎯 Bonnes pratiques

1. **Isoler les tests** : Chaque test doit être indépendant
2. **Mocker les dépendances** : Utiliser des mocks pour Prisma, axios, etc.
3. **Tester les cas limites** : Tester les erreurs et les cas exceptionnels
4. **Nommer clairement** : Les noms de tests doivent décrire le comportement attendu
5. **Nettoyer après chaque test** : Utiliser `afterEach` pour réinitialiser les mocks

## 📊 Rapport de couverture

Les rapports de couverture sont générés dans :
- Backend : `backend/coverage/`
- Frontend : `frontend/coverage/`

Ouvrir `coverage/index.html` dans un navigateur pour voir le rapport détaillé.

## 🔧 Configuration

### Jest (Backend)

Configuration dans `backend/jest.config.js` :
- Preset : ts-jest
- Environnement : node
- Couverture : text, lcov, html

### Vitest (Frontend)

Configuration dans `frontend/vitest.config.ts` :
- Environnement : jsdom (pour simuler le DOM)
- Setup : `src/test/setup.ts`
- Couverture : v8

## 🐛 Débogage

Pour déboguer un test spécifique :

```bash
# Backend
npm test -- auth.test.ts

# Frontend
npm test -- StarRating.test.tsx
```

## 📝 Ajouter de nouveaux tests

1. Créer un fichier `*.test.ts` ou `*.test.tsx`
2. Importer les utilitaires de test nécessaires
3. Écrire les tests en suivant la structure AAA (Arrange, Act, Assert)
4. Exécuter les tests pour vérifier qu'ils passent

## 🚨 CI/CD

Les tests sont conçus pour s'intégrer facilement dans un pipeline CI/CD. Ajouter ces commandes à votre workflow :

```yaml
# Backend
- run: cd backend && npm test

# Frontend
- run: cd frontend && npm test
```

## 📚 Ressources

- [Jest Documentation](https://jestjs.io/)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
