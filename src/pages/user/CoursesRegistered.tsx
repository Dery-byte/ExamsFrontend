import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getRegCourses, deleteRegCourse } from '../../api/endpoints';
import Swal from 'sweetalert2';
import PageHeader from '../../components/PageHeader';
import { Search, Loader2, BookOpen, Trash2, Info, ChevronRight, Filter, Download, Plus, Activity } from 'lucide-react';

export default function CoursesRegistered() {
  const { user } = useAuth();
  const [userRecords, setUserRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading]     = useState(false);
  const [isDeleting, setIsDeleting]   = useState(false);
  const [filterQuery, setFilterQuery] = useState('');

  const loadRegisteredCourses = async () => {
    setIsLoading(true);
    try {
      const data: any[] = await getRegCourses();
      const userId = user?.id;
      setUserRecords(data.filter((c: any) => c.user?.id === userId));
    } catch (err) {
      console.error('Failed to load registered courses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadRegisteredCourses(); }, []);

  const getFiltered = () => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return userRecords;
    return userRecords.filter(r =>
      r.category?.courseCode?.toLowerCase().includes(q) ||
      r.category?.title?.toLowerCase().includes(q)
    );
  };

  const deleteRegCourseById = (rid: number, courseTitle: string) => {
    Swal.fire({
      title: 'Course Disenrollment',
      html: `Are you sure you want to drop <b>${courseTitle}</b>?<br/><br/>This action will remove the module from your current session curriculum.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Drop Course',
      cancelButtonText: 'Keep Course',
      confirmButtonColor: 'var(--danger)',
      cancelButtonColor: 'var(--gray-400)',
      reverseButtons: true,
      background: '#fff',
      customClass: { popup: 'swal2-premium-popup' }
    }).then(r => {
      if (!r.isConfirmed) return;
      setIsDeleting(true);
      deleteRegCourse(rid).then(() => {
        setUserRecords(ur => ur.filter(c => c.rid !== rid));
        Swal.fire({
          title: 'Removed!',
          text: 'The course has been successfully removed from your registration.',
          icon: 'success',
          confirmButtonColor: 'var(--primary)',
          customClass: { popup: 'swal2-premium-popup' }
        });
      }).catch(() => {
        Swal.fire({
          title: 'Error',
          text: 'Failed to process disenrollment. Please contact support.',
          icon: 'error',
          confirmButtonColor: 'var(--primary)',
          customClass: { popup: 'swal2-premium-popup' }
        });
      }).finally(() => setIsDeleting(false));
    });
  };

  const filteredData = getFiltered();

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 40 }}>
      <PageHeader title="Curriculum Management" breadcrumbs={['Lexa', 'Portal', 'My Courses']} />

      <div className="lexa-card">
        <div className="lexa-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 15 }}>
          <div>
            <h5 className="lexa-card-title" style={{ margin: 0 }}>Registered Modules</h5>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#adb5bd' }}>Managing your academic curriculum for the current session</p>
          </div>
          
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 0 }}>
              <Search style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#adb5bd' }} size={16} />
              <input 
                type="text" 
                placeholder="Search code or title..." 
                style={{ 
                  padding: '10px 15px 10px 42px', background: '#fff', border: '1px solid #e1e9f1', 
                  borderRadius: 8, fontSize: 13, width: '100%', outline: 'none', transition: 'all 0.2s',
                  boxSizing: 'border-box'
                }}
                className="search-input-lexa"
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
              />
            </div>
            <button className="btn-lexa btn-lexa-outline" style={{ width: 42, height: 42, padding: 0, borderRadius: 8, flexShrink: 0 }}>
              <Download size={18} />
            </button>
            <Link to="/user-dashboard/register" className="btn-lexa btn-lexa-primary" style={{ textDecoration: 'none', borderRadius: 8, flexShrink: 0 }}>
              <Plus size={18} /> Add Module
            </Link>
          </div>
        </div>

        <div className="lexa-card-body" style={{ padding: 0 }}>
          {isLoading ? (
            <div style={{ padding: '100px 0', textAlign: 'center' }}>
              <Loader2 className="spin-ico" size={48} style={{ color: 'var(--primary)', marginBottom: 20 }} />
              <h6 style={{ fontWeight: 700, color: '#495057' }}>Retrieving Curriculum Data</h6>
              <p style={{ color: '#adb5bd', fontSize: 13 }}>Connecting to academic database...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div style={{ padding: '100px 20px', textAlign: 'center', background: '#fcfdfe' }}>
              <div style={{ width: 90, height: 90, borderRadius: '24px', background: 'rgba(122, 111, 190, 0.05)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', transform: 'rotate(-5deg)' }}>
                <BookOpen size={45} />
              </div>
              <h4 style={{ fontWeight: 800, color: '#2a3142', marginBottom: 12 }}>Empty Curriculum</h4>
              <p style={{ color: '#74788d', fontSize: 15, maxWidth: 450, margin: '0 auto 30px', lineHeight: 1.6 }}>You haven't enrolled in any academic modules for the current session. Start by browsing the course catalog to build your schedule.</p>
              <Link to="/user-dashboard/register" className="btn-lexa btn-lexa-primary" style={{ textDecoration: 'none', borderRadius: 8, padding: '12px 30px' }}>
                Explore Course Catalog <ChevronRight size={18} />
              </Link>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table-lexa">
                <thead style={{ background: '#fcfdfe' }}>
                  <tr>
                    <th style={{ paddingLeft: 24, width: 80, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rank</th>
                    <th style={{ width: 150, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Course Code</th>
                    <th style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Curriculum Detail</th>
                    <th style={{ paddingRight: 24, textAlign: 'right', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((course, i) => (
                    <tr key={course.rid} style={{ transition: 'all 0.2s' }} className="row-hover-lexa">
                      <td style={{ paddingLeft: 24, color: '#adb5bd', fontWeight: 800, fontSize: 13 }}>{String(i + 1).padStart(2, '0')}</td>
                      <td>
                        <span className="lexa-badge badge-soft-primary" style={{ padding: '6px 12px', borderRadius: 6, fontWeight: 800, fontSize: 12 }}>
                          {course.category?.courseCode}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 800, color: '#2a3142', fontSize: 15, marginBottom: 2 }}>{course.category?.title}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#adb5bd', fontWeight: 600 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Activity size={12} className="text-info" /> {course.category?.level} Level</span>
                          <span style={{ color: '#e1e9f1' }}>|</span>
                          <span>Verified Registration</span>
                        </div>
                      </td>
                      <td style={{ paddingRight: 24, textAlign: 'right' }}>
                        <button 
                          className="btn-lexa btn-lexa-danger-soft"
                          style={{ width: 36, height: 36, padding: 0, borderRadius: 8 }}
                          disabled={isDeleting}
                          onClick={() => deleteRegCourseById(course.rid, course.category?.title)}
                          title="Drop Course"
                        >
                          {isDeleting ? <Loader2 className="spin-ico" size={16} /> : <Trash2 size={16} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="lexa-card-body" style={{ background: '#fcfdfe', borderTop: '1px solid #f1f5f7', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
            <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(56, 164, 248, 0.1)', color: 'var(--info)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Info size={18} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#2a3142' }}>Regulatory Compliance</div>
              <div style={{ fontSize: 11, color: '#74788d' }}>Enrollment records are synchronized with the central Registry. Academic integrity verification is active for all session interactions.</div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
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
        .btn-lexa-danger-soft {
          background: rgba(236, 69, 97, 0.1);
          color: var(--danger);
          border: none;
        }
        .btn-lexa-danger-soft:hover {
          background: var(--danger);
          color: #fff;
          box-shadow: 0 4px 11px rgba(236, 69, 97, 0.3);
        }
        .row-hover-lexa:hover { background-color: #fcfdfe; }
        .swal2-premium-popup { border-radius: 16px !important; padding: 40px !important; font-family: 'Inter', sans-serif !important; }
        .spin-ico { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        @media (max-width: 576px) {
          .lexa-card-header { flex-direction: column !important; align-items: stretch !important; }
        }
      `}</style>
    </div>
  );
}
