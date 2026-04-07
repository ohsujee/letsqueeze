/**
 * FlameIcon — SVG flamme premium avec gradients rose/jaune.
 * Rendu identique sur tous les devices (pas un emoji).
 * Usage: badges streak, daily cards.
 */
export default function FlameIcon({ size = 16, className = '', count }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ flexShrink: 0, display: 'block' }}
    >
      <defs>
        <linearGradient id="flame-lg1" x1="144.136" x2="355.312" y1="176.577" y2="387.753" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffa1ae" />
          <stop offset="1" stopColor="#ff4565" />
        </linearGradient>
        <linearGradient id="flame-lg2" x1="304.107" x2="378.959" y1="372.9" y2="463.435" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fe0364" stopOpacity="0" />
          <stop offset=".234" stopColor="#f90362" stopOpacity=".234" />
          <stop offset=".517" stopColor="#ea035b" stopOpacity=".517" />
          <stop offset=".824" stopColor="#d20250" stopOpacity=".824" />
          <stop offset="1" stopColor="#c00148" />
        </linearGradient>
        <linearGradient id="flame-lg3" x1="206.504" x2="303.454" y1="298.818" y2="411.451" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fef0ae" />
          <stop offset="1" stopColor="#fac600" />
        </linearGradient>
        <linearGradient id="flame-lg4" x1="308.988" x2="443.008" y1="231.39" y2="170.083" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fe0364" stopOpacity="0" />
          <stop offset=".234" stopColor="#f90362" stopOpacity=".234" />
          <stop offset=".517" stopColor="#ea035b" stopOpacity=".517" />
          <stop offset=".824" stopColor="#d20250" stopOpacity=".824" />
          <stop offset="1" stopColor="#c00148" />
        </linearGradient>
      </defs>
      {/* Outer flame — pink/red */}
      <path
        d="m451.949 250.75c-.144.311-.289.621-.435.931-5.698 12.125-23.926 7.311-22.803-6.039 2.052-24.399-.966-49.619-9.757-74.177-28.536-79.714-124.345-170.479-209.186-171.464-9.06-.105-14.262 10.267-8.915 17.581 7.129 9.75 12.918 20.741 17.017 32.797 13.454 39.575 5.172 81.709-18.518 113.013-9.876 13.05-30.846 6.605-31.191-9.757-.003-.118-.005-.237-.007-.356-.139-8.674 1.284-17.002 4.014-24.715 1.204-3.401-1.949-6.748-5.403-5.707-48.097 14.497-84.67 85.273-84.67 135.756 0 3.687.205 7.326.586 10.912.047 6.705 1.18 13.525 3.549 20.232.085.241.171.481.257.722.738 2.061 1.522 4.093 2.328 6.109-11.391-13.925-21.081-29.297-28.745-45.801-3.561-7.668-14.832-6.146-16.216 2.195-2.466 14.854-3.757 29.342-3.757 43.115 0 119.24 96.663 215.903 215.903 215.903s215.903-96.663 215.903-215.903c0-13.774-1.291-28.263-3.758-43.119-1.381-8.321-12.645-9.88-16.196-2.228z"
        fill="url(#flame-lg1)"
      />
      {/* Outer flame — dark overlay */}
      <path
        d="m471.903 296.097c0-13.774-1.291-28.263-3.758-43.119-1.382-8.321-12.646-9.88-16.197-2.228-.144.311-.289.621-.435.931-5.698 12.125-23.926 7.311-22.803-6.039 2.052-24.399-.966-49.619-9.757-74.177-28.535-79.714-124.344-170.479-209.185-171.464-9.06-.105-14.262 10.267-8.915 17.582 7.129 9.75 12.918 20.741 17.017 32.797 13.454 39.575 5.172 81.709-18.518 113.013-4.918 6.498-12.586 8.16-19.089 6.173v328.762c23.568 8.831 49.086 13.672 75.737 13.672 119.24 0 215.903-96.663 215.903-215.903z"
        fill="url(#flame-lg4)"
      />
      {/* Inner flame — yellow/gold */}
      <path
        d="m365.38 332.911c-.081.174-.161.347-.243.52-3.18 6.768-13.355 4.081-12.729-3.371 1.145-13.62-.539-27.697-5.447-41.406-15.929-44.497-69.41-95.163-116.769-95.713-5.058-.059-7.961 5.731-4.976 9.814 3.979 5.443 7.211 11.578 9.499 18.308 7.51 22.091 2.887 45.611-10.337 63.085-5.513 7.285-17.218 3.687-17.411-5.447-.001-.066-.003-.132-.004-.199-.078-4.842.717-9.491 2.241-13.796.672-1.898-1.088-3.767-3.016-3.186-26.848 8.093-47.263 47.6-47.263 75.78 0 2.058.115 4.089.327 6.091.026 3.743.659 7.549 1.981 11.293.048.134.095.269.143.403.412 1.151.85 2.284 1.299 3.41-6.359-7.773-11.767-16.354-16.046-25.566-1.988-4.281-8.279-3.43-9.052 1.225-1.377 8.292-2.097 16.379-2.097 24.067 0 66.561 53.958 120.519 120.519 120.519s120.519-53.958 120.519-120.519c0-7.689-.721-15.777-2.098-24.069-.77-4.644-7.058-5.514-9.04-1.243z"
        fill="url(#flame-lg3)"
      />
      {/* Inner flame — dark overlay */}
      <path
        d="m376.519 358.224c0-7.689-.721-15.777-2.098-24.069-.771-4.645-7.059-5.515-9.041-1.244-.081.174-.161.347-.243.52-3.18 6.768-13.355 4.081-12.729-3.371 1.145-13.62-.539-27.697-5.447-41.406-15.929-44.497-69.41-95.163-116.769-95.713-5.058-.059-7.961 5.731-4.976 9.814 3.979 5.443 7.211 11.578 9.499 18.308 7.51 22.091 2.887 45.611-10.337 63.085-2.745 3.627-7.025 4.555-10.655 3.446v183.517c13.156 4.929 27.4 7.632 42.277 7.632 66.561 0 120.519-53.959 120.519-120.519z"
        fill="url(#flame-lg2)"
      />
      {/* Count number centered in flame */}
      {count != null && (
        <>
          <text
            x="256"
            y="390"
            textAnchor="middle"
            dominantBaseline="central"
            fill="none"
            stroke="#7c2d12"
            strokeWidth="24"
            strokeLinejoin="round"
            fontSize={count > 99 ? '160' : count > 9 ? '200' : '220'}
            fontFamily="'Bungee', sans-serif"
            fontWeight="400"
          >
            {count}
          </text>
          <text
            x="256"
            y="390"
            textAnchor="middle"
            dominantBaseline="central"
            fill="#fff"
            fontSize={count > 99 ? '160' : count > 9 ? '200' : '220'}
            fontFamily="'Bungee', sans-serif"
            fontWeight="400"
          >
            {count}
          </text>
        </>
      )}
    </svg>
  );
}
