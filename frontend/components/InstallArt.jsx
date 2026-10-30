/** Simple phone-screen illustrations for the install steps (inline SVG, no image files). */
const FONT = 'system-ui, -apple-system, Roboto, Arial, sans-serif';
const HILITE = '#e8772e';
const NAVY = '#24304f';

function Art({ children }) {
  return (
    <svg className="install__art" viewBox="0 0 300 170" aria-hidden="true" focusable="false">
      <rect width="300" height="170" rx="14" fill="#eef0f3" />
      {children}
    </svg>
  );
}

const Ring = ({ cx, cy, r = 20 }) => <circle cx={cx} cy={cy} r={r} fill="none" stroke={HILITE} strokeWidth="3.5" />;
const Label = ({ x, y, children, size = 13, fill = '#1f2328', anchor = 'middle', weight = 500 }) => (
  <text x={x} y={y} fontSize={size} fill={fill} textAnchor={anchor} fontFamily={FONT} fontWeight={weight}>{children}</text>
);

function AppIcon({ x, y, size = 44 }) {
  return (
    <g>
      <rect x={x} y={y} width={size} height={size} rx={size * 0.22} fill={NAVY} />
      <text x={x + size / 2} y={y + size * 0.66} fontSize={size * 0.52} fontWeight="700" fill="#fff" textAnchor="middle" fontFamily="Georgia, serif">S</text>
      <rect x={x + size * 0.2} y={y + size * 0.78} width={size * 0.6} height={size * 0.06} fill="#c0282d" />
    </g>
  );
}

/** iPhone step 1 / Android step 1: open the link in the right browser. */
export function OpenBrowserArt({ browser, host }) {
  const safari = browser === 'safari';
  return (
    <Art>
      <circle cx="150" cy="70" r="36" fill={safari ? '#2f80ed' : '#fff'} stroke={safari ? 'none' : '#cfd3d8'} strokeWidth="2" />
      {safari ? (
        <g>
          <circle cx="150" cy="70" r="28" fill="none" stroke="#fff" strokeWidth="2" />
          <polygon points="150,48 158,70 150,92 142,70" fill="#fff" transform="rotate(45 150 70)" />
          <polygon points="150,48 158,70 142,70" fill="#ff3b30" transform="rotate(45 150 70)" />
        </g>
      ) : (
        <g>
          <circle cx="150" cy="70" r="26" fill="#ea4335" />
          <path d="M150 44 a26 26 0 0 1 22.5 13 H150z" fill="#fbbc05" />
          <path d="M172.5 57 a26 26 0 0 1 -11.2 36.2 L150 70z" fill="#34a853" />
          <circle cx="150" cy="70" r="11" fill="#4285f4" stroke="#fff" strokeWidth="3" />
        </g>
      )}
      <rect x="55" y="122" width="190" height="30" rx="15" fill="#fff" stroke="#cfd3d8" />
      <Label x="150" y="142" size={13}>{host}</Label>
    </Art>
  );
}

/** iPhone step 2: the ••• / Share button in Safari's bottom bar. */
export function SafariMenuArt({ host }) {
  return (
    <Art>
      <rect x="95" y="12" width="110" height="100" rx="10" fill="#fff" stroke="#cfd3d8" />
      <rect x="107" y="26" width="60" height="8" rx="4" fill="#cfd3d8" />
      <rect x="107" y="42" width="86" height="8" rx="4" fill="#e1e4e8" />
      <rect x="107" y="58" width="76" height="8" rx="4" fill="#e1e4e8" />
      <circle cx="50" cy="146" r="16" fill="#fff" stroke="#cfd3d8" />
      <rect x="76" y="130" width="140" height="32" rx="16" fill="#555b66" />
      <Label x="146" y="151" fill="#fff" size={12}>{host}</Label>
      <circle cx="250" cy="146" r="16" fill="#fff" stroke="#cfd3d8" />
      {[241, 250, 259].map((x) => <circle key={x} cx={x} cy="146" r="2.6" fill="#1f2328" />)}
      <Ring cx="250" cy="146" r="23" />
      <Label x="250" y="108" size={11} fill={HILITE} weight={700}>Tap •••</Label>
    </Art>
  );
}

/** iPhone step 3: Share sheet with "Add to Home Screen". */
export function ShareSheetArt() {
  const rows = ['Copy', 'Add to Bookmarks', 'Add to Home Screen'];
  return (
    <Art>
      <rect x="40" y="14" width="220" height="142" rx="14" fill="#fff" stroke="#cfd3d8" />
      <Label x="150" y="34" size={11} fill="#8a9098">Share</Label>
      {rows.map((r, i) => {
        const y = 46 + i * 36;
        const hot = i === 2;
        return (
          <g key={r}>
            {hot && <rect x="50" y={y} width="200" height="32" rx="8" fill="#fff4ea" stroke={HILITE} strokeWidth="3" />}
            <Label x="64" y={y + 21} size={12.5} anchor="start" weight={hot ? 700 : 500}>{r}</Label>
            <rect x="222" y={y + 8} width="16" height="16" rx="4" fill="none" stroke="#1f2328" strokeWidth="1.6" />
            {hot && <path d="M230 12.5v7M226.5 16h7" transform={`translate(0 ${y})`} stroke="#1f2328" strokeWidth="1.6" strokeLinecap="round" />}
          </g>
        );
      })}
    </Art>
  );
}

/** iPhone step 4: confirm dialog with the "Open as Web App" switch. */
export function IosAddDialogArt() {
  return (
    <Art>
      <rect x="40" y="10" width="220" height="150" rx="14" fill="#fff" stroke="#cfd3d8" />
      <Label x="48" y="32" size={10.5} anchor="start" fill="#8a9098">Cancel</Label>
      <Label x="154" y="32" size={11} weight={700}>Add to Home Screen</Label>
      <Label x="246" y="32" size={11} anchor="end" fill={HILITE} weight={700}>Add</Label>
      <rect x="218" y="18" width="36" height="20" rx="10" fill="none" stroke={HILITE} strokeWidth="3" />
      <AppIcon x={56} y={50} size={40} />
      <rect x="104" y="52" width="140" height="34" rx="8" fill="#f1f2f4" />
      <Label x="116" y="74" size={13} anchor="start">Stockham Tags</Label>
      <Label x="56" y="124" size={13} anchor="start">Open as Web App</Label>
      <rect x="200" y="108" width="44" height="26" rx="13" fill="#34c759" />
      <circle cx="231" cy="121" r="10.5" fill="#fff" />
      <rect x="194" y="102" width="56" height="38" rx="19" fill="none" stroke={HILITE} strokeWidth="3" />
    </Art>
  );
}

/** Android step 2: Chrome's ⋮ menu button. */
export function ChromeMenuArt({ host }) {
  return (
    <Art>
      <rect x="20" y="16" width="260" height="34" rx="17" fill="#fff" stroke="#cfd3d8" />
      <Label x="40" y="38" size={12} anchor="start">{host}</Label>
      {[34, 42, 50].map((y) => <circle key={y} cx="252" cy={y - 9} r="2.6" fill="#1f2328" />)}
      <Ring cx="252" cy="33" r="19" />
      <rect x="95" y="64" width="170" height="92" rx="10" fill="#fff" stroke="#cfd3d8" />
      {[0, 1, 2].map((i) => <rect key={i} x="109" y={78 + i * 24} width={90 - i * 14} height="9" rx="4.5" fill="#e1e4e8" />)}
      <Label x="60" y="110" size={11} fill={HILITE} weight={700}>Tap ⋮</Label>
    </Art>
  );
}

/** Android step 3: the "Install app" menu item. */
export function ChromeInstallItemArt() {
  const rows = ['New tab', 'Add to Home screen', 'Install app'];
  return (
    <Art>
      <rect x="50" y="12" width="200" height="146" rx="12" fill="#fff" stroke="#cfd3d8" />
      {rows.map((r, i) => {
        const y = 24 + i * 40;
        const hot = i === 2;
        return (
          <g key={r}>
            {hot && <rect x="58" y={y} width="184" height="34" rx="8" fill="#fff4ea" stroke={HILITE} strokeWidth="3" />}
            <circle cx="78" cy={y + 17} r="7" fill="none" stroke="#1f2328" strokeWidth="1.6" />
            <Label x="96" y={y + 22} size={13} anchor="start" weight={hot ? 700 : 500}>{r}</Label>
          </g>
        );
      })}
    </Art>
  );
}

/** Android step 4: confirm the install. */
export function AndroidDialogArt() {
  return (
    <Art>
      <rect x="40" y="14" width="220" height="142" rx="16" fill="#fff" stroke="#cfd3d8" />
      <AppIcon x={134} y={28} size={32} />
      <Label x="150" y="86" size={14} weight={700}>Install app?</Label>
      <Label x="150" y="104" size={11.5} fill="#8a9098">Stockham Tags</Label>
      <Label x="156" y="140" size={13} anchor="end" fill="#5b6270">Cancel</Label>
      <rect x="178" y="122" width="68" height="28" rx="14" fill={NAVY} />
      <Label x="212" y="141" size={13} fill="#fff" weight={700}>Install</Label>
      <rect x="170" y="116" width="84" height="40" rx="20" fill="none" stroke={HILITE} strokeWidth="3" />
    </Art>
  );
}

/** Last step (both phones): the app icon on the Home Screen. */
export function HomeScreenArt() {
  const filler = ['#9aa5b8', '#b7c0cf', '#8e9bb0', '#c4cbd8', '#a7b0ba', '#b0b9c8', '#99a4b7'];
  const spots = [[44, 14], [104, 14], [164, 14], [224, 14], [44, 94], [104, 94], [164, 94], [224, 94]];
  return (
    <Art>
      {spots.map(([x, y], i) => (i === 1
        ? <g key="app"><AppIcon x={x} y={y} size={46} /><Label x={x + 23} y={y + 62} size={11}>Tags</Label><Ring cx={x + 23} cy={y + 23} r={31} /></g>
        : <rect key={x + '-' + y} x={x} y={y} width="46" height="46" rx="10" fill={filler[i % filler.length]} />))}
      <rect x="40" y="152" width="220" height="12" rx="6" fill="#d5d9e0" />
    </Art>
  );
}
