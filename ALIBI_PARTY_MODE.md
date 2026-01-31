# Alibi Party Mode - Roadmap & Spec

> Document de suivi pour l'implémentation du mode Party pour le jeu Alibi.

**Statut:** En cours de planification
**Dernière mise à jour:** 2026-01-31

---

## 1. Concept

### Mode Game Master (actuel)
- L'hôte est **inspecteur** (pose les questions)
- Les autres joueurs sont **accusés** (répondent)
- 1 seul alibi partagé par tous les accusés
- 10 questions, 30s par question

### Mode Party (nouveau)
- Les joueurs sont répartis en **2-4 groupes**
- Chaque groupe a **son propre alibi** à apprendre
- **Rotation des rôles** : chaque groupe devient tour à tour inspecteur
- 3 rôles possibles : Inspecteur / Accusé / Spectateur

---

## 2. Règles du jeu

### Rotation (exemple 3 groupes)

```
Round 1: 🔍 Groupe 1 (Inspecteur) → interroge → 🎭 Groupe 2 (Accusé)
         👁️ Groupe 3 (Spectateur)

Round 2: 🔍 Groupe 2 (Inspecteur) → interroge → 🎭 Groupe 3 (Accusé)
         👁️ Groupe 1 (Spectateur)

Round 3: 🔍 Groupe 3 (Inspecteur) → interroge → 🎭 Groupe 1 (Accusé)
         👁️ Groupe 2 (Spectateur)

[Répéter jusqu'à épuisement des questions]
```

### Nombre de questions

| Groupes | Questions/groupe | Total questions |
|---------|------------------|-----------------|
| 2       | 10               | 20              |
| 3       | 8                | 24              |
| 4       | 8                | 32              |

### Scoring
- Basé sur le **% de cohérence** de chaque groupe (en tant qu'accusé)
- Groupe gagnant = celui avec le plus haut % de réponses correctes
- Pas de points pour les détections (comme en mode Game Master)

### Contraintes
- **Minimum 2 joueurs par groupe**
- **Minimum 4 joueurs total** (2 groupes × 2 joueurs)
- **Free users** : 4 alibis disponibles (au lieu de 3) pour supporter le mode Party

---

## 3. Architecture technique

### 3.1 Firebase Structure

```javascript
rooms_alibi/{code}/
├── meta/
│   ├── gameMasterMode: 'gamemaster' | 'party'
│   ├── hostUid
│   ├── hostName                    // NOUVEAU
│   ├── groupCount: 2 | 3 | 4       // NOUVEAU (party mode only)
│   └── ...
│
├── state/
│   ├── phase: "lobby|prep|interrogation|end"
│   ├── currentQuestion: 0-N
│   └── (party mode only)
│       ├── currentRound: 0          // Index du round actuel
│       ├── totalRounds: N           // Nombre total de rounds
│       ├── inspectorGroupId: 'group1'
│       ├── accusedGroupId: 'group2'
│       └── roundRotation: [         // Séquence pré-calculée
│           { inspector: 'group1', accused: 'group2', questionIndex: 0 },
│           { inspector: 'group2', accused: 'group3', questionIndex: 0 },
│           ...
│         ]
│
├── groups/                          // NOUVEAU (party mode only)
│   ├── group1/
│   │   ├── id: 'group1'
│   │   ├── name: 'Les Témoins'
│   │   ├── color: '#FF2D55'
│   │   ├── alibiId: 'match-equipe-locale'
│   │   ├── alibiData: { title, accused_document, questions... }
│   │   └── score: { correct: 0, total: 0 }
│   ├── group2/ ...
│   └── group3/ ...
│
├── players/{uid}/
│   ├── uid, name, joinedAt
│   ├── team: null                   // Game Master mode (inspectors/suspects)
│   └── groupId: 'group1'            // Party mode
│
├── interrogation/
│   ├── currentQuestion: 0
│   ├── state: "waiting|answering|verdict"
│   ├── targetGroupId: 'group2'      // NOUVEAU - groupe interrogé
│   ├── responses/{uid}: { answer, uid, name }
│   └── verdict: "correct|incorrect|timeout"
│
└── score/                           // Game Master mode only
    ├── correct: 0
    └── total: 10
```

### 3.2 Noms de groupes

**Noms par défaut :**
```javascript
const ALIBI_DEFAULT_GROUP_NAMES = [
  'Équipe 1',
  'Équipe 2',
  'Équipe 3',
  'Équipe 4'
];

const ALIBI_GROUP_COLORS = [
  '#FF2D55',  // Rouge
  '#00D4FF',  // Cyan
  '#50C832',  // Vert
  '#FFB800'   // Or
];
```

**Personnalisation par les joueurs :**
- Chaque joueur voit son groupe dans le header du lobby (vue joueur)
- Texte "Ton équipe" + nom éditable avec icône stylo (comme le pseudo)
- N'importe quel membre du groupe peut modifier le nom
- Mise à jour temps réel pour tous (hôte + autres joueurs)
- Validation : 2-20 caractères, pas de caractères spéciaux
- Firebase : `groups/{groupId}/name` éditable par membres du groupe

---

## 4. Fichiers à modifier/créer

### 4.1 Configuration

| Fichier | Action | Description |
|---------|--------|-------------|
| `lib/config/rooms.js` | Modifier | Ajouter `supportsPartyMode: true`, `hostName`, `groupCount` |

### 4.2 Hooks

| Fichier | Action | Description |
|---------|--------|-------------|
| `lib/hooks/useAlibiGroupRotation.js` | **Créer** | Hook rotation inspecteur/accusé/spectateur |
| `lib/hooks/useAlibiGroups.js` | **Créer** | Hook gestion groupes (assignation, alibis) |

### 4.3 Composants

| Fichier | Action | Description |
|---------|--------|-------------|
| `components/game-alibi/AlibiRoundTransition.jsx` | **Créer** | Modal "Groupe X interroge Groupe Y" |
| `components/game-alibi/AlibiGroupSelector.jsx` | **Créer** | Interface assignation joueurs → groupes |
| `components/game-alibi/AlibiSpectatorView.jsx` | **Créer** | Vue passive pour spectateurs |
| `components/game-alibi/AlibiInspectorView.jsx` | **Créer** | Vue inspecteur partagée (host/party) |
| `components/game-alibi/AlibiGroupNameEditor.jsx` | **Créer** | Éditeur nom de groupe (style pseudo) |
| `components/game-alibi/AlibiPartyEndScreen.jsx` | **Créer** | Écran de fin "Rapport d'enquête" |

### 4.4 Pages

| Fichier | Action | Description |
|---------|--------|-------------|
| `app/alibi/room/[code]/page.jsx` | Modifier | Support mode selector + groupes |
| `app/alibi/game/[code]/prep/page.jsx` | Modifier | Chaque groupe voit son alibi |
| `app/alibi/game/[code]/play/page.jsx` | Modifier | Render conditionnel par rôle |
| `app/alibi/game/[code]/end/page.jsx` | Modifier | Classement par groupe |

### 4.5 Autres

| Fichier | Action | Description |
|---------|--------|-------------|
| `lib/subscription.js` | Modifier | 4 alibis free en mode Party |
| Firebase Rules | Modifier | Permissions groupe inspecteur |

---

## 5. Checklist d'implémentation

### Phase 1: Configuration de base ✅
- [x] Modifier `lib/config/rooms.js` - ajouter support Party Mode
- [x] Ajouter constantes `ALIBI_GROUP_CONFIG` (noms, couleurs, questions/groupe)
- [x] Modifier `lib/subscription.js` - 4 alibis free en Party Mode

### Phase 2: Hooks ✅
- [x] Créer `lib/hooks/useAlibiGroups.js` - gestion groupes, assignation, alibis
- [x] Créer `lib/hooks/useAlibiGroupRotation.js` - rotation inspecteur/accusé/spectateur

### Phase 3: Composants UI ✅
- [x] Créer `AlibiGroupNameEditor.jsx` - Éditeur nom groupe (style pseudo)
- [x] Créer `AlibiRoundTransition.jsx` - Transition "Groupe X interroge Groupe Y"
- [x] Créer `AlibiPartyEndScreen.jsx` - Écran fin "Rapport d'enquête"
- [x] Créer `AlibiSpectatorView.jsx` - Vue spectateur temps réel
- [x] Créer `AlibiGroupSelector.jsx` - Interface assignation groupes
- [ ] Créer/Extraire `AlibiInspectorView.jsx` (Phase 6 - intégration play page)

### Phase 4: Lobby ✅
- [x] Modifier `room/[code]/page.jsx` - détection isPartyMode
- [x] Ajouter imports hooks et composants
- [x] Ajouter listener Firebase pour groups
- [x] Modifier auto-join host pour Party Mode
- [x] Modifier handleStartGame pour Party Mode
- [x] Ajouter interface assignation groupes (AlibiGroupSelector)
- [x] Ajouter sélection alibis par groupe
- [x] Modifier vue joueur pour Party Mode
- [x] Initialiser rotation au lancement
- [x] Ajouter styles CSS (my-group-banner, groups-grid-player, party-groups-card, etc.)

### Phase 5: Prep Page ✅
- [x] Modifier `prep/page.jsx` - détection Party Mode
- [x] Ajouter state et listeners pour groups/groupId
- [x] Chaque groupe voit son propre alibi (myGroupAlibi)
- [x] Affichage badge groupe dans le header
- [x] En Party Mode: tous les joueurs voient la vue "suspects" (mémoriser alibi)

### Phase 6: Play Page ✅
- [x] Modifier `play/page.jsx` - render conditionnel
- [x] Ajouter state/listeners pour meta, state, groups
- [x] Hook useAlibiGroupRotation pour rôles dynamiques
- [x] canControl/canAnswer basés sur myRole
- [x] Vue Inspecteur (groupe qui pose) - badge groupe + questions
- [x] Vue Accusé (groupe qui répond) - réponses individuelles
- [x] Vue Spectateur (AlibiSpectatorView) - temps réel
- [x] Intégrer AlibiRoundTransition entre rounds
- [x] Scoring par groupe (correct/total)

### Phase 7: End Page ✅
- [x] Modifier `end/page.jsx` - détection Party Mode
- [x] Ajouter state/listeners pour groups
- [x] Intégrer AlibiPartyEndScreen pour Party Mode
- [x] handleReturnToLobby reset scores groupe
- [x] Afficher classement par groupe avec % cohérence

### Phase 8: Finitions
- [ ] Firebase Rules - permissions groupes
- [ ] Tests complets
- [ ] Edge cases (déconnexions, groupes incomplets)

---

## 6. Éléments réutilisables

### Depuis Quiz/DeezTest

| Élément | Source | Usage Alibi |
|---------|--------|-------------|
| `GameModeSelector` | `components/ui/` | Modal choix mode (100%) |
| `useTeamMode` | `lib/hooks/` | Pattern + couleurs |
| `AskerTransition` | `components/game/` | Pattern pour `AlibiRoundTransition` |
| `useAskerRotation` | `lib/hooks/` | Pattern pour `useAlibiGroupRotation` |

### Depuis Alibi existant

| Élément | Usage |
|---------|-------|
| `VerdictTransition` | 100% réutilisable |
| `AlibiPhaseTransition` | 100% réutilisable |
| Vue accusé actuelle | Base pour accusés en Party |
| Vue inspecteur actuelle | Base pour `AlibiInspectorView` |

---

## 7. Écran de fin - Design "Rapport d'Enquête"

### Concept
Un écran de fin unique pour Alibi Party Mode, style **dossier de police / rapport d'enquête**.

### Structure visuelle
```
┌─────────────────────────────────────────┐
│  📋 RAPPORT D'ENQUÊTE                   │
│  ─────────────────────                  │
│                                         │
│  🏆 1er - [Nom Groupe]                  │
│     ████████████████░░ 87% de cohérence │
│     "Alibis quasi parfaits"             │
│                                         │
│  🥈 2ème - [Nom Groupe]                 │
│     ██████████████░░░░ 75% de cohérence │
│     "Quelques incohérences"             │
│                                         │
│  🥉 3ème - [Nom Groupe]                 │
│     ████████░░░░░░░░░░ 42% de cohérence │
│     "Alibis douteux"                    │
│                                         │
│  💀 4ème - [Nom Groupe]                 │
│     ███░░░░░░░░░░░░░░░ 16% de cohérence │
│     "Coupables évidents"                │
│                                         │
│        [ Rejouer ]  [ Quitter ]         │
└─────────────────────────────────────────┘
```

### Messages dynamiques selon %
| Pourcentage | Message |
|-------------|---------|
| 90-100% | "Alibis parfaits !" |
| 75-89% | "Alibis quasi parfaits" |
| 50-74% | "Quelques incohérences" |
| 25-49% | "Alibis douteux" |
| 0-24% | "Coupables évidents" |

### Éléments visuels
- Header style "tampon officiel" avec date
- Barres de progression avec couleur du groupe
- Animation d'apparition séquentielle (1er, puis 2ème, etc.)
- Confetti pour le groupe gagnant
- Icônes : 🏆 (1er), 🥈 (2ème), 🥉 (3ème), 💀 (4ème)

---

## 8. Questions résolues

| Question | Décision |
|----------|----------|
| Noms de groupes | Personnalisables par les joueurs (défaut: "Équipe 1", etc.) |
| Timer prep | Même durée pour tous (90s) |
| Qui répond | Tous les membres du groupe accusé répondent individuellement |
| Vue spectateur | Voient les réponses en temps réel (comme inspecteurs) |

---

## 9. Risques identifiés

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Complexité Firebase | Élevé | Bien structurer les données, tester offline |
| Sync multi-groupes | Moyen | Utiliser transactions Firebase |
| UX confusion rôles | Moyen | Transitions claires, badges permanents |
| Alibis insuffisants | Faible | Vérifier manifest, fallback si < 4 |

---

## 10. Estimations

| Phase | Complexité |
|-------|------------|
| Config + Hooks | Moyenne |
| Composants UI | Moyenne |
| Lobby | Élevée |
| Prep Page | Moyenne |
| Play Page | Élevée |
| End Page | Faible |
| Tests | Moyenne |

---

*Document créé le 2026-01-31*
