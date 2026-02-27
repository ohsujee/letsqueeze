# Roadmap — Système de Push Notifications Gigglz

> État actuel : infrastructure Firebase présente (GCM activé, firebase-admin installé) mais **rien d'implémenté**.

---

## PHASE 0 — Prérequis (hors code, ~1h)

### Apple
- [ ] Créer une **APNs Key** sur [developer.apple.com](https://developer.apple.com) → Certificates, Identifiers & Profiles → Keys
- [ ] Uploader la clé dans **Firebase Console** → Project Settings → Cloud Messaging → Apple app configuration
- [ ] Activer la capability **Push Notifications** dans le projet Xcode (`ios/App/App.xcodeproj`)
- [ ] Activer **Background Modes → Remote notifications** dans Xcode

### Google
- [ ] Vérifier que le fichier `google-services.json` est à jour (normalement ok)
- [ ] Récupérer la **Server Key** FCM dans Firebase Console → Project Settings → Cloud Messaging → Server key (pour les tests manuels)

### Firebase Console
- [ ] Créer la collection Realtime Database `users/{uid}/fcmTokens` (structure à définir)

---

## PHASE 1 — App : Token & Permission (~2-3h)

### 1.1 Installation
```bash
npm install @capacitor/push-notifications
npx cap sync
```

### 1.2 Hook `usePushNotifications.js`
Créer `lib/hooks/usePushNotifications.js` :
- Demander la permission au premier lancement (après onboarding, pas au démarrage brutal)
- Récupérer le **FCM token** de l'appareil
- Sauvegarder le token dans Firebase : `users/{uid}/fcmToken` + `users/{uid}/fcmTokenUpdatedAt`
- Gérer le **refresh** du token (FCM peut en générer un nouveau)
- Gérer la **réception en foreground** (afficher une toast/banner in-app)
- Gérer le **tap sur la notif** → router vers la bonne page

### 1.3 Intégration
- Appeler le hook dans le layout principal (`app/layout.jsx`) une fois l'user connecté
- **Ne pas demander la permission** si l'user est guest

### 1.4 Fichiers natifs à modifier
**iOS** — `AppDelegate.swift` :
- Ajouter `UNUserNotificationCenterDelegate`
- Enregistrer pour les remote notifications

**Android** — `AndroidManifest.xml` :
- Ajouter `FirebaseMessagingService`
- Créer `android/app/src/main/java/.../MyFirebaseMessagingService.kt`

---

## PHASE 2 — Backend : API d'envoi (~2h)

### 2.1 Firebase Admin — `lib/firebase-admin.js` (Punkrecords)
Ajouter `getMessaging()` au module existant.

### 2.2 Endpoint `POST /api/notifications/send`
Paramètres :
```json
{
  "target": "all" | "uid" | "topic",
  "uid": "optionnel si target=uid",
  "topic": "optionnel si target=topic",
  "title": "Titre de la notif",
  "body": "Corps du message",
  "data": { "route": "/daily/semantique" }
}
```
Logique :
- `target: "all"` → envoyer sur le topic `all_users` (ou récupérer tous les tokens)
- `target: "uid"` → récupérer `users/{uid}/fcmToken` et envoyer
- `target: "topic"` → envoyer sur le topic FCM (ex: `daily_semantique`)

### 2.3 Abonnement aux topics (côté app)
Quand l'user joue à un jeu, l'abonner au topic correspondant :
- `daily_semantique` → joueurs Sémantique
- `daily_all` → tous les joueurs daily
- `all_users` → tous les users

---

## PHASE 3 — Punkrecords : Dashboard Notifications (~3-4h)

### 3.1 Page `/notifications`
Interface avec 3 onglets :

**Onglet "Envoyer"**
- Champ titre + corps
- Sélecteur cible : Tous / Par jeu / User spécifique
- Champ optionnel : route de destination (deep link)
- Bouton **Envoyer maintenant** ou **Planifier**

**Onglet "Schedules"**
- Liste des notifications programmées (cron)
- Créer / modifier / supprimer un schedule
- Templates pré-définis (voir Phase 4)

**Onglet "Historique"**
- Log des notifs envoyées (date, cible, taux d'ouverture si dispo)

### 3.2 Stockage des schedules
Dans Firebase ou dans un fichier JSON sur le VPS :
```json
{
  "id": "daily_semantique",
  "cron": "0 8 * * *",
  "title": "Le mot du jour est arrivé ! 🐧",
  "body": "Sauras-tu trouver le mot mystère d'aujourd'hui ?",
  "target": "topic",
  "topic": "daily_semantique",
  "data": { "route": "/daily/semantique" },
  "enabled": true
}
```

---

## PHASE 4 — Automatisations / Schedules (~1-2h)

### Templates de notifications planifiées

| ID | Cron | Cible | Message | Route |
|----|------|-------|---------|-------|
| `daily_semantique` | `0 8 * * *` | topic: daily_semantique | "Le mot du jour est arrivé !" | `/daily/semantique` |
| `daily_semantique_soir` | `0 19 * * *` | topic: daily_semantique | "T'as pas encore trouvé le mot du jour 👀" | `/daily/semantique` |
| `weekly_recap` | `0 10 * * 1` | all_users | "Ton recap de la semaine sur Gigglz 📊" | `/home` |

### Implémentation cron sur VPS
- Utiliser `node-cron` dans un process Node dédié sur le VPS
- Ou via `systemd timer` + script Node
- Le scheduler appelle l'endpoint `/api/notifications/send` en interne

---

## PHASE 5 — Tests & Validation (~1h)

- [ ] Test token récupéré sur iOS simulateur + device réel
- [ ] Test token récupéré sur Android émulateur + device réel
- [ ] Test envoi depuis dashboard Punkrecords → notif reçue en background
- [ ] Test tap sur notif → deep link vers la bonne page
- [ ] Test notif en foreground (banner in-app)
- [ ] Test schedule daily → notif reçue à l'heure

---

## Ordre d'exécution recommandé

```
Phase 0 (prérequis Apple/Google)
    ↓
Phase 1 (app : token + permission)
    ↓
Phase 2 (backend : API envoi)
    ↓
Phase 3 (Punkrecords : dashboard)
    ↓
Phase 4 (schedules automatiques)
    ↓
Phase 5 (tests)
```

---

## Points d'attention

- **iOS simulator** ne reçoit pas les vraies push notifs → tester sur device physique
- **Token refresh** : FCM peut changer le token, toujours écraser l'ancien en base
- **Guests** : ne jamais demander la permission ni stocker de token pour les users non connectés
- **Double opt-in** : demander la permission au bon moment (pas au premier lancement), idéalement après que l'user a eu une bonne expérience (ex: après sa première partie)
- **RGPD** : les tokens FCM sont des données personnelles → mentionner dans la privacy policy

---

*Créé le 2026-02-27*
