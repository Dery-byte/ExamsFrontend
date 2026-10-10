/**
 * Institution colour theme.
 *
 * The developer picks three colours — brand, sidebar and (optionally) accent — and every other shade
 * is worked out here: hover/darker shades, soft tints, borders, and the text colours that must stay
 * readable on top of them. Pages never use the raw brand colour for text; they use the contrast-safe
 * tokens (--brand-text on light surfaces, --brand-light on dark ones, --brand-contrast on a brand
 * background), so a pale brand such as yellow still leaves every label readable.
 *
 * The derived values are cached in localStorage and applied by a small script in index.html before
 * React loads, so a refresh never flashes the default colours. The server's copy wins once it arrives.
 */
import { useSyncExternalStore } from 'react';

export interface ThemeSettings {
  brand: string;
  sidebar: string;
  /** null = worked out from the brand colour. */
  accent: string | null;
  preset?: string | null;
  version?: number;
}

export const DEFAULT_THEME: ThemeSettings = { brand: '#5156be', sidebar: '#2a3142', accent: '#7c3aed', preset: 'default' };

export interface ThemePreset { key: string; label: string; brand: string; sidebar: string; accent: string | null }

/** Starting points; any colour can be changed afterwards. */
export const THEME_PRESETS: ThemePreset[] = [
  { key: 'default', label: 'Indigo (default)', brand: '#5156be', sidebar: '#2a3142', accent: '#7c3aed' },
  { key: 'royal', label: 'Royal blue', brand: '#1d4ed8', sidebar: '#0f1e3d', accent: '#0891b2' },
  { key: 'forest', label: 'Forest green', brand: '#15803d', sidebar: '#14281d', accent: '#a16207' },
  { key: 'maroon', label: 'Maroon & gold', brand: '#9f1239', sidebar: '#2b0f17', accent: '#b45309' },
  { key: 'teal', label: 'Teal', brand: '#0f766e', sidebar: '#112a2a', accent: '#7c3aed' },
  { key: 'orange', label: 'Sunset orange', brand: '#c2410c', sidebar: '#2a1a12', accent: '#be123c' },
  { key: 'gold', label: 'Gold & navy', brand: '#a16207', sidebar: '#16213e', accent: '#1d4ed8' },
  { key: 'slate', label: 'Charcoal', brand: '#334155', sidebar: '#0f172a', accent: '#0284c7' },
  { key: 'light', label: 'Light sidebar', brand: '#5156be', sidebar: '#ffffff', accent: '#7c3aed' },
];

const HEX = /^#[0-9a-f]{6}$/i;
export const isHex = (v: unknown): v is string => typeof v === 'string' && HEX.test(v);

// ── Colour maths (sRGB) ─────────────────────────────────────────────────

type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)) as RGB;
}

export function rgbToHex([r, g, b]: RGB): string {
  return '#' + [r, g, b].map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('');
}

/** t = 0 gives a, t = 1 gives b. */
export function mix(a: string, b: string, t: number): string {
  const x = hexToRgb(a), y = hexToRgb(b);
  return rgbToHex([0, 1, 2].map(i => x[i] + (y[i] - x[i]) * t) as RGB);
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, 1–21. */
export function contrast(a: string, b: string): number {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const WHITE = '#ffffff';
const INK = '#111827';
/** The lightest dark surface text sits on (exam dark mode options, dark sidebars). */
const DARK_SURFACE = '#2d333b';
export const AA = 4.5;

/** White when it reads well on `bg`, otherwise whichever of white/ink reads better. */
export function readableOn(bg: string): string {
  const w = contrast(WHITE, bg);
  return w >= AA || w >= contrast(INK, bg) ? WHITE : INK;
}

/** Moves `c` toward `target` until it reaches 4.5:1 against `bg`. */
function ensureContrast(c: string, bg: string, target: string): string {
  for (let t = 0; t <= 1.0001; t += 0.05) {
    const v = mix(c, target, t);
    if (contrast(v, bg) >= AA) return v;
  }
  return target;
}

function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbToHex([f(0) * 255, f(8) * 255, f(4) * 255]);
}

/** Accent when the developer leaves it on "auto": the brand's neighbour on the colour wheel. */
export function autoAccent(brand: string): string {
  const [h, s, l] = rgbToHsl(hexToRgb(brand));
  return hslToHex((h + 25) % 360, Math.max(s, 0.5), Math.min(0.6, Math.max(0.35, l)));
}

export function resolvedAccent(t: ThemeSettings): string {
  return isHex(t.accent) ? t.accent : autoAccent(t.brand);
}

// ── Tokens ──────────────────────────────────────────────────────────────

const rgbList = (hex: string) => hexToRgb(hex).join(', ');

function family(name: string, c: string): Record<string, string> {
  return {
    [`--${name}`]: c,
    [`--${name}-rgb`]: rgbList(c),
    [`--${name}-hover`]: mix(c, '#000000', 0.15),
    [`--${name}-deep`]: mix(c, '#000000', 0.55),
    [`--${name}-light`]: ensureContrast(mix(c, WHITE, 0.35), DARK_SURFACE, WHITE),
    [`--${name}-border`]: mix(c, WHITE, 0.75),
    [`--${name}-soft`]: mix(c, WHITE, 0.92),
    [`--${name}-contrast`]: readableOn(c),
    [`--${name}-text`]: ensureContrast(c, WHITE, '#000000'),
  };
}

/** Every CSS custom property the theme sets. */
export function themeVars(t: ThemeSettings): Record<string, string> {
  const brand = isHex(t.brand) ? t.brand : DEFAULT_THEME.brand;
  const sidebar = isHex(t.sidebar) ? t.sidebar : DEFAULT_THEME.sidebar;
  const fg = readableOn(sidebar);
  return {
    ...family('brand', brand),
    ...family('accent', resolvedAccent({ ...t, brand })),
    '--sidebar-bg': sidebar,
    '--sidebar-rgb': rgbList(sidebar),
    '--sidebar-fg': fg,
    '--sidebar-fg-rgb': rgbList(fg),
    '--sidebar-raised': mix(sidebar, fg, 0.04),
    '--sidebar-deep': mix(sidebar, '#000000', 0.3),
  };
}

/** rgba() from a hex colour, for chart and canvas code that can't use CSS variables. */
export const hexAlpha = (hex: string, a: number) => `rgba(${rgbList(hex)}, ${a})`;

/** A colour with transparency; works for hex values and var(--…) alike. */
export const alpha = (color: string, a: number) =>
  `color-mix(in srgb, ${color} ${Math.round(a * 1000) / 10}%, transparent)`;

// ── Readability checks shown to the developer ───────────────────────────

export interface ThemeCheck { label: string; ratio: number; min: number; ok: boolean; note: string }

export function themeChecks(t: ThemeSettings): ThemeCheck[] {
  const v = themeVars(t);
  const c = (label: string, a: string, b: string, min: number, note: string): ThemeCheck => {
    const ratio = contrast(a, b);
    return { label, ratio, min, ok: ratio >= min, note };
  };
  return [
    c('Button text on brand', v['--brand-contrast'], v['--brand'], AA, 'Text is switched to white or near-black automatically.'),
    c('Menu text on sidebar', v['--sidebar-fg'], v['--sidebar-bg'], AA, 'Menu text is switched to white or near-black automatically.'),
    c('Brand vs page background', v['--brand'], WHITE, 3, 'Below 3:1, outlines and icons in the brand colour look faint. Text still uses a darker shade.'),
    c('Active menu item vs sidebar', v['--brand'], v['--sidebar-bg'], 1.6, 'Too close and the highlighted menu item blends into the sidebar.'),
    c('Button text on accent', v['--brand-contrast'], v['--accent'], 3, 'Banners that blend brand into accent keep the brand text colour.'),
  ];
}

// ── Applying and caching ────────────────────────────────────────────────

const STORAGE_KEY = 'institution_theme';

let current: ThemeSettings = readCached() ?? DEFAULT_THEME;
const listeners = new Set<() => void>();

function readCached(): ThemeSettings | null {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    return raw?.theme && isHex(raw.theme.brand) ? raw.theme : null;
  } catch { return null; }
}

function setMeta(color: string) {
  let m = document.querySelector('meta[name="theme-color"]');
  if (!m) { m = document.createElement('meta'); m.setAttribute('name', 'theme-color'); document.head.appendChild(m); }
  m.setAttribute('content', color);
}

/** Puts the theme on the page now. `persist` keeps it for the next load (off for the live preview). */
export function applyTheme(t: ThemeSettings, persist = true) {
  const vars = themeVars(t);
  const root = document.documentElement.style;
  Object.entries(vars).forEach(([k, val]) => root.setProperty(k, val));
  setMeta(vars['--brand']);
  current = t;
  if (persist) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: t, vars })); } catch { /* storage blocked */ }
  }
  listeners.forEach(l => l());
}

/** Same colours as last time? (version and preset name don't change how it looks) */
export function sameTheme(a: ThemeSettings, b: ThemeSettings): boolean {
  return a.brand.toLowerCase() === b.brand.toLowerCase() && a.sidebar.toLowerCase() === b.sidebar.toLowerCase()
    && (a.accent ?? '').toLowerCase() === (b.accent ?? '').toLowerCase();
}

export const getTheme = () => current;

/** Another tab saved a new theme: follow it. */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => {
    if (e.key !== STORAGE_KEY) return;
    const t = readCached();
    if (t) applyTheme(t, false);
  });
}

/** The active theme's resolved colours, for code that can't use CSS variables (charts, canvas). */
export function useThemeColors() {
  const t = useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb); }, () => current);
  const v = themeVars(t);
  return {
    brand: v['--brand'], brandText: v['--brand-text'], brandLight: v['--brand-light'], brandSoft: v['--brand-soft'],
    brandBorder: v['--brand-border'], brandDeep: v['--brand-deep'], brandContrast: v['--brand-contrast'],
    accent: v['--accent'], accentText: v['--accent-text'], accentLight: v['--accent-light'], accentSoft: v['--accent-soft'],
    sidebar: v['--sidebar-bg'],
  };
}
