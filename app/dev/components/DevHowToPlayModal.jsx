'use client';

/**
 * DevHowToPlayModal — Copie dev de HowToPlayModal
 * Différences vs original :
 * - Icônes UI (X, CaretRight, Warning) en Phosphor
 * - Contenu GAMES_DATA identique à l'original
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CaretRight, Warning } from '@phosphor-icons/react';
import {
  Users, Clock, Target, Zap, CheckCircle, XCircle,
  Music, Play, Trophy, Timer, UserSearch, Shield,
  MessageCircle, FileText, AlertTriangle, ChevronRight
} from 'lucide-react';

// ─── Game Data (identique à HowToPlayModal) ──────────────────────────────────

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
        id: 'concept', title: 'Le concept', icon: Target,
        content: { type: 'intro', text: "L'hôte pose des questions, les joueurs buzzent pour répondre. Le plus rapide gagne le droit de répondre !" }
      },
      {
        id: 'modes', title: 'Les modes de jeu', icon: Users,
        content: {
          type: 'modes',
          modes: [
            { name: "Mode Game Master", emoji: '🎙️', description: "Un hôte anime la partie : il lit les questions, valide les réponses et gère le rythme. Il ne joue pas.", color: '#8b5cf6' },
            { name: "Mode Party", emoji: '🎉', description: "Tout le monde joue ! À tour de rôle, un joueur devient l'animateur et lit la question. Il ne peut pas buzzer sur sa propre question.", color: '#22c55e' }
          ]
        }
      },
      {
        id: 'flow', title: 'Déroulement', icon: Play,
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
        id: 'scoring', title: 'Les points', icon: Trophy,
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
        id: 'concept', title: 'Le concept', icon: Music,
        content: { type: 'intro', text: "Un extrait musical est joué, les joueurs doivent reconnaître le titre et l'artiste. Moins tu as besoin d'écouter pour trouver, plus tu gagnes de points !" }
      },
      {
        id: 'timeline', title: 'La timeline', icon: Timer,
        content: {
          type: 'timeline-simple',
          description: "L'extrait se dévoile progressivement par paliers : 1.5s → 3s → 10s → 25s. Chaque palier doit être débloqué dans l'ordre.",
          note: "L'hôte clique sur un palier pour jouer l'extrait. Si personne ne trouve, il passe au palier suivant qui dévoile plus de la chanson."
        }
      },
      {
        id: 'flow', title: 'Déroulement', icon: Play,
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
        id: 'scoring', title: 'Les points', icon: Trophy,
        content: {
          type: 'scoring',
          items: [
            { label: "Buzz à 1.5s", value: "+200 pts", icon: Zap, color: '#22c55e' },
            { label: "Buzz à 3s",   value: "+150 pts", icon: Zap, color: '#84cc16' },
            { label: "Buzz à 10s",  value: "+100 pts", icon: Zap, color: '#f59e0b' },
            { label: "Buzz à 25s",  value: "+50 pts",  icon: Zap, color: '#ef4444' }
          ],
          note: "Les points diminuent au fil de l'extrait. Mauvaise réponse = -25 pts + 8 sec de blocage."
        }
      }
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
        id: 'concept', title: 'Le concept', icon: UserSearch,
        content: { type: 'intro', text: "Les suspects ont un alibi commun. Les inspecteurs les interrogent pour trouver des incohérences entre leurs réponses." }
      },
      {
        id: 'roles', title: 'Les rôles', icon: Users,
        content: {
          type: 'roles',
          roles: [
            { name: "Les Inspecteurs", emoji: '🔍', description: "Posent des questions aux suspects et cherchent les incohérences dans leurs réponses.", color: '#06b6d4' },
            { name: "Les Suspects",    emoji: '🎭', description: "Doivent se souvenir parfaitement de leur alibi commun et répondre de manière identique.", color: '#f59e0b' }
          ]
        }
      },
      {
        id: 'phases', title: 'Les phases', icon: Clock,
        content: {
          type: 'phases',
          phases: [
            { name: "Préparation", duration: "1 min 30", description: "Les suspects lisent et mémorisent leur alibi ensemble. Les inspecteurs prennent connaissance des questions.", icon: FileText, color: '#8b5cf6' },
            { name: "Interrogatoire", duration: "10 questions", description: "Les inspecteurs posent des questions. Chaque suspect répond en 30 secondes.", icon: MessageCircle, color: '#f59e0b' },
            { name: "Verdict", duration: "À la fin", description: "Les inspecteurs votent : les réponses étaient-elles cohérentes ?", icon: Shield, color: '#22c55e' }
          ]
        }
      },
      {
        id: 'scoring', title: 'Qui gagne ?', icon: Trophy,
        content: {
          type: 'verdict-inline',
          outcomes: [
            { title: "Les Suspects gagnent",    condition: "Si plus de 50% des réponses sont jugées cohérentes",   icon: Shield,     color: '#22c55e' },
            { title: "Les Inspecteurs gagnent", condition: "Si plus de 50% des réponses sont jugées incohérentes", icon: UserSearch, color: '#ef4444' }
          ]
        }
      }
    ]
  },

  laregle: {
    id: 'laregle',
    title: 'La Règle',
    subtitle: 'Trouve la règle secrète !',
    accentColor: '#00e5ff',
    accentGradient: 'linear-gradient(135deg, #00e5ff, #00b8d9)',
    glowColor: 'rgba(0, 229, 255, 0.4)',
    sections: [
      {
        id: 'concept', title: 'Le concept', icon: Target,
        content: { type: 'intro', text: "Les joueurs choisissent une règle secrète. Les enquêteurs doivent la deviner en observant les interactions et en posant des questions !" }
      },
      {
        id: 'flow', title: 'Déroulement', icon: Play,
        content: {
          type: 'steps',
          steps: [
            { number: 1, title: "Mise à l'écart", description: "Les enquêteurs s'éloignent pendant que les joueurs choisissent la règle sur leur téléphone" },
            { number: 2, title: "Choix de la règle",      description: "Les joueurs choisissent une règle secrète" },
            { number: 3, title: "Discussion libre",        description: "Les enquêteurs reviennent et observent" },
            { number: 4, title: "3 tentatives",            description: "Pour deviner la règle secrète" }
          ]
        }
      },
      {
        id: 'scoring', title: 'Qui gagne ?', icon: Trophy,
        content: {
          type: 'verdict-inline',
          outcomes: [
            { title: "Les Enquêteurs gagnent", condition: "S'ils trouvent la règle en 3 tentatives ou moins", icon: UserSearch, color: '#22c55e' },
            { title: "Les Joueurs gagnent",    condition: "Si les enquêteurs échouent après 3 tentatives",   icon: Users,      color: '#00e5ff' }
          ]
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
        id: 'concept', title: 'Le concept', icon: Target,
        content: { type: 'intro', text: "Un joueur mime un mot secret que les autres doivent deviner. Plus vite le mot est trouvé, plus le mimeur ET le devineur gagnent de points !" }
      },
      {
        id: 'flow', title: 'Déroulement', icon: Play,
        content: {
          type: 'steps',
          steps: [
            { number: 1, title: "Découvre le mot",    description: "Glisse pour révéler le mot secret" },
            { number: 2, title: "Mime !",              description: "Fais deviner le mot sans parler ni faire de sons" },
            { number: 3, title: "Buzz et réponds",    description: "Les joueurs buzzent pour proposer une réponse" },
            { number: 4, title: "Mimeur suivant",     description: "Un autre joueur est choisi aléatoirement" }
          ]
        }
      },
      {
        id: 'scoring', title: 'Les points', icon: Trophy,
        content: {
          type: 'scoring',
          items: [
            { label: "Devineur (rapide)", value: "jusqu'à +100 pts", icon: Zap,         color: '#22c55e' },
            { label: "Mimeur (rapide)",   value: "jusqu'à +50 pts",  icon: CheckCircle, color: '#059669' },
            { label: "Mauvaise réponse",  value: "-25 pts",           icon: XCircle,     color: '#ef4444' },
            { label: "Pénalité",          value: "8 sec de blocage",  icon: Timer,       color: '#f59e0b' }
          ],
          note: "Les points diminuent avec le temps : plus vite le mot est trouvé, plus les deux joueurs gagnent de points !"
        }
      }
    ]
  }
};

// ─── Section renderers (identiques à HowToPlayModal) ─────────────────────────

function IntroSection({ content }) {
  return <div className="section-intro"><p className="intro-text">{content.text}</p></div>;
}

function RolesSection({ content }) {
  const items = content.roles || content.modes || [];
  return (
    <div className="section-roles">
      {items.map((role, i) => (
        <motion.div key={role.name} className="role-card" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} style={{ borderLeftColor: role.color }}>
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
      {content.steps.map((step, i) => (
        <motion.div key={step.number} className="step-item" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
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

function TimelineSection({ content }) {
  return (
    <div className="section-timeline-simple">
      <p className="timeline-description">{content.description}</p>
      {content.note && (
        <p className="timeline-note">
          <Warning size={14} weight="fill" />
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
        {content.items.map((item, i) => {
          const ItemIcon = item.icon;
          return (
            <motion.div key={item.label} className="scoring-item" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
              <div className="scoring-icon" style={{ background: item.color, color: '#fff' }}><ItemIcon size={20} /></div>
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
      {content.phases.map((phase, i) => {
        const PhaseIcon = phase.icon;
        return (
          <motion.div key={phase.name} className="phase-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }} style={{ borderLeftColor: phase.color }}>
            <div className="phase-header">
              <div className="phase-icon" style={{ background: phase.color, color: '#fff' }}><PhaseIcon size={20} /></div>
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

function VerdictInlineSection({ content }) {
  return (
    <div className="section-verdict-inline">
      {content.outcomes.map((outcome, i) => {
        const OutcomeIcon = outcome.icon;
        return (
          <motion.div key={outcome.title} className="verdict-inline-card" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} style={{ borderLeftColor: outcome.color }}>
            <div className="verdict-inline-icon" style={{ background: outcome.color, color: '#fff' }}><OutcomeIcon size={22} /></div>
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

// ─── Main modal ───────────────────────────────────────────────────────────────

export default function DevHowToPlayModal({ isOpen, onClose, gameType = 'laregle', showDismiss = false, onDismissForever }) {
  const [activeSection, setActiveSection] = useState(0);
  const [dismissChecked, setDismissChecked] = useState(false);
  const game = GAMES_DATA[gameType] || GAMES_DATA.laregle;

  useEffect(() => {
    if (isOpen) { setActiveSection(0); setDismissChecked(false); }
  }, [isOpen, gameType]);

  const handleClose = () => {
    if (dismissChecked && onDismissForever) onDismissForever();
    else onClose();
  };

  if (!isOpen || !game) return null;

  const renderSection = (section) => {
    const { content } = section;
    switch (content.type) {
      case 'intro':          return <IntroSection content={content} />;
      case 'roles':
      case 'modes':          return <RolesSection content={content} />;
      case 'steps':          return <StepsSection content={content} accentColor={game.accentColor} />;
      case 'timeline-simple':return <TimelineSection content={content} accentColor={game.accentColor} />;
      case 'scoring':        return <ScoringSection content={content} />;
      case 'phases':         return <PhasesSection content={content} />;
      case 'verdict-inline': return <VerdictInlineSection content={content} />;
      default:               return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="htp-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className="htp-modal"
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
            style={{ '--accent': game.accentColor, '--accent-glow': game.glowColor, '--accent-gradient': game.accentGradient }}
          >
            {/* Header */}
            <div className="htp-header">
              <button className="htp-close" onClick={onClose}>
                <X size={20} weight="bold" />
              </button>
              <div className="htp-title-group">
                <h2 className="htp-title">{game.title}</h2>
                <p className="htp-subtitle">{game.subtitle}</p>
              </div>
            </div>

            {/* Content */}
            <div className="htp-content">
              <AnimatePresence mode="wait">
                <motion.div key={activeSection} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="htp-section">
                  <h3 className="htp-section-title">
                    {(() => { const Icon = game.sections[activeSection].icon; return <Icon size={22} />; })()}
                    {game.sections[activeSection].title}
                  </h3>
                  {renderSection(game.sections[activeSection])}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="htp-footer">
              <div className="htp-footer-actions">
                <button className="htp-btn-prev" onClick={() => setActiveSection(Math.max(0, activeSection - 1))} disabled={activeSection === 0}>
                  Précédent
                </button>
                {activeSection < game.sections.length - 1 ? (
                  <button className="htp-btn-next" onClick={() => setActiveSection(activeSection + 1)}>
                    Suivant <CaretRight size={18} weight="bold" />
                  </button>
                ) : (
                  <button className="htp-btn-done" onClick={handleClose}>Compris !</button>
                )}
              </div>
              {showDismiss && onDismissForever && (
                <label className="htp-dismiss-check">
                  <input type="checkbox" checked={dismissChecked} onChange={e => setDismissChecked(e.target.checked)} />
                  <span>Ne plus afficher</span>
                </label>
              )}
            </div>
          </motion.div>

          <style jsx global>{`
            .htp-overlay { position:fixed; inset:0; z-index:9999; background:rgb(8,8,15,0.92); display:flex; align-items:center; justify-content:center; padding:16px; }
            .htp-modal { width:100%; max-width:480px; height:85vh; max-height:700px; background:#1a1a2e; border:none; border-bottom:4px solid #13132a; border-radius:20px; overflow:hidden; display:flex; flex-direction:column; }
            .htp-header { position:relative; padding:20px 24px 16px; text-align:center; background:var(--accent); border-bottom:4px solid color-mix(in srgb, var(--accent) 70%, black); }
            .htp-close { position:absolute; top:12px; right:12px; width:32px; height:32px; border-radius:8px; background:#ef4444; border:none; border-bottom:2px solid #dc2626; color:white; cursor:pointer; display:flex; align-items:center; justify-content:center; }
            .htp-close:active { transform:translateY(1px); border-bottom-width:1px; }
            .htp-title { font-family:'Bungee',cursive; font-size:1.5rem; color:white; margin:0; text-transform:uppercase; }
            .htp-subtitle { font-family:'Inter',sans-serif; font-size:0.875rem; color:rgba(255,255,255,0.85); margin:6px 0 0; }
            .htp-content { flex:1; overflow-y:auto; padding:20px 24px; }
            .htp-section-title { display:inline-flex; align-items:center; gap:8px; font-family:'Space Grotesk',sans-serif; font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:var(--accent); margin:0 0 16px; padding:6px 12px 6px 10px; background:#222240; border-left:3px solid var(--accent); border-radius:0 8px 8px 0; }
            .section-intro .intro-text { font-family:'Inter',sans-serif; font-size:1rem; line-height:1.6; color:#eef2ff; margin:0; }
            .section-roles { display:flex; flex-direction:column; gap:10px; }
            .role-card { padding:14px; background:#222240; border:none; border-left:3px solid; border-bottom:2px solid #1a1a35; border-radius:0 10px 10px 0; }
            .role-header { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
            .role-emoji { font-size:1.5rem; line-height:1; }
            .role-name { font-family:'Space Grotesk',sans-serif; font-size:1rem; font-weight:700; margin:0; }
            .role-description { font-family:'Inter',sans-serif; font-size:0.875rem; line-height:1.5; color:#8a8aa0; margin:0; }
            .section-steps { display:flex; flex-direction:column; gap:14px; }
            .step-item { display:flex; gap:14px; }
            .step-number { flex-shrink:0; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-family:'Bungee',cursive; font-size:0.875rem; color:white; }
            .step-content { flex:1; padding-top:2px; }
            .step-title { font-family:'Space Grotesk',sans-serif; font-size:0.9375rem; font-weight:700; color:#fff; margin:0 0 2px; }
            .step-description { font-family:'Inter',sans-serif; font-size:0.8125rem; color:#8a8aa0; margin:0; }
            .section-timeline-simple .timeline-description { font-family:'Inter',sans-serif; font-size:1rem; line-height:1.6; color:#eef2ff; margin:0 0 16px; }
            .section-timeline-simple .timeline-note { display:flex; align-items:flex-start; gap:8px; font-family:'Inter',sans-serif; font-size:0.875rem; line-height:1.5; color:#8a8aa0; margin:0; padding:12px; background:#222240; border-bottom:2px solid #1a1a35; border-radius:10px; }
            .section-timeline-simple .timeline-note svg { flex-shrink:0; margin-top:2px; color:var(--accent); }
            .scoring-items { display:flex; flex-direction:column; gap:8px; margin-bottom:12px; }
            .scoring-item { display:flex; align-items:center; gap:12px; padding:12px 14px; background:#222240; border-bottom:2px solid #1a1a35; border-radius:10px; }
            .scoring-icon { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; }
            .scoring-label { flex:1; font-family:'Inter',sans-serif; font-size:0.9375rem; color:#eef2ff; }
            .scoring-value { font-family:'Space Grotesk',sans-serif; font-size:1rem; font-weight:700; }
            .scoring-note { font-family:'Inter',sans-serif; font-size:0.8125rem; color:#6b6b8a; margin:0; font-style:italic; }
            .section-phases { display:flex; flex-direction:column; gap:10px; }
            .phase-card { padding:14px; background:#222240; border-left:3px solid; border-bottom:2px solid #1a1a35; border-radius:0 10px 10px 0; }
            .phase-header { display:flex; align-items:center; gap:12px; margin-bottom:8px; }
            .phase-icon { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; }
            .phase-title-group { flex:1; }
            .phase-name { font-family:'Space Grotesk',sans-serif; font-size:1rem; font-weight:700; color:white; margin:0; }
            .phase-duration { font-family:'Inter',sans-serif; font-size:0.75rem; font-weight:600; }
            .phase-description { font-family:'Inter',sans-serif; font-size:0.875rem; line-height:1.5; color:#8a8aa0; margin:0; }
            .section-verdict-inline { display:flex; flex-direction:column; gap:10px; }
            .verdict-inline-card { display:flex; align-items:center; gap:14px; padding:14px; background:#222240; border:none; border-left:3px solid; border-bottom:2px solid #1a1a35; border-radius:0 10px 10px 0; }
            .verdict-inline-icon { flex-shrink:0; width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; }
            .verdict-inline-content { flex:1; }
            .verdict-inline-title { font-family:'Space Grotesk',sans-serif; font-size:0.9375rem; font-weight:700; margin:0 0 4px; }
            .verdict-inline-condition { font-family:'Inter',sans-serif; font-size:0.8125rem; line-height:1.4; color:#8a8aa0; margin:0; }
            .htp-footer { display:flex; flex-direction:column; gap:12px; padding:16px 24px 24px; border-top:2px solid #222240; }
            .htp-footer-actions { display:flex; gap:10px; }
            .htp-btn-prev, .htp-btn-next, .htp-btn-done { flex:1; padding:14px 20px; border-radius:12px; font-family:'Space Grotesk',sans-serif; font-size:0.9375rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; }
            .htp-btn-prev { background:#3a3a58; border:none; border-bottom:3px solid #2a2a45; color:#fff; }
            .htp-btn-prev:active:not(:disabled) { transform:translateY(2px); border-bottom-width:1px; }
            .htp-btn-prev:disabled { opacity:0.3; cursor:not-allowed; }
            .htp-btn-next { background:#3a3a58; border:none; border-bottom:3px solid #2a2a45; color:white; }
            .htp-btn-next:active { transform:translateY(2px); border-bottom-width:1px; }
            .htp-btn-done { background:var(--accent); border:none; border-bottom:4px solid color-mix(in srgb, var(--accent) 70%, black); color:white; }
            .htp-btn-done:active { transform:translateY(2px); border-bottom-width:2px; }
            .htp-dismiss-check { display:flex; align-items:center; gap:10px; cursor:pointer; user-select:none; }
            .htp-dismiss-check input[type="checkbox"] { appearance:none; -webkit-appearance:none; width:18px; height:18px; border:none; border-radius:4px; background:#3a3a58; cursor:pointer; flex-shrink:0; position:relative; }
            .htp-dismiss-check input[type="checkbox"]:checked { background:var(--accent); }
            .htp-dismiss-check input[type="checkbox"]:checked::after { content:''; position:absolute; top:1px; left:4px; width:6px; height:10px; border:2px solid white; border-top:none; border-left:none; transform:rotate(45deg); }
            .htp-dismiss-check span { font-family:'Inter',sans-serif; font-size:0.8125rem; color:#6b6b8a; }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
