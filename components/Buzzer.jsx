"use client";
export default function Buzzer({ onBuzz, disabled }) {
  const enabled = !disabled;
  return (
    <>
      {/* Espace de sécurité pour ne pas recouvrir le contenu */}
      <div className="h-36" aria-hidden="true" />
      <div
        className="fixed left-1/2 -translate-x-1/2 bottom-6 z-40"
        style={{ pointerEvents: enabled ? "auto" : "none" }}
      >
        <button
          onClick={onBuzz}
          disabled={!enabled}
          aria-disabled={!enabled}
          className={[
            "select-none rounded-full border-8 border-black font-extrabold",
            "flex items-center justify-center",
            "w-48 h-48 md:w-56 md:h-56",       // ++ taille
            "text-3xl md:text-4xl",
            "shadow-lg transition-colors duration-150 ease-out",
            enabled
              ? "bg-gray-200 text-black hover:bg-red-600 hover:text-white active:bg-red-700 active:text-white"
              : "bg-gray-200 text-black opacity-50 grayscale cursor-not-allowed"
          ].join(" ")}
          style={{ textShadow: enabled ? "0 2px 0 rgba(0,0,0,.25)" : "none" }}
        >
          BUZZ
        </button>
      </div>
    </>
  );
}
