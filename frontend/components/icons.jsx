/** Inline SVG icon set (24px grid, stroke = currentColor). */

const base = ({ size = 20, ...p }) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  ...p,
});

export const IconMenu = (p) => (<svg {...base(p)}><path d="M4 6h16M4 12h16M4 18h16" /></svg>);
export const IconBack = (p) => (<svg {...base(p)}><path d="M20 12H4m6-7-6 7 6 7" /></svg>);
export const IconChevronRight = (p) => (<svg {...base(p)}><path d="m9 5 7 7-7 7" /></svg>);
export const IconChevronDown = (p) => (<svg {...base(p)}><path d="m6 9 6 6 6-6" /></svg>);
export const IconPlus = (p) => (<svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>);
export const IconPlusCircle = (p) => (<svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>);
export const IconSearch = (p) => (<svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>);
export const IconCalendar = (p) => (<svg {...base(p)}><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>);
export const IconUsers = (p) => (<svg {...base(p)}><circle cx="9" cy="8" r="3.2" /><path d="M3 19c.6-3.3 3-5 6-5s5.4 1.7 6 5" /><circle cx="17" cy="9" r="2.4" /><path d="M16.5 14.2c2.3.2 4 1.7 4.5 4.3" /></svg>);
export const IconBox = (p) => (<svg {...base(p)}><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9" /></svg>);
export const IconDollar = (p) => (<svg {...base(p)}><circle cx="12" cy="10" r="7" /><path d="M14 7.5c-.5-.7-1.2-1-2-1-1.2 0-2 .7-2 1.6 0 2.2 4.3 1.2 4.3 3.6 0 1-.9 1.8-2.3 1.8-1 0-1.8-.4-2.3-1.1M12 5.5v1M12 13.5v1M4 20h16" /></svg>);
export const IconDollarBox = (p) => (<svg {...base(p)}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M14 9c-.4-.6-1.1-1-2-1-1.1 0-1.9.6-1.9 1.4 0 2 3.9 1.1 3.9 3.2 0 .9-.8 1.6-2 1.6-.9 0-1.7-.4-2.1-1M12 7v1M12 14.2v1" /></svg>);
export const IconWrench = (p) => (<svg {...base(p)}><path d="M14.5 6.5a4 4 0 0 0 5 5l-8 8a2.1 2.1 0 0 1-3-3l8-8a4 4 0 0 1-2-2z" /></svg>);
export const IconTrash = (p) => (<svg {...base(p)}><path d="M4 6h16M9 6V4h6v2M6 6l1 14h10l1-14M10 10v7M14 10v7" /></svg>);
export const IconSave = (p) => (<svg {...base(p)}><path d="M5 4h11l3 3v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" /><path d="M8 4v5h7V4M8 20v-6h8v6" /></svg>);
export const IconCheckCircle = (p) => (<svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></svg>);
export const IconPaperclip = (p) => (<svg {...base(p)}><path d="m20 11-8.5 8.5a5 5 0 0 1-7-7L13 4a3.3 3.3 0 0 1 4.7 4.7l-8.6 8.5a1.7 1.7 0 0 1-2.4-2.4L14.5 7" /></svg>);
export const IconEraser = (p) => (<svg {...base(p)}><path d="m3 15 9-9 7 7-6 6H8z" /><path d="m8 10 7 7M13 20h8" /></svg>);
export const IconFile = (p) => (<svg {...base(p)}><path d="M6 3h8l5 5v13H6z" /><path d="M14 3v5h5" /></svg>);
export const IconRefresh = (p) => (<svg {...base(p)}><path d="M20 11a8 8 0 0 0-14.7-3.5M4 4v4h4M4 13a8 8 0 0 0 14.7 3.5M20 20v-4h-4" /></svg>);
export const IconPin = (p) => (<svg {...base(p)}><path d="M12 21s-6.5-5.4-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.6 12 21 12 21z" /><circle cx="12" cy="10.5" r="2.4" /></svg>);
export const IconImage = (p) => (<svg {...base(p)}><rect x="3.5" y="5" width="17" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m4 17 5-4.5 3.5 3 3-2.5 4.5 4" /></svg>);
export const IconAudio = (p) => (<svg {...base(p)}><path d="M9 18V6l10-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="16" r="2.5" /></svg>);
export const IconVideo = (p) => (<svg {...base(p)}><rect x="3.5" y="6" width="12" height="12" rx="2" /><path d="m15.5 10.5 5-3v9l-5-3z" /></svg>);
export const IconDocument = (p) => (<svg {...base(p)}><path d="M6 3h8l5 5v13H6z" /><path d="M14 3v5h5M9 13h7M9 17h7" /></svg>);
export const IconFlipH = (p) => (<svg {...base(p)}><path d="M12 3v18" strokeDasharray="2 2.5" /><path d="M10 7 3.5 19H10zM14 7l6.5 12H14z" /></svg>);
export const IconFlipV = (p) => (<svg {...base(p)}><path d="M3 12h18" strokeDasharray="2 2.5" /><path d="M7 10 19 3.5V10zM7 14l12 6.5V14z" /></svg>);
export const IconRotate = (p) => (<svg {...base(p)}><path d="M5 12a7 7 0 1 0 2.2-5.1" /><path d="M4.5 4v4h4" /><text x="12" y="15" fontSize="6.5" textAnchor="middle" fill="currentColor" stroke="none" fontWeight="700">90°</text></svg>);
export const IconClose = (p) => (<svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>);
export const IconCheck = (p) => (<svg {...base(p)}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>);
export const IconAlert = (p) => (<svg {...base(p)}><path d="M12 4 2.5 20h19z" /><path d="M12 10v4M12 17h.01" /></svg>);
