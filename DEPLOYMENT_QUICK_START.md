# 🚀 Scripts de déploiement rapide

## 🔧 Génération de clés JWT sécurisées

Exécutez ce script pour générer des clés sécurisées :

```powershell
# Générer JWT_SECRET
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Générer REFRESH_TOKEN_SECRET
node -e "console.log('REFRESH_TOKEN_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

## 📦 Pré-déploiement - Checklist

Avant de déployer, assurez-vous que :

```bash
# Backend - Vérifier que tout compile
cd backend
npm install
npm run build

# Frontend - Vérifier que tout compile
cd ../frontend
npm install
npm run build
```

## 🌐 URLs importantes

### Après déploiement, notez vos URLs :

```
Backend Railway: https://_____________________.up.railway.app
Frontend Vercel: https://_____________________.vercel.app
```

## 🔐 Variables d'environnement à configurer

### Railway (Backend)
1. Allez sur railway.app
2. Sélectionnez votre projet
3. Variables → Add Variable
4. Copiez-collez depuis `.env.example`

### Vercel (Frontend)
1. Allez sur vercel.com
2. Sélectionnez votre projet
3. Settings → Environment Variables
4. Ajoutez : `VITE_API_URL` = votre URL Railway

## 🎯 Ordre de déploiement recommandé

1. **Déployer le backend sur Railway** (avec PostgreSQL)
2. **Noter l'URL du backend Railway**
3. **Déployer le frontend sur Vercel** (avec VITE_API_URL)
4. **Noter l'URL du frontend Vercel**
5. **Retourner sur Railway** et mettre à jour FRONTEND_URL

## ✅ Tests post-déploiement

```bash
# Test 1 : Backend Health Check
curl https://your-backend.railway.app/api/health

# Test 2 : Frontend accessible
# Ouvrir https://your-frontend.vercel.app dans le navigateur

# Test 3 : Connexion Frontend → Backend
# Essayez de vous inscrire/connecter dans l'app
```

## 🐛 Commandes de debug

### Railway
```bash
# Installer Railway CLI
npm i -g @railway/cli

# Se connecter
railway login

# Voir les logs en temps réel
railway logs --service backend

# Ouvrir le dashboard
railway open
```

### Vercel
```bash
# Installer Vercel CLI
npm i -g vercel

# Se connecter
vercel login

# Voir les logs
vercel logs

# Liste des déploiements
vercel ls
```

## 🔄 Redéploiement rapide

### Après modification du code

```bash
# Commit et push
git add .
git commit -m "Update: description"
git push origin main
```

Les deux plateformes redéploieront automatiquement !

### Forcer un redéploiement

**Railway :**
- Dashboard → Deployments → New Deployment

**Vercel :**
```bash
vercel --prod
```

## 💡 Tips professionnels

1. **Utilisez des branches pour les tests**
   - `main` → Production
   - `dev` → Preview deployments

2. **Configurez les webhooks**
   - Recevez des notifications Discord/Slack lors des déploiements

3. **Monitoring**
   - Railway : Configurer les alertes de CPU/RAM
   - Vercel : Activer Analytics

4. **Backup base de données**
   - Railway → PostgreSQL → Backups (automatique)

## 🚨 En cas de problème

1. **Backend 500/502 ?**
   - Vérifiez les logs Railway
   - Vérifiez DATABASE_URL
   - Vérifiez JWT_SECRET

2. **Frontend CORS errors ?**
   - Vérifiez FRONTEND_URL dans Railway
   - Vérifiez VITE_API_URL dans Vercel

3. **Authentification ne fonctionne pas ?**
   - Vérifiez que credentials: true dans CORS
   - Vérifiez JWT_SECRET
   - Vérifiez les cookies (même domaine ou configuration spéciale)

## 🎓 Ressources

- [Railway Documentation](https://docs.railway.app)
- [Vercel Documentation](https://vercel.com/docs)
- [Prisma Deployment](https://www.prisma.io/docs/guides/deployment)

**Bon déploiement ! 🚀**
