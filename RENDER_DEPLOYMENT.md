# 🚀 Guide de Déploiement Render - Site BDE IESEG

## ✅ Pourquoi Render ?

- ✅ **100% GRATUIT à vie** (750h/mois)
- ✅ PostgreSQL gratuit inclus
- ✅ Support Docker natif
- ✅ SSL automatique
- ✅ Déploiement Git automatique
- ⚠️ Cold start après 15 min d'inactivité (30-60s de latence)

---

## 📋 Déploiement en 5 Minutes

### **Étape 1 : Créer un compte Render**

1. Va sur https://render.com
2. Sign up avec GitHub
3. Connecte ton repo `SITE_BDE`

---

### **Étape 2 : Déployer via Blueprint (AUTOMATIQUE)**

Render va lire le fichier `render.yaml` automatiquement !

1. Dashboard Render → **New** → **Blueprint**
2. Sélectionne ton repo `SITE_BDE`
3. Clique sur **Apply**

Render va créer automatiquement :
- ✅ Web Service (ton app)
- ✅ PostgreSQL Database
- ✅ Variables d'environnement

---

### **Étape 3 : Configurer les variables secrètes**

Dans **Dashboard → Environment**, ajoute :

```bash
EMAIL_USER=votre.email@gmail.com
EMAIL_PASSWORD=ton-mot-de-passe-application-gmail
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

⚠️ **Génère un nouveau mot de passe Gmail :**
https://myaccount.google.com/apppasswords

---

### **Étape 4 : Mettre à jour FRONTEND_URL**

Une fois déployé, Render te donne une URL comme :
```
https://bde-ieseg.onrender.com
```

**Mets à jour la variable :**
1. Dashboard → Environment → `FRONTEND_URL`
2. Remplace par ton URL Render
3. **Manual Deploy** → **Deploy latest commit**

---

### **Étape 5 : Vérifications Post-Déploiement**

**1. Backend API**
```bash
curl https://bde-ieseg.onrender.com/api/health
# Devrait retourner: {"message":"BDE Billetterie API is running!"}
```

**2. Frontend**
```bash
curl https://bde-ieseg.onrender.com
# Devrait retourner la page HTML
```

**3. Logs**
- Dashboard → Logs
- Vérifie qu'il n'y a pas d'erreurs Prisma ou email

**4. Test fonctionnel**
- [ ] Page d'accueil charge
- [ ] Inscription fonctionne
- [ ] Email de vérification reçu
- [ ] Connexion fonctionne
- [ ] Création d'événement fonctionne
- [ ] Achat de billet fonctionne

---

## 🔄 Déploiements Automatiques

Chaque `git push` sur `main` déclenche un redéploiement automatique !

```bash
git add .
git commit -m "Update feature X"
git push origin main
```

Render build et déploie en ~3-5 minutes.

---

## 🐛 Résolution de Problèmes

### ❌ Build Failed : "Cannot find module"
**Cause** : Dépendances manquantes
**Solution** : Le Dockerfile les installe déjà, vérifie les logs Render

### ❌ Prisma Error : "P1001 Can't reach database"
**Cause** : `DATABASE_URL` mal configurée
**Solution** : Render l'ajoute automatiquement, vérifie dans Environment

### ❌ 500 Error : "Invalid login" (Email)
**Cause** : Mot de passe Gmail invalide
**Solution** : Génère un nouveau mot de passe d'application

### ❌ CORS Error
**Cause** : `FRONTEND_URL` incorrecte
**Solution** : Mets l'URL Render exacte dans `FRONTEND_URL`

### ❌ Cold Start (30-60s de latence)
**Cause** : Render met en veille après 15 min d'inactivité (plan gratuit)
**Solution** :
- Option 1 : Accepter (normal pour le gratuit)
- Option 2 : Utiliser un ping service (UptimeRobot)
- Option 3 : Passer au plan payant ($7/mois)

---

## 📊 Différences avec Railway

| Feature | Railway | Render |
|---------|---------|--------|
| **Prix** | Trial $5 puis payant | **Gratuit à vie** |
| **PostgreSQL** | Payant | **Gratuit** |
| **Cold Start** | Non | Oui (15 min) |
| **SSL** | ✅ | ✅ |
| **Docker** | ✅ | ✅ |

---

## 🔐 Sécurité

### Variables à NE JAMAIS commit
- ❌ `.env` (déjà dans `.gitignore`)
- ❌ Clés Stripe live
- ❌ Mots de passe email
- ❌ JWT secrets

### Configuration Prisma
Le fichier `schema.prisma` utilise maintenant **PostgreSQL** :
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

En local, utilise SQLite ou PostgreSQL local via Docker.

---

## 🧪 Test Local avec PostgreSQL

Si tu veux tester PostgreSQL en local :

```bash
# Démarrer PostgreSQL avec Docker
docker run --name postgres-bde -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:15

# Mettre à jour .env local
DATABASE_URL="postgresql://postgres:password@localhost:5432/site_bde"

# Générer le client Prisma
cd backend && npx prisma generate

# Créer les tables
npx prisma migrate dev --name init

# Lancer l'app
npm run dev
```

---

## 📞 Support

### Logs Render
```bash
# Depuis le Dashboard
Logs → Filter by "error" or "prisma"
```

### En cas de problème
1. Vérifie les logs Render
2. Compare avec les logs locaux
3. Vérifie toutes les variables d'environnement
4. Teste `/api/health` endpoint

---

## 🎯 Checklist Rapide

Avant chaque déploiement :
- [ ] Code testé en local
- [ ] Migrations Prisma créées si modèle changé
- [ ] Variables d'environnement à jour sur Render
- [ ] Commit avec message descriptif
- [ ] Push sur `main`
- [ ] Vérifier les logs de build Render
- [ ] Tester `/api/health`
- [ ] Tester les fonctionnalités critiques

---

## 🚀 Alternative si Cold Start gênant

Si les 30-60s de latence te gênent, utilise **UptimeRobot** (gratuit) :

1. Créer un compte sur https://uptimerobot.com
2. Ajouter un monitor HTTP(S)
3. URL : `https://bde-ieseg.onrender.com/api/health`
4. Interval : 5 minutes

Cela "ping" ton app toutes les 5 min et évite le cold start pour les vrais utilisateurs !

---

## ✅ C'est tout !

Ton app est maintenant déployée **gratuitement à vie** sur Render 🎉
