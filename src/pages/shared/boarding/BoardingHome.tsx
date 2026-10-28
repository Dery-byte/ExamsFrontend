import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArchiveRestore, BedDouble, Building, ChevronRight, FileBarChart, Info, Loader2, Plus, Search, Settings2, UserCog, Users, Wrench, X } from 'lucide-react';
import PageHeader from '../../../components/PageHeader';
import { findStudents, getBoardingOverview, type HostelCard } from '../../../api/boarding';
import { HostelDialog } from './StructureDialogs';
import StudentSheet from './StudentSheet';
import { AwaitingPanel, SettingsPanel, StaffPanel } from './Panels';
import ToolsPanel from './ToolsPanel';
import { Avatar, errMsg, GenderPill, levelText, levelsText, PlacePath, residencyLabel, useBoardingBase } from './shared';
import './boarding.css';

type Tab = 'hostels' | 'waiting' | 'tools' | 'staff' | 'settings';

/** Boarding staff's home: find any student's room, the hostels at a glance, boarders waiting for a room, staff and settings. */
export default function BoardingHome() {
  const base = useBoardingBase();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>(() => {
    try { return (sessionStorage.getItem('boarding_tab') as Tab) || 'hostels'; } catch { return 'hostels'; }
  });
  const choose = (t: Tab) => { setTab(t); try { sessionStorage.setItem('boarding_tab', t); } catch { /* ignore */ } };
  // On phones the tab row scrolls sideways: keep the chosen tab in view (sideways only, never the page)
  const tabsRef = useRef<HTMLDivElement>(null);
  const [archived, setArchived] = useState(false);
  const [adding, setAdding] = useState(false);
  const [studentId, setStudentId] = useState<number | null>(null);

  const q = useQuery({ queryKey: ['boarding', 'overview', archived], queryFn: () => getBoardingOverview(archived), retry: false });
  const live = useQuery({ queryKey: ['boarding', 'overview', false], queryFn: () => getBoardingOverview(false), enabled: archived, retry: false });
  const o = q.data;
  useEffect(() => {
    const row = tabsRef.current, on = row?.querySelector<HTMLElement>('.is-active');
    if (row && on) row.scrollLeft = Math.max(0, on.offsetLeft - (row.clientWidth - on.offsetWidth) / 2);
  }, [tab, q.isSuccess]);
  const counts = archived ? live.data : o;
  const word = o?.settings.word ?? 'House';
  const plural = o?.settings.plural ?? 'Houses';
  const head = !!o?.head;
  const free = (counts?.hostels ?? []).reduce((n, h) => n + h.free, 0);

  const tabs: { key: Tab; label: string; Icon: any; count?: number }[] = [
    { key: 'hostels', label: plural, Icon: Building },
    { key: 'waiting', label: 'Waiting for a room', Icon: BedDouble, count: counts?.awaiting },
    { key: 'tools', label: 'Tools', Icon: Wrench },
    { key: 'staff', label: 'Staff', Icon: UserCog },
    ...(head ? [{ key: 'settings' as Tab, label: 'Settings', Icon: Settings2 }] : []),
  ];

  return (
    <div className="bd-page">
      <PageHeader title="Boarding" breadcrumbs={['Boarding', tabs.find(t => t.key === tab)?.label ?? plural]} />
      {o && (
        <div className="bd-row" style={{ justifyContent: 'flex-end', marginTop: -8, marginBottom: 12 }}>
          <button type="button" className="bd-btn-ghost bd-btn-sm" onClick={() => navigate(`${base}/boarding/reports`)}><FileBarChart size={14} /> Reports</button>
        </div>
      )}

      {q.isLoading ? <div className="bd-card"><div className="bd-empty"><Loader2 className="bd-spin" size={24} /></div></div>
        : q.isError ? <div className="bd-card"><div className="bd-alert is-warn" style={{ margin: 0 }}><Info size={16} /><span>{errMsg(q.error, 'Boarding is not available.')}</span></div></div>
        : o && (
          <>
            <FindStudent onOpen={setStudentId} />

            {counts?.boarders !== undefined && (
              <div className="bd-stats">
                <div className="bd-stat"><b>{counts.boarders}</b><span>Boarders</span></div>
                <div className="bd-stat"><b>{counts.housed}</b><span>Have a room</span></div>
                <button type="button" className={`bd-stat${(counts.awaiting ?? 0) > 0 ? ' is-warn' : ''}`} onClick={() => choose('waiting')}>
                  <b>{counts.awaiting}</b><span>Waiting for a room</span></button>
                <div className="bd-stat"><b>{free}</b><span>Free beds</span></div>
              </div>
            )}
            {(counts?.noGender ?? 0) > 0 && (
              <div className="bd-alert is-warn"><Info size={16} />
                <span>{counts!.noGender} boarder{counts!.noGender === 1 ? ' has' : 's have'} no gender recorded and can only go into mixed rooms. Open a student to record it.</span></div>
            )}

            <div className="bd-tabs" role="tablist" ref={tabsRef}>
              {tabs.map(t => (
                <button key={t.key} role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'is-active' : ''} onClick={() => choose(t.key)}>
                  <t.Icon size={15} /> {t.label}{t.count ? <span className="bd-count">{t.count}</span> : null}
                </button>
              ))}
            </div>

            {tab === 'hostels' && (
              <>
                <div className="bd-row" style={{ marginBottom: 12 }}>
                  {head && (
                    <div className="bd-seg" style={{ flex: '0 1 260px' }}>
                      <button type="button" className={!archived ? 'is-on' : ''} onClick={() => setArchived(false)}>In use</button>
                      <button type="button" className={archived ? 'is-on' : ''} onClick={() => setArchived(true)}><ArchiveRestore size={13} style={{ verticalAlign: -2 }} /> Archived</button>
                    </div>
                  )}
                  <span className="bd-spacer" />
                  {head && !archived && <button type="button" className="bd-btn" onClick={() => setAdding(true)}><Plus size={16} /> Add a {word.toLowerCase()}</button>}
                </div>
                {o.hostels.length === 0 ? (
                  <div className="bd-card"><div className="bd-empty"><Building size={30} />
                    <p>{archived ? `No archived ${plural.toLowerCase()}.`
                      : head ? <><strong>No {plural.toLowerCase()} yet.</strong> Add each building students sleep in, then its blocks, floors and rooms.</>
                      : `You don't look after a ${word.toLowerCase()} yet.`}</p>
                    {head && !archived && <button type="button" className="bd-btn" onClick={() => setAdding(true)}><Plus size={16} /> Add a {word.toLowerCase()}</button>}
                  </div></div>
                ) : (
                  <div className="bd-hostels">
                    {o.hostels.map(h => <HostelTile key={h.id} h={h} onOpen={() => navigate(`${base}/boarding/${h.id}`)} />)}
                  </div>
                )}
              </>
            )}
            {tab === 'waiting' && <AwaitingPanel onOpen={setStudentId} onAuto={() => choose('tools')} />}
            {tab === 'tools' && <ToolsPanel head={head} hostels={counts?.hostels ?? o.hostels} word={word} plural={plural} />}
            {tab === 'staff' && <StaffPanel head={head} hostels={(counts?.hostels ?? o.hostels)} word={word} />}
            {tab === 'settings' && head && <SettingsPanel />}
          </>
        )}

      {adding && (
        <HostelDialog word={word} onClose={() => setAdding(false)}
          onSaved={id => { setAdding(false); qc.invalidateQueries({ queryKey: ['boarding'] }); navigate(`${base}/boarding/${id}`); }} />
      )}
      {studentId != null && <StudentSheet studentId={studentId} onClose={() => setStudentId(null)} />}
    </div>
  );
}

function HostelTile({ h, onOpen }: { h: HostelCard; onOpen: () => void }) {
  const total = h.beds;
  const used = Math.max(0, total - h.free);
  const pct = total ? Math.min(100, (used / total) * 100) : 0;
  return (
    <button type="button" className={`bd-hostel${h.active ? '' : ' is-archived'}`} onClick={onOpen}>
      <div className="bd-hostel-head">
        <span className="bd-hostel-icon"><Building size={19} /></span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="bd-hostel-name">{h.name}</div>
          <div className="bd-row" style={{ gap: 6, marginTop: 4 }}>
            <GenderPill gender={h.gender} />
            {h.blocks > 0 ? <span className="bd-chip">{h.blocks} block{h.blocks === 1 ? '' : 's'}</span>
              : <span className="bd-chip">{h.floors === 1 ? 'Single storey' : `${h.floors} floors`}</span>}
            {h.allowedLevels && <span className="bd-chip">{levelsText(h.allowedLevels)}</span>}
            {!h.canManage && <span className="bd-chip">View only</span>}
          </div>
        </div>
        <ChevronRight size={18} color="#94a3b8" />
      </div>
      <div className={`bd-meter${total > 0 && h.free === 0 ? ' is-full' : pct >= 85 ? ' is-high' : ''}`} aria-hidden><span style={{ width: `${pct}%` }} /></div>
      <div className="bd-hostel-nums">
        <span><b>{h.occupied}</b> living here</span>
        <span><b>{h.free}</b> free of {total} beds</span>
        <span>{h.rooms} rooms{h.closedRooms ? ` · ${h.closedRooms} closed` : ''}</span>
      </div>
      {h.staff.length > 0 && <div className="bd-sub" style={{ marginTop: 0 }}><Users size={12} style={{ verticalAlign: -2 }} /> {h.staff.map(s => s.name).join(', ')}</div>}
    </button>
  );
}

/** "Where is … ?": any student by name or ID, with the full path to their bed. */
function FindStudent({ onOpen }: { onOpen: (id: number) => void }) {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => { const t = setTimeout(() => setDebounced(q.trim()), 250); return () => clearTimeout(t); }, [q]);
  const res = useQuery({ queryKey: ['boarding', 'find', debounced, null], queryFn: () => findStudents(debounced), enabled: debounced.length >= 2 });
  const rows = res.data ?? [];

  return (
    <div className="bd-find">
      <div className="bd-find-box">
        <Search size={18} className="bd-find-icon" />
        <input className="bd-input" value={q} onChange={e => setQ(e.target.value)} placeholder="Find a student: name or ID" aria-label="Find a student by name or ID" autoComplete="off" />
        {q && <button type="button" className="bd-find-clear" onClick={() => setQ('')} aria-label="Clear"><X size={16} /></button>}
      </div>
      {debounced.length >= 2 && (
        <div className="bd-results" aria-live="polite">
          {res.isLoading ? <div className="bd-empty" style={{ padding: 18 }}><Loader2 className="bd-spin" size={20} /></div>
            : rows.length === 0 ? <div className="bd-empty" style={{ padding: 18 }}><p>No student found.</p></div>
            : rows.map(s => (
              <button key={s.id} type="button" className="bd-result" onClick={() => onOpen(s.id)}>
                <Avatar name={s.name} photo={s.photo} />
                <div className="bd-result-main">
                  <div className="bd-name">{s.name} <span className="bd-muted" style={{ fontWeight: 600, fontSize: 12.5 }}>· {s.username}{s.level != null ? ` · ${levelText(s.level)}` : ''}</span></div>
                  {s.place ? <PlacePath place={s.place} small />
                    : <span className="bd-sub" style={{ margin: 0 }}>{s.residency === 'BOARDING' ? 'Boarder, no room yet' : residencyLabel(s.residency)}</span>}
                </div>
                <ChevronRight size={16} color="#94a3b8" />
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
