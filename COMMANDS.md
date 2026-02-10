# 📋 Commandes Essentielles - E-Trans Déploiement

## 🔐 Génération des secrets JWT

### PowerShell (Windows)
```powershell
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('REFRESH_TOKEN_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

### Bash (Linux/Mac)
```bash
openssl rand -hex 32
openssl rand -hex 32
```

### Utiliser le script
```bash
node backend/generate-keys.js
```

---

## 🚀 Installation locale

### Backend
```powershell
cd backend
npm install
npm run build
npm run dev
```

### Frontend
```powershell
cd frontend
npm install
npm run build
npm run dev
```

---

## 🔧 Configuration base de données

### Générer Prisma Client
```powershell
cd backend
npx prisma generate
```

### Push schema vers DB
```powershell
npx prisma db push
```

### Seed la base de données
```powershell
npm run db:seed
```

### Ouvrir Prisma Studio
```powershell
npm run db:studio
```

---

## 🌐 Tester en local

### Backend (http://localhost:5000)
```powershell
cd backend
npm run dev
```

### Frontend (http://localhost:5173)
```powershell
cd frontend
npm run dev
```

### Test API
```powershell
# Health check
curl http://localhost:5000/api/health

# Test auth (doit retourner 401)
curl http://localhost:5000/api/auth/me
```

---

## 🚂 Railway CLI

### Installation
```powershell
npm i -g @railway/cli
```

### Connexion
```powershell
railway login
```

### Initialiser projet
```powershell
cd backend
railway init
```

### Lier projet existant
```powershell
railway link
```

### Voir logs
```powershell
railway logs
```

### Variables d'environnement
```powershell
# Lister
railway variables

# Ajouter
railway variables set KEY=value
```

### Ouvrir dashboard
```powershell
railway open
```

### Exécuter commande
```powershell
railway run npm run db:studio
```

---

## ☁️ Vercel CLI

### Installation
```powershell
npm i -g vercel
```

### Connexion
```powershell
vercel login
```

### Déployer en preview
```powershell
cd frontend
vercel
```

### Déployer en production
```powershell
vercel --prod
```

### Voir logs
```powershell
vercel logs
```

### Liste déploiements
```powershell
vercel ls
```

### Variables d'environnement
```powershell
# Ajouter
vercel env add VITE_API_URL

# Lister
vercel env ls
```

---

## 📦 Build Production

### Backend
```powershell
cd backend
npm install
npm run build
npm start
```

### Frontend
```powershell
cd frontend
npm install
npm run build
npm run preview
```

---

## 🔍 Debugging

### Vérifier version Node
```powershell
node --version
```

### Vérifier version npm
```powershell
npm --version
```

### Nettoyer node_modules
```powershell
# Backend
cd backend
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install

# Frontend
cd frontend
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### Vérifier port utilisé
```powershell
# Windows
netstat -ano | findstr :5000
netstat -ano | findstr :5173
```

### Tuer processus sur port
```powershell
# Remplacer <PID> par le numéro du processus
taskkill /PID <PID> /F
```

---

## 🧪 Tests rapides

### Backend compile
```powershell
cd backend
npm run build
```

### Frontend compile
```powershell
cd frontend
npm run build
```

### TypeScript check
```powershell
# Backend
cd backend
npx tsc --noEmit

# Frontend
cd frontend
npx tsc --noEmit
```

---

## 🔄 Git

### Initialiser
```powershell
git init
git add .
git commit -m "Initial commit"
```

### Ajouter remote
```powershell
git remote add origin https://github.com/username/repo.git
git branch -M main
git push -u origin main
```

### Nouveau commit
```powershell
git add .
git commit -m "Description des changements"
git push
```

---

## 📊 Monitoring

### Logs Railway en temps réel
```powershell
railway logs --follow
```

### Logs Vercel en temps réel
```powershell
vercel logs --follow
```

### Vérifier santé backend
```powershell
# Local
curl http://localhost:5000/api/health

# Production
curl https://your-backend.railway.app/api/health
```

---

## 🔒 Variables d'environnement

### Backend (.env)
```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/etrans
JWT_SECRET=your-dev-secret
REFRESH_TOKEN_SECRET=your-dev-refresh-secret
FRONTEND_URL=http://localhost:5173
RESEND_API_KEY=
GEMINI_API_KEY=
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000
```

---

## 🚨 Urgence - Rollback

### Railway
1. Dashboard → Deployments
2. Sélectionner déploiement stable
3. "Redeploy"

### Vercel
```powershell
# Lister déploiements
vercel ls

# Promouvoir un ancien déploiement
vercel promote <deployment-url>
```

---

## 📚 Documentation

- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Guide de déploiement
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Architecture technique
- **[FAQ.md](FAQ.md)** - Questions fréquentes
- **Railway Docs**: https://docs.railway.app
- **Vercel Docs**: https://vercel.com/docs
- **Prisma Docs**: https://prisma.io/docs

---

**💡 Tip**: Sauvegardez ce fichier comme référence rapide !
