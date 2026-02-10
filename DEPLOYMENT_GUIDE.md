# 🚀 Guide de Déploiement E-Trans

## Architecture de déploiement

- **Backend**: Railway (Node.js + PostgreSQL)
- **Frontend**: Vercel (React + Vite)

---

## 📦 PARTIE 1 : Déployer le Backend sur Railway

### Étape 1 : Préparer votre compte Railway

1. Créez un compte sur [railway.app](https://railway.app)
2. Installez Railway CLI (optionnel mais recommandé) :
   ```bash
   npm i -g @railway/cli
   railway login
   ```

### Étape 2 : Créer un nouveau projet Railway

1. Dans Railway Dashboard : **New Project** → **Deploy from GitHub repo**
2. Connectez votre repository GitHub
3. Sélectionnez le dossier `backend` comme root directory

**OU** via CLI :
```bash
cd backend
railway init
railway link
```

### Étape 3 : Ajouter une base de données PostgreSQL

1. Dans votre projet Railway : **New** → **Database** → **Add PostgreSQL**
2. Railway créera automatiquement la variable `DATABASE_URL`
3. La connexion entre votre backend et PostgreSQL est automatique

### Étape 4 : Configurer les variables d'environnement

Dans Railway Dashboard → Votre service backend → **Variables** :

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=${{Postgres.DATABASE_URL}}

# JWT - GÉNÉREZ DES CLÉS SÉCURISÉES !
JWT_SECRET=votre_cle_secrete_jwt_32_caracteres_minimum
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=votre_cle_secrete_refresh_32_caracteres_minimum
REFRESH_TOKEN_EXPIRES_IN=7d

# Frontend URL (vous l'obtiendrez après avoir déployé sur Vercel)
FRONTEND_URL=https://votre-app.vercel.app

# Email (Resend) - Optionnel
RESEND_API_KEY=re_votre_cle_api
FROM_EMAIL=noreply@votredomaine.com

# AI (Google Gemini) - Optionnel
GEMINI_API_KEY=votre_cle_gemini
```

**🔐 Pour générer des clés JWT sécurisées :**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Étape 5 : Configuration du domaine

Railway vous donnera une URL automatique comme : `https://your-app.up.railway.app`

**Pour un domaine personnalisé :**
1. Railway Dashboard → **Settings** → **Domains**
2. Ajoutez votre domaine et suivez les instructions DNS

### Étape 6 : Déploiement

Railway détectera automatiquement votre `nixpacks.toml` et `railway.json` et :
- Installera les dépendances
- Construira le projet TypeScript
- Exécutera les migrations Prisma
- Démarrera le serveur

**Vérification :**
```bash
curl https://your-app.up.railway.app/api/health
```

---

## 🎨 PARTIE 2 : Déployer le Frontend sur Vercel

### Étape 1 : Préparer votre compte Vercel

1. Créez un compte sur [vercel.com](https://vercel.com)
2. Installez Vercel CLI (optionnel) :
   ```bash
   npm i -g vercel
   ```

### Étape 2 : Importer votre projet

**Via Dashboard :**
1. **New Project** → **Import Git Repository**
2. Sélectionnez votre repository
3. **Framework Preset** : Vite
4. **Root Directory** : `frontend`
5. **Build Command** : `npm run build`
6. **Output Directory** : `dist`

**Via CLI :**
```bash
cd frontend
vercel
```

### Étape 3 : Configurer les variables d'environnement

Dans Vercel Dashboard → Votre projet → **Settings** → **Environment Variables** :

```env
VITE_API_URL=https://your-backend.up.railway.app
```

⚠️ **Important** : Ajoutez cette variable pour **tous** les environnements (Production, Preview, Development)

### Étape 4 : Déploiement

1. Vercel déploiera automatiquement à chaque push sur la branche `main`
2. Vous recevrez une URL comme : `https://your-app.vercel.app`

**Redéployer manuellement :**
```bash
vercel --prod
```

### Étape 5 : Configurer le domaine personnalisé (optionnel)

1. Vercel Dashboard → **Settings** → **Domains**
2. Ajoutez votre domaine
3. Configurez vos DNS selon les instructions

---

## 🔄 PARTIE 3 : Finaliser la configuration

### Mettre à jour FRONTEND_URL dans Railway

1. Retournez sur Railway Dashboard
2. Mettez à jour la variable `FRONTEND_URL` avec votre URL Vercel réelle :
   ```env
   FRONTEND_URL=https://your-app.vercel.app
   ```
3. Railway redéploiera automatiquement

### Mettre à jour VITE_API_URL dans Vercel

Si vous avez un domaine personnalisé pour Railway :
1. Vercel Dashboard → **Settings** → **Environment Variables**
2. Mettez à jour `VITE_API_URL`
3. **Deployments** → Redéployez la dernière version

---

## ✅ Vérification du déploiement

### Backend (Railway)
```bash
# Health check
curl https://your-backend.railway.app/api/health

# Test d'authentification
curl https://your-backend.railway.app/api/auth/me
```

### Frontend (Vercel)
1. Ouvrez `https://your-app.vercel.app`
2. Vérifiez que l'application se charge
3. Testez la connexion/inscription pour vérifier la communication avec le backend

---

## 🐛 Dépannage

### Backend ne démarre pas
- Vérifiez les logs Railway : **Deployments** → **View Logs**
- Assurez-vous que `DATABASE_URL` est définie
- Vérifiez que les migrations Prisma ont réussi

### Frontend ne se connecte pas au backend
- Vérifiez `VITE_API_URL` dans Vercel
- Ouvrez la console du navigateur pour voir les erreurs
- Vérifiez les CORS dans le backend

### Erreurs CORS
Dans [backend/src/index.ts](backend/src/index.ts), assurez-vous que CORS est configuré avec votre URL Vercel :
```typescript
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true
}));
```

### Variables d'environnement ne fonctionnent pas
- **Railway** : Redéployez après avoir modifié les variables
- **Vercel** : Redéployez après avoir modifié les variables
- Les variables commençant par `VITE_` doivent être définies **avant** le build

---

## 🔐 Sécurité - Points importants

1. ✅ **Changez tous les secrets** : JWT_SECRET, REFRESH_TOKEN_SECRET
2. ✅ **Utilisez HTTPS** : Railway et Vercel le font automatiquement
3. ✅ **Configurez CORS correctement** : Limitez aux domaines autorisés
4. ✅ **Ne commitez JAMAIS les fichiers .env** : Utilisez .gitignore
5. ✅ **Utilisez des variables d'environnement** : Pas de hardcoding

---

## 📊 Monitoring et logs

### Railway
- **Logs en temps réel** : Dashboard → Deployments → View Logs
- **Métriques** : CPU, RAM, Network dans le dashboard
- **Alertes** : Configurez des notifications pour les erreurs

### Vercel
- **Analytics** : Dashboard → Analytics
- **Logs** : Dashboard → Deployments → Cliquez sur un déploiement → View Function Logs
- **Monitoring** : Temps de réponse, erreurs, etc.

---

## 🚀 Déploiement automatique (CI/CD)

### Configuration actuelle
✅ **Déjà configuré !** Vos déploiements sont automatiques :

- **Railway** : Déploie automatiquement à chaque push sur `main`
- **Vercel** : Déploie automatiquement à chaque push sur `main`

### Branches preview
- **Railway** : Créez une PR pour avoir un environnement de preview
- **Vercel** : Chaque PR a automatiquement une URL de preview

---

## 📝 Commandes utiles

### Railway CLI
```bash
# Voir les logs en temps réel
railway logs

# Ouvrir le projet dans le navigateur
railway open

# Exécuter une commande dans le service
railway run npm run db:studio

# Variables d'environnement
railway variables
```

### Vercel CLI
```bash
# Déployer en preview
vercel

# Déployer en production
vercel --prod

# Voir les logs
vercel logs

# Liste des déploiements
vercel ls
```

---

## 🎯 Checklist finale

Avant de considérer le déploiement comme terminé :

- [ ] Backend accessible et répond au health check
- [ ] Frontend accessible et affiche correctement
- [ ] Authentification fonctionne (signup/login)
- [ ] Base de données connectée et migrations OK
- [ ] CORS configuré correctement
- [ ] Toutes les variables d'environnement sont définies
- [ ] JWT_SECRET et REFRESH_TOKEN_SECRET changés
- [ ] Emails configurés (si applicable)
- [ ] Domaines personnalisés configurés (si applicable)
- [ ] SSL/HTTPS actif (automatique)
- [ ] Monitoring et logs accessibles

---

## 🆘 Besoin d'aide ?

- **Railway** : [docs.railway.app](https://docs.railway.app)
- **Vercel** : [vercel.com/docs](https://vercel.com/docs)
- **Prisma** : [prisma.io/docs](https://prisma.io/docs)

**Bon déploiement ! 🚀**
