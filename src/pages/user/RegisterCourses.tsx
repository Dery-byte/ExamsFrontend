import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getRegCourses, getCategories, regCourses } from '../../api/endpoints';
import Swal from 'sweetalert2';
import toast, { Toaster } from 'react-hot-toast';
import PageHeader from '../../components/PageHeader';
import { Search, Loader2, CheckCircle2, BookOpen, Info, Filter, Plus, ChevronRight, GraduationCap } from 'lucide-react';

export default function RegisterCourses() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [uniqueLevels, setUniqueLevels] = useState<string[]>([]);
  const [selectedLevel, setSelectedLevel] = useState('');
  const [displayedCourses, setDisplayed] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [enrollingCid, setEnrollingCid] = useState<any>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [regRaw, catsRaw] = await Promise.all([getRegCourses(), getCategories()]);
      const reg = Array.isArray(regRaw) ? regRaw : [];
      const cats = Array.isArray(catsRaw) ? catsRaw : [];

      const userId = user?.id;
      const userReg = reg.filter((r: any) => r.user?.id === userId);
      const transformedReg = userReg.map((r: any) => ({
        cid: r.category.cid, level: r.category.level, title: r.category.title,
        description: r.category.description, courseCode: r.category.courseCode,
      }));

      const unregistered = cats.filter(cat => !transformedReg.some(r => r.cid === cat.cid));

      const levels = Array.from(new Set(cats.map((c: any) => c.level))).sort((a: any, b: any) => {
        const na = parseInt(a.split(' ')[1]); const nb = parseInt(b.split(' ')[1]);
        return nb - na;
      }) as string[];

      setUniqueLevels(levels);
      setCategories(unregistered);
      if (levels.length > 0) setSelectedLevel(levels[0]);
    } catch (err) {
      console.error('Course catalog load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedLevel) { setDisplayed([]); return; }
    const filtered = categories.filter(c => c.level === selectedLevel);
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      setDisplayed(filtered);
    } else {
      setDisplayed(filtered.filter(c =>
        c.title.toLowerCase().includes(query) ||
        c.courseCode.toLowerCase().includes(query)
      ));
    }
  }, [selectedLevel, categories, searchQuery]);

  const onEnrol = async (course: any) => {
    const result = await Swal.fire({
      title: 'Course Registration',
      html: `You are about to enrol in <b>${course.courseCode}: ${course.title}</b>.<br/><br/>This module will be added to your academic record for the current semester.`,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Confirm Enrolment',
      cancelButtonText: 'Cancel',
      confirmButtonColor: 'var(--primary)',
      cancelButtonColor: 'var(--gray-400)',
      reverseButtons: true,
      background: '#fff',
      customClass: { popup: 'swal2-premium-popup' }
    });

    if (!result.isConfirmed) return;

    setEnrollingCid(course.cid);
    try {
      await regCourses({ category: { cid: course.cid } });
      toast.success(`${course.courseCode} registered successfully!`, {
        icon: '🎓',
        style: { borderRadius: '8px', background: 'var(--gray-900)', color: '#fff', fontSize: '13px', fontWeight: 600 }
      });
      setCategories(prev => prev.filter(c => c.cid !== course.cid));
    } catch {
      toast.error('Could not complete registration. Please check your connection.');
    } finally {
      setEnrollingCid(null);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '100px 0', textAlign: 'center' }}>
        <Loader2 className="spin-ico" size={40} style={{ color: 'var(--primary)', marginBottom: 16 }} />
        <p style={{ color: '#adb5bd', fontSize: 14, fontWeight: 600 }}>Syncing academic catalog...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 40 }}>
      <Toaster position="top-right" />
      <PageHeader title="Course Registration" breadcrumbs={['Lexa', 'Portal', 'Enrolment']} />

      {/* Control Panel: Level Tabs & Search */}
      <div className="lexa-card" style={{ overflow: 'hidden' }}>
        <div style={{ background: '#fff', borderBottom: '1px solid #f1f5f7' }}>
          <div style={{ display: 'flex', overflowX: 'auto' }}>
            {uniqueLevels.map(l => (
              <button
                key={l}
                onClick={() => setSelectedLevel(l)}
                style={{
                  background: 'transparent',
                  color: selectedLevel === l ? 'var(--primary)' : '#adb5bd',
                  borderBottom: selectedLevel === l ? '3px solid var(--primary)' : '3px solid transparent',
                  padding: '18px 25px',
                  fontSize: 13,
                  fontWeight: 700,
                  transition: 'all 0.3s',
                  borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                {l} Level
              </button>
            ))}
          </div>
        </div>
        
        <div className="lexa-card-body" style={{ background: '#fcfdfe', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(122, 111, 190, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Filter size={14} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#495057' }}>Catalog Filter</div>
              <div style={{ fontSize: 11, color: '#adb5bd' }}>Found {displayedCourses.length} available courses for this level</div>
            </div>
          </div>

          <div style={{ position: 'relative', width: '100%', maxWidth: 350 }}>
            <Search style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#adb5bd' }} size={16} />
            <input
              type="text"
              placeholder="Search by course code or title..."
              style={{
                borderRadius: 8, padding: '10px 15px 10px 42px', fontSize: 14,
                background: '#fff', border: '1px solid #e1e9f1', width: '100%', outline: 'none',
                transition: 'all 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="search-input-lexa"
            />
          </div>
        </div>
      </div>

      {displayedCourses.length === 0 ? (
        <div className="lexa-card" style={{ padding: '80px 20px', textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(40, 187, 227, 0.1)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <CheckCircle2 size={40} />
          </div>
          <h4 style={{ fontWeight: 800, color: '#495057', marginBottom: 12 }}>Catalog Exhausted</h4>
          <p style={{ color: '#adb5bd', fontSize: 15, maxWidth: 500, margin: '0 auto', lineHeight: 1.6 }}>
            Excellent! It seems you've already enrolled in all available modules for the <strong>{selectedLevel}</strong> level, or no matching courses were found for your search.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 30 }}>
            <button onClick={() => setSearchQuery('')} className="btn-lexa btn-lexa-outline">
              Clear Search
            </button>
            <button onClick={() => window.location.href = '/user-dashboard/history'} className="btn-lexa btn-lexa-primary">
              View Registered Courses
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
          {displayedCourses.map((c) => (
            <div key={c.cid} className="lexa-card course-card-premium" style={{ display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid #f1f5f7' }}>
              <div className="lexa-card-body" style={{ flex: 1, padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <span className="lexa-badge badge-soft-primary" style={{ padding: '4px 10px', fontSize: 12, borderRadius: 4, letterSpacing: '0.02em' }}>
                    {c.courseCode}
                  </span>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#adb5bd', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <BookOpen size={12} /> {c.level}
                  </div>
                </div>
                
                <h5 style={{ fontSize: 17, fontWeight: 800, color: '#2a3142', marginBottom: 12, lineHeight: 1.4, height: '48px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {c.title}
                </h5>
                
                <p style={{ fontSize: 13, color: '#74788d', lineHeight: 1.7, marginBottom: 0, height: '65px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                  {c.description || 'This module provides a comprehensive overview of core academic principles and their practical applications in modern professional environments.'}
                </p>
              </div>

              <div style={{ padding: '16px 24px', background: '#fcfdfe', borderTop: '1px solid #f1f5f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 6, background: '#fff', border: '1px solid #e1e9f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7a6fbe' }}>
                    <GraduationCap size={16} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#495057' }}>Enrol Now</span>
                </div>
                <button
                  onClick={() => onEnrol(c)}
                  disabled={enrollingCid !== null}
                  className="btn-lexa btn-lexa-primary"
                  style={{ padding: '8px 20px', borderRadius: 6, minWidth: 100 }}
                >
                  {enrollingCid === c.cid ? <Loader2 className="spin-ico" size={16} /> : <><Plus size={16} /> Register</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modern Info Footer */}
      <div className="lexa-card" style={{ marginTop: 30, background: 'linear-gradient(to right, #ffffff, #fcfdfe)', border: '1px solid #f1f5f7' }}>
        <div className="lexa-card-body" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 20, padding: '20px 30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
            <div style={{ width: 45, height: 45, borderRadius: '12px', background: 'rgba(56, 164, 248, 0.1)', color: 'var(--info)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Info size={22} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#2a3142', marginBottom: 2 }}>Academic Enrolment Notice</div>
              <div style={{ fontSize: 12, color: '#74788d' }}>Course registration is subject to credit load limits and prerequisite verification by your department coordinator.</div>
            </div>
          </div>
          <button 
            onClick={() => window.location.href = '/user-dashboard/history'} 
            className="btn-lexa btn-lexa-outline"
            style={{ borderRadius: 8, padding: '10px 20px' }}
          >
            My Registered Courses <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <style>{`
        .course-card-premium {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .course-card-premium:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 24px rgba(18, 38, 63, 0.08) !important;
          border-color: var(--primary) !important;
        }
        .search-input-lexa:focus {
          border-color: var(--primary) !important;
          box-shadow: 0 0 0 4px rgba(122, 111, 190, 0.1) !important;
        }
        .btn-lexa-outline {
          background: transparent;
          border: 1.5px solid #e1e9f1;
          color: #74788d;
        }
        .btn-lexa-outline:hover {
          background: #f8f9fa;
          border-color: #ced4da;
          color: #495057;
        }
        .swal2-premium-popup { border-radius: 16px !important; padding: 40px !important; font-family: 'Inter', sans-serif !important; }
        .spin-ico { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        @media (max-width: 768px) {
          .lexa-card-body { flex-direction: column; align-items: stretch !important; }
          .search-input-lexa { max-width: 100% !important; }
        }
      `}</style>
    </div>
  );
}
