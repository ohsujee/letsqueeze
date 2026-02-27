# SECURITY ROADMAP — LetsQueeze / Gigglz

> Audit réalisé le 2026-02-27 sur la base du code source complet.
> Stack : Next.js 15 (App Router) · Firebase RTDB · Capacitor iOS/Android · Vercel

---

## Vue d'ensemble

L'app est globalement bien sécurisée : Firebase rules solides, webhook RevenueCat correctement vérifié, DOMPurify sur le HTML Alibi, endpoints dev gérés par `NODE_ENV`, données d'abonnement non-modifiables côté client.

**Aucune faille critique.** Les points ci-dessous sont classés par impact réel.

---

## 🔴 HIGH — À corriger en priorité

### H1 · SSRF sur `/api/hue/connect`

**Fichier :** `app/api/hue/connect/route.js:17`

```js
const response = await fetch(`http://${bridgeIp}/api`, ...)
```

`bridgeIp` vient du body de la requête sans aucune validation. Un attaquant peut fournir :
- `169.254.169.254` → métadonnées cloud AWS/Vercel (credentials, tokens IAM)
- `127.0.0.1:3001` → ports internes du serveur
- `10.0.0.x` → scan réseau interne

**Fix :** Valider que l'IP est dans les plages réseau local (un bridge Hue ne peut être qu'en LAN).

```js
function isPrivateIP(ip) {
  return /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(ip);
}
if (!isPrivateIP(bridgeIp)) {
  return Response.json({ error: 'Invalid bridge IP' }, { status: 400 });
}
```

**Impact fonctionnel :** Aucun. Les bridges Hue sont toujours sur LAN.

---

## 🟡 MEDIUM — À traiter rapidement

### M1 · `rooms_deeztest` absent des Firebase Rules

**Fichier :** `firebase.rules.json`

Le fichier contient les rules pour `rooms`, `rooms_alibi`, `rooms_laregle`, `rooms_blindtest`, `rooms_mime` — mais **pas `rooms_deeztest`**.

Firebase RTDB bloque tout par défaut si aucune rule ne correspond.
Risques : soit le jeu ne fonctionne pas en production (echec silencieux), soit les rules déployées sur la console Firebase sont différentes de ce fichier (désynchronisation dangereuse).

**Fix :** Vérifier les rules déployées (`firebase database:get /` ou console Firebase), puis ajouter le bloc `rooms_deeztest` dans le fichier en copiant le pattern de `rooms_blindtest` (même logique de host + party mode).

**Impact fonctionnel :** Aucun (on ne fait qu'aligner le fichier sur l'état déployé ou corriger un manque).

---

### M2 · `NEXT_PUBLIC_FOUNDER_UIDS` exposé dans le bundle

**Fichier :** `lib/admin.js:13-21`

```js
const FOUNDER_UIDS = (process.env.NEXT_PUBLIC_FOUNDER_UIDS || '')...
const FOUNDER_EMAILS = (process.env.NEXT_PUBLIC_FOUNDER_EMAILS || '')...
```

`NEXT_PUBLIC_` = inclus dans le bundle JS téléchargé par tous les utilisateurs :
1. **Privacy :** les UIDs/emails des fondateurs sont visibles dans le source
2. **Bypass UI :** `isAdmin()` est purement client-side — patchable dans DevTools pour contourner les restrictions d'affichage

**Contexte rassurant :** Les Firebase rules (`subscription.write = false`, node `admins` non-modifiable) empêchent toute escalade réelle. Le seul "gain" d'un bypass est d'accéder à des features Pro dans l'interface.

**Options :**
- **Option A (recommandée) :** Renommer en `FOUNDER_UIDS` (sans `NEXT_PUBLIC_`) + créer une API route `/api/me/tier` pour vérifier le statut founder côté serveur. Refactor non-trivial.
- **Option B (acceptable) :** Documenter explicitement que `isAdmin()` est un bypass UI uniquement, et que la vraie protection est dans Firebase rules. Accepter le risque.

**Impact fonctionnel :** Aucun si Option B choisie. Option A nécessite un refactor.

---

### M3 · Headers de sécurité manquants

**Fichier :** `next.config.mjs`

Seul `Cross-Origin-Opener-Policy` est configuré. Headers manquants :

```js
{ key: 'X-Content-Type-Options', value: 'nosniff' },
{ key: 'X-Frame-Options', value: 'DENY' },
{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
{ key: 'X-DNS-Prefetch-Control', value: 'on' },
```

Note : Vercel ajoute automatiquement `Strict-Transport-Security` en production. `X-Frame-Options: DENY` est safe pour Capacitor (WebView native ≠ iframe).

**Impact fonctionnel :** Aucun.

---

### M4 · Clé API dans l'URL (reset-leaderboards)

**Fichier :** `app/api/admin/reset-leaderboards/route.js:31`

```js
const key = searchParams.get('key');
```

Les query params apparaissent dans les logs Vercel, l'historique navigateur, les headers Referer. Préférer un header `Authorization: Bearer <key>` ou `X-Api-Key: <key>`.

**Impact fonctionnel :** Nécessite de mettre à jour le script/cron qui appelle l'endpoint.

---

## 🟢 LOW — Améliorations à planifier

### L1 · Limites de parties stockées en localStorage

**Fichier :** `lib/hooks/useGameLimits.js`

Les compteurs de parties jouées (`lq_games_played`) sont stockés en localStorage côté client. N'importe quel utilisateur peut les effacer ou les modifier dans DevTools pour réinitialiser ses compteurs.

**Contexte :** `FREE_GAMES_BEFORE_AD = 999` (désactivé temporairement), donc l'impact actuel est nul. À surveiller quand les limites seront réactivées.

**Fix futur :** Persister les compteurs dans Firebase sous `users/{uid}/dailyLimits/{date}` (protégé par les rules existantes).

---

### L2 · Proxy Deezer ouvert sans authentification

**Fichier :** `app/api/deezer/route.js`

L'endpoint `/api/deezer?endpoint=...` est accessible sans auth et sans rate limiting. N'importe qui peut l'utiliser pour proxifier des requêtes vers `api.deezer.com`.

Risques : abus de quota Deezer, mise en cache forcée de ressources coûteuses.

**Fix :** Ajouter une vérification Firebase Auth (token dans header `Authorization`) ou a minima un rate limiting par IP.

---

### L3 · `stats/globalPlayCounts` sans validation

**Fichier :** `firebase.rules.json:363-370`

```json
"stats": {
  "globalPlayCounts": {
    ".read": true,
    "$gameId": { ".write": "auth != null" }
  }
}
```

N'importe quel utilisateur authentifié peut écrire n'importe quelle valeur dans les compteurs de parties. Aucun `.validate`.

**Fix :** Ajouter une validation qui impose un incrément de 1 :
```json
".validate": "newData.isNumber() && newData.val() == (data.exists() ? data.val() + 1 : 1)"
```

---

### L4 · `unavailable_questions` sans validation

**Fichier :** `firebase.rules.json:351-355`

N'importe quel utilisateur authentifié peut marquer des questions comme indisponibles. Pas de rate limiting au niveau des rules.

**Fix :** Ajouter `.validate` pour limiter la taille des données écrites.

---

### L5 · `debug_logs` writable par tout utilisateur auth

**Fichier :** `firebase.rules.json:357-361`

N'importe quel utilisateur authentifié peut écrire dans `debug_logs`. Risque de spam/flooding des logs.

**Fix :** Ajouter `.validate` pour limiter la taille et la fréquence (ou restreindre aux admins si les logs ne sont plus nécessaires en production).

---

### L6 · Fuite `err.message` dans Wordle check

**Fichier :** `app/api/daily/wordle/check/route.js:89`

```js
return Response.json({ error: err.message }, { status: 500 });
```

Les messages d'erreur internes peuvent révéler des informations sur la structure du serveur.

**Fix :** Remplacer par un message générique :
```js
return Response.json({ error: 'Erreur serveur' }, { status: 500 });
```

---

### L7 · RevenueCat GET endpoint expose la config

**Fichier :** `app/api/webhooks/revenuecat/route.js:290-298`

```js
return NextResponse.json({
  webhookSecretConfigured: !!REVENUECAT_WEBHOOK_SECRET,
  firebaseAdminReady: !!app,
});
```

Révèle si des secrets sont configurés (aide à la reconnaissance). Impact faible mais inutile.

**Fix :** Supprimer les champs `webhookSecretConfigured` et `firebaseAdminReady` de la réponse GET.

---

### L8 · Aucun middleware Next.js — auth 100% client-side

L'app n'a pas de `middleware.js` pour protéger les routes côté serveur. Toute la protection auth est dans `useAuthProtect` (client-side).

**Conséquences :** Les pages protégées sont accessibles côté serveur, et les bots/crawlers peuvent télécharger le HTML de pages "privées" (même si les données Firebase ne sont pas accessibles sans auth).

**Fix :** Ajouter un `middleware.js` minimal pour rediriger les requêtes non-authentifiées sur les routes sensibles. Complexité modérée avec Firebase Auth (nécessite de lire le cookie de session).

**Priorité :** Basse pour une app mobile-first où le SEO des pages internes n'est pas un enjeu.

---

## ✅ Points déjà bien sécurisés

| Point | Fichier |
|-------|---------|
| Endpoints dev gérés par `NODE_ENV` | `app/api/dev/*` |
| Webhook RevenueCat avec secret obligatoire | `app/api/webhooks/revenuecat/route.js` |
| `subscription.write = false` côté client | `firebase.rules.json` |
| DOMPurify + allowlist stricte pour HTML Alibi | `app/alibi/game/[code]/prep/page.jsx` |
| Réponse Wordle calculée côté serveur | `app/api/daily/wordle/check/route.js` |
| Auth requise pour toutes les rooms | `firebase.rules.json` |
| Ownership vérifié sur toutes les écritures | `firebase.rules.json` |
| `.env*.local` dans `.gitignore` | `.gitignore` |
| Service account Firebase hors git | `.gitignore` |
| Node `admins` non-modifiable par les clients | `firebase.rules.json` |
| Validation format date sur les endpoints daily | `app/api/daily/*/route.js` |
| Abonnement Pro vérifiable uniquement via Admin SDK | `app/api/webhooks/revenuecat/route.js` |
| `validate` sur Alibi answers (max 500 chars) | `firebase.rules.json:153` |
| `validate` sur leaderboard daily (champs + types) | `firebase.rules.json:390,405` |

---

## Plan d'action

| # | Action | Effort | Impact | Statut |
|---|--------|--------|--------|--------|
| H1 | Fix SSRF `hue/connect` — valider IP LAN | 10 min | 🔴 Élimine faille haute | ✅ 2026-02-27 |
| M1 | Ajouter rules `rooms_deeztest` dans firebase.rules.json | 20 min | 🟡 Sync + sécurité | ✅ 2026-02-27 |
| M3 | Ajouter headers sécurité dans `next.config.mjs` | 10 min | 🟡 Hardening standard | ✅ 2026-02-27 |
| M4 | `reset-leaderboards` : passer la clé en header `x-api-key` | 15 min | 🟡 Bonne pratique | ✅ 2026-02-27 |
| L3 | Ajouter `.validate` sur `globalPlayCounts` | 5 min | 🟢 Anti-abus stats | ✅ 2026-02-27 |
| L6 | Masquer `err.message` dans wordle/check | 2 min | 🟢 Info leak | ✅ 2026-02-27 |
| L7 | Supprimer champs debug du GET RevenueCat | 2 min | 🟢 Info leak | ✅ 2026-02-27 |
| M2 | Migrer FOUNDER_UIDS hors NEXT_PUBLIC_ | Variable | 🟡 Privacy | 🔄 À évaluer |
| L1 | Persister game limits dans Firebase | 1-2h | 🟢 Anti-triche futur | 🔄 Quand limites réactivées |
| L2 | Authentifier le proxy Deezer | 30 min | 🟢 Anti-abus | 🔄 Si abus constaté |
| L8 | Ajouter `middleware.js` Next.js | 2-3h | 🟢 Hardening SSR | 🔄 Basse priorité |
