'use client';

/**
 * BuzzerSVG - Composant SVG neumorphique du buzzer
 * Gère uniquement le rendu visuel du bouton
 */
export default function BuzzerSVG({ type, showX }) {
  return (
    <svg className="buzzer-svg" viewBox="-60 -60 360 360" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Gradients neumorphiques selon l'état */}
        <radialGradient id="activeGradient" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#FCA5A5" />
          <stop offset="50%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#B91C1C" />
        </radialGradient>

        <radialGradient id="anticipatedGradient" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#FDBA74" />
          <stop offset="50%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#C2410C" />
        </radialGradient>

        <radialGradient id="successGradient" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#6EE7B7" />
          <stop offset="50%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#047857" />
        </radialGradient>

        <radialGradient id="blockedGradient" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#CBD5E1" />
          <stop offset="50%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#64748B" />
        </radialGradient>

        <radialGradient id="penaltyGradient" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#FDBA74" />
          <stop offset="50%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#C2410C" />
        </radialGradient>

        <radialGradient id="inactiveGradient" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#94A3B8" />
          <stop offset="50%" stopColor="#64748B" />
          <stop offset="100%" stopColor="#475569" />
        </radialGradient>

        <radialGradient id="innerShadow" cx="50%" cy="50%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="70%" stopColor="transparent" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
        </radialGradient>

        <radialGradient id="highlight" cx="30%" cy="30%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.15)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

      {/* Ombre portée */}
      <ellipse cx="120" cy="240" rx="90" ry="20" fill="url(#innerShadow)" opacity="0.4"/>

      {/* Border */}
      <circle cx="120" cy="120" r="105" fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="2"/>

      {/* Bouton principal */}
      <circle cx="120" cy="120" r="100" className={`buzzer-circle buzzer-${type}`} strokeWidth="0"/>

      {/* Ombre interne */}
      <circle cx="120" cy="120" r="100" fill="url(#innerShadow)" opacity="0.15" pointerEvents="none"/>

      {/* Reflet */}
      <ellipse cx="120" cy="85" rx="75" ry="40" fill="url(#highlight)" pointerEvents="none"/>

      {/* Croix pour état blocked */}
      {showX && (
        <g transform="translate(120, 120)">
          <line x1="-35" y1="-35" x2="35" y2="35" stroke="white" strokeWidth="12" strokeLinecap="round" opacity="0.95"/>
          <line x1="35" y1="-35" x2="-35" y2="35" stroke="white" strokeWidth="12" strokeLinecap="round" opacity="0.95"/>
        </g>
      )}

      {/* Pulse rings actif */}
      {type === 'active' && (
        <>
          <circle cx="120" cy="120" r="110" fill="none" stroke="#EF4444" strokeWidth="4" className="pulse-ring pulse-strong pulse-1" />
          <circle cx="120" cy="120" r="110" fill="none" stroke="#EF4444" strokeWidth="4" className="pulse-ring pulse-strong pulse-2" />
          <circle cx="120" cy="120" r="110" fill="none" stroke="#EF4444" strokeWidth="4" className="pulse-ring pulse-strong pulse-3" />
        </>
      )}

      {/* Pulse rings anticipé */}
      {type === 'anticipated' && (
        <>
          <circle cx="120" cy="120" r="110" fill="none" stroke="#F97316" strokeWidth="2" className="pulse-ring pulse-soft pulse-1" />
          <circle cx="120" cy="120" r="110" fill="none" stroke="#F97316" strokeWidth="2" className="pulse-ring pulse-soft pulse-2" />
          <circle cx="120" cy="120" r="110" fill="none" stroke="#F97316" strokeWidth="2" className="pulse-ring pulse-soft pulse-3" />
        </>
      )}

      <style jsx>{`
        .buzzer-svg {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
        }

        .buzzer-inactive { fill: url(#inactiveGradient); filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.25)); }
        .buzzer-active { fill: url(#activeGradient); filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.3)); }
        .buzzer-anticipated { fill: url(#anticipatedGradient); filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.3)); }
        .buzzer-success { fill: url(#successGradient); filter: drop-shadow(0 0 20px rgba(16, 185, 129, 0.8)) drop-shadow(0 0 35px rgba(16, 185, 129, 0.4)) drop-shadow(0 10px 20px rgba(0, 0, 0, 0.3)); animation: success-celebrate 0.6s ease-out; }
        .buzzer-blocked { fill: url(#blockedGradient); filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.25)); }
        .buzzer-penalty { fill: url(#penaltyGradient); filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.25)); animation: penalty-flash 1.5s infinite ease-in-out; }

        .pulse-ring { opacity: 0; }
        .pulse-soft.pulse-1 { animation: pulse-fade-soft 2.5s ease-out infinite; }
        .pulse-soft.pulse-2 { animation: pulse-fade-soft 2.5s ease-out infinite 0.83s; }
        .pulse-soft.pulse-3 { animation: pulse-fade-soft 2.5s ease-out infinite 1.66s; }
        .pulse-strong.pulse-1 { animation: pulse-fade-strong 1.5s ease-out infinite; }
        .pulse-strong.pulse-2 { animation: pulse-fade-strong 1.5s ease-out infinite 0.5s; }
        .pulse-strong.pulse-3 { animation: pulse-fade-strong 1.5s ease-out infinite 1s; }

        @keyframes pulse-fade-soft { 0% { opacity: 0; } 15% { opacity: 0.3; } 50% { opacity: 0.15; } 100% { opacity: 0; } }
        @keyframes pulse-fade-strong { 0% { opacity: 0; } 10% { opacity: 0.8; } 35% { opacity: 0.5; } 100% { opacity: 0; } }
        @keyframes success-celebrate { 0% { transform: scale(1); } 30% { transform: scale(1.12); } 100% { transform: scale(1); } }
        @keyframes penalty-flash { 0%, 100% { opacity: 1; } 50% { opacity: 0.65; } }
      `}</style>
    </svg>
  );
}
