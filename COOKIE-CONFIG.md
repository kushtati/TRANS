# Configuration des Cookies pour Multi-Appareils

## Problème
Les données ne s'affichent pas lorsqu'on utilise un autre appareil car les cookies d'authentification ne sont pas partagés correctement entre les appareils.

## Solution

### 1. Variables d'environnement Railway (Backend)

Ajouter ces variables dans Railway:

```bash
# URL du frontend (déjà configuré normalement)
FRONTEND_URL=https://trans-delta-kohl.vercel.app

# Domaine des cookies - IMPORTANT pour multi-appareils
COOKIE_DOMAIN=.railway.app
# OU si vous avez un domaine personnalisé:
# COOKIE_DOMAIN=.votre-domaine.com

# S'assurer que NODE_ENV est en production
NODE_ENV=production
```

### 2. Variables d'environnement Vercel (Frontend)

```bash
# URL du backend Railway
VITE_API_URL=https://trans-production-3b2c.up.railway.app/api
```

## Comment ça fonctionne

### Avant (Ne fonctionnait pas entre appareils)
- Les cookies étaient créés sans domaine spécifique
- Chaque appareil avait sa propre session isolée
- Les cookies n'étaient pas partagés

### Après (Fonctionne entre appareils)
- Les cookies sont créés avec `domain: .railway.app` (ou votre domaine)
- Les cookies sont partagés entre tous les sous-domaines
- L'authentification persiste sur tous les appareils connectés au même compte

## Configuration des cookies

Le code utilise maintenant:

```typescript
{
  httpOnly: true,           // Sécurité - pas accessible en JS
  secure: true,             // HTTPS uniquement en production
  sameSite: 'none',         // Permet cross-origin
  domain: env.COOKIE_DOMAIN,// Partage entre sous-domaines
  path: '/',                // Disponible sur tout le site
  maxAge: 15 * 60 * 1000    // 15 minutes (access token)
  // ou 7 jours (refresh token)
}
```

## Test

1. Se connecter sur le premier appareil (ex: PC)
2. Ouvrir le même site sur un autre appareil (ex: téléphone)
3. Se connecter avec le même compte
4. Les données devraient maintenant s'afficher correctement

## Important

- Les deux appareils doivent utiliser **le même domaine** (ex: trans-delta-kohl.vercel.app)
- Ne pas mélanger `http` et `https`
- Le refresh token permet de rester connecté 7 jours
- Si vous déconnectez sur un appareil, cela ne déconnecte pas les autres (sessions indépendantes)

## Domaine personnalisé (Optionnel)

Si vous utilisez un domaine personnalisé comme `e-trans.com`:

**Railway:**
```bash
COOKIE_DOMAIN=.e-trans.com
FRONTEND_URL=https://app.e-trans.com
```

**Vercel:**
```bash
VITE_API_URL=https://api.e-trans.com/api
```

Cela permettra aux cookies de fonctionner sur `app.e-trans.com`, `www.e-trans.com`, etc.
