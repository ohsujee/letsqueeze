/**
 * HowToPlayModal — Données des jeux
 * Extraites de components/ui/HowToPlayModal.jsx pour lisibilité
 */

import {
  Users, Clock, Crosshair, Lightning, CheckCircle, XCircle,
  MusicNote, Play, Trophy, Timer, MagnifyingGlass, Shield,
  ChatCircle, FileText, Warning
} from '@phosphor-icons/react';

export const GAMES_DATA = {
  quiz: {
    id: 'quiz',
    title: 'Quiz Buzzer',
    subtitle: 'Le classique des soirées !',
    accentColor: '#8b5cf6',
    accentGradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    glowColor: 'rgba(139, 92, 246, 0.4)',
    sections: [
      {
        id: 'concept',
        title: 'Le concept',
        icon: Crosshair,
        content: {
          type: 'intro',
          text: "L'hôte pose des questions, les joueurs buzzent pour répondre. Le plus rapide gagne le droit de répondre !"
        }
      },
      {
        id: 'modes',
        title: 'Les modes de jeu',
        icon: Users,
        content: {
          type: 'modes',
          modes: [
            {
              name: "Mode Game Master",
              emoji: '🎙️',
              description: "Un hôte anime la partie : il lit les questions, valide les réponses et gère le rythme. Il ne joue pas.",
              color: '#8b5cf6'
            },
            {
              name: "Mode Party",
              emoji: '🎉',
              description: "Tout le monde joue ! À tour de rôle, un joueur devient l'animateur et lit la question. Il ne peut pas buzzer sur sa propre question.",
              color: '#22c55e'
            }
          ]
        }
      },
      {
        id: 'flow',
        title: 'Déroulement',
        icon: Play,
        content: {
          type: 'steps',
          steps: [
            { number: 1, title: "L'animateur lit la question", description: "À voix haute pour tous les joueurs" },
            { number: 2, title: "Les joueurs buzzent", description: "Le premier à buzzer peut répondre" },
            { number: 3, title: "L'animateur valide", description: "Bonne réponse = points, mauvaise réponse = pénalité et déduction de points" },
            { number: 4, title: "Question suivante", description: "Jusqu'à la fin du quiz" }
          ]
        }
      },
      {
        id: 'scoring',
        title: 'Les points',
        icon: Trophy,
        content: {
          type: 'scoring',
          items: [
            { label: "Bonne réponse", value: "+100 pts", icon: CheckCircle, color: '#22c55e' },
            { label: "Mauvaise réponse", value: "-25 pts", icon: XCircle, color: '#ef4444' },
            { label: "Pénalité", value: "8 sec de blocage", icon: Timer, color: '#f59e0b' }
          ],
          note: "Après une mauvaise réponse, tu ne peux plus buzzer pendant 8 secondes !"
        }
      }
    ]
  },

  deeztest: {
    id: 'deeztest',
    title: 'Blind Test',
    subtitle: 'Reconnais la musique !',
    accentColor: '#A238FF',
    accentGradient: 'linear-gradient(135deg, #A238FF, #FF0092)',
    glowColor: 'rgba(162, 56, 255, 0.5)',
    sections: [
      {
        id: 'concept',
        title: 'Le concept',
        icon: MusicNote,
        content: {
          type: 'intro',
          text: "Un extrait musical est joué, les joueurs doivent reconnaître le titre et l'artiste. Moins tu as besoin d'écouter pour trouver, plus tu gagnes de points !"
        }
      },
      {
        id: 'library',
        title: 'La bibliothèque',
        icon: MusicNote,
        content: {
          type: 'intro',
          text: "🎧 Toute la bibliothèque Deezer est à ta disposition ! Des millions de titres, toutes les playlists, tous les genres. Cherche n'importe quel artiste ou playlist et lance la partie !"
        }
      },
      {
        id: 'timeline',
        title: 'La timeline',
        icon: Timer,
        content: {
          type: 'timeline-simple',
          description: "L'extrait se dévoile progressivement par paliers : 1.5s → 3s → 10s → 25s. Chaque palier doit être débloqué dans l'ordre.",
          note: "L'hôte clique sur un palier pour jouer l'extrait. Si personne ne trouve, il passe au palier suivant qui dévoile plus de la chanson."
        }
      },
      {
        id: 'flow',
        title: 'Déroulement',
        icon: Play,
        content: {
          type: 'steps',
          steps: [
            { number: 1, title: "L'hôte lance l'extrait", description: "Clique sur un niveau de la timeline", icon: Play },
            { number: 2, title: "Écoute et buzz", description: "Dès que tu reconnais, buzz !", icon: Lightning },
            { number: 3, title: "Réponds à voix haute", description: "Titre et/ou artiste selon les règles du groupe" },
            { number: 4, title: "Révélation du son", description: "Titre, artiste et pochette révélés, tout le monde écoute l'extrait" }
          ]
        }
      },
      {
        id: 'scoring',
        title: 'Les points',
        icon: Trophy,
        content: {
          type: 'scoring',
          items: [
            { label: "Buzz à 1.5s", value: "+200 pts", icon: Lightning, color: '#22c55e' },
            { label: "Buzz à 3s", value: "+150 pts", icon: Lightning, color: '#84cc16' },
            { label: "Buzz à 10s", value: "+100 pts", icon: Lightning, color: '#f59e0b' },
            { label: "Buzz à 25s", value: "+50 pts", icon: Lightning, color: '#ef4444' }
          ],
          note: "Les points diminuent au fil de l'extrait. Mauvaise réponse = -25 pts + 8 sec de blocage."
        }
      },
    ]
  },

  alibi: {
    id: 'alibi',
    title: 'Alibi',
    subtitle: 'Interrogatoire intense !',
    accentColor: '#f59e0b',
    accentGradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    sections: [
      {
        id: 'concept',
        title: 'Le concept',
        icon: MagnifyingGlass,
        content: {
          type: 'intro',
          text: "Les suspects ont un alibi commun. Les inspecteurs les interrogent pour trouver des incohérences entre leurs réponses."
        }
      },
      {
        id: 'roles',
        title: 'Les rôles',
        icon: Users,
        content: {
          type: 'roles',
          roles: [
            {
              name: "Les Inspecteurs",
              emoji: '🔍',
              description: "Posent des questions aux suspects et cherchent les incohérences dans leurs réponses.",
              color: '#06b6d4'
            },
            {
              name: "Les Suspects",
              emoji: '🎭',
              description: "Doivent se souvenir parfaitement de leur alibi commun et répondre de manière identique.",
              color: '#f59e0b'
            }
          ]
        }
      },
      {
        id: 'phases',
        title: 'Les phases',
        icon: Clock,
        content: {
          type: 'phases',
          phases: [
            {
              name: "Préparation",
              duration: "1 min 30",
              description: "Les suspects lisent et mémorisent leur alibi ensemble. Les inspecteurs prennent connaissance des questions.",
              icon: FileText,
              color: '#8b5cf6'
            },
            {
              name: "Interrogatoire",
              duration: "10 questions",
              description: "Les inspecteurs posent des questions. Chaque suspect répond en 30 secondes.",
              icon: ChatCircle,
              color: '#f59e0b'
            },
            {
              name: "Verdict",
              duration: "À la fin",
              description: "Les inspecteurs votent : les réponses étaient-elles cohérentes ?",
              icon: Shield,
              color: '#22c55e'
            }
          ]
        }
      },
      {
        id: 'scoring',
        title: 'Qui gagne ?',
        icon: Trophy,
        content: {
          type: 'verdict-inline',
          outcomes: [
            {
              title: "Les Suspects gagnent",
              condition: "Si plus de 50% des réponses sont jugées cohérentes",
              icon: Shield,
              color: '#22c55e'
            },
            {
              title: "Les Inspecteurs gagnent",
              condition: "Si plus de 50% des réponses sont jugées incohérentes",
              icon: MagnifyingGlass,
              color: '#ef4444'
            }
          ]
        }
      }
    ]
  },

  laregle: {
    id: 'laregle',
    title: 'La Règle',
    subtitle: 'Trouve la règle secrète !',
    accentColor: '#06b6d4',
    accentGradient: 'linear-gradient(135deg, #06b6d4, #0891b2)',
    glowColor: 'rgba(6, 182, 212, 0.4)',
    sections: [
      {
        id: 'concept',
        title: 'Le concept',
        icon: Crosshair,
        content: {
          type: 'intro',
          text: "Les joueurs choisissent une règle secrète. Les enquêteurs doivent la deviner en observant les interactions et en posant des questions !"
        }
      },
      {
        id: 'flow',
        title: 'Déroulement',
        icon: Play,
        content: {
          type: 'steps',
          steps: [
            { number: 1, title: "Mise à l'écart", description: "Les enquêteurs s'éloignent pendant que les joueurs choisissent la règle sur leur téléphone" },
            { number: 2, title: "Choix de la règle", description: "Les joueurs choisissent une règle secrète" },
            { number: 3, title: "Discussion libre", description: "Les enquêteurs reviennent et observent" },
            { number: 4, title: "Élimination", description: "Si un joueur ne respecte pas la règle, ses coéquipiers peuvent l'éliminer. Le joueur éliminé peut contester s'il a été éliminé par erreur." },
            { number: 5, title: "3 tentatives", description: "Pour deviner la règle secrète" }
          ]
        }
      },
      {
        id: 'scoring',
        title: 'Qui gagne ?',
        icon: Trophy,
        content: {
          type: 'verdict-inline',
          outcomes: [
            {
              title: "Les Enquêteurs gagnent",
              condition: "S'ils trouvent la règle en 3 tentatives ou moins",
              icon: MagnifyingGlass,
              color: '#22c55e'
            },
            {
              title: "Les Joueurs gagnent",
              condition: "Si les enquêteurs échouent après 3 tentatives ou ne trouvent pas avant la fin du temps imparti",
              icon: Users,
              color: '#06b6d4'
            }
          ]
        }
      }
    ]
  },

  motmystere: {
    id: 'motmystere',
    title: 'Mot Mystère',
    subtitle: 'Trouve le mot en 6 essais !',
    accentColor: '#10b981',
    accentGradient: 'linear-gradient(135deg, #059669, #10b981)',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    sections: [
      {
        id: 'concept',
        title: 'Le concept',
        icon: Crosshair,
        content: {
          type: 'intro',
          text: 'Chaque jour, un mot de 5 lettres est choisi. Tu as 6 essais pour le deviner. Après chaque essai, les cases changent de couleur pour t\'indiquer où tu en es.'
        }
      },
      {
        id: 'colors',
        title: 'Les couleurs',
        icon: CheckCircle,
        content: {
          type: 'wordle-colors',
          examples: [
            {
              word: 'PLAGE',
              highlight: 2,
              state: 'correct',
              label: 'La lettre A est dans le mot, à la bonne place.'
            },
            {
              word: 'COEUR',
              highlight: 1,
              state: 'present',
              label: 'La lettre O est dans le mot, mais pas à la bonne place.'
            },
            {
              word: 'BRUIT',
              highlight: 3,
              state: 'absent',
              label: 'La lettre I n\'est pas dans le mot.'
            }
          ]
        }
      },
      {
        id: 'scoring',
        title: 'Le score',
        icon: Trophy,
        content: {
          type: 'scoring',
          items: [
            { label: 'Trouvé en 1 essai', value: '6 000 pts', icon: Lightning, color: '#10b981' },
            { label: 'Trouvé en 2 essais', value: '5 000 pts', icon: Lightning, color: '#10b981' },
            { label: 'Trouvé en 6 essais', value: '1 000 pts', icon: Lightning, color: '#f59e0b' },
            { label: 'Bonus rapidité', value: '+999 pts max', icon: Timer, color: '#06b6d4' }
          ],
          note: 'Le nombre d\'essais est toujours dominant. Le bonus temps ajoute jusqu\'à 999 pts si tu trouves très rapidement.'
        }
      }
    ]
  },

  semantique: {
    id: 'semantique',
    title: 'Sémantique',
    subtitle: 'Trouve le mot par proximité !',
    accentColor: '#f97316',
    accentGradient: 'linear-gradient(135deg, #ea580c, #f97316)',
    glowColor: 'rgba(249, 115, 22, 0.4)',
    sections: [
      {
        id: 'concept',
        title: 'Le concept',
        icon: Crosshair,
        content: {
          type: 'intro',
          text: 'Chaque jour, un mot secret est choisi. Entre n\'importe quel mot et tu reçois une température : plus elle est élevée, plus tu es proche du mot cible. Tu peux essayer autant de fois que tu veux !'
        }
      },
      {
        id: 'temperature',
        title: 'La température',
        icon: Lightning,
        content: {
          type: 'scoring',
          items: [
            { label: '🧊 Glacial', value: '< 0°C', icon: Lightning, color: '#64748b' },
            { label: '🥶 Froid', value: '0 – 20°C', icon: Lightning, color: '#3b82f6' },
            { label: '😎 Chaud', value: '20 – 40°C', icon: Lightning, color: '#f59e0b' },
            { label: '🔥 Brûlant', value: '≥ 40°C', icon: Lightning, color: '#ef4444' },
          ],
          note: '😱 Bouillant à ≥ 50°C — et 🎯 à 100°C : tu as trouvé !'
        }
      },
      {
        id: 'scoring',
        title: 'Le score',
        icon: Trophy,
        content: {
          type: 'scoring',
          items: [
            { label: 'Trouvé en 1 essai', value: '5 000 pts', icon: Lightning, color: '#f97316' },
            { label: 'Trouvé en 10 essais', value: '~3 450 pts', icon: Lightning, color: '#f97316' },
            { label: 'Trouvé en 50 essais', value: '~1 450 pts', icon: Lightning, color: '#f59e0b' },
          ],
          note: 'La formule est plus généreuse qu\'avant : même en prenant 50 essais, tu gardes plus de 1 000 pts !'
        }
      }
    ]
  },

  'semantique-v2': {
    id: 'semantique-v2',
    title: 'Sémantique',
    subtitle: 'Trouve le mot par proximité !',
    accentColor: '#e67e22',
    accentGradient: 'linear-gradient(135deg, #d35400, #e67e22)',
    glowColor: 'rgba(230, 126, 34, 0.4)',
    sections: [
      {
        id: 'concept',
        title: 'Le concept',
        icon: Crosshair,
        content: {
          type: 'intro',
          text: 'Chaque jour, un mot secret est choisi. Entre n\'importe quel mot français et tu reçois une température basée sur la proximité sémantique avec le mot cible. Plus c\'est chaud, plus tu t\'approches !'
        }
      },
      {
        id: 'ranking',
        title: 'Le rang (top 1000)',
        icon: MagnifyingGlass,
        content: {
          type: 'intro',
          text: 'Les 1 000 mots les plus proches voisins du mot du jour ont un rang de 1 à 999 (999 = le plus proche). Si ton mot est dans ce top 1 000, tu verras son rang et une barre de progression. Sinon, tu verras uniquement la température — continue à chercher !'
        }
      },
      {
        id: 'temperature',
        title: 'La température',
        icon: Lightning,
        content: {
          type: 'scoring',
          items: [
            { label: '🧊 Glacial', value: '< 0°C', icon: Lightning, color: '#64748b' },
            { label: '🥶 Froid', value: '0 – 20°C', icon: Lightning, color: '#3b82f6' },
            { label: '😎 Chaud', value: '20 – 40°C', icon: Lightning, color: '#f59e0b' },
            { label: '🔥 Brûlant', value: '≥ 40°C', icon: Lightning, color: '#ef4444' },
          ],
          note: '😱 Bouillant à ≥ 50°C — et 🎯 à 100°C : tu as trouvé !'
        }
      },
      {
        id: 'scoring',
        title: 'Le score',
        icon: Trophy,
        content: {
          type: 'scoring',
          items: [
            { label: 'Base de départ', value: '5 000 pts', icon: Lightning, color: '#e67e22' },
            { label: '10 essais', value: '~3 450 pts', icon: Lightning, color: '#e67e22' },
            { label: '25 essais', value: '~2 200 pts', icon: Lightning, color: '#f59e0b' },
            { label: '50 essais', value: '~1 450 pts', icon: Lightning, color: '#f59e0b' },
          ],
          note: 'Tu pars de 5 000 points et le score diminue à chaque essai. Pas de panique : même en 50 essais, tu gardes plus de 1 000 pts !'
        }
      }
    ]
  },

  total: {
    id: 'total',
    title: 'Total',
    subtitle: 'Le compte est bon !',
    accentColor: '#3b82f6',
    accentGradient: 'linear-gradient(135deg, #2563eb, #3b82f6)',
    glowColor: 'rgba(59, 130, 246, 0.4)',
    sections: [
      {
        id: 'concept',
        title: 'Le concept',
        icon: Crosshair,
        content: {
          type: 'intro',
          text: 'Chaque jour, 6 chiffres et un nombre cible. Utilise les 6 chiffres avec +, −, × et ÷ pour atteindre la cible. Tu as 3 minutes et 3 essais !'
        }
      },
      {
        id: 'example',
        title: 'Comment ça marche',
        icon: Lightning,
        content: {
          type: 'total-example',
          target: 493,
          numbers: [3, 7, 50, 2, 4, 1],
          steps: [
            { a: 3, op: '+', b: 7, result: 10 },
            { a: 10, op: '×', b: 50, result: 500 },
            { a: 500, op: '−', b: 2, result: 498 },
            { a: 498, op: '−', b: 4, result: 494 },
            { a: 494, op: '−', b: 1, result: 493 },
          ],
          note: 'Le calcul se fait étape par étape : chaque résultat sert de base au calcul suivant. Pas besoin de parenthèses !'
        }
      },
      {
        id: 'rules',
        title: 'Les règles',
        icon: CheckCircle,
        content: {
          type: 'scoring',
          items: [
            { label: 'Les 6 chiffres', value: 'Tous obligatoires', icon: Crosshair, color: '#8b5cf6' },
            { label: '3 essais', value: 'Ton meilleur compte', icon: Shield, color: '#06b6d4' },
            { label: 'Timer', value: '3 minutes', icon: Timer, color: '#f59e0b' },
            { label: 'Quitter l\'app', value: 'Fin de partie', icon: Warning, color: '#ef4444' },
          ],
          note: 'Le résultat exact est toujours atteignable. Si tu ne le trouves pas, rapproche-toi le plus possible !'
        }
      },
      {
        id: 'scoring',
        title: 'Le score',
        icon: Trophy,
        content: {
          type: 'scoring',
          items: [
            { label: 'Compte exact', value: '5 000+ pts', icon: Lightning, color: '#10b981' },
            { label: 'Écart 5', value: '~4 700 pts', icon: Lightning, color: '#3b82f6' },
            { label: 'Écart 25', value: '~3 500 pts', icon: Lightning, color: '#f59e0b' },
            { label: 'Écart 50+', value: '~2 000 pts', icon: Lightning, color: '#f97316' },
          ],
          note: 'Chaque essai sauvegarde ton meilleur score. Plus tu es rapide, plus tu gagnes !'
        }
      }
    ]
  },

  mime: {
    id: 'mime',
    title: 'Mime',
    subtitle: 'Fais deviner sans parler !',
    accentColor: '#059669',
    accentGradient: 'linear-gradient(135deg, #059669, #047857)',
    glowColor: 'rgba(52, 211, 153, 0.4)',
    sections: [
      {
        id: 'concept',
        title: 'Le concept',
        icon: Crosshair,
        content: {
          type: 'intro',
          text: "Un joueur mime un mot secret que les autres doivent deviner. Plus vite le mot est trouvé, plus le mimeur ET le devineur gagnent de points !"
        }
      },
      {
        id: 'flow',
        title: 'Déroulement',
        icon: Play,
        content: {
          type: 'steps',
          steps: [
            { number: 1, title: "Découvre le mot", description: "Glisse pour révéler le mot secret" },
            { number: 2, title: "Mime !", description: "Fais deviner le mot sans parler ni faire de sons" },
            { number: 3, title: "Buzz et réponds", description: "Les joueurs buzzent pour proposer une réponse" },
            { number: 4, title: "Mimeur suivant", description: "Un autre joueur est choisi aléatoirement" }
          ]
        }
      },
      {
        id: 'scoring',
        title: 'Les points',
        icon: Trophy,
        content: {
          type: 'scoring',
          items: [
            { label: "Devineur (rapide)", value: "jusqu'à +100 pts", icon: Lightning, color: '#22c55e' },
            { label: "Mimeur (rapide)", value: "jusqu'à +50 pts", icon: CheckCircle, color: '#059669' },
            { label: "Mauvaise réponse", value: "-25 pts", icon: XCircle, color: '#ef4444' },
            { label: "Pénalité", value: "8 sec de blocage", icon: Timer, color: '#f59e0b' }
          ],
          note: "Les points diminuent avec le temps : plus vite le mot est trouvé, plus les deux joueurs gagnent de points !"
        }
      }
    ]
  },

  lol: {
    id: 'lol',
    title: 'LOL',
    subtitle: 'Qui rit, sort !',
    accentColor: '#EF4444',
    accentGradient: 'linear-gradient(135deg, #EF4444, #DC2626)',
    glowColor: 'rgba(239, 68, 68, 0.4)',
    sections: [
      {
        id: 'concept',
        title: 'Le concept',
        icon: Crosshair,
        content: {
          type: 'intro',
          text: "Inspiré de LOL: Qui rit, sort ! Tous les joueurs sont enfermés ensemble. Le but : faire rire les autres sans craquer soi-même. Si tu rigoles, tu prends un carton !"
        }
      },
      {
        id: 'modes',
        title: "Les modes d'élimination",
        icon: Shield,
        content: {
          type: 'modes',
          modes: [
            {
              name: "Classique",
              emoji: '🛡️',
              description: "2 cartons jaunes = 1 carton rouge = éliminé. Tu as droit à une erreur !",
              color: '#f59e0b'
            },
            {
              name: "Impitoyable",
              emoji: '💀',
              description: "1 seul carton jaune = carton rouge direct = éliminé. Aucune seconde chance !",
              color: '#ef4444'
            }
          ]
        }
      },
      {
        id: 'flow',
        title: 'Déroulement',
        icon: Play,
        content: {
          type: 'steps',
          steps: [
            { number: 1, title: "Le timer tourne", description: "La partie dure 15, 30 ou 45 minutes. Gardez votre sérieux !" },
            { number: 2, title: "Accuse quelqu'un", description: "Tu vois quelqu'un rire ? Appuie sur \"A rigolé !\" et choisis le joueur" },
            { number: 3, title: "Vote collectif", description: "Tout le monde vote : le joueur a-t-il vraiment ri ? Majorité décide." },
            { number: 4, title: "Carton !", description: "Si la majorité vote OUI → carton jaune (ou rouge en Impitoyable)" },
            { number: 5, title: "Auto-signalement", description: "Tu as ri et tu le sais ? Signale-toi toi-même : carton automatique, pas de vote" }
          ]
        }
      },
      {
        id: 'jokers',
        title: 'Les Jokers',
        icon: Lightning,
        content: {
          type: 'roles',
          roles: [
            {
              name: "Stand-Up",
              emoji: '🎤',
              description: "Lis un monologue comique devant tout le monde. Un script complet t'est fourni !",
              color: '#8b5cf6'
            },
            {
              name: "Scènes",
              emoji: '🎭',
              description: "Joue une scène improvisée avec un ou plusieurs partenaires. Chacun reçoit son rôle.",
              color: '#f59e0b'
            },
            {
              name: "Jeux Collectifs",
              emoji: '🎪',
              description: "Lance un mini-jeu auquel TOUT LE MONDE participe. Idéal pour faire craquer le groupe !",
              color: '#22c55e'
            }
          ]
        }
      },
      {
        id: 'elimination',
        title: 'Élimination',
        icon: Warning,
        content: {
          type: 'scoring',
          items: [
            { label: "Carton jaune", value: "1er avertissement", icon: Warning, color: '#f59e0b' },
            { label: "Carton rouge", value: "Éliminé !", icon: XCircle, color: '#ef4444' },
            { label: "Joker", value: "1 par joueur", icon: Lightning, color: '#8b5cf6' },
            { label: "Dernier debout", value: "Gagne la partie !", icon: Trophy, color: '#22c55e' }
          ],
          note: "La partie se termine quand le timer arrive à zéro ou quand il ne reste plus qu'un seul joueur."
        }
      }
    ]
  },

  mindlink: {
    id: 'mindlink',
    title: 'Mind Link',
    subtitle: 'Synchronisez vos esprits !',
    accentColor: '#ec4899',
    accentGradient: 'linear-gradient(135deg, #ec4899, #db2777)',
    glowColor: 'rgba(236, 72, 153, 0.4)',
    sections: [
      {
        id: 'concept',
        title: 'Le concept',
        icon: Crosshair,
        content: {
          type: 'intro',
          text: "Un mot secret est caché. Les attaquants doivent le deviner en communiquant par indices, tandis que les défenseurs protègent le mot et tentent d'intercepter les échanges !"
        }
      },
      {
        id: 'roles',
        title: 'Les rôles',
        icon: Users,
        content: {
          type: 'roles',
          roles: [
            {
              name: "Les Attaquants",
              emoji: '⚔️',
              description: "Donnent des indices à un mot et tentent de penser au même mot qu'un coéquipier. Si deux attaquants disent le même mot, c'est un Link réussi !",
              color: '#ec4899'
            },
            {
              name: "Les Défenseurs",
              emoji: '🛡️',
              description: "Connaissent le mot secret. Ils observent les indices et peuvent intercepter un Link s'ils devinent le mot échangé. Après un Link réussi, ils choisissent de révéler ou non une lettre.",
              color: '#3b82f6'
            }
          ]
        }
      },
      {
        id: 'flow',
        title: 'Le Link',
        icon: Lightning,
        content: {
          type: 'steps',
          steps: [
            { number: 1, title: "Un indice", description: "Un attaquant donne un indice d'un mot en rapport avec le mot secret" },
            { number: 2, title: "Link !", description: "Un autre attaquant pense avoir compris l'indice et demande à linker" },
            { number: 3, title: "Le même mot ?", description: "Les deux disent (ou écrivent) un mot en même temps. Si c'est le même mot → Link réussi !" },
            { number: 4, title: "Révélation", description: "Sur un Link réussi, le défenseur choisit de révéler une lettre supplémentaire du mot secret ou non" }
          ]
        }
      },
      {
        id: 'example',
        title: 'Exemple',
        icon: FileText,
        content: {
          type: 'mindlink-example',
          accentColor: '#ec4899',
          intro: "Le mot secret est CARNAVAL. Les attaquants voient les lettres déjà révélées et doivent trouver des mots commençant par ces lettres.",
          word: 'CARNAVAL',
          revealedCount: 2,
          scenario: [
            { emoji: '👀', text: "Les attaquants voient : C A _ _ _ _ _ _. Ils savent que le mot commence par CA.", highlight: false },
            { emoji: '💡', text: "Alice donne l'indice « cheval » car elle pense à CAVALIER (qui commence par CA).", highlight: false },
            { emoji: '🔗', text: "Bob pense aussi à CAVALIER ! Il appuie sur Link !", highlight: true },
            { emoji: '🎯', text: "Les deux disent leur mot : si c'est le même → Link réussi ! Sinon, on continue.", highlight: false },
            { emoji: '🛡️', text: "Attention : le défenseur peut intercepter s'il devine le mot échangé !", highlight: false },
          ],
          note: "⚡ En mode écrit, le mot que tu proposes doit obligatoirement commencer par les lettres déjà révélées (ici CA)."
        }
      },
      {
        id: 'modes',
        title: 'Les modes',
        icon: ChatCircle,
        content: {
          type: 'modes',
          modes: [
            {
              name: "Oral",
              emoji: '🎙️',
              description: "Les joueurs disent leur mot à voix haute en même temps. Le défenseur valide le résultat.",
              color: '#22c55e'
            },
            {
              name: "Écrit",
              emoji: '✍️',
              description: "Les joueurs écrivent leur mot sur leur téléphone. La comparaison est automatique. Le mot doit commencer par les lettres déjà révélées.",
              color: '#3b82f6'
            }
          ]
        }
      },
      {
        id: 'scoring',
        title: 'Qui gagne ?',
        icon: Trophy,
        content: {
          type: 'verdict-inline',
          outcomes: [
            {
              title: "Les Attaquants gagnent",
              condition: "S'ils devinent le mot secret avant la fin du temps imparti",
              icon: Lightning,
              color: '#22c55e'
            },
            {
              title: "Les Défenseurs gagnent",
              condition: "Si le timer arrive à zéro sans que le mot n'ait été trouvé",
              icon: Shield,
              color: '#ec4899'
            }
          ]
        }
      }
    ]
  },

  memory: {
    id: 'memory',
    title: 'Memory',
    subtitle: 'Mémorise, rappelle-toi !',
    accentColor: '#ec4899',
    accentGradient: 'linear-gradient(135deg, #db2777, #ec4899)',
    glowColor: 'rgba(236, 72, 153, 0.4)',
    sections: [
      {
        id: 'concept',
        title: 'Le concept',
        icon: Crosshair,
        content: {
          type: 'intro',
          text: "Un défi de mémoire pur : mémorise ce que tu vois, puis reproduis-le de mémoire. Chaque round te présente un type de défi différent — cases allumées, formes, chiffres, codes, couleurs… Le jeu s'adapte et s'intensifie au fil des rounds !"
        }
      },
      {
        id: 'types',
        title: 'Les types de défis',
        icon: Lightning,
        content: {
          type: 'roles',
          roles: [
            { name: "Cases allumées", emoji: '🟦', description: "Mémorise quelles cases d'une grille sont allumées, puis reproduis le motif.", color: '#3b82f6' },
            { name: "Formes", emoji: '🔺', description: "Des formes géométriques apparaissent brièvement. Rappelle-toi lesquelles et dans quel ordre.", color: '#ec4899' },
            { name: "Chiffres & Codes", emoji: '🔢', description: "Retiens une séquence de chiffres ou un code affiché pendant quelques secondes.", color: '#f97316' },
            { name: "Et plus encore…", emoji: '🎲', description: "Couleurs, symboles, positions — chaque partie peut te surprendre avec un nouveau type de défi.", color: '#a855f7' }
          ]
        }
      },
      {
        id: 'flow',
        title: 'Déroulement',
        icon: Play,
        content: {
          type: 'steps',
          steps: [
            { number: 1, title: "Observe", description: "Le défi s'affiche pendant quelques secondes. Concentre-toi !" },
            { number: 2, title: "Mémorise", description: "Le défi disparaît. À toi de te souvenir." },
            { number: 3, title: "Reproduis", description: "Restitue ce que tu as mémorisé avant la fin du timer." },
            { number: 4, title: "Round suivant", description: "La difficulté augmente progressivement." }
          ]
        }
      },
      {
        id: 'scoring',
        title: 'Les points',
        icon: Trophy,
        content: {
          type: 'scoring',
          items: [
            { label: "Réponse parfaite", value: "+100 pts", icon: CheckCircle, color: '#22c55e' },
            { label: "Réponse partielle", value: "+25 à +75 pts", icon: Lightning, color: '#f59e0b' },
            { label: "Bonus rapidité", value: "jusqu'à +50 pts", icon: Timer, color: '#06b6d4' },
            { label: "Erreur", value: "0 pt", icon: XCircle, color: '#ef4444' }
          ],
          note: "Chaque élément correctement mémorisé rapporte des points. Plus vite tu réponds, plus le bonus est élevé !"
        }
      }
    ]
  }
};

// Alias: game card uses 'blindtest' but data key is 'deeztest'
GAMES_DATA.blindtest = GAMES_DATA.deeztest;
