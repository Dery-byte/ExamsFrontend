import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getRegCourses, getCoursesForStudent, regCourses } from '../../api/endpoints';
import toast from 'react-hot-toast';
import PageHeader from '../../components/PageHeader';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import './studentCatalog.css';
import { Search, Loader2, CheckCircle2, BookOpen, Info, Plus, ChevronRight, GraduationCap, X, Layers, BookMarked, SearchX } from 'lucide-react';
import { tx, isSchoolMode, showLevelPicker, levelName, periodName } from '../../utils/terms';

/** "Sem 1" / "Term 2" for the compact card meta line. */
const shortPeriod = (n: unknown) => (n == null || n === '' ? '' : `${isSchoolMode() ? 'Term' : 'Sem'} ${n}`);

const byCode = (a: any, b: any) =>
  String(a.courseCode ?? '').localeCompare(String(b.courseCode ?? ''), undefined, { numeric: true });

export default function RegisterCourses() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<any[]>([]);
  const [registeredCount, setRegisteredCount] = useState(0);
  const [selectedLevel, setSelectedLevel] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [enrollingCid, setEnrollingCid] = useState<any>(null);
  const [confirmCourse, setConfirmCourse] = useState<any>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    setLoadFailed(false);
    try {
      // Use the student-filtered endpoint — returns only courses for the
      // student's current program + level + semester (set by HOD/SuperAdmin)
      const [regRaw, catsRaw] = await Promise.all([
        getRegCourses(),
        getCoursesForStudent().catch(() => []),
      ]);
      const reg  = Array.isArray(regRaw)  ? regRaw  : [];
      const cats = Array.isArray(catsRaw) ? catsRaw : [];

      const userId  = user?.id;
      const userReg = reg.filter((r: any) => r.user?.id === userId);
      const regCids = new Set(userReg.map((r: any) => r.category?.cid));

      // Only show courses the student has NOT yet registered for
      const unregistered = cats.filter((cat: any) => !regCids.has(cat.cid)).sort(byCode);

      setRegisteredCount(userReg.length);
      setCategories(unregistered);
    } catch (err) {
      console.error('Course catalog load error:', err);
      setLoadFailed(true);
    } finally {
      setIsLoading(false);
    }
  };

  const uniqueLevels = useMemo(() => (
    Array.from(new Set(categories.map((c: any) => c.level)))
      .sort((a: any, b: any) => parseInt(String(a)) - parseInt(String(b))) as string[]
  ), [categories]);

  // Keep a valid level selected as courses get registered (and disappear) or load.
  useEffect(() => {
    if (!uniqueLevels.includes(selectedLevel)) setSelectedLevel(uniqueLevels[0] ?? '');
  }, [uniqueLevels, selectedLevel]);

  const levelCourses = useMemo(
    () => categories.filter(c => c.level === selectedLevel),
    [categories, selectedLevel],
  );

  const displayedCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return levelCourses;
    return levelCourses.filter(c =>
      String(c.title ?? '').toLowerCase().includes(query) ||
      String(c.courseCode ?? '').toLowerCase().includes(query)
    );
  }, [levelCourses, searchQuery]);

  const availableUnits = useMemo(
    () => categories.reduce((sum, c) => sum + (Number(c.creditUnits) || 0), 0),
    [categories],
  );

  const onEnrol = (course: any) => setConfirmCourse(course);

  const confirmEnrol = async () => {
    const course = confirmCourse;
    if (!course) return;
    setEnrollingCid(course.cid);
    try {
      await regCourses({ category: { cid: course.cid } });
      toast.success(`${course.courseCode} registered`, {
        icon: '🎓',
        style: { borderRadius: '10px', background: 'var(--gray-900, #212529)', color: '#fff', fontSize: '13px', fontWeight: 600 },
      });
      setCategories(prev => prev.filter(c => c.cid !== course.cid));
      setRegisteredCount(n => n + 1);
    } catch {
      toast.error('Could not complete registration. Please check your connection.');
    } finally {
      setEnrollingCid(null);
      setConfirmCourse(null);
    }
  };

  const goToMyCourses = () => navigate('/user-dashboard/courses');

  const currentLevel = (user as any)?.currentLevel;
  const currentSemester = (user as any)?.currentSemester;
  const contextTitle = isSchoolMode()
    ? (currentSemester ? periodName(currentSemester) : tx('Course registration'))
    : (currentLevel
        ? [levelName(currentLevel), currentSemester ? periodName(currentSemester) : ''].filter(Boolean).join(' · ')
        : tx('Course registration'));

  const showTabs = !isLoading && uniqueLevels.length > 0 && showLevelPicker(uniqueLevels.length);
  const query = searchQuery.trim();

  return (
    <div className="rc animate-fade-in">
      <PageHeader title={tx('Course Registration')} breadcrumbs={['Portal', 'Enrolment']} />

      {/* ── Context: who this catalog is for + quick numbers ── */}
      <section className="rc-hero" aria-label={tx('Registration summary')}>
        <div className="rc-hero-main">
          <div className="rc-hero-icon"><GraduationCap size={22} /></div>
          <div className="rc-hero-text">
            <span className="rc-eyebrow">{tx('Showing courses for')}</span>
            <h2 className="rc-hero-title">{contextTitle}</h2>
            <p className="rc-hero-sub">
              {isSchoolMode()
                ? tx('Pick the courses you will take. Courses for later semesters are hidden.')
                : tx('Pick the courses you will take this semester. Courses for later levels and semesters are hidden.')}
            </p>
          </div>
        </div>
        <div className="rc-stats">
          <div className="rc-stat">
            <span className="rc-stat-label">Available</span>
            <strong className="rc-stat-value">{isLoading ? '—' : categories.length}</strong>
          </div>
          {availableUnits > 0 && (
            <div className="rc-stat">
              <span className="rc-stat-label">{tx('Credit units')}</span>
              <strong className="rc-stat-value">{availableUnits}</strong>
            </div>
          )}
          <button type="button" className="rc-stat rc-stat-link" onClick={goToMyCourses}>
            <span className="rc-stat-label">Registered</span>
            <strong className="rc-stat-value">
              {isLoading ? '—' : registeredCount}
              <ChevronRight size={15} />
            </strong>
          </button>
        </div>
      </section>

      {/* ── Toolbar: level tabs + search ── */}
      <div className="rc-panel">
        {showTabs && (
          <div className="rc-tabs" role="tablist" aria-label={tx('Level')}>
            {uniqueLevels.map(l => {
              const count = categories.filter(c => c.level === l).length;
              const active = selectedLevel === l;
              return (
                <button
                  key={l}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`rc-tab${active ? ' is-active' : ''}`}
                  onClick={() => setSelectedLevel(l)}
                >
                  {levelName(l)}
                  <span className="rc-tab-count">{count}</span>
                </button>
              );
            })}
          </div>
        )}
        <div className="rc-bar">
          <div className="rc-bar-text">
            <h3>{tx('Available courses')}</h3>
            <span aria-live="polite">
              {isLoading
                ? 'Loading…'
                : query
                  ? `${displayedCourses.length} of ${levelCourses.length} match “${query}”`
                  : `${displayedCourses.length} ${tx(displayedCourses.length === 1 ? 'course' : 'courses')} ${tx('open to you')}`}
            </span>
          </div>
          <div className="rc-search">
            <Search size={16} className="rc-search-ico" aria-hidden />
            <input
              type="search"
              placeholder={tx('Search by course code or title')}
              aria-label={tx('Search courses')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              disabled={isLoading}
            />
            {searchQuery && (
              <button type="button" className="rc-search-clear" onClick={() => setSearchQuery('')} aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Catalog ── */}
      {isLoading ? (
        <div className="rc-grid" aria-busy="true" aria-label={tx('Loading courses')}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rc-card rc-skel">
              <div className="rc-skel-line" style={{ width: 70, height: 20 }} />
              <div className="rc-skel-line" style={{ width: '80%', height: 16, marginTop: 14 }} />
              <div className="rc-skel-line" style={{ width: '95%', height: 12, marginTop: 10 }} />
              <div className="rc-skel-line" style={{ width: '60%', height: 12, marginTop: 6 }} />
              <div className="rc-skel-foot">
                <div className="rc-skel-line" style={{ width: 80, height: 12 }} />
                <div className="rc-skel-line" style={{ width: 92, height: 32, borderRadius: 9 }} />
              </div>
            </div>
          ))}
        </div>
      ) : loadFailed ? (
        <div className="rc-empty">
          <div className="rc-empty-icon rc-empty-icon--warn"><Info size={26} /></div>
          <h4>{tx('Could not load the course catalog')}</h4>
          <p>Check your connection and try again.</p>
          <div className="rc-empty-actions">
            <button type="button" className="rc-btn" onClick={loadData}>Try again</button>
          </div>
        </div>
      ) : categories.length === 0 ? (
        <div className="rc-empty">
          <div className="rc-empty-icon"><CheckCircle2 size={28} /></div>
          <h4>You're all set</h4>
          <p>{tx('You have registered for every course open to you right now. New courses appear here when your department adds them.')}</p>
          <div className="rc-empty-actions">
            <button type="button" className="rc-btn" onClick={goToMyCourses}>
              {tx('View my courses')} <ChevronRight size={15} />
            </button>
          </div>
        </div>
      ) : displayedCourses.length === 0 ? (
        <div className="rc-empty">
          <div className="rc-empty-icon rc-empty-icon--muted"><SearchX size={26} /></div>
          <h4>{tx('No courses match your search')}</h4>
          <p>Nothing matches “{query}”{showTabs ? <> in {levelName(selectedLevel)}</> : null}. Try a different code or title.</p>
          <div className="rc-empty-actions">
            <button type="button" className="rc-btn rc-btn--ghost" onClick={() => setSearchQuery('')}>Clear search</button>
          </div>
        </div>
      ) : (
        <ul className="rc-grid" role="list">
          {displayedCourses.map(c => {
            const units = Number(c.creditUnits) || 0;
            const busy = enrollingCid === c.cid;
            const meta = [isSchoolMode() ? '' : levelName(c.level), shortPeriod(c.semester)].filter(Boolean).join(' · ');
            return (
              <li key={c.cid} className="rc-card">
                <div className="rc-card-top">
                  <span className="rc-code">{c.courseCode}</span>
                  {units > 0 && (
                    <span className="rc-units" title={tx(`${units} credit unit${units === 1 ? '' : 's'}`)}>
                      <BookMarked size={12} /> {units} {units === 1 ? 'unit' : 'units'}
                    </span>
                  )}
                </div>
                <h4 className="rc-title" title={c.title}>{c.title}</h4>
                {c.description?.trim() && <p className="rc-desc" title={c.description}>{c.description}</p>}
                <div className="rc-card-foot">
                  <span className="rc-meta">
                    {meta && <><Layers size={13} /> {meta}</>}
                  </span>
                  <button
                    type="button"
                    className="rc-btn"
                    onClick={() => onEnrol(c)}
                    disabled={enrollingCid !== null}
                    aria-label={`Register ${c.courseCode} ${c.title}`}
                  >
                    {busy ? <><Loader2 className="rc-spin" size={15} /> Registering</> : <><Plus size={15} /> Register</>}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* ── Confirm dialog (same compact style as the quiz "is ready" prompt) ── */}
      {confirmCourse && (() => {
        const units = Number(confirmCourse.creditUnits) || 0;
        return (
          <ConfirmDialog
            title={tx('Register this course?')}
            confirmLabel="Register"
            busyLabel="Registering"
            busy={enrollingCid !== null}
            onConfirm={confirmEnrol}
            onCancel={() => setConfirmCourse(null)}
          >
            <p>
              <b>{confirmCourse.courseCode}</b> · <b>{confirmCourse.title}</b>
              {units > 0 && <> · {units} {units === 1 ? 'unit' : 'units'}</>}
            </p>
            <p>{tx('It will be added to your courses for the current semester.')}</p>
          </ConfirmDialog>
        );
      })()}

      {/* ── Notice ── */}
      <div className="rc-notice">
        <div className="rc-notice-icon"><Info size={18} /></div>
        <div className="rc-notice-text">
          <strong>{tx('Before you register')}</strong>
          <span>{tx('Course registration is subject to credit load limits and prerequisite verification by your department coordinator.')}</span>
        </div>
        <button type="button" className="rc-btn rc-btn--ghost" onClick={goToMyCourses}>
          <BookOpen size={15} /> {tx('My registered courses')}
        </button>
      </div>

    </div>
  );
}
