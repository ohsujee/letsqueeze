"use client";

export default function PointsRing({ value = 0, points = 0, size = 100, label = "pts", revealed = false }) {
  // Si pas révélé, le ring est à 100%
  // Si révélé, on utilise la vraie valeur pour l'animation dégressive FLUIDE
  const displayValue = revealed ? Math.max(0, Math.min(1, value)) : 1;
  
  // Couleurs dynamiques selon la valeur qui baisse PROGRESSIVEMENT
  const getColor = () => {
    if (!revealed) return '#10B981'; // Vert quand pas révélé
    
    const realValue = Math.max(0, Math.min(1, value));
    if (realValue > 0.7) return '#10B981'; // Vert (70-100%)
    if (realValue > 0.4) return '#F59E0B'; // Orange (40-70%)  
    if (realValue > 0.1) return '#EF4444'; // Rouge (10-40%)
    return '#64748B'; // Gris (0-10% - temps écoulé)
  };

  const ringColor = getColor();
  
  return (
    <div className="ring-wrap" style={{ '--size': `${size}px` }}>
      {/* Ring avec animation CSS dégressive */}
      <div 
        className="ring"
        style={{
          '--progress': `${displayValue * 100}%`,
          '--ring-color': ringColor
        }}
      />
      
      {/* Content overlay */}
      <div className="ring-content">
        <div className="ring-number" style={{ color: ringColor }}>
          {points}
        </div>
        <div className="ring-text">
          {label}
        </div>
      </div>
      
      <style jsx>{`
        .ring-wrap {
          width: var(--size);
          height: var(--size);
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: conic-gradient(
            var(--ring-color) var(--progress), 
            #334155 var(--progress)
          );
          transition: ${revealed ? 'background 0.05s linear' : 'background 0.3s ease'};
          border: 4px solid #0F172A;
          filter: drop-shadow(0 0 15px color-mix(in srgb, var(--ring-color) 40%, transparent));
        }
        
        .ring::after {
          content: "";
          position: absolute;
          inset: 12px;
          border-radius: 50%;
          background: #1E293B;
          border: 3px solid var(--ring-color);
          transition: border-color 0.2s ease;
        }
        
        .ring-content {
          position: relative;
          z-index: 10;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        
        .ring-number {
          font-size: ${size > 80 ? '1.5rem' : '1.25rem'};
          font-weight: 900;
          line-height: 1;
          text-shadow: 0 2px 6px rgba(0, 0, 0, 0.7);
          margin-bottom: 2px;
          transition: color 0.2s ease;
        }
        
        .ring-text {
          font-size: ${size > 80 ? '0.75rem' : '0.625rem'};
          font-weight: 600;
          color: #CBD5E1;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          line-height: 1;
          opacity: 0.8;
        }
        
        /* Responsive */
        @media (max-width: 640px) {
          .ring-number {
            font-size: ${size > 80 ? '1.25rem' : '1rem'};
          }
          
          .ring-text {
            font-size: ${size > 80 ? '0.625rem' : '0.5rem'};
          }
        }
      `}</style>
    </div>
  );
}
