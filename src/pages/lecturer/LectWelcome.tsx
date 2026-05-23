import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUniqueCategoriesForLecturer, getReportByQuizId, loadQuizzesForUser, getCategoriesForUser } from '../../api/endpoints';
import * as XLSX from 'xlsx';
import { BarChart2, TrendingUp, Users, Database, Loader2, BookOpen } from 'lucide-react';

export default function LectWelcome() {
  const [selCatId, setSelCatId]           = useState<number|null>(null);
  const [selQuizId, setSelQuizId]         = useState<number|null>(null);
  const [assocQuizzes, setAssocQuizzes]   = useState<any[]>([]);
  const [reports, setReports]             = useState<any[]>([]);
  const [courseName, setCourseName]       = useState('');
  const [avgScore, setAvgScore]           = useState(0);

  const { data: cateGory = [] } = useQuery({ queryKey: ['lectCatReport'], queryFn: getUniqueCategoriesForLecturer });
  const { data: myCourses = [] } = useQuery({ queryKey: ['lectCats'], queryFn: getCategoriesForUser });
  const { data: myQuizzes = [] } = useQuery({ queryKey: ['myQuizzes'], queryFn: loadQuizzesForUser });
const [chartData, setChartData] = useState(null); // or whatever type fits
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
    try {
      const report: any[] = await getReportByQuizId(qId);
      setReports(report);
      let tM = 0, sA = 0;
      report.forEach((item: any) => { tM += parseFloat(item.marks||0); sA += parseFloat(item.marksB||0); });
      setAvgScore(report.length > 0 ? parseFloat(((tM+sA)/report.length).toFixed(2)) : 0);
    } catch { setReports([]); }
  };

  const catOpts    = (cateGory as any[]).map((c: any) => ({ value: c.cid, label: c.title }));
  const quizOpts   = assocQuizzes.map(q => ({ value: q.qId, label: q.title }));

  const SparklineUp = () => (
    <svg width="60" height="30" viewBox="0 0 60 30" fill="none">
      <path d="M2 20 L15 15 L25 25 L35 10 L45 15 L58 5" stroke="#5156be" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const SparklineDown = () => (
    <svg width="60" height="30" viewBox="0 0 60 30" fill="none">
      <path d="M2 10 L15 15 L25 5 L35 25 L45 20 L58 25" stroke="#5156be" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const topCards = [
    { label: 'Total Courses', val: (myCourses as any[]).length, badge: '+12%', badgeColor: 'bg-soft-success text-success', spark: <SparklineUp /> },
    { label: 'Active Quizzes', val: (myQuizzes as any[]).length, badge: '+8%', badgeColor: 'bg-soft-success text-success', spark: <SparklineUp /> },
    { label: 'Average Score', val: avgScore.toFixed(1) + '%', badge: '-2.5%', badgeColor: 'bg-soft-danger text-danger', spark: <SparklineDown /> },
    { label: 'Total Quizzes', val: reports.length, badge: '+15%', badgeColor: 'bg-soft-success text-success', spark: <SparklineUp /> },
  ];

  return (
    <div className="minia-dashboard">
      <div className="page-header">
        <h4 className="page-title">Dashboard</h4>
        <div className="breadcrumb">
          <span>Dashboard</span>
          <span className="separator">&gt;</span>
          <span>Dashboard</span>
        </div>
      </div>

      <div className="dashboard-grid">
        {topCards.map((card, i) => (
          <div key={i} className="minia-card metric-card">
            <div className="card-top-row">
              <div className="metric-info">
                <p className="metric-label">{card.label}</p>
                <h4 className="metric-val">{card.val}</h4>
              </div>
              <div className="sparkline">
                {card.spark}
              </div>
            </div>
            <div className="card-bottom-row">
              <span className={`metric-badge ${card.badgeColor}`}>{card.badge}</span>
              <span className="metric-subtext">Since last week</span>
            </div>
          </div>
        ))}
      </div>

      <div className="lect-standout-container">
        {/* Header */}
        <div className="lect-standout-header">
          <div className="lect-h-identity">
            <div className="lect-h-icon-glow">
              <BarChart2 size={24} />
            </div>
            <div>
              <h4 className="lect-h-title">Quiz Overview</h4>
              <p className="lect-h-subtitle">Filter by course and assessment to view performance data</p>
            </div>
          </div>
          <div className="lect-h-controls">
            <div className="lect-select-wrapper">
              <select
                className="lect-premium-select"
                value={selCatId ?? ''}
                onChange={e => selectCategory(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Filter By Course</option>
                {catOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select
                className="lect-premium-select"
                value={selQuizId ?? ''}
                onChange={e => onQuizSelected(e.target.value ? Number(e.target.value) : null)}
                disabled={!selCatId}
              >
                <option value="">{selCatId ? 'Select Quiz' : 'Course Pending...'}</option>
                {quizOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="lect-standout-body">
          {reports.length > 0 ? (
            <div className="lect-analytics-content">
              {/* Metric boxes */}
              <div className="lect-metrics-dashboard">
                <div className="lect-metric-box">
                  <div className="lect-m-icon"><TrendingUp size={18} /></div>
                  <div className="lect-m-details">
                    <span className="lect-m-label">Average Score</span>
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
                    <span className="lect-m-label">Selected Course</span>
                    <span className="lect-m-value" style={{ fontSize: '16px' }}>{courseName || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Radial gauge */}
              <div className="lect-gauge-wrap">
                <svg width="200" height="200" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#f1f5f9" strokeWidth="10"
                    strokeDasharray="180 300" strokeDashoffset="180" strokeLinecap="round"
                    transform="rotate(135 60 60)" />
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#6366f1" strokeWidth="10"
                    strokeDasharray={`${Math.min(avgScore / 100 * 180, 180)} 300`}
                    strokeDashoffset="180" strokeLinecap="round"
                    transform="rotate(135 60 60)" />
                  <text x="60" y="56" textAnchor="middle" fontSize="18" fontWeight="800" fill="#1e293b">
                    {avgScore.toFixed(1)}%
                  </text>
                  <text x="60" y="72" textAnchor="middle" fontSize="8" fontWeight="600" fill="#64748b">
                    AVG SCORE
                  </text>
                </svg>
                <p className="lect-gauge-label">{reports.length} record{reports.length !== 1 ? 's' : ''} loaded</p>
              </div>
            </div>
          ) : (
            <div className="lect-idle-state">
              <div className="lect-idle-icon-glow"><Database size={48} /></div>
              <h3>Awaiting Selection</h3>
              <p>Choose a course and quiz above to load student performance data.</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');

        .minia-dashboard {
          font-family: 'Outfit', 'Inter', sans-serif;
          color: #495057;
          --accent-primary: #6366f1;
          --accent-secondary: #0ea5e9;
          --text-main: #1e293b;
          --text-muted: #64748b;
          --card-bg: #ffffff;
          --surface-bg: #f8fafc;
        }

        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .page-title { font-size: 15px; font-weight: 700; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
        .breadcrumb { display: flex; gap: 8px; font-size: 13px; color: #74788d; font-weight: 500; }
        .separator { color: #ced4da; }

        .dashboard-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin-bottom: 32px; }

        .minia-card { background: #ffffff; border: 1px solid #e9e9ef; border-radius: 4px; box-shadow: 0 0.75rem 1.5rem rgba(18, 38, 63, 0.03); transition: transform 0.2s; }
        .minia-card:hover { transform: translateY(-2px); }

        .metric-card { padding: 20px; display: flex; flex-direction: column; gap: 15px; }
        .card-top-row { display: flex; justify-content: space-between; align-items: flex-start; }
        .metric-label { font-size: 13px; color: #74788d; margin: 0 0 8px 0; font-weight: 500; }
        .metric-val { font-size: 22px; font-weight: 700; margin: 0; color: #495057; }
        .card-bottom-row { display: flex; align-items: center; gap: 8px; margin-top: 5px; }

        .metric-badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
        .bg-soft-success { background-color: rgba(42, 181, 125, 0.1); color: #2ab57d; }
        .bg-soft-danger { background-color: rgba(253, 98, 94, 0.1); color: #fd625e; }
        .metric-subtext { font-size: 12px; color: #74788d; font-weight: 400; }

        /* ── Quiz Overview Premium Card ── */
        .lect-standout-container {
          background: var(--card-bg);
          border-radius: 32px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
          margin-bottom: 40px;
          overflow: hidden;
          transition: 0.3s;
        }
        .lect-standout-container:hover {
          box-shadow: 0 20px 50px rgba(0,0,0,0.06);
          border-color: #cbd5e1;
        }

        .lect-standout-header {
          padding: 36px 48px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(to right, #ffffff, #fafafa);
        }

        .lect-h-identity { display: flex; align-items: center; gap: 22px; }
        .lect-h-icon-glow {
          width: 56px; height: 56px; border-radius: 18px;
          background: rgba(99, 102, 241, 0.1); color: var(--accent-primary);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 8px 16px rgba(99, 102, 241, 0.15);
        }
        .lect-h-title { margin: 0; font-size: 22px; font-weight: 800; color: var(--text-main); letter-spacing: -0.02em; }
        .lect-h-subtitle { margin: 4px 0 0 0; font-size: 14px; color: var(--text-muted); font-weight: 500; }

        .lect-h-controls { display: flex; align-items: center; }
        .lect-select-wrapper { display: flex; gap: 16px; }
        .lect-premium-select {
          height: 52px; padding: 0 22px; border-radius: 14px;
          border: 1.5px solid #e2e8f0; font-size: 13px; font-weight: 700;
          color: var(--text-main); background: #fff;
          transition: 0.3s; cursor: pointer; min-width: 210px;
          font-family: 'Outfit', 'Inter', sans-serif;
        }
        .lect-premium-select:focus { border-color: var(--accent-primary); outline: none; box-shadow: 0 0 0 4px rgba(99,102,241,0.08); }
        .lect-premium-select:disabled { opacity: 0.45; cursor: not-allowed; }

        .lect-standout-body { padding: 48px; }

        /* Metrics row */
        .lect-analytics-content { display: flex; flex-direction: column; gap: 48px; }
        .lect-metrics-dashboard { display: flex; align-items: center; gap: 28px; }
        .lect-metric-box {
          background: #f8fafc; padding: 20px 28px; border-radius: 20px;
          display: flex; align-items: center; gap: 18px; border: 1px solid #f1f5f9;
          transition: 0.2s;
        }
        .lect-metric-box:hover { background: #f1f5f9; }
        .lect-m-icon {
          width: 40px; height: 40px; border-radius: 12px; background: #fff;
          color: var(--accent-primary); display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 10px rgba(0,0,0,0.04);
        }
        .lect-m-details { display: flex; flex-direction: column; }
        .lect-m-label { font-size: 10px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 2px; }
        .lect-m-value { font-size: 22px; font-weight: 900; color: var(--text-main); }
        .lect-m-value.accent { color: var(--accent-primary); }

        /* Radial gauge */
        .lect-gauge-wrap {
          display: flex; flex-direction: column; align-items: center; gap: 12px;
          padding: 32px 0;
          border-top: 1px solid #f1f5f9;
        }
        .lect-gauge-label {
          font-size: 13px; font-weight: 700; color: var(--text-muted);
          margin: 0; letter-spacing: 0.02em;
        }

        /* Idle state */
        .lect-idle-state { padding: 90px 0; text-align: center; }
        .lect-idle-icon-glow {
          width: 90px; height: 90px; border-radius: 30px; background: #f1f5f9;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 28px; color: #cbd5e1;
          box-shadow: inset 0 2px 10px rgba(0,0,0,0.02);
        }
        .lect-idle-state h3 { font-size: 24px; font-weight: 800; color: var(--text-main); margin-bottom: 12px; }
        .lect-idle-state p { font-size: 15px; color: var(--text-muted); max-width: 380px; margin: 0 auto; line-height: 1.6; font-weight: 500; }

        /* Responsive */
        @media (max-width: 1200px) {
          .dashboard-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 1024px) {
          .lect-standout-header { flex-direction: column; align-items: flex-start; gap: 20px; padding: 28px; }
          .lect-select-wrapper { flex-direction: column; width: 100%; }
          .lect-premium-select { min-width: unset; width: 100%; }
          .lect-standout-body { padding: 28px; }
          .lect-metrics-dashboard { flex-wrap: wrap; gap: 14px; }
          .lect-metric-box { flex: 1 1 200px; }
        }
        @media (max-width: 768px) {
          .dashboard-grid { grid-template-columns: 1fr; }
          .lect-standout-header { padding: 20px; }
          .lect-standout-body { padding: 20px; }
          .lect-h-title { font-size: 18px; }
          .lect-metrics-dashboard { flex-direction: column; }
          .lect-metric-box { width: 100%; }
        }
      `}</style>
    </div>
  );
}
