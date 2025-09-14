Let’sQueeeze — Live Quiz Buzzer (Next.js + Firebase)

Jeu de quiz “game show” multijoueur avec buzzer en temps réel, pensé pour les événements live (soirées, animations, concours).
Stack : Next.js 14 (App Router), TailwindCSS, Firebase Realtime Database + Auth anonyme, déployable sur Vercel. Optimisé jusqu’à ~50 joueurs.

✨ Fonctionnalités

Host (animateur) : crée une room (code 6 chars), révèle les questions, arbitre (✔/✘), passe, réinitialise les buzzers, termine la partie, voit les réponses et les scores (joueurs + équipes).

Players (joueurs) : rejoignent via code/QR, buzz (bouton fixe en bas), voient la question quand révélée, le compteur de points en direct, podium/top.

Mode équipes (2–4) : auto-assignation équilibrée, drag via select par joueur, couleurs d’équipe, scores d’équipe affichés côté joueurs (classement équipes pendant la partie) et écran fin.

Système de points à décroissance (configurable) : pause instantanée dès qu’un joueur buzze. Pénalité 8s si mauvaise réponse.

Sons : “reveal” (dévoilement) et “buzz”. Confettis/animations ready via CSS utilitaires.

Podium final : retour au lobby (host & joueurs) pour enchaîner un autre quiz sans recréer une room.

UX Host (lobby) : QR + partage ré-affichables, kick de joueurs, sélection quiz depuis /public/data/manifest.json.

🗺️ Routes clés

/ : choix Animateur ou Joueur

/host : création de room

/join : rejoindre avec code + pseudo

/room/[code] : lobby (Host : QR/partage, mode, équipes, kick, choix du quiz, start • Joueur : vue simplifiée d’attente)

/game/[code]/host : contrôles animateur (révéler, ✔/✘, passer, reset, scores)

/game/[code]/play : interface joueur (question, compteur, buzzer fixe)

/end/[code] : podium final + bouton Retour au lobby

🗃️ Schéma Firebase (RTDB)
rooms/{code}/meta
rooms/{code}/players/{uid}
rooms/{code}/questions/{qid}     (optionnel si vous chargez depuis /public/data/*.json)
rooms/{code}/state
rooms/{code}/history             (optionnel)
rooms/{code}/__health__          (optionnel)

⚙️ Configuration & Installation (local)

Prérequis : Node.js 18+

Installer :

npm install
npm run dev
# Ouvre http://localhost:3000


Firebase : les clés sont déjà intégrées dans lib/firebase.js (Auth anonyme + RTDB).

Sons (obligatoire) : place public/sounds/reveal.mp3 et public/sounds/buzz.mp3.

📦 Build & Prod
npm run build
npm start

🧩 Quizz – Format & Manifest

Ajoute vos quizz dans public/data/*.json avec le format :

{
  "id": "friends",
  "title": "Friends",
  "items": [
    { "question": "…", "answer": "…", "difficulty": "normal", "category": "…" },
    { "question": "…", "answer": "…", "difficulty": "difficile", "category": "…" }
  ]
}


En VF/VO, inclure les deux libellés dans la même réponse si utile (ex : Holiday Armadillo / Tatou de Noël).

Déclare le quiz dans public/data/manifest.json :

{
  "quizzes": [
    { "id": "general", "title": "Général" },
    { "id": "friends", "title": "Friends" },
    { "id": "ma-famille-dabord", "title": "Ma Famille D'abord" }
  ]
}
