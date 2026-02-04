# 🏗️ Architecture & Bonnes Pratiques - E-Trans

## 📐 Architecture du Projet

```
┌─────────────────────────────────────────────────────────────┐
│                    UTILISATEURS                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          │                         │
    ┌─────▼──────┐          ┌──────▼──────┐
    │  FRONTEND  │          │   MOBILE    │
    │   Vercel   │          │  (Future)   │
    │ React+Vite │          │             │
    └─────┬──────┘          └──────┬──────┘
          │                        │
          └────────────┬───────────┘
                       │ HTTPS/REST
                 ┌─────▼──────┐
                 │  BACKEND   │
                 │  Railway   │
                 │ Node.js+TS │
                 └─────┬──────┘
                       │
          ┌────────────┼────────────┐
          │            │            │
    ┌─────▼─────┐ ┌───▼────┐ ┌────▼────┐
    │PostgreSQL │ │ Resend │ │ Gemini  │
    │  Railway  │ │  API   │ │   AI    │
    └───────────┘ └────────┘ └─────────┘
```

## 🔐 Flux d'Authentification

```
┌─────────┐                   ┌─────────┐                ┌──────────┐
│ Client  │                   │ Backend │                │ Database │
└────┬────┘                   └────┬────┘                └────┬─────┘
     │                             │                          │
     │ 1. POST /auth/signup        │                          │
     │────────────────────────────>│                          │
     │                             │ 2. Hash password         │
     │                             │                          │
     │                             │ 3. CREATE user           │
     │                             │─────────────────────────>│
     │                             │                          │
     │                             │ 4. User created          │
     │                             │<─────────────────────────│
     │                             │                          │
     │                             │ 5. Generate JWT          │
     │                             │ + Refresh Token          │
     │                             │                          │
     │ 6. Tokens (httpOnly cookie) │                          │
     │<────────────────────────────│                          │
     │                             │                          │
     │ 7. GET /api/resource        │                          │
     │    + Cookie: JWT            │                          │
     │────────────────────────────>│                          │
     │                             │ 8. Verify JWT            │
     │                             │                          │
     │                             │ 9. GET data              │
     │                             │─────────────────────────>│
     │                             │                          │
     │ 10. Data                    │ 11. Data                 │
     │<────────────────────────────│<─────────────────────────│
```

## 📁 Structure des Dossiers

### Backend
```
backend/
├── prisma/
│   ├── schema.prisma      # Modèles de données
│   └── seed.ts            # Données initiales
├── server/
│   ├── index.ts           # Point d'entrée
│   ├── config/
│   │   ├── env.ts         # Variables d'environnement
│   │   ├── logger.ts      # Système de logs
│   │   └── prisma.ts      # Client Prisma
│   ├── middleware/
│   │   └── auth.ts        # Auth JWT middleware
│   ├── routes/
│   │   ├── auth.ts        # Routes authentification
│   │   ├── shipments.ts   # Routes expéditions
│   │   ├── finance.ts     # Routes finances
│   │   └── ai.ts          # Routes IA
│   ├── services/
│   │   └── email.service.ts  # Service emails
│   └── utils/
│       └── cookies.ts     # Helpers cookies
├── railway.toml           # Config Railway
├── nixpacks.toml          # Config build
├── package.json
└── tsconfig.json
```

### Frontend
```
frontend/
├── src/
│   ├── main.tsx           # Point d'entrée
│   ├── App.tsx            # Composant principal
│   ├── lib/
│   │   └── api.ts         # Client API
│   └── types/
│       └── index.ts       # Types TypeScript
├── vercel.json            # Config Vercel
├── vite.config.ts         # Config Vite
├── tailwind.config.js     # Config TailwindCSS
└── package.json
```

## 🔄 Workflow de Développement

### 1. Feature Branch
```bash
# Créer une branche
git checkout -b feature/nouvelle-fonctionnalite

# Développer...
git add .
git commit -m "feat: ajout nouvelle fonctionnalité"

# Push
git push origin feature/nouvelle-fonctionnalite
```

### 2. Pull Request
- Créer PR sur GitHub
- Railway et Vercel créent automatiquement des previews
- Review code
- Tests automatiques (si configurés)

### 3. Merge to Main
- Merge PR → `main`
- Déploiement automatique en production
- Railway et Vercel déploient simultanément

## 🔒 Sécurité - Best Practices

### ✅ À FAIRE

1. **Secrets**
   - Utiliser des variables d'environnement
   - Générer des clés aléatoires de 32+ caractères
   - Rotations régulières des secrets

2. **HTTPS**
   - Toujours en production (automatique Railway/Vercel)
   - httpOnly cookies pour JWT
   - Secure cookies en production

3. **CORS**
   - Limiter aux domaines autorisés
   - Jamais `origin: '*'` en production
   - Credentials: true pour cookies

4. **Rate Limiting**
   - Implémenter sur toutes les routes sensibles
   - Limiter tentatives de login
   - Protection contre brute force

5. **Validation**
   - Valider toutes les entrées utilisateur
   - Utiliser Zod pour typage + validation
   - Sanitize les données

6. **Headers Sécurité**
   - Helmet.js configuré
   - CSP (Content Security Policy)
   - X-Frame-Options
   - X-Content-Type-Options

### ❌ À ÉVITER

1. ❌ Commiter `.env` dans Git
2. ❌ Hardcoder secrets dans le code
3. ❌ Utiliser `eval()` ou code non sécurisé
4. ❌ Stocker mots de passe en clair
5. ❌ Exposer stack traces en production
6. ❌ Ignorer mises à jour de sécurité

## 🚀 Performance

### Backend

1. **Compression**
   ```typescript
   app.use(compression());
   ```

2. **Caching**
   - Implémenter Redis (futur)
   - Cache headers appropriés
   - ETags pour ressources statiques

3. **Database**
   - Indexes sur colonnes recherchées
   - Connection pooling (Prisma)
   - Queries optimisées

4. **Pagination**
   ```typescript
   const page = parseInt(req.query.page) || 1;
   const limit = 20;
   const skip = (page - 1) * limit;
   ```

### Frontend

1. **Code Splitting**
   - Lazy loading routes
   - Dynamic imports

2. **Assets**
   - Compression images
   - Minification JS/CSS (automatique Vite)
   - CDN pour assets statiques

3. **Bundle Size**
   - Tree shaking activé
   - Analyser bundle: `npm run build -- --analyze`

## 📊 Monitoring

### Logs Structurés

```typescript
// Bon ✅
log.info('User logged in', { userId, email, ip });

// Mauvais ❌
console.log('User ' + userId + ' logged in');
```

### Métriques à Surveiller

1. **Backend**
   - Temps de réponse API
   - Taux d'erreur 4xx/5xx
   - Utilisation CPU/RAM
   - Connexions DB actives

2. **Frontend**
   - Core Web Vitals
   - Time to Interactive
   - Bundle size
   - Erreurs JavaScript

3. **Database**
   - Query time
   - Connexions actives
   - Disk usage
   - Slow queries

## 🔄 CI/CD Pipeline

### Déploiement Actuel
```
Git Push → GitHub
    ↓
    ├─→ Railway (détection auto)
    │   ├─ Install deps
    │   ├─ Build TypeScript
    │   ├─ Prisma generate
    │   ├─ Prisma migrate
    │   └─ Start server
    │
    └─→ Vercel (détection auto)
        ├─ Install deps
        ├─ Build Vite
        └─ Deploy static
```

### Améliorations Futures

1. **Tests Automatisés**
   ```yaml
   - Unit tests
   - Integration tests
   - E2E tests (Playwright)
   ```

2. **Linting/Formatting**
   ```yaml
   - ESLint
   - Prettier
   - TypeScript strict
   ```

3. **Security Scanning**
   ```yaml
   - npm audit
   - Snyk
   - OWASP dependency check
   ```

## 🌍 Variables d'Environnement par Environnement

### Development
```env
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/etrans_dev
FRONTEND_URL=http://localhost:5173
JWT_SECRET=dev-secret-ok-for-local
```

### Staging (Preview)
```env
NODE_ENV=production
DATABASE_URL=<Railway Preview DB>
FRONTEND_URL=<Vercel Preview URL>
JWT_SECRET=<Strong Secret>
```

### Production
```env
NODE_ENV=production
DATABASE_URL=<Railway Production DB>
FRONTEND_URL=https://app.yourdomain.com
JWT_SECRET=<Very Strong Secret>
```

## 📈 Scaling Strategy

### Phase 1 (Actuel) - MVP
- Railway Starter Plan
- Vercel Hobby/Pro
- PostgreSQL Railway
- 1 région

### Phase 2 - Growth
- Railway Pro Plan
- Vercel Pro
- PostgreSQL avec replicas
- Redis caching
- 2 régions (EU + US)

### Phase 3 - Scale
- Railway Enterprise
- Vercel Enterprise
- Multi-region DB
- CDN global
- Load balancing
- Monitoring avancé (Datadog/New Relic)

## 🧪 Testing Strategy

### Backend
```typescript
// Unit tests
describe('AuthService', () => {
  it('should hash password correctly', () => {
    // Test
  });
});

// Integration tests
describe('POST /api/auth/signup', () => {
  it('should create new user', async () => {
    // Test
  });
});
```

### Frontend
```typescript
// Component tests
describe('LoginForm', () => {
  it('should submit credentials', () => {
    // Test
  });
});

// E2E tests (Playwright)
test('user can login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name=email]', 'test@example.com');
  await page.fill('[name=password]', 'password');
  await page.click('button[type=submit]');
  await expect(page).toHaveURL('/dashboard');
});
```

## 📚 Resources

### Documentation
- [Railway Docs](https://docs.railway.app)
- [Vercel Docs](https://vercel.com/docs)
- [Prisma Docs](https://prisma.io/docs)
- [Express Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

### Tools
- [Railway CLI](https://docs.railway.app/develop/cli)
- [Vercel CLI](https://vercel.com/docs/cli)
- [Prisma Studio](https://prisma.io/studio)

### Security
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

**Maintenu par l'équipe E-Trans** 🚀
