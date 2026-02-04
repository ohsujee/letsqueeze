'use client';

import { motion } from 'framer-motion';

/**
 * HeroSection - Section hero avec icône et titre
 *
 * Pattern commun dans les pages settings et subscribe.
 *
 * Usage:
 *   import { Crown } from 'lucide-react';
 *
 *   <HeroSection
 *     icon={Crown}
 *     title="Gigglz Pro"
 *     subtitle="Débloque tout le potentiel du jeu"
 *   />
 *
 *   // Avec couleur personnalisée
 *   <HeroSection
 *     icon={Lightbulb}
 *     title="Philips Hue"
 *     subtitle="Synchronise tes lumières"
 *     color="#f59e0b"
 *     variant="settings"
 *   />
 *
 *   // Sans animation
 *   <HeroSection
 *     icon={Music}
 *     title="Paramètres"
 *     animated={false}
 *   />
 */
export default function HeroSection({
  icon: Icon,
  title,
  subtitle,
  color = '#8b5cf6',
  iconSize = 48,
  variant = 'default', // 'default' | 'settings' | 'compact'
  animated = true,
  className = '',
  children,
}) {
  const variants = {
    default: {
      iconPadding: '20px',
      iconBg: `rgba(${hexToRgb(color)}, 0.15)`,
      iconBorder: `rgba(${hexToRgb(color)}, 0.3)`,
      titleSize: '1.75rem',
      gap: '1rem',
    },
    settings: {
      iconPadding: '16px',
      iconBg: `rgba(${hexToRgb(color)}, 0.1)`,
      iconBorder: `rgba(${hexToRgb(color)}, 0.2)`,
      titleSize: '1.5rem',
      gap: '0.75rem',
    },
    compact: {
      iconPadding: '12px',
      iconBg: `rgba(${hexToRgb(color)}, 0.1)`,
      iconBorder: 'transparent',
      titleSize: '1.25rem',
      gap: '0.5rem',
    },
  };

  const v = variants[variant] || variants.default;

  const content = (
    <section className={`hero-section ${variant} ${className}`}>
      {Icon && (
        <div
          className="hero-icon"
          style={{
            '--hero-color': color,
            '--hero-bg': v.iconBg,
            '--hero-border': v.iconBorder,
            '--hero-padding': v.iconPadding,
          }}
        >
          <Icon size={iconSize} />
        </div>
      )}
      <div className="hero-content">
        {title && (
          <h2
            className="hero-title"
            style={{ fontSize: v.titleSize }}
          >
            {title}
          </h2>
        )}
        {subtitle && <p className="hero-subtitle">{subtitle}</p>}
        {children}
      </div>

      <style jsx>{`
        .hero-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: ${v.gap};
        }

        .hero-section.settings {
          flex-direction: row;
          text-align: left;
          gap: 1rem;
        }

        .hero-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--hero-padding);
          background: var(--hero-bg);
          border: 1px solid var(--hero-border);
          border-radius: 16px;
          color: var(--hero-color);
          box-shadow: 0 0 30px rgba(${hexToRgb(color)}, 0.2);
        }

        .hero-content {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .hero-title {
          font-family: 'Bungee', cursive;
          font-weight: 400;
          color: white;
          margin: 0;
          text-shadow: 0 0 30px rgba(${hexToRgb(color)}, 0.4);
        }

        .hero-subtitle {
          font-family: 'Inter', sans-serif;
          font-size: 0.95rem;
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
          max-width: 300px;
        }

        .hero-section.settings .hero-content {
          flex: 1;
        }

        .hero-section.settings .hero-subtitle {
          max-width: none;
        }
      `}</style>
    </section>
  );

  if (animated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
}

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex) {
  // Remove # if present
  hex = hex.replace('#', '');

  // Parse hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return `${r}, ${g}, ${b}`;
}
