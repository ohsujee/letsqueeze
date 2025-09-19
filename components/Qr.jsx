"use client";

export default function Qr({ text, size = 256, className = "" }) {
  // Vérification et fallback
  const safeText = text || "https://example.com";
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(safeText)}`;

  // Debug en développement
  if (process.env.NODE_ENV === 'development' && !text) {
    console.warn('Qr component: text prop is undefined');
  }

  return (
    <div className={`qr-container ${className}`}>
      <img 
        src={qrUrl}
        alt="QR Code"
        className="qr-image"
        style={{ 
          width: size,
          height: size,
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-soft)"
        }} 
      />
      
      {/* Affichage debug en dev */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.7 }}>
          {text ? text.substring(0, 50) + '...' : 'URL undefined'}
        </div>
      )}
      
      <style jsx>{`
        .qr-container {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 1rem;
          background: #F8FAFC;
          border-radius: var(--radius-lg);
          border: 3px solid var(--retro-blue);
          box-shadow: var(--shadow-medium);
          transition: all 0.2s ease;
        }
        
        .qr-container:hover {
          box-shadow: var(--shadow-large);
          transform: translateY(-2px);
        }
        
        .qr-image {
          display: block;
        }
        
        @media (max-width: 640px) {
          .qr-container {
            padding: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}
