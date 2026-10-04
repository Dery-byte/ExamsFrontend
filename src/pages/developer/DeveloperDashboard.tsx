import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { TerminalSquare, LogOut, SlidersHorizontal, Activity, Bug, Users, type LucideIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getSystemHealth } from '../../api/endpoints';
import ModePanel from './console/ModePanel';
import HealthPanel from './console/HealthPanel';
import ErrorsPanel from './console/ErrorsPanel';
import DevelopersPanel from './console/DevelopersPanel';
import { toneOf, type Tone } from './console/ui';
import { CSS } from './console/styles';

type Tab = 'mode' | 'health' | 'errors' | 'developers';

const NAV: { key: Tab; label: string; short: string; icon: LucideIcon }[] = [
  { key: 'mode', label: 'System mode', short: 'Mode', icon: SlidersHorizontal },
  { key: 'health', label: 'Health', short: 'Health', icon: Activity },
  { key: 'errors', label: 'Errors', short: 'Errors', icon: Bug },
  { key: 'developers', label: 'Developers', short: 'Team', icon: Users },
];

const STATUS_TEXT: Record<Tone, string> = { ok: 'Operational', warn: 'Degraded', bad: 'Down', neutral: 'Checking…' };

/** The developer's console: choose the system mode, watch health and errors. */
export default function DeveloperDashboard() {
  const { user, logout } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab: Tab = NAV.some(n => n.key === params.get('tab')) ? params.get('tab') as Tab : 'mode';

  // Shared with HealthPanel's query, so the nav shows live status and open errors on every tab
  const health = useQuery({ queryKey: ['dev-health'], queryFn: getSystemHealth, refetchInterval: 60_000 });
  const tone: Tone = health.isError ? 'bad' : toneOf(health.data?.status);
  const openErrors: number = health.data?.errors?.open ?? 0;

  const go = (t: Tab) => {
    setParams(t === 'mode' ? {} : { tab: t }, { replace: true });
    window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    const prev = document.title;
    document.title = `${NAV.find(n => n.key === tab)?.label} · Developer console`;
    return () => { document.title = prev; };
  }, [tab]);

  const items = NAV.map(({ key, label, short, icon: Icon }) => (
    <button key={key} className="dd-nav-item" onClick={() => go(key)} aria-current={tab === key ? 'page' : undefined}>
      <Icon size={18} />
      <span className="dd-nav-label">{label}</span>
      <span className="dd-nav-short">{short}</span>
      {key === 'health' && (
        <span className="dd-nav-ind"><span className={`dd-dot dd-tone-${tone}`} aria-label={STATUS_TEXT[tone]} /></span>
      )}
      {key === 'errors' && openErrors > 0 && (
        <span className="dd-nav-ind"><span className="dd-count-badge" aria-label={`${openErrors} open`}>{openErrors > 99 ? '99+' : openErrors}</span></span>
      )}
    </button>
  ));

  const brand = (
    <div className="dd-brand">
      <span className="dd-brand-mark"><TerminalSquare size={17} /></span>
      <span className="dd-brand-text"><strong>Developer console</strong><small>System administration</small></span>
    </div>
  );

  return (
    <div className="dd-shell">
      <aside className="dd-side">
        {brand}
        <div className="dd-side-label">Manage</div>
        <nav className="dd-side-nav" aria-label="Console sections">{items}</nav>
        <div className="dd-side-foot">
          <span className="dd-avatar" aria-hidden>{(user?.email?.[0] ?? '?').toUpperCase()}</span>
          <span className="dd-side-user">
            <strong className="dd-ellipsis" title={user?.email}>{user?.email}</strong>
            <span>Developer</span>
          </span>
          <button className="dd-iconbtn" onClick={logout} aria-label="Sign out" title="Sign out"><LogOut size={16} /></button>
        </div>
      </aside>

      <div className="dd-body">
        <header className="dd-top">
          {brand}
          <span className="dd-top-spacer" />
          <button className="dd-top-status" onClick={() => go('health')} aria-label={`System status: ${STATUS_TEXT[tone]}`}>
            <span className={`dd-dot dd-tone-${tone}`} /> <span className="dd-top-status-text">{STATUS_TEXT[tone]}</span>
          </button>
          <button className="dd-iconbtn" onClick={logout} aria-label="Sign out" title={`Sign out ${user?.email ?? ''}`}><LogOut size={16} /></button>
        </header>
        <nav className="dd-mnav" aria-label="Console sections">{items}</nav>

        <main className="dd-main">
          {tab === 'mode' && <ModePanel />}
          {tab === 'health' && <HealthPanel onShowErrors={() => go('errors')} />}
          {tab === 'errors' && <ErrorsPanel />}
          {tab === 'developers' && <DevelopersPanel />}
        </main>
      </div>
      <style>{CSS}</style>
    </div>
  );
}
