/**
 * HowToPlayModal — Section Renderers
 * Composants de rendu pour chaque type de section du tutoriel
 */

import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

export function IntroSection({ content }) {
  return (
    <div className="section-intro">
      <p className="intro-text">{content.text}</p>
    </div>
  );
}

export function RolesSection({ content }) {
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

export function StepsSection({ content, accentColor }) {
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

export function TimelineSection({ content, accentColor }) {
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

export function ScoringSection({ content }) {
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

export function PhasesSection({ content }) {
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

export function WordleColorsSection({ content }) {
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

export function TotalExampleSection({ content }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Target + numbers */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', borderRadius: 12,
        background: 'rgba(59,130,246,0.08)',
        border: '1px solid rgba(59,130,246,0.15)',
      }}>
        <div>
          <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>CIBLE</span>
          <span style={{ fontFamily: "var(--font-title, 'Bungee'), cursive", fontSize: '1.3rem', color: '#3b82f6', marginLeft: 8 }}>{content.target}</span>
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {content.numbers.map((n, i) => (
            <span key={i} style={{
              padding: '4px 8px', borderRadius: 6,
              background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)',
              fontFamily: "var(--font-title, 'Bungee'), cursive", fontSize: '0.8rem', color: '#fff',
            }}>{n}</span>
          ))}
        </div>
      </div>

      {/* Step by step calculation */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {content.steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.15 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 10,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <span style={{
              fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.25)',
              minWidth: 14,
            }}>{i + 1}</span>
            <span style={{
              fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
              fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)',
            }}>
              <span style={{ color: '#3b82f6', fontWeight: 700 }}>{step.a}</span>
              {' '}<span style={{ color: 'rgba(255,255,255,0.35)' }}>{step.op}</span>{' '}
              <span style={{ color: '#fff', fontWeight: 700 }}>{step.b}</span>
            </span>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.8rem' }}>=</span>
            <span style={{
              fontFamily: "var(--font-title, 'Bungee'), cursive",
              fontSize: '0.9rem',
              color: i === content.steps.length - 1 ? '#10b981' : '#fff',
            }}>{step.result}</span>
            {i === 0 && (
              <span style={{
                marginLeft: 'auto', fontSize: '0.6rem', color: 'rgba(59,130,246,0.5)',
                fontStyle: 'italic',
              }}>← départ</span>
            )}
            {i > 0 && i < content.steps.length - 1 && (
              <span style={{
                marginLeft: 'auto', fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)',
                fontStyle: 'italic',
              }}>← résultat précédent</span>
            )}
          </motion.div>
        ))}
      </div>

      {/* Note */}
      {content.note && (
        <p style={{
          fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)',
          lineHeight: 1.5, margin: 0, textAlign: 'center',
          fontStyle: 'italic',
        }}>{content.note}</p>
      )}
    </div>
  );
}

export function MindLinkExampleSection({ content }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Intro text */}
      <p style={{
        color: 'rgba(238, 242, 255, 0.7)', fontSize: '0.88rem',
        lineHeight: 1.6, margin: 0,
      }}>
        {content.intro}
      </p>

      {/* Word tiles */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          display: 'flex', justifyContent: 'center', gap: '5px',
          padding: '14px 0',
        }}
      >
        {content.word.split('').map((letter, i) => {
          const isRevealed = i < content.revealedCount;
          return (
            <div
              key={i}
              style={{
                width: 34, height: 42,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '8px',
                background: isRevealed ? `${content.accentColor}22` : 'rgba(238,242,255,0.04)',
                border: `1.5px solid ${isRevealed ? `${content.accentColor}66` : 'rgba(238,242,255,0.1)'}`,
                fontFamily: "var(--font-title, 'Bungee'), cursive",
                fontSize: '0.95rem',
                color: isRevealed ? content.accentColor : 'rgba(238,242,255,0.2)',
                textShadow: isRevealed ? `0 0 8px ${content.accentColor}44` : 'none',
              }}
            >
              {isRevealed ? letter : '_'}
            </div>
          );
        })}
      </motion.div>

      {/* Scenario steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {content.scenario.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              padding: '10px 12px',
              background: step.highlight ? `${content.accentColor}10` : 'rgba(238,242,255,0.03)',
              border: `1px solid ${step.highlight ? `${content.accentColor}30` : 'rgba(238,242,255,0.06)'}`,
              borderRadius: '10px',
            }}
          >
            <span style={{ fontSize: '1rem', flexShrink: 0, lineHeight: 1.4 }}>{step.emoji}</span>
            <p style={{
              color: 'rgba(238,242,255,0.75)', fontSize: '0.82rem',
              lineHeight: 1.5, margin: 0,
            }}>
              {step.text}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Bottom note */}
      {content.note && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            color: content.accentColor, fontSize: '0.8rem',
            fontWeight: 600, textAlign: 'center',
            margin: '4px 0 0', lineHeight: 1.4,
            opacity: 0.8,
          }}
        >
          {content.note}
        </motion.p>
      )}
    </div>
  );
}

export function VerdictInlineSection({ content }) {
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
