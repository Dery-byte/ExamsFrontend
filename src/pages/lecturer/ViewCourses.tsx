// import { useQuery } from '@tanstack/react-query';
// import { getCategoriesForUser } from '../../api/endpoints';
// import { 
//   Book, 
//   Code, 
//   Layers, 
//   ChevronRight, 
//   Activity, 
//   Info, 
//   GraduationCap, 
//   Loader2,
//   BookOpen,
//   ArrowRight,
//   TrendingUp,
//   Layout,
//   Award
// } from 'lucide-react';
// import { useNavigate } from 'react-router-dom';

// export default function ViewCourses() {
//   const navigate = useNavigate();
//   const { data: courses = [], isLoading } = useQuery({ 
//     queryKey: ['my-courses'], 
//     queryFn: getCategoriesForUser 
//   });

//   const courseList = courses as any[];

//   // Calculate some stats for the header
//   const totalCourses = courseList.length;
//   const uniqueLevels = new Set(courseList.map(c => c.level)).size;
//   const activeCourses = courseList.filter(c => c.active !== false).length; // Assuming an active flag or just all for now

//   return (
//     <div className="view-courses-container animate-fade-in">
//       {/* Page Header */}
//       <div className="page-title-box d-flex align-items-center justify-content-between mb-4">
//         <div>
//           <h4 className="page-title mb-1 font-size-20 fw-bold text-dark">Academic Portfolio</h4>
//           <div className="breadcrumb-custom m-0 text-muted">
//             <span className="breadcrumb-item">Lecturer</span> 
//             <ChevronRight size={14} className="mx-2 opacity-50" /> 
//             <span className="breadcrumb-item active text-primary fw-medium">Facilitated Courses</span>
//           </div>
//         </div>
//         <div className="d-flex gap-2">
//            <button className="btn btn-primary-premium d-flex align-items-center gap-2" onClick={() => navigate('/lecturer/add-course')}>
//              <BookOpen size={16} />
//              <span>Enroll New Course</span>
//            </button>
//         </div>
//       </div>

//       {/* Summary Stats */}
//       {!isLoading && (
//         <div className="row mb-4 g-3">
//           {[
//             { label: 'Total Courses', val: totalCourses, icon: <Layout className="text-primary" />, color: 'primary' },
//             { label: 'Active Levels', val: uniqueLevels, icon: <TrendingUp className="text-success" />, color: 'success' },
//             { label: 'Pending Reviews', val: '04', icon: <Activity className="text-warning" />, color: 'warning' },
//             { label: 'Certifications', val: '02', icon: <Award className="text-info" />, color: 'info' },
//           ].map((stat, i) => (
//             <div key={i} className="col-xl-3 col-sm-6">
//               <div className="stat-card p-3 shadow-sm border-0">
//                 <div className="d-flex align-items-center justify-content-between">
//                   <div>
//                     <p className="text-muted mb-1 font-size-13 fw-medium">{stat.label}</p>
//                     <h4 className="mb-0 fw-bold">{stat.val}</h4>
//                   </div>
//                   <div className={`stat-icon-wrap bg-soft-${stat.color}`}>
//                     {stat.icon}
//                   </div>
//                 </div>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}

//       {isLoading ? (
//         <div className="loading-state d-flex flex-column align-items-center justify-content-center py-5 mt-5">
//           <div className="loader-orbit">
//             <Loader2 className="animate-spin text-primary" size={48} />
//           </div>
//           <p className="text-muted mt-4 font-size-15 fw-medium">Curating your academic data...</p>
//         </div>
//       ) : (
//         <div className="row g-4 mt-1">
//           {courseList.map((c: any, index) => (
//             <div key={c.cid} className="col-xl-4 col-md-6" style={{ animationDelay: `${index * 0.1}s` }}>
//               <div className="premium-course-card h-100 shadow-sm border-0">
//                 <div className="card-header-accent" style={{ background: `linear-gradient(135deg, ${getRandomColor(index)}, ${getRandomColor(index + 1)})` }}>
//                    <div className="accent-pattern"></div>
//                 </div>
//                 <div className="card-body p-4 pt-0">
//                   <div className="card-top-offset">
//                     <div className="course-icon-box shadow-md">
//                       <BookOpen size={24} className="text-white" />
//                     </div>
//                   </div>

//                   <div className="d-flex justify-content-between align-items-center mt-3 mb-2">
//                     <span className="badge badge-pill badge-soft-primary px-2 py-1 font-size-11 fw-bold">
//                       {c.courseCode || 'GEN-101'}
//                     </span>
//                     <div className="d-flex align-items-center gap-1 text-muted font-size-12 fw-medium">
//                       <Layers size={14} />
//                       <span>Level {c.level}</span>
//                     </div>
//                   </div>
                  
//                   <h5 className="course-title mb-3 fw-bold text-dark">{c.title}</h5>
//                   <p className="course-desc text-muted mb-4 font-size-14">
//                     {c.description || 'Comprehensive course module covering core fundamental concepts and advanced learning methodologies.'}
//                   </p>

//                   <div className="card-footer-premium d-flex align-items-center justify-content-between pt-3">
//                     <div className="status-indicator">
//                       <span className="status-dot"></span>
//                       <span className="status-text text-uppercase font-size-10 fw-bold">Session Active</span>
//                     </div>
//                     <button 
//                       className="btn-view-details d-flex align-items-center gap-2"
//                       onClick={() => navigate(`/lecturer/view-course/${c.cid}`)}
//                     >
//                       <span>Manage</span>
//                       <ArrowRight size={16} />
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           ))}

//           {courseList.length === 0 && (
//             <div className="col-12 text-center py-5 mt-4">
//               <div className="empty-state-card p-5 mx-auto shadow-sm">
//                 <div className="empty-icon-bg mb-4">
//                   <GraduationCap size={64} className="text-primary opacity-25" />
//                 </div>
//                 <h4 className="fw-bold text-dark mb-2">Your Classroom is Empty</h4>
//                 <p className="text-muted mb-4 mx-auto" style={{ maxWidth: '400px' }}>
//                   It seems you haven't been assigned to any courses yet. Start by enrolling a new course or contact your academic administrator.
//                 </p>
//                 <button className="btn btn-primary-premium btn-lg px-4" onClick={() => navigate('/lecturer/add-course')}>
//                   Initialize First Course
//                 </button>
//               </div>
//             </div>
//           )}
//         </div>
//       )}

//       <style>{`
//         .view-courses-container {
//           padding-bottom: 2rem;
//           font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
//           overflow-x: hidden;
//         }

//         /* Stats Card */
//         .stat-card {
//           background: #ffffff;
//           border-radius: 12px;
//           transition: all 0.3s ease;
//         }
//         .stat-card:hover {
//           transform: translateY(-5px);
//           box-shadow: 0 10px 20px rgba(0,0,0,0.05) !important;
//         }
//         .stat-icon-wrap {
//           width: 48px;
//           height: 48px;
//           border-radius: 12px;
//           display: flex;
//           align-items: center;
//           justify-content: center;
//           font-size: 20px;
//         }
//         .bg-soft-primary { background-color: rgba(81, 86, 190, 0.1); color: #5156be; }
//         .bg-soft-success { background-color: rgba(42, 181, 125, 0.1); color: #2ab57d; }
//         .bg-soft-warning { background-color: rgba(241, 187, 85, 0.1); color: #f1bb55; }
//         .bg-soft-info { background-color: rgba(80, 165, 241, 0.1); color: #50a5f1; }

//         /* Premium Course Card */
//         .premium-course-card {
//           background: #ffffff;
//           border-radius: 16px;
//           position: relative;
//           overflow: hidden;
//           transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
//           animation: slideUpFade 0.5s ease forwards;
//           opacity: 0;
//         }
//         .premium-course-card:hover {
//           transform: translateY(-8px);
//           box-shadow: 0 15px 30px rgba(18, 38, 63, 0.1) !important;
//         }

//         .card-header-accent {
//           height: 60px;
//           width: 100%;
//           position: relative;
//           overflow: hidden;
//         }
//         .accent-pattern {
//           position: absolute;
//           top: 0; left: 0; width: 100%; height: 100%;
//           background-image: radial-gradient(rgba(255,255,255,0.2) 1px, transparent 1px);
//           background-size: 15px 15px;
//           opacity: 0.3;
//         }

//         .card-top-offset {
//           margin-top: -24px;
//           padding-left: 0;
//           position: relative;
//           z-index: 2;
//         }
//         .course-icon-box {
//           width: 48px;
//           height: 48px;
//           border-radius: 12px;
//           background: #2a2d34;
//           display: flex;
//           align-items: center;
//           justify-content: center;
//           border: 3px solid #fff;
//         }

//         .course-title {
//           font-size: 17px;
//           line-height: 1.4;
//           height: 48px;
//           overflow: hidden;
//           display: -webkit-box;
//           -webkit-line-clamp: 2;
//           -webkit-box-orient: vertical;
//         }

//         .course-desc {
//           font-size: 14px;
//           line-height: 1.6;
//           height: 68px;
//           overflow: hidden;
//           display: -webkit-box;
//           -webkit-line-clamp: 3;
//           -webkit-box-orient: vertical;
//         }

//         .card-footer-premium {
//           border-top: 1px solid #f1f1f5;
//         }

//         .btn-view-details {
//           background: transparent;
//           border: none;
//           color: #5156be;
//           font-weight: 700;
//           font-size: 14px;
//           padding: 8px 0;
//           transition: all 0.2s;
//         }
//         .btn-view-details:hover {
//           gap: 12px !important;
//           color: #4549a2;
//         }

//         .status-indicator {
//           display: flex;
//           align-items: center;
//           gap: 6px;
//         }
//         .status-dot {
//           width: 6px;
//           height: 6px;
//           background: #2ab57d;
//           border-radius: 50%;
//           box-shadow: 0 0 0 3px rgba(42, 181, 125, 0.1);
//           animation: pulse-green 2s infinite;
//         }
//         .status-text {
//           color: #2ab57d;
//           letter-spacing: 0.5px;
//         }

//         @keyframes pulse-green {
//           0% { box-shadow: 0 0 0 0 rgba(42, 181, 125, 0.4); }
//           70% { box-shadow: 0 0 0 6px rgba(42, 181, 125, 0); }
//           100% { box-shadow: 0 0 0 0 rgba(42, 181, 125, 0); }
//         }

//         /* Buttons */
//         .btn-primary-premium {
//           background: linear-gradient(135deg, #5156be, #4549a2);
//           border: none;
//           color: white;
//           padding: 10px 20px;
//           border-radius: 10px;
//           font-weight: 600;
//           box-shadow: 0 4px 15px rgba(81, 86, 190, 0.3);
//           transition: all 0.3s;
//         }
//         .btn-primary-premium:hover {
//           transform: translateY(-2px);
//           box-shadow: 0 6px 20px rgba(81, 86, 190, 0.4);
//           color: white;
//         }

//         /* Empty State */
//         .empty-state-card {
//           background: #fff;
//           border-radius: 20px;
//           max-width: 600px;
//         }
//         .empty-icon-bg {
//           width: 120px;
//           height: 120px;
//           background: rgba(81, 86, 190, 0.05);
//           border-radius: 50%;
//           display: flex;
//           align-items: center;
//           justify-content: center;
//           margin: 0 auto;
//         }

//         /* Animations */
//         @keyframes slideUpFade {
//           from { opacity: 0; transform: translateY(20px); }
//           to { opacity: 1; transform: translateY(0); }
//         }
//         .animate-fade-in {
//           animation: fadeIn 0.4s ease-out;
//         }
//         @keyframes fadeIn {
//           from { opacity: 0; }
//           to { opacity: 1; }
//         }

//         .loader-orbit {
//           position: relative;
//           padding: 20px;
//         }
//         .loader-orbit::after {
//           content: '';
//           position: absolute;
//           top: 0; left: 0; width: 100%; height: 100%;
//           border: 2px dashed rgba(81, 86, 190, 0.2);
//           border-radius: 50%;
//           animation: spin 8s linear infinite;
//         }
//         @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

//         @media (max-width: 768px) {
//           .page-title-box { flex-direction: column !important; align-items: flex-start !important; gap: 12px; }
//           .page-title-box .d-flex.gap-2 { width: 100%; }
//           .btn-primary-premium { width: 100%; text-align: center; justify-content: center; display: flex; }
//           .page-title { font-size: 18px !important; }
//           .empty-state-card { padding: 2rem 1.5rem !important; }
//           .card-body { padding: 1.25rem !important; }
//           .stat-card { padding: 1rem !important; }
//           .course-title { font-size: 15px; height: auto; }
//         }
//       `}</style>
//     </div>
//   );
// }

// // Helper for dynamic colors
// function getRandomColor(index: number) {
//   const colors = [
//     '#5156be', // Primary
//     '#2ab57d', // Success
//     '#f1bb55', // Warning
//     '#50a5f1', // Info
//     '#fd625e', // Danger
//     '#4ba6ef', // Blue
//     '#ff7f5c', // Coral
//     '#a55eea', // Purple
//   ];
//   return colors[index % colors.length];
// }
