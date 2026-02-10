# 🚢 E-Trans v3.0 - Plateforme de Transit Maritime

**Solution complète de gestion de transit et dédouanement pour la Guinée**

[![Version](https://img.shields.io/badge/version-3.0-blue.svg)](https://github.com)
[![Status](https://img.shields.io/badge/status-production-success.svg)](https://e-trans-frontend.vercel.app)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> Système de gestion moderne pour commissionnaires en douane, transitaires et importateurs en Guinée. Gérez vos dossiers de transit, déclarations douanières, conteneurs et finances en temps réel.

## 📚 Table des matières

- [🌟 Fonctionnalités](#-fonctionnalités)
- [🏗️ Architecture](#️-architecture)
- [🚀 URLs Production](#-urls-production)
- [📖 Documentation](#-documentation)
- [🔧 Développement Local](#-développement-local)
- [🌍 Déploiement](#-déploiement)
- [🔐 Sécurité](#-sécurité)
- [🚨 Support](#-support)

---

## 🌟 Fonctionnalités

### 📦 Gestion des Dossiers de Transit
- ✅ Suivi complet du cycle de vie des dossiers
- ✅ Gestion des BL (Bill of Lading), DO, DDI, BAE
- ✅ Tracking en temps réel des conteneurs
- ✅ Timeline d'événements par dossier
- ✅ Statuts détaillés (16 états du processus)
- ✅ Documents attachés par dossier

### 🛃 Module Douanier
- ✅ Déclarations en détail (IM4, IM5, IM6, IM7)
- ✅ Calcul automatique des droits et taxes
- ✅ Gestion DDI, liquidation, quittance
- ✅ Suivi des paiements douaniers
- ✅ Gestion des régimes douaniers
- ✅ Circuit documentaire (Vert/Jaune/Rouge)

### 📊 Module Financier
- ✅ Suivi provisions et débours
- ✅ Facturation automatique
- ✅ Gestion des dépenses par catégorie
- ✅ Rapports financiers par dossier
- ✅ Solde client en temps réel
- ✅ Export GNF avec formatage local

### 🔐 Authentification & Sécurité
- ✅ JWT + Refresh tokens
- ✅ Cookies sécurisés avec attribut `Partitioned`
- ✅ Support multi-appareils (Chrome cross-site)
- ✅ Gestion des rôles (Director, Accountant, Agent, Client)
- ✅ Vérification email (Resend)
- ✅ Rate limiting et protection CSRF

### 🤖 Assistant IA
- ✅ Intégration Google Gemini
- ✅ Assistance contextuelle sur les dossiers
- ✅ Calculs douaniers intelligents
- ✅ Suggestions et recommandations

### 📱 Interface Moderne
- ✅ Design responsive mobile-first
- ✅ TailwindCSS + Lucide Icons
- ✅ Dark mode support
- ✅ Navigation intuitive
- ✅ Dashboard analytique
- ✅ Recherche et filtres avancés

---

## 🏗️ Architecture

```
E-Trans v3.0
├── Backend (Railway)                    🔗 https://e-trans-backend-production.up.railway.app
│   ├── Node.js 20 + TypeScript
│   ├── Express.js 4.21
│   ├── PostgreSQL (Railway)
│   ├── Prisma ORM 5.22
│   └── API REST + JWT Auth
│
└── Frontend (Vercel)                    🔗 https://e-trans-frontend.vercel.app
    ├── React 18.3 + TypeScript
    ├── Vite 5.4.21 (Build)
    ├── TailwindCSS 3.4
    └── Lucide React Icons
```

### Technologies Clés

**Backend**
- **Runtime**: Node.js 20.x LTS
- **Framework**: Express.js 4.21
- **Database**: PostgreSQL 16 (Railway)
- **ORM**: Prisma 5.22
- **Auth**: JWT + bcrypt
- **Email**: Resend API
- **IA**: Google Gemini API
- **Sécurité**: Helmet, CORS, Rate limiting

**Frontend**
- **Framework**: React 18.3 + TypeScript
- **Build**: Vite 5.4.21 (ultra-rapide)
- **Styling**: TailwindCSS 3.4
- **Icons**: Lucide React
- **HTTP Client**: Fetch API (custom wrapper)
- **Routing**: Client-side routing

**Infrastructure**
- **Hosting Backend**: Railway (avec PostgreSQL)
- **Hosting Frontend**: Vercel (CDN global)
- **CI/CD**: GitHub → Auto-deploy
- **Monitoring**: Railway logs + Vercel Analytics

---

## 🚀 URLs Production

| Service | URL | Status |
|---------|-----|--------|
| **Frontend** | https://e-trans-frontend.vercel.app | ✅ Live |
| **Backend API** | https://e-trans-backend-production.up.railway.app/api | ✅ Live |
| **Health Check** | https://e-trans-backend-production.up.railway.app/health | ✅ Live |

### Endpoints API Principaux

```
🔐 Auth
POST   /api/auth/register          # Inscription
POST   /api/auth/login             # Connexion
POST   /api/auth/refresh           # Refresh token
POST   /api/auth/logout            # Déconnexion
POST   /api/auth/verify-email      # Vérifier email

📦 Shipments
GET    /api/shipments              # Liste dossiers
POST   /api/shipments              # Créer dossier
GET    /api/shipments/:id          # Détail dossier
PUT    /api/shipments/:id          # Modifier dossier
DELETE /api/shipments/:id          # Supprimer dossier
GET    /api/shipments/stats        # Statistiques

💰 Finance
GET    /api/finance/summary        # Résumé financier
POST   /api/finance/invoice        # Créer facture
GET    /api/finance/report         # Rapport financier

🤖 AI Assistant
POST   /api/ai/chat                # Chat avec IA
POST   /api/ai/analyze             # Analyser dossier
```

---

## 📚 Documentation

- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Guide complet de déploiement Railway + Vercel
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Architecture technique et bonnes pratiques
- **[COMMANDS.md](COMMANDS.md)** - Référence des commandes utiles
- **[FAQ.md](FAQ.md)** - Questions fréquentes et solutions

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
│   ├── DEPLOYMENT_GUIDE.md            # Guide de déploiement
│   ├── ARCHITECTURE.md                # Architecture technique
│   ├── COMMANDS.md                    # Référence commandes
│   └── FAQ.md                         # Questions fréquentes
│
├── 🔧 Backend (Railway)
│   ├── src/
│   │   ├── index.ts                   # Point d'entrée
│   │   ├── config/                    # Configuration (env, prisma, logger)
│   │   ├── middleware/                # Auth JWT, RBAC
│   │   ├── routes/                    # API routes
│   │   ├── services/                  # Services (email, cleanup)
│   │   ├── utils/                     # Helpers (cookies, tracking)
│   │   ├── validators/                # Schémas Zod
│   │   └── types/                     # Types TypeScript
│   ├── prisma/
│   │   └── schema.prisma              # Schéma DB (10 modèles)
│   ├── tests/                         # Tests Vitest
│   ├── nixpacks.toml                  # Config build Railway
│   └── package.json
│
├── 🎨 Frontend (Vercel)
│   ├── src/
│   │   ├── App.tsx                    # App principale
│   │   ├── main.tsx                   # Point d'entrée
│   │   ├── components/                # Composants React
│   │   ├── contexts/                  # AuthContext, ThemeContext
│   │   ├── hooks/                     # Hooks personnalisés
│   │   ├── lib/                       # API client
│   │   ├── pages/                     # Pages/Vues
│   │   ├── types/                     # Types TypeScript
│   │   └── utils/                     # Helpers (format)
│   ├── public/                        # Assets statiques
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

### 📖 Documentation
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Guide de déploiement complet
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Architecture technique
- **[COMMANDS.md](COMMANDS.md)** - Référence des commandes
- **[FAQ.md](FAQ.md)** - Questions fréquentes

### 🌐 Liens Externes
- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Prisma Docs**: [prisma.io/docs](https://prisma.io/docs)
- **React Docs**: [react.dev](https://react.dev)
- **Vite Docs**: [vitejs.dev](https://vitejs.dev)

### 🐛 Problèmes Courants

**CORS Errors**
```bash
# Vérifier FRONTEND_URL dans Railway
# Vérifier VITE_API_URL dans Vercel
# Voir FAQ.md section "CORS"
```

**Auth Cookie Issues**
```bash
# Vérifier attribut Partitioned activé
# HTTPS obligatoire en production
# Voir FAQ.md section "Authentication"
```

**Database Connection**
```bash
# Vérifier DATABASE_URL dans Railway
# Vérifier PostgreSQL plugin ajouté
# Voir FAQ.md section "Database"
```

**Build Errors**
```bash
# Vérifier Node version (20.x)
# npm install dans backend ET frontend
# npx prisma generate dans backend
# Voir FAQ.md section "Build"
```

### 📧 Contact & Support

- **Issues**: Ouvrir une issue sur GitHub
- **Questions**: Consulter [FAQ.md](FAQ.md) d'abord
- **Email**: support@etrans.gn *(à configurer)*
- **Documentation**: Lire les guides dans `/docs`

---

## 🎯 Features

### ✅ Modules Opérationnels (v3.0)

#### 📦 Transit & Dédouanement
- **Dossiers de transit**: Création, modification, suivi complet
- **Documents**: BL, Invoice, Packing List, DDI, Declaration, Liquidation, Quittance, BAE, DO, Exit Note
- **Conteneurs**: Multi-conteneurs par dossier (20', 40', 40HC, Reefer, Open Top, Flat Rack)
- **Timeline**: Historique complet des actions et événements
- **Statuts**: 16 états couvrant tout le cycle (Draft → Delivered → Archived)

#### 🛃 Gestion Douanière
- **Régimes**: IM4, IM5, IM6, IM7, EX1, EX2, TR
- **Circuits**: Vert (sans visite), Jaune (visite partielle), Rouge (visite complète)
- **Droits de douane**: DD, RTL, TVA, PC, CA, BFU
- **Numéros officiels**: DDI, Déclaration, Liquidation, Quittance, BAE, BS
- **Calcul automatique**: Droits basés sur valeur CIF en GNF

#### 💰 Finance & Facturation
- **Provisions**: Avances clients tracées
- **Débours**: Dépenses réelles par catégorie (28 types)
- **Factures**: Génération automatique basée sur débours
- **Solde**: Calcul temps réel (provisions - débours)
- **Rapports**: Par dossier, client, période
- **Devise**: Gestion GNF avec formatage local

#### 👥 Multi-utilisateurs & Permissions
- **Rôles**: Director (admin), Accountant (finance), Agent (opérations), Client (lecture)
- **Entreprises**: Multi-sociétés avec isolation des données
- **Permissions**: Accès granulaire par rôle
- **Audit**: Traçabilité des actions par utilisateur

#### 🤖 Assistant IA (Google Gemini)
- Réponse aux questions sur les dossiers
- Suggestions de documents manquants
- Calculs douaniers assistés
- Analyse prédictive (délais, coûts)

#### 🔐 Sécurité Production
- JWT avec refresh tokens (rotation automatique)
- Cookies avec attribut `Partitioned` (Chrome compatible)
- HTTPS obligatoire en production
- Rate limiting (100 req/15min)
- CORS strict (whitelist domaines)
- Helmet.js (headers sécurité)
- Validation Zod (tous les inputs)
- Passwords bcrypt (salt rounds: 12)

### 🚧 Roadmap v4.0 (À venir)

- [ ] **Notifications Push**: Alerts temps réel (WebSocket)
- [ ] **Export PDF**: Factures, déclarations, rapport
- [ ] **Signature électronique**: Documents officiels
- [ ] **Multi-langue**: Français, Anglais, Soussou
- [ ] **Mode hors-ligne**: Progressive Web App (PWA)
- [ ] **Intégration Banque**: Paiements mobiles (Orange Money, MTN)
- [ ] **API Douane**: Intégration ASYCUDA World
- [ ] **Analytics avancés**: Graphiques, tendances, KPIs
- [ ] **Application mobile**: React Native (iOS + Android)
- [ ] **Tests automatisés**: Jest + Playwright (couverture 80%+)

---

## 💰 Coûts & Hébergement

### 💵 Plan Actuel (Production)

| Service | Plan | Coût mensuel | Notes |
|---------|------|--------------|-------|
| **Railway** | Developer | ~$5-15 | Backend + PostgreSQL (usage-based) |
| **Vercel** | Hobby | Gratuit | Frontend (bande passante illimitée) |
| **Resend** | Free Tier | Gratuit | 3,000 emails/mois inclus |
| **Google Gemini** | Free Tier | Gratuit | Requêtes limitées |
| **Domaine** | - | ~$10-15/an | Optionnel (*.railway.app & *.vercel.app gratuits) |
| **Total** | - | **$5-15/mois** | + $1-2/an si domaine personnalisé |

### 📊 Scaling & Limites

**Limites Actuelles (Gratuit/Hobby)**
- Railway: $5 crédit gratuit/mois, puis $0.000463/GB-hour RAM + $0.000231/vCPU-hour
- Vercel: Bande passante illimitée, 100 déploiements/jour
- PostgreSQL: Stockage selon usage Railway
- Resend: 3,000 emails/mois (largement suffisant)

**Besoins pour Scale**
- 100+ utilisateurs: Railway Developer ($5-15/mois) ✅ Actuel
- 1,000+ utilisateurs: Railway Pro ($20-50/mois) + Vercel Pro ($20/mois)
- 10,000+ utilisateurs: Railway Enterprise + Vercel Enterprise

### 🎯 Optimisations Coûts
- ✅ Vercel Hobby (gratuit) pour frontend
- ✅ Compression Gzip/Brotli activée
- ✅ Caching agressif (static assets)
- ✅ Images optimisées (lazy loading)
- ✅ PostgreSQL indexes optimisés
- 🔜 Redis cache (si besoin)
- 🔜 CDN images (Cloudinary free tier)

---

## 📄 License & Contributions

### 📜 License
MIT © 2026 E-Trans - Plateforme de Transit Maritime

### 🤝 Contributions
Les contributions sont bienvenues! 

**Avant de contribuer:**
1. Fork le repository
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

**Guidelines:**
- ✅ Code TypeScript strict
- ✅ Tests unitaires (Jest)
- ✅ Documentation mise à jour
- ✅ Respecter le style (Prettier)
- ✅ Commits conventionnels (feat/fix/docs/refactor)

---

## 🎓 Stack Technique Complète

### Backend
```typescript
"dependencies": {
  "express": "^4.21.0",           // Framework web
  "prisma": "^5.22.0",            // ORM + Client
  "@prisma/client": "^5.22.0",    // Database client
  "bcryptjs": "^2.4.3",           // Hash passwords
  "jsonwebtoken": "^9.0.2",       // JWT auth
  "zod": "^3.23.8",               // Validation schemas
  "helmet": "^8.0.0",             // Security headers
  "cors": "^2.8.5",               // CORS middleware
  "express-rate-limit": "^7.4.1", // Rate limiting
  "resend": "^4.0.0",             // Email service
  "@google/generative-ai": "^0.21.0" // Gemini IA
}
```

### Frontend
```typescript
"dependencies": {
  "react": "^18.3.1",             // UI framework
  "react-dom": "^18.3.1",         // React DOM
  "lucide-react": "^0.469.0",     // Icon library
  "typescript": "^5.7.2"          // Type safety
},
"devDependencies": {
  "vite": "^5.4.21",              // Build tool
  "tailwindcss": "^3.4.17",       // CSS framework
  "@vitejs/plugin-react": "^4.3.4" // React plugin
}
```

### Infrastructure
- **Database**: PostgreSQL 16 (Railway managed)
- **File Storage**: Vercel Blob Storage *(à venir)*
- **CDN**: Vercel Edge Network (global)
- **SSL**: Auto (Let's Encrypt via Railway/Vercel)
- **DNS**: Vercel DNS *(si domaine personnalisé)*
- **Monitoring**: Railway Logs + Vercel Analytics

---

## 🚀 Quick Start - Nouveau Déploiement

### 1️⃣ Préparation (5 min)
```bash
# Cloner le repo
git clone https://github.com/your-org/e-trans.git
cd e-trans

# Générer les secrets JWT
node backend/generate-keys.js
# Copier JWT_SECRET et REFRESH_TOKEN_SECRET
```

### 2️⃣ Backend Railway (10 min)
1. Créer compte Railway: https://railway.app
2. **New Project** → **Deploy from GitHub repo**
3. Sélectionner `e-trans` repo
4. **Add Plugin** → **PostgreSQL**
5. Variables d'environnement:
   ```env
   NODE_ENV=production
   JWT_SECRET=<généré à l'étape 1>
   REFRESH_TOKEN_SECRET=<généré à l'étape 1>
   FRONTEND_URL=https://your-app.vercel.app
   ```
6. Deploy → Attendre build (~3 min)
7. **Copier l'URL Railway**: `https://xxx.railway.app`

### 3️⃣ Frontend Vercel (5 min)
1. Créer compte Vercel: https://vercel.com
2. **Import Project** → GitHub `e-trans`
3. **Root Directory**: `frontend`
4. **Framework**: Vite
5. **Environment Variables**:
   ```env
   VITE_API_URL=https://xxx.railway.app/api
   ```
6. Deploy → Attendre build (~2 min)
7. **Copier l'URL Vercel**: `https://your-app.vercel.app`

### 4️⃣ Finaliser (2 min)
1. Retour Railway → Mettre à jour `FRONTEND_URL` avec URL Vercel
2. Redéployer backend Railway
3. Tester: Ouvrir URL Vercel → S'inscrire → Se connecter ✅

**Total: ~20 minutes** ⚡

### 5️⃣ Vérifications Post-Déploiement
```bash
# Health check backend
curl https://xxx.railway.app/health
# Doit retourner: {"status":"healthy","timestamp":"..."}

# Test CORS
curl -H "Origin: https://your-app.vercel.app" \
     https://xxx.railway.app/api/health
# Doit inclure: Access-Control-Allow-Origin

# Test JWT (après inscription)
curl -X POST https://xxx.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@etrans.gn","password":"YourPassword123!"}'
# Doit retourner: accessToken + refreshToken
```

---

## 🔒 Sécurité Production - Checklist

### ✅ Authentification
- [x] JWT avec expiration courte (15 min access, 7j refresh)
- [x] Refresh token rotation automatique
- [x] Cookies HttpOnly + Secure + SameSite=None + Partitioned
- [x] Passwords bcrypt avec 12 salt rounds
- [x] Email verification obligatoire

### ✅ API Security
- [x] Helmet.js (XSS, CSRF, Clickjacking protection)
- [x] CORS whitelist strict (domaines autorisés)
- [x] Rate limiting (100 req/15min par IP)
- [x] Input validation Zod (tous endpoints)
- [x] SQL injection protection (Prisma parameterized queries)
- [x] HTTPS obligatoire (redirect HTTP→HTTPS)

### ✅ Data Protection
- [x] Environment variables sécurisés (Railway secrets)
- [x] `.env` dans `.gitignore` (jamais commité)
- [x] Database backups automatiques (Railway)
- [x] Logs sans données sensibles
- [x] Audit trail (createdBy, updatedAt sur tous models)

### ✅ Infrastructure
- [x] SSL/TLS auto (Let's Encrypt)
- [x] CDN global (Vercel Edge)
- [x] DDoS protection (Vercel/Railway)
- [x] Uptime monitoring (Railway health checks)

### 🔜 À Améliorer (v4.0)
- [ ] 2FA (Two-Factor Authentication)
- [ ] IP whitelisting pour admin
- [ ] Audit logs détaillés (Sentry)
- [ ] Encryption at rest (Database)
- [ ] Secrets rotation automatique
- [ ] Penetration testing annuel
- [ ] RGPD compliance (data export/delete)

---

## 🚀 Prêt à déployer ?

### 📋 Checklist Finale

**Avant de démarrer:**
- [ ] Node.js 20+ installé localement
- [ ] Git configuré et repo créé
- [ ] Compte Railway créé
- [ ] Compte Vercel créé
- [ ] Compte GitHub avec SSH key

**Déploiement:**
1. ✅ **Secrets générés**: `node backend/generate-keys.js`
2. ✅ **Backend Railway**: PostgreSQL + Variables + Deploy
3. ✅ **Frontend Vercel**: VITE_API_URL + Deploy
4. ✅ **CORS configuré**: FRONTEND_URL Railway = URL Vercel
5. ✅ **Tests réussis**: Inscription + Login + Dossier

**Post-déploiement:**
- [ ] Health check backend OK
- [ ] CORS test OK
- [ ] Inscription + vérification email OK
- [ ] Login + JWT tokens OK
- [ ] Créer un dossier de test OK
- [ ] Dashboard affiche stats OK
- [ ] Logs Railway sans erreurs

### 📚 Ressources

**Documentation:**
1. **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Guide de déploiement complet
2. **[ARCHITECTURE.md](ARCHITECTURE.md)** - Architecture technique
3. **[FAQ.md](FAQ.md)** - Solutions aux problèmes courants
4. **[COMMANDS.md](COMMANDS.md)** - Référence des commandes

**Commandes Utiles:**
```bash
# Vérification pré-déploiement
.\pre-deploy-check.ps1

# Générer secrets JWT
node backend/generate-keys.js

# Build local pour tester
cd backend && npm run build
cd frontend && npm run build

# Démarrer localement
cd backend && npm run dev    # Port 5000
cd frontend && npm run dev   # Port 5173
```

### 🎯 Objectifs v3.0

**Performance:**
- ⚡ Frontend build: < 3 secondes (Vite)
- ⚡ Backend start: < 10 secondes (Railway)
- ⚡ Time to First Byte: < 200ms (Vercel CDN)
- ⚡ Lighthouse Score: 95+ (Performance/Accessibility)

**Fiabilité:**
- 🎯 Uptime: 99.9% (Railway SLA)
- 🎯 Zero downtime deployments (Vercel)
- 🎯 Auto-rollback on failure
- 🎯 Database backups quotidiens (Railway)

**Scalabilité:**
- 📈 100+ utilisateurs simultanés (actuel)
- 📈 1,000+ dossiers en base
- 📈 10,000+ requêtes API/jour
- 📈 Ready to scale horizontalement

---

## 🎉 Démarrage Rapide (Nouveau Projet)

### Pour les pressés (20 minutes)

```bash
# 1. Clone + Setup (2 min)
git clone https://github.com/your-org/e-trans.git
cd e-trans
node backend/generate-keys.js  # Noter JWT_SECRET et REFRESH_TOKEN_SECRET

# 2. Deploy Backend Railway (10 min)
# → Aller sur railway.app
# → New Project → GitHub repo e-trans
# → Add PostgreSQL plugin
# → Add variables: JWT_SECRET, REFRESH_TOKEN_SECRET, FRONTEND_URL
# → Deploy (auto)
# → Copier URL Railway: https://xxx.railway.app

# 3. Deploy Frontend Vercel (5 min)
# → Aller sur vercel.com
# → Import Project → e-trans
# → Root: frontend
# → Framework: Vite
# → Add variable: VITE_API_URL=https://xxx.railway.app/api
# → Deploy (auto)
# → Copier URL Vercel: https://yyy.vercel.app

# 4. Finaliser (3 min)
# → Railway: Update FRONTEND_URL=https://yyy.vercel.app
# → Redeploy Railway
# → Test: Ouvrir https://yyy.vercel.app
# → S'inscrire → Vérifier email → Login → Créer dossier ✅

# ✅ DONE! Application en production en ~20 minutes
```

### URLs à garder

```bash
# Production (remplacer avec vos URLs)
Frontend:  https://e-trans-frontend.vercel.app
Backend:   https://e-trans-backend-production.up.railway.app
API:       https://e-trans-backend-production.up.railway.app/api
Health:    https://e-trans-backend-production.up.railway.app/health

# Local Development
Frontend:  http://localhost:5173
Backend:   http://localhost:5000
API:       http://localhost:5000/api
Prisma:    npx prisma studio  # http://localhost:5555
```

---

## 📞 Contact & Communauté

### 👨‍💻 Équipe de Développement
- **Lead Developer**: [Votre Nom]
- **Backend**: Node.js + PostgreSQL
- **Frontend**: React + TypeScript
- **DevOps**: Railway + Vercel

### 🌍 Communauté
- **GitHub**: [github.com/your-org/e-trans](https://github.com/your-org/e-trans)
- **Issues**: Rapporter un bug ou demander une feature
- **Discussions**: Poser des questions techniques
- **Pull Requests**: Contribuer au code

### 📧 Support Commercial
- **Email**: contact@etrans.gn *(à configurer)*
- **Téléphone**: +224 XXX XXX XXX *(à configurer)*
- **Adresse**: Conakry, Guinée *(à configurer)*

---

## 🌟 Remerciements

Merci aux technologies open-source qui rendent E-Trans possible:

- **React Team** - UI framework moderne
- **Vercel** - Hébergement frontend ultra-rapide
- **Railway** - Infrastructure backend simple
- **Prisma** - ORM TypeScript moderne
- **TailwindCSS** - Framework CSS utility-first
- **Lucide** - Bibliothèque d'icônes élégante
- **Vite** - Build tool ultra-rapide
- **PostgreSQL** - Base de données robuste

Et merci à la communauté des développeurs en Guinée! 🇬🇳

---

<div align="center">

**Made with ❤️ in Guinea 🇬🇳**

**E-Trans v3.0** - Simplifier le transit maritime en Afrique

[🌐 Site Web](https://e-trans-frontend.vercel.app) • 
[📖 Documentation](DEPLOYMENT_GUIDE.md) • 
[🐛 Issues](https://github.com/your-org/e-trans/issues) • 
[💬 Discussions](https://github.com/your-org/e-trans/discussions)

---

⭐ **Si ce projet vous aide, donnez-lui une étoile sur GitHub!** ⭐

</div>
