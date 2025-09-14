"use client";
export default function Buzzer({ onBuzz, disabled }) {
  return (
    <>
      {/* Espace de sécurité pour éviter la superposition sur le contenu */}
      <div className="h-28" aria-hidden="true" />
      <div
        className="fixed left-1/2 -translate-x-1/2 bottom-4 z-40"
        style={{ pointerEvents: disabled ? "none" : "auto" }}
      >
        <button
          onClick={onBuzz}
          disabled={disabled}
          aria-disabled={disabled}
          className={`select-none rounded-full border-4 border-black font-extrabold text-3xl px-10 py-8 shadow-lg
            ${disabled ? "opacity-50 grayscale cursor-not-allowed" : "bg-pink-500 active:scale-95"}
            text-white`}
          style={{
            textShadow: "0 2px 0 rgba(0,0,0,.35)"
          }}
        >
          BUZZ
        </button>
      </div>
    </>
  );
}
