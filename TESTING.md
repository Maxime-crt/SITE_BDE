# Guide des Tests - Site BDE IESEG

## Vue d'ensemble

| Couche | Framework | Config |
|--------|-----------|--------|
| **Backend** | Jest + ts-jest | `backend/jest.config.js` |
| **Frontend** | Vitest + React Testing Library | `frontend/vitest.config.ts` |

## Executer les tests

```bash
# Backend (Jest)
cd backend ; npm test

# Frontend (Vitest)
cd frontend ; npx vitest --run

# Frontend en mode watch
cd frontend ; npx vitest
```

## Structure des tests

### Backend (`backend/src/__tests__/`)

| Fichier | Couverture |
|---------|-----------|
| `auth.test.ts` | Inscription, verification email, rejet emails invalides |
| `authMiddleware.test.ts` | Middleware JWT (token manquant, invalide, expire, valide) |
| `events.test.ts` | CRUD evenements, permissions admin, validation champs |
| `support.test.ts` | Messages support, reponses admin, edition, suppression, soft delete, permissions |
| `ratings.test.ts` | Notation 1-5, commentaires, mise a jour moyenne, suppression |
| `uberMatchingService.test.ts` | Algorithme de matching (filtres temps, genre, proximite, detour, capacite) |
| `jwt.test.ts` | Generation et validation de tokens JWT |
| `email.test.ts` | Generation de codes de verification a 6 chiffres |

### Frontend (`frontend/src/`)

| Fichier | Couverture |
|---------|-----------|
| `utils/__tests__/dateUtils.test.ts` | Conversion timezone Paris/UTC, formatage dates fr-FR, DST |
| `utils/__tests__/errorHandler.test.ts` | Gestion erreurs API, filtrage erreurs auth, toast, logging |
| `components/__tests__/StarRating.test.tsx` | Affichage etoiles, interaction click, mode readonly |
| `services/__tests__/api.test.ts` | Services API, requetes HTTP, authentification |

## CI

Les tests sont executes automatiquement par GitHub Actions sur chaque push et PR via `.github/workflows/ci.yml` :

```
lint → build → tests (backend + frontend)
```

## Pattern de test

### Backend : route avec mock Prisma

```typescript
jest.mock('../utils/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn(), create: jest.fn() },
  },
}));

const app = express();
app.use(express.json());
app.use('/auth', authRouter);

it('should register a new user', async () => {
  (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
  (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

  const response = await request(app)
    .post('/auth/register')
    .send({ email: 'test@ieseg.fr', ... });

  expect(response.status).toBe(201);
});
```

### Frontend : fonction utilitaire

```typescript
import { describe, it, expect } from 'vitest';

it('should convert Paris local time to UTC', () => {
  const result = parisLocalToUTC('2026-01-15T12:00');
  expect(result).toBe('2026-01-15T11:00:00.000Z');
});
```

### Frontend : composant React

```typescript
it('should call onRatingChange when a star is clicked', () => {
  const handleRatingChange = vi.fn();
  const { container } = render(
    <StarRating rating={0} onRatingChange={handleRatingChange} />
  );

  fireEvent.click(container.querySelectorAll('button')[2]);
  expect(handleRatingChange).toHaveBeenCalledWith(3);
});
```

## Bonnes pratiques

- **Isoler les tests** : chaque test est independant, `afterEach` pour reset les mocks
- **Mocker les dependances** : Prisma, axios, services externes
- **Tester les cas limites** : erreurs, permissions, donnees invalides
- **Nommer clairement** : le nom du test decrit le comportement attendu

## Ajouter un test

1. Creer un fichier `*.test.ts` (backend) ou `*.test.ts(x)` (frontend)
2. Suivre le pattern existant du dossier (mock Prisma pour les routes, vi.mock pour le frontend)
3. Verifier que les tests passent en local avant de push
