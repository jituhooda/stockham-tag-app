/** Stockham Construction wordmark (script name over a red-ruled block caption). */
export function Logo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 52" role="img" aria-label="Stockham Construction">
      <text x="4" y="22" fontFamily="'Brush Script MT','Segoe Script',cursive" fontStyle="italic" fontSize="22" fill="#1d1d1d" transform="rotate(-8 30 20)">
        Stockham
      </text>
      <rect x="2" y="30" width="116" height="2" fill="#c0282d" />
      <text x="60" y="42" fontFamily="'Arial Black',Arial,sans-serif" fontWeight="900" fontSize="11" letterSpacing="0.5" fill="#1d1d1d" textAnchor="middle">
        CONSTRUCTION
      </text>
      <rect x="2" y="45" width="116" height="4" fill="#c0282d" />
    </svg>
  );
}
