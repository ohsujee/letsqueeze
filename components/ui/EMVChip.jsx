/**
 * EMV Chip — surface or continue avec rainures gravées + cercle central
 */
export default function EMVChip({ className }) {
  const W  = 56;
  const H  = 44;
  const rx = 8;

  const gap    = W * 0.22;
  const vLeft  = W * 0.5 - gap / 2;
  const vRight = W * 0.5 + gap / 2;

  const rowH  = H / 4;
  const hLines = [1, 2, 3].map(i => rowH * i);

  const sw = 0.9;

  const sqHalf = W * 0.27; // demi-côté du carré — dépasse les deux lignes
  const sqX = W / 2 - sqHalf;
  const sqY = H / 2 - sqHalf;
  const sqS = sqHalf * 2;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="emv-surface" x1="10%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%"   stopColor="#f0d868" />
          <stop offset="25%"  stopColor="#dfc040" />
          <stop offset="55%"  stopColor="#b89020" />
          <stop offset="80%"  stopColor="#d4b030" />
          <stop offset="100%" stopColor="#eecc50" />
        </linearGradient>

        {/* Clip externe — coins arrondis du chip */}
        <clipPath id="emv-clip">
          <rect x="0" y="0" width={W} height={H} rx={rx} ry={rx} />
        </clipPath>

        {/* Masque : tout visible sauf l'intérieur du carré */}
        <mask id="no-circle">
          <rect x="0" y="0" width={W} height={H} fill="white" />
          <rect x={sqX} y={sqY} width={sqS} height={sqS} fill="black" />
        </mask>
      </defs>

      {/* Corps */}
      <rect
        x="0" y="0" width={W} height={H}
        rx={rx} ry={rx}
        fill="url(#emv-surface)"
        stroke="rgba(0,0,0,0.22)"
        strokeWidth="0.5"
      />

      {/* Lignes — clippées aux coins ET masquées hors du cercle */}
      <g clipPath="url(#emv-clip)" mask="url(#no-circle)" stroke="#6b4200" strokeLinecap="butt" opacity="0.55">
        <line x1={vLeft}  y1={0} x2={vLeft}  y2={H} strokeWidth={sw} />
        <line x1={vRight} y1={0} x2={vRight} y2={H} strokeWidth={sw} />
        {hLines.map((y, i) => (
          <g key={i}>
            <line x1={0}      y1={y} x2={vLeft}  y2={y} strokeWidth={sw} />
            <line x1={vRight} y1={y} x2={W}      y2={y} strokeWidth={sw} />
          </g>
        ))}
      </g>

      {/* Carré central — surface or sans aucune ligne */}
      <g clipPath="url(#emv-clip)">
        <rect
          x={sqX} y={sqY} width={sqS} height={sqS}
          fill="url(#emv-surface)"
          stroke="#6b4200"
          strokeWidth={sw}
          opacity="0.55"
        />
      </g>
    </svg>
  );
}
