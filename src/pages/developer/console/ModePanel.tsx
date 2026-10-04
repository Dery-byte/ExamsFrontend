import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  GraduationCap, School, Backpack, Building2, CalendarDays, Hash, FileText, ArrowRight, AlertTriangle, Loader2,
  Languages, Info,
} from 'lucide-react';
import { getSystemMode, setSystemMode } from '../../../api/endpoints';
import { SYSTEM_MODES, syncMode, type SystemMode } from '../../../utils/terms';
import { PanelHeader, PanelLoading, PanelError, apiMessage } from './ui';

interface ModeOption {
  value: SystemMode;
  label: string;
  periodsPerLevel: number;
  terms: Record<string, string>;
}

const MODE_ICON: Record<SystemMode, ReactNode> = {
  UNIVERSITY: <GraduationCap size={20} />,
  SHS: <School size={20} />,
  BASIC: <Backpack size={20} />,
  ALL_SCHOOLS: <Building2 size={20} />,
};

/** The university word each term key stands for, in display order. */
const CONCEPTS: [string, string][] = [
  ['level', 'Year of study'], ['semester', 'Academic period'], ['course', 'Course'], ['courses', 'Courses (plural)'],
  ['program', 'Programme'], ['lecturer', 'Instructor'], ['hod', 'Head of department'], ['student', 'Learner'],
  ['studentId', 'Learner ID'], ['reportCard', 'Report'],
];

function facts(o: ModeOption) {
  const uni = o.value === 'UNIVERSITY';
  const period = (o.terms.semester ?? (uni ? 'Semester' : 'Term')).toLowerCase();
  return {
    calendar: `${o.periodsPerLevel} ${period}s a year`,
    levels: uni ? '100, 200, 300 …' : `${o.terms.level} 1, 2, 3 …`,
    report: o.terms.reportCard,
    people: `${o.terms.courses} · ${o.terms.lecturer}s`,
  };
}

/** Choose what kind of institution the system serves: pick, review the impact, then apply. */
export default function ModePanel() {
  const q = useQuery({ queryKey: ['dev-mode'], queryFn: getSystemMode });
  const [staged, setStaged] = useState<SystemMode | null>(null);
  const [ack, setAck] = useState(false);
  const [saving, setSaving] = useState(false);
  const reviewRef = useRef<HTMLDivElement>(null);

  const current: SystemMode | undefined = q.data?.mode;
  const options: ModeOption[] = q.data?.options ?? [];
  const optionOf = (m: SystemMode | null | undefined) => options.find(o => o.value === m);
  const meta = (m: SystemMode | null | undefined) => SYSTEM_MODES.find(s => s.value === m);

  useEffect(() => { setAck(false); }, [staged]);
  useEffect(() => {
    if (staged) reviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [staged]);

  const select = (m: SystemMode) => setStaged(m === current ? null : m);

  const apply = async () => {
    if (!staged || !ack) return;
    const label = meta(staged)?.label;
    setSaving(true);
    try {
      await setSystemMode(staged);
      syncMode(staged);
      toast.success(`System mode is now ${label}. Reloading…`);
      setTimeout(() => window.location.reload(), 700);
    } catch (err) {
      toast.error(apiMessage(err, 'Could not change the mode'));
      setSaving(false);
    }
  };

  const header = (
    <PanelHeader
      title="System mode"
      description="Sets the type of institution for every user: the wording, the academic calendar, how levels are numbered and which features appear."
    />
  );

  if (q.isLoading) return <section>{header}<PanelLoading label="Loading system mode" /></section>;
  if (q.isError || !current) return <section>{header}<PanelError message="Could not load the system mode." onRetry={() => q.refetch()} /></section>;

  const cur = optionOf(current);
  const next = optionOf(staged);
  const selected = staged ?? current;

  return (
    <section>
      {header}

      {/* Active mode */}
      <div className="dd-hero">
        <div className="dd-hero-icon">{MODE_ICON[current]}</div>
        <div className="dd-hero-main">
          <div className="dd-eyebrow"><span className="dd-live-dot" aria-hidden /> Active mode</div>
          <h2>{meta(current)?.label ?? current}</h2>
          {cur && <p>{cur.terms.courses}, {cur.terms.lecturer.toLowerCase()}s and {cur.terms.student.toLowerCase()}s, organised by {cur.terms.semester.toLowerCase()}.</p>}
        </div>
        {cur && (
          <dl className="dd-facts">
            <div><dt><CalendarDays size={14} /> Calendar</dt><dd>{facts(cur).calendar}</dd></div>
            <div><dt><Hash size={14} /> Levels</dt><dd>{facts(cur).levels}</dd></div>
            <div><dt><FileText size={14} /> Reports</dt><dd>{facts(cur).report}</dd></div>
          </dl>
        )}
      </div>

      {/* Mode picker */}
      <fieldset className="dd-fieldset" disabled={saving}>
        <legend className="dd-section-title">Available modes</legend>
        <p className="dd-section-sub">Selecting a mode doesn't change anything yet. You'll review the impact first.</p>
        <div className="dd-mgrid" role="radiogroup" aria-label="System mode">
          {SYSTEM_MODES.map(m => {
            const o = optionOf(m.value);
            const isCurrent = m.value === current;
            const isSelected = m.value === selected;
            const f = o && facts(o);
            return (
              <label key={m.value} className={`dd-mcard${isSelected ? ' is-selected' : ''}${isCurrent ? ' is-current' : ''}`}>
                <input type="radio" name="system-mode" className="dd-sr" value={m.value}
                  checked={isSelected} onChange={() => select(m.value)} />
                <div className="dd-mcard-head">
                  <span className="dd-mcard-icon">{MODE_ICON[m.value]}</span>
                  <span className="dd-mcard-title">
                    <strong>{m.label}</strong>
                    {isCurrent && <span className="dd-tag dd-tag-ok">Active</span>}
                    {isSelected && !isCurrent && <span className="dd-tag dd-tag-accent">Selected</span>}
                  </span>
                  <span className="dd-radio" aria-hidden />
                </div>
                <p className="dd-mcard-desc">{m.description}</p>
                {f && (
                  <ul className="dd-chips" aria-label="Summary">
                    <li><CalendarDays size={12} /> {f.calendar}</li>
                    <li><Hash size={12} /> {f.levels}</li>
                    <li><Languages size={12} /> {f.people}</li>
                  </ul>
                )}
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Review the change, or show the wording in use */}
      {staged && cur && next ? (
        <div className="dd-review" ref={reviewRef} aria-live="polite">
          <div className="dd-review-head">
            <div>
              <div className="dd-eyebrow">Review change</div>
              <h2 className="dd-review-title">
                <span>{meta(current)?.label}</span> <ArrowRight size={18} aria-label="to" /> <span className="dd-accent-text">{meta(staged)?.label}</span>
              </h2>
            </div>
          </div>

          <Impact cur={cur} next={next} />

          <div className="dd-subhead">Terminology</div>
          <div className="dd-diff" role="table" aria-label="Wording before and after">
            <div className="dd-diff-row dd-diff-th" role="row">
              <span role="columnheader">Concept</span><span role="columnheader">Now</span><span role="columnheader">After switch</span>
            </div>
            {conceptRows(cur.terms).map(([k, concept]) => {
              const from = cur.terms[k] ?? '–';
              const to = next.terms[k] ?? '–';
              const changed = from !== to;
              return (
                <div key={k} role="row" className={`dd-diff-row${changed ? ' is-changed' : ''}`}>
                  <span role="cell" className="dd-diff-concept">{concept}</span>
                  <span role="cell" className="dd-diff-from">{from}</span>
                  <span role="cell" className="dd-diff-to">
                    <ArrowRight size={13} className="dd-diff-arrow" aria-hidden />
                    {to}{!changed && <span className="dd-diff-same">unchanged</span>}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="dd-callout dd-callout-warn">
            <AlertTriangle size={18} />
            <div>
              <strong>Existing records are not renumbered.</strong> Levels such as 100 or 200 stay as they are. Switch on a
              fresh system, or update programmes and students afterwards.
            </div>
          </div>

          <div className="dd-review-foot">
            <label className="dd-check">
              <input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} disabled={saving} />
              <span>I understand that every user is affected and existing data is not renumbered.</span>
            </label>
            <div className="dd-review-actions">
              <button className="dd-btn" onClick={() => setStaged(null)} disabled={saving}>Cancel</button>
              <button className="dd-btn dd-btn-primary" onClick={apply} disabled={!ack || saving}>
                {saving && <Loader2 size={15} className="dd-spin" />} Switch to {meta(staged)?.label}
              </button>
            </div>
          </div>
        </div>
      ) : cur && (
        <div className="dd-card">
          <div className="dd-card-head">
            <h2 className="dd-card-title"><Languages size={16} /> Wording in use</h2>
            <span className="dd-muted-sm">What every user currently sees</span>
          </div>
          <dl className="dd-terms">
            {conceptRows(cur.terms).map(([k, concept]) => (
              <div key={k}><dt>{concept}</dt><dd>{cur.terms[k]}</dd></div>
            ))}
          </dl>
          <p className="dd-note">
            <Info size={14} /> The calendar default ({facts(cur).calendar}) can be overridden per level on the Programmes page.
          </p>
        </div>
      )}
    </section>
  );
}

/** Known concepts in order, then any key the server adds later. */
function conceptRows(terms: Record<string, string>): [string, string][] {
  const known = new Set(CONCEPTS.map(([k]) => k));
  return [...CONCEPTS.filter(([k]) => k in terms), ...Object.keys(terms).filter(k => !known.has(k)).map(k => [k, k] as [string, string])];
}

function Impact({ cur, next }: { cur: ModeOption; next: ModeOption }) {
  const keys = Object.keys(cur.terms);
  const changedTerms = keys.filter(k => cur.terms[k] !== next.terms[k]).length;
  const fc = facts(cur);
  const fn = facts(next);
  const items: { title: string; body: ReactNode }[] = [
    {
      title: 'Wording',
      body: changedTerms === 0
        ? 'No visible words change.'
        : <><b>{changedTerms} of {keys.length}</b> terms change for every user on their next page load.</>,
    },
    {
      title: 'Calendar',
      body: fc.calendar === fn.calendar
        ? <>Stays at <b>{fn.calendar}</b>.</>
        : <><b>{fc.calendar}</b> becomes <b>{fn.calendar}</b> by default. Programmes with their own setting keep it.</>,
    },
    {
      title: 'Level numbering',
      body: fc.levels === fn.levels
        ? <>Stays <b>{fn.levels}</b></>
        : <>New levels are numbered <b>{fn.levels}</b> instead of <b>{fc.levels}</b></>,
    },
  ];
  return (
    <ul className="dd-impact">
      {items.map(i => <li key={i.title}><span className="dd-impact-k">{i.title}</span><span>{i.body}</span></li>)}
    </ul>
  );
}
