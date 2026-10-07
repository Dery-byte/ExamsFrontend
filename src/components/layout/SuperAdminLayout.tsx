import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useInstitution } from '../../hooks/useInstitution';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { isSchoolMode } from '../../utils/terms';
import NotificationBell from '../NotificationBell';
import {
  LayoutDashboard, UserCircle, Building2, BookMarked,
  Users, GraduationCap, LogOut, Menu, X, ShieldCheck,
  Clock, ChevronRight, Settings, UserCog, BookOpen, PlusCircle, Library,
  Megaphone, BarChart3, ScrollText, CalendarDays, MessageSquareWarning, Scale, FileText, DatabaseZap, ToggleRight,
  Landmark, ClipboardPen, ClipboardList, FilePlus, Eye, Wallet
} from 'lucide-react';
import { tx } from '../../utils/terms';

const DESKTOP_QUERY = '(min-width: 1024px)';

export default function SuperAdminLayout() {
  const { user, logout, timeDisplay } = useAuth();
  const { term } = useInstitution();
  const { auditLogSuperAdmin } = useFeatureFlags();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Follow resizes and tablet rotation, not just the width at first render
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => { setIsDesktop(mq.matches); if (mq.matches) setMobileOpen(false); };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location]);

  const navItems = [
    {
      label: 'Main Dashboard',
      items: [
        { to: '/super-admin', exact: true, icon: <LayoutDashboard size={20} />, label: 'Overview' },
        { to: '/super-admin/configuration', icon: <Settings size={20} />, label: 'Configuration' },
        { to: '/super-admin/institution', icon: <Landmark size={20} />, label: 'Institution' },
        { to: '/super-admin/features', icon: <ToggleRight size={20} />, label: 'Feature Controls' },
        { to: '/super-admin/announcements', icon: <Megaphone size={20} />, label: 'Announcements' },
        { to: '/super-admin/profile', icon: <UserCircle size={20} />, label: 'My Profile' },
      ]
    },
    {
      label: tx('University Structure'),
      items: [
        { to: '/super-admin/departments', icon: <Building2 size={20} />, label: 'Departments' },
        { to: '/super-admin/programs', icon: <BookMarked size={20} />, label: tx('Programs & Levels') },
        { to: '/super-admin/academic-settings', icon: <Scale size={20} />, label: 'Sessions & Grading' },
      ]
    },
    {
      label: 'Finance',
      items: [
        { to: '/super-admin/fees', icon: <Wallet size={20} />, label: 'Fees & Payments' },
      ]
    },
    {
      label: 'Academic Registry',
      items: [
        { to: '/super-admin/courses', icon: <Library size={20} />, label: tx('Courses') },
        { to: '/super-admin/add-course', icon: <PlusCircle size={20} />, label: tx('Add Course') },
        { to: '/super-admin/quizzes', icon: <ClipboardList size={20} />, label: 'Quizzes' },
        { to: '/super-admin/add-quiz', icon: <FilePlus size={20} />, label: 'Add Quiz' },
        { to: '/super-admin/quiz-review', icon: <Eye size={20} />, label: 'Quiz Review Panel' },
        { to: '/super-admin/question-bank', icon: <Library size={20} />, label: 'Question Bank' },
        { to: '/super-admin/timetable', icon: <CalendarDays size={20} />, label: 'Exam Timetable' },
        { to: '/super-admin/remarks', icon: <MessageSquareWarning size={20} />, label: 'Re-mark Requests' },
      ]
    },
    {
      label: 'User Management',
      items: [
        { to: '/super-admin/hods', icon: <UserCog size={20} />, label: tx('HOD Accounts') },
        { to: '/super-admin/student-semester', icon: <GraduationCap size={20} />, label: tx('Student Semesters') },
        { to: '/super-admin/students', icon: <Users size={20} />, label: tx('Students & Levels') },
        { to: '/super-admin/enroll-student', icon: <BookOpen size={20} />, label: tx('Enroll Student') },
        { to: '/super-admin/lecturers', icon: <Users size={20} />, label: 'Enroll Staff' },
        { to: '/super-admin/data-tools', icon: <DatabaseZap size={20} />, label: 'Data Tools' },
      ]
    },
    {
      label: 'Academic Performance',
      items: [
        { to: '/super-admin/marks-sheets', icon: <BookOpen size={20} />, label: 'Marks Sheets' },
        ...(isSchoolMode() ? [{ to: '/super-admin/term-remarks', icon: <ClipboardPen size={20} />, label: 'Report Remarks' }] : []),
        ...(!isSchoolMode() ? [{ to: '/super-admin/academic-records', icon: <FileText size={20} />, label: 'Academic Records' }] : []),
        { to: '/super-admin/analytics', icon: <BarChart3 size={20} />, label: 'Analytics' },
        ...(auditLogSuperAdmin !== false ? [{ to: '/super-admin/audit-log', icon: <ScrollText size={20} />, label: 'Audit Log' }] : []),
      ]
    },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary, #0f0f1a)', fontFamily: 'Inter, sans-serif' }}>
      {/* Sidebar */}
      <aside style={{
        width: 260, background: 'linear-gradient(180deg,#12122a 0%,#1a1a35 100%)',
        borderRight: '1px solid rgba(139,92,246,0.15)',
        display: 'flex', flexDirection: 'column', position: 'fixed',
        top: 0, left: mobileOpen ? 0 : -280, bottom: 0, zIndex: 1000,
        transition: 'left 0.3s ease', padding: '0',
        ...(isDesktop ? { left: 0 } : {})
      }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid rgba(139,92,246,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(124,58,237,0.4)'
            }}>
              <ShieldCheck size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Super Admin</div>
              <div style={{ fontSize: 11, color: 'rgba(139,92,246,0.8)' }}>University Control</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 12px' }}>
          {navItems.map((group) => (
            <div key={group.label} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(139,92,246,0.6)', textTransform: 'uppercase', letterSpacing: 1.2, padding: '0 8px 8px' }}>
                {term(group.label)}
              </div>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px', borderRadius: 9, marginBottom: 3,
                    textDecoration: 'none', fontSize: 13, fontWeight: 500,
                    transition: 'all 0.2s',
                    background: isActive ? 'linear-gradient(135deg,rgba(124,58,237,0.25),rgba(79,70,229,0.15))' : 'transparent',
                    color: isActive ? '#a78bfa' : 'rgba(255,255,255,0.65)',
                    border: isActive ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent',
                  })}
                >
                  {item.icon}
                  <span style={{ flex: 1 }}>{term(item.label)}</span>
                  <ChevronRight size={14} style={{ opacity: 0.4 }} />
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* User Info */}
        <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(139,92,246,0.15)' }}>
          {timeDisplay && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: timeDisplay.className === 'danger' ? 'rgba(239,68,68,0.1)' : 'rgba(139,92,246,0.08)',
              border: `1px solid ${timeDisplay.className === 'danger' ? 'rgba(239,68,68,0.3)' : 'rgba(139,92,246,0.2)'}`,
              borderRadius: 8, padding: '6px 10px', marginBottom: 10
            }}>
              <Clock size={13} color={timeDisplay.className === 'danger' ? '#ef4444' : '#a78bfa'} />
              <span style={{ fontSize: 12, color: timeDisplay.className === 'danger' ? '#ef4444' : '#a78bfa', fontWeight: 600 }}>
                {timeDisplay.display}
              </span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff'
            }}>{user?.firstname?.[0]?.toUpperCase() || 'S'}</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{user?.firstname} {user?.lastname}</div>
              <div style={{ fontSize: 10, color: 'rgba(139,92,246,0.7)' }}>Super Administrator</div>
            </div>
          </div>
          <button onClick={() => logout()} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)',
            background: 'rgba(239,68,68,0.08)', color: '#f87171', cursor: 'pointer', fontSize: 13, fontWeight: 500
          }}>
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999
        }} />
      )}

      {/* Main */}
      {/* minWidth 0: wide tables scroll inside their cards instead of stretching the page */}
      <main style={{ flex: 1, minWidth: 0, marginLeft: isDesktop ? 260 : 0, minHeight: '100vh' }}>
        {/* Top bar */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: scrolled ? 'rgba(15,15,26,0.95)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(139,92,246,0.1)' : '1px solid transparent',
          padding: isDesktop ? '12px 24px' : '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          transition: 'all 0.3s'
        }}>
          <button onClick={() => setMobileOpen(true)} aria-label="Open menu" style={{
            display: isDesktop ? 'none' : 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
            borderRadius: 8, padding: 8, cursor: 'pointer', color: '#a78bfa'
          }}>
            <Menu size={20} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={18} color="#a78bfa" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Super Admin Portal</span>
            <div style={{ marginLeft: 12 }}><NotificationBell dark /></div>
          </div>
        </div>

        <div className="sa-content" style={{ padding: isDesktop ? 24 : '16px 16px 24px' }}>
          {/* The shared page header is styled for light shells; keep it readable on this dark one */}
          <style>{`.sa-content .ph-title { color: #fff; } .sa-content .ph-crumbs { color: rgba(255,255,255,0.5); } .sa-content .ph-current { color: #a78bfa; }`}</style>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
