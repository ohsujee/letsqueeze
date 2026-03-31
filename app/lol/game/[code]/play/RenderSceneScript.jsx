/**
 * RenderSceneScript — Rendu coloré d'un script théâtre avec rôles et joueurs
 */

const ROLE_COLORS = ['#FFD700', '#06b6d4', '#ec4899', '#f59e0b', '#a78bfa', '#34d399'];

export default function RenderSceneScript({ script, roles, selectedPlayers, myUid, players: allPlayers }) {
  if (!script || !roles) return <div style={{ whiteSpace: 'pre-wrap', color: 'rgba(255,255,255,0.9)', lineHeight: 1.8 }}>{script}</div>;

  const roleColorMap = {};
  const rolePlayerMap = {};
  const myRoleName = selectedPlayers?.[myUid]?.role;

  roles.forEach((role, idx) => {
    roleColorMap[role.name] = ROLE_COLORS[idx % ROLE_COLORS.length];
  });

  if (selectedPlayers) {
    Object.entries(selectedPlayers).forEach(([uid, data]) => {
      const player = allPlayers?.find(p => p.uid === uid);
      rolePlayerMap[data.role] = uid === myUid ? 'Toi' : (player?.name || '?');
    });
  }

  const lines = script.split('\n');
  const roleNames = roles.map(r => r.name);

  return (
    <div>
      {/* Legend */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px',
        padding: '10px 12px', borderRadius: '10px',
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
      }}>
        {roles.map((role, idx) => {
          const color = ROLE_COLORS[idx % ROLE_COLORS.length];
          const playerName = rolePlayerMap[role.name];
          const isMe = role.name === myRoleName;
          return (
            <div key={role.name} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '4px 10px', borderRadius: '8px',
              background: isMe ? `${color}18` : 'transparent',
              border: isMe ? `1px solid ${color}40` : '1px solid transparent',
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color }}>
                {role.name}
              </span>
              {playerName && (
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                  {isMe ? '(toi)' : playerName}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Script lines */}
      <div style={{ fontSize: '0.88rem', lineHeight: 1.9 }}>
        {lines.map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={i} style={{ height: '8px' }} />;

          const matchedRole = roleNames.find(name => trimmed.startsWith(name + ' :'));
          if (matchedRole) {
            const color = roleColorMap[matchedRole];
            const isMyLine = matchedRole === myRoleName;
            const afterRole = trimmed.substring(matchedRole.length + 2);

            return (
              <div key={i} style={{
                padding: '4px 8px', marginBottom: '2px', borderRadius: '6px',
                background: isMyLine ? `${color}12` : 'transparent',
                borderLeft: isMyLine ? `3px solid ${color}` : '3px solid transparent',
                marginLeft: '-8px', paddingLeft: isMyLine ? '8px' : '11px',
              }}>
                <span style={{ fontWeight: 800, color, fontSize: '0.8rem' }}>{matchedRole}</span>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}> : </span>
                <span style={{ color: isMyLine ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.75)' }}>
                  {afterRole}
                </span>
              </div>
            );
          }

          if (trimmed.startsWith('[')) {
            return (
              <div key={i} style={{
                padding: '2px 8px', fontStyle: 'italic',
                color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem',
              }}>
                {trimmed}
              </div>
            );
          }

          return (
            <div key={i} style={{ padding: '2px 8px', color: 'rgba(255,255,255,0.7)' }}>
              {trimmed}
            </div>
          );
        })}
      </div>
    </div>
  );
}
