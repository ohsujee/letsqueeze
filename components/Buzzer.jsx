"use client";
export default function Buzzer({ onBuzz, disabled }) {
  return (
    <button
      disabled={disabled}
      onClick={() => { if (navigator?.vibrate) navigator.vibrate([18]); onBuzz?.(); }}
      className={
        "btn btn-primary w-full h-28 md:h-32 text-3xl tracking-wide " +
        (disabled ? "opacity-50 cursor-not-allowed" : "")
      }
      aria-label="Buzz"
      title={disabled ? "Buzzer indisponible" : "BUZZ !"}
    >
      BUZZ !
    </button>
  );
}
