# 🔧 Configuration Vercel - URGENTE

## ⚠️ Problème identifié

**Le frontend ne peut pas communiquer avec le backend car `VITE_API_URL` n'est pas configuré sur Vercel.**

Actuellement, le code utilise:
```typescript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
```

Sur Vercel, `VITE_API_URL` est `undefined` → utilise `localhost:5000` → **NE FONCTIONNE PAS** ❌

## ✅ Solution immédiate

### 1. Aller sur Vercel Dashboard
🌐 https://vercel.com/dashboard

### 2. Sélectionner le projet
- Cliquer sur **trans-delta-kohl** (ou votre nom de projet)

### 3. Aller dans Settings → Environment Variables

- Cliquer sur **"Settings"** dans le menu
- Cliquer sur **"Environment Variables"** dans le sous-menu

### 4. Ajouter la variable

Cliquer sur **"Add New"** et remplir:

```
Name:  VITE_API_URL
Value: https://trans-production-3b2c.up.railway.app/api
```

**Environnements à sélectionner:**
- ✅ Production
- ✅ Preview  
- ✅ Development

### 5. Redéployer

Après avoir ajouté la variable:
1. Aller dans l'onglet **"Deployments"**
2. Cliquer sur les **3 points (...)** du dernier déploiement
3. Cliquer sur **"Redeploy"**
4. Confirmer le redéploiement

## ⏱️ Temps d'attente

- Le redéploiement prend **30-60 secondes**
- Attendez que le status soit **"Ready"** (vert)
- Rafraîchissez votre navigateur avec **Ctrl+F5** (vider le cache)

## 🧪 Test après configuration

1. **Ouvrir** https://trans-delta-kohl.vercel.app
2. **Ouvrir la console** (F12)
3. **Vérifier** que les appels API vont vers `trans-production-3b2c.up.railway.app`
4. **Se connecter** - Les données devraient maintenant s'afficher ✅

## 🔍 Vérification dans la console

Avant le fix (console devrait montrer):
```
❌ GET http://localhost:5000/api/auth/me (Failed to fetch)
❌ GET http://localhost:5000/api/shipments/stats (Failed to fetch)
```

Après le fix (console devrait montrer):
```
✅ GET https://trans-production-3b2c.up.railway.app/api/auth/me (200 OK)
✅ GET https://trans-production-3b2c.up.railway.app/api/shipments/stats (200 OK)
```

## 📋 Récapitulatif des variables Vercel nécessaires

| Variable | Valeur | Status |
|----------|--------|--------|
| `VITE_API_URL` | `https://trans-production-3b2c.up.railway.app/api` | ⚠️ **À CONFIGURER** |

## 🔐 Variables Railway (déjà configuré)

| Variable | Valeur | Status |
|----------|--------|--------|
| `COOKIE_DOMAIN` | `.railway.app` | ✅ Configuré |
| `FRONTEND_URL` | `https://trans-delta-kohl.vercel.app` | ✅ Configuré |
| `NODE_ENV` | `production` | ✅ Configuré |

## 🎯 Résultat attendu

**Après avoir configuré `VITE_API_URL` et redéployé:**

✅ Les appels API fonctionnent  
✅ L'authentification fonctionne  
✅ Les données s'affichent sur tous les appareils  
✅ Les cookies sont partagés correctement

## 🆘 En cas de problème persistant

Si après avoir configuré `VITE_API_URL` les données ne s'affichent toujours pas:

1. **Vider complètement le cache:**
   ```
   Chrome: Ctrl+Shift+Del → "Tout" → Supprimer
   Safari: Préférences → Confidentialité → Tout supprimer
   ```

2. **Ouvrir en navigation privée** pour tester sans cache

3. **Vérifier les logs Railway:**
   - Railway Dashboard → Votre projet
   - Onglet "Logs"
   - Vérifier qu'il n'y a pas d'erreurs CORS ou d'authentification

4. **Me contacter** avec les erreurs de la console (F12)
