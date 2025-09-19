"use client";

export default function Qr({ text, size = 256, className = "" }) {
  // Ne pas utiliser de fallback vers example.com
  if (!text) {
    return (
      <div className={`qr-container ${className}`}>
        <div style={{ 
          width: size, 
          height: size, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: '#f3f4f6',
          border: '2px dashed #9ca3af',
          borderRadius: 'var(--radius-lg)'
        }}>
          <span style={{ color: '#6b7280', fontSize: '14px' }}>Chargement...</span>
        </div>
        
        <style jsx>{`
          .qr-container {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 1rem;
            background: #F8FAFC;
            border-radius: var(--radius-lg);
            border: 3px solid var(--retro-blue);
            box-shadow: var(--shadow-medium);
          }
        `}</style>
      </div>
    );
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;

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
      
      <style jsx>{`
        .qr-container {
          display: flex;
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
