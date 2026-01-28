# LetsQueeze - Plan de Nettoyage & Optimisation

> Document généré le 2026-01-20 après analyse complète du projet.
> À supprimer une fois les actions terminées.

---

## Table des Matières

1. [Code Inutilisé à Supprimer](#1-code-inutilisé-à-supprimer)
2. [Code Dupliqué à Refactorer](#2-code-dupliqué-à-refactorer)
3. [Problèmes de Performance](#3-problèmes-de-performance)
4. [Configuration Manquante (CRITIQUE)](#4-configuration-manquante-critique)
5. [Incohérences à Résoudre](#5-incohérences-à-résoudre)
6. [Fichiers Volumineux](#6-fichiers-volumineux)
7. [Plan d'Action Priorisé](#7-plan-daction-priorisé)

---

## 1. Code Inutilisé à Supprimer

### Hooks Jamais Importés

| Fichier | Lignes | Action |
|---------|--------|--------|
| ~~`lib/hooks/useGameRoom.js`~~ | ~80 | **FAIT** - Supprimé |
| ~~`lib/hooks/useRoomSubscription.js`~~ | ~120 | **FAIT** - Supprimé |
| ~~`lib/hooks/useSound.js`~~ | ~30 | **FAIT** - Recréé et utilisé (centralisé) |

### Composants Jamais Importés

| Fichier | Lignes | Action |
|---------|--------|--------|
| ~~`components/ui/WatchAdModal.jsx`~~ | ~150 | **FAIT** - Supprimé |

### Exports Inutilisés (à retirer des fichiers)

**`components/transitions/PageTransition.jsx`** - Garder seulement `PageTransition` default export :
- [x] `FadeInItem` - **FAIT** - Supprimé
- [x] `SlideIn` - **FAIT** - Supprimé
- [x] `ScaleIn` - **FAIT** - Supprimé
- [x] `StaggerContainer` - **FAIT** - Supprimé
- [x] `StaggerItem` - **FAIT** - Supprimé

### Fonctions Jamais Appelées

**`lib/userProfile.js`:**
- [x] `getUserGameHistory()` - **FAIT** - Supprimé
- [x] `getXPProgress()` - **FAIT** - Supprimé
- [x] `calculateXPEarned()` - **FAIT** - Supprimé

**`lib/admin.js`:**
- [ ] `getAdminStatus()` - Exporté mais jamais appelé directement

**`lib/firebase.js`:**
- [ ] `signInWithGoogleRedirect()` - Supplanté par `authService.js`
- [ ] `getGoogleRedirectResult()` - Rarement utilisé

---

## 2. Code Dupliqué à Refactorer

### HAUTE PRIORITÉ

#### 2.1 `useSound()` - Dupliqué dans 6 fichiers

**FAIT** - Centralisé dans `lib/hooks/useSound.js` et importé dans les 6 fichiers.

---

#### 2.2 `rankWithTies()` - Dupliqué dans 3 fichiers

**FAIT** - Extrait vers `lib/utils/ranking.js` et importé dans les 3 pages end.

---

#### 2.3 Firebase State Listeners - Pattern répété

**À FAIRE** - Créer `useGameStateListeners({ roomPrefix, code, onPhaseChange })`

---

#### 2.4 Authentication Init - Pattern répété dans 10+ pages

**NON NÉCESSAIRE** - `useUserProfile` hook existe déjà et couvre ce besoin

---

#### 2.5 Server Time Sync - Pattern répété dans 6 fichiers

**FAIT** - Créé `lib/hooks/useServerTime.js` et utilisé dans les 6 fichiers.
- Polling augmenté de 200ms à 300ms.

---

### MOYENNE PRIORITÉ

#### 2.6 Room State Initialization - 5 pages lobby

**À FAIRE** - Créer `useRoomPageState(code, gamePrefix)`

---

#### 2.7 Modal State Management - 5 pages lobby

**À FAIRE** - Créer `useLobbyModals()` hook

---

#### 2.8 End Page Ad Logic - 3 pages end

**À FAIRE** - Créer `useEndPageAd()` hook

---

#### 2.9 Animated Victory/Defeat Icons - 2 pages end

**À FAIRE** - Extraire vers `components/shared/AnimatedGameIcons/`

---

## 3. Problèmes de Performance

### 3.1 Console.log en Production

**FAIT** - Réduit de 167 à 74 occurrences (-56%)

Fichiers nettoyés:
- [x] `app/game/[code]/host/page.jsx` (-18)
- [x] `app/blindtest/game/[code]/host/page.jsx` (-17)
- [x] `app/deeztest/game/[code]/host/page.jsx` (-9)
- [x] `lib/spotify/player.js` (-28)
- [x] `lib/admob.js` (-13)
- [x] `lib/hooks/usePlayerCleanup.js` (-8)

Restants (acceptable):
- Routes API (server-side logging OK)
- `lib/logger.js` (le logger lui-même)
- Fichiers secondaires

---

### 3.2 Inline Styles Causant des Re-renders

**FAIT** - `VARIANT_COLORS` extrait hors composant + `useMemo` dans `LobbySettings.jsx`

---

### 3.3 Polling Trop Agressif (200ms)

**FAIT** - Augmenté à 300ms via `useServerTime(300)`

---

### 3.4 Lazy Loading Manquant

**NON NÉCESSAIRE** - Next.js code-split déjà par page; fichiers petits (~500 lignes total)

---

## 4. Configuration Manquante (CRITIQUE)

### 4.1 AdMob - IDs Manquants

**À FAIRE** - Créer les ad units interstitielles dans AdMob Console

```javascript
AD_UNIT_IDS = {
  ios: {
    interstitial: 'ca-app-pub-1140758415112389/XXXXXXXXXX', // TODO
    rewarded: 'ca-app-pub-1140758415112389/5594671010'      // OK
  },
  android: {
    interstitial: 'ca-app-pub-1140758415112389/XXXXXXXXXX', // TODO
    rewarded: 'ca-app-pub-1140758415112389/6397628551'      // OK
  }
}
```

---

### 4.2 RevenueCat - API Keys Manquantes

**À FAIRE** - Configurer dans RevenueCat Dashboard

---

### 4.3 Fonction Stub Non Implémentée

**FAIT** - `getUserGameHistory()` supprimé (jamais utilisé)

---

## 5. Incohérences à Résoudre

### 5.1 Double Système d'Authentification

**À FAIRE** - Consolider vers `authService.js`

---

### 5.2 Storage Incohérent

**FAIT** - Migré vers `storage.js` + corrigé bug double-préfixe

---

### 5.3 Logger Ignoré

**À FAIRE** - Décider: utiliser `logger.js` partout ou le supprimer

---

## 6. Fichiers Volumineux

Ces fichiers dépassent 1000 lignes et pourraient bénéficier d'un refactoring :

| Fichier | Lignes | Note |
|---------|--------|------|
| `app/laloi/game/[code]/play/page.jsx` | **2005** | Le plus gros |
| `app/blindtest/game/[code]/host/page.jsx` | 1868 | |
| `app/deeztest/game/[code]/host/page.jsx` | 1860 | |
| `app/profile/hue/page.jsx` | 1832 | |
| `app/profile/page.jsx` | 1728 | |
| `app/alibi/game/[code]/play/page.jsx` | 1397 | |
| `app/game/[code]/host/page.jsx` | 1246 | |
| `app/laloi/game/[code]/investigate/page.jsx` | 1224 | |
| `app/alibi/game/[code]/prep/page.jsx` | 1147 | |
| `app/subscribe/page.jsx` | 1087 | |
| `app/laloi/room/[code]/page.jsx` | 1003 | |

---

## 7. Plan d'Action Priorisé

### Phase 1: CRITIQUE (Blocages Production)

- [ ] **4.1** Créer les ad units interstitielles AdMob (iOS + Android)
- [ ] **4.2** Configurer RevenueCat avec les vraies API keys

---

### Phase 2: HAUTE (Nettoyage Code Mort) - **TERMINÉ**

- [x] **1.1** Supprimer `lib/hooks/useGameRoom.js`
- [x] **1.2** Supprimer `lib/hooks/useRoomSubscription.js`
- [x] **1.3** Recréer et centraliser `lib/hooks/useSound.js`
- [x] **1.4** Supprimer `components/ui/WatchAdModal.jsx`
- [x] **1.5** Nettoyer exports inutilisés dans `PageTransition.jsx`
- [x] **1.6** Supprimer fonctions mortes dans `lib/userProfile.js`
- [x] **3.1** Nettoyer les `console.log` (167 → 74, -56%)

---

### Phase 3: MOYENNE (Refactoring Duplications) - **TERMINÉ**

- [x] **2.2** Extraire `rankWithTies()` vers `lib/utils/ranking.js`
- [x] **2.1** Centraliser `useSound()` dans `lib/hooks/useSound.js`
- [x] **2.5** Créer `useServerTime()` hook (+ polling 300ms)
- [x] **5.2** Migrer tout vers `storage.js` ✓
  - Corrigé bug double-préfixe `lq_lq_last_game`
  - Migration des appels directs `localStorage` vers `storage.js`
- [x] **3.2** Mémoïser les objets inline dans `LobbySettings.jsx` ✓
  - `VARIANT_COLORS` déplacé hors du composant
  - `color` mémoïsé avec `useMemo`
- [~] **2.4** `useAuthInit()` - Non nécessaire: `useUserProfile` existe déjà
- [ ] **2.3** Créer `useGameStateListeners()` hook (optionnel)
- [ ] **5.1** Consolider auth en un seul système (optionnel)

---

### Phase 4: BASSE (Optimisation) - **TERMINÉ**

- [~] **2.6** `useRoomPageState()` - Non nécessaire (trop spécifique par jeu)
- [~] **2.7** `useLobbyModals()` - Non nécessaire (modals différents par jeu)
- [x] **2.8** Créer `useEndPageAd()` hook ✓
  - Créé `lib/hooks/useEndPageAd.js`
  - Appliqué aux 3 pages end (quiz, blindtest, deeztest)
- [x] **3.3** Augmenter interval polling à 300ms - **FAIT**
- [~] **3.4** Lazy loading données de jeux - Non nécessaire (Next.js code-split déjà par page)
- [x] **5.3** `logger.js` supprimé (jamais utilisé)

---

## Résumé du Nettoyage Effectué

### Fichiers Supprimés (5)
- `lib/hooks/useGameRoom.js`
- `lib/hooks/useRoomSubscription.js`
- `components/ui/WatchAdModal.jsx`
- (ancien) `lib/hooks/useSound.js`
- `lib/logger.js` - Jamais utilisé

### Fichiers Créés (4)
- `lib/utils/ranking.js` - Fonction `rankWithTies()` centralisée
- `lib/hooks/useServerTime.js` - Sync temps serveur Firebase
- `lib/hooks/useSound.js` - Hook audio centralisé
- `lib/hooks/useEndPageAd.js` - Pub + auth pages end

### Fichiers Nettoyés (18+)
- `components/transitions/PageTransition.jsx` - 5 exports supprimés
- `lib/userProfile.js` - 3 fonctions mortes supprimées
- `components/game/LobbySettings.jsx` - `VARIANT_COLORS` extrait + `useMemo`
- 3 pages end - Refactorisées avec `useEndPageAd` hook
- 6 pages host/play - Import `useServerTime` + `useSound` centralisés
- 6 fichiers lib - Console.log supprimés

### Bugs Corrigés
- **Double-préfixe storage**: `storage.set('lq_last_game')` → `storage.set('last_game')`
  - `app/home/page.jsx`
  - `app/game/[code]/play/page.jsx`
  - `app/blindtest/game/[code]/play/page.jsx`
  - `app/deeztest/game/[code]/play/page.jsx`
  - `app/deeztest/join/page.jsx`
  - `lib/hooks/usePlayerCleanup.js`
- **UID récupération**: `app/end/[code]/page.jsx` - Corrigé lecture localStorage inexistante

### Statistiques
- **Lignes supprimées (net):** ~500+
- **Console.log:** 167 → 74 (-56%)
- **Polling:** 200ms → 300ms (meilleure perf)
- **Bugs critiques corrigés:** 2

---

*Dernière mise à jour: 2026-01-21*
