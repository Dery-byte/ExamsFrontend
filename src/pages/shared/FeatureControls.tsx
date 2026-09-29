import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ToggleRight, Loader2, Lock, Building2, ChevronDown, ChevronRight, Globe } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import {
  getFeatures, saGetDepartments, setFeatureForDepartment, setFeatureSystemWide, type FeatureKey,
} from '../../api/endpoints';
import { tx } from '../../utils/terms';

type Feature = {
  key: FeatureKey; label: string; description: string; audience: string; scope: 'SYSTEM' | 'DEPARTMENT';
  systemEnabled: boolean;
  departments?: { departmentId: number; departmentName: string; enabled: boolean; updatedBy?: string }[];   // Super Admin view
  departmentSetting?: boolean | null; effective?: boolean; departmentName?: string;                       // HOD view
};

function Switch({ on, disabled, busy, label, onChange }: { on: boolean; disabled?: boolean; busy?: boolean; label: string; onChange: () => void }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} disabled={disabled || busy} onClick={onChange}
      className={`fc-switch ${on ? 'is-on' : ''}`}>
      {busy ? <Loader2 size={12} className="fc-spin" /> : <span className="fc-knob" />}
    </button>
  );
}

/**
 * Super Admin: every feature's system-wide switch, plus per-department choices for department-level features.
 * HOD: department-level features for their own department (only while the Super Admin has them on).
 */
export default function FeatureControls() {
  const { user } = useAuth() as any;
  const isSuper = user?.role === 'SUPER_ADMIN';
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [departments, setDepartments] = useState<any[]>([]);

  const { data = [], isLoading, isError, error } = useQuery<Feature[]>({ queryKey: ['features'], queryFn: getFeatures });

  useEffect(() => {
    if (isSuper) saGetDepartments().then((d: any) => setDepartments(Array.isArray(d) ? d : [])).catch(() => {});
  }, [isSuper]);

  const groups = useMemo(() => {
    const m = new Map<string, Feature[]>();
    data.forEach(f => m.set(f.audience, [...(m.get(f.audience) ?? []), f]));
    return Array.from(m.entries());
  }, [data]);

  const apply = async (id: string, call: () => Promise<any>, msg: string) => {
    setBusy(id);
    try {
      const next = await call();
      qc.setQueryData(['features'], next);
      qc.invalidateQueries({ queryKey: ['feature-flags'] });   // menus update right away
      toast.success(msg);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Could not save the change');
    } finally {
      setBusy(null);
    }
  };

  const toggleSystem = (f: Feature) =>
    apply(f.key, () => setFeatureSystemWide(f.key, !f.systemEnabled), `${f.label} ${f.systemEnabled ? 'turned off' : 'turned on'} system-wide`);

  const setDept = (f: Feature, deptId: number, value: boolean | null, deptName: string) =>
    apply(`${f.key}:${deptId}`, () => setFeatureForDepartment(f.key, deptId, value),
      `${f.label}: ${value === null ? 'follows the system switch' : value ? 'on' : 'off'} for ${deptName}`);

  return (
    <div style={{ paddingBottom: 40 }}>
      <PageHeader title={isSuper ? 'Feature Controls' : 'Department Settings'} breadcrumbs={[isSuper ? 'Super Admin' : 'Admin', isSuper ? 'Feature Controls' : 'Department Settings']} />

      <p className="fc-intro">
        {isSuper
          ? <>Switch features on or off for the whole system. <b>{tx("Department-level")}</b> {tx("features can also be switched per department, by you or by that department's HOD, as long as the system switch is on.")}</>
          : <>Choose which features are available in <b>{data[0]?.departmentName ?? 'your department'}</b>. A feature the Super Admin has turned off can't be switched on here.</>}
      </p>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader2 size={26} color="#5156be" className="fc-spin" /></div>
      ) : isError ? (
        <div className="fc-empty">{(error as any)?.response?.data?.message ?? 'Could not load the settings.'}</div>
      ) : groups.map(([audience, list]) => (
        <section key={audience} className="fc-group">
          <h2>{audience === 'HODs' ? tx('For HODs') : audience === 'Staff' ? tx('For lecturers & HODs') : `For ${audience.toLowerCase()}`}</h2>
          {list.map(f => {
            const hodView = !isSuper;
            const on = hodView ? !!f.effective : f.systemEnabled;
            const lockedBySuper = hodView && !f.systemEnabled;
            const overrides = new Map((f.departments ?? []).map(d => [d.departmentId, d]));
            return (
              <article key={f.key} className={`fc-card ${on ? '' : 'is-off'}`}>
                <div className="fc-row">
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="fc-title">
                      {f.label}
                      <span className={`fc-scope ${f.scope === 'SYSTEM' ? 'sys' : 'dep'}`}>
                        {f.scope === 'SYSTEM' ? <><Globe size={11} /> System-wide</> : <><Building2 size={11} /> {tx("Department-level")}</>}
                      </span>
                    </div>
                    <p className="fc-desc">{f.description}</p>
                    {lockedBySuper && <p className="fc-lock"><Lock size={12} /> Turned off by the Super Admin for the whole system.</p>}
                    {isSuper && f.scope === 'DEPARTMENT' && overrides.size > 0 && (
                      <p className="fc-note">{overrides.size} department{overrides.size > 1 ? 's have' : ' has'} its own setting.</p>
                    )}
                  </div>
                  <div className="fc-state">
                    <span>{on ? 'On' : 'Off'}</span>
                    <Switch on={on} busy={busy === f.key || busy === `${f.key}:${user?.department?.id}`} disabled={lockedBySuper}
                      label={`${f.label}: ${on ? 'on' : 'off'}`}
                      onChange={() => hodView
                        // HOD: "on" means follow the (on) system switch; "off" is a department choice
                        ? setDept(f, user.department.id, on ? false : null, f.departmentName ?? 'your department')
                        : toggleSystem(f)} />
                  </div>
                </div>

                {isSuper && f.scope === 'DEPARTMENT' && (
                  <>
                    <button className="fc-expand" onClick={() => setOpen(o => ({ ...o, [f.key]: !o[f.key] }))} aria-expanded={!!open[f.key]}>
                      {open[f.key] ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Per-department settings
                    </button>
                    {open[f.key] && (
                      <div className="fc-depts">
                        {!f.systemEnabled && <p className="fc-lock"><Lock size={12} /> Off system-wide: department choices apply again once it's switched back on.</p>}
                        {departments.length === 0 ? <p className="fc-note">No departments yet.</p> : departments.map(d => {
                          const o = overrides.get(d.id);
                          const value: 'follow' | 'on' | 'off' = !o ? 'follow' : o.enabled ? 'on' : 'off';
                          const id = `${f.key}:${d.id}`;
                          return (
                            <div key={d.id} className="fc-dept">
                              <span className="fc-dept-name">{d.name}{o?.updatedBy && <small> · set by {o.updatedBy}</small>}</span>
                              <div className="fc-seg" role="radiogroup" aria-label={`${f.label} for ${d.name}`}>
                                {(['follow', 'on', 'off'] as const).map(v => (
                                  <button key={v} role="radio" aria-checked={value === v} disabled={busy === id}
                                    className={value === v ? 'is-on' : ''}
                                    onClick={() => value !== v && setDept(f, d.id, v === 'follow' ? null : v === 'on', d.name)}>
                                    {v === 'follow' ? 'Follow system' : v === 'on' ? 'On' : 'Off'}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </article>
            );
          })}
        </section>
      ))}

      {!isLoading && !isError && data.length === 0 && (
        <div className="fc-empty"><ToggleRight size={30} /><p>No settings available.</p></div>
      )}

      <style>{`
        .fc-intro { font-size: 13px; color: #475569; margin: 0 0 16px; line-height: 1.55; max-width: 760px; }
        .fc-group { margin-bottom: 18px; }
        .fc-group h2 { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin: 0 0 8px; }
        .fc-card { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; margin-bottom: 8px; }
        .fc-card.is-off { background: #fafafa; }
        .fc-row { display: flex; gap: 14px; align-items: flex-start; }
        .fc-title { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-weight: 800; font-size: 14.5px; color: #1e293b; }
        .fc-scope { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 700; padding: 2px 7px; border-radius: 6px; }
        .fc-scope.sys { background: #eef2ff; color: #4338ca; }
        .fc-scope.dep { background: #ecfeff; color: #0e7490; }
        .fc-desc { margin: 4px 0 0; font-size: 12.5px; color: #64748b; line-height: 1.5; }
        .fc-note { margin: 6px 0 0; font-size: 12px; color: #475569; }
        .fc-lock { display: flex; align-items: center; gap: 5px; margin: 6px 0 0; font-size: 12px; color: #9f1f1f; font-weight: 600; }
        .fc-state { display: flex; align-items: center; gap: 8px; flex-shrink: 0; font-size: 12px; font-weight: 700; color: #475569; }
        .fc-switch { position: relative; width: 46px; height: 26px; border-radius: 13px; border: none; background: #cbd5e1; cursor: pointer; transition: background 0.2s; display: flex; align-items: center; justify-content: center; }
        .fc-switch.is-on { background: #10b981; }
        .fc-switch:disabled { cursor: not-allowed; opacity: 0.55; }
        .fc-knob { position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: left 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
        .fc-switch.is-on .fc-knob { left: 23px; }
        .fc-switch .fc-spin { color: #fff; }
        .fc-expand { display: inline-flex; align-items: center; gap: 4px; margin-top: 10px; border: none; background: none; color: #5156be; font-weight: 700; font-size: 12.5px; cursor: pointer; padding: 0; }
        .fc-depts { margin-top: 8px; border-top: 1px solid #f1f5f9; padding-top: 8px; }
        .fc-dept { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 6px 0; flex-wrap: wrap; }
        .fc-dept-name { font-size: 13px; color: #1e293b; font-weight: 600; }
        .fc-dept-name small { color: #94a3b8; font-weight: 500; }
        .fc-seg { display: inline-flex; border: 1.5px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
        .fc-seg button { border: none; background: #fff; padding: 5px 10px; font-size: 12px; font-weight: 600; color: #475569; cursor: pointer; border-right: 1px solid #e2e8f0; }
        .fc-seg button:last-child { border-right: none; }
        .fc-seg button.is-on { background: #5156be; color: #fff; }
        .fc-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 40px; color: #94a3b8; background: #fff; border: 1.5px dashed #e2e8f0; border-radius: 12px; }
        .fc-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
