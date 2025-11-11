# 📱 LetsQueeze - Structure UX/UI Mobile App

Basé sur les meilleures pratiques 2025 et l'analyse de Plato + apps de jeux multijoueurs

---

## 🎯 Architecture Globale

### **Flow Utilisateur Complet**

```
1. Splash Screen (1-2 sec)
   ↓
2. Onboarding (première fois) OU Auth Check
   ↓
3. Authentification (si pas connecté)
   ↓
4. App Principale (Bottom Tab Navigation)
   ├─ Home Tab (🏠)
   ├─ Friends Tab (👥) [Future]
   ├─ Play Button (⚡ - Central)
   ├─ Store Tab (🛒) [Future]
   └─ Profile Tab (👤)
```

---

## 🚀 Phase 1 - MVP Structure (À Implémenter Maintenant)

### **1. Splash Screen** (`/splash`)

**Durée:** 1-2 secondes max
**Objectif:** Branding + vérification auth

```
┌─────────────────┐
│                 │
│                 │
│   LetsQueeze    │
│      🎮         │
│                 │
│   Loading...    │
│                 │
└─────────────────┘
```

**Actions:**
- Afficher logo + app name
- Vérifier si user déjà connecté (onAuthStateChanged)
- Charger les données essentielles
- Rediriger vers `/onboarding` (première fois) ou `/login` (pas connecté) ou `/home` (déjà connecté)

---

### **2. Onboarding** (`/onboarding`) - **Première Fois Seulement**

**Pattern:** 3 slides max (best practice 2025)

#### **Slide 1: Bienvenue**
```
┌─────────────────┐
│   🎮 🎯 🎲      │
│                 │
│  LetsQueeze     │
│                 │
│  Jeux Multijoueur│
│  Entre Amis     │
│                 │
│   [● ○ ○]       │
│   [Suivant →]   │
└─────────────────┘
```

#### **Slide 2: 3 Jeux Disponibles**
```
┌─────────────────┐
│                 │
│  🎯 Quiz Buzzer │
│  🕵️ Alibi      │
│  ⚡ Buzzer Seul │
│                 │
│  Jouez jusqu'à  │
│  8 joueurs !    │
│                 │
│   [○ ● ○]       │
│   [Suivant →]   │
└─────────────────┘
```

#### **Slide 3: Gratuit + Pro**
```
┌─────────────────┐
│                 │
│  ✓ 3 packs free │
│  ✓ Mode Buzzer  │
│  ✓ Multijoueur  │
│                 │
│  🌟 Déverrouillez│
│     tout avec Pro│
│                 │
│   [○ ○ ●]       │
│   [Commencer]   │
└─────────────────┘
```

**Important:** Pas de skip button ! Seulement 3 slides = 10 secondes max

---

### **3. Authentification** (`/login`)

**Pattern:** Delayed Authentication (best practice gaming apps)

**Option A - Recommandée: Connexion Optionnelle**
```
┌─────────────────┐
│  LetsQueeze     │
│                 │
│  Connectez-vous │
│  pour sauvegarder│
│  votre progression│
│                 │
│  [Google 🔵]    │
│  [Apple 🍎]     │
│  [Email ✉️]     │
│                 │
│ [Continuer sans │
│   compte →]     │
└─────────────────┘
```

**Option B - Actuelle: Connexion Obligatoire**
```
┌─────────────────┐
│  LetsQueeze     │
│                 │
│  [Google 🔵]    │
│                 │
│  [Apple 🍎]     │
│                 │
│  [Email ✉️]     │
│                 │
│  ─── ou ───     │
│                 │
│  [Mode Invité]  │
└─────────────────┘
```

**Recommandation:** Option A pour réduire friction (backload l'inscription après première partie)

---

### **4. App Principale - Bottom Tab Navigation**

**Tabs (3-5 max):** 🏠 Home | ⚡ Quick Play | 👤 Profile

```
┌─────────────────────────┐
│   [Content Area]        │
│                         │
│                         │
│                         │
│                         │
│                         │
│                         │
│                         │
├─────────────────────────┤
│ 🏠    ⚡     👤         │
│Home  Play  Profile      │
└─────────────────────────┘
```

#### **Tab 1: 🏠 Home** (`/home`)

**Layout:**

```
┌─────────────────────────┐
│ ┌─ Salut, Sujeevan! ─┐ │ ← Header
│ │ 👑 Admin  ⭐ Pro   │ │
│ └────────────────────┘ │
│                         │
│ ┌─ Favoris ─────────┐  │ ← Plato pattern
│ │ ❤️ Quiz Buzzer     │  │
│ │ ❤️ Alibi           │  │
│ └────────────────────┘ │
│                         │
│ ┌─ Tous les Jeux ───┐  │
│ │                    │  │
│ │ ┌────┐ ┌────┐     │  │ ← Cards 2 colonnes
│ │ │🎯  │ │🕵️  │     │  │
│ │ │Quiz│ │Alibi│    │  │
│ │ │    │ │    │     │  │
│ │ └────┘ └────┘     │  │
│ │                    │  │
│ │ ┌────┐             │  │
│ │ │⚡  │             │  │
│ │ │Buzz│             │  │
│ │ │er  │             │  │
│ │ └────┘             │  │
│ └────────────────────┘ │
│                         │
│ [🏠] [⚡] [👤]         │ ← Bottom Nav
└─────────────────────────┘
```

**Éléments:**
- **Header:** Welcome message + badges (Pro/Admin)
- **Favoris Section:** Games favoris (système de ❤️)
- **Tous les Jeux:** Grid 2 colonnes avec cards
  - Image/Icon du jeu
  - Nom du jeu
  - Players count (ex: "2-8 joueurs")
  - Lock icon si Pro required + pack number
  - Tap pour ouvrir détails

**Interactions:**
- Tap sur card → Game Detail page
- Long press → Add to favorites (❤️)

---

#### **Tab 2: ⚡ Quick Play** (Central Action Button)

**Pattern:** Fab Button central - action primaire

**Comportement:**
- Tap → Bottom Sheet avec options:
  ```
  ┌─────────────────┐
  │ Jouer Rapidement│
  ├─────────────────┤
  │ 🎯 Quiz Buzzer  │
  │ 🕵️ Alibi        │
  │ ⚡ Buzzer Seul  │
  ├─────────────────┤
  │ 🔗 Rejoindre    │
  │    avec code    │
  └─────────────────┘
  ```

**Ou Version Simple:**
- Tap → Directement à "Host or Join?" pour dernier jeu joué

---

#### **Tab 3: 👤 Profile** (`/profile`)

**Layout:**

```
┌─────────────────────────┐
│ ┌───────────────────┐   │
│ │    [Avatar 👤]    │   │ ← Photo Google/initiales
│ │                   │   │
│ │  Sujeevan Yoga    │   │
│ │ sujeevan@gmail... │   │
│ │                   │   │
│ │ 👑 Admin ⭐ Pro   │   │ ← Badges
│ └───────────────────┘   │
│                         │
│ ┌─ Abonnement ──────┐   │
│ │ Plan: Admin (Pro) │   │
│ │ Accès illimité ✓  │   │
│ │                   │   │
│ │ [Gérer] (disabled)│   │ ← Si admin
│ └───────────────────┘   │
│                         │
│ ┌─ Statistiques ────┐   │
│ │ 🎯 Quiz: 12 wins  │   │
│ │ 🕵️ Alibi: 8 wins │   │
│ │ ⚡ Total: 45      │   │
│ └───────────────────┘   │
│                         │
│ ┌─ Paramètres ──────┐   │
│ │ 🔔 Notifications  │   │
│ │ 🌙 Dark Mode      │   │
│ │ 🔊 Sound Effects  │   │
│ │ 🗣️ Langue        │   │
│ └───────────────────┘   │
│                         │
│ [Déconnexion]           │
│                         │
│ [🏠] [⚡] [👤]         │
└─────────────────────────┘
```

**Sections:**

1. **Header:**
   - Photo de profil (Google ou initiales colorées)
   - Nom + email
   - Badges (Admin/Pro)

2. **Abonnement:**
   - Tier actuel (Free/Pro/Admin)
   - Bénéfices activés
   - Bouton "Upgrade to Pro" (si Free)
   - Bouton "Gérer" (si Pro) → vers Store/RevenueCat

3. **Statistiques:**
   - Games joués
   - Wins par jeu
   - Total parties

4. **Paramètres:**
   - Notifications
   - Dark Mode
   - Sound Effects
   - Langue

5. **Footer:**
   - Bouton Déconnexion
   - Version app
   - Terms & Privacy links

---

## 🎨 Design System - Mobile First

### **Couleurs (Vibrant Material Design)**

```css
/* Backgrounds */
--bg-app: #F8F9FA;           /* Gris très clair pour fond global */
--bg-card: #FFFFFF;          /* Blanc pour cards */
--bg-navbar: #FFFFFF;        /* Blanc pour bottom nav */

/* Bottom Nav */
--nav-inactive: #9CA3AF;     /* Gris pour icons inactifs */
--nav-active: #4285F4;       /* Bleu Google pour actif */

/* Game Cards */
--card-quiz: #4285F4;        /* Bleu pour Quiz */
--card-alibi: #FBBC04;       /* Jaune pour Alibi */
--card-buzzer: #34A853;      /* Vert pour Buzzer */

/* Status */
--pro-gradient: linear-gradient(135deg, #FFD700, #FF6D00);
--admin-gradient: linear-gradient(135deg, #A855F7, #EC4899);
```

### **Spacing (8pt Grid)**

```css
--space-1: 0.25rem;  /* 4px  - Très petit */
--space-2: 0.5rem;   /* 8px  - Petit */
--space-3: 0.75rem;  /* 12px - Moyen-petit */
--space-4: 1rem;     /* 16px - Moyen (padding standard) */
--space-6: 1.5rem;   /* 24px - Grand */
--space-8: 2rem;     /* 32px - Très grand */
```

### **Typography**

```css
--text-xs: 0.75rem;   /* 12px - Labels, captions */
--text-sm: 0.875rem;  /* 14px - Body small */
--text-base: 1rem;    /* 16px - Body (défaut mobile) */
--text-lg: 1.125rem;  /* 18px - Subtitles */
--text-xl: 1.25rem;   /* 20px - Titles */
--text-2xl: 1.5rem;   /* 24px - Big titles */
--text-3xl: 1.875rem; /* 30px - Hero */
```

### **Shadows (Material Design)**

```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
--shadow-md: 0 4px 6px rgba(0,0,0,0.07);
--shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
--shadow-xl: 0 20px 25px rgba(0,0,0,0.15);
```

### **Border Radius**

```css
--radius-sm: 8px;    /* Small cards */
--radius-md: 12px;   /* Medium cards */
--radius-lg: 16px;   /* Large cards */
--radius-xl: 24px;   /* Hero sections */
--radius-full: 9999px; /* Pills/buttons */
```

---

## 📐 Composants Clés

### **1. Game Card**

```jsx
<div className="game-card">
  <div className="game-icon">🎯</div>
  <h3>Quiz Buzzer</h3>
  <p>2-8 joueurs</p>
  {!isPro && <LockBadge />}
</div>
```

**Style:**
- Width: 100% (mobile) ou ~160px (grid)
- Aspect ratio: 1:1.2
- Shadow: --shadow-md
- Radius: --radius-lg
- Tap: scale(0.98) + shadow increase

### **2. Bottom Nav Tab**

**Specs:**
- Height: 56px (Material Design standard)
- Icon size: 24x24px
- Tap area: min 44x44px
- Active state: icon + label color change
- Inactive: gray #9CA3AF
- Active: blue #4285F4

**Example:**
```jsx
<nav className="bottom-nav">
  <button className="tab active">
    <HomeIcon />
    <span>Home</span>
  </button>
  <button className="tab fab">
    <PlayIcon />
  </button>
  <button className="tab">
    <ProfileIcon />
    <span>Profile</span>
  </button>
</nav>
```

### **3. Profile Badge**

```jsx
{isAdmin && (
  <span className="badge admin">
    👑 Admin
  </span>
)}
{isPro && (
  <span className="badge pro">
    ⭐ PRO
  </span>
)}
```

---

## 🔄 Navigation Flow Examples

### **Flow 1: Nouveau Utilisateur**

```
1. Launch app
   ↓
2. Splash (1s) → check auth
   ↓
3. Onboarding (3 slides, 10s)
   ↓
4. Login page
   - Option: "Continuer sans compte" → anonymous auth
   - Ou: Google/Apple/Email sign-in
   ↓
5. Home tab (bottom nav)
   - Voir les 3 jeux
   - Tap Quiz Buzzer
   ↓
6. Game Detail page
   - "Créer une partie" ou "Rejoindre"
   ↓
7. Existing flow (host/join)
```

### **Flow 2: Utilisateur Revenant**

```
1. Launch app
   ↓
2. Splash (1s) → auth check → already logged in
   ↓
3. Home tab directement
   - Voir favoris + tous les jeux
   - Tap ⚡ Quick Play
   ↓
4. Bottom sheet quick actions
   - Sélectionner jeu
   ↓
5. Host or Join?
   ↓
6. Existing flow
```

### **Flow 3: Accès Profile**

```
1. Depuis n'importe où
   ↓
2. Tap 👤 Profile tab
   ↓
3. Voir stats + badges
   - Si Free: voir "Upgrade to Pro" banner
   - Tap "Upgrade"
   ↓
4. Paywall / Store page
   - Sélectionner plan (Monthly/Annual)
   - RevenueCat checkout
   ↓
5. Success → Profile mis à jour avec badge Pro
```

---

## 🚧 Phases d'Implémentation

### **Phase 1 - MVP Navigation (1-2 semaines)**

✅ **Must Have:**
- [ ] Splash screen
- [ ] Onboarding (3 slides)
- [ ] Login page (Google + Apple + Email + Anonymous)
- [ ] Bottom tab navigation (3 tabs)
- [ ] Home tab avec game cards
- [ ] Profile tab basique (info + badges + déconnexion)
- [ ] Quick Play button → redirect to game

### **Phase 2 - Enhanced UX (1-2 semaines)**

- [ ] Favoris system (❤️ sur games)
- [ ] Stats tracking (games played, wins)
- [ ] Dark mode toggle
- [ ] Settings page
- [ ] Game detail pages

### **Phase 3 - Social & Store (2-3 semaines)**

- [ ] Friends tab
- [ ] Store tab (packs)
- [ ] Paywall integration
- [ ] RevenueCat subscription
- [ ] Push notifications

---

## 📱 Responsive Breakpoints

```css
/* Mobile First */
@media (min-width: 375px) {  /* iPhone SE */
  /* Default */
}

@media (min-width: 768px) {  /* iPad */
  /* 2 colonnes → 3 colonnes pour game grid */
  /* Larger cards */
}

@media (min-width: 1024px) { /* Desktop */
  /* Side nav au lieu de bottom nav */
  /* 4 colonnes pour game grid */
}
```

**Priorité:** Mobile first (90% users sur mobile pour gaming apps)

---

## 🎯 KPIs à Tracker

### **Onboarding:**
- % qui complètent les 3 slides
- % qui skip (si on ajoute skip button)
- % qui se connectent vs anonymous

### **Navigation:**
- Tab la plus utilisée (Home vs Profile)
- % d'utilisation du Quick Play button
- Temps moyen sur chaque screen

### **Conversion:**
- % Free → Pro
- Temps avant première subscription
- Retention Day 1, Day 7, Day 30

---

## 📚 Références

**Apps Analysées:**
- **Plato:** Bottom nav (Home, Friends, Play, Store, Profile), Favoris system
- **Candy Crush:** Quick wins onboarding
- **Temple Run:** Learn by doing
- **Duolingo:** Delayed auth, progressive onboarding
- **Instagram:** 5-tab bottom nav, central action

**Best Practices Sources:**
- Nielsen Norman Group (NN/g) - Tab navigation rules
- Material Design Guidelines 2025
- Apple Human Interface Guidelines
- Mobile Gaming UX Research 2025

---

## ✅ Prochaines Actions

1. ✅ Créer Splash screen component
2. ✅ Créer Onboarding flow (3 slides)
3. ✅ Refonte Login page (actuellement `/login`)
4. ✅ Créer Bottom Tab Navigation layout
5. ✅ Refonte Home page en Home tab
6. ✅ Créer Profile tab
7. ✅ Créer Game Card component
8. ✅ Implémenter Favoris system

**Tu veux que je commence l'implémentation ?** 🚀
