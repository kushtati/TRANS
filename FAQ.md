# ❓ FAQ - Questions Fréquentes sur le Déploiement

## 🚀 Déploiement Général

### Q: Combien coûte l'hébergement ?

**A:** 
- **Railway**: Gratuit avec $5 de crédit mensuel, puis ~$5-20/mois selon l'usage
- **Vercel**: Gratuit pour projets personnels, ~$20/mois pour Pro
- **Total**: $0-40/mois selon votre plan

### Q: Combien de temps prend le déploiement initial ?

**A:**
- Configuration complète: 30-60 minutes
- Backend Railway: 5-10 minutes
- Frontend Vercel: 2-5 minutes
- Configuration DNS (si domaine personnalisé): 1-48 heures

### Q: Puis-je utiliser d'autres plateformes ?

**A:** Oui, alternatives possibles:
- **Railway** → Render, Fly.io, DigitalOcean App Platform
- **Vercel** → Netlify, Cloudflare Pages
- **PostgreSQL** → Supabase, Neon, PlanetScale

---

## 🔧 Configuration Backend

### Q: Comment générer des JWT secrets sécurisés ?

**A:** Utilisez une de ces méthodes:
```powershell
# Méthode 1: Node.js
node backend/generate-keys.js

# Méthode 2: PowerShell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Méthode 3: OpenSSL (Git Bash)
openssl rand -hex 32
```

### Q: Railway ne trouve pas mon dossier backend

**A:** Configurez le Root Directory:
1. Railway Dashboard → Settings
2. Root Directory: `backend`
3. Redéployez

### Q: Les migrations Prisma échouent

**A:** Vérifications:
1. `DATABASE_URL` est bien définie dans Railway
2. Format correct: `postgresql://user:pass@host:port/db`
3. Logs Railway pour l'erreur exacte
4. Essayez `prisma generate` puis `prisma db push`

### Q: Mon backend répond 502 Bad Gateway

**A:** Causes possibles:
1. **Port incorrect**: Assurez-vous d'utiliser `process.env.PORT`
2. **Database connexion**: Vérifiez `DATABASE_URL`
3. **Build échoué**: Consultez les logs Railway
4. **Timeout**: Augmentez `healthcheckTimeout` dans `railway.toml`

### Q: CORS errors après déploiement

**A:** Checklist:
1. `FRONTEND_URL` correct dans Railway (incluez `https://`)
2. Pas de trailing slash dans `FRONTEND_URL`
3. Backend redéployé après changement CORS
4. Vérifiez `credentials: true` dans configuration CORS

---

## 🎨 Configuration Frontend

### Q: Vercel ne trouve pas mon dossier frontend

**A:** Configuration:
1. Vercel Dashboard → Settings → General
2. Root Directory: `frontend`
3. Framework Preset: `Vite`
4. Build Command: `npm run build`
5. Output Directory: `dist`

### Q: VITE_API_URL ne fonctionne pas

**A:** Points importants:
1. Variables Vite DOIVENT commencer par `VITE_`
2. Ajoutez la variable dans TOUS les environnements (Production, Preview, Development)
3. Redéployez après avoir ajouté la variable
4. Format: `https://your-backend.railway.app` (sans `/api`)

### Q: Page blanche après déploiement

**A:** Debug:
1. Ouvrez la console navigateur (F12)
2. Cherchez erreurs JavaScript
3. Vérifiez Network tab pour 404s
4. Vérifiez `vercel.json` rewrites configurés
5. Build réussi dans Vercel logs

### Q: Assets (CSS/JS) ne chargent pas

**A:**
1. Vérifiez base path dans `vite.config.ts`
2. Build local: `npm run build && npm run preview`
3. Consultez Vercel Function Logs

---

## 🗄️ Database

### Q: Comment accéder à ma base de données ?

**A:** Plusieurs options:
```powershell
# Option 1: Prisma Studio local
cd backend
railway run npx prisma studio

# Option 2: Connexion directe
# Récupérez DATABASE_URL depuis Railway
# Utilisez psql, pgAdmin, ou TablePlus
```

### Q: Comment faire un backup de la DB ?

**A:**
- Railway Dashboard → PostgreSQL → Backups
- Backups automatiques quotidiens inclus
- Téléchargez manuellement si nécessaire

### Q: Ma base de données est pleine

**A:**
1. Vérifiez usage: Railway Dashboard → PostgreSQL → Metrics
2. Nettoyez données anciennes
3. Upgrade plan Railway si nécessaire
4. Optimisez queries et indexes

### Q: Comment réinitialiser la base de données ?

**A:** ⚠️ ATTENTION: Perd toutes les données !
```powershell
# Via Railway CLI
railway run npx prisma migrate reset

# Ou recréez service PostgreSQL dans Railway
```

---

## 🔐 Authentification & Sécurité

### Q: Les cookies ne fonctionnent pas en production

**A:** Vérifications:
1. `sameSite: 'lax'` ou `'none'` si cross-domain
2. `secure: true` en production
3. `httpOnly: true` toujours
4. Même domaine ou configuration CORS appropriée

### Q: JWT expiration trop courte

**A:** Ajustez dans Railway variables:
```env
JWT_EXPIRES_IN=15m              # Token principal court
REFRESH_TOKEN_EXPIRES_IN=7d     # Refresh token plus long
```

### Q: Comment changer JWT_SECRET en production ?

**A:**
1. ⚠️ Tous les users seront déconnectés
2. Générez nouveau secret
3. Mettez à jour dans Railway
4. Railway redéploie automatiquement

### Q: Mot de passe admin oublié

**A:**
```powershell
# Via Prisma Studio
railway run npx prisma studio

# Ou réexécutez seed
railway run npm run db:seed
```

---

## 🐛 Debugging

### Q: Comment voir les logs en production ?

**A:**
```powershell
# Railway
railway logs --follow

# Vercel
vercel logs --follow

# Ou via Dashboard web
```

### Q: Erreur 500 mais pas de logs

**A:**
1. Vérifiez error handling dans code
2. Ajoutez plus de logging
3. Railway → Observability pour métriques détaillées
4. Testez localement avec `NODE_ENV=production`

### Q: Comment debug en production ?

**A:**
```typescript
// Ajoutez logging temporaire
log.debug('Variable value:', { variable });

// Redéployez
git commit -am "debug: add logging"
git push

// Consultez logs
railway logs --follow
```

### Q: Mon déploiement est bloqué

**A:**
1. Railway: Annulez et relancez déploiement
2. Vercel: Redéployez depuis dashboard
3. Vérifiez status pages: railway.app/status, vercel-status.com
4. Contactez support si nécessaire

---

## 💰 Coûts & Plans

### Q: Comment réduire les coûts ?

**A:**
1. **Railway**: Monitoring usage, optimisez code
2. **Vercel**: Optimisez bundle size, utilisez caching
3. **Database**: Nettoyez données anciennes, optimisez queries
4. Utilisez plans gratuits si traffic faible

### Q: Que se passe-t-il si je dépasse les limites gratuites ?

**A:**
- **Railway**: Service pausé ou facturation automatique si carte ajoutée
- **Vercel**: Builds bloqués ou upgrade requis
- Configurez alertes pour être prévenu

### Q: Puis-je héberger gratuitement ?

**A:** Oui, avec limitations:
- **Railway**: $5 de crédit gratuit mensuel
- **Vercel**: Plan Hobby gratuit pour projets personnels
- Suffisant pour prototypes et petits projets

---

## 🌐 Domaines & DNS

### Q: Comment ajouter un domaine personnalisé ?

**A:**
**Backend (Railway):**
1. Settings → Domains → Add Domain
2. Configurez DNS (A ou CNAME)
3. Attendez propagation DNS (1-48h)

**Frontend (Vercel):**
1. Settings → Domains → Add
2. Suivez instructions DNS
3. SSL automatique après propagation

### Q: Mon domaine ne fonctionne pas

**A:**
1. Vérifiez DNS propagation: whatsmydns.net
2. Attendez jusqu'à 48h
3. Vérifiez configuration DNS correcte
4. SSL peut prendre quelques minutes supplémentaires

### Q: Puis-je utiliser le même domaine pour frontend et backend ?

**A:** Oui, avec sous-domaines:
- `app.example.com` → Frontend (Vercel)
- `api.example.com` → Backend (Railway)

---

## 🔄 Updates & Maintenance

### Q: Comment mettre à jour les dépendances ?

**A:**
```powershell
# Vérifier updates disponibles
npm outdated

# Update tous les packages
npm update

# Update package spécifique
npm install package@latest

# Test et commit
npm run build
git commit -am "chore: update dependencies"
git push
```

### Q: Comment rollback un déploiement ?

**A:**
**Railway:**
- Dashboard → Deployments → Cliquez ancien déploiement → Redeploy

**Vercel:**
```powershell
vercel ls                    # Liste déploiements
vercel promote <url>         # Promote ancien
```

### Q: Puis-je avoir plusieurs environnements ?

**A:** Oui:
- `main` branch → Production
- `staging` branch → Staging (configurez dans Railway/Vercel)
- Feature branches → Preview deploys automatiques

---

## 📧 Email & Services Externes

### Q: Les emails ne partent pas

**A:**
1. Vérifiez `RESEND_API_KEY` définie
2. Vérifiez domaine vérifié dans Resend
3. Consultez logs Resend dashboard
4. Testez avec email temporaire

### Q: Comment configurer Resend ?

**A:**
1. Compte sur resend.com
2. Vérifiez domaine (ou utilisez onboarding@resend.dev)
3. Créez API key
4. Ajoutez `RESEND_API_KEY` dans Railway

### Q: Google Gemini AI ne fonctionne pas

**A:**
1. Obtenez clé API: makersuite.google.com/app/apikey
2. Ajoutez `GEMINI_API_KEY` dans Railway
3. L'app fonctionne sans AI (fonctionnalité optionnelle)

---

## 🚨 Problèmes Courants

### Q: "Cannot find module" en production

**A:**
1. Vérifiez imports utilisent bonnes extensions (`.js` pour ESM)
2. `package.json` a `"type": "module"`
3. Dépendance dans `dependencies`, pas `devDependencies`

### Q: "Port already in use" localement

**A:**
```powershell
# Trouver processus
netstat -ano | findstr :5000

# Tuer processus
taskkill /PID <PID> /F

# Ou changez port
$env:PORT=5001
npm run dev
```

### Q: Build timeout sur Railway/Vercel

**A:**
1. Optimisez build process
2. Réduisez dépendances inutiles
3. Upgrade plan si nécessaire
4. Vérifiez pas de script bloquant

---

## 📞 Support

### Q: Où trouver de l'aide ?

**A:**
- **Documentation projet**: Fichiers .md dans le repo
- **Railway**: railway.app/help, Discord: discord.gg/railway
- **Vercel**: vercel.com/support, Discord
- **Prisma**: prisma.io/docs, GitHub Discussions

### Q: Comment reporter un bug ?

**A:**
1. Vérifiez si connu (Issues GitHub)
2. Collectez logs, screenshots
3. Steps pour reproduire
4. Environnement (OS, Node version, etc.)
5. Créez Issue GitHub détaillée

---

## 💡 Tips & Astuces

### Q: Meilleures pratiques de déploiement ?

**A:**
1. ✅ Testez localement avant de déployer
2. ✅ Utilisez feature branches
3. ✅ Revoyez les logs après déploiement
4. ✅ Configurez monitoring et alertes
5. ✅ Documentez changements (CHANGELOG)
6. ✅ Gardez backups DB réguliers

### Q: Comment accélérer mes déploiements ?

**A:**
1. Cache dépendances (automatique généralement)
2. Optimisez build scripts
3. Parallélisez tasks quand possible
4. Réduisez taille bundle
5. Utilisez CDN pour assets

### Q: Checklist avant de mettre en production ?

**A:**
- [ ] Tous les secrets changés (pas de valeurs "dev")
- [ ] CORS configuré correctement
- [ ] Rate limiting activé
- [ ] Logs configurés
- [ ] Monitoring setup
- [ ] Backup DB configuré
- [ ] Tests passent
- [ ] Documentation à jour

---

**Vous ne trouvez pas votre réponse ?**
Consultez [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) ou créez une Issue GitHub ! 🚀
