"use client";
import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export default function Qr({ text, size = 256, className = "" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!text || !canvasRef.current) return;

    QRCode.toCanvas(
      canvasRef.current,
      text,
      {
        width: size,
        margin: 2,
        color: {
          dark: "#0F172A",    // Bleu foncé pour le QR
          light: "#F8FAFC"    // Blanc cassé pour le fond
        },
        errorCorrectionLevel: "M"
      },
      (error) => {
        if (error) console.error("QR Code generation error:", error);
      }
    );
  }, [text, size]);

  return (
    <div className={`qr-container ${className}`}>
      <canvas 
        ref={canvasRef} 
        className="qr-canvas"
        style={{ 
          maxWidth: "100%", 
          height: "auto",
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
        
        .qr-canvas {
          display: block;
          border-radius: var(--radius-md);
          background: #F8FAFC;
        }
        
        /* Responsive */
        @media (max-width: 640px) {
          .qr-container {
            padding: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}
