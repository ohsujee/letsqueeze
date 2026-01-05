# AUDIT DE SECURITE - LetsQueeze

> **Date**: 2026-01-04
> **Version**: 1.0
> **Stack**: Next.js 16, React 19, Firebase Realtime Database, RevenueCat, Spotify API
> **Reference**: security.md v2.0

---

## RESUME EXECUTIF

### Niveau de Risque Global: CRITIQUE

L'application LetsQueeze presente **plusieurs vulnerabilites critiques** qui doivent etre corrigees avant tout deploiement en production. Les principaux problemes identifies sont:

1. **Secrets exposes** dans le depot git (.env.local)
2. **Absence totale de headers de securite**
3. **Validation client-side uniquement** pour les operations critiques
4. **Regles Firebase avec failles** permettant la manipulation de donnees
5. **Pas de rate limiting** sur les actions de jeu

---

## 1. FIREBASE - REGLES DE SECURITE

### Status: CRITIQUE

| Probleme | Severite | Fichier | Ligne |
|----------|----------|---------|-------|
| Lecture root trop permissive | HIGH | firebase.rules.json | 3 |
| Ecriture answers sans ownership | CRITICAL | firebase.rules.json | 113 |
| Validation buzz faible | MEDIUM | firebase.rules.json | 140 |
| Admin non verifie server-side | MEDIUM | firebase.rules.json | Multi |

### Problemes Detectes

#### 1.1 Acces en lecture trop large
```json
".read": "auth != null"  // Ligne 3
```
**Risque**: Tout utilisateur authentifie peut lire TOUTES les donnees a la racine.

#### 1.2 Ecriture sans verification d'ownership (CRITIQUE)
```json
"answers": {
  ".read": "auth != null",
  ".write": "auth != null"  // TOUT LE MONDE peut ecrire!
}
```
**Risque**: N'importe quel joueur peut modifier les reponses des autres dans le jeu Alibi.

#### 1.3 Validation buzz incomplete
```json
"buzz": {
  ".validate": "newData.hasChildren(['uid','at'])"
}
```
**Risque**: Pas de verification que `uid` correspond a `auth.uid` - usurpation possible.

### Recommandations Firebase
1. Restreindre `.read` a la racine par collection
2. Ajouter verification ownership sur `answers`: `auth.uid == $uid`
3. Valider `buzz.uid == auth.uid`
4. Implementer Firebase Cloud Functions pour operations critiques

---

## 2. VARIABLES D'ENVIRONNEMENT & SECRETS

### Status: CRITIQUE

| Secret | Expose | Fichier | Impact |
|--------|--------|---------|--------|
| Spotify Client Secret | OUI | .env.local | Acces API Spotify |
| Firebase API Key | OUI | .env.local | Config client (normal) |
| Firebase API Key | OUI | scripts/seed-pack.mjs | Hardcode! |
| Admin Email | OUI | lib/admin.js | Information leak |
| Admin UID | OUI | lib/admin.js | Cible d'attaque |

### Secrets Exposes

#### 2.1 .env.local dans le depot
```bash
SPOTIFY_CLIENT_SECRET=xxxxxxxxxxxx  # CRITIQUE! (valeur masquée)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAE0ef6GaqSHHfZieU9-KyhCIv4UwfBV5o
```

#### 2.2 Credentials admin hardcodes
```javascript
// lib/admin.js
const ADMIN_UIDS = ['Xjzwibrz2mRDLCNUCwWkjrkK8LS2'];
const ADMIN_EMAILS = ['yogarajah.sujeevan@gmail.com'];
```

### Actions Immediates
1. **REVOQUER** le Spotify Client Secret immediatement
2. Supprimer .env.local de l'historique git:
   ```bash
   git rm --cached .env.local
   git filter-branch --force --index-filter "git rm --cached --ignore-unmatch .env.local" HEAD
   ```
3. Deplacer admins vers Firebase Custom Claims
4. Supprimer credentials de seed-pack.mjs

---

## 3. AUTHENTIFICATION & AUTORISATION

### Status: CRITIQUE

| Probleme | Severite | Localisation |
|----------|----------|--------------|
| Autorisation client-side seulement | CRITICAL | app/game/[code]/host |
| updateUserStats sans auth check | CRITICAL | lib/userProfile.js |
| gameResult non valide | CRITICAL | lib/userProfile.js |
| Tokens Spotify en localStorage | HIGH | lib/spotify/auth.js |
| Pas de session timeout | MEDIUM | lib/firebase.js |

### Problemes Critiques

#### 3.1 Autorisation uniquement cote client
```javascript
// app/game/[code]/host/page.jsx
const isHost = meta?.hostUid === auth.currentUser?.uid;
// Ce check est purement cosmétique!
```
**Risque**: Un joueur peut contourner cette verification et modifier le state du jeu.

#### 3.2 Mise a jour stats sans verification
```javascript
// lib/userProfile.js
export async function updateUserStats(uid, gameResult) {
  if (!uid) return;
  // AUCUNE verification que uid == auth.currentUser.uid!
  // AUCUNE validation de gameResult!
}
```
**Risque**: Manipulation de XP/scores pour n'importe quel utilisateur.

#### 3.3 Tokens OAuth en localStorage
```javascript
// lib/spotify/auth.js
localStorage.setItem('spotify_access_token', tokens.access_token);
localStorage.setItem('spotify_refresh_token', tokens.refresh_token);
```
**Risque**: Vol de tokens via attaque XSS.

### Recommandations Auth
1. Implementer validation server-side pour toutes les operations critiques
2. Verifier `auth.currentUser.uid === uid` dans updateUserStats
3. Migrer tokens vers httpOnly cookies
4. Ajouter session timeout (30 min inactivite)

---

## 4. XSS (Cross-Site Scripting)

### Status: BON avec ameliorations

| Aspect | Status | Notes |
|--------|--------|-------|
| dangerouslySetInnerHTML | OK | Non utilise |
| innerHTML | OK | Non utilise |
| DOMPurify | INSTALLE | Utilise dans Alibi |
| localStorage sensible | ATTENTION | Tokens Spotify |
| URLs dynamiques | OK | Hardcoded URLs |

### Points Positifs
- DOMPurify v3.3.0 installe et utilise correctement
- Pas d'injection HTML dangereuse
- React echappe automatiquement le contenu texte
- URLs href toutes hardcodees

### Points d'Attention
```javascript
// lib/hue-module - credentials bridges en localStorage
localStorage.setItem('hue_event_configs', JSON.stringify(configs));
```
**Recommandation**: Chiffrer les donnees sensibles avant stockage local.

---

## 5. ANTI-CHEAT MULTIJOUEUR

### Status: FAIBLE

| Mecanisme | Implemente | Notes |
|-----------|------------|-------|
| Scores cote serveur | PARTIEL | Host calcule, pas de validation |
| Validation reponses | NON | Manuelle par host seulement |
| Timing server-side | PARTIEL | Offset calcule mais manipulable |
| Rate limiting actions | NON | Aucun |
| Detection bots | NON | Aucun |

### Vulnerabilites Jeu

#### 5.1 Validation manuelle des reponses
```javascript
// app/game/[code]/host/page.jsx
// Le host voit q.answer et clique "Correct" ou "Faux"
// AUCUNE validation automatique!
```
**Risque**: Host corrompu peut attribuer points incorrectement.

#### 5.2 Reponses visibles avant validation
```javascript
<span className="buzz-answer-value">{q.answer}</span>
```
**Risque**: Joueurs peuvent intercepter les reponses via DevTools ou reseau.

#### 5.3 Pas de rate limiting
- Buzzer peut etre spamme (protege par transaction mais pas rate limit)
- Soumissions reponses illimitees
- Pas de throttling Firebase

### Recommandations Anti-Cheat
1. Implementer validation automatique des reponses server-side
2. Ne pas envoyer `q.answer` aux clients avant validation
3. Ajouter rate limit: max 1 action/500ms
4. Logger toutes modifications de score
5. Detecter patterns suspects (temps reponse < 100ms)

---

## 6. HEADERS DE SECURITE

### Status: INEXISTANT

| Header | Requis | Implemente |
|--------|--------|------------|
| Strict-Transport-Security | OUI | NON |
| X-Content-Type-Options | OUI | NON |
| X-Frame-Options | OUI | NON |
| Content-Security-Policy | OUI | NON |
| Referrer-Policy | OUI | NON |
| Permissions-Policy | OUI | NON |

### Configuration Actuelle
```javascript
// next.config.ts - AUCUN header configure!
const nextConfig: NextConfig = {
  reactStrictMode: true,
};
```

### Configuration Recommandee
```javascript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' https://sdk.scdn.co; connect-src 'self' https://*.firebaseio.com wss://*.firebaseio.com https://api.spotify.com; img-src 'self' blob: data: https://*.scdn.co https://*.spotifycdn.com; style-src 'self' 'unsafe-inline';"
          }
        ]
      }
    ];
  }
};
```

---

## 7. PAIEMENTS (RevenueCat)

### Status: CRITIQUE

| Probleme | Severite | Impact |
|----------|----------|--------|
| Statut Pro ecrit client-side | CRITICAL | Abonnement gratuit |
| Prix hardcodes client-side | HIGH | Manipulation prix |
| Pas de webhook verification | CRITICAL | Paiements non valides |
| Expiration manipulable | CRITICAL | Pro permanent |

### Vulnerabilites Paiement

#### 7.1 Client ecrit statut Pro directement
```javascript
// app/subscribe/page.jsx
await update(ref(db, `users/${user.uid}`), {
  subscription: {
    tier: 'pro',
    provider: 'revenuecat',
    expiresAt: expiresAt ? new Date(expiresAt).getTime() : Date.now() + 365 * 24 * 60 * 60 * 1000
  }
});
```
**Risque**: Un utilisateur peut s'attribuer le statut Pro sans payer.

#### 7.2 Pas de validation server-side
- Aucun endpoint API pour valider les paiements
- Aucun webhook RevenueCat configure
- Response SDK trust aveugle

### Recommandations Paiements
1. Creer `/api/webhooks/revenuecat` avec signature verification
2. Ne JAMAIS ecrire subscription depuis le client
3. Valider cote serveur avant d'accorder Pro
4. Logger tous les evenements de paiement

---

## 8. RATE LIMITING

### Status: INEXISTANT

| Endpoint/Action | Rate Limit | Recommande |
|-----------------|------------|------------|
| Login Firebase | AUCUN | 5/15min |
| Join Room | AUCUN | 10/min |
| Buzz/Answer | AUCUN | 60/min |
| Create Room | AUCUN | 5/heure |
| API Spotify | AUCUN | 100/min |

### Impact
- Attaques brute force possibles
- Spam de rooms/buzzes
- Cout Firebase eleve
- DoS sur endpoints

### Implementation Recommandee
```javascript
// middleware.ts
import { Ratelimit } from '@upstash/ratelimit';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});
```

---

## 9. OWASP TOP 10 - CONFORMITE

| Vulnerabilite OWASP | Status | Notes |
|---------------------|--------|-------|
| A01: Broken Access Control | ECHEC | Client-side auth only |
| A02: Cryptographic Failures | PARTIEL | Tokens en localStorage |
| A03: Injection | OK | Firebase SDK protege |
| A04: Insecure Design | ECHEC | Pas de server validation |
| A05: Security Misconfiguration | ECHEC | Pas de headers |
| A06: Vulnerable Components | A VERIFIER | npm audit requis |
| A07: Auth Failures | PARTIEL | Pas de rate limit |
| A08: Software Integrity | A VERIFIER | Pas de SRI |
| A09: Logging Failures | ECHEC | Logging minimal |
| A10: SSRF | N/A | Pas d'appels server |

---

## 10. CHECKLIST PRE-DEPLOIEMENT

### Code
- [ ] Pas de secrets hardcodes
- [ ] Tous les inputs valides serveur
- [ ] Tous les endpoints authentifies/autorises
- [ ] Erreurs generiques (pas de stack traces)
- [ ] npm audit sans vulnerabilites high/critical

### Configuration
- [ ] Mode debug OFF
- [ ] Variables d'environnement production configurees
- [ ] Headers de securite actifs
- [ ] CORS restrictif
- [ ] Rate limiting actif

### Firebase
- [ ] Regles de securite restrictives
- [ ] Testees avec Emulator
- [ ] Pas de regles ouvertes

### Tests
- [ ] Tester acces sans auth -> 401
- [ ] Tester acces donnees autre user -> 403
- [ ] Tester inputs invalides -> 400
- [ ] Tester rate limiting -> 429
- [ ] Verifier headers (securityheaders.com)

---

## ACTIONS PRIORITAIRES

### IMMEDIAT (Avant tout deploiement)
1. Revoquer et regenerer Spotify Client Secret
2. Supprimer .env.local de l'historique git
3. Corriger regles Firebase `rooms_alibi/answers`
4. Implementer headers de securite dans next.config

### COURT TERME (Sprint suivant)
5. Creer API server-side pour validation scores
6. Implementer webhook RevenueCat
7. Migrer tokens Spotify vers httpOnly cookies
8. Ajouter rate limiting sur actions critiques

### MOYEN TERME (Prochain trimestre)
9. Implementer validation automatique des reponses
10. Ajouter audit logging complet
11. Tests de penetration
12. Revue Firebase rules avec Emulator

---

## RESSOURCES

- [security.md](./security.md) - Guide de securite interne
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [OWASP Top 10](https://owasp.org/Top10/)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)

---

**Audit realise avec Claude Code**
**Derniere mise a jour**: 2026-01-04
