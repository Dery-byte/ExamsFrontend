import { GraduationCap } from 'lucide-react';

interface Props {
  programs: any[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  /** Show department name (and a "disabled" tag) next to each program — used by Super Admin. */
  showDepartment?: boolean;
  emptyText?: string;
}

/** Multi-select of the programs allowed to take a quiz. Shared by the add page and both edit modals. */
export default function QuizProgramPicker({ programs, selectedIds, onChange, showDepartment, emptyText }: Props) {
  const toggle = (id: number) =>
    onChange(selectedIds.includes(id) ? selectedIds.filter(p => p !== id) : [...selectedIds, id]);

  return (
    <div className="aq-field mt-4">
      <label className="aq-label">
        Allowed Programs <span className="qpp-hint">(students in the selected programs can take this quiz)</span>
      </label>
      {programs.length === 0 ? (
        <p className="qpp-hint">{emptyText ?? 'No programs available.'}</p>
      ) : (
        <div className="qpp-grid">
          {programs.map((p: any) => {
            const selected = selectedIds.includes(p.id);
            return (
              <label key={p.id} className={`qpp-opt ${selected ? 'selected' : ''}`}>
                <input type="checkbox" checked={selected} onChange={() => toggle(p.id)} />
                <GraduationCap size={14} />
                <span className="qpp-name">{p.name}</span>
                {showDepartment && (
                  <span className="qpp-dept">{p.departmentName}{p.enabled === false ? ' · disabled' : ''}</span>
                )}
              </label>
            );
          })}
        </div>
      )}
      <style>{`
        .qpp-hint { font-size:11px; font-weight:500; color:#94a3b8; text-transform:none; letter-spacing:0; margin:0; }
        .qpp-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .qpp-opt { display:flex; align-items:center; gap:8px; padding:10px 12px; border:1.5px solid #e2e8f0; border-radius:10px; background:#fff; color:#64748b; cursor:pointer; transition:.2s; }
        .qpp-opt:hover { border-color:#c7d2fe; background:#f5f7ff; }
        .qpp-opt.selected { border-color:#5156be; background:#eef2ff; color:#5156be; }
        .qpp-opt input { width:16px; height:16px; accent-color:#5156be; flex-shrink:0; }
        .qpp-name { font-size:13px; font-weight:600; color:#334155; flex:1; min-width:0; }
        .qpp-dept { font-size:10.5px; color:#94a3b8; font-weight:500; }
        @media (max-width:560px) { .qpp-grid { grid-template-columns:1fr; } }
      `}</style>
    </div>
  );
}
