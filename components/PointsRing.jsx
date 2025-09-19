"use client";

export default function PointsRing({ value = 0, points = 0, size = 100, label = "pts", revealed = false }) {
  // Si pas révélé, le ring est toujours à 100%
  // Si révélé, on utilise la vraie valeur pour l'animation dégressive
  const displayValue = revealed ? Math.max(0, Math.min(1, value)) : 1;
  const degrees = displayValue * 360;
  
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
    "--deg": `${degrees}deg`,
    "--size": `${size}px`,
    "--ring-color": ringColor,
  };

  return (
    <div className="ring-wrap" style={style}>
      {/* Ring CSS pur pour animation fluide */}
      <div 
        className="ring" 
        style={{
          background: `conic-gradient(${ringColor} ${degrees}deg, var(--bg-accent) 0deg)`,
          filter: `drop-shadow(0 0 12px ${ringColor}40)`
        }}
      />
      
      {/* Content overlay */}
      <div className="ring-label">
        <div className="ring-number">
          {points}
        </div>
        <div className="ring-text">
          {label}
        </div>
      </div>
      
      <style jsx>{`
        .ring-wrap {
          --size: ${size}px;
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
          transition: ${revealed ? 'background 0.1s linear' : 'background 0.3s ease'};
          border: 4px solid var(--bg-primary);
        }
        
        .ring::after {
          content: "";
          position: absolute;
          inset: 12px;
          border-radius: 50%;
          background: var(--bg-secondary);
          border: 3px solid var(--ring-color);
          transition: border-color 0.3s ease;
        }
        
        .ring-label {
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
          font-weight: 800;
          color: var(--ring-color);
          line-height: 1;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
          margin-bottom: 2px;
          transition: color 0.3s ease;
        }
        
        .ring-text {
          font-size: ${size > 80 ? '0.75rem' : '0.625rem'};
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          line-height: 1;
          opacity: 0.8;
        }
        
        /* Animation de changement de points */
        @keyframes points-bounce {
          0% { transform: scale(1); }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        
        .ring-number {
          animation: points-bounce 0.4s ease;
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
