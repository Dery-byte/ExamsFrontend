import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { Wrench, X } from 'lucide-react';
import { getInstitution, institutionLogoUrl } from '../../api/endpoints';
import type { Institution } from '../../hooks/useInstitution';
import { applyTheme, getTheme, isHex, sameTheme, type ThemeSettings } from '../../utils/theme';

const BRAND_KEY = 'institution_brand';
const DEFAULT_TITLE = 'Exam Portal';

function readBrand(): { title?: string; icon?: string } {
  try { return JSON.parse(localStorage.getItem(BRAND_KEY) ?? 'null') ?? {}; } catch { return {}; }
}

/** The institution's initial on its brand colour, used as the browser-tab icon until a logo is uploaded. */
function letterIcon(letter: string, brand: string, ink: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${brand}"/>`
    + `<text x="32" y="44" font-family="Arial,sans-serif" font-size="36" font-weight="700" text-anchor="middle" fill="${ink}">${letter}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function setFavicon(href: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"][data-institution]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    link.setAttribute('data-institution', '');
    document.head.appendChild(link);
  }
  if (link.href !== href) link.href = href;
}

/**
 * Keeps the page in the institution's colours, title and tab icon, and shows the maintenance notice.
 * index.html already applied last visit's copy before React loaded; this brings it up to date with
 * the server (and re-checks every few minutes so a theme change or maintenance reaches open tabs).
 */
export default function BrandingSync() {
  const { data } = useQuery<Institution>({
    queryKey: ['institution'], queryFn: getInstitution, staleTime: 5 * 60_000, refetchInterval: 5 * 60_000,
  });
  const lastTitle = useRef(readBrand().title ?? DEFAULT_TITLE);

  const t = data?.theme;
  useEffect(() => {
    if (!t || !isHex(t.brand) || !isHex(t.sidebar)) return;
    const next: ThemeSettings = { brand: t.brand, sidebar: t.sidebar, accent: t.accent ?? null, preset: t.preset ?? null, version: t.version };
    // Re-applying an unchanged theme would only rewrite the cache; skip it unless the cache is missing
    let cached = false;
    try { cached = !!localStorage.getItem('institution_theme'); } catch { /* storage blocked */ }
    if (!cached || !sameTheme(getTheme(), next)) applyTheme(next);
  }, [t?.brand, t?.sidebar, t?.accent, t?.version]);   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!data) return;
    const title = `${data.shortName || data.name} · ${DEFAULT_TITLE}`;
    // Pages that set their own title (e.g. the developer console) keep it
    if (document.title === lastTitle.current || document.title === DEFAULT_TITLE) document.title = title;
    lastTitle.current = title;
    const brand = getTheme().brand;
    const ink = getComputedStyle(document.documentElement).getPropertyValue('--brand-contrast').trim() || '#ffffff';
    const icon = data.hasLogo
      ? institutionLogoUrl(data.logoVersion)
      : letterIcon((data.shortName || data.name || '?').charAt(0).toUpperCase(), brand, ink);
    setFavicon(icon);
    try { localStorage.setItem(BRAND_KEY, JSON.stringify({ title, icon })); } catch { /* storage blocked */ }
  }, [data?.name, data?.shortName, data?.hasLogo, data?.logoVersion, t?.brand]);   // eslint-disable-line react-hooks/exhaustive-deps

  return <MaintenanceBanner maintenance={data?.maintenance} />;
}

function MaintenanceBanner({ maintenance }: { maintenance?: Institution['maintenance'] }) {
  const { pathname } = useLocation();
  const key = maintenance?.enabled ? `maintenance_seen:${maintenance.message ?? ''}:${maintenance.until ?? ''}` : '';
  const [hidden, setHidden] = useState<string | null>(() => {
    try { return sessionStorage.getItem('maintenance_hidden'); } catch { return null; }
  });

  // Sign-in and sign-up show the full maintenance notice instead (MaintenanceGate)
  if (!maintenance?.enabled || pathname.startsWith('/developer') || pathname === '/login' || pathname === '/signup'
    || hidden === key) return null;

  const until = maintenance.until ? new Date(maintenance.until) : null;
  const untilText = until && !isNaN(until.getTime())
    ? ` Expected back by ${until.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}.` : '';
  const close = () => {
    setHidden(key);
    try { sessionStorage.setItem('maintenance_hidden', key); } catch { /* ignore */ }
  };

  return (
    <div role="status" className="mb-banner">
      <Wrench size={18} className="mb-ico" aria-hidden />
      <div className="mb-text">
        <strong>Maintenance in progress.</strong> {maintenance.message}{untilText}{' '}
        <span className="mb-sub">Signing in is paused. An exam you have already started can still be finished and submitted.</span>
      </div>
      <button className="mb-close" onClick={close} aria-label="Hide this notice"><X size={16} /></button>
      <style>{`
        .mb-banner { position: fixed; z-index: 100000; left: 50%; bottom: 16px; transform: translateX(-50%);
          width: min(720px, calc(100vw - 32px)); display: flex; align-items: flex-start; gap: 10px;
          padding: 12px 14px; border-radius: 12px; background: #fffbeb; border: 1px solid #f59e0b;
          color: #78350f; font-size: 13.5px; line-height: 1.5; box-shadow: 0 12px 32px rgba(0,0,0,.18); }
        .mb-ico { flex-shrink: 0; margin-top: 2px; color: #b45309; }
        .mb-text { flex: 1; min-width: 0; }
        .mb-sub { display: block; color: #92400e; font-size: 12.5px; margin-top: 2px; }
        .mb-close { flex-shrink: 0; border: none; background: transparent; color: #92400e; cursor: pointer;
          padding: 4px; border-radius: 6px; display: inline-flex; min-width: 32px; min-height: 32px; align-items: center; justify-content: center; }
        .mb-close:hover { background: rgba(146,64,14,.1); }
      `}</style>
    </div>
  );
}
