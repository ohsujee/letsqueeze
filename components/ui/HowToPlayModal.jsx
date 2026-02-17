'use client';

/**
 * HowToPlayModal - V2
 * Modal "Comment jouer" avec sections navigables
 * Accessible depuis: GameCard (?), LobbySettings (host), Lobby (players)
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Users, Clock, Target, Zap, CheckCircle, XCircle,
  Music, Play, Trophy, Timer, UserSearch, Shield,
  MessageCircle, FileText, AlertTriangle, ChevronRight
} from 'lucide-react';

// ============================================
// GAME DATA - Structure for each game
// ============================================

const GAMES_DATA = {
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
        icon: Target,
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
        icon: Music,
        content: {
          type: 'intro',
          text: "Un extrait musical est joué, les joueurs doivent reconnaître le titre et l'artiste. Moins tu as besoin d'écouter pour trouver, plus tu gagnes de points !"
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
            { number: 2, title: "Écoute et buzz", description: "Dès que tu reconnais, buzz !", icon: Zap },
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
            { label: "Buzz à 1.5s", value: "+200 pts", icon: Zap, color: '#22c55e' },
            { label: "Buzz à 3s", value: "+150 pts", icon: Zap, color: '#84cc16' },
            { label: "Buzz à 10s", value: "+100 pts", icon: Zap, color: '#f59e0b' },
            { label: "Buzz à 25s", value: "+50 pts", icon: Zap, color: '#ef4444' }
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
        icon: UserSearch,
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
              icon: MessageCircle,
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
              icon: UserSearch,
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
        icon: Target,
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
            { number: 1, title: "Les enquêteurs sortent", description: "Ils quittent la pièce ou ferment les yeux" },
            { number: 2, title: "Choix de la règle", description: "Les joueurs choisissent une règle secrète" },
            { number: 3, title: "Discussion libre", description: "Les enquêteurs reviennent et observent" },
            { number: 4, title: "3 tentatives", description: "Pour deviner la règle secrète" }
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
              icon: UserSearch,
              color: '#22c55e'
            },
            {
              title: "Les Joueurs gagnent",
              condition: "Si les enquêteurs échouent après 3 tentatives",
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
        icon: Target,
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
            { label: 'Trouvé en 1 essai', value: '6 000 pts', icon: Zap, color: '#10b981' },
            { label: 'Trouvé en 2 essais', value: '5 000 pts', icon: Zap, color: '#10b981' },
            { label: 'Trouvé en 6 essais', value: '1 000 pts', icon: Zap, color: '#f59e0b' },
            { label: 'Bonus rapidité', value: '+3 000 pts max', icon: Timer, color: '#06b6d4' }
          ],
          note: 'Un timer invisible démarre à ton premier essai. Plus tu es rapide, plus le bonus est élevé !'
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
        icon: Target,
        content: {
          type: 'intro',
          text: 'Chaque jour, un mot secret est choisi. Entre n\'importe quel mot et tu reçois une température : plus elle est élevée, plus tu es proche du mot cible. Tu peux essayer autant de fois que tu veux !'
        }
      },
      {
        id: 'temperature',
        title: 'La température',
        icon: Zap,
        content: {
          type: 'scoring',
          items: [
            { label: '🧊 Glacial', value: '< 0°C', icon: Zap, color: '#64748b' },
            { label: '🥶 Froid', value: '0 – 20°C', icon: Zap, color: '#3b82f6' },
            { label: '😎 Chaud', value: '20 – 40°C', icon: Zap, color: '#f59e0b' },
            { label: '🔥 Brûlant', value: '≥ 40°C', icon: Zap, color: '#ef4444' },
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
            { label: 'Trouvé en 1 essai', value: '5 000 pts', icon: Zap, color: '#f97316' },
            { label: 'Trouvé en 10 essais', value: '500 pts', icon: Zap, color: '#f97316' },
            { label: 'Trouvé en 50 essais', value: '100 pts', icon: Zap, color: '#f59e0b' },
          ],
          note: 'Formule : 5000 ÷ nombre d\'essais. Moins d\'essais = plus de points !'
        }
      }
    ]
  },

  mime: {
    id: 'mime',
    title: 'Mime',
    subtitle: 'Fais deviner sans parler !',
    accentColor: '#00ff66',
    accentGradient: 'linear-gradient(135deg, #00ff66, #00cc52)',
    glowColor: 'rgba(0, 255, 102, 0.4)',
    sections: [
      {
        id: 'concept',
        title: 'Le concept',
        icon: Target,
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
            { label: "Devineur (rapide)", value: "jusqu'à +100 pts", icon: Zap, color: '#22c55e' },
            { label: "Mimeur (rapide)", value: "jusqu'à +50 pts", icon: CheckCircle, color: '#00ff66' },
            { label: "Mauvaise réponse", value: "-25 pts", icon: XCircle, color: '#ef4444' },
            { label: "Pénalité", value: "8 sec de blocage", icon: Timer, color: '#f59e0b' }
          ],
          note: "Les points diminuent avec le temps : plus vite le mot est trouvé, plus les deux joueurs gagnent de points !"
        }
      }
    ]
  }
};

// ============================================
// SECTION RENDERERS
// ============================================

function IntroSection({ content }) {
  return (
    <div className="section-intro">
      <p className="intro-text">{content.text}</p>
    </div>
  );
}

function RolesSection({ content }) {
  const items = content.roles || content.modes || [];
  return (
    <div className="section-roles">
      {items.map((role, index) => (
        <motion.div
          key={role.name}
          className="role-card"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          style={{ borderColor: `${role.color}40` }}
        >
          <div className="role-header">
            <span className="role-emoji">{role.emoji}</span>
            <h4 className="role-name" style={{ color: role.color }}>{role.name}</h4>
          </div>
          <p className="role-description">{role.description}</p>
        </motion.div>
      ))}
    </div>
  );
}

function StepsSection({ content, accentColor }) {
  return (
    <div className="section-steps">
      {content.steps.map((step, index) => (
        <motion.div
          key={step.number}
          className="step-item"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <div className="step-number" style={{ background: accentColor }}>{step.number}</div>
          <div className="step-content">
            <h4 className="step-title">{step.title}</h4>
            <p className="step-description">{step.description}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function TimelineSection({ content, accentColor }) {
  return (
    <div className="section-timeline-simple">
      <p className="timeline-description">{content.description}</p>
      {content.note && (
        <p className="timeline-note">
          <AlertTriangle size={14} />
          {content.note}
        </p>
      )}
    </div>
  );
}

function ScoringSection({ content }) {
  return (
    <div className="section-scoring">
      <div className="scoring-items">
        {content.items.map((item, index) => {
          const ItemIcon = item.icon;
          return (
            <motion.div
              key={item.label}
              className="scoring-item"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="scoring-icon" style={{ background: `${item.color}20`, color: item.color }}>
                <ItemIcon size={20} />
              </div>
              <span className="scoring-label">{item.label}</span>
              <span className="scoring-value" style={{ color: item.color }}>{item.value}</span>
            </motion.div>
          );
        })}
      </div>
      {content.note && <p className="scoring-note">{content.note}</p>}
    </div>
  );
}

function PhasesSection({ content }) {
  return (
    <div className="section-phases">
      {content.phases.map((phase, index) => {
        const PhaseIcon = phase.icon;
        return (
          <motion.div
            key={phase.name}
            className="phase-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.15 }}
            style={{ borderLeftColor: phase.color }}
          >
            <div className="phase-header">
              <div className="phase-icon" style={{ background: `${phase.color}20`, color: phase.color }}>
                <PhaseIcon size={20} />
              </div>
              <div className="phase-title-group">
                <h4 className="phase-name">{phase.name}</h4>
                <span className="phase-duration" style={{ color: phase.color }}>{phase.duration}</span>
              </div>
            </div>
            <p className="phase-description">{phase.description}</p>
          </motion.div>
        );
      })}
    </div>
  );
}

function WordleColorsSection({ content }) {
  const stateColors = {
    correct: '#10b981',
    present: '#e07c1a',
    absent: '#3a3a4a',
  };
  const stateBorders = {
    correct: '#10b981',
    present: '#e07c1a',
    absent: '#3a3a4a',
  };

  return (
    <div className="section-wordle-colors">
      {content.examples.map((ex, i) => (
        <motion.div
          key={i}
          className="wc-example"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.12 }}
        >
          <div className="wc-cells">
            {ex.word.split('').map((letter, j) => {
              const isHighlight = j === ex.highlight;
              return (
                <div
                  key={j}
                  className="wc-cell"
                  style={isHighlight ? {
                    background: stateColors[ex.state],
                    borderColor: stateBorders[ex.state],
                    color: '#fff',
                  } : {
                    background: '#0a0a0f',
                    borderColor: '#3a3a5c',
                    color: '#fff',
                  }}
                >
                  {letter}
                </div>
              );
            })}
          </div>
          <p className="wc-label">{ex.label}</p>
        </motion.div>
      ))}
    </div>
  );
}

function VerdictInlineSection({ content }) {
  return (
    <div className="section-verdict-inline">
      {content.outcomes.map((outcome, index) => {
        const OutcomeIcon = outcome.icon;
        return (
          <motion.div
            key={outcome.title}
            className="verdict-inline-card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            style={{ borderColor: `${outcome.color}40` }}
          >
            <div className="verdict-inline-icon" style={{ background: `${outcome.color}20`, color: outcome.color }}>
              <OutcomeIcon size={22} />
            </div>
            <div className="verdict-inline-content">
              <h4 className="verdict-inline-title" style={{ color: outcome.color }}>{outcome.title}</h4>
              <p className="verdict-inline-condition">{outcome.condition}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ============================================
// MAIN MODAL COMPONENT
// ============================================

export default function HowToPlayModal({ isOpen, onClose, gameType = 'quiz' }) {
  const [activeSection, setActiveSection] = useState(0);
  const game = GAMES_DATA[gameType] || GAMES_DATA.quiz;

  // Reset section when modal opens or game changes
  useEffect(() => {
    if (isOpen) {
      setActiveSection(0);
    }
  }, [isOpen, gameType]);

  if (!isOpen || !game) return null;

  const renderSectionContent = (section) => {
    const { content } = section;
    switch (content.type) {
      case 'intro':
        return <IntroSection content={content} />;
      case 'roles':
      case 'modes':
        return <RolesSection content={content} />;
      case 'steps':
        return <StepsSection content={content} accentColor={game.accentColor} />;
      case 'timeline-simple':
        return <TimelineSection content={content} accentColor={game.accentColor} />;
      case 'scoring':
        return <ScoringSection content={content} />;
      case 'phases':
        return <PhasesSection content={content} />;
      case 'verdict-inline':
        return <VerdictInlineSection content={content} />;
      case 'wordle-colors':
        return <WordleColorsSection content={content} />;
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="htp-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="htp-modal"
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              '--accent': game.accentColor,
              '--accent-glow': game.glowColor,
              '--accent-gradient': game.accentGradient
            }}
          >
            {/* Header */}
            <div className="htp-header">
              <button className="htp-close" onClick={onClose}>
                <X size={20} />
              </button>
              <div className="htp-title-group">
                <h2 className="htp-title">{game.title}</h2>
                <p className="htp-subtitle">{game.subtitle}</p>
              </div>
            </div>

            {/* Content */}
            <div className="htp-content">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="htp-section"
                >
                  <h3 className="htp-section-title">
                    {(() => {
                      const Icon = game.sections[activeSection].icon;
                      return <Icon size={22} />;
                    })()}
                    {game.sections[activeSection].title}
                  </h3>
                  {renderSectionContent(game.sections[activeSection])}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="htp-footer">
              <button
                className="htp-btn-prev"
                onClick={() => setActiveSection(Math.max(0, activeSection - 1))}
                disabled={activeSection === 0}
              >
                Précédent
              </button>
              {activeSection < game.sections.length - 1 ? (
                <button
                  className="htp-btn-next"
                  onClick={() => setActiveSection(activeSection + 1)}
                >
                  Suivant
                  <ChevronRight size={18} />
                </button>
              ) : (
                <button className="htp-btn-done" onClick={onClose}>
                  C'est compris !
                </button>
              )}
            </div>
          </motion.div>

          <style jsx global>{`
            .htp-overlay {
              position: fixed;
              inset: 0;
              z-index: 9999;
              background: rgba(0, 0, 0, 0.9);
              backdrop-filter: blur(10px);
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 16px;
            }

            .htp-modal {
              width: 100%;
              max-width: 480px;
              height: 85vh;
              max-height: 700px;
              background: linear-gradient(180deg, rgba(25, 25, 35, 0.98) 0%, rgba(15, 15, 22, 0.99) 100%);
              border: 1px solid rgba(255, 255, 255, 0.1);
              border-radius: 24px;
              overflow: hidden;
              display: flex;
              flex-direction: column;
              box-shadow:
                0 25px 80px rgba(0, 0, 0, 0.5),
                0 0 60px var(--accent-glow),
                inset 0 1px 0 rgba(255, 255, 255, 0.05);
            }

            /* Header */
            .htp-header {
              position: relative;
              padding: 24px 24px 16px;
              text-align: center;
              background: var(--accent-gradient);
            }

            .htp-close {
              position: absolute;
              top: 12px;
              right: 12px;
              width: 36px;
              height: 36px;
              border-radius: 50%;
              background: rgba(0, 0, 0, 0.3);
              border: none;
              color: white;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.2s;
            }

            .htp-close:hover {
              background: rgba(0, 0, 0, 0.5);
              transform: scale(1.1);
            }

            .htp-title {
              font-family: 'Bungee', cursive;
              font-size: 1.75rem;
              color: white;
              margin: 0;
              text-transform: uppercase;
              text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
            }

            .htp-subtitle {
              font-family: 'Inter', sans-serif;
              font-size: 0.9375rem;
              color: rgba(255, 255, 255, 0.8);
              margin: 6px 0 0;
            }

            /* Content */
            .htp-content {
              flex: 1;
              overflow-y: auto;
              padding: 20px 24px;
            }

            .htp-section-title {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              font-family: 'Space Grotesk', sans-serif;
              font-size: 0.75rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: var(--accent);
              margin: 0 0 16px;
              padding: 6px 12px 6px 10px;
              background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%);
              border-left: 3px solid var(--accent);
              border-radius: 0 8px 8px 0;
            }

            .htp-section-title svg {
              opacity: 0.8;
            }

            /* Section: Intro */
            .section-intro .intro-text {
              font-family: 'Inter', sans-serif;
              font-size: 1rem;
              line-height: 1.6;
              color: rgba(255, 255, 255, 0.85);
              margin: 0;
            }

            /* Section: Roles / Modes */
            .section-roles {
              display: flex;
              flex-direction: column;
              gap: 12px;
            }

            .role-card {
              padding: 16px;
              background: rgba(255, 255, 255, 0.03);
              border: 1px solid;
              border-radius: 14px;
            }

            .role-header {
              display: flex;
              align-items: center;
              gap: 10px;
              margin-bottom: 8px;
            }

            .role-emoji {
              font-size: 1.5rem;
              line-height: 1;
            }

            .role-name {
              font-family: 'Space Grotesk', sans-serif;
              font-size: 1rem;
              font-weight: 700;
              margin: 0;
            }

            .role-description {
              font-family: 'Inter', sans-serif;
              font-size: 0.875rem;
              line-height: 1.5;
              color: rgba(255, 255, 255, 0.7);
              margin: 0;
            }

            /* Section: Steps */
            .section-steps {
              display: flex;
              flex-direction: column;
              gap: 16px;
            }

            .step-item {
              display: flex;
              gap: 14px;
            }

            .step-number {
              flex-shrink: 0;
              width: 32px;
              height: 32px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: 'Bungee', cursive;
              font-size: 0.875rem;
              color: white;
            }

            .step-content {
              flex: 1;
              padding-top: 2px;
            }

            .step-title {
              font-family: 'Space Grotesk', sans-serif;
              font-size: 0.9375rem;
              font-weight: 600;
              color: white;
              margin: 0 0 2px;
            }

            .step-description {
              font-family: 'Inter', sans-serif;
              font-size: 0.8125rem;
              color: rgba(255, 255, 255, 0.6);
              margin: 0;
            }

            /* Section: Timeline Simple */
            .section-timeline-simple .timeline-description {
              font-family: 'Inter', sans-serif;
              font-size: 1rem;
              line-height: 1.6;
              color: rgba(255, 255, 255, 0.85);
              margin: 0 0 16px;
            }

            .section-timeline-simple .timeline-note {
              display: flex;
              align-items: flex-start;
              gap: 8px;
              font-family: 'Inter', sans-serif;
              font-size: 0.875rem;
              line-height: 1.5;
              color: rgba(255, 255, 255, 0.6);
              margin: 0;
              padding: 12px;
              background: rgba(255, 255, 255, 0.03);
              border-radius: 10px;
            }

            .section-timeline-simple .timeline-note svg {
              flex-shrink: 0;
              margin-top: 2px;
              color: var(--accent);
            }

            /* Section: Scoring */
            .scoring-items {
              display: flex;
              flex-direction: column;
              gap: 10px;
              margin-bottom: 12px;
            }

            .scoring-item {
              display: flex;
              align-items: center;
              gap: 12px;
              padding: 12px 14px;
              background: rgba(255, 255, 255, 0.03);
              border-radius: 12px;
            }

            .scoring-icon {
              width: 36px;
              height: 36px;
              border-radius: 10px;
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .scoring-label {
              flex: 1;
              font-family: 'Inter', sans-serif;
              font-size: 0.9375rem;
              color: rgba(255, 255, 255, 0.85);
            }

            .scoring-value {
              font-family: 'Space Grotesk', sans-serif;
              font-size: 1rem;
              font-weight: 700;
            }

            .scoring-note {
              font-family: 'Inter', sans-serif;
              font-size: 0.8125rem;
              color: rgba(255, 255, 255, 0.5);
              margin: 0;
              font-style: italic;
            }

            /* Section: Phases */
            .section-phases {
              display: flex;
              flex-direction: column;
              gap: 12px;
            }

            .phase-card {
              padding: 16px;
              background: rgba(255, 255, 255, 0.03);
              border-left: 3px solid;
              border-radius: 0 12px 12px 0;
            }

            .phase-header {
              display: flex;
              align-items: center;
              gap: 12px;
              margin-bottom: 8px;
            }

            .phase-icon {
              width: 36px;
              height: 36px;
              border-radius: 10px;
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .phase-title-group {
              flex: 1;
            }

            .phase-name {
              font-family: 'Space Grotesk', sans-serif;
              font-size: 1rem;
              font-weight: 700;
              color: white;
              margin: 0;
            }

            .phase-duration {
              font-family: 'Inter', sans-serif;
              font-size: 0.75rem;
              font-weight: 600;
            }

            .phase-description {
              font-family: 'Inter', sans-serif;
              font-size: 0.875rem;
              line-height: 1.5;
              color: rgba(255, 255, 255, 0.7);
              margin: 0;
            }

            /* Section: Wordle Colors */
            .section-wordle-colors {
              display: flex;
              flex-direction: column;
              gap: 20px;
            }
            .wc-example {
              display: flex;
              flex-direction: column;
              gap: 8px;
            }
            .wc-cells {
              display: flex;
              gap: 5px;
            }
            .wc-cell {
              width: 44px;
              height: 44px;
              border: 2px solid;
              border-radius: 5px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: 'Bungee', cursive;
              font-size: 1.2rem;
              font-weight: 400;
            }
            .wc-label {
              font-family: 'Inter', sans-serif;
              font-size: 0.875rem;
              color: rgba(255, 255, 255, 0.75);
              margin: 0;
              line-height: 1.4;
            }

            /* Section: Verdict Inline */
            .section-verdict-inline {
              display: flex;
              flex-direction: column;
              gap: 12px;
            }

            .verdict-inline-card {
              display: flex;
              align-items: center;
              gap: 14px;
              padding: 16px;
              background: rgba(255, 255, 255, 0.03);
              border: 1px solid;
              border-radius: 14px;
            }

            .verdict-inline-icon {
              flex-shrink: 0;
              width: 44px;
              height: 44px;
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .verdict-inline-content {
              flex: 1;
            }

            .verdict-inline-title {
              font-family: 'Space Grotesk', sans-serif;
              font-size: 0.9375rem;
              font-weight: 700;
              margin: 0 0 4px;
            }

            .verdict-inline-condition {
              font-family: 'Inter', sans-serif;
              font-size: 0.8125rem;
              line-height: 1.4;
              color: rgba(255, 255, 255, 0.6);
              margin: 0;
            }

            /* Footer */
            .htp-footer {
              display: flex;
              gap: 12px;
              padding: 16px 24px 24px;
              border-top: 1px solid rgba(255, 255, 255, 0.05);
            }

            .htp-btn-prev,
            .htp-btn-next,
            .htp-btn-done {
              flex: 1;
              padding: 14px 20px;
              border-radius: 12px;
              font-family: 'Space Grotesk', sans-serif;
              font-size: 0.9375rem;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
            }

            .htp-btn-prev {
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.1);
              color: rgba(255, 255, 255, 0.6);
            }

            .htp-btn-prev:hover:not(:disabled) {
              background: rgba(255, 255, 255, 0.1);
              color: white;
            }

            .htp-btn-prev:disabled {
              opacity: 0.3;
              cursor: not-allowed;
            }

            .htp-btn-next {
              background: rgba(255, 255, 255, 0.1);
              border: 1px solid rgba(255, 255, 255, 0.15);
              color: white;
            }

            .htp-btn-next:hover {
              background: rgba(255, 255, 255, 0.15);
            }

            .htp-btn-done {
              background: var(--accent-gradient);
              border: none;
              color: white;
              box-shadow: 0 4px 20px var(--accent-glow);
            }

            .htp-btn-done:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 25px var(--accent-glow);
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
