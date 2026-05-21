import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LayoutDashboard, 
  GraduationCap, 
  BookOpen, 
  ClipboardCheck, 
  History, 
  User, 
  LogOut, 
  Menu, 
  X,
  Clock,
  Bell
} from 'lucide-react';

const SIDEBAR_W = 260;

function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { logout } = useAuth();

  const menuGroups = [
    {
      title: 'Main',
      items: [
        { to: '/user-dashboard/user-dashboard', label: 'Dashboard',       icon: LayoutDashboard },
        { to: '/user-dashboard/register',        label: 'Register Course',  icon: GraduationCap   },
        { to: '/user-dashboard/courses',         label: 'My Courses',   icon: BookOpen         },
      ]
    },
    {
      title: 'Academic Performance',
      items: [
        { to: '/user-dashboard/quizzes', label: 'Assessments',        icon: ClipboardCheck },
        { to: '/user-dashboard/history', label: 'Performance History', icon: History        },
      ]
    },
    {
      title: 'Account',
      items: [
        { to: '/user-dashboard/profile', label: 'Profile', icon: User },
      ]
    }
  ];

  return (
    <aside
      className="user-sidebar"
      style={{
        transform: isOpen ? 'translateX(0)' : undefined,
      }}
    >
      {/* Brand */}
      <div className="user-sidebar-brand">
        <div className="user-sidebar-logo">O</div>
        <span className="user-sidebar-name">OTC</span>
        {/* Close button — visible on mobile only */}
        <button className="user-sidebar-close mobile-show" onClick={onClose} aria-label="Close menu">
          <X size={20} />
        </button>
      </div>

      {/* Nav */}
      <div className="user-sidebar-scroll">
        {menuGroups.map((group, gIdx) => (
          <div key={gIdx} className="user-sidebar-group">
            <div className="user-sidebar-group-label">{group.title}</div>
            <nav>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `user-sidebar-link${isActive ? ' active' : ''}`
                  }
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
      </div>

      {/* Logout */}
      <div className="user-sidebar-footer">
        <button onClick={logout} className="user-sidebar-logout">
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}

export default function UserLayout() {
  const { user, timeDisplay } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="user-shell">
      {/* Sidebar */}
      <Sidebar isOpen={mobileOpen} onClose={closeMobile} />

      {/* Overlay for mobile */}
      {mobileOpen && (
        <div
          className="user-overlay"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* Main column */}
      <div className="user-main-col">

        {/* ── Top Navbar ── */}
        <header className="user-topbar">
          {/* Left: hamburger (mobile) */}
          <div className="user-topbar-left">
            <button
              className="user-hamburger mobile-show"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>

            {/* Page brand visible on mobile when sidebar is closed */}
            <span className="user-topbar-brand mobile-show">
              <span className="user-sidebar-logo sm">O</span>
              <span style={{ fontWeight: 800, fontSize: 16, color: '#2a3142', marginLeft: 8 }}>OTC</span>
            </span>
          </div>

          {/* Right: timer + user info */}
          <div className="user-topbar-right">
            {timeDisplay && (
              <div className="user-timer">
                <Clock size={15} />
                <span>{timeDisplay.display}</span>
              </div>
            )}

            <button className="user-topbar-icon-btn desktop-show" aria-label="Notifications">
              <Bell size={20} />
              <span className="user-notif-dot" />
            </button>

            <div className="user-topbar-profile">
              <div className="user-topbar-profile-text desktop-show">
                <div className="user-topbar-name">{user?.username || user?.firstname || 'Student'}</div>
                {/* <div className="user-topbar-role">Verified Student</div> */}
              </div>
              <div className="user-avatar" aria-label="User avatar">
                {(user?.username?.[0] ?? user?.firstname?.[0] ?? 'U').toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* ── Page Content ── */}
        <main className="user-page-content">
          <Outlet />
        </main>

        {/* ── Footer ── */}
        <footer className="user-footer">
          <span>2026 © OTC.</span>
          <span className="desktop-show">Crafted with <span style={{ color: 'var(--danger)' }}>♥</span> by OTC</span>
        </footer>
      </div>

      <style>{`
        /* ─── Shell ─────────────────────────────────────────── */
        .user-shell {
          display: flex;
          min-height: 100vh;
          background: #f0f2f5;
          font-family: 'Inter', sans-serif;
        }

        /* ─── Sidebar ────────────────────────────────────────── */
        .user-sidebar {
          width: ${SIDEBAR_W}px;
          height: 100vh;
          position: fixed;
          left: 0; top: 0;
          z-index: 200;
          background: #2a3142;
          color: #8699ad;
          display: flex;
          flex-direction: column;
          transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
          /* always visible on desktop */
        }

        .user-sidebar-brand {
          height: 70px;
          display: flex;
          align-items: center;
          padding: 0 20px;
          background: #2e3548;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          flex-shrink: 0;
          gap: 10px;
        }

        .user-sidebar-logo {
          width: 32px; height: 32px; flex-shrink: 0;
          background: var(--primary);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-weight: 900; font-size: 18px;
        }
        .user-sidebar-logo.sm {
          width: 28px; height: 28px; font-size: 15px; border-radius: 6px;
        }

        .user-sidebar-name {
          font-size: 20px; font-weight: 800;
          color: #fff; letter-spacing: 1px;
          flex: 1;
        }

        .user-sidebar-close {
          background: none; border: none;
          color: #8699ad; cursor: pointer;
          padding: 6px; border-radius: 6px;
          margin-left: auto;
          transition: color 0.2s;
        }
        .user-sidebar-close:hover { color: #fff; }

        .user-sidebar-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 20px 0;
        }
        .user-sidebar-scroll::-webkit-scrollbar { width: 4px; }
        .user-sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 4px; }

        .user-sidebar-group { margin-bottom: 20px; }

        .user-sidebar-group-label {
          padding: 0 24px 10px;
          font-size: 10px; font-weight: 800;
          text-transform: uppercase; letter-spacing: 0.1em;
          color: #4d5a6a;
        }

        .user-sidebar-link {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 24px;
          font-size: 14px;
          color: #8699ad;
          text-decoration: none;
          font-weight: 500;
          border-left: 3px solid transparent;
          transition: all 0.2s;
        }
        .user-sidebar-link:hover {
          color: #fff;
          background: rgba(255,255,255,0.04);
        }
        .user-sidebar-link.active {
          color: #fff;
          background: rgba(255,255,255,0.04);
          border-left-color: var(--primary);
          font-weight: 700;
        }

        .user-sidebar-footer {
          padding: 16px 20px;
          border-top: 1px solid rgba(255,255,255,0.05);
          background: rgba(0,0,0,0.08);
          flex-shrink: 0;
        }

        .user-sidebar-logout {
          display: flex; align-items: center; gap: 12px;
          width: 100%; padding: 11px 14px;
          border-radius: 8px; border: none;
          background: rgba(236,69,97,0.1);
          color: var(--danger);
          font-size: 13px; font-weight: 700;
          cursor: pointer; transition: all 0.2s;
        }
        .user-sidebar-logout:hover {
          background: var(--danger); color: #fff;
        }

        /* ─── Main column ────────────────────────────────────── */
        .user-main-col {
          flex: 1;
          margin-left: ${SIDEBAR_W}px;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          min-width: 0;
          transition: margin-left 0.28s;
        }

        /* ─── Top bar ────────────────────────────────────────── */
        .user-topbar {
          height: 70px;
          background: #fff;
          border-bottom: 1px solid #dde2e8;
          display: flex; align-items: center;
          justify-content: space-between;
          position: sticky; top: 0; z-index: 100;
          padding: 0 40px 0 48px;
          box-sizing: border-box;
          flex-shrink: 0;
        }

        .user-topbar-left {
          display: flex; align-items: center; gap: 12px;
        }

        .user-topbar-right {
          display: flex; align-items: center; gap: 16px;
        }

        .user-hamburger {
          background: #f4f6f9;
          border: none;
          border-radius: 8px;
          padding: 9px;
          color: #74788d;
          cursor: pointer;
          flex-shrink: 0;
        }

        .user-timer {
          display: flex; align-items: center; gap: 8px;
          padding: 7px 16px;
          border-radius: 8px;
          background: rgba(122,111,190,0.08);
          border: 1px solid rgba(122,111,190,0.15);
          color: var(--primary);
          font-size: 13px; font-weight: 700;
          white-space: nowrap;
        }

        .user-topbar-icon-btn {
          position: relative;
          background: #f4f6f9; border: none;
          border-radius: 8px; padding: 9px;
          color: #74788d; cursor: pointer;
        }

        .user-notif-dot {
          position: absolute; top: 8px; right: 8px;
          width: 7px; height: 7px;
          background: var(--danger);
          border-radius: 50%;
          border: 2px solid #fff;
        }

        .user-topbar-profile {
          display: flex; align-items: center; gap: 12px;
          padding-left: 20px;
          border-left: 1.5px solid #dde2e8;
        }

        .user-topbar-profile-text { text-align: right; }
        .user-topbar-name { font-size: 14px; font-weight: 800; color: #2a3142; }
        .user-topbar-role { font-size: 11px; color: #adb5bd; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }

        .user-avatar {
          width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
          background: linear-gradient(135deg, var(--primary), #8e84cc);
          display: flex; align-items: center; justify-content: center;
          font-size: 15px; font-weight: 900; color: #fff;
        }

        /* ─── Page content ───────────────────────────────────── */
        .user-page-content {
          flex: 1;
          padding: 32px 40px 32px 48px;
          max-width: 1600px;
          width: 100%;
          margin: 0 auto;
          box-sizing: border-box;
        }

        /* ─── Footer ─────────────────────────────────────────── */
        .user-footer {
          background: #fff;
          border-top: 1px solid #dde2e8;
          display: flex; justify-content: space-between; align-items: center;
          padding: 14px 40px 14px 48px;
          font-size: 13px; color: #74788d; font-weight: 600;
          box-sizing: border-box;
          flex-shrink: 0;
        }

        /* ─── Overlay ────────────────────────────────────────── */
        .user-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.45);
          z-index: 199;
        }

        /* ─── Visibility helpers ─────────────────────────────── */
        .mobile-show  { display: none !important; }
        .desktop-show { display: flex !important; }

        /* ─── Tablet breakpoint (≤ 992px) ───────────────────── */
        @media (max-width: 992px) {
          /* Sidebar slides off-screen */
          .user-sidebar { transform: translateX(-${SIDEBAR_W}px); }

          /* Main column full-width */
          .user-main-col { margin-left: 0 !important; }

          /* Show hamburger + mobile brand, hide desktop extras */
          .mobile-show  { display: flex !important; }
          .desktop-show { display: none !important; }

          .user-topbar {
            padding: 0 16px;
          }
          .user-page-content {
            padding: 24px 16px;
          }
          .user-footer {
            padding: 12px 16px;
          }

          /* Timer shrinks */
          .user-timer {
            padding: 6px 10px;
            font-size: 12px;
          }
        }

        /* ─── Mobile breakpoint (≤ 576px) ───────────────────── */
        @media (max-width: 576px) {
          .user-topbar {
            padding: 0 12px;
            height: 60px;
          }
          .user-page-content {
            padding: 16px 12px;
          }
          .user-footer {
            padding: 10px 12px;
            font-size: 12px;
          }
          /* Hide timer on very small screens */
          .user-timer { display: none !important; }
        }
      `}</style>
    </div>
  );
}
