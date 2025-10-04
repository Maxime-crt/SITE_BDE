# Déploiement sur Railway

## ✅ Pourquoi Railway ?
- 5$/mois de crédit gratuit (largement suffisant pour votre projet)
- Hébergement cloud 24/7 (votre PC peut être éteint)
- Support Docker natif
- PostgreSQL inclus gratuitement
- Pas de CB requise au début

---

## 📋 Prérequis

1. **Compte GitHub** avec votre code pushé
2. **Compte Railway** : https://railway.app (connexion via GitHub)

---

## 🚀 Étapes de déploiement

### 1. Créer un projet Railway

1. Allez sur https://railway.app
2. Cliquez sur **"Start a New Project"**
3. Sélectionnez **"Deploy from GitHub repo"**
4. Autorisez Railway à accéder à vos repos GitHub
5. Sélectionnez le repo **SITE_BDE**

### 2. Ajouter la base de données PostgreSQL

1. Dans votre projet Railway, cliquez sur **"+ New"**
2. Sélectionnez **"Database" → "Add PostgreSQL"**
3. La base de données sera automatiquement créée

### 3. Déployer le Backend

1. Cliquez sur **"+ New"** → **"GitHub Repo"** → Sélectionnez votre repo
2. Railway détectera automatiquement le `backend/Dockerfile`
3. Configurez les variables d'environnement :
   - Cliquez sur le service backend
   - Allez dans **"Variables"**
   - Ajoutez :
     ```
     DATABASE_URL=${{Postgres.DATABASE_URL}}
     JWT_SECRET=votre-secret-jwt-super-securise
     PORT=3001
     NODE_ENV=production
     FRONTEND_URL=${{Frontend.url}}

     # Email (Gmail)
     EMAIL_USER=votre.email@gmail.com
     EMAIL_PASSWORD=votre-mot-de-passe-application

     # Stripe
     STRIPE_SECRET_KEY=sk_test_votre_cle
     ```
4. Dans **"Settings" → "Root Directory"**, mettez : `backend`
5. Cliquez sur **"Deploy"**

### 4. Déployer le Frontend

1. Cliquez sur **"+ New"** → **"GitHub Repo"** → Sélectionnez votre repo
2. Railway détectera le `frontend/Dockerfile`
3. Configurez les variables d'environnement :
   - Cliquez sur le service frontend
   - Allez dans **"Variables"**
   - Ajoutez :
     ```
     VITE_API_URL=${{Backend.url}}/api
     ```
4. Dans **"Settings" → "Root Directory"**, mettez : `frontend`
5. Dans **"Settings" → "Networking"**, activez **"Public Networking"**
6. Cliquez sur **"Deploy"**

### 5. Vérifier le déploiement

1. Attendez que les 3 services (PostgreSQL, Backend, Frontend) affichent **"Active"**
2. Cliquez sur le frontend et ouvrez l'URL publique
3. Testez l'inscription et la connexion

---

## 🔧 Variables d'environnement importantes

### Backend
- `DATABASE_URL` : Automatique depuis PostgreSQL
- `JWT_SECRET` : Clé secrète pour les tokens (générez-en une aléatoire)
- `EMAIL_USER` / `EMAIL_PASSWORD` : Pour l'envoi d'emails
- `STRIPE_SECRET_KEY` : Clé Stripe pour les paiements
- `FRONTEND_URL` : URL du frontend Railway

### Frontend
- `VITE_API_URL` : URL du backend Railway + `/api`

---

## 📊 Monitoring et coûts

- **Dashboard Railway** : Consultez l'utilisation de vos 5$ gratuits
- **Logs** : Cliquez sur un service → onglet "Deployments" → "View Logs"
- **Redéploiement** : Automatique à chaque push sur GitHub (si configuré)

---

## 🐛 Problèmes courants

### Erreur Prisma "Can't reach database"
→ Vérifiez que `DATABASE_URL` est bien configurée avec `${{Postgres.DATABASE_URL}}`

### Erreur CORS
→ Ajoutez l'URL du frontend Railway dans les CORS du backend

### Build qui échoue
→ Vérifiez les logs de build dans Railway
→ Assurez-vous que `Root Directory` est bien configuré

---

## 💡 Conseils

1. **Variables sensibles** : Ne jamais les committer dans le code
2. **Domaine personnalisé** : Gratuit sur Railway (Settings → Domains)
3. **Auto-deploy** : Configurez le déploiement automatique sur push GitHub
4. **Backups BDD** : Railway fait des backups automatiques

---

## 🔗 Liens utiles

- Documentation Railway : https://docs.railway.com
- Support Discord : https://discord.gg/railway
- Pricing : https://railway.app/pricing (5$/mois gratuit inclus)
