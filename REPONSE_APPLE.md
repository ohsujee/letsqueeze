# Réponse Apple App Review — Gigglz v1.0
**Submission ID:** 630f6bfa-89ea-40e0-bdd8-cdb4f740e0a6
**Date:** February 2026

---

## Message à envoyer dans App Store Connect

*(Répondre en anglais dans la conversation App Review — coller le texte ci-dessous)*

---

Thank you for the detailed review. We have investigated both issues and provide the following responses.

---

### Issue 1 — Guideline 2.1 — App Tracking Transparency (ATT)

The AppTrackingTransparency permission request **is correctly implemented**, but it is intentionally delayed to provide a better user experience before asking for consent. This is an accepted practice per Apple's ATT guidelines, which state that the prompt can be shown "whenever you choose", provided no tracking data is collected before authorization is granted.

**How the prompt works:**

1. The app monitors how many full game sessions the user has completed (tracked in local storage on-device only — no data transmitted before ATT consent).
2. After the user completes **3 game sessions**, a pre-prompt screen appears explaining what data is used and why.
3. The user taps "Continue" on our custom screen, which **immediately triggers the native `ATTrackingManager.requestTrackingAuthorization()` system dialog**.
4. No IDFA or cross-app tracking data is accessed at any point before this authorization step.

**Steps to reproduce the ATT prompt during review:**

1. Install the app fresh (or clear app data to reset the counter).
2. Create or join any game room and complete a full game session (reach the end screen) — repeat **3 times**.
3. The App Tracking Transparency native dialog will appear automatically.

Alternatively, if you would like to bypass the delay for testing purposes, we can submit a build with a reduced threshold (e.g., 1 game instead of 3). Please let us know if that would be helpful.

We confirm that:
- The `NSUserTrackingUsageDescription` key is present in `Info.plist` with a clear description.
- AdMob is initialized with `requestTrackingAuthorization: true`.
- No IDFA value is read before authorization is granted (AdMob serves non-personalized ads until consent is obtained).
- The implementation uses `@capacitor-community/admob` which calls the native ATT framework.

---

### Issue 2 — Guideline 5.1.1(v) — Account Deletion

We acknowledge this issue and are submitting an updated build to address it properly.

**Current state (in the build under review):**
The app includes a "Supprimer mon compte" (Delete my account) screen located at:
*Profile → Help & Support → Delete my account*

However, we recognize two problems with this implementation:
1. The current flow sends an email request via `mailto:`, which requires a manual processing step on our end. Per Apple's guidelines, this method is only acceptable for highly-regulated industries — Gigglz does not qualify.
2. The path (Profile → Help → Delete) is not sufficiently prominent and may be difficult for reviewers to locate.

**What we are implementing in the next build:**
- A fully in-app account deletion flow using **Firebase `deleteUser()`**, which immediately and permanently deletes the user's authentication credentials and associated data from our servers.
- The "Delete my account" option will be accessible **directly from the Profile page** in a clearly labeled "Account" or "Danger zone" section — no more than 2 taps from the profile screen.
- A confirmation step will be shown before deletion (as permitted by Apple's guidelines) to prevent accidental account deletion.
- The deletion will be immediate and complete (not a deactivation).

We will submit the updated build within the next few days. We appreciate your patience and are committed to meeting Apple's guidelines fully.

---

Thank you again for the thorough review. Please don't hesitate to reach out if you need any additional clarification on either issue.

Best regards,
The Gigglz Team

---

## Notes internes (ne pas envoyer à Apple)

### Changements de code à faire avant la prochaine soumission

#### 1. Account Deletion — À REFAIRE ENTIÈREMENT

**Problème :** `mailto:` = non-conforme pour apps non-régulées.

**Solution :** Remplacer `/delete-account/page.jsx` par une vraie suppression Firebase :

```
1. Confirmation modal : "Supprimer définitivement ton compte ?"
2. Re-authentification si session > 1h (Firebase exige reauthentication avant deleteUser)
3. Supprimer données dans Realtime DB : players/, users/{uid}, etc.
4. Appeler deleteUser() sur l'objet Auth de Firebase
5. Rediriger vers /onboarding
```

**Accessibilité :** Ajouter un bouton direct depuis le profil (pas seulement via Aide).
Section "Danger" en bas de la page profil avec bouton rouge "Supprimer mon compte".

#### 2. ATT — Pas de changement de code nécessaire

L'implémentation est conforme. Si Apple revient avec une demande de test facilité,
on peut temporairement baisser le seuil à 1 partie (modifier `gamesPlayedCount >= 3` → `>= 1` dans `lib/hooks/useATTPrompt.js`).

#### 3. Ordre de priorité

1. Implémenter la vraie suppression Firebase → nouveau build iOS
2. Répondre à Apple avec le texte ci-dessus
3. Soumettre le nouveau build en référençant cet échange App Store Connect
