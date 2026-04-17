'use client';

/**
 * DailyTabs — tabs horizontaux flat (ex: Jeu / Classement).
 *
 * Props :
 *  - tabs    : [{ id, label, icon? (JSX) }]
 *  - active  : id courant
 *  - onChange: (id) => void
 */

export default function DailyTabs({ tabs, active, onChange }) {
  return (
    <div className="daily-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`daily-tab${active === tab.id ? ' active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
