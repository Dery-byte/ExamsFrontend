import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Home, 
  Grid, 
  Users, 
  FileText, 
  Layout, 
  Briefcase, 
  Gift, 
  Box, 
  Sliders, 
  PieChart, 
  Cpu,
  Menu,
  Search,
  Moon,
  Bell,
  Settings,
  LogOut
} from 'lucide-react';

export default function LecturerLayout() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { to: '/lect', exact: true, icon: <Home size={20} />, title: 'Dashboard' },
    { to: '/lect/courses', icon: <Grid size={20} />, title: 'Courses' },
    { to: '/lect/quizes', icon: <FileText size={20} />, title: 'Quizzes' },
    { to: '/lect/profile', icon: <Users size={20} />, title: 'Profile' },
    { to: '/lect/add-course', icon: <Layout size={20} />, title: 'Add Course' },
    { to: '/lect/add-quizes', icon: <Briefcase size={20} />, title: 'Create Quiz' },
    // { to: '#', icon: <Gift size={20} />, title: 'Rewards' },
    // { to: '#', icon: <Box size={20} />, title: 'Components' },
    // { to: '#', icon: <Sliders size={20} />, title: 'Settings' },
    // { to: '#', icon: <PieChart size={20} />, title: 'Analytics' },
    // { to: '#', icon: <Cpu size={20} />, title: 'System' },
  ];

  return (
    <div className="minia-layout">
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* Slim Sidebar */}
      <aside className={`slim-sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
          </div>
        </div>
        <nav className="sidebar-menu">
          {navItems.map((item, i) => (
            <NavLink 
              key={i} 
              to={item.to} 
              end={item.exact} 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              title={item.title}
              onClick={() => setMobileOpen(false)}
            >
              {item.icon}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Container */}
      <div className="main-wrapper">
        {/* Top Navbar */}
        <header className="top-header">
          <div className="header-left">
            <button className="menu-btn" onClick={() => setMobileOpen(!mobileOpen)}>
              <Menu size={20} />
            </button>
            <div className="search-box">
              <input type="text" placeholder="Search..." />
              <button className="search-btn">
                <Search size={16} />
              </button>
            </div>
          </div>
          <div className="header-right">
            <div className="header-icon flag-icon">🇺🇸</div>
            <button className="header-icon"><Moon size={20} /></button>
            <button className="header-icon"><Grid size={20} /></button>
            <button className="header-icon notification">
              <Bell size={20} />
              <span className="badge">5</span>
            </button>
            <button className="header-icon"><Settings size={20} /></button>
            <div className="user-profile">
              <div className="avatar">
                {(user?.firstname?.[0] ?? 'S').toUpperCase()}
              </div>
              <span className="name">{user?.firstname || 'Shawn'} {user?.lastname?.charAt(0) || 'L'}.</span>
            </div>
            <button className="header-icon" onClick={logout} title="Logout" style={{ marginLeft: 8 }}>
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="page-content">
          <Outlet />
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        .minia-layout {
          display: flex;
          min-height: 100vh;
          background-color: #f4f4f9;
          font-family: 'Inter', sans-serif;
          color: #495057;
        }

        /* Slim Sidebar */
        .slim-sidebar {
          width: 70px;
          background: #ffffff;
          border-right: 1px solid #e9e9ef;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: fixed;
          top: 0;
          bottom: 0;
          left: 0;
          z-index: 1001;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .sidebar-logo {
          height: 70px;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo-box {
          color: #5156be;
          width: 24px;
          height: 24px;
        }

        .sidebar-menu {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 10px 0;
          gap: 8px;
          overflow-y: auto;
        }

        .sidebar-menu::-webkit-scrollbar { display: none; }

        .sidebar-item {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #74788d;
          border-radius: 8px;
          transition: all 0.2s;
          margin: 4px 0;
        }

        .sidebar-item:hover {
          color: #5156be;
          background: rgba(81, 86, 190, 0.05);
        }

        .sidebar-item.active {
          color: #ffffff;
          background: #5156be;
          box-shadow: 0 4px 10px rgba(81, 86, 190, 0.3);
        }

        /* Main Wrapper */
        .main-wrapper {
          flex: 1;
          margin-left: 70px;
          display: flex;
          flex-direction: column;
        }

        /* Header */
        .top-header {
          height: 70px;
          background: #ffffff;
          border-bottom: 1px solid #e9e9ef;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          position: sticky;
          top: 0;
          z-index: 1000;
          box-shadow: 0 0.75rem 1.5rem rgba(18, 38, 63, 0.03);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .menu-btn {
          background: transparent;
          border: none;
          color: #495057;
          cursor: pointer;
          display: flex;
          padding: 8px;
          border-radius: 50%;
          transition: background 0.2s;
        }
        
        .menu-btn:hover { background: #f3f3f9; }

        .search-box {
          display: flex;
          align-items: center;
          background: #f3f3f9;
          border-radius: 4px;
          overflow: hidden;
          height: 38px;
          width: 250px;
        }

        .search-box input {
          flex: 1;
          border: none;
          background: transparent;
          padding: 0 15px;
          font-size: 13px;
          outline: none;
          color: #495057;
        }

        .search-btn {
          background: #5156be;
          color: white;
          border: none;
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .search-btn:hover { background: #4549a2; }

        .header-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .header-icon {
          background: transparent;
          border: none;
          color: #495057;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          transition: background 0.2s;
          position: relative;
        }
        
        .header-icon:hover { background: #f3f3f9; }

        .flag-icon { font-size: 18px; }

        .notification .badge {
          position: absolute;
          top: 6px;
          right: 6px;
          background: #fd625e;
          color: white;
          font-size: 10px;
          font-weight: 600;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #fff;
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 12px;
          border-radius: 8px;
          transition: background 0.2s;
          cursor: pointer;
        }
        
        .user-profile:hover { background: #f3f3f9; }

        .avatar {
          width: 32px;
          height: 32px;
          background: #e9ecef;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          color: #5156be;
        }

        .name {
          font-size: 13px;
          font-weight: 600;
          color: #495057;
        }

        .page-content {
          padding: 24px;
          flex: 1;
        }

        .sidebar-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.4);
          z-index: 1000;
          display: none;
        }

        @media (max-width: 768px) {
          .slim-sidebar { transform: translateX(-100%); width: 70px; }
          .slim-sidebar.open { transform: translateX(0); }
          .main-wrapper { margin-left: 0; }
          .search-box { display: none; }
          .sidebar-overlay { display: block; }
          .user-profile .name { display: none; }
          .header-right { gap: 4px; }
        }
      `}</style>
    </div>
  );
}
