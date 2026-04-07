/**
 * HowToPlayModal — Section Renderers
 * Composants de rendu pour chaque type de section du tutoriel
 */

import { motion } from 'framer-motion';
import { Warning } from '@phosphor-icons/react';

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
          style={{ backgroundColor: role.color }}
        >
          <div className="role-header">
            <span className="role-emoji">{role.emoji}</span>
            <h4 className="role-name" style={{ color: '#ffffff' }}>{role.name}</h4>
          </div>
          <p className="role-description" style={{ color: '#ffffff' }}>{role.description}</p>
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

export function TimelineSection({ content }) {
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
              style={{ backgroundColor: item.color }}
            >
              <div className="scoring-icon" style={{ color: '#ffffff' }}>
                <ItemIcon size={20} weight="fill" />
              </div>
              <span className="scoring-label" style={{ color: '#ffffff' }}>{item.label}</span>
              <span className="scoring-value" style={{ color: '#ffffff' }}>{item.value}</span>
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
            style={{ backgroundColor: phase.color }}
          >
            <div className="phase-header">
              <div className="phase-icon" style={{ background: 'rgba(0,0,0,0.2)', color: '#ffffff' }}>
                <PhaseIcon size={20} weight="fill" />
              </div>
              <div className="phase-title-group">
                <h4 className="phase-name">{phase.name}</h4>
                <span className="phase-duration" style={{ color: '#ffffff' }}>{phase.duration}</span>
              </div>
            </div>
            <p className="phase-description" style={{ color: '#ffffff' }}>{phase.description}</p>
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
                    borderColor: stateColors[ex.state],
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Target + numbers */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', borderRadius: 12,
        background: '#3b82f6',
        border: 'none',
        borderBottom: '3px solid #1a1a35',
      }}>
        <div>
          <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.1em' }}>CIBLE</span>
          <span style={{ fontFamily: "var(--font-title, 'Bungee'), cursive", fontSize: '1.2rem', color: '#ffffff', marginLeft: 8 }}>{content.target}</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {content.numbers.map((n, i) => (
            <span key={i} style={{
              padding: '3px 7px', borderRadius: 6,
              background: 'rgba(0,0,0,0.2)', border: 'none',
              fontFamily: "var(--font-title, 'Bungee'), cursive", fontSize: '0.75rem', color: '#fff',
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
            transition={{ delay: i * 0.1 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 14px', borderRadius: 10,
              background: '#222240',
              border: 'none',
              borderBottom: '2px solid #1a1a35',
            }}
          >
            <span style={{
              fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
              fontSize: '0.875rem', color: '#d4d4e0',
            }}>
              <span style={{ color: '#3b82f6', fontWeight: 700 }}>{step.a}</span>
              {' '}<span style={{ color: '#6b6b8a' }}>{step.op}</span>{' '}
              <span style={{ color: '#fff', fontWeight: 700 }}>{step.b}</span>
            </span>
            <span style={{ color: '#6b6b8a', fontSize: '0.8rem' }}>=</span>
            <span style={{
              fontFamily: "var(--font-title, 'Bungee'), cursive",
              fontSize: '0.9rem',
              color: i === content.steps.length - 1 ? '#10b981' : '#fff',
            }}>{step.result}</span>
          </motion.div>
        ))}
      </div>

      {/* Note */}
      {content.note && (
        <p style={{
          fontSize: '0.8rem', color: '#d4d4e0',
          lineHeight: 1.5, margin: 0,
          padding: '12px 14px',
          background: '#222240',
          borderBottom: '2px solid #1a1a35',
          borderRadius: 12,
        }}>{content.note}</p>
      )}
    </div>
  );
}

export function MindLinkExampleSection({ content }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Intro text */}
      <p style={{
        color: '#ffffff', fontSize: '0.88rem',
        lineHeight: 1.6, margin: 0,
        padding: '14px 16px',
        background: content.accentColor,
        border: 'none',
        borderBottom: '3px solid #1a1a35',
        borderRadius: 12,
      }}>
        {content.intro}
      </p>

      {/* Word tiles */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          display: 'flex', justifyContent: 'center', gap: 6,
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
                borderRadius: 8,
                background: isRevealed ? content.accentColor : '#222240',
                border: 'none',
                borderBottom: isRevealed ? '3px solid #1a1a35' : '2px solid #1a1a35',
                fontFamily: "var(--font-title, 'Bungee'), cursive",
                fontSize: '0.95rem',
                color: isRevealed ? '#ffffff' : '#6b6b8a',
              }}
            >
              {isRevealed ? letter : '_'}
            </div>
          );
        })}
      </motion.div>

      {/* Scenario steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {content.scenario.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '10px 14px',
              background: step.highlight ? content.accentColor : '#222240',
              border: 'none',
              borderBottom: step.highlight ? '3px solid #1a1a35' : '2px solid #1a1a35',
              borderRadius: 12,
            }}
          >
            <span style={{ fontSize: '1rem', flexShrink: 0, lineHeight: 1.4 }}>{step.emoji}</span>
            <p style={{
              color: '#ffffff', fontSize: '0.82rem',
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
            color: '#ffffff', fontSize: '0.8rem',
            fontWeight: 600, textAlign: 'center',
            margin: 0, lineHeight: 1.4,
            padding: '12px 14px',
            background: content.accentColor,
            border: 'none',
            borderBottom: '3px solid #1a1a35',
            borderRadius: 12,
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
            style={{ backgroundColor: outcome.color }}
          >
            <div className="verdict-inline-icon" style={{ background: 'rgba(0,0,0,0.2)', color: '#ffffff' }}>
              <OutcomeIcon size={22} weight="fill" />
            </div>
            <div className="verdict-inline-content">
              <h4 className="verdict-inline-title" style={{ color: '#ffffff' }}>{outcome.title}</h4>
              <p className="verdict-inline-condition" style={{ color: '#ffffff' }}>{outcome.condition}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
