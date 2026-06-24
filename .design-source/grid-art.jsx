// grid-art.jsx — clean line-art category icons + product illustrations
// Theme-aware: strokes use currentColor (set to --ink by the card), accents use var(--accent).

function GridCatIcon({ kind, size = 26 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (kind) {
    case 'desktop': return <svg {...p}><rect x="3" y="4" width="18" height="13" rx="0.5"/><path d="M8 21h8M12 17v4"/></svg>;
    case 'laptop':  return <svg {...p}><rect x="3" y="4" width="18" height="12" rx="0.5"/><path d="M2 20h20"/></svg>;
    case 'aio':     return <svg {...p}><rect x="2" y="4" width="20" height="14" rx="0.5"/><path d="M8 22h8M12 18v4M2 14h20"/></svg>;
    case 'tablet':  return <svg {...p}><rect x="5" y="3" width="14" height="18" rx="1"/><path d="M11 18h2"/></svg>;
    case 'phone':   return <svg {...p}><rect x="7" y="2" width="10" height="20" rx="1.5"/><path d="M11 19h2"/></svg>;
    case 'print':   return <svg {...p}><rect x="6" y="3" width="12" height="6"/><rect x="3" y="9" width="18" height="9" rx="0.5"/><rect x="6" y="14" width="12" height="6"/></svg>;
    case 'network': return <svg {...p}><circle cx="12" cy="18" r="2"/><path d="M6 12a8 8 0 0112 0M3 8a14 14 0 0118 0M9 15a5 5 0 016 0"/></svg>;
    case 'parts':   return <svg {...p}><rect x="4" y="4" width="16" height="16" rx="0.5"/><rect x="8" y="8" width="8" height="8"/><path d="M8 2v2M16 2v2M8 20v2M16 20v2M2 8h2M2 16h2M20 8h2M20 16h2"/></svg>;
    case 'gaming':  return <svg {...p}><path d="M6 11h4M8 9v4"/><circle cx="15" cy="11" r="1"/><circle cx="17.5" cy="13" r="0.8"/><rect x="2" y="6" width="20" height="12" rx="4"/></svg>;
    default:        return <svg {...p}><circle cx="12" cy="12" r="9"/></svg>;
  }
}

// product line-art — monochrome strokes + accent highlight
function GridDeviceArt({ kind, className = 'art' }) {
  const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinejoin: 'round', strokeLinecap: 'round' };
  const A = 'var(--accent)';
  const wrap = (children) => <svg className={className} viewBox="0 0 200 160" {...S}>{children}</svg>;

  switch (kind) {
    case 'desktop': return wrap(<>
      <rect x="26" y="34" width="58" height="92" />
      <rect x="36" y="46" width="38" height="6" fill={A} stroke="none"/>
      <line x1="36" y1="64" x2="68" y2="64"/><line x1="36" y1="74" x2="60" y2="74"/>
      <circle cx="55" cy="110" r="5"/>
      <rect x="98" y="40" width="76" height="64"/>
      <rect x="106" y="48" width="60" height="48" fill={A} stroke="none" opacity="0.12"/>
      <path d="M118 104 v10 M154 104 v10 M108 116 h58"/>
    </>);
    case 'desktop-mini': return wrap(<>
      <rect x="52" y="58" width="96" height="48"/>
      <circle cx="66" cy="72" r="3" fill={A} stroke="none"/>
      <line x1="62" y1="92" x2="138" y2="92"/>
      <line x1="62" y1="82" x2="118" y2="82"/>
    </>);
    case 'laptop': return wrap(<>
      <rect x="38" y="34" width="124" height="78"/>
      <rect x="48" y="44" width="104" height="58" fill={A} stroke="none" opacity="0.1"/>
      <line x1="48" y1="66" x2="120" y2="66"/><line x1="48" y1="78" x2="98" y2="78"/>
      <path d="M22 126 h156 l-10 -14 H32 Z"/>
    </>);
    case 'aio': return wrap(<>
      <rect x="26" y="26" width="148" height="92"/>
      <rect x="36" y="36" width="128" height="72" fill={A} stroke="none" opacity="0.1"/>
      <line x1="36" y1="62" x2="120" y2="62"/><line x1="36" y1="76" x2="96" y2="76"/>
      <path d="M86 118 h28 M78 134 h44"/>
    </>);
    case 'tablet': return wrap(<>
      <rect x="54" y="18" width="92" height="124" rx="6"/>
      <rect x="64" y="30" width="72" height="84" fill={A} stroke="none" opacity="0.12"/>
      <line x1="64" y1="58" x2="120" y2="58"/><line x1="64" y1="70" x2="104" y2="70"/>
      <line x1="92" y1="128" x2="108" y2="128"/>
    </>);
    case 'phone': return wrap(<>
      <rect x="72" y="14" width="56" height="132" rx="8"/>
      <rect x="80" y="34" width="40" height="22" fill={A} stroke="none"/>
      <line x1="80" y1="72" x2="120" y2="72"/><line x1="80" y1="86" x2="110" y2="86"/>
      <line x1="80" y1="100" x2="120" y2="100"/>
      <line x1="92" y1="20" x2="108" y2="20"/>
    </>);
    case 'feature': return wrap(<>
      <rect x="80" y="12" width="40" height="136" rx="4"/>
      <rect x="88" y="20" width="24" height="20" fill={A} stroke="none"/>
      <g stroke="currentColor"><line x1="88" y1="54" x2="112" y2="54"/><line x1="88" y1="66" x2="112" y2="66"/><line x1="88" y1="78" x2="112" y2="78"/><line x1="88" y1="90" x2="112" y2="90"/></g>
    </>);
    case 'printer-laser': return wrap(<>
      <rect x="36" y="38" width="92" height="18"/>
      <rect x="34" y="56" width="132" height="56"/>
      <rect x="44" y="66" width="40" height="6" fill={A} stroke="none"/>
      <rect x="140" y="66" width="14" height="9"/>
      <rect x="54" y="84" width="92" height="22"/>
      <rect x="54" y="112" width="60" height="18"/>
    </>);
    case 'printer-ink': return wrap(<>
      <rect x="32" y="48" width="136" height="64" rx="2"/>
      <rect x="44" y="58" width="60" height="8" fill={A} stroke="none"/>
      <g stroke="currentColor"><rect x="54" y="84" width="12" height="20"/><rect x="70" y="84" width="12" height="20"/><rect x="86" y="84" width="12" height="20"/><rect x="102" y="84" width="12" height="20"/></g>
      <rect x="64" y="30" width="72" height="20"/>
    </>);
    case 'copier': return wrap(<>
      <rect x="40" y="24" width="120" height="26"/>
      <rect x="50" y="32" width="50" height="10" fill={A} stroke="none"/>
      <rect x="46" y="56" width="108" height="56"/>
      <rect x="56" y="66" width="44" height="20"/>
      <rect x="110" y="66" width="36" height="20" fill={A} stroke="none" opacity="0.18"/>
      <rect x="56" y="94" width="90" height="14"/>
      <rect x="64" y="118" width="72" height="16"/>
    </>);
    case 'scanner': return wrap(<>
      <rect x="32" y="58" width="136" height="46"/>
      <rect x="32" y="46" width="136" height="14"/>
      <line x1="48" y1="82" x2="152" y2="82" stroke={A} strokeWidth="2.6" strokeDasharray="4 4"/>
    </>);
    case 'router': return wrap(<>
      <rect x="40" y="74" width="120" height="34" rx="2"/>
      <path d="M58 44 v30 M82 38 v36 M118 38 v36 M142 44 v30"/>
      <g stroke={A}><line x1="60" y1="92" x2="60" y2="92.5"/></g>
      <circle cx="60" cy="92" r="2.6" fill={A} stroke="none"/><circle cx="80" cy="92" r="2.6" fill="currentColor" stroke="none"/><circle cx="100" cy="92" r="2.6" fill={A} stroke="none"/><circle cx="120" cy="92" r="2.6" fill="currentColor" stroke="none"/>
    </>);
    case 'mesh': return wrap(<>
      <rect x="44" y="92" width="40" height="46" rx="6"/>
      <rect x="116" y="92" width="40" height="46" rx="6"/>
      <rect x="80" y="40" width="40" height="46" rx="6"/>
      <circle cx="64" cy="104" r="3" fill={A} stroke="none"/>
      <circle cx="100" cy="52" r="3" fill={A} stroke="none"/>
      <circle cx="136" cy="104" r="3" fill={A} stroke="none"/>
      <path d="M72 96 Q86 80 96 72 M128 96 Q114 80 104 72" stroke="currentColor" strokeDasharray="3 4" strokeWidth="1.6"/>
    </>);
    case 'switch': return wrap(<>
      <rect x="22" y="62" width="156" height="40" rx="2"/>
      <g stroke="currentColor" strokeWidth="2">
        <rect x="34" y="74" width="15" height="15"/><rect x="53" y="74" width="15" height="15"/><rect x="72" y="74" width="15" height="15"/><rect x="91" y="74" width="15" height="15"/>
        <rect x="110" y="74" width="15" height="15"/><rect x="129" y="74" width="15" height="15"/><rect x="148" y="74" width="15" height="15"/>
      </g>
      <circle cx="41" cy="96" r="1.6" fill={A} stroke="none"/><circle cx="60" cy="96" r="1.6" fill={A} stroke="none"/>
    </>);
    case 'ap': return wrap(<>
      <circle cx="100" cy="80" r="48"/>
      <circle cx="100" cy="80" r="30"/>
      <circle cx="100" cy="80" r="4" fill={A} stroke="none"/>
      <circle cx="100" cy="80" r="14" stroke={A} strokeWidth="1.6"/>
    </>);
    case 'wifi-usb': return wrap(<>
      <rect x="58" y="66" width="84" height="30" rx="4"/>
      <rect x="30" y="74" width="30" height="14"/>
      <path d="M150 60 Q166 80 152 100 M156 52 Q176 80 160 104" stroke={A} strokeWidth="2"/>
    </>);
    case 'wifi-pci': return wrap(<>
      <rect x="30" y="60" width="118" height="60"/>
      <rect x="40" y="72" width="26" height="22" fill={A} stroke="none" opacity="0.18"/>
      <rect x="74" y="72" width="40" height="30"/>
      <line x1="30" y1="120" x2="148" y2="120" stroke={A} strokeWidth="3"/>
      <path d="M156 56 l14 -16 M168 64 l16 -12" stroke="currentColor"/>
      <circle cx="170" cy="40" r="3" fill={A} stroke="none"/>
    </>);
    case 'psu': return wrap(<>
      <rect x="44" y="42" width="112" height="76"/>
      <circle cx="100" cy="80" r="28"/>
      <path d="M100 56 v24 l18 -8 M100 80 l-16 10" stroke={A} strokeWidth="2.4"/>
      <circle cx="100" cy="80" r="3" fill={A} stroke="none"/>
    </>);
    case 'case': return wrap(<>
      <rect x="64" y="20" width="72" height="120"/>
      <rect x="74" y="30" width="52" height="64"/>
      <line x1="82" y1="44" x2="118" y2="44" stroke={A} strokeWidth="3"/>
      <line x1="82" y1="56" x2="118" y2="56"/><line x1="82" y1="68" x2="104" y2="68"/>
      <circle cx="116" cy="84" r="6" stroke={A}/>
      <line x1="74" y1="112" x2="126" y2="112"/><line x1="74" y1="124" x2="126" y2="124"/>
    </>);
    case 'headset': return wrap(<>
      <path d="M48 92 Q48 38 100 38 Q152 38 152 92"/>
      <rect x="36" y="86" width="24" height="42" rx="6"/>
      <rect x="140" y="86" width="24" height="42" rx="6"/>
      <circle cx="48" cy="107" r="5" fill={A} stroke="none"/>
      <circle cx="152" cy="107" r="5" fill={A} stroke="none"/>
      <path d="M60 112 Q74 138 96 140" strokeWidth="2"/>
    </>);
    case 'mouse': return wrap(<>
      <path d="M100 26 C128 26 142 56 142 90 C142 124 124 140 100 140 C76 140 58 124 58 90 C58 56 72 26 100 26 Z"/>
      <line x1="100" y1="28" x2="100" y2="82"/>
      <rect x="95" y="56" width="10" height="18" rx="4" fill={A} stroke="none"/>
    </>);
    default: return wrap(<>
      <rect x="50" y="40" width="100" height="80"/>
      <line x1="64" y1="64" x2="136" y2="64" stroke={A} strokeWidth="3"/>
      <line x1="64" y1="80" x2="120" y2="80"/>
    </>);
  }
}

Object.assign(window, { GridCatIcon, GridDeviceArt });
