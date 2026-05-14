import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getRegCourses, getReportsByUser, getActiveQuizzes } from '../../api/endpoints';
import {
  BookOpen,
  ClipboardCheck,
  BarChart3,
  Settings,
  GraduationCap,
  Trophy,
  ArrowRight,
  TrendingUp,
  Clock,
  ChevronRight,
  Activity,
  Award,
  Loader2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import PageHeader from '../../components/PageHeader';

function MiniStat({ title, value, icon: Icon, color, trend, trendValue }: { title: string; value: number | string; icon: any; color: string; trend?: 'up' | 'down'; trendValue?: string }) {
  return (
    <div className="lexa-card stat-card-hover" style={{ marginBottom: 0, minWidth: 0 }}>
      <div className="lexa-card-body" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: '#74788d', textTransform: 'uppercase', fontSize: 11, fontWeight: 700, margin: '0 0 6px 0', letterSpacing: '0.07em' }}>{title}</p>
            <h4 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#2a3142', letterSpacing: '-0.01em' }}>{value}</h4>
          </div>
          <div style={{ 
            width: 48, height: 48, borderRadius: '12px', background: `rgba(${color}, 0.12)`, 
            color: `rgb(${color})`, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Icon size={24} />
          </div>
        </div>

        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          {trendValue ? (
            <>
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700,
                background: trend === 'up' ? 'rgba(40, 187, 227, 0.1)' : 'rgba(236, 69, 97, 0.1)',
                color: trend === 'up' ? 'var(--success)' : 'var(--danger)'
              }}>
                {trend === 'up' ? <TrendingUp size={12} /> : <Activity size={12} />}
                {trendValue}
              </div>
              <span style={{ fontSize: 12, color: '#adb5bd', fontWeight: 600 }}>Performance Gain</span>
            </>
          ) : (
             <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
               <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)' }}></span>
               <span style={{ fontSize: 12, color: '#adb5bd', fontWeight: 600 }}>Active Status Verified</span>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UserDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ courses: 0, quizzes: 0, points: 0, rank: 'N/A' });
  const [reports, setReports] = useState<any[]>([]);
  const [activeQuizzes, setActiveQuizzes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;
      try {
        const [reg, rpts, active] = await Promise.all([
          getRegCourses().catch(() => []),
          getReportsByUser(user.id).catch(() => []),
          getActiveQuizzes().catch(() => [])
        ]);

        const mine = (reg as any[]).filter(r => r.user?.id === user.id);
        const myCatIds = mine.map(c => c.category?.cid);

        setReports((rpts as any[]).slice(0, 5));
        setActiveQuizzes((active as any[]).filter(q => myCatIds.includes(q.category?.cid)).slice(0, 3));

        let totalPoints = 0;
        (rpts as any[]).forEach(r => {
          totalPoints += (parseFloat(r.marks || 0) + parseFloat(r.marksB || 0));
        });

        setStats({
          courses: mine.length,
          quizzes: rpts.length,
          points: Math.round(totalPoints),
          rank: totalPoints > 100 ? 'Gold' : 'Silver'
        });
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [user]);

  const chartData = reports.map(r => ({
    name: r.quiz?.title?.substring(0, 8) || 'Quiz',
    score: parseFloat(r.marks || 0) + parseFloat(r.marksB || 0)
  })).reverse();

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 10 }}>
      <PageHeader title="Candidate Dashboard" breadcrumbs={['Lexa', 'Portal', 'Overview']} />

      {/* Welcome Section */}
      <div className="lexa-card" style={{ background: 'var(--primary)', border: 'none', position: 'relative', overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }}></div>
        <div style={{ position: 'absolute', bottom: -20, right: 100, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }}></div>

        <div className="lexa-card-body" style={{ padding: '20px 25px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
            <div style={{ flex: '1 1 300px', minWidth: 0 }}>
              <h2 style={{ margin: 0, color: '#fff', fontSize: 24, fontWeight: 800 }}>Welcome back, {user?.firstname}!</h2>
              <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.8)', fontSize: 14, maxWidth: 500, lineHeight: 1.4 }}>
                You have <strong>{activeQuizzes.length} active assessments</strong> scheduled for your enrolled modules today.
              </p>
              <button
                onClick={() => navigate('/user-dashboard/quizzes')}
                style={{ marginTop: 15, background: '#fff', color: 'var(--primary)', border: 'none', padding: '8px 20px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}
                className="welcome-btn-hover"
              >
                View Assignments <ArrowRight size={18} />
              </button>
            </div>
            <div className="d-none d-md-block" style={{ textAlign: 'right' }}>
              <div style={{ width: 72, height: 72, borderRadius: '16px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GraduationCap size={36} color="#fff" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="dashboard-stats-grid">
        <MiniStat title="Enrolled Modules" value={isLoading ? '...' : stats.courses} icon={BookOpen} color="122, 111, 190" trend="up" trendValue="12.5%" />
        <MiniStat title="Tests Completed" value={isLoading ? '...' : stats.quizzes} icon={ClipboardCheck} color="40, 187, 227" trend="up" trendValue="8.2%" />
        <MiniStat title="Total Credits" value={isLoading ? '...' : stats.points} icon={Trophy} color="241, 180, 76" trend="up" trendValue="15.0%" />
        <MiniStat title="Academic Merit" value={isLoading ? '...' : stats.rank} icon={Award} color="56, 164, 248" />
      </div>

      <div className="dashboard-charts-grid">

        {/* Left Column: Chart */}
        <div className="lexa-card h-100 mb-0 d-flex flex-column" style={{ minWidth: 0 }}>
          <div className="lexa-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h5 className="lexa-card-title" style={{ margin: 0 }}>Academic Progression</h5>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#adb5bd' }}>Candidate score evolution over recent attempts</p>
            </div>
            <div style={{ display: 'flex', background: '#f8f9fa', borderRadius: 8, padding: 4 }}>
              <button className="chart-tab-btn" style={{ background: 'transparent', border: 'none', padding: '6px 15px', fontSize: 12, fontWeight: 700, color: '#adb5bd', cursor: 'pointer' }}>Weekly</button>
              <button className="chart-tab-btn active" style={{ background: '#fff', border: 'none', padding: '6px 15px', fontSize: 12, fontWeight: 800, color: 'var(--primary)', borderRadius: 6, boxShadow: '0 2px 4px rgba(0,0,0,0.05)', cursor: 'pointer' }}>Monthly</button>
            </div>
          </div>
          <div className="lexa-card-body" style={{ padding: '16px' }}>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f7" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#adb5bd', fontSize: 11, fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#adb5bd', fontSize: 11, fontWeight: 600 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(18, 38, 63, 0.12)', padding: '12px 16px' }}
                    itemStyle={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}
                    labelStyle={{ fontSize: 11, color: '#adb5bd', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  />
                  <Area type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={4} fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column: Active Assessments */}
        <div className="lexa-card h-100 mb-0 d-flex flex-column" style={{ minWidth: 0 }}>
          <div className="lexa-card-header">
            <h5 className="lexa-card-title" style={{ margin: 0 }}>Upcoming Sessions</h5>
          </div>
          <div className="lexa-card-body" style={{ padding: 0 }}>
            <div style={{ padding: '8px 0' }}>
              {isLoading ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <Loader2 className="spin-ico text-primary" size={32} />
                </div>
              ) : activeQuizzes.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#fcfdfe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px', color: '#e1e9f1' }}>
                    <Clock size={30} />
                  </div>
                  <p style={{ color: '#adb5bd', fontSize: 14, fontWeight: 600 }}>No sessions found</p>
                </div>
              ) : activeQuizzes.map((q, idx) => (
                <div key={idx} className="dashboard-item-hover" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: idx < activeQuizzes.length - 1 ? '1px solid #f1f5f7' : 'none', cursor: 'pointer' }} onClick={() => navigate(`/instructions/${q.qId}`)}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '10px', background: 'rgba(40, 187, 227, 0.08)',
                    color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Activity size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#2a3142', marginBottom: 2 }}>{q.title}</div>
                    <div style={{ fontSize: 11, color: '#adb5bd', fontWeight: 600 }}>{q.category?.courseCode} • {q.quizType}</div>
                  </div>
                  <div style={{ color: '#ced4da' }}>
                    <ChevronRight size={18} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-auto" style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f7', background: '#fcfdfe' }}>
            <Link to="/user-dashboard/quizzes" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--primary)', fontWeight: 800, fontSize: 13, textDecoration: 'none' }}>
              Explore All Sessions <ArrowRight size={16} />
            </Link>
          </div>
        </div>

      </div>

      {/* Latest Records Table */}
      <div className="lexa-card" style={{ marginBottom: 0, minWidth: 0 }}>
        <div className="lexa-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h5 className="lexa-card-title" style={{ margin: 0 }}>Recent Academic Attainments</h5>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#adb5bd' }}>Verified results from your latest examination attempts</p>
          </div>
          <button className="btn-lexa btn-lexa-primary" onClick={() => navigate('/user-dashboard/history')} style={{ borderRadius: 8 }}>
            Full Transcript
          </button>
        </div>
        <div className="lexa-card-body" style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table-lexa">
              <thead style={{ background: '#fcfdfe' }}>
                <tr>
                  <th style={{ padding: '10px 16px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assessment Title</th>
                  <th style={{ padding: '10px 16px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Course Code</th>
                  <th style={{ padding: '10px 16px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Performance</th>
                  <th style={{ padding: '10px 16px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  <th style={{ padding: '10px 16px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Verification Date</th>
                </tr>
              </thead>
              <tbody>
                {reports.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: '#adb5bd', fontWeight: 600 }}>No academic records synchronized yet.</td></tr>
                ) : reports.map((r, i) => {
                  const score = Math.round(parseFloat(r.marks || 0) + parseFloat(r.marksB || 0));
                  const max = r.quiz?.maxMarks || 100;
                  const percent = (score / max) * 100;

                  return (
                    <tr key={i} className="row-hover-lexa">
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ fontWeight: 800, color: '#2a3142', fontSize: 13 }}>{r.quiz?.title}</div>
                        <div style={{ fontSize: 10, color: '#adb5bd', fontWeight: 600 }}>Secure Examination Session</div>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span className="lexa-badge badge-soft-primary" style={{ fontWeight: 800 }}>{r.quiz?.category?.courseCode || 'GEN'}</span>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ flex: 1, height: 6, background: '#f1f5f7', borderRadius: 3, maxWidth: 100, overflow: 'hidden' }}>
                            <div style={{ width: `${percent}%`, height: '100%', background: percent > 50 ? 'var(--success)' : 'var(--danger)', borderRadius: 3 }}></div>
                          </div>
                          <span style={{ fontWeight: 800, color: '#495057', fontSize: 13 }}>{score} / {max}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span className={`lexa-badge badge-soft-${percent >= 50 ? 'success' : 'danger'}`} style={{ padding: '4px 10px', fontSize: 10, borderRadius: 4, fontWeight: 800 }}>
                          {percent >= 50 ? 'DISTINCTION' : 'REVIEW'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', color: '#adb5bd', fontSize: 11, fontWeight: 600 }}>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        .stat-card-hover { transition: border-color 0.2s ease; }
        .stat-card-hover:hover { border-color: #bbc5cf !important; }
        .welcome-btn-hover:hover { background: #f0f0f0 !important; }
        .dashboard-item-hover:hover { background: #f8fafc; }
        .row-hover-lexa:hover { background: #f8fafc; }
        .text-primary { color: var(--primary); }
        .spin-ico { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        .dashboard-charts-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          margin-bottom: 20px;
          align-items: stretch;
        }
        
        .dashboard-stats-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }

        @media (min-width: 576px) {
          .dashboard-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 992px) {
          .dashboard-charts-grid {
            grid-template-columns: 2fr 1fr;
          }
          .dashboard-stats-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        /* Dashboard mobile tweaks */
        .d-none { display: none !important; }
        .d-md-block { display: block; }
        @media (min-width: 768px) {
          .d-none.d-md-block { display: block !important; }
        }
        @media (max-width: 576px) {
          .table-sharp th, .table-sharp td { padding: 12px 12px; font-size: 13px; }
          .table-sharp th:nth-child(5), .table-sharp td:nth-child(5) { display: none; }
        }
      `}</style>
    </div>
  );
}


