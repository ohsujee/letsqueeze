'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Users, Clock, Target, Zap, CheckCircle, XCircle,
  Music, Play, Trophy, Timer, Smartphone, Volume2,
  UserSearch, Shield, MessageCircle, Eye, FileText,
  HelpCircle, ChevronRight, ChevronDown, Sparkles, Award, AlertTriangle
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
  }
};

// ============================================
// SECTION RENDERERS
// ============================================

function IntroSection({ content, accentColor }) {
  return (
    <div className="section-intro">
      <p className="intro-text">{content.text}</p>
      {content.highlight && (
        <div className="intro-highlight" style={{ background: `${accentColor}20`, borderColor: `${accentColor}40` }}>
          <Sparkles size={18} style={{ color: accentColor }} />
          <span>{content.highlight}</span>
        </div>
      )}
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
  // Simple version without level cards
  if (content.type === 'timeline-simple' || !content.levels) {
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

  // Full version with level cards
  return (
    <div className="section-timeline">
      <p className="timeline-description">{content.description}</p>
      <div className="timeline-levels">
        {content.levels.map((level, index) => (
          <motion.div
            key={level.duration}
            className="timeline-level"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            style={{ borderColor: level.color }}
          >
            <div className="level-duration" style={{ color: level.color }}>{level.duration}</div>
            <div className="level-points">+{level.points} pts</div>
            <div className="level-difficulty" style={{ background: `${level.color}20`, color: level.color }}>
              {level.difficulty}
            </div>
          </motion.div>
        ))}
      </div>
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

function VerdictSection({ content }) {
  return (
    <div className="section-verdict">
      {content.outcomes.map((outcome, index) => {
        const OutcomeIcon = outcome.icon;
        return (
          <motion.div
            key={outcome.title}
            className="verdict-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            style={{ borderColor: `${outcome.color}40` }}
          >
            <div className="verdict-icon" style={{ background: `${outcome.color}20`, color: outcome.color }}>
              <OutcomeIcon size={24} />
            </div>
            <h4 className="verdict-title" style={{ color: outcome.color }}>{outcome.title}</h4>
            <p className="verdict-condition">{outcome.condition}</p>
          </motion.div>
        );
      })}
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

function FeatureSection({ content, accentColor }) {
  return (
    <div className="section-feature">
      <h4 className="feature-title" style={{ color: accentColor }}>{content.title}</h4>
      <p className="feature-description">{content.description}</p>
      <ul className="feature-list">
        {content.features.map((feature, index) => (
          <motion.li
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <CheckCircle size={16} style={{ color: accentColor }} />
            <span>{feature}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

function TipsSection({ content, accentColor }) {
  return (
    <div className="section-tips">
      {content.tips.map((tip, index) => (
        <motion.div
          key={index}
          className="tip-item"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <div className="tip-number" style={{ background: `${accentColor}20`, color: accentColor }}>
            {index + 1}
          </div>
          <p className="tip-text">{tip}</p>
        </motion.div>
      ))}
    </div>
  );
}

// ============================================
// MAIN MODAL COMPONENT
// ============================================

function HowToPlayModalV2({ isOpen, onClose, gameId }) {
  const [activeSection, setActiveSection] = useState(0);
  const game = GAMES_DATA[gameId];

  if (!isOpen || !game) return null;

  const renderSectionContent = (section) => {
    const { content } = section;
    switch (content.type) {
      case 'intro':
        return <IntroSection content={content} accentColor={game.accentColor} />;
      case 'roles':
      case 'modes':
        return <RolesSection content={content} />;
      case 'steps':
        return <StepsSection content={content} accentColor={game.accentColor} />;
      case 'timeline':
      case 'timeline-simple':
        return <TimelineSection content={content} accentColor={game.accentColor} />;
      case 'scoring':
        return <ScoringSection content={content} />;
      case 'phases':
        return <PhasesSection content={content} />;
      case 'verdict':
        return <VerdictSection content={content} />;
      case 'verdict-inline':
        return <VerdictInlineSection content={content} />;
      case 'feature':
        return <FeatureSection content={content} accentColor={game.accentColor} />;
      case 'tips':
        return <TipsSection content={content} accentColor={game.accentColor} />;
      default:
        return null;
    }
  };


  return (
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
          margin: 0 0 16px;
        }

        .section-intro .intro-highlight {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border: 1px solid;
          border-radius: 12px;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.9375rem;
          font-weight: 600;
          color: white;
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

        /* Section: Timeline */
        .section-timeline .timeline-description {
          font-family: 'Inter', sans-serif;
          font-size: 0.9375rem;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.8);
          margin: 0 0 16px;
        }

        .timeline-levels {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 12px;
        }

        .timeline-level {
          text-align: center;
          padding: 12px 8px;
          background: rgba(255, 255, 255, 0.03);
          border: 2px solid;
          border-radius: 12px;
        }

        .level-duration {
          font-family: 'Bungee', cursive;
          font-size: 1rem;
          margin-bottom: 4px;
        }

        .level-points {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.8125rem;
          font-weight: 600;
          color: white;
          margin-bottom: 6px;
        }

        .level-difficulty {
          font-family: 'Inter', sans-serif;
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          padding: 3px 6px;
          border-radius: 4px;
        }

        .timeline-note {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Inter', sans-serif;
          font-size: 0.8125rem;
          color: rgba(255, 255, 255, 0.6);
          margin: 0;
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

        /* Section: Verdict */
        .section-verdict {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .verdict-card {
          text-align: center;
          padding: 20px 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid;
          border-radius: 14px;
        }

        .verdict-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto 12px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .verdict-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.9375rem;
          font-weight: 700;
          margin: 0 0 6px;
        }

        .verdict-condition {
          font-family: 'Inter', sans-serif;
          font-size: 0.75rem;
          line-height: 1.4;
          color: rgba(255, 255, 255, 0.6);
          margin: 0;
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

        /* Section: Feature */
        .section-feature .feature-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1rem;
          font-weight: 700;
          margin: 0 0 8px;
        }

        .section-feature .feature-description {
          font-family: 'Inter', sans-serif;
          font-size: 0.9375rem;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.8);
          margin: 0 0 16px;
        }

        .section-feature .feature-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .section-feature .feature-list li {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: 'Inter', sans-serif;
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.85);
        }

        /* Section: Tips */
        .section-tips {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .tip-item {
          display: flex;
          gap: 12px;
          padding: 14px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
        }

        .tip-number {
          flex-shrink: 0;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Bungee', cursive;
          font-size: 0.75rem;
        }

        .tip-text {
          font-family: 'Inter', sans-serif;
          font-size: 0.875rem;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.85);
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
  );
}

// ============================================
// DEV PAGE
// ============================================

export default function HowToPlayDevPage() {
  const [selectedGame, setSelectedGame] = useState(null);

  return (
    <div className="dev-page">
      <header className="dev-header">
        <h1>Comment Jouer - Nouvelle Version</h1>
        <p>Prototype des modales d'explication de jeu</p>
      </header>

      <div className="dev-grid">
        {Object.entries(GAMES_DATA).map(([gameId, game]) => (
          <button
            key={gameId}
            className="dev-game-btn"
            onClick={() => setSelectedGame(gameId)}
            style={{
              '--accent': game.accentColor,
              '--gradient': game.accentGradient
            }}
          >
            <span className="dev-game-title">{game.title}</span>
            <span className="dev-game-subtitle">{game.subtitle}</span>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {selectedGame && (
          <HowToPlayModalV2
            isOpen={!!selectedGame}
            onClose={() => setSelectedGame(null)}
            gameId={selectedGame}
          />
        )}
      </AnimatePresence>

      <style jsx>{`
        .dev-page {
          min-height: 100vh;
          background: #0a0a0f;
          padding: 40px 20px;
        }

        .dev-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .dev-header h1 {
          font-family: 'Bungee', cursive;
          font-size: 2rem;
          color: white;
          margin: 0 0 8px;
        }

        .dev-header p {
          font-family: 'Inter', sans-serif;
          font-size: 1rem;
          color: rgba(255, 255, 255, 0.6);
          margin: 0;
        }

        .dev-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
          max-width: 900px;
          margin: 0 auto;
        }

        .dev-game-btn {
          padding: 24px;
          background: var(--gradient);
          border: none;
          border-radius: 16px;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .dev-game-btn:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
        }

        .dev-game-title {
          display: block;
          font-family: 'Bungee', cursive;
          font-size: 1.25rem;
          color: white;
          margin-bottom: 4px;
        }

        .dev-game-subtitle {
          display: block;
          font-family: 'Inter', sans-serif;
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.8);
        }
      `}</style>
    </div>
  );
}
