"use client";

export default function Qr({ text, size = 256, className = "" }) {
  // Si pas de texte, ne rien afficher
  if (!text) {
    return null;
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
          padding: 1.25rem;
          background: linear-gradient(135deg, #FFFFFF, #F8F9FA);
          border-radius: 16px;
          border: 3px solid rgba(139, 92, 246, 0.3);
          box-shadow:
            0 8px 24px rgba(0, 0, 0, 0.15),
            0 0 40px rgba(139, 92, 246, 0.1);
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .qr-container:hover {
          box-shadow:
            0 12px 32px rgba(0, 0, 0, 0.2),
            0 0 60px rgba(139, 92, 246, 0.15);
          transform: translateY(-4px) scale(1.02);
          border-color: rgba(139, 92, 246, 0.5);
        }

        .qr-image {
          display: block;
        }

        @media (max-width: 640px) {
          .qr-container {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
