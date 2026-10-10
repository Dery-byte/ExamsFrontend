import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Wrench, Settings, CalendarClock, RefreshCw, Lock, ShieldCheck, Clock3, Loader2, ArrowRight } from 'lucide-react';
import { getInstitution } from '../../api/endpoints';
import type { Institution } from '../../hooks/useInstitution';
import InstitutionMark from './InstitutionMark';

const POLL_MS = 30_000;
/** Set when a Super Admin chooses "Administrator sign-in" so the form stays open for that tab. */
const ADMIN_KEY = 'maintenance_admin_signin';

/** A LocalDateTime from the server ("2026-10-10T18:30"), read as the visitor's local time. */
const parseDate = (v?: string | null) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Wraps the sign-in and sign-up pages. While the portal is under maintenance they are replaced by a
 * notice with the developer's message and the expected finish time; the page checks again every
 * 30 seconds and brings the form back by itself once maintenance ends.
 */
export default function MaintenanceGate({ children, page }: { children: ReactNode; page: 'signin' | 'signup' }) {
  const location = useLocation();
  const { data, isPending, isFetching, refetch, dataUpdatedAt } = useQuery<Institution>({
    queryKey: ['institution'],
    queryFn: getInstitution,
    staleTime: 5 * 60_000,
    refetchInterval: q => (q.state.data?.maintenance?.enabled ? POLL_MS : false),
  });
  const maintenance = data?.maintenance;
  const on = !!maintenance?.enabled;

  const [adminChose, setAdminChose] = useState(() => {
    if ((location.state as any)?.adminSignIn) return true;
    try { return sessionStorage.getItem(ADMIN_KEY) === '1'; } catch { return false; }
  });
  useEffect(() => {
    if ((location.state as any)?.adminSignIn) {
      setAdminChose(true);
      try { sessionStorage.setItem(ADMIN_KEY, '1'); } catch { /* storage blocked */ }
    }
  }, [location.state]);

  // Tell anyone waiting on this page that the portal is back
  const wasOn = useRef(on);
  useEffect(() => {
    if (wasOn.current && !on) {
      toast.success('Maintenance is over. Welcome back!');
      try { sessionStorage.removeItem(ADMIN_KEY); } catch { /* storage blocked */ }
    }
    wasOn.current = on;
  }, [on]);

  // Without the server's answer yet, a brief loader beats flashing a form that may not work
  if (isPending) {
    return (
      <div className="mg-loading" role="status" aria-label="Loading">
        <Loader2 size={28} className="mg-spin" />
        <style>{`.mg-loading{min-height:100vh;min-height:100dvh;display:flex;align-items:center;justify-content:center;background:var(--gray-50);color:var(--brand-text)}
          .mg-spin{animation:mg-rot 1s linear infinite}@keyframes mg-rot{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const adminAllowed = maintenance?.adminSignIn !== false;
  if (!on) return <>{children}</>;
  if (page === 'signin' && adminChose && adminAllowed) {
    const back = () => {
      setAdminChose(false);
      try { sessionStorage.removeItem(ADMIN_KEY); } catch { /* storage blocked */ }
    };
    return (
      <>
        <div className="mg-adminbar" role="status">
          <Wrench size={15} aria-hidden />
          <span>Maintenance in progress: only administrators can sign in.</span>
          <button type="button" onClick={back}>Back to notice</button>
          <style>{`.mg-adminbar{position:fixed;z-index:1000;top:12px;left:50%;transform:translateX(-50%);width:max-content;max-width:calc(100vw - 32px);
            display:flex;align-items:center;flex-wrap:wrap;justify-content:center;gap:6px 10px;padding:8px 14px;border-radius:12px;
            background:#fffbeb;border:1px solid #fcd34d;color:#92400e;font-family:'Inter',system-ui,sans-serif;font-size:13px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.08)}
            .mg-adminbar button{font-family:inherit;border:none;background:none;color:#78350f;font-weight:800;text-decoration:underline;cursor:pointer;padding:2px;font-size:13px}`}</style>
        </div>
        {children}
      </>
    );
  }

  return (
    <MaintenanceScreen
      institution={data!}
      checking={isFetching}
      checkedAt={dataUpdatedAt}
      onCheck={() => refetch()}
      adminLink={adminAllowed}
    />
  );
}

function MaintenanceScreen({ institution, checking, checkedAt, onCheck, adminLink }: {
  institution: Institution; checking: boolean; checkedAt: number; onCheck: () => void; adminLink: boolean;
}) {
  const m = institution.maintenance!;
  const until = parseDate(m.until);
  const since = parseDate(m.since);
  const now = useNow();

  const left = until ? until.getTime() - now : null;
  const overdue = left != null && left <= 0;
  const progress = until && since && until > since
    ? Math.min(100, Math.max(2, ((now - since.getTime()) / (until.getTime() - since.getTime())) * 100))
    : null;

  const untilDate = until?.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const untilTime = until?.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const zone = until ? new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' })
    .formatToParts(until).find(p => p.type === 'timeZoneName')?.value : '';
  const checkedAgo = Math.max(0, Math.round((now - checkedAt) / 1000));
  const name = institution.name || institution.shortName;

  return (
    <div className="mg">
      <style>{STYLES}</style>
      <div className="mg-blob mg-blob-1" aria-hidden />
      <div className="mg-blob mg-blob-2" aria-hidden />
      <div className="mg-grid" aria-hidden />

      <header className="mg-top">
        <div className="mg-brand">
          <InstitutionMark size={38} radius={11} />
          <div className="mg-brand-text">
            <span className="mg-brand-name">{institution.shortName || institution.name}</span>
            {institution.shortName && institution.name && institution.shortName !== institution.name && (
              <span className="mg-brand-sub">{institution.name}</span>
            )}
          </div>
        </div>
        <span className="mg-pill"><span className="mg-dot" aria-hidden /> Under maintenance</span>
      </header>

      <main className="mg-main">
        <section className="mg-card" aria-labelledby="mg-title">
          <div className="mg-art" aria-hidden>
            <span className="mg-ring" />
            <span className="mg-ring mg-ring-2" />
            <div className="mg-badge">
              <Settings size={30} className="mg-gear mg-gear-a" />
              <Settings size={20} className="mg-gear mg-gear-b" />
              <Wrench size={22} className="mg-wrench" />
            </div>
          </div>

          <p className="mg-eyebrow">Scheduled maintenance</p>
          <h1 id="mg-title" className="mg-title">We'll be back shortly</h1>
          <p className="mg-message">{m.message}</p>

          <div className="mg-eta">
            <div className="mg-eta-head">
              <CalendarClock size={18} aria-hidden />
              <span>Expected to finish</span>
            </div>

            {until ? (
              <>
                <p className="mg-eta-when">
                  <span className="mg-eta-date">{untilDate}</span>
                  <span className="mg-eta-time">{untilTime}{zone ? ` ${zone}` : ''}</span>
                </p>
                {overdue ? (
                  <p className="mg-overdue" role="status">
                    <Clock3 size={15} aria-hidden /> Taking a little longer than planned. We're nearly done.
                  </p>
                ) : (
                  <Countdown ms={left!} />
                )}
                {progress != null && !overdue && (
                  <div className="mg-bar" role="progressbar" aria-label="Maintenance progress"
                    aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
                    <span style={{ width: `${progress}%` }} />
                  </div>
                )}
              </>
            ) : (
              <p className="mg-eta-none">No finish time was given. We'll be back as soon as the work is done.</p>
            )}
          </div>

          <ul className="mg-facts">
            <li><Lock size={16} aria-hidden /><span>Signing in and creating new accounts are paused until the work is finished.</span></li>
            <li><ShieldCheck size={16} aria-hidden /><span>Your account, results and saved answers are safe. An exam already in progress can still be finished and submitted.</span></li>
            <li><RefreshCw size={16} aria-hidden /><span>This page checks again every 30 seconds and opens sign-in by itself when we're back.</span></li>
          </ul>

          <div className="mg-actions">
            <button type="button" className="mg-btn" onClick={onCheck} disabled={checking}>
              <RefreshCw size={16} className={checking ? 'mg-spin' : undefined} aria-hidden />
              {checking ? 'Checking…' : 'Check again'}
            </button>
            <span className="mg-checked" aria-live="polite">
              {checking ? 'Checking the portal…' : `Last checked ${checkedAgo < 5 ? 'just now' : `${formatAgo(checkedAgo)} ago`}`}
            </span>
          </div>
        </section>

        <footer className="mg-foot">
          {adminLink && (
            <Link to="/login" state={{ adminSignIn: true }} className="mg-admin">
              Administrator sign-in <ArrowRight size={14} aria-hidden />
            </Link>
          )}
          <span>© {new Date().getFullYear()} {name}. Thank you for your patience.</span>
        </footer>
      </main>
    </div>
  );
}

/** Time remaining as day/hour/minute/second tiles; days only appear when more than a day is left. */
function Countdown({ ms }: { ms: number }) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const min = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts: Array<[number, string]> = [...(d > 0 ? [[d, d === 1 ? 'Day' : 'Days'] as [number, string]] : []),
    [h, 'Hours'], [min, 'Minutes'], [s, 'Seconds']];
  const spoken = [d && `${d} day${d === 1 ? '' : 's'}`, h && `${h} hour${h === 1 ? '' : 's'}`, `${min} minute${min === 1 ? '' : 's'}`]
    .filter(Boolean).join(', ');

  return (
    <div className="mg-count">
      <span className="mg-sr">About {spoken} left</span>
      {parts.map(([v, label]) => (
        <div key={label} className="mg-tile" aria-hidden>
          <span className="mg-num">{String(v).padStart(2, '0')}</span>
          <span className="mg-unit">{label}</span>
        </div>
      ))}
    </div>
  );
}

function formatAgo(sec: number) {
  if (sec < 60) return `${sec} s`;
  const m = Math.floor(sec / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h`;
}

/** The current time, updated every second. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const STYLES = `
  .mg {
    position: relative; min-height: 100vh; min-height: 100dvh; overflow: hidden;
    display: flex; flex-direction: column; background: var(--gray-50); color: #0f172a;
    font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased;
  }
  .mg button { font-family: inherit; }
  .mg-blob { position: absolute; border-radius: 50%; filter: blur(90px); pointer-events: none; z-index: 0; }
  .mg-blob-1 { top: -14%; left: -10%; width: 46vw; height: 46vw; min-width: 320px; min-height: 320px;
    background: rgba(var(--brand-rgb), .22); }
  .mg-blob-2 { bottom: -18%; right: -10%; width: 40vw; height: 40vw; min-width: 280px; min-height: 280px;
    background: rgba(var(--accent-rgb, var(--brand-rgb)), .16); }
  .mg-grid { position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: .5;
    background-image: linear-gradient(rgba(15,23,42,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,.045) 1px, transparent 1px);
    background-size: 44px 44px;
    -webkit-mask-image: radial-gradient(ellipse at center, #000 30%, transparent 75%);
            mask-image: radial-gradient(ellipse at center, #000 30%, transparent 75%); }

  .mg-top { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 20px clamp(16px, 4vw, 40px); }
  .mg-brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .mg-brand-text { display: flex; flex-direction: column; min-width: 0; }
  .mg-brand-name { font-weight: 800; font-size: 16px; letter-spacing: -.01em; color: #0f172a; }
  .mg-brand-sub { font-size: 12.5px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mg-pill { display: inline-flex; align-items: center; gap: 8px; flex-shrink: 0; padding: 7px 13px; border-radius: 999px;
    background: #fffbeb; border: 1px solid #fcd34d; color: #92400e; font-size: 12.5px; font-weight: 700; }
  .mg-dot { width: 8px; height: 8px; border-radius: 50%; background: #f59e0b; box-shadow: 0 0 0 0 rgba(245,158,11,.6);
    animation: mg-pulse 1.8s ease-out infinite; }

  .mg-main { position: relative; z-index: 1; flex: 1; display: flex; flex-direction: column; align-items: center;
    justify-content: center; padding: 8px 16px 28px; }
  .mg-card { width: 100%; max-width: 620px; background: rgba(255,255,255,.96); backdrop-filter: blur(18px);
    border: 1px solid rgba(15,23,42,.06); border-radius: 28px; padding: 44px 44px 36px; text-align: center;
    box-shadow: 0 1px 2px rgba(15,23,42,.04), 0 24px 60px -12px rgba(15,23,42,.16); animation: mg-in .5s cubic-bezier(.16,1,.3,1) both; }

  .mg-art { position: relative; width: 104px; height: 104px; margin: 0 auto 22px; display: grid; place-items: center; }
  .mg-ring { position: absolute; inset: 0; border-radius: 50%; border: 2px solid rgba(var(--brand-rgb), .22);
    animation: mg-ring 2.6s ease-out infinite; }
  .mg-ring-2 { animation-delay: 1.3s; }
  .mg-badge { position: relative; width: 84px; height: 84px; border-radius: 26px; background: var(--brand);
    color: var(--brand-contrast); box-shadow: 0 14px 30px -8px rgba(var(--brand-rgb), .55); }
  .mg-gear { position: absolute; }
  .mg-gear-a { left: 14px; top: 14px; animation: mg-rot 7s linear infinite; }
  .mg-gear-b { right: 13px; bottom: 15px; opacity: .85; animation: mg-rot 5s linear infinite reverse; }
  .mg-wrench { position: absolute; right: 14px; top: 13px; opacity: .9; }

  .mg-eyebrow { margin: 0 0 8px; font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: var(--brand-text); }
  .mg-title { margin: 0 0 12px; font-size: clamp(26px, 4.4vw, 36px); line-height: 1.15; font-weight: 800; letter-spacing: -.03em; color: #0f172a; }
  .mg-message { margin: 0 auto 28px; max-width: 480px; font-size: 16px; line-height: 1.65; color: #475569;
    white-space: pre-line; overflow-wrap: anywhere; }

  .mg-eta { text-align: left; border-radius: 20px; padding: 20px 22px; margin-bottom: 24px;
    background: linear-gradient(135deg, rgba(var(--brand-rgb), .08), rgba(var(--brand-rgb), .03));
    border: 1px solid rgba(var(--brand-rgb), .16); }
  .mg-eta-head { display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 800; letter-spacing: .06em;
    text-transform: uppercase; color: var(--brand-text); }
  .mg-eta-when { margin: 8px 0 16px; display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; }
  .mg-eta-date { font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -.01em; }
  .mg-eta-time { font-size: 16px; font-weight: 700; color: #334155; }
  .mg-eta-none { margin: 8px 0 0; font-size: 15px; color: #334155; line-height: 1.55; }
  .mg-overdue { margin: 0; display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 12px;
    background: #fffbeb; border: 1px solid #fde68a; color: #92400e; font-size: 14px; font-weight: 600; }

  .mg-count { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 10px; }
  .mg-tile { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 6px 10px; border-radius: 14px;
    background: #fff; border: 1px solid rgba(15,23,42,.07); box-shadow: 0 2px 8px rgba(15,23,42,.04); }
  .mg-num { font-size: clamp(22px, 5vw, 30px); font-weight: 800; line-height: 1; color: #0f172a;
    font-variant-numeric: tabular-nums; letter-spacing: -.02em; }
  .mg-unit { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .06em; }

  .mg-bar { margin-top: 14px; height: 6px; border-radius: 999px; background: rgba(var(--brand-rgb), .14); overflow: hidden; }
  .mg-bar > span { display: block; height: 100%; border-radius: inherit; background: var(--brand); transition: width 1s linear; }

  .mg-facts { list-style: none; margin: 0 0 26px; padding: 0; display: grid; gap: 12px; text-align: left; }
  .mg-facts li { display: flex; gap: 12px; align-items: flex-start; font-size: 14.5px; line-height: 1.55; color: #475569; }
  .mg-facts svg { flex-shrink: 0; margin-top: 3px; color: var(--brand-text); }

  .mg-actions { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 10px 16px;
    padding-top: 22px; border-top: 1px solid rgba(15,23,42,.07); }
  .mg-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 46px; padding: 0 22px;
    border: none; border-radius: 14px; background: var(--brand); color: var(--brand-contrast); font-size: 15px; font-weight: 700;
    cursor: pointer; box-shadow: 0 8px 20px -6px rgba(var(--brand-rgb), .55); transition: transform .15s ease, background .15s ease; }
  .mg-btn:hover:not(:disabled) { background: var(--brand-hover, var(--brand)); transform: translateY(-1px); }
  .mg-btn:disabled { opacity: .75; cursor: default; }
  .mg-btn:focus-visible, .mg-admin:focus-visible { outline: 3px solid rgba(var(--brand-rgb), .35); outline-offset: 2px; }
  .mg-checked { font-size: 13px; color: #64748b; }

  .mg-foot { width: 100%; max-width: 620px; margin-top: 18px; display: flex; flex-wrap: wrap; align-items: center;
    justify-content: space-between; gap: 8px 16px; font-size: 12.5px; color: #64748b; padding: 0 6px; }
  .mg-admin { display: inline-flex; align-items: center; gap: 6px; color: var(--brand-text); font-weight: 700; text-decoration: none;
    border-radius: 8px; padding: 4px 2px; }
  .mg-admin:hover { text-decoration: underline; }

  .mg-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
  .mg-spin { animation: mg-rot 1s linear infinite; }

  @keyframes mg-rot { to { transform: rotate(360deg); } }
  @keyframes mg-ring { 0% { transform: scale(.8); opacity: .9; } 100% { transform: scale(1.35); opacity: 0; } }
  @keyframes mg-pulse { 0% { box-shadow: 0 0 0 0 rgba(245,158,11,.55); } 70% { box-shadow: 0 0 0 9px rgba(245,158,11,0); } 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); } }
  @keyframes mg-in { from { opacity: 0; transform: translateY(18px) scale(.985); } to { opacity: 1; transform: none; } }

  @media (max-width: 640px) {
    .mg-top { padding: 14px 16px; }
    .mg-brand-sub { display: none; }
    .mg-pill { padding: 6px 10px; font-size: 11.5px; }
    .mg-main { justify-content: flex-start; padding: 4px 12px 20px; }
    .mg-card { padding: 30px 18px 24px; border-radius: 24px; }
    .mg-art { width: 88px; height: 88px; margin-bottom: 18px; }
    .mg-badge { width: 72px; height: 72px; border-radius: 22px; }
    .mg-gear-a { left: 11px; top: 11px; }
    .mg-message { font-size: 15px; margin-bottom: 22px; }
    .mg-eta { padding: 16px; border-radius: 16px; }
    .mg-eta-date { font-size: 16px; }
    .mg-count { gap: 8px; }
    .mg-tile { padding: 10px 2px 8px; border-radius: 12px; }
    .mg-unit { font-size: 10px; letter-spacing: .03em; }
    .mg-facts li { font-size: 14px; }
    .mg-actions { flex-direction: column; }
    .mg-btn { width: 100%; }
    .mg-foot { justify-content: center; text-align: center; }
  }
  @media (max-width: 380px) {
    .mg-brand-name { font-size: 15px; }
    .mg-unit { font-size: 9px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .mg-card, .mg-ring, .mg-gear, .mg-dot, .mg-spin { animation: none !important; }
    .mg-bar > span { transition: none; }
  }
`;
