import { useState, useEffect, useMemo, useRef, useCallback, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useInstitution } from '../../hooks/useInstitution';
import { useFeatureFlags, useAssessments, useBoarding } from '../../hooks/useFeatureFlags';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { hideQuizGroups } from '../../utils/assessmentsNav';
import { isSchoolMode, tx } from '../../utils/terms';
import NotificationBell from '../NotificationBell';
import AvatarPhoto from '../common/AvatarPhoto';
import InstitutionMark from '../common/InstitutionMark';
import SubscriptionNotice from '../common/SubscriptionNotice';
import {
  LayoutDashboard, UserCircle, Building2, BookMarked, Users, GraduationCap, LogOut, X, Clock, ChevronRight, Settings,
  UserCog, BookOpen, PlusCircle, Library, Megaphone, BarChart3, ScrollText, CalendarDays, MessageSquareWarning, Scale,
  FileText, DatabaseZap, ToggleRight, Landmark, ClipboardPen, ClipboardList, FilePlus, Eye, Wallet, FileBarChart,
  UserCheck, BedDouble, ShoppingBag, UserRound, Gift, CalendarRange, Package, BellRing, PiggyBank, FolderOpen, Search,
} from 'lucide-react';
import './superAdminShell.css';

const DESKTOP_QUERY = '(min-width: 1024px)';
const RAIL_KEY = 'sa_nav_rail';
const BASE = '/super-admin';

interface NavItem { to: string; icon: ReactNode; label: string; exact?: boolean }
interface NavGroup { label: string; items: NavItem[] }

const readRail = () => { try { return localStorage.getItem(RAIL_KEY) === '1'; } catch { return false; } };

/** The nav item a path belongs to: exact match, else the longest item path the URL starts with. */
function matchItem(groups: NavGroup[], path: string): { group: NavGroup; item: NavItem } | null {
  let best: { group: NavGroup; item: NavItem } | null = null;
  for (const group of groups) for (const item of group.items) {
    const hit = item.exact ? path === item.to || path === item.to + '/' : path === item.to || path.startsWith(item.to + '/');
    if (hit && (!best || item.to.length > best.item.to.length)) best = { group, item };
  }
  return best;
}

export default function SuperAdminLayout() {
  const { user, logout, timeDisplay } = useAuth();
  const { term, institution } = useInstitution();
  const { auditLogSuperAdmin, materials: materialsOn } = useFeatureFlags();   // the Super Admin sees materials whenever the developer's module is on
  const quizzesOn = useAssessments();   // the developer's Assessments switch
  const boarding = useBoarding();       // the developer's day / boarding setting
  const [mobileOpen, setMobileOpen] = useState(false);
  const [rail, setRail] = useState(readRail);
  const [scrolled, setScrolled] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches);
  const [searchSheet, setSearchSheet] = useState(false);
  const location = useLocation();

  // Light surface tokens for this area — on <body> so dialogs portalled there follow too
  useEffect(() => {
    document.body.classList.add('shell-light');
    return () => document.body.classList.remove('shell-light');
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Follow resizes and tablet rotation, not just the width at first render
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => { setIsDesktop(mq.matches); if (mq.matches) setMobileOpen(false); };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => { setMobileOpen(false); setSearchSheet(false); }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  const toggleMenu = () => {
    if (!isDesktop) { setMobileOpen(o => !o); return; }
    setRail(r => {
      try { localStorage.setItem(RAIL_KEY, r ? '0' : '1'); } catch { /* storage blocked */ }
      return !r;
    });
  };

  const navGroups: NavGroup[] = useMemo(() => hideQuizGroups([
    {
      label: 'Main Dashboard',
      items: [
        { to: BASE, exact: true, icon: <LayoutDashboard size={21} />, label: 'Overview' },
        { to: `${BASE}/configuration`, icon: <Settings size={21} />, label: 'Configuration' },
        { to: `${BASE}/institution`, icon: <Landmark size={21} />, label: 'Institution' },
        { to: `${BASE}/features`, icon: <ToggleRight size={21} />, label: 'Feature Controls' },
        { to: `${BASE}/announcements`, icon: <Megaphone size={21} />, label: 'Announcements' },
        { to: `${BASE}/profile`, icon: <UserCircle size={21} />, label: 'My Profile' },
      ],
    },
    {
      label: tx('University Structure'),
      items: [
        { to: `${BASE}/departments`, icon: <Building2 size={21} />, label: tx('Departments') },
        { to: `${BASE}/programs`, icon: <BookMarked size={21} />, label: tx('Programs & Levels') },
        { to: `${BASE}/academic-settings`, icon: <Scale size={21} />, label: 'Sessions & Grading' },
      ],
    },
    {
      label: 'Finance',
      items: [
        { to: `${BASE}/fees`, icon: <Wallet size={21} />, label: 'Fees & Payments' },
        { to: `${BASE}/bills`, icon: <ShoppingBag size={21} />, label: 'Bills' },
        { to: `${BASE}/student-accounts`, icon: <UserRound size={21} />, label: 'Student accounts' },
        { to: `${BASE}/cash-book`, icon: <BookOpen size={21} />, label: 'Cash book' },
        { to: `${BASE}/stores`, icon: <Package size={21} />, label: 'Stores' },
        { to: `${BASE}/reminders`, icon: <BellRing size={21} />, label: 'Reminders' },
        { to: `${BASE}/concessions`, icon: <Gift size={21} />, label: 'Concessions' },
        { to: `${BASE}/wallets`, icon: <PiggyBank size={21} />, label: 'Student wallets' },
        { to: `${BASE}/year-end`, icon: <CalendarRange size={21} />, label: 'Year end' },
        { to: `${BASE}/finance-staff`, icon: <Landmark size={21} />, label: 'Finance staff' },
      ],
    },
    {
      label: 'Academic Registry',
      items: [
        { to: `${BASE}/courses`, icon: <Library size={21} />, label: tx('Courses') },
        { to: `${BASE}/add-course`, icon: <PlusCircle size={21} />, label: tx('Add Course') },
        { to: `${BASE}/quizzes`, icon: <ClipboardList size={21} />, label: 'Quizzes' },
        { to: `${BASE}/add-quiz`, icon: <FilePlus size={21} />, label: 'Add Quiz' },
        { to: `${BASE}/quiz-review`, icon: <Eye size={21} />, label: 'Quiz Review Panel' },
        { to: `${BASE}/question-bank`, icon: <Library size={21} />, label: 'Question Bank' },
        { to: `${BASE}/attendance`, icon: <UserCheck size={21} />, label: 'Class Attendance' },
        ...(materialsOn === true ? [{ to: `${BASE}/materials`, icon: <FolderOpen size={21} />, label: tx('Notes & Assignments') }] : []),
        { to: `${BASE}/timetable`, icon: <CalendarDays size={21} />, label: 'Exam Timetable' },
        { to: `${BASE}/remarks`, icon: <MessageSquareWarning size={21} />, label: 'Re-mark Requests' },
      ],
    },
    {
      label: 'User Management',
      items: [
        { to: `${BASE}/hods`, icon: <UserCog size={21} />, label: tx('HOD Accounts') },
        { to: `${BASE}/student-semester`, icon: <GraduationCap size={21} />, label: tx('Student Semesters') },
        { to: `${BASE}/students`, icon: <Users size={21} />, label: tx('Students & Levels') },
        { to: `${BASE}/enroll-student`, icon: <BookOpen size={21} />, label: tx('Enroll Student') },
        { to: `${BASE}/lecturers`, icon: <Users size={21} />, label: tx('Teaching Staff') },
        { to: `${BASE}/data-tools`, icon: <DatabaseZap size={21} />, label: 'Data Tools' },
        ...(boarding.mode !== 'DAY' ? [{ to: `${BASE}/boarding`, icon: <BedDouble size={21} />, label: 'Boarding' }] : []),
      ],
    },
    {
      label: 'Academic Performance',
      items: [
        { to: `${BASE}/marks-sheets`, icon: <BookOpen size={21} />, label: 'Marks Sheets' },
        ...(isSchoolMode() ? [{ to: `${BASE}/term-remarks`, icon: <ClipboardPen size={21} />, label: 'Report Remarks' }] : []),
        ...(!isSchoolMode() ? [{ to: `${BASE}/academic-records`, icon: <FileText size={21} />, label: 'Academic Records' }] : []),
        { to: `${BASE}/analytics`, icon: <BarChart3 size={21} />, label: 'Analytics' },
        { to: `${BASE}/reports`, icon: <FileBarChart size={21} />, label: 'Reports' },
        ...(auditLogSuperAdmin !== false ? [{ to: `${BASE}/audit-log`, icon: <ScrollText size={21} />, label: 'Audit Log' }] : []),
      ],
    },
  ], quizzesOn), [quizzesOn, materialsOn, boarding.mode, auditLogSuperAdmin]);

  const current = matchItem(navGroups, location.pathname);
  const pageTitle = current ? term(current.item.label) : 'Dashboard';
  const pageGroup = current ? term(current.group.label) : institution.shortName;

  // Accordion: moving to a page in another group opens that group and folds the rest away;
  // the user can still open more groups by hand
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(current ? [current.group.label] : [navGroups[0]?.label]));
  useEffect(() => {
    if (current) setOpenGroups(s => (s.has(current.group.label) ? s : new Set([current.group.label])));
  }, [current?.group.label]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggleGroup = (label: string) => setOpenGroups(s => {
    const n = new Set(s);
    if (n.has(label)) n.delete(label); else n.add(label);
    return n;
  });

  const showRail = isDesktop && rail;
  const firstName = user?.firstname || 'Super';
  const fullName = [user?.firstname, user?.lastname].filter(Boolean).join(' ') || 'Super Admin';

  return (
    <div className={`sa-shell${showRail ? ' rail' : ''}`}>
      {/* Sidebar */}
      <aside className={`sa-side${mobileOpen ? ' open' : ''}`} aria-label="Super Admin menu">
        <div className="sa-brand">
          <InstitutionMark size={showRail ? 46 : 50} radius={16} />
          <div className="sa-brand-text">
            <div className="sa-brand-name" title={institution.name}>{institution.shortName || institution.name}</div>
            <div className="sa-brand-sub">Super Admin Console</div>
          </div>
          <button type="button" className="sa-side-close" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>

        <nav className="sa-nav">
          {navGroups.map(group => {
            const open = showRail || openGroups.has(group.label);
            return (
              <div key={group.label} className={`sa-group${open ? ' open' : ''}`}>
                <button type="button" className="sa-group-btn" onClick={() => toggleGroup(group.label)} aria-expanded={open}>
                  <span>{term(group.label)}</span>
                  <ChevronRight size={13} />
                </button>
                <div className="sa-group-items">
                  <div>
                    {group.items.map(item => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.exact}
                        tabIndex={open ? undefined : -1}
                        title={showRail ? term(item.label) : undefined}
                        className={() => `sa-link${current?.item.to === item.to ? ' active' : ''}`}
                        aria-current={current?.item.to === item.to ? 'page' : undefined}
                      >
                        {item.icon}
                        <span className="sa-link-label">{term(item.label)}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        <div className="sa-side-foot">
          <div className="sa-side-foot-name" title={institution.name}>{institution.name}</div>
          <div className="sa-side-foot-copy">© {new Date().getFullYear()} All rights reserved</div>
          <button type="button" className="sa-side-signout" onClick={() => logout()} title="Sign out">
            <LogOut size={15} /><span>Sign out</span>
          </button>
        </div>
      </aside>

      {mobileOpen && <DrawerBackdrop onClose={() => setMobileOpen(false)} />}

      {/* Main */}
      <main className="sa-main">
        <header className={`sa-top${scrolled ? ' scrolled' : ''}`}>
          <button type="button" className="sa-burger" onClick={toggleMenu}
            aria-label={isDesktop ? (rail ? 'Expand menu' : 'Collapse menu') : 'Open menu'}>
            <svg width="26" height="20" viewBox="0 0 26 20" fill="none" aria-hidden>
              <rect y="1" width="26" height="2.6" rx="1.3" fill="currentColor" />
              <rect y="8.7" width="18" height="2.6" rx="1.3" fill="currentColor" />
              <rect y="16.4" width="26" height="2.6" rx="1.3" fill="currentColor" />
            </svg>
          </button>
          <div className="sa-top-title">
            <h1>{pageTitle}</h1>
            <p>{pageGroup}</p>
          </div>

          <PageSearch groups={navGroups} term={term} />

          <div className="sa-top-actions">
            <button type="button" className="sa-round sa-search-btn" onClick={() => setSearchSheet(true)} aria-label="Search pages">
              <Search size={19} />
            </button>
            {timeDisplay && (
              <span className={`sa-clock${timeDisplay.className === 'danger' ? ' danger' : ''}`} title="Time left in this session">
                <Clock size={14} /> {timeDisplay.display}
              </span>
            )}
            <NotificationBell round />
            <ProfileMenu
              name={fullName} first={firstName} photo={user?.profilePicture} institution={institution.name}
              clock={timeDisplay} onLogout={() => logout()}
            />
          </div>
        </header>

        <div className="sa-content">
          <SubscriptionNotice />
          <Outlet />
        </div>
      </main>

      {searchSheet && (
        <div className="sa-search-sheet" onMouseDown={e => { if (e.target === e.currentTarget) setSearchSheet(false); }}>
          <PageSearch groups={navGroups} term={term} autoFocus onDone={() => setSearchSheet(false)} />
        </div>
      )}
    </div>
  );
}

function DrawerBackdrop({ onClose }: { onClose: () => void }) {
  useBodyScrollLock();
  return <div className="sa-overlay" onClick={onClose} aria-hidden />;
}

/** Search box that jumps to any page in the menu (Ctrl/⌘ + K focuses it). */
function PageSearch({ groups, term, autoFocus, onDone }: {
  groups: NavGroup[]; term: (s: string) => string; autoFocus?: boolean; onDone?: () => void;
}) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [hl, setHl] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const all = useMemo(() => groups.flatMap(g => g.items.map(i => ({ ...i, label: term(i.label), group: term(g.label) }))), [groups, term]);
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return all.slice(0, 8);
    const words = s.split(/\s+/);
    return all.filter(i => words.every(w => `${i.label} ${i.group}`.toLowerCase().includes(w))).slice(0, 10);
  }, [q, all]);

  useEffect(() => { setHl(0); }, [q]);
  useEffect(() => { if (autoFocus) inputRef.current?.focus(); }, [autoFocus]);

  // Ctrl/⌘+K from anywhere (only the always-visible desktop box listens)
  useEffect(() => {
    if (autoFocus) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && inputRef.current?.offsetParent) {
        e.preventDefault(); inputRef.current.focus(); setOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [autoFocus]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const go = useCallback((to: string) => {
    navigate(to); setQ(''); setOpen(false); inputRef.current?.blur(); onDone?.();
  }, [navigate, onDone]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHl(h => Math.min(h + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHl(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter' && results[hl]) { e.preventDefault(); go(results[hl].to); }
    else if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); onDone?.(); }
  };

  const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);
  return (
    <div className="sa-search" ref={boxRef} role="search">
      <input
        ref={inputRef} value={q} placeholder="Search pages…" aria-label="Search pages"
        role="combobox" aria-expanded={open || !!autoFocus} aria-controls="sa-search-list" aria-autocomplete="list"
        onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKey}
      />
      {!autoFocus && <kbd>{isMac ? '⌘K' : 'Ctrl K'}</kbd>}
      <Search size={19} />
      {(open || autoFocus) && (
        <div className="sa-search-results" id="sa-search-list" role="listbox">
          {results.length === 0 ? <div className="sa-search-empty">No page matches “{q}”.</div> : results.map((r, i) => (
            <button key={r.to} type="button" role="option" aria-selected={i === hl}
              className={`sa-search-item${i === hl ? ' hl' : ''}`}
              onMouseEnter={() => setHl(i)} onMouseDown={e => e.preventDefault()} onClick={() => go(r.to)}>
              <span className="sa-search-item-ico">{r.icon}</span>
              <span style={{ minWidth: 0 }}><b>{r.label}</b><small>{r.group}</small></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileMenu({ name, first, photo, institution, clock, onLogout }: {
  name: string; first: string; photo?: string | null; institution: string;
  clock: { display: string; className: string } | null; onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div className="sa-me" ref={ref}>
      <button type="button" className="sa-me-btn" onClick={() => setOpen(o => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu">
        <span className="sa-me-avatar"><AvatarPhoto src={photo}>{first.charAt(0).toUpperCase()}</AvatarPhoto></span>
        <span className="sa-me-text">
          <div className="sa-me-name">{name}</div>
          <div className="sa-me-role">Super Admin</div>
        </span>
      </button>
      {open && (
        <div className="sa-menu" role="menu">
          <div className="sa-menu-head">
            <b>{name}</b>
            <small>Super Admin · {institution}</small>
          </div>
          {clock && (
            <div className="sa-menu-item sa-menu-clock" style={{ cursor: 'default', color: clock.className === 'danger' ? '#dc2626' : undefined }}>
              <Clock size={16} /> Session: {clock.display}
            </div>
          )}
          <button type="button" role="menuitem" className="sa-menu-item" onClick={() => { setOpen(false); navigate(`${BASE}/profile`); }}>
            <UserCircle size={17} /> My profile
          </button>
          <button type="button" role="menuitem" className="sa-menu-item" onClick={() => { setOpen(false); navigate(`${BASE}/configuration`); }}>
            <Settings size={17} /> Configuration
          </button>
          <button type="button" role="menuitem" className="sa-menu-item danger" onClick={onLogout}>
            <LogOut size={17} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
