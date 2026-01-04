# 🔒 GUIDE DE SÉCURITÉ POUR APPLICATIONS AI-GÉNÉRÉES

> **Version**: 2.0  
> **Stack**: Next.js, React, Firebase, Stripe, WebSockets, Jeux Multijoueurs  
> **Usage**: Référence pour Claude Code lors du développement et audit

---

## 🚨 STATISTIQUES CRITIQUES À RETENIR

- **40%+** du code AI contient des failles de sécurité
- **86%** d'échec sur la prévention XSS
- **88%** d'échec sur la validation d'input
- **5-22%** des packages suggérés par AI n'existent pas (hallucination)
- **125 millions** de records exposés via Firebase mal configuré (mars 2024)

---

## 1. RÈGLES FONDAMENTALES

### Principe #1: NE JAMAIS FAIRE CONFIANCE AU CLIENT
- Toute donnée venant du client peut être falsifiée
- Toute logique côté client peut être contournée (DevTools)
- Les scores, prix, permissions doivent être calculés/vérifiés serveur

### Principe #2: VALIDER TOUTES LES ENTRÉES
- Validation SERVEUR obligatoire (client = UX seulement)
- Utiliser Zod pour typage + validation
- Valider: type, format, longueur, plage, caractères autorisés

### Principe #3: AUTHENTIFICATION ≠ AUTORISATION
- Authentifié = l'utilisateur est qui il prétend être
- Autorisé = l'utilisateur a le DROIT d'accéder à cette ressource
- Toujours vérifier les DEUX

### Principe #4: DÉFENSE EN PROFONDEUR
- Plusieurs couches de sécurité
- Si une couche échoue, les autres protègent
- Ne jamais dépendre d'un seul contrôle

---

## 2. OWASP TOP 10 (2025) - DIRECTIVES

### A01: Broken Access Control (CRITIQUE)
**Vérifier systématiquement:**
- L'utilisateur est-il authentifié?
- L'utilisateur est-il propriétaire de la ressource?
- L'utilisateur a-t-il le rôle requis?
- Utiliser des UUIDs (pas d'IDs séquentiels)
- Refuser par défaut, autoriser explicitement

### A02: Security Misconfiguration
**Vérifier:**
- Mode debug désactivé en production
- Messages d'erreur génériques (pas de stack traces)
- Headers de sécurité configurés
- CORS restrictif
- Comptes/mots de passe par défaut supprimés

### A03: Injection
**Règles:**
- Jamais de concaténation dans les requêtes
- Utiliser les requêtes paramétrées / ORM
- Échapper les sorties selon le contexte
- Jamais d'eval() ou Function() avec input utilisateur

### A04: Supply Chain
**Avant chaque npm install:**
- Vérifier que le package existe: `npm view <package>`
- Vérifier le nombre de téléchargements (< 1000/semaine = suspect)
- Vérifier les mainteneurs
- Lancer `npm audit` régulièrement

### A05: Cryptographic Failures
**Règles:**
- Mots de passe: bcrypt avec cost ≥ 12
- Chiffrement: AES-256-GCM
- Random: crypto.randomBytes() (JAMAIS Math.random())
- JAMAIS MD5 ou SHA1 pour la sécurité

### A06: Insecure Design
**Principes:**
- Threat modeling avant développement
- Le serveur décide, le client affiche
- Limiter les tentatives (OTP, login, etc.)
- Valider les prix/montants côté serveur

### A07: Authentication Failures
**Implémenter:**
- Rate limiting sur login (5 tentatives / 15 min)
- Verrouillage de compte après échecs
- Message générique "Identifiants invalides" (ne pas révéler si l'email existe)
- MFA pour les comptes sensibles
- Invalidation des sessions au changement de mot de passe

### A08: Software Integrity
**Vérifier:**
- Intégrité des packages (checksums)
- SRI pour les scripts CDN
- Pipeline CI/CD sécurisé

### A09: Logging Failures
**Logger:**
- Tentatives d'authentification (succès/échec)
- Échecs d'autorisation
- Actions admin
- Erreurs de validation

**NE JAMAIS logger:**
- Mots de passe
- Tokens/API keys
- Numéros de carte
- Données personnelles sensibles

### A10: Exceptional Conditions
**Règle d'or:** Échouer de manière sécurisée
- Par défaut: REFUSER l'accès
- En cas d'erreur: REFUSER l'accès
- Ne pas continuer sur erreur partielle

---

## 3. FIREBASE - RÈGLES CRITIQUES

### ❌ RÈGLES INTERDITES
```
allow read, write: if true;
allow read, write: if request.auth != null;  // Sans vérification d'ownership
```

### ✅ RÈGLES OBLIGATOIRES

**Pour chaque collection, vérifier:**
1. L'utilisateur est authentifié
2. L'utilisateur est propriétaire OU admin
3. Les données respectent le schéma attendu
4. Les valeurs sont dans les plages autorisées

**Fonctions helper à implémenter:**
- `isAuthenticated()`: request.auth != null
- `isOwner(userId)`: request.auth.uid == userId
- `isAdmin()`: vérifier le rôle dans /users/{uid}
- `isValidString(field, min, max)`: validation de chaîne
- `isRecentTimestamp(ts)`: timestamp dans les 5 dernières minutes

**Règles par type de donnée:**
- Profils utilisateurs: lecture/écriture par propriétaire uniquement
- Rooms de jeu: lecture par membres, écriture par host
- Scores: création validée, pas de modification/suppression
- Données publiques: lecture seule

**Tests obligatoires:**
- Tester avec Firebase Emulator avant déploiement
- Tester l'accès aux données d'autres utilisateurs
- Tester l'écriture de données invalides

---

## 4. NEXT.JS - DIRECTIVES

### Variables d'environnement
**JAMAIS `NEXT_PUBLIC_` pour:**
- Clés API secrètes
- Credentials de base de données
- Secrets JWT
- Clés Stripe secrètes

**Fichiers à .gitignore:**
- .env, .env.local, .env.*.local
- *firebase-adminsdk*.json
- serviceAccountKey.json

### API Routes - Checklist par endpoint
1. Rate limiting appliqué
2. Authentification vérifiée
3. Autorisation vérifiée (ownership/role)
4. Input validé avec Zod
5. Erreurs génériques retournées
6. Événement loggé

### Server Components
- Ne jamais passer de données sensibles aux Client Components
- Créer des DTOs avec uniquement les champs safe
- Valider les paramètres dynamiques [slug]

### Server Actions
- Re-authentifier dans chaque action
- Valider tous les inputs
- Vérifier l'ownership des ressources

---

## 5. REACT - PRÉVENTION XSS

### Vulnérabilités connues

**dangerouslySetInnerHTML:**
- Éviter autant que possible
- Si nécessaire: TOUJOURS sanitizer avec DOMPurify
- Configurer les tags/attributs autorisés

**URLs javascript::**
- React ne protège PAS contre javascript: dans href
- Valider toutes les URLs: seuls http:, https:, mailto: autorisés
- Rejeter les URLs qui ne passent pas la validation

**SSR:**
- Échapper les données injectées dans le HTML
- Attention aux balises </script> dans les données

### Règles générales
- Utiliser le binding JSX {} par défaut
- Éviter innerHTML, utiliser textContent
- Ne pas stocker de données sensibles dans localStorage
- Valider/sanitizer les paramètres d'URL

---

## 6. AUTHENTIFICATION

### Mots de passe
- Minimum 12 caractères
- Exiger complexité (majuscule, minuscule, chiffre, spécial)
- Vérifier contre les mots de passe communs
- Vérifier contre les fuites (Have I Been Pwned API)
- Hasher avec bcrypt cost ≥ 12

### Sessions
- Cookies: httpOnly, secure, sameSite=strict
- Timeout d'inactivité (30 min suggestion)
- Timeout absolu (24h suggestion)
- Régénérer l'ID de session après login
- Invalider toutes les sessions au changement de mot de passe

### Protection brute force
- Rate limit: 5 tentatives / 15 minutes
- Lockout: 30 minutes après 5 échecs
- CAPTCHA après 3 échecs
- Alerter sur patterns suspects

---

## 7. JWT - RÈGLES

### Création
- Secret fort: minimum 256 bits (32 caractères)
- Expiration courte: 15 min pour access token
- Inclure: sub, iat, exp, iss, aud

### Vérification
- TOUJOURS vérifier la signature
- Whitelist des algorithmes (JAMAIS accepter 'none')
- Valider tous les claims (exp, iss, aud)
- Vérifier si token révoqué

### Stockage
- Access token: cookie httpOnly (PAS localStorage)
- Refresh token: cookie httpOnly, path restreint
- Rotation des refresh tokens à chaque utilisation

---

## 8. UPLOAD DE FICHIERS

### Validation obligatoire
1. Extension (whitelist stricte)
2. Type MIME
3. Magic bytes (signature du fichier)
4. Taille (limite appropriée)
5. Nom de fichier (sanitizer, pas de ../)
6. Contenu (scan pour scripts embarqués dans images)

### Stockage
- HORS du webroot
- Nom de fichier aléatoire (UUID)
- Répertoire par utilisateur
- Servir via API (pas d'accès direct)

### Headers de réponse pour fichiers
- Content-Disposition: attachment
- X-Content-Type-Options: nosniff
- Content-Security-Policy: default-src 'none'

---

## 9. JEUX MULTIJOUEURS - ANTI-CHEAT

### Principe fondamental
**LE SERVEUR EST L'AUTORITÉ**
- Le client envoie des INTENTIONS
- Le serveur VALIDE et EXÉCUTE
- Le serveur CALCULE les scores
- Le serveur VÉRIFIE les réponses

### Validations serveur
- Action autorisée dans l'état actuel du jeu?
- C'est bien le tour du joueur?
- Le joueur est dans la room?
- Le timing est humainement possible? (> 100ms)
- Rate limiting par action

### Détection de triche
- Temps de réaction minimum: 100ms
- Précision suspecte: > 95% sur 20+ questions
- Temps de réponse moyen suspect: < 500ms
- Patterns de macro/bot (variance très faible)

### Ce que le client ne doit JAMAIS recevoir
- Les bonnes réponses avant validation
- Les scores d'autres joueurs en temps réel (sauf affichage)
- Les données de session d'autres joueurs

---

## 10. WEBSOCKET

### Sécurité transport
- WSS (TLS) obligatoire en production
- Timeout de connexion approprié
- Limite de taille des messages

### Authentification
- Token JWT à la connexion
- Valider le token avant d'accepter
- Gérer l'expiration du token

### Validation
- Valider le header Origin (whitelist)
- Valider chaque message (schéma)
- Rate limiter par socket (60 msg/min suggestion)

### Isolation
- Utiliser les rooms pour isoler les données
- Vérifier l'appartenance à la room avant broadcast
- Ne pas diffuser de données sensibles

---

## 11. CORS

### Configuration sécurisée
- Whitelist stricte des origines autorisées
- JAMAIS origin: '*' avec credentials
- JAMAIS refléter l'origine sans validation
- JAMAIS faire confiance à l'origine 'null'
- Validation par égalité exacte (pas regex)

### Headers à configurer
- Access-Control-Allow-Origin: origine spécifique
- Access-Control-Allow-Credentials: true si cookies
- Access-Control-Allow-Methods: limiter aux méthodes nécessaires
- Access-Control-Allow-Headers: limiter aux headers nécessaires

---

## 12. STRIPE

### Règles fondamentales
- JAMAIS manipuler les données de carte directement
- Créer les PaymentIntents côté SERVEUR
- Vérifier les montants côté SERVEUR
- Utiliser les webhooks pour confirmer les paiements

### Webhooks
- TOUJOURS vérifier la signature
- Gérer l'idempotence (éviter double traitement)
- Logger tous les événements
- Gérer les échecs gracieusement

### Secrets
- STRIPE_SECRET_KEY: serveur uniquement
- STRIPE_PUBLISHABLE_KEY: peut être exposé (NEXT_PUBLIC_)
- STRIPE_WEBHOOK_SECRET: serveur uniquement

---

## 13. HEADERS DE SÉCURITÉ

### Headers obligatoires
```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
```

### Content-Security-Policy (adapter selon besoins)
```
default-src 'self';
script-src 'self' https://js.stripe.com;
style-src 'self' 'unsafe-inline';
img-src 'self' blob: data: https://*.firebasestorage.googleapis.com;
connect-src 'self' https://*.firebaseio.com wss://*.firebaseio.com;
frame-src https://js.stripe.com;
object-src 'none';
base-uri 'self';
```

---

## 14. RATE LIMITING

### Limites suggérées
| Endpoint | Limite | Fenêtre |
|----------|--------|---------|
| Login | 5 | 15 min |
| Register | 3 | 1 heure |
| Password reset | 3 | 1 heure |
| API général | 100 | 1 min |
| File upload | 10 | 1 min |
| Game actions | 60 | 1 min |

### Réponse
- Status: 429 Too Many Requests
- Header: Retry-After: <seconds>
- Logger l'événement

---

## 15. LOGGING & MONITORING

### Événements à logger
- AUTH_SUCCESS / AUTH_FAILURE
- ACCESS_DENIED
- VALIDATION_ERROR
- RATE_LIMITED
- ADMIN_ACTION
- PAYMENT_SUCCESS / PAYMENT_FAILURE
- SUSPICIOUS_ACTIVITY

### Format recommandé
```json
{
  "timestamp": "ISO8601",
  "eventType": "string",
  "severity": "info|warning|error|critical",
  "userId": "optional",
  "ip": "string",
  "resource": "optional",
  "details": {}
}
```

### Alertes à configurer
- Multiple auth failures même IP (>5 en 5 min)
- Multiple access denied même user (>10 en 5 min)
- Événements critiques (payment failure, etc.)

---

## 16. CHECKLIST PRÉ-DÉPLOIEMENT

### Code
- [ ] Pas de secrets hardcodés
- [ ] Tous les inputs validés serveur
- [ ] Tous les endpoints authentifiés/autorisés
- [ ] Erreurs génériques (pas de stack traces)
- [ ] npm audit sans vulnérabilités high/critical

### Configuration
- [ ] Mode debug OFF
- [ ] Variables d'environnement production configurées
- [ ] Headers de sécurité actifs
- [ ] CORS restrictif
- [ ] Rate limiting actif

### Firebase
- [ ] Règles de sécurité restrictives
- [ ] Testées avec Emulator
- [ ] Pas de règles ouvertes

### Tests
- [ ] Tester accès sans auth → 401
- [ ] Tester accès données autre user → 403
- [ ] Tester inputs invalides → 400
- [ ] Tester rate limiting → 429
- [ ] Vérifier headers (securityheaders.com)

---

## 17. ANTI-PATTERNS - INTERDITS

```
❌ eval(userInput)
❌ `SELECT * FROM users WHERE id = ${userId}`
❌ allow read, write: if true
❌ NEXT_PUBLIC_SECRET_KEY=sk_live_...
❌ const API_KEY = "sk_live_abc123"
❌ res.json({ error: error.stack })
❌ crypto.createHash('md5').update(password)
❌ Math.random() pour tokens/sécurité
❌ localStorage.setItem('token', jwt)
❌ if (user.role === 'admin') // côté client seulement
❌ origin: (origin, cb) => cb(null, origin) // CORS
❌ jwt.verify(token, secret, { algorithms: ['none', 'HS256'] })
❌ fs.writeFile(req.body.filename, content)
```

---

**Rappel final:** La sécurité n'est pas une feature, c'est une exigence. Chaque ligne de code doit être sécurisée by design.