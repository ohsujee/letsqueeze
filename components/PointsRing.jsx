"use client";
export default function PointsRing({ value = 0, points = 0, size = 110, label = "pts" }) {
  const deg = Math.max(0, Math.min(360, value * 360));
  const style = {
    "--deg": `${deg}deg`,
    "--size": `${size}px`,
  };
  return (
    <div className="ring-wrap" style={style}>
      <div className="ring"></div>
      <div className="ring-label">{points}</div>
      <div className="text-xs opacity-80" style={{ position: "absolute", bottom: 8 }}>{label}</div>
    </div>
  );
}
