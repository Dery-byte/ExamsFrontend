import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useInstitution } from '../../hooks/useInstitution';
import NotificationBell from '../NotificationBell';
import AvatarPhoto from '../common/AvatarPhoto';
import SubscriptionNotice from '../common/SubscriptionNotice';
import { BellRing, BookOpen, CalendarRange, Package, ChevronRight, Clock, FileBarChart, Gift, LayoutDashboard, Landmark, LogOut, Megaphone, Menu, PiggyBank, ShoppingBag, SlidersHorizontal, UserCircle, UserRound, Wallet } from 'lucide-react';

const DESKTOP_QUERY = '(min-width: 1024px)';

/** The accounts office (bursar or cashier): the same dark shell as the Super Admin's, so the fee screens look the same. */
export default function AccountantLayout() {
  const { user, logout, timeDisplay } = useAuth();
  const { institution } = useInstitution();
  const bursar = user?.financeDuty === 'BURSAR';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches);
  const location = useLocation();

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
      label: 'Accounts office',
      items: [
        { to: '/accounts', exact: true, icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
        { to: '/accounts/fees', icon: <Wallet size={20} />, label: 'Fees & Payments' },
        { to: '/accounts/bills', icon: <ShoppingBag size={20} />, label: 'Bills' },
        { to: '/accounts/students', icon: <UserRound size={20} />, label: 'Student accounts' },
        { to: '/accounts/cash-book', icon: <BookOpen size={20} />, label: 'Cash book' },
        { to: '/accounts/stores', icon: <Package size={20} />, label: 'Stores' },
        { to: '/accounts/reminders', icon: <BellRing size={20} />, label: 'Reminders' },
        { to: '/accounts/concessions', icon: <Gift size={20} />, label: 'Concessions' },
        { to: '/accounts/wallets', icon: <PiggyBank size={20} />, label: 'Student wallets' },
        { to: '/accounts/year-end', icon: <CalendarRange size={20} />, label: 'Year end' },
        { to: '/accounts/reports', icon: <FileBarChart size={20} />, label: 'Reports' },
        ...(bursar ? [{ to: '/accounts/settings', icon: <SlidersHorizontal size={20} />, label: 'Fee settings' }] : []),
      ],
    },
    {
      label: 'Me',
      items: [
        { to: '/accounts/announcements', icon: <Megaphone size={20} />, label: 'Announcements' },
        { to: '/accounts/profile', icon: <UserCircle size={20} />, label: 'My Profile' },
      ],
    },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary, #0f0f1a)', fontFamily: 'Inter, sans-serif' }}>
      <aside style={{
        width: 260, background: 'var(--sidebar-bg)', borderRight: '1px solid rgba(var(--accent-rgb), 0.15)',
        display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: mobileOpen ? 0 : -280, bottom: 0, zIndex: 1000,
        transition: 'left 0.3s ease', ...(isDesktop ? { left: 0 } : {}),
      }}>
        <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid rgba(var(--accent-rgb), 0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,var(--accent),var(--brand))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(var(--accent-rgb), 0.4)' }}>
              <Landmark size={20} color="var(--brand-contrast)" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--sidebar-fg)' }}>Accounts Office</div>
              <div style={{ fontSize: 11, color: 'rgba(var(--sidebar-fg-rgb), 0.6)' }} title={institution.name}>{institution.shortName}</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 12px' }}>
          {navItems.map(group => (
            <div key={group.label} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(var(--sidebar-fg-rgb), 0.45)', textTransform: 'uppercase', letterSpacing: 1.2, padding: '0 8px 8px' }}>
                {group.label}
              </div>
              {group.items.map(item => (
                <NavLink key={item.to} to={item.to} end={item.exact}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, marginBottom: 3,
                    textDecoration: 'none', fontSize: 13, fontWeight: 500, transition: 'all 0.2s',
                    background: isActive ? 'linear-gradient(135deg,rgba(var(--accent-rgb), 0.25),rgba(var(--brand-rgb), 0.15))' : 'transparent',
                    color: isActive ? 'var(--sidebar-fg)' : 'rgba(var(--sidebar-fg-rgb), 0.65)',
                    border: isActive ? '1px solid rgba(var(--accent-rgb), 0.3)' : '1px solid transparent',
                  })}>
                  {item.icon}
                  <span style={{ flex: 1 }}>{item.label}</span>
                  <ChevronRight size={14} style={{ opacity: 0.4 }} />
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(var(--accent-rgb), 0.15)' }}>
          {timeDisplay && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: timeDisplay.className === 'danger' ? 'rgba(239,68,68,0.1)' : 'rgba(var(--accent-rgb), 0.08)',
              border: `1px solid ${timeDisplay.className === 'danger' ? 'rgba(239,68,68,0.3)' : 'rgba(var(--accent-rgb), 0.2)'}`,
              borderRadius: 8, padding: '6px 10px', marginBottom: 10,
            }}>
              <Clock size={13} color={timeDisplay.className === 'danger' ? '#ef4444' : 'var(--sidebar-fg)'} />
              <span style={{ fontSize: 12, color: timeDisplay.className === 'danger' ? '#ef4444' : 'var(--sidebar-fg)', fontWeight: 600 }}>{timeDisplay.display}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,var(--accent),var(--brand))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--brand-contrast)', flexShrink: 0 }}>
              <AvatarPhoto src={user?.profilePicture}>{user?.firstname?.[0]?.toUpperCase() || 'A'}</AvatarPhoto>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--sidebar-fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.firstname} {user?.lastname}</div>
              <div style={{ fontSize: 10, color: 'rgba(var(--sidebar-fg-rgb), 0.55)' }}>{bursar ? 'Bursar' : 'Cashier'}</div>
            </div>
          </div>
          <button onClick={() => logout()} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8,
            border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#f87171', cursor: 'pointer', fontSize: 13, fontWeight: 500,
          }}>
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </aside>

      {mobileOpen && <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999 }} />}

      {/* minWidth 0: wide tables scroll inside their cards instead of stretching the page */}
      <main style={{ flex: 1, minWidth: 0, marginLeft: isDesktop ? 260 : 0, minHeight: '100vh' }}>
        <div style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: scrolled ? 'rgba(15,15,26,0.95)' : 'transparent', backdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(var(--accent-rgb), 0.1)' : '1px solid transparent',
          padding: isDesktop ? '12px 24px' : '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.3s',
        }}>
          <button onClick={() => setMobileOpen(true)} aria-label="Open menu" style={{
            display: isDesktop ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(var(--accent-rgb), 0.1)', border: '1px solid rgba(var(--accent-rgb), 0.2)', borderRadius: 8, padding: 8, cursor: 'pointer', color: 'var(--accent-light)',
          }}>
            <Menu size={20} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Landmark size={18} color="var(--accent-light)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Accounts Office</span>
            <div style={{ marginLeft: 12 }}><NotificationBell dark /></div>
          </div>
        </div>

        <div className="sa-content" style={{ padding: isDesktop ? 24 : '16px 16px 24px' }}>
          {/* The shared page header is styled for light shells; keep it readable on this dark one */}
          <style>{`.sa-content .ph-title { color: #fff; } .sa-content .ph-crumbs { color: rgba(255,255,255,0.5); } .sa-content .ph-current { color: var(--accent-light); }`}</style>
          <SubscriptionNotice dark />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
