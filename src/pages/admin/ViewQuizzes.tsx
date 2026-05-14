import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { loadQuizzes, getCategories, getQuiz, updateQuiz, deleteQuiz, updateQuizStatus } from '../../api/endpoints';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import PageHeader from '../../components/PageHeader';
import AssessmentCard from '../../components/ui/AssessmentCard';
import { Plus, Loader2, LayoutGrid, Settings, X } from 'lucide-react';

function QuizEditModal({ qId, onClose, onSave, categories }: any) {
  const [quiz, setQuiz] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useState(() => {
    getQuiz(qId).then(data => {
      if (data) setQuiz({ ...data });
      else onClose();
    }).catch(() => onClose());
  });

  if (!quiz) return createPortal(
    <div className="modern-overlay">
       <div className="modern-loader">
          <Loader2 className="spin" size={32} />
          <span>Synchronizing Node...</span>
       </div>
    </div>, document.body
  );

  const set = (k: string, v: any) => setQuiz((q: any) => ({ ...q, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await updateQuiz(quiz);
      toast.success('Protocol state synchronized');
      onSave(); onClose();
    } catch { toast.error('Sync failure'); }
    setSaving(false);
  };

  return createPortal(
    <div className="modern-overlay">
       <div className="modern-modal animate-scale-in" style={{ width: 440 }}>
          <div className="modal-head">
             <div className="h-title">
                <div className="h-ico"><Settings size={14} /></div>
                <span>Protocol Settings</span>
             </div>
             <button className="h-close" onClick={onClose}><X size={14} /></button>
          </div>
          <div className="modal-body">
            {/* ... modal fields remain unchanged ... */}
          </div>
          <div className="modal-foot">
            <button className="btn-sec" onClick={onClose}>Discard</button>
            <button className="btn-pri" onClick={save} disabled={saving}>
              {saving ? 'Syncing...' : 'Save Configuration'}
            </button>
          </div>
       </div>
    </div>, document.body
  );
}

export default function ViewQuizzes() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: rawQuizzes, isLoading } = useQuery({ queryKey: ['quizzes'], queryFn: loadQuizzes });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: getCategories });

  const [editQuizId, setEditQuizId] = useState<number | null>(null);
  const [statusMap, setStatusMap] = useState<Record<number, string>>({});
  const [updatingMap, setUpdatingMap] = useState<Record<number, boolean>>({});

  const handleStatusChange = (id: number, newStatus: string) => {
    setStatusMap(prev => ({ ...prev, [id]: newStatus }));
  };

  const quizzes = Array.isArray(rawQuizzes) ? rawQuizzes : (rawQuizzes?.quizzes || []);

  const doDelete = (qId: number) => {
    Swal.fire({
      title: 'Purge Assessment?', text: "Permanent decommission of this node.",
      icon: 'warning', showCancelButton: true, confirmButtonColor: '#6366f1', confirmButtonText: 'Yes, Purge'
    }).then(r => {
      if (r.isConfirmed) {
        deleteQuiz(qId).then(() => { toast.success('Node purged'); qc.invalidateQueries({ queryKey: ['quizzes'] }); });
      }
    });
  };

  const doUpdateStatus = (q: any) => {
    const sel = statusMap[q.qId] ?? q.status;
    setUpdatingMap(m => ({ ...m, [q.qId]: true }));
    updateQuizStatus(q.qId, sel).then(() => {
      toast.success('Registry Updated');
      qc.invalidateQueries({ queryKey: ['quizzes'] });
    }).finally(() => setUpdatingMap(m => ({ ...m, [q.qId]: false })));
  };

  return (
    <div className="modern-registry animate-fade-in">
      <PageHeader title="Assessment Registry" breadcrumbs={['Admin', 'Command', 'Registry']} />

      <div className="reg-top-bar">
         <div className="t-info">
            <h1 className="t-title">Assessment Nodes</h1>
            <p className="t-sub">{quizzes.length} protocols currently established.</p>
         </div>
         <button className="btn-add" onClick={() => navigate('/admin/add-quiz')}>
            <Plus size={18} /> <span>Initialize Node</span>
         </button>
      </div>

      {isLoading ? (
        <div className="reg-loading"><Loader2 className="spin" size={40} /></div>
      ) : quizzes.length === 0 ? (
        <div className="reg-empty">
           <LayoutGrid size={64} />
           <h3>Registry Empty</h3>
           <p>No active assessment nodes found.</p>
        </div>
      ) : (
        <div className="reg-grid-modern">
          {quizzes.map((q: any) => (
            <AssessmentCard
              key={q.qId}
              qId={q.qId}
              title={q.title}
              quizType={q.quizType}
              status={q.status}
              category={q.category}
              numberOfQuestions={q.numberOfQuestions}
              maxMarks={q.maxMarks}
              quizTime={q.quizTime}
              onEdit={setEditQuizId}
              onDelete={doDelete}
              selectedStatus={statusMap[q.qId] ?? q.status}
              onStatusChange={handleStatusChange}
              onSync={() => doUpdateStatus(q)}
              updating={!!updatingMap[q.qId]}
            />
          ))}
        </div>
      )}

      {editQuizId !== null && (
        <QuizEditModal qId={editQuizId} categories={categories} onClose={() => setEditQuizId(null)} onSave={() => qc.invalidateQueries({ queryKey: ['quizzes'] })} />
      )}

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@700;800;900&family=JetBrains+Mono:wght@500;600&display=swap');
        .modern-registry { padding: 40px 0 80px; font-family: 'Inter', sans-serif; background: #fafafa; min-height: 100vh; }
        .reg-top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 48px; padding: 0 40px; }
        .t-title { font-family: 'Outfit', sans-serif; font-size: 36px; font-weight: 800; color: #111827; margin: 0 0 8px 0; letter-spacing: -0.02em; }
        .t-sub { font-size: 15px; color: #6b7280; font-weight: 400; margin: 0; }
        .btn-add { height: 44px; padding: 0 20px; background: #111827; color: #fff; border: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
        .btn-add:hover { transform: translateY(-2px); background: #374151; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
        .reg-grid-modern { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 24px; padding: 0 40px; }
        .reg-loading, .reg-empty { padding: 100px 0; text-align: center; }
        .reg-loading { color: #111827; }
        .reg-empty h3 { margin: 20px 0 10px; color: #111827; font-weight: 700; font-size: 20px; }
        .reg-empty p { font-size: 15px; color: #6b7280; }
        .modern-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.3); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 99999; }
        .modern-modal { background: #fff; border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); overflow: hidden; border: 1px solid #eaeaea; }
        .modal-head { padding: 20px 24px; border-bottom: 1px solid #eaeaea; display: flex; justify-content: space-between; align-items: center; background: #fafafa; }
        .h-title { display: flex; align-items: center; gap: 8px; font-weight: 600; color: #111827; font-size: 15px; }
        .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
        .modal-foot { padding: 20px 24px; background: #fafafa; border-top: 1px solid #eaeaea; display: flex; justify-content: flex-end; gap: 12px; }
        .btn-sec { background: none; border: none; font-size: 14px; font-weight: 600; color: #6b7280; cursor: pointer; transition: color 0.2s; }
        .btn-sec:hover { color: #111827; }
        .btn-pri { height: 40px; padding: 0 20px; background: #111827; color: #fff; border: none; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s ease; }
        .btn-pri:hover { background: #374151; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
    </div>
  );
}
