"use client";

export default function PointsRing({ value = 0, points = 0, size = 100, label = "pts", revealed = false }) {
  // Si pas révélé, le ring est à 100%
  // Si révélé, on utilise la vraie valeur pour l'animation dégressive
  const displayValue = revealed ? Math.max(0, Math.min(1, value)) : 1;
  
  // Couleurs dynamiques selon la valeur qui baisse
  const getColor = () => {
    if (!revealed) return '#10B981'; // Vert quand pas révélé
    
    const realValue = Math.max(0, Math.min(1, value));
    if (realValue > 0.7) return '#10B981'; // Vert (beaucoup de temps)
    if (realValue > 0.4) return '#F59E0B'; // Orange (temps moyen)  
    if (realValue > 0.1) return '#EF4444'; // Rouge (peu de temps)
    return '#64748B'; // Gris (temps écoulé)
  };

  const ringColor = getColor();
  
  const style = {
    "--size": `${size}px`,
    "--ring-color": ringColor,
  };

  return (
    <div className="points-ring-container" style={style}>
      {/* Ring SVG pour animation fluide comme l'original */}
      <svg 
        width={size} 
        height={size} 
        className="points-ring-svg"
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - 16) / 2}
          fill="none"
          stroke="#334155"
          strokeWidth="6"
          opacity="0.3"
        />
        
        {/* Progress circle avec animation */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - 16) / 2}
          fill="none"
          stroke={ringColor}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${Math.PI * (size - 16)} ${Math.PI * (size - 16)}`}
          strokeDashoffset={Math.PI * (size - 16) * (1 - displayValue)}
          className="points-ring-progress"
        />
        
        {/* Glow effect circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - 16) / 2}
          fill="none"
          stroke={ringColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={`${Math.PI * (size - 16)} ${Math.PI * (size - 16)}`}
          strokeDashoffset={Math.PI * (size - 16) * (1 - displayValue)}
          className="points-ring-glow"
          opacity="0.6"
        />
      </svg>
      
      {/* Content overlay */}
      <div className="points-ring-content">
        <div className="points-ring-number" style={{ color: ringColor }}>
          {points}
        </div>
        <div className="points-ring-label">
          {label}
        </div>
      </div>
      
      <style jsx>{`
        .points-ring-container {
          position: relative;
          width: var(--size);
          height: var(--size);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .points-ring-svg {
          position: absolute;
          filter: drop-shadow(0 0 12px color-mix(in srgb, var(--ring-color) 30%, transparent));
        }
        
        .points-ring-progress {
          transition: ${revealed ? 'stroke-dashoffset 0.1s linear, stroke 0.3s ease' : 'stroke 0.3s ease'};
        }
        
        .points-ring-glow {
          filter: blur(2px);
          transition: ${revealed ? 'stroke-dashoffset 0.1s linear, stroke 0.3s ease' : 'stroke 0.3s ease'};
        }
        
        .points-ring-content {
          position: relative;
          z-index: 10;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }
        
        .points-ring-number {
          font-size: ${size > 80 ? '1.5rem' : '1.25rem'};
          font-weight: 800;
          line-height: 1;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
          margin-bottom: 2px;
          transition: color 0.3s ease;
        }
        
        .points-ring-label {
          font-size: ${size > 80 ? '0.75rem' : '0.625rem'};
          font-weight: 600;
          color: #CBD5E1;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          line-height: 1;
          opacity: 0.8;
        }
        
        /* Animation quand les points changent */
        @keyframes points-change {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        
        /* Responsive adjustments */
        @media (max-width: 640px) {
          .points-ring-number {
            font-size: ${size > 80 ? '1.25rem' : '1rem'};
          }
          
          .points-ring-label {
            font-size: ${size > 80 ? '0.625rem' : '0.5rem'};
          }
        }
      `}</style>
    </div>
  );
}
