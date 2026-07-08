import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LayoutDashboard, 
  UserCircle, 
  BookOpen, 
  PlusCircle, 
  ClipboardList, 
  FilePlus, 
  Users, 
  GraduationCap, 
  LogOut, 
  Menu, 
  X, 
  ChevronRight, 
  ShieldCheck,
  Clock,
  Eye,
  BookMarked
} from 'lucide-react';

export default function AdminLayout() {
  const { user, logout, timeDisplay } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const navItems = [
    { 
      label: 'Main Dashboard', 
      items: [
        { to: '/admin', exact: true, icon: <LayoutDashboard size={20} />, label: 'Overview' },
        { to: '/admin/profile', icon: <UserCircle size={20} />, label: 'Admin Profile' },
      ]
    },
    { 
      label: 'Academic Registry', 
      items: [
        { to: '/admin/courses', icon: <BookOpen size={20} />, label: 'Courses' },
        { to: '/admin/add-course', icon: <PlusCircle size={20} />, label: 'Add Course' },
        { to: '/admin/quizzes', icon: <ClipboardList size={20} />, label: 'Quizzes' },
        { to: '/admin/add-quiz', icon: <FilePlus size={20} />, label: 'Add Quiz' },
      ]
    },
    { 
      label: 'User Management', 
      items: [
        { to: '/admin/students', icon: <GraduationCap size={20} />, label: 'Student Directory' },
        { to: '/admin/enroll-student', icon: <BookMarked size={20} />, label: 'Enroll Student' },
        { to: '/admin/lecturers', icon: <Users size={20} />, label: 'Faculty Directory' },
      ]
    },
    {
      label: 'Assessment Review',
      items: [
        { to: '/admin/quiz-review', icon: <Eye size={20} />, label: 'Quiz Review Panel' },
      ]
    },
  ];

  return (
    <div className="lexa-admin-shell">
      {/* Premium Sidebar */}
      <aside className={`lexa-sidebar ${mobileOpen ? 'mobile-active' : ''}`}>
        <div className="lexa-sidebar-header">
          <div className="lexa-brand">
            <div className="lexa-logo-box">
              <ShieldCheck size={24} />
            </div>
            <div className="lexa-brand-text">
              <span className="main">OTC</span>
              <span className="sub">ADMIN PORTAL</span>
            </div>
          </div>
          <button className="lexa-sidebar-close" onClick={() => setMobileOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <nav className="lexa-sidebar-nav">
          {navItems.map((section, idx) => (
            <div key={idx} className="lexa-nav-section">
              <h6 className="lexa-nav-label">{section.label}</h6>
              <div className="lexa-nav-group">
                {section.items.map((item, i) => (
                  <NavLink 
                    key={i} 
                    to={item.to} 
                    end={item.exact} 
                    className={({ isActive }) => `lexa-nav-link ${isActive ? 'active' : ''}`}
                  >
                    <span className="lexa-nav-icon">{item.icon}</span>
                    <span className="lexa-nav-text">{item.label}</span>
                    <ChevronRight size={14} className="lexa-nav-arrow" />
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="lexa-sidebar-footer">
          <div className="lexa-user-brief">
            <div className="lexa-avatar">
              {(user?.username?.[0] ?? user?.firstname?.[0] ?? 'A').toUpperCase()}
            </div>
            <div className="lexa-user-info">
              <span className="name">{user?.username || user?.firstname || 'Admin'}</span>
              <span className="role">Administrator</span>
            </div>
          </div>
          <button onClick={logout} className="lexa-logout-btn">
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
      {/* Main Content Area */}
      <div className="lexa-main">
        {/* Modern Top Navbar */}
        <header className={`lexa-navbar ${scrolled ? 'scrolled' : ''}`}>
          <div className="lexa-nav-left">
            <button className="lexa-menu-toggle" onClick={() => setMobileOpen(true)}>
              <Menu size={24} />
            </button>
            <div className="lexa-nav-identity">
               <ShieldCheck size={20} style={{ color: 'var(--lexa-primary)' }} />
               <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--lexa-dark)', letterSpacing: '0.05em' }}>REGISTRY MANAGEMENT CONSOLE</span>
            </div>
          </div>
          <div className="lexa-nav-right">
            {timeDisplay && (
              <div className={`lexa-status-badge ${timeDisplay.className}`} style={{ marginRight: 15 }}>
                <Clock size={14} />
                <span>{timeDisplay.display}</span>
              </div>
            )}
            <div className="lexa-profile-pill" onClick={() => navigate('/admin/profile')}>
              <div className="lexa-profile-avatar">
                <UserCircle size={20} />
              </div>
              <span className="lexa-profile-name">{user?.username || user?.firstname || 'Admin'}</span>
            </div>
          </div>
        </header>
        {/* Dynamic Page Content */}
        <main className="lexa-content-wrapper">
          <div className="lexa-page-container">
            <Outlet />
          </div>
        </main>
      </div>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div className="lexa-mobile-backdrop" onClick={() => setMobileOpen(false)} />
      )}
      <style>{`
        :root {
          --sidebar-width: 280px;
          --navbar-height: 80px;
          --lexa-primary: #626ed4;
          --lexa-dark: #2a3142;
          --lexa-bg: #f5f7fb;
          --lexa-card-shadow: 0 0.75rem 1.5rem rgba(18, 38, 63, 0.03);
          --lexa-sidebar-bg: #2a3142;
          --lexa-sidebar-item-active: rgba(255, 255, 255, 0.1);
        }
        .lexa-admin-shell {
          display: flex;
          height: 100vh;
          overflow: hidden;
          background-color: var(--lexa-bg);
          color: #495057;
        }
        .lexa-sidebar {
          width: var(--sidebar-width);
          height: 100vh;
          background: var(--lexa-sidebar-bg);
          position: fixed;
          left: 0;
          top: 0;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          transition: all 0.3s ease;
        }
        .lexa-sidebar-header {
          padding: 30px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .lexa-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .lexa-logo-box {
          width: 40px;
          height: 40px;
          background: var(--lexa-primary);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 4px 12px rgba(98, 110, 212, 0.4);
        }
        .lexa-brand-text {
          display: flex;
          flex-direction: column;
        }

        .lexa-brand-text .main {
          color: white;
          font-weight: 800;
          font-size: 18px;
          letter-spacing: 1px;
        }

        .lexa-brand-text .sub {
          color: rgba(255, 255, 255, 0.5);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .lexa-sidebar-close {
          display: none;
          background: none;
          border: none;
          color: white;
          cursor: pointer;
        }

        .lexa-sidebar-nav {
          flex: 1;
          overflow-y: auto;
          padding: 10px 15px;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .lexa-sidebar-nav::-webkit-scrollbar {
          display: none;
        }

        .lexa-nav-section {
          margin-bottom: 25px;
        }

        .lexa-nav-label {
          padding: 0 15px 12px;
          font-size: 11px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.4);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .lexa-nav-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .lexa-nav-link {
          display: flex;
          align-items: center;
          padding: 12px 15px;
          color: rgba(255, 255, 255, 0.6);
          text-decoration: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .lexa-nav-link:hover {
          color: white;
          background: rgba(255, 255, 255, 0.05);
        }

        .lexa-nav-link.active {
          color: white;
          background: var(--lexa-primary);
          box-shadow: 0 4px 12px rgba(98, 110, 212, 0.3);
        }

        .lexa-nav-icon {
          margin-right: 12px;
          display: flex;
          align-items: center;
        }

        .lexa-nav-text {
          flex: 1;
        }

        .lexa-nav-arrow {
          opacity: 0;
          transition: 0.2s;
        }

        .lexa-nav-link:hover .lexa-nav-arrow {
          opacity: 0.5;
          transform: translateX(3px);
        }

        .lexa-sidebar-footer {
          padding: 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(0, 0, 0, 0.1);
        }

        .lexa-user-brief {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }

        .lexa-avatar {
          width: 40px;
          height: 40px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
        }

        .lexa-user-info {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .lexa-user-info .name {
          color: white;
          font-weight: 600;
          font-size: 14px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .lexa-user-info .role {
          color: rgba(255, 255, 255, 0.4);
          font-size: 11px;
        }

        .lexa-logout-btn {
          width: 100%;
          padding: 12px;
          background: rgba(236, 69, 97, 0.1);
          border: 1px solid rgba(236, 69, 97, 0.2);
          border-radius: 10px;
          color: #ec4561;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          transition: 0.2s;
        }

        .lexa-logout-btn:hover {
          background: #ec4561;
          color: white;
        }

        .lexa-main {
          flex: 1;
          margin-left: var(--sidebar-width);
          height: 100vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        
        .lexa-main::-webkit-scrollbar {
          display: none;
        }

        .lexa-navbar {
          height: var(--navbar-height);
          background: white;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 30px;
          position: sticky;
          top: 0;
          z-index: 900;
          transition: all 0.3s ease;
          border-bottom: 1px solid #f1f5f7;
        }

        .lexa-navbar.scrolled {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .lexa-nav-left {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .lexa-menu-toggle {
          display: none;
          background: none;
          border: none;
          color: var(--lexa-dark);
          cursor: pointer;
        }

        .lexa-nav-identity {
           display: flex;
           align-items: center;
           gap: 12px;
        }

        .lexa-nav-right {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .lexa-status-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 18px;
          border-radius: 30px;
          font-size: 12px;
          font-weight: 800;
        }

        .lexa-status-badge.info { background: rgba(98, 110, 212, 0.08); color: var(--lexa-primary); }
        .lexa-status-badge.danger { background: rgba(236, 69, 97, 0.08); color: #ec4561; }

        .lexa-profile-pill {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 20px 8px 8px;
          background: #f8f9fa;
          border-radius: 30px;
          cursor: pointer;
          transition: 0.2s;
        }

        .lexa-profile-pill:hover {
          background: #f1f3f5;
          transform: translateY(-1px);
        }

        .lexa-profile-avatar {
          width: 34px;
          height: 34px;
          background: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--lexa-primary);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .lexa-profile-name {
          font-size: 13px;
          font-weight: 800;
          color: #2a3142;
        }

        .lexa-content-wrapper {
          padding: 30px;
          flex: 1;
        }

        .lexa-page-container {
          max-width: 1600px;
          margin: 0 auto;
          animation: fadeIn 0.4s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @media (max-width: 1024px) {
          .lexa-sidebar {
            left: calc(-1 * var(--sidebar-width));
          }
          .lexa-sidebar.mobile-active {
            left: 0;
          }
          .lexa-main {
            margin-left: 0;
          }
          .lexa-menu-toggle {
            display: flex;
          }
          .lexa-sidebar-close {
            display: block;
          }
          .lexa-navbar {
            padding: 0 20px;
          }
          .lexa-content-wrapper {
            padding: 20px 16px;
          }
          .lexa-nav-identity span {
            font-size: 13px !important;
          }
        }

        @media (max-width: 576px) {
          .lexa-navbar {
            padding: 0 12px;
            height: 60px;
          }
          .lexa-content-wrapper {
            padding: 16px 10px;
          }
          .lexa-profile-name {
            display: none;
          }
          .lexa-profile-pill {
            padding: 6px;
          }
          .lexa-status-badge {
            padding: 6px 12px;
            font-size: 11px;
          }
          .lexa-nav-identity span {
            display: none !important;
          }
        }

        .lexa-mobile-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: 950;
        }

        .modal-lexa-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(42, 49, 66, 0.6);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 20px;
        }

        .modal-lexa-container {
          background: white;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
        }

        .modal-lexa-header {
          padding: 24px 30px;
          border-bottom: 1px solid #f1f5f7;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          background: white;
          z-index: 10;
        }

        .close-btn-lexa {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          border: none;
          background: #f8f9fa;
          color: #adb5bd;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: 0.2s;
        }

        .close-btn-lexa:hover {
          background: #fee2e2;
          color: #ef4444;
        }
      `}</style>
    </div>
  );
}
