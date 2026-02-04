# 🔧 Configuration Railway - Multi-Appareils

## Étapes pour activer la synchronisation entre appareils

### 1. Aller sur Railway Dashboard
🌐 https://railway.app

### 2. Sélectionner votre projet
- Cliquer sur le projet **TRANS** (backend)

### 3. Aller dans l'onglet Variables
- Cliquer sur **"Variables"** dans le menu de gauche

### 4. Ajouter la variable COOKIE_DOMAIN

Cliquer sur **"+ New Variable"** et ajouter:

```
Variable Name:  COOKIE_DOMAIN
Value:          .railway.app
```

**⚠️ Important:** Ne pas oublier le point (`.`) au début de `.railway.app`

### 5. Vérifier les autres variables

S'assurer que ces variables existent déjà:

```
NODE_ENV=production
FRONTEND_URL=https://trans-delta-kohl.vercel.app
RESEND_API_KEY=re_Vean7iET_6xcafrbGftzzZpfaL7DcGnuS
DATABASE_URL=(géré automatiquement par Railway)
JWT_SECRET=(votre secret)
REFRESH_TOKEN_SECRET=(votre secret)
```

### 6. Redémarrer le service

Après avoir ajouté `COOKIE_DOMAIN`:
1. Railway redémarrera automatiquement le service
2. Attendre que le déploiement se termine (indicator vert)
3. Le backend sera alors configuré pour les cookies multi-appareils

## Test de fonctionnement

### Avant la configuration
❌ Se connecter sur PC → Ouvrir sur téléphone → Données ne s'affichent pas

### Après la configuration
✅ Se connecter sur PC → Ouvrir sur téléphone → Données s'affichent correctement

## Pourquoi ça fonctionne maintenant?

**Sans COOKIE_DOMAIN:**
- Cookie stocké uniquement pour `trans-production-3b2c.up.railway.app`
- Chaque appareil = session isolée

**Avec COOKIE_DOMAIN=.railway.app:**
- Cookie partagé sur tous les sous-domaines `*.railway.app`
- Tous les appareils utilisent le même domaine = même session
- Les données sont synchronisées via l'API

## Vérification

Pour vérifier que ça fonctionne:

1. **Se connecter sur le premier appareil**
   - Ouvrir https://trans-delta-kohl.vercel.app
   - Se connecter avec email/mot de passe
   - Les données s'affichent ✓

2. **Ouvrir sur un deuxième appareil**
   - Ouvrir https://trans-delta-kohl.vercel.app
   - Se connecter avec le MÊME compte
   - Les données devraient maintenant s'afficher ✓

3. **Vérifier les cookies (DevTools)**
   - F12 → Application → Cookies
   - Vérifier que `accessToken` et `refreshToken` existent
   - Domain devrait être `.railway.app` (avec le point)

## En cas de problème

Si les données ne s'affichent toujours pas:

1. **Vider le cache et les cookies:**
   - Chrome: Ctrl+Shift+Del → Tout supprimer
   - Safari: Préférences → Confidentialité → Gérer les données

2. **Se reconnecter:**
   - Se déconnecter
   - Se reconnecter avec le même compte

3. **Vérifier la console (F12):**
   - Chercher des erreurs CORS
   - Vérifier que l'API répond (onglet Network)

4. **Vérifier que COOKIE_DOMAIN est bien configuré:**
   - Railway Dashboard → Variables
   - Vérifier que `COOKIE_DOMAIN=.railway.app`

## Alternative: Domaine personnalisé

Si vous avez un domaine personnalisé (ex: `e-trans.com`):

**Backend (Railway):**
```
COOKIE_DOMAIN=.e-trans.com
```

**Frontend (Vercel):**
- Configurer le domaine personnalisé dans Vercel
- Ex: `app.e-trans.com`

Cela permettra aux cookies de fonctionner sur tous vos sous-domaines.
