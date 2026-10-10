import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity, AlertTriangle, BarChart3, Bot, Briefcase, Building2, ChevronRight, ClipboardCheck, FileCheck2,
  Eye, FileSearch, GraduationCap, LayoutGrid, ListChecks, Loader2, Lock, MessageSquareWarning, Receipt, Scale, ScrollText, Search,
  Send, ShieldAlert, Table2, TrendingUp, Trophy, Users, UserX, Wallet,
} from 'lucide-react';
import PageHeader from '../../../components/PageHeader';
import type { ReportDefinition } from '../../../api/endpoints';
import { useFeatureFlags } from '../../../hooks/useFeatureFlags';
import { catalogQuery, useReports } from './useReports';

export const REPORT_ICONS: Record<string, ReactNode> = {
  building: <Building2 size={20} />, users: <Users size={20} />, clipboard: <ClipboardCheck size={20} />,
  graduation: <GraduationCap size={20} />, send: <Send size={20} />, scale: <Scale size={20} />,
  shield: <ShieldAlert size={20} />, bot: <Bot size={20} />, activity: <Activity size={20} />,
  briefcase: <Briefcase size={20} />, wallet: <Wallet size={20} />, receipt: <Receipt size={20} />,
  alert: <AlertTriangle size={20} />, file: <FileCheck2 size={20} />, trophy: <Trophy size={20} />,
  table: <Table2 size={20} />, list: <ListChecks size={20} />, userx: <UserX size={20} />, lock: <Lock size={20} />,
  search: <FileSearch size={20} />, trend: <TrendingUp size={20} />, message: <MessageSquareWarning size={20} />,
  grid: <LayoutGrid size={20} />,
};

/** A card that opens an existing page instead of a report. */
interface PageLink { title: string; description: string; to: string; icon: ReactNode; group: string }

const GROUP_ORDER = ['Institution', 'Department', 'Teaching', 'Students', 'Results', 'Exams', 'Staff', 'Finance', 'Oversight'];
const LEADING_GROUPS = ['Institution', 'Department'];

export default function ReportsHub() {
  const { auditLogSuperAdmin, features } = useFeatureFlags();
  const { api, isSuper, role, base, staffBase, crumb } = useReports();
  const [q, setQ] = useState('');
  const { data, isLoading, isError, refetch } = useQuery(catalogQuery(role, api));

  const links: PageLink[] = useMemo(() => isSuper ? [
    { title: 'Analytics dashboard', description: 'Live charts: totals, pass rates, trends and at-risk students for one department or all.',
      to: `${staffBase}/analytics`, icon: <BarChart3 size={20} />, group: 'Institution' },
    ...(auditLogSuperAdmin !== false ? [{ title: 'Audit log', description: 'Every recorded change by staff, searchable by person, action and date.',
      to: `${staffBase}/audit-log`, icon: <ScrollText size={20} />, group: 'Oversight' }] : []),
  ] : role === 'lecturer' ? [
    { title: 'Quiz review', description: 'Mark and review scripts; each quiz there links to its result sheet and question analysis.',
      to: `${staffBase}/quiz-review`, icon: <Eye size={20} />, group: 'Teaching' },
  ] : [
    ...(features?.HOD_ANALYTICS !== false ? [{ title: 'Department analytics', description: 'Live charts for your department: pass rates, trends and at-risk students.',
      to: `${staffBase}/analytics`, icon: <BarChart3 size={20} />, group: 'Department' }] : []),
  ], [isSuper, role, staffBase, auditLogSuperAdmin, features]);

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const match = (s: string) => !needle || s.toLowerCase().includes(needle);
    const out = new Map<string, (ReportDefinition | PageLink)[]>();
    const add = (g: string, item: ReportDefinition | PageLink) => { if (!out.has(g)) out.set(g, []); out.get(g)!.push(item); };
    links.filter(l => LEADING_GROUPS.includes(l.group) && match(l.title + l.description)).forEach(l => add(l.group, l));
    (data ?? []).filter(d => match(d.title + d.description + d.group)).forEach(d => add(d.group, d));
    links.filter(l => !LEADING_GROUPS.includes(l.group) && match(l.title + l.description)).forEach(l => add(l.group, l));
    return [...out.entries()].sort((a, b) => (GROUP_ORDER.indexOf(a[0]) + 99) % 99 - (GROUP_ORDER.indexOf(b[0]) + 99) % 99);
  }, [data, links, q]);

  return (
    <div className="rh" style={{ paddingBottom: 40 }}>
      <PageHeader title="Reports" breadcrumbs={[crumb, 'Reports']} />

      <div className="rh-bar">
        <p className="rh-intro">
          {isSuper ? 'Choose a report.' : role === 'lecturer' ? 'Reports for your courses and quizzes.' : 'Reports for your department.'}{' '}
          Each one can be filtered and downloaded as Excel, CSV or PDF.
        </p>
        <label className="rh-search">
          <Search size={15} color="#94a3b8" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Find a report" aria-label="Find a report" />
        </label>
      </div>

      {isLoading && <div className="rh-state"><Loader2 size={26} className="rh-spin" color="#5156be" /></div>}
      {isError && (
        <div className="rh-state">
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Could not load the reports.</div>
          <button type="button" className="rh-btn" onClick={() => refetch()}>Try again</button>
        </div>
      )}
      {!isLoading && !isError && groups.length === 0 && <div className="rh-state">No report matches "{q}".</div>}

      {groups.map(([group, items]) => (
        <section key={group} className="rh-group">
          <h2 className="rh-group-title">{group}</h2>
          <div className="rh-grid">
            {items.map(item => {
              const isReport = 'key' in item;
              const to = isReport ? `${base}/${item.key}` : item.to;
              const icon = isReport ? REPORT_ICONS[item.icon] ?? <FileCheck2 size={20} /> : item.icon;
              return (
                <Link key={to} to={to} className="rh-card">
                  <span className="rh-icon">{icon}</span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span className="rh-title">{item.title}{!isReport && <span className="rh-tag">Page</span>}</span>
                    <span className="rh-desc">{item.description}</span>
                  </span>
                  <ChevronRight size={16} color="#94a3b8" style={{ flexShrink: 0 }} />
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      <style>{`
        .rh-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 18px; }
        .rh-intro { margin: 0; font-size: 13px; color: #475569; }
        .rh-search { display: flex; align-items: center; gap: 8px; height: 38px; padding: 0 12px; background: #fff; border: 1.5px solid #e2e8f0; border-radius: 9px; min-width: 240px; }
        .rh-search input { border: none; outline: none; font-size: 13px; width: 100%; background: transparent; color: #1e293b; }
        .rh-search:focus-within { border-color: #5156be; }
        .rh-group { margin-bottom: 22px; }
        .rh-group-title { margin: 0 0 10px; font-size: 12px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #64748b; }
        .rh-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
        .rh-card { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; background: #fff; border: 1.5px solid #e2e8f0; border-radius: 12px; text-decoration: none; color: inherit; transition: border-color .15s, box-shadow .15s, transform .15s; }
        .rh-card:hover { border-color: #c7c9f0; box-shadow: 0 6px 18px rgba(81,86,190,0.10); transform: translateY(-1px); }
        .rh-card:focus-visible { outline: 2px solid #5156be; outline-offset: 2px; }
        .rh-icon { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 10px; background: #eef0fb; color: #5156be; flex-shrink: 0; }
        .rh-title { display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 800; color: #1e293b; }
        .rh-tag { font-size: 10px; font-weight: 700; color: #64748b; background: #f1f5f9; border-radius: 5px; padding: 1px 6px; }
        .rh-desc { display: block; margin-top: 3px; font-size: 12.5px; color: #64748b; line-height: 1.45; }
        .rh-state { padding: 60px 20px; text-align: center; color: #64748b; }
        .rh-btn { height: 38px; padding: 0 16px; border-radius: 8px; border: 1.5px solid #e2e8f0; background: #fff; color: #334155; font-weight: 700; cursor: pointer; }
        .rh-spin { animation: rh-spin 1s linear infinite; } @keyframes rh-spin { to { transform: rotate(360deg); } }
        @media (max-width: 600px) { .rh-search { min-width: 0; width: 100%; } .rh-search input { font-size: 16px; } .rh-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
