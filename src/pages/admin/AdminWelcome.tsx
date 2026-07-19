import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllUsers, getAdminDepartmentCategoriesAndQuizzes, getReportByQuizId, getAdminDashboardStats } from '../../api/endpoints';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import * as XLSX from 'xlsx';
import PageHeader from '../../components/PageHeader';
import { Book, Clipboard, Users, GraduationCap, Download, BarChart2, Filter, Loader2, Search, ArrowUpRight, TrendingUp, Info, Award, Calendar, Activity, ChevronRight, Zap, Target, ShieldCheck as ShieldIcon, Database, LineChart as LineChartIcon } from 'lucide-react';

type AdminChartType = 'bar' | 'line' | 'area' | 'radar';

export default function AdminWelcome() {
  const [selCatId, setSelCatId] = useState<number | null>(null);
  const [selQuizId, setSelQuizId] = useState<number | null>(null);
  const [assocQuizzes, setAssocQuizzes] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [quizType, setQuizType] = useState('');
  const [avgScore, setAvgScore] = useState(0);
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartType, setChartType] = useState<AdminChartType>('bar');

  const { data: cateGory = [] } = useQuery({ queryKey: ['adminDeptCatReport'], queryFn: getAdminDepartmentCategoriesAndQuizzes });
  const { data: dashStatsData } = useQuery({ queryKey: ['adminDashboardStats'], queryFn: getAdminDashboardStats });
  const dashStats: any = dashStatsData;

  const selectCategory = (cid: number | null) => {
    setSelCatId(cid);
    setSelQuizId(null);
    setReports([]);
    setChartData([]);
    setCourseName('');
    if (!cid || !cateGory) return;
    const cat = (cateGory as any[]).find(c => Number(c.cid) === Number(cid));
    if (cat) { setCourseName(cat.title); setAssocQuizzes(cat.quizTitles ?? []); }
  };

  const onQuizSelected = async (qId: number | null) => {
    setSelQuizId(qId);
    if (!qId) { setReports([]); return; }
    setLoadingReport(true);
    try {
      const report: any[] = await getReportByQuizId(qId);
      setReports(report);
      let tM = 0, sA = 0;
      report.forEach((item: any) => { tM += parseFloat(item.marks || 0); sA += parseFloat(item.marksB || 0); });
      setAvgScore(report.length > 0 ? parseFloat(((tM + sA) / report.length).toFixed(2)) : 0);
      if (report.length > 0) setQuizType(report[0].quiz?.quizType ?? '');
      setChartData(report.map((item: any) => ({
        name: item.user?.firstname ?? '?',
        score: parseFloat(item.marks || 0) + parseFloat(item.marksB || 0),
        objScore: parseFloat(item.marks || 0),
        thScore: parseFloat(item.marksB || 0)
      })));
    } catch { setReports([]); }
    setLoadingReport(false);
  };

  const exportExcel = () => {
    const el = document.getElementById('reportdata');
    if (!el) return;
    const ws = XLSX.utils.table_to_sheet(el);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    XLSX.writeFile(wb, `${courseName || 'report'}.xlsx`);
  };

  const showOBJ = quizType === 'OBJ' || quizType === 'BOTH';
  const showTheory = quizType === 'THEORY' || quizType === 'BOTH';
  const catOpts  = (cateGory as any[]).map(c => ({ value: c.cid, label: c.title }));
  const quizOpts = assocQuizzes.map(q => ({ value: q.qId, label: q.title }));

  const adminChartTypeOptions: { key: AdminChartType; label: string; icon: JSX.Element }[] = [
    { key: 'bar',   label: 'Bar',   icon: <BarChart2 size={15} /> },
    { key: 'line',  label: 'Line',  icon: <LineChartIcon size={15} /> },
    { key: 'area',  label: 'Area',  icon: <Activity size={15} /> },
    { key: 'radar', label: 'Radar', icon: <Target size={15} /> },
  ];

  const ACCENT = '#6366f1';
  const BLUE   = '#0ea5e9';

  const commonChartProps = {
    data: chartData,
    margin: { top: 20, right: 30, left: 10, bottom: 10 },
  };
  const sharedGrid  = <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />;
  const sharedXAxis = <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} dy={15} />;
  const sharedYAxis = <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} />;
  const sharedTip   = <Tooltip cursor={{ fill: 'rgba(99,102,241,0.04)' }} contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.12)', padding: '20px' }} />;
  const sharedLeg   = <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 700 }} />;

  const renderAdminChart = () => {
    if (chartType === 'bar') return (
      <BarChart {...commonChartProps}>
        {sharedGrid}{sharedXAxis}{sharedYAxis}{sharedTip}{sharedLeg}
        {showOBJ    && <Bar dataKey="objScore" name="Objective" fill={ACCENT} radius={[10,10,0,0]} barSize={42} />}
        {showTheory && <Bar dataKey="thScore"  name="Theory"   fill={BLUE}   radius={[10,10,0,0]} barSize={42} />}
        {!showOBJ && !showTheory && <Bar dataKey="score" name="Total" fill={ACCENT} radius={[10,10,0,0]} barSize={42} />}
      </BarChart>
    );
    if (chartType === 'line') return (
      <LineChart {...commonChartProps}>
        {sharedGrid}{sharedXAxis}{sharedYAxis}{sharedTip}{sharedLeg}
        {showOBJ    && <Line type="monotone" dataKey="objScore" name="Objective" stroke={ACCENT} strokeWidth={3} dot={{ r: 5, fill: ACCENT }} activeDot={{ r: 7 }} />}
        {showTheory && <Line type="monotone" dataKey="thScore"  name="Theory"   stroke={BLUE}   strokeWidth={3} dot={{ r: 5, fill: BLUE }}   activeDot={{ r: 7 }} />}
        {!showOBJ && !showTheory && <Line type="monotone" dataKey="score" name="Total" stroke={ACCENT} strokeWidth={3} dot={{ r: 5, fill: ACCENT }} activeDot={{ r: 7 }} />}
      </LineChart>
    );
    if (chartType === 'area') return (
      <AreaChart {...commonChartProps}>
        {sharedGrid}{sharedXAxis}{sharedYAxis}{sharedTip}{sharedLeg}
        {showOBJ    && <Area type="monotone" dataKey="objScore" name="Objective" stroke={ACCENT} fill="rgba(99,102,241,0.12)" strokeWidth={2.5} dot={{ r: 4 }} />}
        {showTheory && <Area type="monotone" dataKey="thScore"  name="Theory"   stroke={BLUE}   fill="rgba(14,165,233,0.1)"   strokeWidth={2.5} dot={{ r: 4 }} />}
        {!showOBJ && !showTheory && <Area type="monotone" dataKey="score" name="Total" stroke={ACCENT} fill="rgba(99,102,241,0.12)" strokeWidth={2.5} dot={{ r: 4 }} />}
      </AreaChart>
    );
    if (chartType === 'radar') return (
      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} />
        <PolarRadiusAxis axisLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
        {sharedTip}{sharedLeg}
        {showOBJ    && <Radar name="Objective" dataKey="objScore" stroke={ACCENT} fill={ACCENT} fillOpacity={0.2} />}
        {showTheory && <Radar name="Theory"    dataKey="thScore"  stroke={BLUE}   fill={BLUE}   fillOpacity={0.15} />}
        {!showOBJ && !showTheory && <Radar name="Total" dataKey="score" stroke={ACCENT} fill={ACCENT} fillOpacity={0.2} />}
      </RadarChart>
    );
  };


  return (
    <div className="admin-welcome-container animate-fade-in" style={{ padding: '0 0 50px', fontFamily: '"Outfit", "Inter", sans-serif' }}>
      <PageHeader title="Intelligence Hub" breadcrumbs={['Lexa', 'Admin', 'Overview']} />

      {/* Stats Row */}
      <div className="stats-grid-compact">
        {[
          { label: 'Modules', value: dashStats?.modules ?? '0', icon: <Book size={26} />, bg: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' },
          { label: 'Assessments', value: dashStats?.assessments ?? '0', icon: <Zap size={26} />, bg: 'linear-gradient(135deg, #0ea5e9 0%, #2dd4bf 100%)' },
          { label: 'Candidates', value: dashStats?.candidates ?? '0', icon: <GraduationCap size={26} />, bg: 'linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)' },
          { label: 'Personnel', value: dashStats?.personnel ?? '0', icon: <Users size={26} />, bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
        ].map((stat, i) => (
          <div key={i} className="stat-card-premium" style={{ background: stat.bg }}>
            <div className="s-icon-circle">{stat.icon}</div>
            <div className="s-info">
              <span className="s-label">{stat.label}</span>
              <h3 className="s-value">{stat.value}</h3>
            </div>
            <div className="s-glare"></div>
          </div>
        ))}
      </div>

      {/* Performance Analytics Center - Visual Standout */}
      <div className="standout-container analytics-center-card">
        <div className="standout-header">
          <div className="h-identity">
            <div className="h-icon-glow"><BarChart2 size={24} /></div>
            <div>
              <h4 className="h-title">Performance  Center</h4>
              <p className="h-subtitle">Unified performance across assessment quizzes</p>
            </div>
          </div>
          <div className="h-controls">
            <div className="h-select-wrapper">
              <select className="premium-select" value={selCatId ?? ''} onChange={e => selectCategory(e.target.value ? Number(e.target.value) : null)}>
                <option value="">Select Course Catalog</option>
                {catOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select className="premium-select" value={selQuizId ?? ''} onChange={e => onQuizSelected(e.target.value ? Number(e.target.value) : null)} disabled={!selCatId}>
                <option value="">{selCatId ? 'Select Active Quiz' : 'Select Quiz...'}</option>
                {quizOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="standout-body">
          {loadingReport ? (
            <div className="loading-state">
              <Loader2 className="spin-ico" size={44} />
              <h5>Synthesizing Data Cluster...</h5>
            </div>
          ) : reports.length > 0 ? (
            <div className="analytics-content">
              <div className="metrics-dashboard">
                <div className="metric-box">
                  <div className="m-icon"><TrendingUp size={18} /></div>
                  <div className="m-details">
                    <span className="m-label">Mean Performance</span>
                    <span className="m-value accent">{avgScore}%</span>
                  </div>
                </div>
                <div className="metric-box">
                  <div className="m-icon"><Users size={18} /></div>
                  <div className="m-details">
                    <span className="m-label">Participants</span>
                    <span className="m-value">{reports.length} Candidates</span>
                  </div>
                </div>
                <div style={{ flex: 1 }} />
                <button className="premium-export-btn" onClick={exportExcel}>
                  <Download size={18} /> <span>Export Results</span>
                </button>
              </div>

              {/* Chart type toggle */}
              <div className="admin-chart-toggle-row">
                <span className="admin-toggle-label">Chart Type:</span>
                <div className="admin-chart-toggle">
                  {adminChartTypeOptions.map(opt => (
                    <button
                      key={opt.key}
                      className={`admin-toggle-btn${chartType === opt.key ? ' active' : ''}`}
                      onClick={() => setChartType(opt.key)}
                    >
                      {opt.icon}
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="chart-container-premium">
                <ResponsiveContainer width="100%" height="100%">
                  {renderAdminChart() as any}
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="idle-state">
              <div className="idle-icon-glow"><Database size={48} /></div>
              <h3>Awaiting Selection</h3>
              <p>Select Course and Quiz to filter assessment data distribution.</p>
            </div>
          )}
        </div>
      </div>

      {/* Candidate Registry Ledger - Visual Standout */}
      {reports.length > 0 && (
        <div className="standout-container registry-ledger-card">
          <div className="standout-header">
            <div className="h-identity">
              <div className="h-icon-glow secondary"><Activity size={24} /></div>
              <div>
                <h4 className="h-title">Sudents Results Ledger</h4>
                <p className="h-subtitle">Performance identity mapping</p>
              </div>
            </div>
          </div>
          <div className="standout-table-wrapper">
            <table id="reportdata" className="premium-data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  {showOBJ && <th className="text-center">Section A (OBJ)</th>}
                  {showTheory && <th className="text-center">Section B (TH)</th>}
                  <th className="text-center">Total Score</th>
                  <th className="text-center">Max Marks</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((item: any, idx: number) => {
                  const total = parseFloat(item.marks || 0) + parseFloat(item.marksB || 0);
                  return (
                    <tr key={idx}>
                      <td>
                        <span className="u-name">{item.user?.firstname} {item.user?.lastname}</span>
                      </td>
                      <td>
                        <span className="u-id">{item.user?.username}</span>
                      </td>
                      {showOBJ && <td className="text-center"><span className="p-badge">{parseFloat(item.marks || 0).toFixed(1)}</span></td>}
                      {showTheory && <td className="text-center"><span className="p-badge theory">{parseFloat(item.marksB || 0).toFixed(1)}</span></td>}
                      <td className="text-center">
                        <span className={`o-val ${total >= 50 ? 'success' : 'critical'}`}>{total.toFixed(1)}</span>
                      </td>
                      <td className="text-center">
                        <span className="o-max-standalone">{item.quiz?.maxMarks ?? '—'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');

        .admin-welcome-container {
          --accent-primary: #6366f1;
          --accent-secondary: #0ea5e9;
          --text-main: #1e293b;
          --text-muted: #64748b;
          --card-bg: #ffffff;
          --surface-bg: #f8fafc;
        }

        .stats-grid-compact {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 25px;
          margin-bottom: 40px;
        }

        .stat-card-premium {
          border-radius: 24px;
          padding: 32px;
          display: flex;
          align-items: center;
          gap: 24px;
          color: #fff;
          position: relative;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .stat-card-premium:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 45px rgba(0,0,0,0.15);
        }

        .s-icon-circle {
          width: 64px;
          height: 64px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1;
        }

        .s-info { z-index: 1; }
        .s-label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; opacity: 0.85; margin-bottom: 4px; display: block; }
        .s-value { font-size: 38px; font-weight: 900; margin: 0; line-height: 1; }

        .s-glare {
          position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
          background: radial-gradient(circle at center, rgba(255,255,255,0.1) 0%, transparent 70%);
          pointer-events: none;
        }

        .standout-container {
          background: var(--card-bg);
          border-radius: 32px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
          margin-bottom: 40px;
          overflow: hidden;
          transition: 0.3s;
        }

        .standout-container:hover {
          box-shadow: 0 20px 50px rgba(0,0,0,0.06);
          border-color: #cbd5e1;
        }

        .standout-header {
          padding: 40px 50px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(to right, #ffffff, #fafafa);
        }

        .h-identity { display: flex; align-items: center; gap: 24px; }
        .h-icon-glow {
          width: 56px; height: 56px; border-radius: 18px; 
          background: rgba(99, 102, 241, 0.1); color: var(--accent-primary);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 8px 16px rgba(99, 102, 241, 0.15);
        }
        .h-icon-glow.secondary { background: rgba(14, 165, 233, 0.1); color: var(--accent-secondary); box-shadow: 0 8px 16px rgba(14, 165, 233, 0.15); }

        .h-title { margin: 0; font-size: 22px; font-weight: 800; color: var(--text-main); letter-spacing: -0.02em; }
        .h-subtitle { margin: 4px 0 0 0; font-size: 14px; color: var(--text-muted); font-weight: 500; }

        .h-select-wrapper { display: flex; gap: 18px; }
        .premium-select {
          height: 52px; padding: 0 24px; border-radius: 14px; border: 1.5px solid #e2e8f0; 
          font-size: 13px; font-weight: 700; color: var(--text-main); background: #fff;
          transition: 0.3s; cursor: pointer; min-width: 220px;
        }
        .premium-select:focus { border-color: var(--accent-primary); outline: none; box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.08); }

        .standout-body { padding: 50px; }

        .metrics-dashboard { display: flex; align-items: center; gap: 30px; margin-bottom: 50px; }
        .metric-box {
          background: #f8fafc; padding: 20px 30px; border-radius: 20px;
          display: flex; align-items: center; gap: 20px; border: 1px solid #f1f5f9;
        }
        .m-icon { width: 40px; height: 40px; border-radius: 12px; background: #fff; color: var(--accent-primary); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.03); }
        .m-details { display: flex; flex-direction: column; }
        .m-label { font-size: 10px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 2px; }
        .m-value { font-size: 24px; font-weight: 900; color: var(--text-main); }
        .m-value.accent { color: var(--accent-primary); }

        .premium-export-btn {
          height: 56px; padding: 0 32px; background: var(--text-main); color: #fff;
          border: none; border-radius: 16px; font-weight: 800; font-size: 14px;
          display: flex; align-items: center; gap: 12px; cursor: pointer; transition: 0.3s;
          box-shadow: 0 10px 25px rgba(30, 41, 59, 0.2);
        }
        .premium-export-btn:hover { transform: translateY(-3px); box-shadow: 0 15px 35px rgba(30, 41, 59, 0.3); background: #000; }

        /* Chart type toggle */
        .admin-chart-toggle-row { display: flex; align-items: center; gap: 16px; margin-bottom: 30px; }
        .admin-toggle-label     { font-size: 12px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; white-space: nowrap; }
        .admin-chart-toggle     { display: flex; gap: 8px; background: #f8fafc; border-radius: 16px; padding: 6px; border: 1px solid #e2e8f0; }
        .admin-toggle-btn {
          display: flex; align-items: center; gap: 7px; padding: 8px 18px;
          border-radius: 12px; border: none; background: transparent;
          font-size: 13px; font-weight: 700; color: var(--text-muted); cursor: pointer; transition: 0.2s;
          font-family: 'Outfit', 'Inter', sans-serif;
        }
        .admin-toggle-btn:hover  { background: #fff; color: var(--text-main); box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
        .admin-toggle-btn.active { background: var(--accent-primary); color: #fff; box-shadow: 0 6px 16px rgba(99,102,241,0.3); }

        .chart-container-premium { height: 450px; }

        .idle-state { padding: 100px 0; text-align: center; }
        .idle-icon-glow {
          width: 90px; height: 90px; border-radius: 30px; background: #f1f5f9;
          display: flex; align-items: center; justify-content: center; margin: 0 auto 30px;
          color: #cbd5e1; box-shadow: inset 0 2px 10px rgba(0,0,0,0.02);
        }
        .idle-state h3 { font-size: 24px; font-weight: 800; color: var(--text-main); margin-bottom: 12px; }
        .idle-state p { font-size: 15px; color: var(--text-muted); max-width: 400px; margin: 0 auto; line-height: 1.6; font-weight: 500; }

        .standout-table-wrapper { padding: 0; }
        .premium-data-table { width: 100%; border-collapse: collapse; }
        .premium-data-table th { background: #f8fafc; padding: 25px 50px; font-size: 12px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; text-align: left; border-bottom: 1px solid #f1f5f9; }
        .premium-data-table td { padding: 28px 50px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
        .premium-data-table tr:hover td { background: #fcfdfe; }

        .user-profile-stack { display: flex; align-items: center; gap: 20px; }
        .u-avatar {
          width: 48px; height: 48px; border-radius: 15px; background: rgba(99, 102, 241, 0.1);
          color: var(--accent-primary); display: flex; align-items: center; justify-content: center;
          font-weight: 900; font-size: 18px; border: 1px solid rgba(99, 102, 241, 0.1);
        }
        .u-name { display: block; font-size: 16px; font-weight: 800; color: var(--text-main); }
        .u-id { font-size: 13px; color: var(--text-muted); font-weight: 600; }

        .p-badge { padding: 10px 20px; background: #f1f5f9; color: var(--text-main); border-radius: 14px; font-weight: 800; font-size: 14px; border: 1.5px solid #e2e8f0; }
        .p-badge.theory { background: rgba(14, 165, 233, 0.05); color: var(--accent-secondary); border-color: rgba(14, 165, 233, 0.1); }

        .outcome-stack { display: flex; align-items: baseline; justify-content: flex-end; gap: 6px; }
        .o-val { font-size: 26px; font-weight: 950; }
        .o-val.success { color: #10b981; }
        .o-val.critical { color: #f43f5e; }
        .o-max { font-size: 13px; color: var(--text-muted); font-weight: 700; }
        .o-max-standalone { font-size: 20px; font-weight: 800; color: var(--text-muted); }

        .spin-ico { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Tablet */
        @media (max-width: 1024px) {
          .stats-grid-compact { grid-template-columns: repeat(2, 1fr); gap: 16px; }
          .standout-header { flex-direction: column; align-items: flex-start; gap: 20px; padding: 30px; }
          .h-select-wrapper { flex-direction: column; width: 100%; }
          .premium-select { min-width: unset; width: 100%; }
          .standout-body { padding: 30px; }
          .metrics-dashboard { flex-wrap: wrap; gap: 15px; margin-bottom: 25px; }
          .metric-box { flex: 1 1 200px; }
          .admin-chart-toggle-row { flex-direction: column; align-items: flex-start; }
          .premium-data-table th, .premium-data-table td { padding: 18px 20px; }
          .chart-container-premium { height: 320px; }
        }

        /* Mobile */
        @media (max-width: 576px) {
          .stats-grid-compact { grid-template-columns: 1fr; gap: 12px; }
          .stat-card-premium { padding: 20px; gap: 16px; }
          .s-value { font-size: 28px; }
          .s-icon-circle { width: 48px; height: 48px; }
          .standout-header { padding: 20px; }
          .standout-body { padding: 20px; }
          .h-title { font-size: 18px; }
          .metrics-dashboard { flex-direction: column; }
          .metric-box { width: 100%; }
          .admin-chart-toggle { flex-wrap: wrap; }
          .premium-export-btn { width: 100%; justify-content: center; height: 48px; padding: 0 20px; font-size: 13px; }
          .chart-container-premium { height: 250px; }
          .premium-data-table th, .premium-data-table td { padding: 12px 15px; font-size: 12px; }
          .u-avatar { width: 36px; height: 36px; font-size: 14px; }
          .user-profile-stack { gap: 12px; }
          .o-val { font-size: 20px; }
        }
      `}</style>
    </div>
  );
}
