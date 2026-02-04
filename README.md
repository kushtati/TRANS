# 🚀 E-Trans v3.0 - Application Full-Stack

**Plateforme de gestion de transport et logistique**

## 📚 Documentation de Déploiement

- **[📖 Guide Complet de Déploiement](DEPLOYMENT_GUIDE.md)** - Instructions détaillées pas-à-pas
- **[⚡ Quick Start Déploiement](DEPLOYMENT_QUICK_START.md)** - Scripts et commandes rapides

---

## 🏗️ Architecture

```
E-Trans v3.0
├── Backend (Railway)
│   ├── Node.js + TypeScript + Express
│   ├── PostgreSQL (Database)
│   ├── Prisma ORM
│   └── API REST
│
└── Frontend (Vercel)
    ├── React + TypeScript
    ├── Vite
    └── TailwindCSS
```

---

## 🚀 Déploiement Rapide

### Prérequis
- Compte [Railway](https://railway.app)
- Compte [Vercel](https://vercel.com)
- Repository Git (GitHub, GitLab, ou Bitbucket)

### Étapes simplifiées

1. **Backend sur Railway**
   ```bash
   cd backend
   # Pusher vers GitHub
   # Importer dans Railway
   # Ajouter PostgreSQL
   # Configurer les variables d'environnement
   ```

2. **Frontend sur Vercel**
   ```bash
   cd frontend
   # Pusher vers GitHub
   # Importer dans Vercel
   # Configurer VITE_API_URL
   ```

3. **Lier les deux**
   - Mettre à jour `FRONTEND_URL` dans Railway
   - Mettre à jour `VITE_API_URL` dans Vercel

👉 **[Voir le guide complet](DEPLOYMENT_GUIDE.md)** pour les instructions détaillées

---

## � Documentation Complète

### 📖 Guides de Déploiement
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Guide complet avec toutes les étapes détaillées
- **[DEPLOYMENT_QUICK_START.md](DEPLOYMENT_QUICK_START.md)** - Scripts et commandes rapides
- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Checklist interactive pour le déploiement

### 🛠️ Documentation Technique
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Architecture du projet et bonnes pratiques
- **[COMMANDS.md](COMMANDS.md)** - Référence de toutes les commandes utiles
- **[FAQ.md](FAQ.md)** - Questions fréquentes et solutions

### 🔧 Scripts Utiles
- **[generate-keys.js](backend/generate-keys.js)** - Générateur de clés JWT sécurisées
- **[pre-deploy-check.ps1](pre-deploy-check.ps1)** - Vérification avant déploiement (PowerShell)

---

## 🚀 Quick Start - Déploiement en 3 étapes

### 1️⃣ Générer les secrets
```powershell
node backend/generate-keys.js
```

### 2️⃣ Déployer Backend (Railway)
1. Créer projet Railway
2. Ajouter PostgreSQL
3. Configurer variables (voir [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md))
4. Déployer

### 3️⃣ Déployer Frontend (Vercel)
1. Créer projet Vercel
2. Configurer `VITE_API_URL`
3. Déployer

**📖 Voir [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) pour instructions détaillées**

---

## 🔧 Développement Local

### Prérequis
- Node.js 20+
- PostgreSQL (local ou Docker)
- npm ou yarn

### Setup Backend
```bash
cd backend
npm install

# Copier et configurer .env
cp .env.example .env
# Éditer .env avec vos valeurs

# Setup database
npx prisma generate
npx prisma db push
npm run db:seed

# Démarrer
npm run dev
```

### Setup Frontend
```bash
cd frontend
npm install

# Copier et configurer .env
cp .env.example .env
# Éditer .env (VITE_API_URL=http://localhost:5000)

# Démarrer
npm run dev
```

### URLs Locales
- 🎨 Frontend: http://localhost:5173
- 🔧 Backend: http://localhost:5000
- 📊 Prisma Studio: http://localhost:5555 (`npm run db:studio`)

---

## 📁 Structure du Projet

```
DEV/
├── 📚 Documentation
│   ├── README.md                      # Ce fichier
│   ├── DEPLOYMENT_GUIDE.md            # Guide complet
│   ├── DEPLOYMENT_QUICK_START.md      # Quick start
│   ├── DEPLOYMENT_CHECKLIST.md        # Checklist déploiement
│   ├── ARCHITECTURE.md                # Architecture technique
│   ├── COMMANDS.md                    # Référence commandes
│   └── FAQ.md                         # Questions fréquentes
│
├── 🔧 Backend (Railway)
│   ├── server/
│   │   ├── index.ts                   # Point d'entrée
│   │   ├── config/                    # Configuration
│   │   ├── middleware/                # Auth, logging
│   │   ├── routes/                    # API routes
│   │   ├── services/                  # Services externes
│   │   └── utils/                     # Helpers
│   ├── prisma/
│   │   ├── schema.prisma              # DB schema
│   │   └── seed.ts                    # Données initiales
│   ├── railway.toml                   # Config Railway
│   ├── nixpacks.toml                  # Config build
│   ├── generate-keys.js               # Générateur secrets
│   └── package.json
│
├── 🎨 Frontend (Vercel)
│   ├── src/
│   │   ├── App.tsx                    # App principale
│   │   ├── main.tsx                   # Point d'entrée
│   │   ├── lib/                       # API client
│   │   └── types/                     # TypeScript types
│   ├── vercel.json                    # Config Vercel
│   ├── vite.config.ts                 # Config Vite
│   ├── tailwind.config.js             # Config Tailwind
│   └── package.json
│
└── 🛠️ Scripts
    └── pre-deploy-check.ps1           # Vérification pré-déploiement
```

---

## 🔐 Sécurité

### ✅ Checklist Sécurité
- [ ] JWT secrets générés aléatoirement (32+ caractères)
- [ ] `.env` dans `.gitignore` (jamais commité)
- [ ] HTTPS activé (automatique Railway/Vercel)
- [ ] CORS configuré avec domaines spécifiques
- [ ] Rate limiting activé
- [ ] Helmet.js configuré
- [ ] Validation des inputs (Zod)
- [ ] Passwords hashés (bcrypt)

### 🔒 Variables Sensibles
Ne commitez **JAMAIS** :
- `.env`
- Secrets JWT
- Clés API
- DATABASE_URL

---

## 🌍 Variables d'Environnement

### Backend (.env)
```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://...
JWT_SECRET=<généré par generate-keys.js>
REFRESH_TOKEN_SECRET=<généré par generate-keys.js>
FRONTEND_URL=https://your-app.vercel.app
RESEND_API_KEY=re_...
GEMINI_API_KEY=...
```

### Frontend (.env)
```env
VITE_API_URL=https://your-backend.railway.app
```

📖 **Voir [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) pour configuration détaillée**

---

## 🧪 Tests & Qualité

### Tests Locaux
```bash
# Backend
cd backend
npm run build          # Vérifier compilation TypeScript
npx tsc --noEmit      # Type checking uniquement

# Frontend
cd frontend
npm run build          # Vérifier build Vite
npx tsc --noEmit      # Type checking uniquement
```

### Pré-déploiement
```powershell
# Vérification complète
.\pre-deploy-check.ps1
```

---

## 🚨 Support & Aide

### Documentation
- [Guide de Déploiement](DEPLOYMENT_GUIDE.md)
- [FAQ - Questions Fréquentes](FAQ.md)
- [Architecture & Bonnes Pratiques](ARCHITECTURE.md)
- [Référence des Commandes](COMMANDS.md)

### Plateformes
- **Railway**: [docs.railway.app](https://docs.railway.app)
- **Vercel**: [vercel.com/docs](https://vercel.com/docs)
- **Prisma**: [prisma.io/docs](https://prisma.io/docs)

### Problèmes Courants
Consultez [FAQ.md](FAQ.md) pour solutions aux problèmes fréquents :
- CORS errors
- Authentification
- Database connexion
- Build errors
- Et plus...

---

## 🎯 Features

### ✅ Fonctionnalités Actuelles
- 🔐 Authentification JWT + Refresh tokens
- 👥 Gestion utilisateurs et rôles
- 📦 Gestion des expéditions
- 💰 Module finances
- 🤖 Assistant IA (Google Gemini)
- 📧 Notifications email (Resend)
- 🔒 Sécurité (Helmet, CORS, Rate limiting)
- 📱 Responsive design (TailwindCSS)

### 🚧 Roadmap
- [ ] Tests automatisés (Jest, Playwright)
- [ ] CI/CD avancé (GitHub Actions)
- [ ] Monitoring (Datadog/New Relic)
- [ ] Cache (Redis)
- [ ] Multi-region deployment
- [ ] Application mobile (React Native)

---

## 💰 Coûts Estimés

### Hébergement
- **Railway**: Gratuit ($5 crédit) ou $5-20/mois
- **Vercel**: Gratuit (Hobby) ou $20/mois (Pro)
- **Total**: $0-40/mois selon usage

### Services Optionnels
- **Resend** (emails): Gratuit (3k emails/mois) ou $20/mois
- **Google Gemini** (IA): Gratuit jusqu'à certaines limites
- **Domaine**: ~$10-15/an

---

## 📄 License

MIT © 2026 E-Trans - Plateforme de Gestion de Transport

---

## 🚀 Prêt à déployer ?

1. **Lisez le guide**: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
2. **Suivez la checklist**: [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
3. **Générez vos secrets**: `node backend/generate-keys.js`
4. **Déployez sur Railway** (backend)
5. **Déployez sur Vercel** (frontend)
6. **Testez votre application** ✅

**Besoin d'aide ?** Consultez [FAQ.md](FAQ.md) ou créez une Issue GitHub !

---

**Made with ❤️ for E-Trans**
