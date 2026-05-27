import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUniqueCategoriesForLecturer, getReportByQuizId, loadQuizzesForUser, getCategoriesForUser } from '../../api/endpoints';
import * as XLSX from 'xlsx';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  BarChart2, TrendingUp, Users, Database, Loader2, BookOpen,
  Download, Activity, Target, LineChart as LineChartIcon,
} from 'lucide-react';

type ChartType = 'bar' | 'line' | 'area' | 'radar';

export default function LectWelcome() {
  const [selCatId, setSelCatId]         = useState<number | null>(null);
  const [selQuizId, setSelQuizId]       = useState<number | null>(null);
  const [assocQuizzes, setAssocQuizzes] = useState<any[]>([]);
  const [reports, setReports]           = useState<any[]>([]);
  const [chartData, setChartData]       = useState<any[]>([]);
  const [courseName, setCourseName]     = useState('');
  const [quizType, setQuizType]         = useState('');
  const [avgScore, setAvgScore]         = useState(0);
  const [loadingReport, setLoadingReport] = useState(false);
  const [chartType, setChartType]       = useState<ChartType>('bar');

  const { data: cateGory = [] }  = useQuery({ queryKey: ['lectCatReport'], queryFn: getUniqueCategoriesForLecturer });
  const { data: myCourses = [] } = useQuery({ queryKey: ['lectCats'],      queryFn: getCategoriesForUser });
  const { data: myQuizzes = [] } = useQuery({ queryKey: ['myQuizzes'],     queryFn: loadQuizzesForUser });

  const selectCategory = (cid: number | null) => {
    setSelCatId(cid);
    setSelQuizId(null);
    setReports([]);
    setChartData([]);
    setCourseName('');
    setQuizType('');
    if (!cid || !cateGory) return;
    const cat = (cateGory as any[]).find(c => Number(c.cid) === Number(cid));
    if (cat) { setCourseName(cat.title); setAssocQuizzes(cat.quizTitles ?? []); }
  };

  const onQuizSelected = async (qId: number | null) => {
    setSelQuizId(qId);
    if (!qId) { setReports([]); setChartData([]); return; }
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
        thScore: parseFloat(item.marksB || 0),
      })));
    } catch { setReports([]); setChartData([]); }
    setLoadingReport(false);
  };

  const exportExcel = () => {
    const el = document.getElementById('lect-reportdata');
    if (!el) return;
    const ws = XLSX.utils.table_to_sheet(el);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    XLSX.writeFile(wb, `${courseName || 'report'}.xlsx`);
  };

  const showOBJ    = quizType === 'OBJ'    || quizType === 'BOTH';
  const showTheory = quizType === 'THEORY' || quizType === 'BOTH';
  const catOpts    = (cateGory as any[]).map((c: any) => ({ value: c.cid, label: c.title }));
  const quizOpts   = assocQuizzes.map(q => ({ value: q.qId, label: q.title }));

  const SparklineUp = () => (
    <svg width="60" height="30" viewBox="0 0 60 30" fill="none">
      <path d="M2 20 L15 15 L25 25 L35 10 L45 15 L58 5" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  const SparklineDown = () => (
    <svg width="60" height="30" viewBox="0 0 60 30" fill="none">
      <path d="M2 10 L15 15 L25 5 L35 25 L45 20 L58 25" stroke="#f43f5e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const topCards = [
    { label: 'Total Courses',  val: (myCourses as any[]).length, badge: '+12%', badgeOk: true,  spark: <SparklineUp /> },
    { label: 'Active Quizzes', val: (myQuizzes as any[]).length, badge: '+8%',  badgeOk: true,  spark: <SparklineUp /> },
    { label: 'Average Score',  val: avgScore.toFixed(1) + '%',  badge: '-2.5%', badgeOk: false, spark: <SparklineDown /> },
    { label: 'Submissions',    val: reports.length,             badge: '+15%', badgeOk: true,  spark: <SparklineUp /> },
  ];

  const chartTypeOptions: { key: ChartType; label: string; icon: JSX.Element }[] = [
    { key: 'bar',   label: 'Bar',    icon: <BarChart2 size={16} /> },
    { key: 'line',  label: 'Line',   icon: <LineChartIcon size={16} /> },
    { key: 'area',  label: 'Area',   icon: <Activity size={16} /> },
    { key: 'radar', label: 'Radar',  icon: <Target size={16} /> },
  ];

  const ACCENT = '#6366f1';
  const BLUE   = '#0ea5e9';

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 10, bottom: 10 },
    };
    const grid  = <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />;
    const xAxis = <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} dy={15} />;
    const yAxis = <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} />;
    const tip   = <Tooltip cursor={{ fill: 'rgba(99,102,241,0.04)' }} contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.12)', padding: '16px 20px' }} />;
    const leg   = <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 700 }} />;

    if (chartType === 'bar') return (
      <BarChart {...commonProps}>
        {grid}{xAxis}{yAxis}{tip}{leg}
        {showOBJ    && <Bar dataKey="objScore" name="Objective" fill={ACCENT} radius={[10,10,0,0]} barSize={42} />}
        {showTheory && <Bar dataKey="thScore"  name="Theory"    fill={BLUE}   radius={[10,10,0,0]} barSize={42} />}
        {!showOBJ && !showTheory && <Bar dataKey="score" name="Total" fill={ACCENT} radius={[10,10,0,0]} barSize={42} />}
      </BarChart>
    );

    if (chartType === 'line') return (
      <LineChart {...commonProps}>
        {grid}{xAxis}{yAxis}{tip}{leg}
        {showOBJ    && <Line type="monotone" dataKey="objScore" name="Objective" stroke={ACCENT} strokeWidth={3} dot={{ r: 5, fill: ACCENT }} activeDot={{ r: 7 }} />}
        {showTheory && <Line type="monotone" dataKey="thScore"  name="Theory"    stroke={BLUE}   strokeWidth={3} dot={{ r: 5, fill: BLUE }}   activeDot={{ r: 7 }} />}
        {!showOBJ && !showTheory && <Line type="monotone" dataKey="score" name="Total" stroke={ACCENT} strokeWidth={3} dot={{ r: 5, fill: ACCENT }} activeDot={{ r: 7 }} />}
      </LineChart>
    );

    if (chartType === 'area') return (
      <AreaChart {...commonProps}>
        {grid}{xAxis}{yAxis}{tip}{leg}
        {showOBJ    && <Area type="monotone" dataKey="objScore" name="Objective" stroke={ACCENT} fill="rgba(99,102,241,0.12)" strokeWidth={2.5} dot={{ r: 4 }} />}
        {showTheory && <Area type="monotone" dataKey="thScore"  name="Theory"    stroke={BLUE}   fill="rgba(14,165,233,0.1)"   strokeWidth={2.5} dot={{ r: 4 }} />}
        {!showOBJ && !showTheory && <Area type="monotone" dataKey="score" name="Total" stroke={ACCENT} fill="rgba(99,102,241,0.12)" strokeWidth={2.5} dot={{ r: 4 }} />}
      </AreaChart>
    );

    if (chartType === 'radar') return (
      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} />
        <PolarRadiusAxis axisLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
        {tip}{leg}
        {showOBJ    && <Radar name="Objective" dataKey="objScore" stroke={ACCENT} fill={ACCENT} fillOpacity={0.2} />}
        {showTheory && <Radar name="Theory"    dataKey="thScore"  stroke={BLUE}   fill={BLUE}   fillOpacity={0.15} />}
        {!showOBJ && !showTheory && <Radar name="Total" dataKey="score" stroke={ACCENT} fill={ACCENT} fillOpacity={0.2} />}
      </RadarChart>
    );
  };

  return (
    <div className="lect-dash">

      {/* ── Page Header ── */}
      <div className="lect-page-header">
        <h4 className="lect-page-title">Dashboard</h4>
        <div className="lect-breadcrumb">
          <span>Dashboard</span><span className="lect-sep">&gt;</span><span>Overview</span>
        </div>
      </div>

      {/* ── Metric Cards ── */}
      <div className="lect-metric-grid">
        {topCards.map((card, i) => (
          <div key={i} className="lect-mcard">
            <div className="lect-mcard-top">
              <div>
                <p className="lect-mc-label">{card.label}</p>
                <h4 className="lect-mc-val">{card.val}</h4>
              </div>
              {/* <div className="lect-sparkline">{card.spark}</div> */}
            </div>
            <div className="lect-mcard-bot">
            </div>
          </div>
        ))}
      </div>

      {/* ── Quiz Overview (Performance Analytics) ── */}
      <div className="lect-standout-container">
        {/* Header */}
        <div className="lect-standout-header">
          <div className="lect-h-identity">
            <div className="lect-h-icon-glow"><BarChart2 size={24} /></div>
            <div>
              <h4 className="lect-h-title">Quiz Overview</h4>
              <p className="lect-h-subtitle">Filter by course and assessment to view performance analytics</p>
            </div>
          </div>
          <div className="lect-h-controls">
            <div className="lect-select-wrapper">
              <select className="lect-premium-select" value={selCatId ?? ''} onChange={e => selectCategory(e.target.value ? Number(e.target.value) : null)}>
                <option value="">Filter By Course</option>
                {catOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select className="lect-premium-select" value={selQuizId ?? ''} onChange={e => onQuizSelected(e.target.value ? Number(e.target.value) : null)} disabled={!selCatId}>
                <option value="">{selCatId ? 'Select Quiz' : 'Course Pending...'}</option>
                {quizOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="lect-standout-body">
          {loadingReport ? (
            <div className="lect-loading-state">
              <Loader2 className="lect-spin-ico" size={44} />
              <h5>Loading Assessment Data...</h5>
            </div>
          ) : reports.length > 0 ? (
            <div className="lect-analytics-content">

              {/* Metric summary boxes + Export */}
              <div className="lect-metrics-dashboard">
                <div className="lect-metric-box">
                  <div className="lect-m-icon"><TrendingUp size={18} /></div>
                  <div className="lect-m-details">
                    <span className="lect-m-label">Mean Performance</span>
                    <span className="lect-m-value accent">{avgScore}%</span>
                  </div>
                </div>
                <div className="lect-metric-box">
                  <div className="lect-m-icon"><Users size={18} /></div>
                  <div className="lect-m-details">
                    <span className="lect-m-label">Total Submissions</span>
                    <span className="lect-m-value">{reports.length} Students</span>
                  </div>
                </div>
                <div className="lect-metric-box">
                  <div className="lect-m-icon"><BookOpen size={18} /></div>
                  <div className="lect-m-details">
                    <span className="lect-m-label">Course</span>
                    <span className="lect-m-value" style={{ fontSize: '15px' }}>{courseName || '—'}</span>
                  </div>
                </div>
                <div style={{ flex: 1 }} />
                <button className="lect-export-btn" onClick={exportExcel}>
                  <Download size={18} /> <span>Export Results</span>
                </button>
              </div>

              {/* Chart type toggle */}
              <div className="lect-chart-toggle-row">
                <span className="lect-toggle-label">Chart Type:</span>
                <div className="lect-chart-toggle">
                  {chartTypeOptions.map(opt => (
                    <button
                      key={opt.key}
                      className={`lect-toggle-btn${chartType === opt.key ? ' active' : ''}`}
                      onClick={() => setChartType(opt.key)}
                    >
                      {opt.icon}
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart */}
              <div className="lect-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  {renderChart() as any}
                </ResponsiveContainer>
              </div>

            </div>
          ) : (
            <div className="lect-idle-state">
              <div className="lect-idle-icon-glow"><Database size={48} /></div>
              <h3>Awaiting Selection</h3>
              <p>Choose a course and quiz above to load student performance data and charts.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Student Registry Ledger ── */}
      {reports.length > 0 && (
        <div className="lect-standout-container lect-registry-card">
          <div className="lect-standout-header">
            <div className="lect-h-identity">
              <div className="lect-h-icon-glow secondary"><Activity size={24} /></div>
              <div>
                <h4 className="lect-h-title">Student Results Ledger</h4>
                <p className="lect-h-subtitle">Complete transcript and performance identity mapping</p>
              </div>
            </div>
          </div>
          <div className="lect-table-wrapper">
            <table id="lect-reportdata" className="lect-data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  {showOBJ    && <th className="tc">Objective (A)</th>}
                  {showTheory && <th className="tc">Theory (B)</th>}
                  <th className="tr">Total Score</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((item: any, idx: number) => {
                  const total = parseFloat(item.marks || 0) + parseFloat(item.marksB || 0);
                  const pass  = total >= 50;
                  return (
                    <tr key={idx}>
                      <td>
                        <div className="lect-user-stack">
                          <div className="lect-avatar">{(item.user?.firstname?.[0] || 'U').toUpperCase()}</div>
                          <div className="lect-u-info">
                            <span className="lect-u-name">{item.user?.firstname} {item.user?.lastname}</span>
                            <span className="lect-u-id">{item.user?.username}</span>
                          </div>
                        </div>
                      </td>
                      {showOBJ    && <td className="tc"><span className="lect-p-badge">{parseFloat(item.marks || 0).toFixed(1)}</span></td>}
                      {showTheory && <td className="tc"><span className="lect-p-badge theory">{parseFloat(item.marksB || 0).toFixed(1)}</span></td>}
                      <td className="tr">
                        <div className="lect-outcome-stack">
                          <span className={`lect-o-val ${pass ? 'pass' : 'fail'}`}>{total.toFixed(1)}</span>
                          <span className="lect-o-max">/ {item.quiz?.maxMarks}</span>
                        </div>
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

        .lect-dash {
          font-family: 'Outfit', 'Inter', sans-serif;
          color: #1e293b;
          padding: 0 0 60px;
          --ap: #6366f1;
          --as: #0ea5e9;
          --tm: #1e293b;
          --tmu: #64748b;
          --cbg: #ffffff;
        }

        /* Page header */
        .lect-page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; }
        .lect-page-title  { font-size: 15px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 0.8px; color: var(--tm); }
        .lect-breadcrumb  { display: flex; gap: 8px; font-size: 13px; color: var(--tmu); font-weight: 500; }
        .lect-sep         { color: #cbd5e1; }

        /* Metric cards grid */
        .lect-metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 22px; margin-bottom: 36px; }
        .lect-mcard {
          background: #fff; border: 1px solid #e2e8f0; border-radius: 20px;
          padding: 22px; display: flex; flex-direction: column; gap: 14px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04); transition: all 0.25s;
        }
        .lect-mcard:hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(0,0,0,0.08); }
        .lect-mcard-top   { display: flex; justify-content: space-between; align-items: flex-start; }
        .lect-mc-label    { font-size: 12px; color: var(--tmu); margin: 0 0 6px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .lect-mc-val      { font-size: 26px; font-weight: 900; margin: 0; color: var(--tm); }
        .lect-sparkline   { opacity: 0.85; }
        .lect-mcard-bot   { display: flex; align-items: center; gap: 8px; }
        .lect-badge       { padding: 3px 10px; border-radius: 8px; font-size: 11px; font-weight: 800; }
        .lect-badge.ok    { background: rgba(16,185,129,0.1); color: #10b981; }
        .lect-badge.bad   { background: rgba(244,63,94,0.1);  color: #f43f5e; }
        .lect-mcard-sub   { font-size: 12px; color: var(--tmu); font-weight: 500; }

        /* Standout container */
        .lect-standout-container {
          background: var(--cbg); border-radius: 32px; border: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
          margin-bottom: 36px; overflow: hidden; transition: 0.3s;
        }
        .lect-standout-container:hover { box-shadow: 0 20px 50px rgba(0,0,0,0.07); border-color: #cbd5e1; }

        /* Standout header */
        .lect-standout-header {
          padding: 36px 48px; border-bottom: 1px solid #f1f5f9;
          display: flex; justify-content: space-between; align-items: center;
          background: linear-gradient(to right, #fff, #fafafa);
        }
        .lect-h-identity  { display: flex; align-items: center; gap: 22px; }
        .lect-h-icon-glow {
          width: 56px; height: 56px; border-radius: 18px;
          background: rgba(99,102,241,0.1); color: var(--ap);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 8px 16px rgba(99,102,241,0.15);
        }
        .lect-h-icon-glow.secondary { background: rgba(14,165,233,0.1); color: var(--as); box-shadow: 0 8px 16px rgba(14,165,233,0.15); }
        .lect-h-title     { margin: 0; font-size: 22px; font-weight: 800; color: var(--tm); letter-spacing: -0.02em; }
        .lect-h-subtitle  { margin: 4px 0 0; font-size: 14px; color: var(--tmu); font-weight: 500; }

        /* Premium selects */
        .lect-h-controls     { display: flex; align-items: center; }
        .lect-select-wrapper { display: flex; gap: 16px; }
        .lect-premium-select {
          height: 52px; padding: 0 22px; border-radius: 14px;
          border: 1.5px solid #e2e8f0; font-size: 13px; font-weight: 700;
          color: var(--tm); background: #fff; transition: 0.3s; cursor: pointer; min-width: 210px;
          font-family: 'Outfit', 'Inter', sans-serif;
        }
        .lect-premium-select:focus    { border-color: var(--ap); outline: none; box-shadow: 0 0 0 4px rgba(99,102,241,0.08); }
        .lect-premium-select:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Body */
        .lect-standout-body { padding: 48px; }

        /* Loading */
        .lect-loading-state { padding: 100px 0; text-align: center; }
        .lect-loading-state h5 { font-size: 18px; font-weight: 700; color: var(--tmu); margin-top: 20px; }
        .lect-spin-ico { animation: lect-spin 1s linear infinite; color: var(--ap); }
        @keyframes lect-spin { to { transform: rotate(360deg); } }

        /* Analytics layout */
        .lect-analytics-content { display: flex; flex-direction: column; gap: 40px; }

        /* Metric boxes row */
        .lect-metrics-dashboard { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
        .lect-metric-box {
          background: #f8fafc; padding: 18px 26px; border-radius: 20px;
          display: flex; align-items: center; gap: 16px; border: 1px solid #f1f5f9; transition: 0.2s;
        }
        .lect-metric-box:hover { background: #f1f5f9; }
        .lect-m-icon {
          width: 40px; height: 40px; border-radius: 12px; background: #fff;
          color: var(--ap); display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 10px rgba(0,0,0,0.04);
        }
        .lect-m-details { display: flex; flex-direction: column; }
        .lect-m-label   { font-size: 10px; font-weight: 800; color: var(--tmu); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 2px; }
        .lect-m-value   { font-size: 22px; font-weight: 900; color: var(--tm); }
        .lect-m-value.accent { color: var(--ap); }

        /* Export button */
        .lect-export-btn {
          height: 52px; padding: 0 28px; background: var(--tm); color: #fff;
          border: none; border-radius: 14px; font-weight: 800; font-size: 14px;
          display: flex; align-items: center; gap: 10px; cursor: pointer; transition: 0.3s;
          box-shadow: 0 10px 25px rgba(30,41,59,0.18); font-family: 'Outfit', 'Inter', sans-serif;
        }
        .lect-export-btn:hover { transform: translateY(-3px); box-shadow: 0 15px 35px rgba(30,41,59,0.28); background: #0f172a; }

        /* Chart type toggle */
        .lect-chart-toggle-row { display: flex; align-items: center; gap: 16px; }
        .lect-toggle-label     { font-size: 12px; font-weight: 800; color: var(--tmu); text-transform: uppercase; letter-spacing: 0.08em; white-space: nowrap; }
        .lect-chart-toggle     { display: flex; gap: 8px; background: #f8fafc; border-radius: 16px; padding: 6px; border: 1px solid #e2e8f0; }
        .lect-toggle-btn {
          display: flex; align-items: center; gap: 7px; padding: 8px 18px;
          border-radius: 12px; border: none; background: transparent;
          font-size: 13px; font-weight: 700; color: var(--tmu); cursor: pointer; transition: 0.2s;
          font-family: 'Outfit', 'Inter', sans-serif;
        }
        .lect-toggle-btn:hover  { background: #fff; color: var(--tm); box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
        .lect-toggle-btn.active { background: var(--ap); color: #fff; box-shadow: 0 6px 16px rgba(99,102,241,0.3); }

        /* Chart container */
        .lect-chart-container { height: 420px; }

        /* Idle state */
        .lect-idle-state { padding: 90px 0; text-align: center; }
        .lect-idle-icon-glow {
          width: 90px; height: 90px; border-radius: 30px; background: #f1f5f9;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 28px; color: #cbd5e1; box-shadow: inset 0 2px 10px rgba(0,0,0,0.02);
        }
        .lect-idle-state h3 { font-size: 24px; font-weight: 800; color: var(--tm); margin-bottom: 12px; }
        .lect-idle-state p  { font-size: 15px; color: var(--tmu); max-width: 420px; margin: 0 auto; line-height: 1.6; font-weight: 500; }

        /* Registry table */
        .lect-table-wrapper  { padding: 0; }
        .lect-data-table     { width: 100%; border-collapse: collapse; }
        .lect-data-table th  { background: #f8fafc; padding: 22px 48px; font-size: 12px; font-weight: 800; color: var(--tmu); text-transform: uppercase; letter-spacing: 0.1em; text-align: left; border-bottom: 1px solid #f1f5f9; }
        .lect-data-table td  { padding: 26px 48px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
        .lect-data-table tr:hover td { background: #fcfdfe; }
        .tc { text-align: center; }
        .tr { text-align: right; }

        .lect-user-stack { display: flex; align-items: center; gap: 18px; }
        .lect-avatar {
          width: 48px; height: 48px; border-radius: 15px;
          background: rgba(99,102,241,0.1); color: var(--ap);
          display: flex; align-items: center; justify-content: center;
          font-weight: 900; font-size: 18px; border: 1px solid rgba(99,102,241,0.1);
        }
        .lect-u-name { display: block; font-size: 15px; font-weight: 800; color: var(--tm); }
        .lect-u-id   { font-size: 12px; color: var(--tmu); font-weight: 600; }

        .lect-p-badge        { padding: 8px 18px; background: #f1f5f9; color: var(--tm); border-radius: 12px; font-weight: 800; font-size: 14px; border: 1.5px solid #e2e8f0; }
        .lect-p-badge.theory { background: rgba(14,165,233,0.06); color: var(--as); border-color: rgba(14,165,233,0.12); }

        .lect-outcome-stack { display: flex; align-items: baseline; justify-content: flex-end; gap: 6px; }
        .lect-o-val         { font-size: 24px; font-weight: 900; }
        .lect-o-val.pass    { color: #10b981; }
        .lect-o-val.fail    { color: #f43f5e; }
        .lect-o-max         { font-size: 13px; color: var(--tmu); font-weight: 700; }

        /* Responsive */
        @media (max-width: 1200px) {
          .lect-metric-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 1024px) {
          .lect-standout-header { flex-direction: column; align-items: flex-start; gap: 20px; padding: 28px; }
          .lect-select-wrapper  { flex-direction: column; width: 100%; }
          .lect-premium-select  { min-width: unset; width: 100%; }
          .lect-standout-body   { padding: 28px; }
          .lect-metrics-dashboard { flex-direction: column; align-items: stretch; }
          .lect-metric-box      { width: 100%; }
          .lect-export-btn      { width: 100%; justify-content: center; }
          .lect-chart-toggle-row { flex-direction: column; align-items: flex-start; }
          .lect-data-table th, .lect-data-table td { padding: 18px 24px; }
          .lect-chart-container { height: 320px; }
        }
        @media (max-width: 768px) {
          .lect-metric-grid { grid-template-columns: 1fr; }
          .lect-standout-header { padding: 20px; }
          .lect-standout-body   { padding: 20px; }
          .lect-h-title         { font-size: 18px; }
          .lect-chart-toggle    { flex-wrap: wrap; }
          .lect-chart-container { height: 260px; }
          .lect-data-table th, .lect-data-table td { padding: 14px 16px; font-size: 12px; }
          .lect-avatar          { width: 38px; height: 38px; font-size: 14px; }
          .lect-o-val           { font-size: 18px; }
        }
      `}</style>
    </div>
  );
}
