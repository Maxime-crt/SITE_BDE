# Guide de Déploiement Railway 🚀

## Prérequis
- Compte [Railway](https://railway.app) gratuit
- Projet Git (GitHub, GitLab, etc.)
- Railway CLI installé (optionnel)

## Étape 1 : Préparer le projet

✅ **Fichiers de configuration créés :**
- `railway.json` - Configuration Railway
- `Dockerfile` - Image Docker (optionnel)
- `.env.example` - Variables d'environnement
- Build configuré pour production

## Étape 2 : Variables d'environnement à configurer sur Railway

**Variables obligatoires :**
```
NODE_ENV=production
PORT=5000
JWT_SECRET=votre-cle-secrete-jwt-ici
DATABASE_URL=file:./database.db
```

**Variables optionnelles :**
```
BCRYPT_ROUNDS=12
```

## Étape 3 : Déploiement sur Railway

### Option A : Via l'interface web (recommandé)

1. **Connexion :**
   - Aller sur [Railway](https://railway.app)
   - Se connecter avec GitHub/GitLab

2. **Nouveau projet :**
   - Cliquer "New Project"
   - Choisir "Deploy from GitHub repo"
   - Sélectionner votre repository

3. **Configuration automatique :**
   - Railway détecte automatiquement Node.js
   - Il utilisera notre `railway.json`
   - Le build se lance automatiquement

4. **Variables d'environnement :**
   - Aller dans Settings > Variables
   - Ajouter les variables listées ci-dessus
   - **Important :** Générer une clé JWT sécurisée

5. **URL publique :**
   - Aller dans Settings > Domains
   - Cliquer "Generate Domain"
   - Votre app sera accessible via l'URL générée

### Option B : Via Railway CLI

```bash
# Installer Railway CLI
npm install -g @railway/cli

# Se connecter
railway login

# Initialiser le projet
railway init

# Déployer
railway up
```

## Étape 4 : Vérification

Une fois déployé, votre application sera disponible avec :
- ✅ Frontend React accessible à la racine
- ✅ API REST accessible sur `/api/*`
- ✅ WebSocket (Socket.io) fonctionnel
- ✅ Base de données SQLite persistante
- ✅ Authentification JWT
- ✅ Chat en temps réel

## Fonctionnalités déployées

🎯 **Application complète :**
- Système d'authentification
- Gestion d'événements et trajets
- Chat en temps réel avec réponses
- Interface administrateur
- Mode sombre/clair
- Responsive design

## Notes importantes

- **Database :** SQLite intégré, pas de configuration externe nécessaire
- **Scaling :** Railway scale automatiquement selon l'usage
- **HTTPS :** Activé automatiquement
- **Logs :** Disponibles dans l'interface Railway
- **Coût :** Plan gratuit 500h/mois (largement suffisant)

## Support

Si vous rencontrez des problèmes :
1. Vérifier les logs dans Railway Dashboard
2. S'assurer que toutes les variables d'environnement sont définies
3. Vérifier que le domaine généré fonctionne

**URL de l'application :** À définir après déploiement
**Dashboard Railway :** https://railway.app/dashboard