import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { getRegCourses, deleteRegCourse } from '../../api/endpoints';
import PageHeader from '../../components/PageHeader';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useAssessments, useFeature } from '../../hooks/useFeatureFlags';
import { rememberQuizCourse } from '../../utils/quizLink';
import {
  Search, BookOpen, Trash2, ChevronRight, Download, X, Plus, ClipboardList, SearchX, AlertTriangle, RotateCcw, Layers, BookMarked,
} from 'lucide-react';
import { tx, isSchoolMode, levelName, periodName } from '../../utils/terms';
import './studentCatalog.css';

/** "Sem 1" / "Term 2" for the compact row meta line. */
const shortPeriod = (n: unknown) => (n == null || n === '' ? '' : `${isSchoolMode() ? 'Term' : 'Sem'} ${n}`);

const byCode = (a: any, b: any) =>
  String(a.category?.courseCode ?? '').localeCompare(String(b.category?.courseCode ?? ''), undefined, { numeric: true });

const csvCell = (v: unknown) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

interface Group { key: string; level: any; semester: any; label: string; rows: any[] }

export default function CoursesRegistered() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const quizzesOn = useAssessments();
  const registrationOn = useFeature('STUDENT_COURSE_REGISTRATION');
  const [records, setRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [dropTarget, setDropTarget] = useState<any>(null);
  const [dropping, setDropping] = useState(false);

  const loadRegisteredCourses = async () => {
    setIsLoading(true);
    setLoadFailed(false);
    try {
      const data: any[] = await getRegCourses();
      const userId = user?.id;
      setRecords((Array.isArray(data) ? data : []).filter((r: any) => r.user?.id === userId && r.category));
    } catch (err) {
      console.error('Failed to load registered courses:', err);
      setLoadFailed(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadRegisteredCourses(); }, []);

  const currentLevel = (user as any)?.currentLevel;
  const currentSemester = (user as any)?.currentSemester;

  const totalUnits = useMemo(
    () => records.reduce((sum, r) => sum + (Number(r.category?.creditUnits) || 0), 0),
    [records],
  );

  const query = filterQuery.trim();

  /** Registrations grouped by level + semester; the student's current period first, then newest first. */
  const groups: Group[] = useMemo(() => {
    const q = query.toLowerCase();
    const rows = !q ? records : records.filter(r =>
      String(r.category?.courseCode ?? '').toLowerCase().includes(q) ||
      String(r.category?.title ?? '').toLowerCase().includes(q)
    );
    const map = new Map<string, Group>();
    for (const r of rows) {
      const level = r.category?.level ?? '';
      const semester = r.category?.semester ?? '';
      const key = `${level}|${semester}`;
      if (!map.has(key)) {
        const label = [isSchoolMode() ? '' : (level !== '' ? levelName(level) : ''), semester !== '' ? periodName(semester) : '']
          .filter(Boolean).join(' · ') || tx('Other courses');
        map.set(key, { key, level, semester, label, rows: [] });
      }
      map.get(key)!.rows.push(r);
    }
    const isCurrent = (g: Group) => String(g.level) === String(currentLevel ?? '') && String(g.semester) === String(currentSemester ?? '');
    return Array.from(map.values())
      .map(g => ({ ...g, rows: g.rows.sort(byCode) }))
      .sort((a, b) =>
        (Number(isCurrent(b)) - Number(isCurrent(a))) ||
        ((parseInt(String(b.level)) || 0) - (parseInt(String(a.level)) || 0)) ||
        ((Number(b.semester) || 0) - (Number(a.semester) || 0)));
  }, [records, query, currentLevel, currentSemester]);

  const shownCount = groups.reduce((n, g) => n + g.rows.length, 0);

  const contextTitle = isSchoolMode()
    ? (currentSemester ? periodName(currentSemester) : tx('My courses'))
    : (currentLevel
        ? [levelName(currentLevel), currentSemester ? periodName(currentSemester) : ''].filter(Boolean).join(' · ')
        : tx('My courses'));

  const openAssessments = (r: any) => {
    rememberQuizCourse(r.category.cid);
    navigate('/user-dashboard/quizzes');
  };

  const confirmDrop = async () => {
    const r = dropTarget;
    if (!r) return;
    setDropping(true);
    try {
      await deleteRegCourse(r.rid);
      setRecords(prev => prev.filter(x => x.rid !== r.rid));
      toast.success(`${r.category?.courseCode ?? tx('Course')} dropped`);
    } catch {
      toast.error(tx('Could not drop the course. Please try again or contact your department.'));
    } finally {
      setDropping(false);
      setDropTarget(null);
    }
  };

  const exportCsv = () => {
    const head = [tx('Course code'), tx('Course title'), ...(isSchoolMode() ? [] : [tx('Level')]), tx('Semester'), tx('Credit units')];
    const lines = [head.map(csvCell).join(',')];
    for (const g of groups) {
      for (const r of g.rows) {
        const c = r.category ?? {};
        lines.push([c.courseCode, c.title, ...(isSchoolMode() ? [] : [c.level]), c.semester, c.creditUnits ?? ''].map(csvCell).join(','));
      }
    }
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tx('my-courses')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="rc animate-fade-in">
      <PageHeader title={tx('My Courses')} breadcrumbs={['Portal', tx('My Courses')]} />

      {/* ── Context strip ── */}
      <section className="rc-hero" aria-label={tx('Registration summary')}>
        <div className="rc-hero-main">
          <div className="rc-hero-icon"><BookOpen size={22} /></div>
          <div className="rc-hero-text">
            <span className="rc-eyebrow">{tx('Registered courses')}</span>
            <h2 className="rc-hero-title">{contextTitle}</h2>
            <p className="rc-hero-sub">
              {quizzesOn
                ? tx('Everything you are registered for. Open a course to see its assessments, or drop one you no longer take.')
                : tx('Everything you are registered for. Drop a course you no longer take.')}
            </p>
          </div>
        </div>
        <div className="rc-stats">
          <div className="rc-stat">
            <span className="rc-stat-label">{tx('Courses')}</span>
            <strong className="rc-stat-value">{isLoading ? '—' : records.length}</strong>
          </div>
          {totalUnits > 0 && (
            <div className="rc-stat">
              <span className="rc-stat-label">{tx('Credit units')}</span>
              <strong className="rc-stat-value">{totalUnits}</strong>
            </div>
          )}
        </div>
      </section>

      {/* ── Toolbar ── */}
      <div className="rc-panel">
        <div className="rc-bar mc-bar">
          <div className="rc-bar-text">
            <h3>{tx('Registered courses')}</h3>
            <span aria-live="polite">
              {isLoading
                ? 'Loading…'
                : query
                  ? `${shownCount} of ${records.length} match “${query}”`
                  : `${records.length} ${tx(records.length === 1 ? 'course' : 'courses')}`}
            </span>
          </div>
          <div className="mc-tools">
            <div className="rc-search">
              <Search size={16} className="rc-search-ico" aria-hidden />
              <input
                type="search"
                placeholder={tx('Search by course code or title')}
                aria-label={tx('Search registered courses')}
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
                disabled={isLoading || records.length === 0}
              />
              {filterQuery && (
                <button type="button" className="rc-search-clear" onClick={() => setFilterQuery('')} aria-label="Clear search">
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="mc-tool-btns">
              <button
                type="button"
                className="rc-btn rc-btn--ghost"
                onClick={exportCsv}
                disabled={isLoading || shownCount === 0}
                title={tx('Download this list as a spreadsheet (CSV)')}
              >
                <Download size={15} /> <span>Export</span>
              </button>
              {registrationOn && (
                <button type="button" className="rc-btn" onClick={() => navigate('/user-dashboard/register')}>
                  <Plus size={15} /> <span>{tx('Add courses')}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── List ── */}
      {isLoading ? (
        <div className="mc-list" aria-busy="true" aria-label={tx('Loading courses')}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="mc-row rc-skel">
              <div className="rc-skel-line mc-code" style={{ width: 64, height: 22 }} />
              <div className="mc-main">
                <div className="rc-skel-line" style={{ width: '55%', height: 14 }} />
                <div className="rc-skel-line" style={{ width: '35%', height: 11, marginTop: 8 }} />
              </div>
              <div className="mc-actions">
                <div className="rc-skel-line" style={{ width: 120, height: 34, borderRadius: 9 }} />
              </div>
            </div>
          ))}
        </div>
      ) : loadFailed ? (
        <div className="rc-empty">
          <div className="rc-empty-icon rc-empty-icon--warn"><AlertTriangle size={26} /></div>
          <h4>{tx("Couldn't load your courses")}</h4>
          <p>Check your connection and try again.</p>
          <div className="rc-empty-actions">
            <button type="button" className="rc-btn" onClick={loadRegisteredCourses}><RotateCcw size={14} /> Try again</button>
          </div>
        </div>
      ) : records.length === 0 ? (
        <div className="rc-empty">
          <div className="rc-empty-icon rc-empty-icon--muted"><BookOpen size={26} /></div>
          <h4>{tx('No courses yet')}</h4>
          <p>
            {registrationOn
              ? tx('You have not registered for any courses. Register for this semester’s courses to see them here.')
              : tx('Courses you are registered for will appear here once your department enrols you.')}
          </p>
          {registrationOn && (
            <div className="rc-empty-actions">
              <button type="button" className="rc-btn" onClick={() => navigate('/user-dashboard/register')}>
                {tx('Register courses')} <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
      ) : shownCount === 0 ? (
        <div className="rc-empty">
          <div className="rc-empty-icon rc-empty-icon--muted"><SearchX size={26} /></div>
          <h4>{tx('No courses match your search')}</h4>
          <p>Nothing matches “{query}”. Try a different code or title.</p>
          <div className="rc-empty-actions">
            <button type="button" className="rc-btn rc-btn--ghost" onClick={() => setFilterQuery('')}>Clear search</button>
          </div>
        </div>
      ) : (
        <div className="mc-groups">
          {groups.map(g => {
            const units = g.rows.reduce((s, r) => s + (Number(r.category?.creditUnits) || 0), 0);
            return (
              <section key={g.key} className="mc-list" aria-label={g.label}>
                {groups.length > 1 && (
                  <header className="mc-group-head">
                    <span className="mc-group-title"><Layers size={14} /> {g.label}</span>
                    <span className="mc-group-meta">
                      {g.rows.length} {tx(g.rows.length === 1 ? 'course' : 'courses')}{units > 0 ? ` · ${units} units` : ''}
                    </span>
                  </header>
                )}
                <ul role="list">
                  {g.rows.map(r => {
                    const c = r.category ?? {};
                    const cu = Number(c.creditUnits) || 0;
                    const meta = [isSchoolMode() ? '' : (c.level != null && c.level !== '' ? levelName(c.level) : ''), shortPeriod(c.semester)]
                      .filter(Boolean).join(' · ');
                    return (
                      <li key={r.rid} className="mc-row">
                        <span className="rc-code mc-code" title={c.courseCode}>{c.courseCode}</span>
                        <div className="mc-main">
                          <div className="mc-title" title={c.title}>{c.title}</div>
                          <div className="mc-meta">
                            {meta && <span>{meta}</span>}
                            {cu > 0 && <span><BookMarked size={12} /> {cu} {cu === 1 ? 'unit' : 'units'}</span>}
                          </div>
                        </div>
                        <div className="mc-actions">
                          {quizzesOn && (
                            <button type="button" className="rc-btn rc-btn--ghost mc-assess" onClick={() => openAssessments(r)}>
                              <ClipboardList size={15} /> Assessments
                            </button>
                          )}
                          <button
                            type="button"
                            className="mc-drop"
                            onClick={() => setDropTarget(r)}
                            disabled={dropping}
                            title={tx('Drop course')}
                            aria-label={`${tx('Drop course')} ${c.courseCode ?? ''}`}
                          >
                            <Trash2 size={15} /> <span className="mc-drop-label">Drop</span>
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {dropTarget && (
        <ConfirmDialog
          tone="danger"
          title={tx('Drop this course?')}
          confirmLabel="Drop"
          busyLabel="Dropping"
          cancelLabel={tx('Keep course')}
          busy={dropping}
          onConfirm={confirmDrop}
          onCancel={() => setDropTarget(null)}
        >
          <p><b>{dropTarget.category?.courseCode}</b> · <b>{dropTarget.category?.title}</b></p>
          <p>{tx('It will be removed from your registered courses.')}</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
