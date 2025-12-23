# 🎮 Gigglz - Plan d'Améliorations

## 📊 État des Lieux

### ✅ Ce qui Marche Bien
- **Buzzer ultra-rapide** : <10ms de latence (meilleur que Kahoot)
- **Mode Alibi unique** : Aucun concurrent n'a ce type de jeu
- **Design moderne 2025** : Glassmorphisme, gradients, animations fluides
- **Code solide** : Next.js 15 + React 19, architecture propre
- **Contenu riche** : 11 quiz + 18 scénarios alibi

### ❌ Ce qui Manque (Critique)
- **Pas d'authentification fonctionnelle** → Impossible de retenir les joueurs
- **Freemium codé mais pas activé** → 0€ de revenus
- **Pas d'analytics** → On vole à l'aveugle
- **Pas de gamification** → Aucune raison de revenir demain
- **Onboarding cassé** → Nouveaux joueurs perdus

---

## 🎯 PRIORITÉ 1 : Rendre le Jeu Viable

### 🔐 1. Système d'Authentification Complet

**Problème** :
- `app/login/page.jsx` est vide
- Google Sign-In codé mais jamais utilisé
- Tous les utilisateurs sont anonymes

**Solution** :
- Créer page de login avec :
  - Bouton "Connexion avec Google"
  - Formulaire Email/Password
  - Option "Continuer en invité"
- Créer schéma utilisateurs dans Firebase :
  ```
  users/{uid}/
    ├─ profile {name, avatar, createdAt}
    ├─ stats {gamesPlayed, wins, totalScore, level, xp}
    └─ subscription {tier: "free"|"pro", expiresAt}
  ```
- Rediriger vers login si non connecté

**Fichiers à modifier** :
- `app/login/page.jsx` (à créer complètement)
- `app/home/page.jsx` (vérifier auth)
- `lib/firebase.js` (activer signInWithGoogle)

---

### 💰 2. Activer le Paywall Freemium

**Problème** :
- Logique complète dans `lib/subscription.js` mais jamais utilisée
- Tous les utilisateurs accèdent à tout gratuitement

**Solution** :
- Vérifier `canAccessPack()` avant de lancer un jeu
- Créer modal Paywall :
  - "🔒 Contenu Premium"
  - "Débloque 8 quiz supplémentaires avec Pro"
  - Bouton "Passer à Pro - 5.99€/mois"
- Afficher badges "PRO" sur packs verrouillés
- Intégrer RevenueCat ou Stripe pour paiements

**Fichiers à modifier** :
- `app/room/[code]/page.jsx:99` (ajouter check)
- `app/alibi/room/[code]/page.jsx` (ajouter check)
- `components/PaywallModal.jsx` (à créer)
- `app/home/page.jsx` (afficher badges Pro)

---

### 📊 3. Implémenter Analytics

**Problème** :
- Firebase Analytics configuré mais 0 événements trackés
- Impossible de savoir ce qui marche ou pas

**Solution** :
- Tracker les événements clés :
  - `game_started` : Mode, pack, nombre de joueurs
  - `game_completed` : Score, durée, gagnant
  - `paywall_shown` : Quel pack, conversion ou non
  - `user_signup` : Méthode (Google, Email, Anonymous)
  - `room_created` : Mode, code
  - `room_joined` : Code, rôle (host/player/spectator)

**Fichiers à modifier** :
- `app/game/[code]/host/page.jsx` (track start + end)
- `app/alibi/game/[code]/play/page.jsx` (track start + end)
- `app/login/page.jsx` (track signups)
- `components/PaywallModal.jsx` (track impressions + conversions)

---

## 🎯 PRIORITÉ 2 : Rétention & Engagement

### 🏆 4. Système de Gamification

**Problème** :
- Aucune progression persistante
- Pas de raison de revenir jouer demain

**Solution Niveau 1 - XP & Niveaux** :
- Gagner XP à chaque partie :
  - Participation : +50 XP
  - Victoire : +100 XP bonus
  - Quiz parfait : +50 XP bonus
- Système de niveaux : 1 à 50
  - Niveau 1 = 0 XP
  - Niveau 2 = 100 XP
  - Niveau 50 = 50,000 XP
- Afficher niveau + barre de progression sur home
- Icône niveau à côté du nom en jeu

**Solution Niveau 2 - Badges** :
- 20 badges à débloquer :
  - 🎮 "Première victoire"
  - 🔥 "10 victoires consécutives"
  - ⚡ "Buzz en moins de 2 secondes"
  - 🎯 "Quiz parfait (100%)"
  - 🕵️ "Alibi : Démasque 10 menteurs"
  - 📅 "Joue 7 jours d'affilée"
  - 👑 "Atteins niveau 50"
  - etc.
- Galerie de badges sur profil
- Notification popup quand badge débloqué

**Solution Niveau 3 - Daily Challenges** :
- 1 challenge par jour :
  - "Gagne 3 quiz en mode Speed"
  - "Fais un score >500 en mode Kollywood"
  - "Joue 1 partie Alibi en inspecteur"
- Récompense : +100 XP + badge spécial
- Afficher sur home avec compte à rebours

**Fichiers à créer** :
- `lib/gamification.js` (logique XP, niveaux, badges)
- `components/BadgeGallery.jsx` (affichage badges)
- `components/LevelBadge.jsx` (icône niveau)
- `components/DailyChallenge.jsx` (card challenge du jour)
- `app/profile/page.jsx` (compléter avec stats)

**Fichiers à modifier** :
- `app/end/[code]/page.jsx` (attribuer XP à la fin)
- `app/alibi/game/[code]/end/page.jsx` (attribuer XP)
- `app/home/page.jsx` (afficher daily challenge)

---

### 📅 5. Récompenses de Connexion Quotidienne

**Problème** :
- Pas de raison de se connecter tous les jours

**Solution** :
- Calendrier de récompenses 7 jours :
  - Jour 1 : 25 XP
  - Jour 2 : 50 XP
  - Jour 3 : 75 XP
  - Jour 4 : 100 XP
  - Jour 5 : 150 XP
  - Jour 6 : 200 XP
  - Jour 7 : 300 XP + Badge "Assidu"
- Streak counter visible sur home
- Modal à la connexion : "Jour 3 🔥 +75 XP"
- Bonus multiplicateur : x1.5 XP sur tous les jeux après jour 5

**Fichiers à créer** :
- `components/LoginRewardModal.jsx`
- `components/StreakCounter.jsx`
- `lib/rewards.js` (logique streaks)

**Fichiers à modifier** :
- `app/layout.js` (check login reward au mount)
- `app/home/page.jsx` (afficher streak)

---

### 🎓 6. Onboarding & Tutorial

**Problème** :
- `app/splash/page.jsx` vide (redirect direct)
- `app/onboarding/page.jsx` vide
- Nouveaux joueurs ne comprennent pas les règles

**Solution** :

**Splash Screen** (2 secondes) :
- Logo animé Gigglz
- Tagline : "Joue en temps réel avec tes amis"
- Loading bar

**Onboarding** (3 slides) :
- Slide 1 : "Bienvenue sur Gigglz"
  - Illustration : Groupe d'amis avec smartphones
  - Texte : "Crée des parties multijoueur instantanées"
- Slide 2 : "Mode Quiz Buzzer"
  - Illustration : Buzzer géant
  - Texte : "Buzzez avant les autres, gagnez des points"
- Slide 3 : "Mode Alibi"
  - Illustration : Détective
  - Texte : "Démasquez les menteurs, trouvez la vérité"
- Bouton "Commencer" → Login

**Tutorial Interactif** :
- Mini-quiz de 3 questions pour apprendre
- Flèches pointant vers le buzzer
- "Bravo ! Tu as compris 🎉"
- Proposer à la première connexion uniquement

**Fichiers à créer** :
- `app/splash/page.jsx` (splash animé)
- `app/onboarding/page.jsx` (carousel 3 slides)
- `components/TutorialOverlay.jsx` (tutorial interactif)

---

## 🎯 PRIORITÉ 3 : Croissance & Social

### 📲 7. Partage Social & Viral Loop

**Problème** :
- Impossible de partager ses scores
- Pas de mécanisme viral

**Solution** :

**Deep Links** :
- Format : `gigglz.app/join?code=ABC123`
- Auto-remplir le code quand on arrive par ce lien
- Bouton "Copier le lien" dans lobby

**Partage de Scores** :
- Bouton sur page de résultats :
  - "Partager sur Twitter"
  - "Partager sur WhatsApp"
  - "Copier le score"
- Template : "Je viens de faire 450 points sur Gigglz ! 🔥 Bats mon score 👉 [lien]"
- Image générée automatiquement (OpenGraph)

**Invitations** :
- Bouton "Inviter des amis" sur home
- Génère lien + code QR
- Tracking : Qui a invité qui (referral)

**Fichiers à créer** :
- `components/ShareModal.jsx`
- `lib/sharing.js` (génération liens)
- `api/og-image.js` (génération images OpenGraph)

**Fichiers à modifier** :
- `app/end/[code]/page.jsx` (bouton partage)
- `app/join/page.jsx` (deep link support - déjà fait !)
- `app/room/[code]/page.jsx` (bouton inviter)

---

### 👥 8. Système d'Amis & Leaderboard

**Problème** :
- Jeu purement local, pas de dimension sociale persistante

**Solution** :

**Liste d'Amis** :
- Ajouter par code ami unique : `@username#1234`
- Voir qui est en ligne
- Inviter directement en jeu (notification)

**Leaderboard** :
- Onglets : "Global" / "Amis" / "Cette semaine"
- Classement par :
  - Total XP
  - Nombre de victoires
  - Score moyen
- Récompenses hebdomadaires : Top 10 → Badge spécial

**Profils Publics** :
- Voir stats d'un ami :
  - Niveau, XP, badges
  - Parties jouées, taux de victoire
  - Quiz préférés
- Bouton "Défier" (lance partie privée)

**Fichiers à créer** :
- `app/friends/page.jsx` (liste amis)
- `app/leaderboard/page.jsx` (classements)
- `app/profile/[uid]/page.jsx` (profil public)
- `components/FriendCard.jsx`
- `components/LeaderboardTable.jsx`

**Schema Firebase** :
```
users/{uid}/
  └─ friends: ["uid1", "uid2", ...]

friendRequests/
  ├─ {uid}/pending: ["uid3", ...]
  └─ {uid}/sent: ["uid4", ...]

leaderboard/
  ├─ global/{uid}: {xp, rank, updatedAt}
  └─ weekly/{uid}: {xp, rank, updatedAt}
```

---

## 🎯 PRIORITÉ 4 : Contenu & Variété

### 🎨 9. Créateur de Quiz Custom (Fonctionnalité Pro)

**Problème** :
- Contenu limité (11 quiz)
- Pas de contenu généré par utilisateurs

**Solution** :

**Éditeur de Quiz** :
- Formulaire step-by-step :
  1. Infos générales (titre, description, difficulté)
  2. Ajout questions (texte, réponses, bonne réponse)
  3. Preview avant publication
  4. Publier (public/privé)
- Limite Free : 1 quiz custom
- Limite Pro : Illimité

**Store Communautaire** :
- Parcourir quiz créés par autres utilisateurs
- Filtres : Thème, difficulté, popularité
- Rating 5 étoiles + commentaires
- "Quiz tendance" en première page

**Modération** :
- Flag "Contenu inapproprié"
- Review admin avant publication (whitelist)

**Fichiers à créer** :
- `app/create-quiz/page.jsx` (éditeur)
- `app/quiz-store/page.jsx` (store)
- `components/QuizEditor.jsx` (formulaire)
- `components/QuizCard.jsx` (preview)
- `lib/quiz-builder.js` (validation)

**Schema Firebase** :
```
user_quizzes/{uid}/{quizId}/
  ├─ meta {title, description, difficulty, createdAt, published}
  ├─ questions [{text, answers, correct}, ...]
  └─ stats {plays, rating, reviews}
```

---

### 🎮 10. Nouveaux Modes de Jeu

**Idées de Variantes** :

**Mode Survival** :
- Une mauvaise réponse = éliminé
- Dernier debout gagne
- Tension maximale

**Mode Speed Round** :
- Timer réduit : 10 secondes au lieu de 20
- Points x2
- Pour joueurs experts

**Mode Blitz** :
- 20 questions, 1 minute total
- Course contre la montre
- Pas de timer par question

**Mode Team Battle** :
- Équipe vs équipe
- Rôles spécialisés :
  - Buzzers (vitesse)
  - Stratèges (répondent)
  - Capitaine (valide)

**Alibi : Mode Conspiracy** :
- Inspecteurs ne savent pas combien de suspects mentent
- Peut être 0, 1, ou tous
- Augmente la difficulté

**Fichiers à créer** :
- `app/game-modes/survival/[code]/page.jsx`
- `app/game-modes/speed/[code]/page.jsx`
- etc.

---

## 🎯 PRIORITÉ 5 : Polish & UX

### 📱 11. Améliorations UX Diverses

**Sélection de Quiz Plus Claire** :
- Afficher dans dropdown :
  - Icône thème
  - Difficulté (⭐⭐⭐)
  - Nombre de questions (15 Q)
  - Preview 1ère question
- Cards au lieu de dropdown ?

**Mode Spectateur Accessible** :
- Bouton "Regarder en spectateur" dans lobby
- Lien partageable direct
- Nombre de spectateurs visible

**Page de Résultats Enrichie** :
- Breakdown par question :
  - ✅ Question 1 : Correct (+100 pts)
  - ❌ Question 3 : Incorrect (0 pts)
- Graphique : Évolution du score
- Stats détaillées :
  - Taux de réussite (%)
  - Vitesse moyenne de buzz
  - Meilleur streak

**Gestion d'Erreurs** :
- Toast notifications pour erreurs réseau
- Bouton "Réessayer" si échec
- Messages clairs : "Impossible de buzzer (connexion perdue)"

**Alibi : Améliorations** :
- Countdown visible avant changement de phase
- Tooltips : "Qu'est-ce qu'un buzz anticipé ?"
- Auto-balance teams (bouton "Équilibrer automatiquement")

**Fichiers à modifier** :
- `app/room/[code]/page.jsx` (sélection quiz)
- `app/end/[code]/page.jsx` (résultats détaillés)
- `components/Buzzer.jsx` (gestion erreurs)
- `app/alibi/room/[code]/page.jsx` (auto-balance)

---

### 🎨 12. Cosmétiques & Personnalisation (Monétisation)

**Avatars** :
- 10 avatars gratuits
- 50 avatars Pro
- Afficher avatar à côté du nom en jeu

**Skins de Buzzer** :
- Thèmes : Néon, Rétro, Minimaliste, Galaxy
- Animations custom
- Sons custom

**Thèmes d'Interface** :
- Mode sombre (déjà fait ?)
- Mode clair
- Mode daltonien

**Badges Cosmétiques** :
- Afficher 3 badges favoris sur profil
- Badges animés (premium)

**Fichiers à créer** :
- `app/cosmetics/page.jsx` (boutique)
- `components/AvatarPicker.jsx`
- `components/BuzzerSkinPicker.jsx`
- `lib/cosmetics.js`

**Schema Firebase** :
```
users/{uid}/cosmetics/
  ├─ avatar: "id"
  ├─ buzzerSkin: "id"
  ├─ theme: "dark"|"light"
  └─ owned: ["avatar_1", "skin_2", ...]
```

---

## 🐛 BUGS & FIXES TECHNIQUES

### 13. Problèmes à Corriger

**Room Cleanup** :
- Les rooms ne sont jamais supprimées
- Firebase DB grossit indéfiniment
- Solution : Cloud Function qui supprime rooms >12h

**Timer Desync** :
- Offset serveur calculé 1 fois seulement
- Si connexion change (WiFi→4G), désync possible
- Solution : Rafraîchir offset toutes les 30s

**Freemium Non Appliqué** :
- Limites définies mais jamais vérifiées
- Solution : Check dans handleStartGame()

**Pages Auth Cassées** :
- `/home`, `/profile` redirigent vers `/login` qui n'existe pas
- Solution : Créer `/login` complet

---

## 📱 MOBILE & DÉPLOIEMENT

### 14. Optimisations Mobile

**PWA** :
- Créer manifest.json
- Service Worker pour offline
- "Ajouter à l'écran d'accueil"

**Safe Areas** :
- Respecter notch iPhone
- Bottom padding pour gestures Android
- Déjà partiellement fait dans Buzzer

**Bottom Navigation** :
- Router vers Home / Play / Friends / Profile / Store
- `lib/components/BottomNav.jsx` existe mais pas wired

**Haptic Feedback** :
- Vibrations déjà présentes
- Ajouter sur plus d'actions (clic boutons, level up)

**Notifications Push** :
- "Nouveau daily challenge disponible"
- "Ton ami t'invite à jouer"
- "Tu es #2 cette semaine !"

---

## 🎯 TOP 5 Actions Immédiates

Si on doit commencer par quelque chose aujourd'hui :

### 1. ✅ Créer page Login fonctionnelle
- Google Sign-In button
- Redirection après login
- Profil utilisateur dans Firebase

### 2. ✅ Activer Paywall
- Modal quand contenu verrouillé
- Check avant lancer jeu
- Badge "Pro" sur packs

### 3. ✅ Ajouter Analytics
- Events sur toutes les actions clés
- Dashboard Firebase pour voir données

### 4. ✅ Système XP + Niveaux
- +50 XP par partie
- Barre de progression sur home
- Niveau affiché en jeu

### 5. ✅ Onboarding complet
- Splash screen animé
- Tutorial 3 slides
- Première expérience guidée

---

## 💡 Opportunité Unique : Mode Alibi

**Constat** :
- Le mode Alibi est **unique**
- Aucun concurrent n'a ça
- Potentiel énorme si on pousse dessus

**Actions Spécifiques Alibi** :
- Créer 50 nouveaux scénarios (vs 18 actuels)
- Mode "Conspiracy" (inspecteurs ne savent pas qui ment)
- Mode "Double Agent" (1 inspecteur est complice)
- Tournois Alibi hebdomadaires
- Leaderboard Alibi séparé
- Créateur d'Alibi custom (Pro)

**Positionnement** :
→ Devenir **LE** jeu de référence pour "social deduction games en temps réel"

---

## 📋 Récapitulatif Fichiers

### À Créer de Zéro
- `app/login/page.jsx`
- `components/PaywallModal.jsx`
- `lib/gamification.js`
- `components/BadgeGallery.jsx`
- `components/DailyChallenge.jsx`
- `components/LoginRewardModal.jsx`
- `components/ShareModal.jsx`
- `app/friends/page.jsx`
- `app/leaderboard/page.jsx`
- `app/create-quiz/page.jsx`
- `app/quiz-store/page.jsx`

### À Compléter
- `app/splash/page.jsx` (existe mais vide)
- `app/onboarding/page.jsx` (existe mais vide)
- `app/profile/page.jsx` (existe mais incomplet)
- `app/home/page.jsx` (ajouter challenges, streak, etc.)

### À Modifier
- `app/room/[code]/page.jsx` (paywall check)
- `app/game/[code]/host/page.jsx` (analytics, XP)
- `app/end/[code]/page.jsx` (stats détaillées, partage)
- `components/Buzzer.jsx` (gestion erreurs)
- `lib/firebase.js` (activer Google Sign-In)

---

**Document préparé le** : 11 Novembre 2025
**Projet** : Gigglz
**Version** : Next.js 15 + React 19
