import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { saGetDepartments, saGetPrograms, saGetAllHods, saGetAllStudents } from '../../api/endpoints';
import { Building2, BookMarked, UserCog, GraduationCap, ChevronRight, TrendingUp, ShieldCheck } from 'lucide-react';

const card = (accent = '#7c3aed') => ({
  background: 'rgba(255,255,255,0.03)',
  border: `1px solid rgba(139,92,246,0.15)`,
  borderRadius: 16,
  padding: '24px',
  backdropFilter: 'blur(12px)',
  cursor: 'default',
  transition: 'all 0.25s',
});

export default function SuperAdminWelcome() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ departments: 0, programs: 0, hods: 0, students: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([saGetDepartments(), saGetPrograms(), saGetAllHods(), saGetAllStudents()])
      .then(([d, p, h, s]) => {
        setStats({
          departments: Array.isArray(d) ? d.length : 0,
          programs: Array.isArray(p) ? p.length : 0,
          hods: Array.isArray(h) ? h.length : 0,
          students: Array.isArray(s) ? s.length : 0,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    { label: 'Departments', value: stats.departments, icon: <Building2 size={22} color="#fff" />, gradient: 'linear-gradient(135deg,#7c3aed,#4f46e5)', to: '/super-admin/departments' },
    { label: 'Programs', value: stats.programs, icon: <BookMarked size={22} color="#fff" />, gradient: 'linear-gradient(135deg,#0ea5e9,#2563eb)', to: '/super-admin/programs' },
    { label: 'HOD Accounts', value: stats.hods, icon: <UserCog size={22} color="#fff" />, gradient: 'linear-gradient(135deg,#10b981,#059669)', to: '/super-admin/hods' },
    { label: 'Students', value: stats.students, icon: <GraduationCap size={22} color="#fff" />, gradient: 'linear-gradient(135deg,#f59e0b,#d97706)', to: '/super-admin/student-semester' },
  ];

  const quickActions = [
    { label: 'Create Department', sub: 'Add a new faculty or school', icon: <Building2 size={18} />, to: '/super-admin/departments', color: '#7c3aed' },
    { label: 'Add Program', sub: 'Configure levels & duration', icon: <BookMarked size={18} />, to: '/super-admin/programs', color: '#0ea5e9' },
    { label: 'Register HOD', sub: 'Create Head of Department account', icon: <UserCog size={18} />, to: '/super-admin/hods', color: '#10b981' },
    { label: 'Set Semester', sub: 'Update student level & semester', icon: <GraduationCap size={18} />, to: '/super-admin/student-semester', color: '#f59e0b' },
  ];

  return (
    <div style={{ color: '#fff' }}>
      {/* Welcome header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(124,58,237,0.4)' }}>
            <ShieldCheck size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, background: 'linear-gradient(135deg,#a78bfa,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Super Admin Dashboard
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>University-wide system management overview</p>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginBottom: 32 }}>
        {statCards.map(sc => (
          <div key={sc.label} onClick={() => navigate(sc.to)}
            style={{ ...card(), cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 30px rgba(124,58,237,0.2)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: sc.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 14px rgba(0,0,0,0.3)` }}>
                {sc.icon}
              </div>
              <TrendingUp size={14} style={{ color: 'rgba(255,255,255,0.2)', marginTop: 4 }} />
            </div>
            <div style={{ fontSize: loading ? 20 : 36, fontWeight: 800, color: '#fff', marginBottom: 4, minHeight: 44, display: 'flex', alignItems: 'center' }}>
              {loading ? <div style={{ width: 60, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.08)', animation: 'pulse 1.5s infinite' }} /> : sc.value}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>{sc.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>Quick Actions</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14 }}>
        {quickActions.map(qa => (
          <div key={qa.label} onClick={() => navigate(qa.to)}
            style={{ ...card(), cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = `rgba(${qa.color === '#7c3aed' ? '124,58,237' : qa.color === '#0ea5e9' ? '14,165,233' : qa.color === '#10b981' ? '16,185,129' : '245,158,11'},0.08)`; (e.currentTarget as HTMLDivElement).style.borderColor = `${qa.color}44`; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(139,92,246,0.15)'; }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${qa.color}22`, border: `1px solid ${qa.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: qa.color, flexShrink: 0 }}>
              {qa.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#fff', marginBottom: 2 }}>{qa.label}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{qa.sub}</div>
            </div>
            <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.25)' }} />
          </div>
        ))}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );
}
