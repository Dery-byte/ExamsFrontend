import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import toast from 'react-hot-toast';
import {
  AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, Check, ChevronDown, ChevronLeft, ChevronRight, Download, FileSpreadsheet,
  FileText, RotateCcw, Search, SlidersHorizontal, X,
} from 'lucide-react';
import PageHeader from '../../../components/PageHeader';
import {
  getSessions, saGetDepartments,
  type ReportDefinition, type ReportFilterDef, type ReportParams, type ReportResult, type ReportsApi, type ReportTable,
} from '../../../api/endpoints';
import { downloadReportExcel, downloadTableCsv, formatCell, formatStat, isNumeric, reportFileName } from '../../../utils/reportExport';
import { defaultLevels, periodsPerLevel } from '../../../utils/terms';
import { catalogQuery, useReports, type ReportsRole } from './useReports';

/* Chart tokens (same as Analytics): one series in categorical slot 1; text never wears the series color. */
const SERIES = '#2a78d6';
const GRID = '#eef0f4';
const AXIS = '#64748b';
const INK = '#1e293b';

const PAGE_SIZES = [25, 50, 100];
/** URL parameter for each filter. "all" as the session means every session. */
const PARAM: Record<string, keyof ReportParams> = {
  session: 'sessionId', department: 'departmentId', program: 'programId', level: 'level', semester: 'semester',
  from: 'from', to: 'to', course: 'courseId', quiz: 'quizId', status: 'status',
};
const NUMBER_PARAMS = new Set(['sessionId', 'departmentId', 'programId', 'level', 'semester', 'courseId', 'quizId']);
/** Parameters set by clicking a row (unless the report offers them as a filter). */
const DRILLS: (keyof ReportParams)[] = ['courseId', 'quizId'];
/** A table this narrow becomes stacked cards on a phone; wider ones scroll sideways with the first column fixed. */
const STACK_MAX_COLUMNS = 6;

const errorMessage = (e: any, fallback: string) => e?.response?.data?.message ?? fallback;

export default function ReportView() {
  const { key = '' } = useParams();
  const [search, setSearch] = useSearchParams();
  const { api, role, base, crumb, loadPrograms } = useReports();
  const { data: catalog, isLoading: catalogLoading, isError: catalogFailed, refetch: refetchCatalog } = useQuery(catalogQuery(role, api));
  const def = catalog?.find(d => d.key === key);
  const has = (k: string) => !!def?.filters.some(f => f.key === k);

  const { data: sessions, isError: sessionsFailed } = useQuery({
    queryKey: ['academic-sessions'], queryFn: getSessions, enabled: has('session'), staleTime: 60_000,
  });

  // Start on the current session the first time a report with a session filter opens
  const needsSession = has('session') && !search.has('sessionId');
  useEffect(() => {
    if (!needsSession || (!Array.isArray(sessions) && !sessionsFailed)) return;
    const current = Array.isArray(sessions) ? sessions.find((s: any) => s.current) : undefined;
    const next = new URLSearchParams(search);
    next.set('sessionId', current ? String(current.id) : 'all');
    setSearch(next, { replace: true });
  }, [needsSession, sessions, sessionsFailed, search, setSearch]);

  const params: ReportParams = useMemo(() => {
    const p: Record<string, unknown> = {};
    search.forEach((v, k) => {
      if (!v || v === 'all') return;
      p[k] = NUMBER_PARAMS.has(k) ? Number(v) : v;
    });
    return p as ReportParams;
  }, [search]);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['report', role, key, params],
    queryFn: () => api.run(key, params),
    enabled: !!def && !needsSession,
    placeholderData: keepPreviousData,
  });

  const setParam = (name: string, value: string | number | null | undefined) => {
    const next = new URLSearchParams(search);
    if (value == null || value === '') next.delete(name); else next.set(name, String(value));
    if (name === 'departmentId') next.delete('programId');
    setSearch(next);
  };

  const filterParams = new Set((def?.filters ?? []).map(f => PARAM[f.key]));
  const activeDrills = DRILLS.filter(d => search.has(d) && !filterParams.has(d));

  if (catalogLoading) return <div className="rv"><Skeleton /><style>{STYLES}</style></div>;
  if (catalogFailed || !def) {
    return (
      <div className="rv">
        <Notice icon={<AlertTriangle size={26} color="#e34948" />}
          title={catalogFailed ? 'Could not load your reports.' : 'This report is not available to you.'}
          action={catalogFailed
            ? <button type="button" className="rv-btn" onClick={() => refetchCatalog()}>Try again</button>
            : <Link to={base} className="rv-btn">Back to reports</Link>} />
        <style>{STYLES}</style>
      </div>
    );
  }

  return (
    <div className="rv" style={{ paddingBottom: 40 }}>
      <PageHeader title={def.title} breadcrumbs={[crumb, 'Reports', def.title]} />

      <div className="rv-top">
        <Link to={base} className="rv-back"><ArrowLeft size={15} /> All reports</Link>
        {data && <ExportMenu api={api} report={data} reportKey={key} params={params} />}
      </div>

      <FilterBar def={def} search={search} setParam={setParam} sessions={sessions} role={role} loadPrograms={loadPrograms}
        onReset={() => setSearch(new URLSearchParams(has('session') && params.sessionId ? { sessionId: String(params.sessionId) } : {}))} />

      {activeDrills.length > 0 && (
        <div className="rv-drill" role="status">
          <span>{data?.scope[data.scope.length - 1] ?? 'Showing one list'}</span>
          <button type="button" className="rv-chip" onClick={() => {
            const next = new URLSearchParams(search);
            activeDrills.forEach(d => next.delete(d));
            setSearch(next);
          }}><X size={13} /> Back to the full report</button>
        </div>
      )}

      {!data && (isLoading || needsSession) && <Skeleton />}
      {isError && !data && (
        <Notice icon={<AlertTriangle size={26} color="#e34948" />} title={errorMessage(error, 'Could not load this report.')}
          action={<button type="button" className="rv-btn" onClick={() => refetch()}>Try again</button>} />
      )}

      {data && (
        <div className={`rv-body${isFetching ? ' busy' : ''}`} aria-busy={isFetching}>
          {isFetching && <div className="rv-progress" aria-hidden="true" />}
          {isError && <div className="rv-inline-error"><AlertTriangle size={14} /> {errorMessage(error, 'Could not refresh the report; showing the last result.')}</div>}
          <p className="rv-desc">{data.description}</p>
          <div className="rv-scope">
            {data.scope.map(s => <span key={s} className="rv-scope-item">{s}</span>)}
            <span className="rv-scope-item muted">Generated {new Date(data.generatedAt).toLocaleString()}</span>
          </div>

          {data.summary.length > 0 && (
            <div className="rv-tiles">
              {data.summary.map(s => (
                <div key={s.label} className={`rv-tile ${s.tone ?? ''}`}>
                  <div className="rv-tile-label">{s.label}</div>
                  <div className="rv-tile-value">{formatStat(s.value)}</div>
                  {s.hint && <div className="rv-tile-sub">{s.hint}</div>}
                </div>
              ))}
            </div>
          )}

          {data.tables.map(t => (
            <TableCard key={`${data.key}-${t.id}`} report={data} table={t} onDrill={(param, value) => setParam(param, value as any)} />
          ))}

          {data.notes.length > 0 && (
            <div className="rv-notes">
              <div className="rv-notes-title">How these figures are worked out</div>
              <ul>{data.notes.map(n => <li key={n}>{n}</li>)}</ul>
            </div>
          )}
        </div>
      )}

      <style>{STYLES}</style>
    </div>
  );
}

function Notice({ icon, title, action }: { icon: React.ReactNode; title: string; action?: React.ReactNode }) {
  return (
    <div className="rv-notice" role="alert">
      {icon}
      <div className="rv-notice-title">{title}</div>
      {action}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="rv-skeleton" aria-label="Loading report" role="status">
      <div className="rv-sk-line" style={{ width: '60%' }} />
      <div className="rv-tiles">{Array.from({ length: 4 }, (_, i) => <div key={i} className="rv-sk-tile" />)}</div>
      <div className="rv-sk-card">{Array.from({ length: 6 }, (_, i) => <div key={i} className="rv-sk-line" style={{ width: `${90 - i * 6}%` }} />)}</div>
    </div>
  );
}

/* ── Filters ─────────────────────────────────────────────────────────── */

function FilterBar({ def, search, setParam, sessions, onReset, role, loadPrograms }: {
  def: ReportDefinition; search: URLSearchParams; setParam: (k: string, v: string | null) => void; sessions: any; onReset: () => void;
  role: ReportsRole; loadPrograms: () => Promise<any>;
}) {
  const has = (k: string) => def.filters.some(f => f.key === k);
  const { data: departments } = useQuery({ queryKey: ['sa-departments'], queryFn: saGetDepartments, enabled: has('department'), staleTime: 5 * 60_000 });
  const { data: programs } = useQuery({
    queryKey: ['report-programs', role], queryFn: loadPrograms, enabled: has('program') || has('level'), staleTime: 5 * 60_000,
  });
  const missingRequired = def.filters.some(f => f.required && !search.get(PARAM[f.key]));
  const [open, setOpen] = useState(false);
  const active = def.filters.filter(f => f.key !== 'session' && search.get(PARAM[f.key])).length;

  const deptId = search.get('departmentId') ?? '';
  const programId = search.get('programId') ?? '';
  const progList: any[] = (Array.isArray(programs) ? programs : []).filter((p: any) => !deptId || String(p.departmentId) === deptId);
  const chosen = progList.find((p: any) => String(p.id) === programId);
  const levels: number[] = chosen?.configuredLevels?.length ? chosen.configuredLevels
    : [...new Set(progList.flatMap((p: any) => p.configuredLevels ?? []))].sort((a: any, b: any) => a - b) as number[];
  const levelOptions = levels.length ? levels : defaultLevels();
  const periods = Math.max(periodsPerLevel(), ...progList.flatMap((p: any) => Object.values(p.semestersPerLevel ?? {}) as number[]));

  const control = (f: ReportFilterDef, id: string) => {
    const name = PARAM[f.key];
    const value = search.get(name) ?? '';
    const onChange = (v: string) => setParam(name, v || null);
    const select = (options: { value: string; label: string }[], allLabel: string | null, narrow = false) =>
      options.length > 8 ? (
        <Picker id={id} value={value} options={options} onChange={onChange} placeholder={allLabel ?? `Choose a ${f.label.toLowerCase()}`}
          clearable={allLabel != null} />
      ) : (
        <select id={id} className={`rv-select${narrow ? ' narrow' : ''}`} value={value} onChange={e => onChange(e.target.value)}>
          <option value="">{allLabel ?? `Choose a ${f.label.toLowerCase()}`}</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    switch (f.key) {
      case 'session':
        return (
          <select id={id} className="rv-select" value={value || 'all'} onChange={e => onChange(e.target.value)}>
            <option value="all">All sessions</option>
            {(Array.isArray(sessions) ? sessions : []).map((s: any) => <option key={s.id} value={s.id}>{s.name}{s.current ? ' (current)' : ''}</option>)}
          </select>
        );
      case 'department':
        return select((Array.isArray(departments) ? departments : []).map((d: any) => ({ value: String(d.id), label: d.name })), 'All departments');
      case 'program':
        return select(progList.map((p: any) => ({ value: String(p.id), label: p.name })), f.required ? null : `All ${f.label.toLowerCase()}s`);
      case 'level':
        return select(levelOptions.map(l => ({ value: String(l), label: `${f.label} ${l}` })), f.required ? null : `All ${f.label.toLowerCase()}s`, true);
      case 'semester':
        return select(Array.from({ length: periods }, (_, i) => ({ value: String(i + 1), label: `${f.label} ${i + 1}` })),
          f.required ? null : `All ${f.label.toLowerCase()}s`, true);
      case 'from':
      case 'to':
        return (
          <input id={id} type="date" className="rv-select narrow" value={value} onChange={e => onChange(e.target.value)}
            title={has('session') ? 'Dates take the place of the session dates' : undefined} />
        );
      case 'course':
      case 'quiz':
      case 'status':
        return select(f.options ?? [], f.required ? null : f.key === 'status' ? `Any ${f.label.toLowerCase()}` : `All ${f.label.toLowerCase()}s`);
      default:
        return null;
    }
  };

  if (!def.filters.length) return null;
  const expanded = open || missingRequired;
  return (
    <div className="rv-filterwrap">
      <button type="button" className="rv-filter-toggle" aria-expanded={expanded} aria-controls="rv-filters" onClick={() => setOpen(o => !o)}>
        <SlidersHorizontal size={15} /> Filters {active > 0 && <span className="rv-badge">{active}</span>}
        <ChevronDown size={15} style={{ marginLeft: 'auto', transform: expanded ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }} />
      </button>
      <div id="rv-filters" className={`rv-filters${expanded ? ' open' : ''}`}>
        {def.filters.map(f => {
          const id = `rv-f-${f.key}`;
          const needed = f.required && !search.get(PARAM[f.key]);
          return (
            <div key={f.key} className={`rv-field${needed ? ' needed' : ''}${f.key === 'course' || f.key === 'quiz' ? ' wide' : ''}`}>
              <label className="rv-field-label" htmlFor={id}>{f.label}{f.required && <span className="rv-req" aria-label="required"> *</span>}</label>
              {control(f, id)}
            </div>
          );
        })}
        <button type="button" className="rv-reset" onClick={onReset} title="Clear the filters"><RotateCcw size={13} /> Reset</button>
      </div>
    </div>
  );
}

/** A select with a search box, for long lists (quizzes, courses). Keyboard: ↑ ↓ to move, Enter to choose, Esc to close. */
function Picker({ id, value, options, onChange, placeholder, clearable }: {
  id: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; placeholder: string; clearable: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const selected = options.find(o => o.value === value);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? options.filter(o => o.label.toLowerCase().includes(needle)) : options;
  }, [options, q]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | TouchEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('touchstart', close); };
  }, [open]);
  useEffect(() => { setHi(0); }, [q, open]);
  useEffect(() => {
    if (open) document.getElementById(`${listId}-${hi}`)?.scrollIntoView({ block: 'nearest' });
  }, [hi, open, listId]);

  const choose = (v: string) => { onChange(v); setOpen(false); setQ(''); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) setOpen(true); else setHi(h => Math.min(filtered.length - 1, h + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => Math.max(0, h - 1)); }
    else if (e.key === 'Enter') { if (open && filtered[hi]) { e.preventDefault(); choose(filtered[hi].value); } }
    else if (e.key === 'Escape') { setOpen(false); setQ(''); }
  };

  return (
    <div className="rv-picker" ref={box}>
      <div className={`rv-picker-field${open ? ' open' : ''}`} onClick={() => { setOpen(true); input.current?.focus(); }}>
        <Search size={14} color="#94a3b8" aria-hidden="true" />
        <input ref={input} id={id} role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
          aria-activedescendant={open && filtered[hi] ? `${listId}-${hi}` : undefined}
          value={open ? q : selected?.label ?? ''} placeholder={selected?.label ?? placeholder}
          onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKey} autoComplete="off" />
        {clearable && value && (
          <button type="button" className="rv-picker-clear" aria-label="Clear" onClick={e => { e.stopPropagation(); choose(''); }}><X size={13} /></button>
        )}
        <ChevronDown size={15} color="#94a3b8" aria-hidden="true" />
      </div>
      {open && (
        <ul id={listId} role="listbox" className="rv-picker-list">
          {filtered.length === 0 && <li className="rv-picker-empty">No match for "{q}"</li>}
          {filtered.map((o, i) => (
            <li key={o.value} id={`${listId}-${i}`} role="option" aria-selected={o.value === value}
              className={`${i === hi ? 'hi' : ''}${o.value === value ? ' sel' : ''}`}
              onMouseEnter={() => setHi(i)} onMouseDown={e => { e.preventDefault(); choose(o.value); }}>
              <span>{o.label}</span>{o.value === value && <Check size={14} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Downloads ───────────────────────────────────────────────────────── */

/** Whether a media query matches, following changes (rotation, resizing). */
function useMedia(query: string) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return matches;
}

function ExportMenu({ api, report, reportKey, params }: { api: ReportsApi; report: ReportResult; reportKey: string; params: ReportParams }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // On phones the menu is a bottom sheet; it is rendered on <body> because the page is a size container,
  // which would otherwise pin "fixed" elements to the page instead of the screen.
  const sheet = useMedia('(max-width: 640px)');

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!ref.current?.contains(target) && !listRef.current?.contains(target)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  const hasRows = report.tables.some(t => t.rows.length > 0);
  const pdf = async () => {
    setOpen(false);
    setBusy(true);
    const id = toast.loading('Preparing the PDF…');
    try {
      await api.pdf(reportKey, params, reportFileName(report));
      toast.success('PDF downloaded', { id });
    } catch {
      toast.error('Could not create the PDF. Please try again.', { id });
    } finally {
      setBusy(false);
    }
  };

  const menu = (
    <>
      <div className="rv-sheet-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />
      <div className="rv-menu-list" role="menu" aria-label="Download this report" ref={listRef}>
        <div className="rv-sheet-handle" aria-hidden="true" />
        <button type="button" role="menuitem" disabled={!hasRows} onClick={() => { setOpen(false); downloadReportExcel(report); }}>
          <FileSpreadsheet size={16} /> <span><strong>Excel</strong><small>Every table on its own sheet, plus a summary</small></span>
        </button>
        <button type="button" role="menuitem" onClick={pdf}>
          <FileText size={16} /> <span><strong>PDF</strong><small>Printable, on the institution's letterhead</small></span>
        </button>
        {report.tables.map(t => (
          <button key={t.id} type="button" role="menuitem" onClick={() => { setOpen(false); downloadTableCsv(report, t); }} disabled={!t.rows.length}>
            <FileText size={16} /> <span><strong>CSV · {t.title}</strong><small>{t.rows.length.toLocaleString()} rows</small></span>
          </button>
        ))}
      </div>
    </>
  );

  return (
    <div className="rv-menu" ref={ref}>
      <button type="button" className="rv-primary" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-haspopup="menu" disabled={busy}>
        <Download size={15} /> <span>{busy ? 'Preparing…' : 'Download'}</span> <ChevronDown size={14} />
      </button>
      {open && (sheet ? createPortal(<div className="rv-sheet">{menu}<style>{STYLES}</style></div>, document.body) : menu)}
    </div>
  );
}

/* ── Tables and charts ───────────────────────────────────────────────── */

function TableCard({ report, table, onDrill }: { report: ReportResult; table: ReportTable; onDrill: (param: string, value: unknown) => void }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(PAGE_SIZES[1]);
  useEffect(() => { setPage(0); }, [table, q, sort, size]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = needle
      ? table.rows.filter(r => table.columns.some(c => String(r[c.key] ?? '').toLowerCase().includes(needle)))
      : table.rows;
    if (sort) {
      const col = table.columns.find(c => c.key === sort.key);
      const numeric = col && isNumeric(col.type);
      out = [...out].sort((a, b) => {
        const x = a[sort.key], y = b[sort.key];
        if (x == null || x === '') return 1;
        if (y == null || y === '') return -1;
        return (numeric ? Number(x) - Number(y) : String(x).localeCompare(String(y), undefined, { numeric: true })) * sort.dir;
      });
    }
    return out;
  }, [table, q, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / size));
  const shown = rows.slice(page * size, page * size + size);
  const toggleSort = (k: string) => setSort(s => (s?.key !== k ? { key: k, dir: -1 } : s.dir === -1 ? { key: k, dir: 1 } : null));
  const stack = table.columns.length <= STACK_MAX_COLUMNS;

  return (
    <section className="rv-card" aria-labelledby={`rv-t-${table.id}`}>
      <header className="rv-card-head">
        <div style={{ minWidth: 0 }}>
          <h2 id={`rv-t-${table.id}`} className="rv-card-title">{table.title} <span className="rv-count">{table.rows.length.toLocaleString()}</span></h2>
          {table.subtitle && <p className="rv-card-sub">{table.subtitle}</p>}
          {table.drill && table.rows.length > 0 && <p className="rv-card-sub">Tap or click a row: {table.drill.hint.toLowerCase()}.</p>}
        </div>
        <div className="rv-card-actions">
          {table.rows.length > 10 && (
            <label className="rv-find">
              <Search size={13} color="#94a3b8" aria-hidden="true" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search this table" aria-label={`Search ${table.title}`} />
              {q && <button type="button" className="rv-find-clear" aria-label="Clear search" onClick={() => setQ('')}><X size={12} /></button>}
            </label>
          )}
          {table.rows.length > 0 && (
            <button type="button" className="rv-small" onClick={() => downloadTableCsv(report, table)} title="Download this table as CSV">
              <Download size={13} /> CSV
            </button>
          )}
        </div>
      </header>

      {table.chart && table.rows.length > 1 && <ReportChart table={table} />}

      {table.rows.length === 0 ? (
        <div className="rv-empty">{table.emptyText}</div>
      ) : (
        <>
          <div className={`rv-scroll${stack ? '' : ' wide'}`} tabIndex={stack ? undefined : 0} aria-label={stack ? undefined : `${table.title} (scrolls sideways)`}>
            <table className={`rv-table${stack ? ' stack' : ' sticky'}`}>
              <thead>
                <tr>
                  {table.columns.map(c => (
                    <th key={c.key} scope="col" className={isNumeric(c.type) ? 'r' : ''}
                      aria-sort={sort?.key === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
                      <button type="button" onClick={() => toggleSort(c.key)}>
                        <span>{c.label}</span>
                        {sort?.key === c.key && (sort.dir === 1 ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((r, i) => {
                  const drillValue = table.drill ? r[table.drill.key] : undefined;
                  const clickable = drillValue != null;
                  return (
                    <tr key={i} className={clickable ? 'drill' : undefined} tabIndex={clickable ? 0 : undefined}
                      title={clickable ? table.drill!.hint : undefined}
                      onClick={clickable ? () => onDrill(table.drill!.param, drillValue) : undefined}
                      onKeyDown={clickable ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDrill(table.drill!.param, drillValue); } } : undefined}>
                      {table.columns.map((c, j) => {
                        const text = formatCell(r[c.key], c.type);
                        return (
                          <td key={c.key} data-label={c.label} className={`${isNumeric(c.type) ? 'r' : ''}${j === 0 ? ' first' : ''}${text ? '' : ' blank'}`}>
                            {text || <span className="rv-dash" aria-label="none">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {rows.length === 0 && <div className="rv-empty">No rows match "{q}".</div>}
          {rows.length > PAGE_SIZES[0] && (
            <div className="rv-pager">
              <label className="rv-pagesize">
                Rows
                <select value={size} onChange={e => setSize(Number(e.target.value))} aria-label="Rows per page">
                  {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <span className="rv-pager-info">{(page * size + 1).toLocaleString()}–{Math.min(rows.length, (page + 1) * size).toLocaleString()} of {rows.length.toLocaleString()}</span>
              <button type="button" className="rv-small icon" disabled={page === 0} onClick={() => setPage(p => p - 1)} aria-label="Previous page"><ChevronLeft size={15} /></button>
              <button type="button" className="rv-small icon" disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)} aria-label="Next page"><ChevronRight size={15} /></button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

/** Width of an element, following resizes (charts size their labels to it). */
function useWidth<T extends HTMLElement>(): [React.RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(entries => setWidth(Math.floor(entries[0].contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/** One measure per category: columns for ordered labels (dates, numbers, bands), horizontal bars for names. */
function ReportChart({ table }: { table: ReportTable }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const { label, value } = table.chart!;
  const labelCol = table.columns.find(c => c.key === label);
  const valueCol = table.columns.find(c => c.key === value);
  if (!labelCol || !valueCol) return null;
  const MAX = 25;
  const points = table.rows
    .filter(r => r[value] != null && r[value] !== '')
    .slice(0, MAX)
    .map(r => ({ name: String(r[label] ?? '—'), v: Number(r[value]) }));
  if (points.length < 2) return null;
  const ordered = labelCol.type === 'date' || labelCol.type === 'int' || ['month', 'band'].includes(label);
  const fmt = (v: number) => formatCell(v, valueCol.type);
  const labelWidth = Math.round(Math.min(170, Math.max(80, width * 0.32)));
  const maxChars = Math.max(8, Math.floor(labelWidth / 7));
  const compact = width > 0 && width < 480;

  return (
    <figure className="rv-chart" aria-label={`${valueCol.label} by ${labelCol.label.toLowerCase()}`}>
      <figcaption className="rv-chart-cap">{valueCol.label} by {labelCol.label.toLowerCase()}
        {table.rows.length > MAX && <span> · first {MAX} rows</span>}</figcaption>
      <div ref={ref} style={{ width: '100%' }}>
        {width > 0 && (ordered ? (
          <BarChart width={width} height={compact ? 200 : 240} data={points} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="name" tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={{ stroke: GRID }}
              interval={compact ? 'preserveStartEnd' : 0} minTickGap={6}
              tickFormatter={(s: string) => (s.length > 10 ? s.slice(0, 9) + '…' : s)} />
            <YAxis tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={false} width={compact ? 40 : 56} tickFormatter={fmt} />
            <Tooltip cursor={{ fill: 'rgba(42,120,214,0.06)' }} content={<ChartTip fmt={fmt} name={valueCol.label} />} />
            <Bar dataKey="v" fill={SERIES} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        ) : (
          <BarChart width={width} height={Math.max(140, points.length * (compact ? 28 : 30) + 40)} data={points} layout="vertical"
            margin={{ top: 4, right: 16, bottom: 4, left: 0 }} barCategoryGap={6}>
            <CartesianGrid horizontal={false} stroke={GRID} />
            <XAxis type="number" tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={{ stroke: GRID }} tickFormatter={fmt} />
            <YAxis type="category" dataKey="name" tick={{ fill: INK, fontSize: compact ? 11 : 12 }} tickLine={false} axisLine={false}
              width={labelWidth} tickFormatter={(s: string) => (s.length > maxChars ? s.slice(0, maxChars - 1) + '…' : s)} />
            <Tooltip cursor={{ fill: 'rgba(42,120,214,0.06)' }} content={<ChartTip fmt={fmt} name={valueCol.label} />} />
            <Bar dataKey="v" fill={SERIES} radius={[0, 4, 4, 0]} maxBarSize={20} />
          </BarChart>
        ))}
      </div>
    </figure>
  );
}

function ChartTip({ active, payload, label, fmt, name }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rv-tip">
      <div style={{ fontWeight: 700, color: INK, marginBottom: 2 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569' }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: SERIES }} />
        {name}: <strong style={{ color: INK }}>{fmt(payload[0].value)}</strong>
      </div>
    </div>
  );
}

const STYLES = `
  .rv { container: rv / inline-size; min-width: 0; }
  .rv *, .rv *::before, .rv *::after { box-sizing: border-box; }
  .rv-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 38px; padding: 0 16px; border-radius: 8px; border: 1.5px solid #e2e8f0; background: #fff; color: #334155; font-weight: 700; cursor: pointer; text-decoration: none; }
  .rv-notice { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 56px 20px; text-align: center; color: #64748b; }
  .rv-notice-title { font-weight: 700; color: #334155; max-width: 460px; }

  .rv-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
  .rv-back { display: inline-flex; align-items: center; gap: 6px; min-height: 36px; font-size: 13px; font-weight: 700; color: #5156be; text-decoration: none; }
  .rv-back:focus-visible, .rv-btn:focus-visible { outline: 2px solid #5156be; outline-offset: 2px; border-radius: 6px; }
  .rv-primary { display: inline-flex; align-items: center; gap: 6px; height: 38px; padding: 0 14px; border-radius: 9px; border: none; background: #5156be; color: #fff; font-weight: 700; font-size: 13px; cursor: pointer; white-space: nowrap; }
  .rv-primary:hover:not(:disabled) { background: #464ab0; }
  .rv-primary:focus-visible { outline: 2px solid #1e293b; outline-offset: 2px; }
  .rv-primary:disabled { opacity: .7; cursor: wait; }

  .rv-menu { position: relative; }
  .rv-menu-list { position: absolute; right: 0; top: calc(100% + 6px); z-index: 40; width: 310px; max-height: min(420px, 70vh); overflow-y: auto; background: #fff; border: 1.5px solid #e2e8f0; border-radius: 12px; box-shadow: 0 12px 32px rgba(15,23,42,.16); padding: 6px; }
  .rv-menu-list button { display: flex; align-items: flex-start; gap: 10px; width: 100%; min-height: 44px; padding: 9px 10px; border: none; background: none; border-radius: 8px; text-align: left; cursor: pointer; color: #334155; }
  .rv-menu-list button:hover:not(:disabled), .rv-menu-list button:focus-visible { background: #f5f6fd; outline: none; }
  .rv-menu-list button:disabled { opacity: .45; cursor: default; }
  .rv-menu-list button svg { margin-top: 2px; flex-shrink: 0; color: #5156be; }
  .rv-menu-list strong { display: block; font-size: 13px; color: ${INK}; overflow-wrap: anywhere; }
  .rv-menu-list small { display: block; font-size: 11.5px; color: #64748b; margin-top: 1px; }
  .rv-sheet-backdrop, .rv-sheet-handle { display: none; }

  .rv-filterwrap { margin-bottom: 14px; }
  .rv-filter-toggle { display: none; align-items: center; gap: 8px; width: 100%; min-height: 44px; padding: 0 14px; border-radius: 10px; border: 1.5px solid #e2e8f0; background: #fff; color: #334155; font-weight: 700; font-size: 13.5px; cursor: pointer; }
  .rv-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 10px; background: #5156be; color: #fff; font-size: 11px; }
  .rv-filters { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 10px 12px; padding: 12px 14px; background: #fff; border: 1.5px solid #e2e8f0; border-radius: 12px; }
  .rv-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; flex: 0 1 auto; }
  .rv-field.wide { flex: 1 1 320px; max-width: 520px; }
  .rv-field-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .04em; }
  .rv-req { color: #d97706; }
  .rv-select { height: 38px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 13px; padding: 0 10px; background: #f8fafc; color: ${INK}; min-width: 190px; max-width: 100%; width: 100%; }
  .rv-select.narrow { min-width: 140px; }
  .rv-select:focus { outline: none; border-color: #5156be; box-shadow: 0 0 0 3px rgba(81,86,190,.15); }
  .rv-field.needed .rv-select, .rv-field.needed .rv-picker-field { border-color: #d97706; background: #fffbeb; }
  .rv-reset { display: inline-flex; align-items: center; gap: 5px; height: 38px; padding: 0 12px; border-radius: 8px; border: 1.5px solid #e2e8f0; background: #fff; color: #475569; font-size: 12.5px; font-weight: 700; cursor: pointer; margin-left: auto; }

  .rv-picker { position: relative; min-width: 240px; width: 100%; }
  .rv-picker-field { display: flex; align-items: center; gap: 6px; height: 38px; padding: 0 8px 0 10px; border: 1.5px solid #e2e8f0; border-radius: 8px; background: #f8fafc; cursor: text; }
  .rv-picker-field.open, .rv-picker-field:focus-within { border-color: #5156be; box-shadow: 0 0 0 3px rgba(81,86,190,.15); background: #fff; }
  .rv-picker-field input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font-size: 13px; color: ${INK}; }
  .rv-picker-field input::placeholder { color: #64748b; }
  .rv-picker-clear { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border: none; border-radius: 6px; background: #eef0f4; color: #475569; cursor: pointer; }
  .rv-picker-list { position: absolute; z-index: 45; left: 0; right: 0; top: calc(100% + 4px); max-height: 300px; overflow-y: auto; margin: 0; padding: 4px; list-style: none; background: #fff; border: 1.5px solid #e2e8f0; border-radius: 10px; box-shadow: 0 12px 28px rgba(15,23,42,.14); }
  .rv-picker-list li { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 38px; padding: 7px 10px; border-radius: 7px; font-size: 13px; color: #334155; cursor: pointer; }
  .rv-picker-list li span { overflow-wrap: anywhere; }
  .rv-picker-list li.hi { background: #f1f2fc; }
  .rv-picker-list li.sel { color: #3b3f99; font-weight: 700; }
  .rv-picker-empty { color: #94a3b8 !important; cursor: default !important; }

  .rv-drill { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 10px 14px; margin-bottom: 14px; border-radius: 10px; background: #eef0fb; color: #3b3f99; font-size: 13px; font-weight: 600; }
  .rv-chip { display: inline-flex; align-items: center; gap: 5px; min-height: 32px; padding: 0 12px; border-radius: 16px; border: 1.5px solid #c7c9f0; background: #fff; color: #3b3f99; font-weight: 700; font-size: 12px; cursor: pointer; }

  .rv-body { position: relative; transition: opacity .15s; }
  .rv-body.busy { opacity: .6; }
  .rv-progress { position: sticky; top: 0; z-index: 5; height: 3px; margin-bottom: 8px; border-radius: 2px; background: linear-gradient(90deg, transparent, #5156be, transparent); background-size: 200% 100%; animation: rv-slide 1.1s linear infinite; }
  @keyframes rv-slide { from { background-position: 200% 0; } to { background-position: -200% 0; } }
  .rv-inline-error { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; padding: 8px 12px; border-radius: 8px; background: #fdeeee; color: #9f1f1f; font-size: 12.5px; font-weight: 600; }
  .rv-desc { margin: 0 0 6px; font-size: 13px; color: #475569; }
  .rv-scope { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
  .rv-scope-item { font-size: 12px; font-weight: 600; color: #334155; background: #f1f5f9; border-radius: 6px; padding: 3px 9px; overflow-wrap: anywhere; }
  .rv-scope-item.muted { color: #64748b; background: transparent; padding-left: 0; }

  .rv-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; margin-bottom: 16px; }
  .rv-tile { background: #fff; border: 1.5px solid #e2e8f0; border-left-width: 4px; border-radius: 12px; padding: 12px 14px; min-width: 0; }
  .rv-tile.good { border-left-color: #1f9d55; } .rv-tile.warn { border-left-color: #d97706; } .rv-tile.bad { border-left-color: #e34948; }
  .rv-tile-label { font-size: 12px; font-weight: 600; color: #64748b; }
  .rv-tile-value { font-size: 22px; font-weight: 800; color: ${INK}; margin-top: 4px; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; line-height: 1.2; }
  .rv-tile-sub { font-size: 11.5px; color: #94a3b8; margin-top: 2px; overflow-wrap: anywhere; }

  .rv-card { container: rv-card / inline-size; background: #fff; border: 1.5px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 16px rgba(0,0,0,0.05); margin-bottom: 16px; min-width: 0; }
  .rv-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 14px 16px 10px; }
  .rv-card-title { margin: 0; font-size: 14.5px; font-weight: 800; color: ${INK}; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .rv-count { font-size: 11px; font-weight: 700; color: #64748b; background: #f1f5f9; border-radius: 10px; padding: 1px 8px; }
  .rv-card-sub { margin: 3px 0 0; font-size: 12px; color: #64748b; }
  .rv-card-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .rv-find { display: flex; align-items: center; gap: 6px; height: 32px; padding: 0 8px 0 10px; border: 1.5px solid #e2e8f0; border-radius: 8px; background: #f8fafc; }
  .rv-find:focus-within { border-color: #5156be; background: #fff; }
  .rv-find input { border: none; outline: none; background: transparent; font-size: 12.5px; width: 160px; color: ${INK}; }
  .rv-find-clear { display: inline-flex; border: none; background: none; color: #94a3b8; cursor: pointer; padding: 2px; }
  .rv-small { display: inline-flex; align-items: center; justify-content: center; gap: 4px; height: 32px; padding: 0 10px; border-radius: 7px; border: 1.5px solid #e2e8f0; background: #fff; font-size: 12px; font-weight: 700; color: #475569; cursor: pointer; }
  .rv-small.icon { width: 32px; padding: 0; }
  .rv-small:hover:not(:disabled) { background: #f8fafc; border-color: #cbd5e1; }
  .rv-small:disabled { opacity: .45; cursor: default; }

  .rv-chart { margin: 0 16px 12px; min-width: 0; }
  .rv-chart-cap { font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px; }
  .rv-chart-cap span { font-weight: 500; color: #94a3b8; }
  .rv-tip { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; font-size: 12px; box-shadow: 0 6px 18px rgba(15,23,42,0.12); max-width: 260px; }

  .rv-scroll { overflow-x: auto; overscroll-behavior-x: contain; -webkit-overflow-scrolling: touch; }
  .rv-scroll.wide:focus-visible { outline: 2px solid #5156be; outline-offset: -2px; }
  .rv-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; }
  .rv-table th { text-align: left; border-bottom: 1px solid #eef0f4; white-space: nowrap; padding: 0; background: #fafbfd; }
  .rv-table th button { display: inline-flex; align-items: center; gap: 4px; width: 100%; min-height: 36px; padding: 8px 14px; border: none; background: none; cursor: pointer; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #64748b; font-weight: 700; text-align: left; }
  .rv-table th button:focus-visible { outline: 2px solid #5156be; outline-offset: -2px; }
  .rv-table th.r button { justify-content: flex-end; text-align: right; }
  .rv-table td { padding: 8px 14px; border-bottom: 1px solid #f4f5f8; color: #334155; vertical-align: top; max-width: 340px; overflow-wrap: anywhere; background: #fff; }
  .rv-table .r { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .rv-dash { color: #cbd5e1; }
  .rv-table tbody tr:hover td { background: #fafbff; }
  .rv-table tbody tr:last-child td { border-bottom: none; }
  .rv-table tr.drill { cursor: pointer; }
  .rv-table tr.drill td.first { color: #3b3f99; font-weight: 700; text-decoration: underline; text-decoration-color: #c7c9f0; text-underline-offset: 3px; }
  .rv-table tr.drill:focus-visible { outline: 2px solid #5156be; outline-offset: -2px; }
  /* Wide tables: the first column stays put while the rest scrolls */
  .rv-table.sticky th:first-child, .rv-table.sticky td.first { position: sticky; left: 0; z-index: 1; box-shadow: 1px 0 0 #eef0f4; }
  .rv-table.sticky th:first-child { z-index: 2; background: #fafbfd; }
  .rv-empty { padding: 26px 16px; text-align: center; color: #94a3b8; font-size: 13px; }
  .rv-pager { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 8px; padding: 10px 16px; font-size: 12px; color: #64748b; border-top: 1px solid #f1f5f9; }
  .rv-pagesize { display: inline-flex; align-items: center; gap: 6px; margin-right: auto; }
  .rv-pagesize select { height: 30px; border: 1.5px solid #e2e8f0; border-radius: 7px; background: #fff; font-size: 12px; padding: 0 6px; }
  .rv-notes { margin-top: 6px; padding: 12px 16px; border-radius: 12px; background: #f8fafc; border: 1px dashed #e2e8f0; }
  .rv-notes-title { font-size: 12px; font-weight: 800; color: #475569; margin-bottom: 4px; }
  .rv-notes ul { margin: 0; padding-left: 18px; } .rv-notes li { font-size: 12.5px; color: #64748b; margin: 3px 0; }

  .rv-skeleton { padding-top: 4px; }
  .rv-sk-line, .rv-sk-tile, .rv-sk-card { background: linear-gradient(90deg, #f1f5f9 25%, #e8edf3 37%, #f1f5f9 63%); background-size: 400% 100%; animation: rv-shimmer 1.4s ease infinite; border-radius: 8px; }
  .rv-sk-line { height: 12px; margin-bottom: 12px; }
  .rv-sk-tile { height: 78px; border-radius: 12px; }
  .rv-sk-card { padding: 16px; border-radius: 14px; background: #fff; border: 1.5px solid #e2e8f0; animation: none; }
  @keyframes rv-shimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }

  /* Narrow tables become one card per row on small screens */
  @container rv-card (max-width: 560px) {
    .rv-table.stack thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
    .rv-table.stack, .rv-table.stack tbody { display: block; }
    .rv-table.stack tr { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 14px; padding: 12px 16px; border-bottom: 1px solid #f1f5f9; }
    .rv-table.stack tr:last-child { border-bottom: none; }
    .rv-table.stack td { display: block; padding: 0; border: none; min-width: 0; max-width: none; text-align: left; white-space: normal; background: none !important; }
    .rv-table.stack td.first { grid-column: 1 / -1; font-weight: 700; color: ${INK}; }
    .rv-table.stack td::before { content: attr(data-label); display: block; font-size: 10.5px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: #94a3b8; margin-bottom: 2px; }
    .rv-table.stack td.first::before { display: none; }
    .rv-find input { width: 120px; }
  }

  /* Phones and narrow panes */
  @container rv (max-width: 640px) {
    .rv-filter-toggle { display: flex; }
    .rv-filters { display: none; margin-top: 8px; padding: 12px; }
    .rv-filters.open { display: flex; }
    .rv-field, .rv-field.wide { flex: 1 1 100%; max-width: none; }
    .rv-select, .rv-select.narrow, .rv-picker { min-width: 0; }
    .rv-reset { margin-left: 0; width: 100%; justify-content: center; height: 42px; }
    .rv-tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .rv-tile { padding: 10px 12px; }
    .rv-tile-value { font-size: 18px; }
    .rv-card-head { padding: 12px 14px 8px; }
    .rv-card-actions { width: 100%; }
    .rv-find { flex: 1; }
    .rv-find input { width: 100%; }
    .rv-chart { margin: 0 10px 10px; }
    .rv-pager { justify-content: space-between; }
    .rv-pagesize { margin-right: 0; }
    .rv-pager-info { order: -1; width: 100%; text-align: center; }
  }
  @media (max-width: 640px) {
    /* Download menu as a bottom sheet */
    .rv-sheet-backdrop { display: block; position: fixed; inset: 0; z-index: 1000; background: rgba(15,23,42,.38); }
    .rv-menu-list { position: fixed; left: 0; right: 0; bottom: 0; top: auto; z-index: 1001; width: auto; max-height: 75vh; border-radius: 16px 16px 0 0; padding: 8px 10px calc(12px + env(safe-area-inset-bottom)); }
    .rv-sheet-handle { display: block; width: 40px; height: 4px; border-radius: 2px; background: #cbd5e1; margin: 4px auto 8px; }
    .rv-select, .rv-picker-field input, .rv-find input, .rv-pagesize select { font-size: 16px; }
    .rv-primary span { display: inline; }
  }
  @media (pointer: coarse) {
    .rv-small { height: 40px; } .rv-small.icon { width: 40px; }
    .rv-select, .rv-picker-field, .rv-reset { height: 44px; }
    .rv-find { height: 40px; }
    .rv-table th button { min-height: 44px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .rv-progress, .rv-sk-line, .rv-sk-tile { animation: none; }
    .rv-body { transition: none; }
  }
`;
