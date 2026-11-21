import { useMemo } from 'react';
import { Check, Building2 } from 'lucide-react';
import { tx } from '../../utils/terms';

interface Props {
  programs: any[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  /** Group the programs under their department headings (and tag disabled ones) — used by Super Admin. */
  showDepartment?: boolean;
  emptyText?: string;
}

/**
 * Multi-select of the programs (classes in a school) allowed to take a quiz. Shared by the add page and
 * both edit modals. Each program is a tick-card whose name can wrap; with `showDepartment` they are
 * grouped under their department, so the department is shown once as a heading instead of inside
 * every card. A count with Select all / Clear sits on the header line. Disabled programs are left out
 * (shown only if the quiz already has one, so it can be removed).
 */
export default function QuizProgramPicker({ programs: allPrograms, selectedIds, onChange, showDepartment, emptyText }: Props) {
  // Disabled programs are hidden — unless the quiz already has one, so it can still be unticked
  const programs = useMemo(
    () => allPrograms.filter((p: any) => p.enabled !== false || selectedIds.includes(p.id)),
    [allPrograms, selectedIds]);
  const toggle = (id: number) =>
    onChange(selectedIds.includes(id) ? selectedIds.filter(p => p !== id) : [...selectedIds, id]);
  const allIds = programs.map((p: any) => p.id as number);
  const allOn = allIds.length > 0 && allIds.every(id => selectedIds.includes(id));

  // Department groups, in first-seen order ("Other" for programs without one)
  const groups = useMemo(() => {
    if (!showDepartment) return [{ name: '', items: programs }];
    const map = new Map<string, any[]>();
    for (const p of programs) {
      const key = p.departmentName || tx('Other');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return Array.from(map, ([name, items]) => ({ name, items }));
  }, [programs, showDepartment]);
  const grouped = showDepartment && groups.length > 0;

  const setGroup = (items: any[], on: boolean) => {
    const ids = items.map(p => p.id as number);
    onChange(on ? Array.from(new Set([...selectedIds, ...ids])) : selectedIds.filter(id => !ids.includes(id)));
  };

  return (
    <div className="aq-field mt-4 qpp">
      <div className="qpp-head">
        <div className="qpp-head-text">
          <span className="aq-label">{tx('Allowed Programs')}</span>
          <span className="qpp-hint">{tx('Students in the selected programs can take this quiz.')}</span>
        </div>
        {programs.length > 0 && (
          <div className="qpp-head-tools">
            <span className="qpp-count">{selectedIds.filter(id => allIds.includes(id)).length} of {programs.length} selected</span>
            <button type="button" className="qpp-link" onClick={() => onChange(allOn ? selectedIds.filter(id => !allIds.includes(id)) : Array.from(new Set([...selectedIds, ...allIds])))}>
              {allOn ? 'Clear' : 'Select all'}
            </button>
          </div>
        )}
      </div>

      {programs.length === 0 ? (
        <p className="qpp-empty">{emptyText ?? tx('No programs available.')}</p>
      ) : (
        <div className="qpp-groups">
          {groups.map(g => {
            const groupOn = g.items.every((p: any) => selectedIds.includes(p.id));
            return (
              <div key={g.name || 'all'} className={grouped ? 'qpp-group' : undefined}>
                {grouped && (
                  <div className="qpp-group-head">
                    <span className="qpp-group-ico" aria-hidden><Building2 size={14} /></span>
                    <span className="qpp-group-text">
                      <span className="qpp-group-name" title={g.name}>{g.name}</span>
                      <span className="qpp-group-count">{g.items.length} {g.items.length === 1 ? tx('program') : tx('programs')}</span>
                    </span>
                    {g.items.length > 1 && (
                      <button type="button" className="qpp-link sm" onClick={() => setGroup(g.items, !groupOn)}>{groupOn ? 'Clear' : 'Select all'}</button>
                    )}
                  </div>
                )}
                <div className="qpp-grid">
                  {g.items.map((p: any) => {
                    const on = selectedIds.includes(p.id);
                    const off = showDepartment && p.enabled === false;
                    return (
                      <button key={p.id} type="button" role="checkbox" aria-checked={on}
                        className={`qpp-opt${on ? ' on' : ''}${off ? ' off' : ''}`} onClick={() => toggle(p.id)}
                        title={off ? tx('This program is disabled') : p.name}>
                        <span className="qpp-box" aria-hidden>{on && <Check size={12} strokeWidth={3} />}</span>
                        <span className="qpp-name">{p.name}</span>
                        {off && <span className="qpp-tag">Disabled</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <style>{`
        .qpp-head { display:flex; align-items:flex-end; justify-content:space-between; gap:8px 16px; flex-wrap:wrap; }
        .qpp-head-text { display:flex; flex-direction:column; gap:3px; min-width:0; }
        .qpp-hint { font-size:12px; font-weight:400; color:#7c8197; text-transform:none; letter-spacing:0; margin:0; }
        .qpp-head-tools { display:flex; align-items:center; gap:10px; font-size:12px; color:#7c8197; white-space:nowrap; }
        .qpp-link { border:none; background:none; padding:2px; cursor:pointer; font:600 12.5px inherit; font-family:inherit; color:var(--brand-text); }
        .qpp-link:hover { text-decoration:underline; }
        .qpp-link.sm { font-size:11.5px; }
        .qpp-link:focus-visible, .qpp-opt:focus-visible { outline:2px solid var(--brand); outline-offset:2px; }
        .qpp-empty { margin:0; padding:12px 14px; border-radius:10px; background:#f5f6fa; font-size:12.5px; color:#7c8197; }
        .qpp-groups { display:flex; flex-direction:column; gap:12px; margin-top:4px; }
        /* Each department is its own soft panel with a branded heading */
        .qpp-group { background:#f6f7fb; border:1px solid #eceef4; border-radius:16px; padding:12px; }
        .qpp-group-head { display:flex; align-items:center; gap:10px; margin:0 0 10px; }
        .qpp-group-ico { width:28px; height:28px; border-radius:9px; flex-shrink:0; display:flex; align-items:center; justify-content:center; background:var(--brand); color:var(--brand-contrast); }
        .qpp-group-text { flex:1; min-width:0; display:flex; align-items:baseline; gap:8px; flex-wrap:wrap; }
        .qpp-group-name { font-size:13.5px; font-weight:700; color:#1d2032; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:100%; }
        .qpp-group-count { font-size:12px; color:#7c8197; white-space:nowrap; }
        .qpp-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(min(100%, 200px), 1fr)); gap:8px; }
        .qpp-opt {
          display:flex; align-items:center; gap:10px; min-height:44px; padding:9px 12px; border-radius:12px; border:1px solid #e3e6ee;
          background:#fff; cursor:pointer; text-align:left; font-family:inherit; transition:border-color .15s, background .15s, box-shadow .15s;
        }
        .qpp-opt:hover { border-color:#cfd3de; }
        .qpp-box { width:18px; height:18px; border-radius:6px; border:1.5px solid #c5c9d6; background:#fff; flex-shrink:0; display:flex; align-items:center; justify-content:center; transition:background .15s, border-color .15s; }
        .qpp-name { flex:1; min-width:0; font-size:13px; font-weight:500; line-height:1.35; color:#3c4154; overflow-wrap:anywhere; }
        .qpp-tag { flex-shrink:0; font-size:10px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; padding:3px 7px; border-radius:999px; background:#fef2f2; color:#b91c1c; }
        .qpp-opt.on { border-color:var(--brand); background:var(--brand-soft); box-shadow:0 0 0 1px var(--brand) inset; }
        .qpp-opt.on .qpp-box { background:var(--brand); border-color:var(--brand); color:var(--brand-contrast); }
        .qpp-opt.on .qpp-name { color:var(--brand-text); font-weight:600; }
        .qpp-opt.off:not(.on) .qpp-name { color:#9a9eb0; }
      `}</style>
    </div>
  );
}
