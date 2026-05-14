import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUniqueCategoriesForLecturer, getReportByQuizId, loadQuizzesForUser } from '../../api/endpoints';
import * as XLSX from 'xlsx';
import { ArrowRight, ChevronDown } from 'lucide-react';

export default function LectWelcome() {
  const [selCatId, setSelCatId]           = useState<number|null>(null);
  const [selQuizId, setSelQuizId]         = useState<number|null>(null);
  const [assocQuizzes, setAssocQuizzes]   = useState<any[]>([]);
  const [reports, setReports]             = useState<any[]>([]);
  const [courseName, setCourseName]       = useState('');
  const [avgScore, setAvgScore]           = useState(0);

  const { data: cateGory = [] } = useQuery({ queryKey: ['lectCatReport'], queryFn: getUniqueCategoriesForLecturer });
  const { data: myQuizzes = [] } = useQuery({ queryKey: ['myQuizzes'], queryFn: loadQuizzesForUser });

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
    { label: 'Total Courses', val: (cateGory as any[]).length, badge: '+12%', badgeColor: 'bg-soft-success text-success', spark: <SparklineUp /> },
    { label: 'Active Quizzes', val: (myQuizzes as any[]).length, badge: '+8%', badgeColor: 'bg-soft-success text-success', spark: <SparklineUp /> },
    { label: 'Average Score', val: avgScore.toFixed(1) + '%', badge: '-2.5%', badgeColor: 'bg-soft-danger text-danger', spark: <SparklineDown /> },
    { label: 'Total Assessments', val: reports.length, badge: '+15%', badgeColor: 'bg-soft-success text-success', spark: <SparklineUp /> },
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

      <div className="dashboard-row-2">
        <div className="minia-card">
          <div className="card-header border-none">
            <h5 className="card-title">Assessment Overview</h5>
            <div className="dropdown-action">
              <span>Filter</span> <ChevronDown size={14} />
            </div>
          </div>
          <div className="overview-content">
            <div className="radial-wrap" style={{ transform: 'scale(1.2)' }}>
              <svg width="140" height="140" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#f1f1f5" strokeWidth="12" strokeDasharray="180 300" strokeDashoffset="180" strokeLinecap="round" transform="rotate(135 60 60)"></circle>
                <circle cx="60" cy="60" r="50" fill="none" stroke="#2ab57d" strokeWidth="12" strokeDasharray="120 300" strokeDashoffset="180" strokeLinecap="round" transform="rotate(135 60 60)"></circle>
                <text x="60" y="65" textAnchor="middle" fontSize="18" fontWeight="600" fill="#495057">{reports.length > 0 ? '80%' : '0%'}</text>
              </svg>
            </div>
            <div className="overview-data">
              <p className="o-label">Selected Course</p>
              <select className="o-select" value={selCatId ?? ''} onChange={e => selectCategory(e.target.value ? Number(e.target.value) : null)}>
                <option value="">Select Course</option>
                {catOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <p className="o-sub">+ Data synced ({reports.length} records)</p>

              <div className="o-stats">
                <div>
                  <p className="os-label">ASSESSMENT</p>
                  <select className="o-select sm" value={selQuizId ?? ''} onChange={e => onQuizSelected(e.target.value ? Number(e.target.value) : null)} disabled={!selCatId}>
                    <option value="">Select Quiz</option>
                    {quizOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              <button className="btn-view-more">View more <ArrowRight size={14} /></button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .minia-dashboard { font-family: 'Inter', sans-serif; color: #495057; }
        
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .page-title { font-size: 15px; font-weight: 700; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
        .breadcrumb { display: flex; gap: 8px; font-size: 13px; color: #74788d; font-weight: 500; }
        .separator { color: #ced4da; }

        .dashboard-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin-bottom: 24px; }

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

        .dashboard-row-2 { display: grid; grid-template-columns: 1fr; gap: 24px; }
        
        .card-header { padding: 18px 20px; border-bottom: 1px solid #f3f3f9; display: flex; justify-content: space-between; align-items: center; }
        .card-header.border-none { border-bottom: none; }
        .card-title { font-size: 15px; font-weight: 700; margin: 0; }
        
        .dropdown-action { font-size: 12px; font-weight: 600; color: #495057; border: 1px solid #e9e9ef; padding: 5px 12px; border-radius: 4px; display: flex; align-items: center; gap: 6px; cursor: pointer; transition: background 0.2s; }
        .dropdown-action:hover { background: #f8f9fa; }

        .overview-content { display: flex; padding: 30px 20px 40px 20px; align-items: center; justify-content: center; gap: 100px; }
        .overview-data { flex: 0 1 450px; }
        .o-label { font-size: 12px; font-weight: 700; color: #a6b0cf; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px; }
        .o-select { width: 100%; border: none; font-size: 20px; font-weight: 700; color: #495057; background: transparent; outline: none; margin-bottom: 4px; cursor: pointer; padding-left: 0; }
        .o-select.sm { font-size: 15px; color: #5156be; }
        .o-sub { font-size: 12px; color: #2ab57d; margin: 0 0 25px 0; font-weight: 600; }
        
        .o-stats { border-top: 1px solid #f3f3f9; padding-top: 25px; margin-bottom: 30px; }
        .os-label { font-size: 10px; color: #74788d; margin: 0 0 6px 0; letter-spacing: 1px; font-weight: 700; }
        
        .btn-view-more { background: #5156be; color: white; border: none; padding: 8px 16px; border-radius: 4px; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; transition: background 0.2s; }
        .btn-view-more:hover { background: #4549a2; }

        @media (max-width: 1200px) {
          .dashboard-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 768px) {
          .dashboard-grid { grid-template-columns: 1fr; }
          .overview-content { flex-direction: column; align-items: flex-start; gap: 30px; }
          .overview-data { width: 100%; }
        }
      `}</style>
    </div>
  );
}
