# 🎯 Checklist de Déploiement E-Trans

Utilisez cette checklist pour vous assurer que tout est configuré correctement.

## 📋 Avant de commencer

- [ ] Compte Railway créé et vérifié
- [ ] Compte Vercel créé et vérifié
- [ ] Repository Git configuré (GitHub, GitLab, ou Bitbucket)
- [ ] Code backend et frontend commité

## 🔐 Génération des secrets

- [ ] Exécuté `node backend/generate-keys.js` pour générer JWT_SECRET et REFRESH_TOKEN_SECRET
- [ ] Secrets sauvegardés dans un endroit sécurisé (gestionnaire de mots de passe)
- [ ] ⚠️ NE PAS commiter les secrets dans Git

## 🚂 Configuration Railway (Backend)

### Projet et Database
- [ ] Projet Railway créé
- [ ] Repository GitHub connecté à Railway
- [ ] Root directory configuré: `backend`
- [ ] PostgreSQL ajouté au projet
- [ ] Variable `DATABASE_URL` créée automatiquement

### Variables d'environnement
- [ ] `NODE_ENV` = `production`
- [ ] `PORT` = `5000`
- [ ] `JWT_SECRET` = `<votre_clé_générée>`
- [ ] `JWT_EXPIRES_IN` = `15m`
- [ ] `REFRESH_TOKEN_SECRET` = `<votre_clé_refresh_générée>`
- [ ] `REFRESH_TOKEN_EXPIRES_IN` = `7d`
- [ ] `FRONTEND_URL` = `https://your-app.vercel.app` (temporaire, à mettre à jour)
- [ ] `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (automatique)

### Variables optionnelles
- [ ] `RESEND_API_KEY` = `re_...` (si emails activés)
- [ ] `FROM_EMAIL` = `noreply@votredomaine.com`
- [ ] `GEMINI_API_KEY` = `...` (si AI activé)

### Déploiement
- [ ] Premier déploiement lancé
- [ ] Build réussi (vérifier les logs)
- [ ] Migrations Prisma exécutées
- [ ] Application démarrée
- [ ] Health check accessible: `https://your-backend.railway.app/api/health`
- [ ] URL Railway notée: ___________________________________

## ☁️ Configuration Vercel (Frontend)

### Projet
- [ ] Projet Vercel créé
- [ ] Repository GitHub connecté à Vercel
- [ ] Framework détecté: Vite
- [ ] Root directory configuré: `frontend`
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`

### Variables d'environnement
- [ ] `VITE_API_URL` = `https://your-backend.railway.app` (URL Railway)
- [ ] Variable ajoutée pour Production
- [ ] Variable ajoutée pour Preview
- [ ] Variable ajoutée pour Development

### Déploiement
- [ ] Premier déploiement lancé
- [ ] Build réussi
- [ ] Site accessible
- [ ] URL Vercel notée: ___________________________________

## 🔗 Liaison Backend ↔ Frontend

- [ ] `FRONTEND_URL` mise à jour dans Railway avec l'URL Vercel réelle
- [ ] Backend redéployé après mise à jour de FRONTEND_URL
- [ ] `VITE_API_URL` vérifié dans Vercel (doit pointer vers Railway)

## ✅ Tests Fonctionnels

### Backend
- [ ] Health check répond: `curl https://your-backend.railway.app/api/health`
- [ ] API répond (même 401 est OK): `curl https://your-backend.railway.app/api/auth/me`
- [ ] Logs Railway sans erreurs critiques

### Frontend
- [ ] Site s'affiche correctement
- [ ] Pas d'erreurs 404 dans la console
- [ ] Assets chargés (CSS, JS, images)
- [ ] Favicon visible

### Intégration
- [ ] Page de connexion s'affiche
- [ ] Possibilité de créer un compte
- [ ] Connexion fonctionne
- [ ] JWT stocké (cookies ou localStorage)
- [ ] Navigation fonctionne après connexion
- [ ] Pas d'erreurs CORS dans la console

## 🔍 Vérifications de Sécurité

- [ ] JWT_SECRET différent de la valeur par défaut
- [ ] REFRESH_TOKEN_SECRET différent de la valeur par défaut
- [ ] Secrets pas commitées dans Git
- [ ] `.env` dans `.gitignore`
- [ ] HTTPS actif (automatique sur Railway et Vercel)
- [ ] CORS configuré correctement (pas de wildcard `*` en production)
- [ ] Helmet activé dans le backend
- [ ] Rate limiting configuré

## 🎨 Configuration Avancée (Optionnel)

### Domaines personnalisés
- [ ] Domaine personnalisé acheté
- [ ] DNS configuré pour Railway
- [ ] DNS configuré pour Vercel
- [ ] SSL/TLS vérifié

### Monitoring
- [ ] Alertes Railway configurées
- [ ] Vercel Analytics activé
- [ ] Logs accessibles et lisibles

### CI/CD
- [ ] Déploiement automatique sur push `main` activé (Railway)
- [ ] Déploiement automatique sur push `main` activé (Vercel)
- [ ] Preview deployments configurés pour les PRs

## 🐛 Dépannage

Si quelque chose ne fonctionne pas :

### Backend 500
1. [ ] Vérifier logs Railway
2. [ ] Vérifier `DATABASE_URL` est définie
3. [ ] Vérifier migrations Prisma
4. [ ] Vérifier tous les secrets sont définis

### Frontend ne charge pas
1. [ ] Vérifier logs Vercel
2. [ ] Vérifier build réussi
3. [ ] Vérifier console navigateur pour erreurs

### CORS errors
1. [ ] Vérifier `FRONTEND_URL` dans Railway
2. [ ] Vérifier `VITE_API_URL` dans Vercel
3. [ ] Vérifier configuration CORS dans `backend/server/index.ts`
4. [ ] Redéployer backend après changement

### Authentification ne fonctionne pas
1. [ ] Vérifier JWT_SECRET est défini
2. [ ] Vérifier cookies activés dans le navigateur
3. [ ] Vérifier `credentials: true` dans CORS
4. [ ] Vérifier domaine cookies si cross-domain

## 🎉 Déploiement Terminé !

Une fois toutes les cases cochées :

- [ ] Application accessible publiquement
- [ ] Tous les tests passent
- [ ] Aucune erreur critique dans les logs
- [ ] Documentation à jour
- [ ] Équipe informée des URLs

### URLs Finales

```
Frontend (Production):  https://________________________________
Backend API:            https://________________________________
Database:               (géré par Railway, privé)
```

### Identifiants Admin (si seed exécuté)

```
Email:    admin@e-trans.com
Password: admin123
```

⚠️ **Changez ces identifiants en production !**

---

**Bon déploiement ! 🚀**

Date de déploiement : _________________
Déployé par : _________________
