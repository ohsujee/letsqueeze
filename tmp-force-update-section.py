#!/usr/bin/env python3
"""Replace force update section in Punkrecords notifications page."""

filepath = '/opt/punkrecords/app/notifications/page.jsx'

with open(filepath, 'r') as f:
    content = f.read()

# 1. Replace state declarations
content = content.replace(
    "const [forceUpdateVersion, setForceUpdateVersion] = useState('');",
    "const [forceIos, setForceIos] = useState('');\n  const [forceAndroid, setForceAndroid] = useState('');"
)
content = content.replace(
    "const [currentForceVersion, setCurrentForceVersion] = useState('0.0.0');",
    "const [currentForceIos, setCurrentForceIos] = useState('0.0.0');\n  const [currentForceAndroid, setCurrentForceAndroid] = useState('0.0.0');"
)
content = content.replace(
    "const [savingForceUpdate, setSavingForceUpdate] = useState(false);",
    "const [savingForceUpdate, setSavingForceUpdate] = useState(null);"
)

# 2. Replace fetchForceUpdateVersion
old_fetch = """  async function fetchForceUpdateVersion() {
    try {
      const res = await fetch('/api/notifications/force-update');
      const json = await res.json();
      setCurrentForceVersion(json.version || '0.0.0');
      setForceUpdateVersion(json.version === '0.0.0' ? '' : json.version);
    } catch {}
  }"""

new_fetch = """  async function fetchForceUpdateVersion() {
    try {
      const res = await fetch('/api/notifications/force-update');
      const json = await res.json();
      setCurrentForceIos(json.ios || '0.0.0');
      setCurrentForceAndroid(json.android || '0.0.0');
      setForceIos(json.ios === '0.0.0' ? '' : (json.ios || ''));
      setForceAndroid(json.android === '0.0.0' ? '' : (json.android || ''));
    } catch {}
  }"""

content = content.replace(old_fetch, new_fetch)

# 3. Replace handleSetForceUpdate
old_handler = """  async function handleSetForceUpdate() {
    setSavingForceUpdate(true);
    setForceUpdateResult(null);
    try {
      const version = forceUpdateVersion.trim() || '0.0.0';
      const res = await fetch('/api/notifications/force-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version }),
      });
      const json = await res.json();
      if (json.success) {
        setCurrentForceVersion(version);
        setForceUpdateResult({ success: true, version });
      } else {
        setForceUpdateResult({ error: json.error });
      }
    } catch (err) {
      setForceUpdateResult({ error: err.message });
    }
    setSavingForceUpdate(false);
  }"""

new_handler = """  async function handleSetForceUpdate(platform) {
    setSavingForceUpdate(platform);
    setForceUpdateResult(null);
    try {
      const version = (platform === 'ios' ? forceIos.trim() : forceAndroid.trim()) || '0.0.0';
      const res = await fetch('/api/notifications/force-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version, platform }),
      });
      const json = await res.json();
      if (json.success) {
        if (platform === 'ios') setCurrentForceIos(version);
        else setCurrentForceAndroid(version);
        setForceUpdateResult({ success: true, version, platform });
      } else {
        setForceUpdateResult({ error: json.error });
      }
    } catch (err) {
      setForceUpdateResult({ error: err.message });
    }
    setSavingForceUpdate(null);
  }"""

content = content.replace(old_handler, new_handler)

# 4. Replace Section 3 UI
# Find boundaries
lines = content.split('\n')
start_idx = None
end_idx = None
for i, line in enumerate(lines):
    if 'SECTION 3' in line:
        start_idx = i
    elif 'SECTION 4' in line:
        end_idx = i
        break

if start_idx is None or end_idx is None:
    print(f'ERROR: Could not find section boundaries (start={start_idx}, end={end_idx})')
    import sys
    sys.exit(1)

new_section_lines = [
    '      {/* SECTION 3 \u2014 Force Update */}',
    '      <section className="mb-10">',
    '        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">',
    '          Forcer une mise \u00e0 jour',
    '        </h2>',
    '        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">',
    '          <p className="text-xs text-zinc-500 mb-4 leading-relaxed">',
    '            Les utilisateurs dont la version est inf\u00e9rieure verront une modale',
    '            bloquante les for\u00e7ant \u00e0 mettre \u00e0 jour. Configurable par plateforme.',
    '          </p>',
    '',
    '          {/* iOS */}',
    '          <div className="mb-4">',
    '            <div className="flex items-center gap-2 mb-2">',
    '              <span className="text-xs font-semibold text-zinc-300">\U0001f34f iOS</span>',
    '              <span className="text-xs text-zinc-600 font-mono">',
    "                (actuel : {currentForceIos}{currentForceIos === '0.0.0' && ' \u2014 d\u00e9sactiv\u00e9'})",
    '              </span>',
    '            </div>',
    '            <div className="flex items-center gap-3">',
    '              <input',
    '                className="bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-white font-mono w-32 focus:outline-none focus:border-blue-500 transition-colors"',
    '                placeholder="1.0.7"',
    '                value={forceIos}',
    '                onChange={(e) => setForceIos(e.target.value)}',
    '              />',
    '              <button',
    "                onClick={() => handleSetForceUpdate('ios')}",
    "                disabled={savingForceUpdate === 'ios'}",
    '                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors"',
    '              >',
    "                {savingForceUpdate === 'ios' ? '...' : 'Appliquer'}",
    '              </button>',
    "              {currentForceIos !== '0.0.0' && (",
    '                <button',
    "                  onClick={() => { setForceIos(''); handleSetForceUpdate('ios'); }}",
    '                  className="px-3 py-2 bg-[#09090b] border border-[#27272a] text-zinc-400 hover:text-zinc-200 text-xs rounded-lg transition-colors"',
    '                >',
    '                  D\u00e9sactiver',
    '                </button>',
    '              )}',
    '            </div>',
    '          </div>',
    '',
    '          {/* Android */}',
    '          <div className="mb-3">',
    '            <div className="flex items-center gap-2 mb-2">',
    '              <span className="text-xs font-semibold text-zinc-300">\U0001f916 Android</span>',
    '              <span className="text-xs text-zinc-600 font-mono">',
    "                (actuel : {currentForceAndroid}{currentForceAndroid === '0.0.0' && ' \u2014 d\u00e9sactiv\u00e9'})",
    '              </span>',
    '            </div>',
    '            <div className="flex items-center gap-3">',
    '              <input',
    '                className="bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-white font-mono w-32 focus:outline-none focus:border-green-500 transition-colors"',
    '                placeholder="1.0.6"',
    '                value={forceAndroid}',
    '                onChange={(e) => setForceAndroid(e.target.value)}',
    '              />',
    '              <button',
    "                onClick={() => handleSetForceUpdate('android')}",
    "                disabled={savingForceUpdate === 'android'}",
    '                className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors"',
    '              >',
    "                {savingForceUpdate === 'android' ? '...' : 'Appliquer'}",
    '              </button>',
    "              {currentForceAndroid !== '0.0.0' && (",
    '                <button',
    "                  onClick={() => { setForceAndroid(''); handleSetForceUpdate('android'); }}",
    '                  className="px-3 py-2 bg-[#09090b] border border-[#27272a] text-zinc-400 hover:text-zinc-200 text-xs rounded-lg transition-colors"',
    '                >',
    '                  D\u00e9sactiver',
    '                </button>',
    '              )}',
    '            </div>',
    '          </div>',
    '',
    '          {/* R\u00e9sultat */}',
    '          {forceUpdateResult && (',
    '            <div className={`text-xs mt-2 ${forceUpdateResult.error ? \'text-red-400\' : \'text-green-400\'}`}>',
    '              {forceUpdateResult.error',
    '                ? `Erreur : ${forceUpdateResult.error}`',
    '                : `\u2713 ${forceUpdateResult.platform === \'ios\' ? \'iOS\' : \'Android\'} \u2192 version minimale : ${forceUpdateResult.version}`}',
    '            </div>',
    '          )}',
    '',
    '          {/* R\u00e9partition des versions */}',
    '          {versionStats && versionStats.versions && versionStats.versions.length > 0 && (',
    '            <div className="mt-4 bg-[#09090b] border border-[#27272a] rounded-xl p-4">',
    '              <div className="flex items-center justify-between mb-3">',
    '                <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">R\u00e9partition des versions</p>',
    '                <div className="flex items-center gap-3 text-xs text-zinc-600">',
    '                  {versionStats.platforms && Object.entries(versionStats.platforms).map(([p, c]) => (',
    '                    <span key={p} className="font-mono">{p}: {c}</span>',
    '                  ))}',
    '                </div>',
    '              </div>',
    '              <div className="space-y-2">',
    '                {versionStats.versions.map(({ version, count }) => {',
    '                  const total = versionStats.versions.reduce((s, v) => s + v.count, 0);',
    '                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;',
    '                  return (',
    '                    <div key={version} className="flex items-center gap-3">',
    '                      <span className="text-xs font-mono w-16 flex-shrink-0 text-zinc-300">{version}</span>',
    '                      <div className="flex-1 h-2 bg-[#18181b] rounded-full overflow-hidden">',
    '                        <div',
    '                          className="h-full rounded-full transition-all bg-violet-500/60"',
    '                          style={{ width: `${pct}%` }}',
    '                        />',
    '                      </div>',
    '                      <span className="text-xs text-zinc-500 tabular-nums w-16 text-right">{count} ({pct}%)</span>',
    '                    </div>',
    '                  );',
    '                })}',
    '              </div>',
    '            </div>',
    '          )}',
    '        </div>',
    '      </section>',
    '',
]

result = lines[:start_idx] + new_section_lines + lines[end_idx:]

with open(filepath, 'w') as f:
    f.write('\n'.join(result))

print(f'OK - replaced Section 3 (lines {start_idx+1}-{end_idx})')
