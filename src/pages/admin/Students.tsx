import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  adminGetAllStudents, getStudentById, updateStudent, deleteStudent,
  adminPromoteStudent, adminPromoteAllAtLevel, adminPromoteSemesterAllAtLevel,
  saGetAllStudents, saPromoteStudent, saPromoteAllAtLevel, saPromoteSemesterAllAtLevel,
  getPrograms, registerStudent
} from "../../api/endpoints";
import { useAuth } from "../../contexts/AuthContext";
import { toggleAccount } from '../../components/admin/accountActions';
import { useFeature } from '../../hooks/useFeatureFlags';
import Swal from "sweetalert2";
import toast, { Toaster } from "react-hot-toast";
import PageHeader from "../../components/PageHeader";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import {
  Users, Search, Edit, Trash2, GraduationCap, Mail, Power,
  X, Save, Loader2, ChevronsUp, ArrowRight, RefreshCw, UserPlus,
} from "lucide-react";
import { defaultLevels, periodsPerLevel, tx } from '../../utils/terms';

const LEVEL_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  "100": { bg: "rgba(81,86,190,0.07)",  border: "#5156be", text: "#3730a3", badge: "#5156be" },
  "200": { bg: "rgba(42,181,125,0.07)", border: "#2ab57d", text: "#065f46", badge: "#2ab57d" },
  "300": { bg: "rgba(245,158,11,0.07)", border: "#f59e0b", text: "#92400e", badge: "#f59e0b" },
  "400": { bg: "rgba(253,98,94,0.07)",  border: "#fd625e", text: "#991b1b", badge: "#fd625e" },
  "500": { bg: "rgba(14,165,233,0.07)", border: "#0ea5e9", text: "#0c4a6e", badge: "#0ea5e9" },
  "600": { bg: "rgba(139,92,246,0.07)", border: "#8b5cf6", text: "#4c1d95", badge: "#8b5cf6" },
};
const colorFor = (level: string | number) =>
  LEVEL_COLORS[String(level)] ?? LEVEL_COLORS["100"];

export default function Students() {
  const auth = useAuth() as any;
  const isSuper = typeof auth.isSuperAdmin === "function" ? auth.isSuperAdmin() : false;
  const hodMayPromote = useFeature("HOD_PROMOTION");
  const canPromote = isSuper || hodMayPromote;   // the Super Admin can switch HOD promotion off

  const [students, setStudents]         = useState<any[]>([]);
  const [programs, setPrograms]         = useState<any[]>([]);
  const [search, setSearch]             = useState("");
  const [loading, setLoading]           = useState(false);
  const [editModal, setEditModal]       = useState(false);
  const [studentEdit, setStudentEdit]   = useState<any>({});
  const [saving, setSaving]             = useState(false);
  const [promotingId, setPromotingId]   = useState<number | null>(null);
  const [promotingLv, setPromotingLv]   = useState<string | null>(null);
  const [promotingSem, setPromotingSem] = useState<string | null>(null);
  const [programFilter, setProgramFilter]= useState<string>("");
  const emptyStudent = { firstname: "", lastname: "", username: "", email: "", phone: "", password: "", programId: "", currentLevel: "", currentSemester: "" };
  const [addModal, setAddModal]         = useState(false);
  const [newStudent, setNewStudent]     = useState<any>(emptyStudent);
  const [adding, setAdding]             = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [stuRaw, progRaw] = await Promise.all([
        isSuper ? saGetAllStudents() : adminGetAllStudents(),
        getPrograms().catch(() => []),
      ]);
      const stu = Array.isArray(stuRaw) ? stuRaw : stuRaw?.students ?? [];
      setStudents(stu);
      
      let allowedProgs = Array.isArray(progRaw) ? progRaw : [];
      if (auth.user?.role === "ADMIN" && auth.user?.department?.id) {
        allowedProgs = allowedProgs.filter((p: any) => 
          p.departmentId === auth.user.department.id || 
          p.department?.id === auth.user.department.id
        );
      }
      setPrograms(allowedProgs);
    } catch { toast.error(tx("Failed to load students")); }
    finally { setLoading(false); }
  }, [isSuper, auth.user]);

  useEffect(() => { load(); }, [load]);

  const filtered = students.filter(s => {
    if (programFilter && s.programId !== Number(programFilter)) return false;
    const q = search.toLowerCase();
    return !q || [s.firstname, s.lastname, s.fullName, s.email, s.username, s.program]
      .filter(Boolean).some((v: string) => v.toLowerCase().includes(q));
  });

  const grouped: Record<string, any[]> = {};
  filtered.forEach(s => {
    const lv = String(s.currentLevel ?? 0);
    (grouped[lv] = grouped[lv] || []).push(s);
  });
  const sortedLevels = Object.keys(grouped).sort((a, b) => Number(a) - Number(b));

  const getLevels = (s: any): number[] => {
    const prog = programs.find((p: any) => p.id === (s.programId || s.program_id));
    return prog?.configuredLevels ?? defaultLevels();
  };

  const nextLv = (s: any) => {
    const lvls = getLevels(s);
    const idx  = lvls.indexOf(s.currentLevel ?? 0);
    return idx >= 0 && idx < lvls.length - 1 ? lvls[idx + 1] : null;
  };

  const prevLv = (s: any) => {
    const lvls = getLevels(s);
    const idx  = lvls.indexOf(s.currentLevel ?? 0);
    return idx > 0 ? lvls[idx - 1] : null;
  };

  const nextLvForGroup = (level: string) => nextLv(grouped[level]?.[0] ?? {});

  const promoteOne = async (s: any, target: number) => {
    const fwd  = target > (s.currentLevel ?? 0);
    const name = s.fullName ?? `${s.firstname ?? ""} ${s.lastname ?? ""}`.trim();
    const conf = await Swal.fire({
      title: fwd ? tx("Promote Student") : tx("Demote Student"),
      html: tx(`Move <b>${name}</b> to <b>Level ${target}</b>?`),
      icon: fwd ? "question" : "warning",
      showCancelButton: true,
      confirmButtonText: fwd ? "Promote" : "Demote",
      confirmButtonColor: fwd ? "#5156be" : "#f59e0b",
      cancelButtonColor: "#adb5bd",
    });
    if (!conf.isConfirmed) return;
    setPromotingId(s.id);
    try {
      await (isSuper ? saPromoteStudent : adminPromoteStudent)(s.id, target);
      toast.success(tx(`Student moved to Level ${target}`));
      await load();
    } catch (e: any) {
      const body = e?.response?.data;
      if (e?.response?.status === 409 && Array.isArray(body?.reasons)) {
        // Blocked by the promotion rules — the Super Admin may override for this one student
        const reasons = body.reasons.map((r: string) => `<li>${r.replace(/</g, "&lt;")}</li>`).join("");
        const over = await Swal.fire({
          title: "Held back by promotion rules",
          html: `<ul style="text-align:left;margin:0">${reasons}</ul>`,
          icon: "warning",
          showCancelButton: body.canOverride,
          showConfirmButton: body.canOverride,
          confirmButtonText: "Promote anyway",
          cancelButtonText: body.canOverride ? tx("Keep at current level") : "OK",
          confirmButtonColor: "#f59e0b",
        });
        if (over.isConfirmed && isSuper) {
          try {
            await saPromoteStudent(s.id, target, true);
            toast.success(tx(`Student moved to Level ${target} (override)`));
            await load();
          } catch (e2: any) { toast.error(e2?.response?.data?.message ?? "Promotion failed"); }
        }
      } else {
        toast.error(body?.message ?? "Promotion failed");
      }
    } finally { setPromotingId(null); }
  };

  const promoteAll = async (level: string, target: number) => {
    if (!programFilter) {
      toast.error(tx("Please select a Program first before promoting in bulk."));
      return;
    }
    const count = grouped[level]?.length ?? 0;
    const conf  = await Swal.fire({
      title: tx("Promote Level"),
      html: tx(`Promote all <b>${count}</b> Level ${level} students in the selected program to <b>Level ${target}</b>?`),
      icon: "question", showCancelButton: true,
      confirmButtonText: tx(`Promote Level (${count})`),
      confirmButtonColor: "#5156be", cancelButtonColor: "#adb5bd",
    });
    if (!conf.isConfirmed) return;
    setPromotingLv(level);
    try {
      const res = await (isSuper ? saPromoteAllAtLevel : adminPromoteAllAtLevel)(Number(programFilter), Number(level), target);
      const held: any[] = res?.heldBack ?? [];
      if (held.length) {
        const rows = held.map((h: any) => `<li><b>${String(h.name).replace(/</g, "&lt;")}</b> — ${h.reasons.join("; ").replace(/</g, "&lt;")}</li>`).join("");
        await Swal.fire({ title: res.message, html: `<ul style="text-align:left;margin:0;max-height:300px;overflow:auto">${rows}</ul>`, icon: "info" });
      } else {
        toast.success(res?.message ?? tx(`${count} students promoted!`));
      }
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Bulk promotion failed");
    } finally { setPromotingLv(null); }
  };

  const promoteSemesterAll = async (level: string) => {
    if (!programFilter) {
      toast.error(tx("Please select a Program first before promoting in bulk."));
      return;
    }
    const count = grouped[level]?.length ?? 0;
    const conf  = await Swal.fire({
      title: tx("Promote Semester"),
      html: tx(`Promote all <b>${count}</b> Level ${level} students in the selected program to the next semester?`),
      icon: "question", showCancelButton: true,
      confirmButtonText: tx(`Promote Semester (${count})`),
      confirmButtonColor: "#2ab57d", cancelButtonColor: "#adb5bd",
    });
    if (!conf.isConfirmed) return;
    setPromotingSem(level);
    try {
      const res = await (isSuper ? saPromoteSemesterAllAtLevel : adminPromoteSemesterAllAtLevel)(Number(programFilter), Number(level));
      toast.success(res?.message ?? tx(`${count} students promoted to next semester!`));
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Bulk promotion failed");
    } finally { setPromotingSem(null); }
  };

  const demoteSemesterAll = async (level: string) => {
    if (!programFilter) {
      toast.error(tx("Please select a Program first before demoting in bulk."));
      return;
    }
    const count = grouped[level]?.length ?? 0;
    const conf  = await Swal.fire({
      title: tx("Demote Semester"),
      html: tx(`Demote all <b>${count}</b> Level ${level} students in the selected program to the previous semester?`),
      icon: "warning", showCancelButton: true,
      confirmButtonText: tx(`Demote Semester (${count})`),
      confirmButtonColor: "#f59e0b", cancelButtonColor: "#adb5bd",
    });
    if (!conf.isConfirmed) return;
    setPromotingSem(level + "-demote");
    try {
      const { saDemoteSemesterAllAtLevel, adminDemoteSemesterAllAtLevel } = await import("../../api/endpoints");
      const res = await (isSuper ? saDemoteSemesterAllAtLevel : adminDemoteSemesterAllAtLevel)(Number(programFilter), Number(level));
      toast.success(res?.message ?? tx(`${count} students demoted to previous semester!`));
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Bulk demotion failed");
    } finally { setPromotingSem(null); }
  };

  const openEdit = async (id: number) => {
    try { setStudentEdit(await getStudentById(id)); setEditModal(true); } catch {}
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await updateStudent(studentEdit.id, studentEdit);
      toast.success(tx("Student updated"));
      setEditModal(false); await load();
    } catch { toast.error("Update failed"); } finally { setSaving(false); }
  };

  const remove = async (id: number, name: string) => {
    const c = await Swal.fire({ title: tx("Delete Student?"), text: `Remove ${name}?`, icon: "warning",
      showCancelButton: true, confirmButtonText: "Delete",
      confirmButtonColor: "#fd625e", cancelButtonColor: "#adb5bd" });
    if (!c.isConfirmed) return;
    try { await deleteStudent(id); toast.success("Deleted"); await load(); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? "Delete failed", { duration: 6000 }); }
  };

  const saveNewStudent = async () => {
    if (!newStudent.firstname || !newStudent.lastname || !newStudent.username || !newStudent.password || !newStudent.programId || !newStudent.currentLevel || !newStudent.currentSemester) {
      toast.error(tx("Please fill in all required fields (Name, Student ID, Password, Program, Level, Semester)"));
      return;
    }
    setAdding(true);
    try {
      await registerStudent({ ...newStudent, programId: Number(newStudent.programId), currentLevel: Number(newStudent.currentLevel), currentSemester: Number(newStudent.currentSemester) });
      toast.success(tx("Student added successfully"));
      setAddModal(false);
      setNewStudent(emptyStudent);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? tx("Failed to add student"));
    } finally {
      setAdding(false);
    }
  };

  const editFields = (() => {
    const selectedProg = programs.find((p: any) => p.id === Number(studentEdit.programId));
    const semsCount = selectedProg?.semestersPerLevel?.[Number(studentEdit.currentLevel)] ?? periodsPerLevel();
    return [
      { key: "firstname", label: "First Name", autoComplete: "off" }, { key: "lastname", label: "Last Name", autoComplete: "off" },
      { key: "email", label: "Email", type: "email" }, { key: "username", label: "Username" }, { key: "phone", label: "Phone", type: "tel" },
      { key: "programId", label: tx("Program"), type: "programSelect" },
      { key: "currentLevel", label: tx("Level"), type: "select", options: selectedProg?.configuredLevels ?? defaultLevels() },
      { key: "currentSemester", label: tx("Semester"), type: "select", options: Array.from({ length: semsCount }, (_, i) => i + 1) },
    ] as Field[];
  })();

  const addFields = (() => {
    const selectedProg = programs.find((p: any) => p.id === Number(newStudent.programId));
    const semsCount = selectedProg?.semestersPerLevel?.[Number(newStudent.currentLevel)] ?? periodsPerLevel();
    return [
      { key: "firstname", label: "First Name", autoComplete: "off" }, { key: "lastname", label: "Last Name", autoComplete: "off" },
      { key: "email", label: "Email (Optional)", type: "email" }, { key: "phone", label: "Phone (Optional)", type: "tel" },
      { key: "username", label: tx("Student ID (Username)"), autoComplete: "off" }, { key: "password", label: "Password", type: "password", autoComplete: "new-password" },
      { key: "programId", label: tx("Program"), type: "programSelect" },
      { key: "currentLevel", label: tx("Level"), type: "select", options: selectedProg?.configuredLevels ?? defaultLevels() },
      { key: "currentSemester", label: tx("Semester"), type: "select", options: Array.from({ length: semsCount }, (_, i) => i + 1) },
    ] as Field[];
  })();

  const filtering = search !== "" || programFilter !== "";

  return (
    <div className="st" style={{ paddingBottom: 40 }}>
      <Toaster position="top-right" />
      <PageHeader title={tx("Students")} breadcrumbs={["Admin", tx("Students")]} />

      {/* Toolbar */}
      <div className="st-toolbar">
        <div className="st-search">
          <Search size={15} />
          <input className="st-input" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={tx("Search name, email, program…")} aria-label={tx("Search students")} />
        </div>
        <select className="st-input st-prog" value={programFilter} onChange={e => setProgramFilter(e.target.value)} aria-label={tx("Filter by program")}>
          <option value="">{tx("All Programs")}</option>
          {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button type="button" className="st-icon-btn" onClick={load} disabled={loading} title="Refresh" aria-label="Refresh">
          <RefreshCw size={15} color="#5156be" className={loading ? "st-spin" : undefined} />
        </button>
        <button type="button" className="st-btn" onClick={() => setAddModal(true)}>
          <UserPlus size={15} /> {tx("Add Student")}</button>
        <span className="st-count">{filtering ? `${filtered.length} of ${students.length}` : `${students.length} total`}</span>
      </div>

      {loading && students.length === 0 ? (
        <div className="st-loading"><Loader2 size={36} color="#5156be" className="st-spin" /></div>
      ) : sortedLevels.length === 0 ? (
        <div className="st-empty">
          <Users size={40} style={{ marginBottom: 12 }} />
          <p style={{ fontWeight: 700, margin: 0 }}>{tx("No students found")}</p>
          {filtering && <button type="button" className="st-link" onClick={() => { setSearch(""); setProgramFilter(""); }}>Clear search and filter</button>}
        </div>
      ) : sortedLevels.map(level => {
        const col   = colorFor(level);
        const grp   = grouped[level];
        const nxtG  = nextLvForGroup(level);
        const bulky = promotingLv === level;

        return (
          <section key={level} className="st-group" aria-label={`${tx("Level ")}${level}`}>
            {/* Level header */}
            <div className="st-group-head" style={{ background: col.bg, borderBottomColor: `${col.badge}30` }}>
              <div className="st-group-title">
                <span className="st-level" style={{ background: col.badge }}>{tx("Level ")}{level}</span>
                <span style={{ color: col.text }}>{grp.length} {tx("student")}{grp.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="st-bulk">
                {programFilter && canPromote ? (
                  <>
                    <button type="button" className="st-bulk-btn" onClick={() => demoteSemesterAll(level)} disabled={promotingSem === level + "-demote" || bulky}
                      style={{ background: "rgba(245,158,11,0.15)", color: "#92400e", borderColor: "#f59e0b" }}>
                      {promotingSem === level + "-demote" ? <Loader2 size={13} className="st-spin" /> : <ArrowRight size={13} style={{ transform: "rotate(180deg)" }} />}
                      {tx("Demote Semester")}</button>
                    <button type="button" className="st-bulk-btn" onClick={() => promoteSemesterAll(level)} disabled={promotingSem === level || bulky}
                      style={{ background: "rgba(42,181,125,0.15)", color: "#065f46", borderColor: "#2ab57d" }}>
                      {promotingSem === level ? <Loader2 size={13} className="st-spin" /> : <ArrowRight size={13} />}
                      {tx("Promote Semester")}</button>
                    {nxtG ? (
                      <button type="button" className="st-bulk-btn" onClick={() => promoteAll(level, nxtG)} disabled={bulky || promotingSem === level}
                        style={{ background: col.badge, color: "#fff", borderColor: col.badge }}>
                        {bulky ? <Loader2 size={13} className="st-spin" /> : <ChevronsUp size={13} />}
                        {tx("Promote Level ")}{nxtG}
                      </button>
                    ) : (
                      <span className="st-bulk-note" style={{ color: col.text }}>
                        {isSuper ? tx("Final level (Super Admin can demote)") : tx("Final Level")}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="st-bulk-note" style={{ color: col.text, fontStyle: "italic" }}>
                    {tx("Select a Program to enable bulk promotion")}</span>
                )}
              </div>
            </div>

            {/* Student rows */}
            {grp.map(s => {
              const name  = s.fullName ?? `${s.firstname ?? ""} ${s.lastname ?? ""}`.trim();
              const nxt   = nextLv(s);
              const prv   = prevLv(s);
              const isPro = promotingId === s.id;

              return (
                <div key={s.id} className="st-row">
                  <div className="st-avatar" style={{ background: `linear-gradient(135deg,${col.badge},${col.badge}99)` }} aria-hidden>
                    {name.charAt(0).toUpperCase()}
                  </div>

                  <div className="st-info">
                    <div className="st-name" title={name}>
                      {name}
                      {s.enabled === false && <span className="st-off" title="This account can't sign in">Deactivated</span>}
                    </div>
                    <div className="st-meta">
                      {s.email && <span><Mail size={10} />{s.email}</span>}
                      {s.program && <span><GraduationCap size={10} />{s.program}</span>}
                      {s.currentSemester > 0 && <span style={{ color: col.badge, fontWeight: 700 }}>Sem {s.currentSemester}</span>}
                    </div>
                  </div>

                  <div className="st-actions">
                    {isSuper && prv && (
                      <button type="button" className="st-move" onClick={() => promoteOne(s, prv)} disabled={isPro}
                        title={tx(`Demote to Level ${prv}`)} aria-label={tx(`Demote ${name} to Level ${prv}`)}
                        style={{ borderColor: "#f59e0b", background: "rgba(245,158,11,0.07)", color: "#b45309" }}>
                        <ArrowRight size={11} style={{ transform: "rotate(180deg)" }} />L{prv}
                      </button>
                    )}
                    {nxt && canPromote && (
                      <button type="button" className="st-move" onClick={() => promoteOne(s, nxt)} disabled={isPro}
                        title={tx(`Promote to Level ${nxt}`)} aria-label={tx(`Promote ${name} to Level ${nxt}`)}
                        style={{ borderColor: col.badge, background: col.bg, color: col.text }}>
                        {isPro ? <Loader2 size={11} className="st-spin" /> : <ChevronsUp size={11} />}
                        L{nxt}
                      </button>
                    )}
                    <span className="st-actions-spacer" />
                    <button type="button" className="st-icon" onClick={() => openEdit(s.id)} title="Edit" aria-label={`Edit ${name}`}
                      style={{ borderColor: "#e2e8f0", background: "#f8fafc" }}>
                      <Edit size={13} color="#5156be" />
                    </button>
                    <button type="button" className="st-icon" onClick={() => toggleAccount(s, name, load)} title={s.enabled === false ? "Reactivate account" : "Deactivate account"}
                      aria-label={s.enabled === false ? `Reactivate ${name}` : `Deactivate ${name}`}
                      style={{ borderColor: s.enabled === false ? "#bbf7d0" : "#fde68a", background: s.enabled === false ? "#f0fdf4" : "#fffbeb" }}>
                      <Power size={13} color={s.enabled === false ? "#16a34a" : "#b45309"} />
                    </button>
                    <button type="button" className="st-icon" onClick={() => remove(s.id, name)} title="Delete" aria-label={`Delete ${name}`}
                      style={{ borderColor: "#fee2e2", background: "#fff5f5" }}>
                      <Trash2 size={13} color="#fd625e" />
                    </button>
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}

      {/* Edit Modal */}
      {editModal && (
        <StudentModal title={tx("Edit Student")} busy={saving} onClose={() => setEditModal(false)}
          footer={<>
            <button type="button" className="st-ghost" onClick={() => setEditModal(false)} disabled={saving}>Cancel</button>
            <button type="button" className="st-btn" onClick={saveEdit} disabled={saving}>
              {saving ? <Loader2 size={14} className="st-spin" /> : <Save size={14} />}Save
            </button>
          </>}>
          <FormFields fields={editFields} programs={programs} value={studentEdit}
            onChange={(key, v, isSelect) => setStudentEdit((p: any) => ({ ...p, [key]: isSelect ? Number(v) : v }))} />
        </StudentModal>
      )}
      {/* Add Modal */}
      {addModal && (
        <StudentModal title={tx("Add New Student")} busy={adding} onClose={() => setAddModal(false)}
          footer={<>
            <button type="button" className="st-ghost" onClick={() => setAddModal(false)} disabled={adding}>Cancel</button>
            <button type="button" className="st-btn" onClick={saveNewStudent} disabled={adding}>
              {adding ? <Loader2 size={14} className="st-spin" /> : <UserPlus size={14} />} {tx("Add Student")}</button>
          </>}>
          <FormFields fields={addFields} programs={programs} value={newStudent} markRequired
            onChange={(key, v) => setNewStudent((p: any) => ({ ...p, [key]: v }))} />
        </StudentModal>
      )}
      <style>{STUDENTS_CSS}</style>
    </div>
  );
}

type Field = { key: string; label: string; type?: "select" | "programSelect" | "email" | "tel" | "password"; options?: number[]; autoComplete?: string };

/** The student form's fields; selects report `isSelect` so the edit form can keep numeric ids. */
function FormFields({ fields, programs, value, onChange, markRequired }: {
  fields: Field[]; programs: any[]; value: any; markRequired?: boolean;
  onChange: (key: string, v: string, isSelect: boolean) => void;
}) {
  return (
    <div className="st-form">
      {fields.map(f => {
        const id = `st-f-${f.key}`;
        return (
          <div key={f.key}>
            <label className="st-label" htmlFor={id}>
              {f.label} {markRequired && !f.label.includes("Optional") && <span style={{ color: "#fd625e" }}>*</span>}
            </label>
            {f.type === "select" ? (
              <select id={id} className="st-input" value={value[f.key] ?? ""} onChange={e => onChange(f.key, e.target.value, true)}>
                <option value="" disabled>Select {f.label}</option>
                {(f.options ?? []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            ) : f.type === "programSelect" ? (
              <select id={id} className="st-input" value={value[f.key] ?? ""} onChange={e => onChange(f.key, e.target.value, true)}>
                <option value="" disabled>{tx("Select Program")}</option>
                {programs.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            ) : (
              <input id={id} className="st-input" type={f.type || "text"} autoComplete={f.autoComplete}
                value={value[f.key] ?? ""} onChange={e => onChange(f.key, e.target.value, false)} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Scrollable dialog on <body>: centred on larger screens, a bottom sheet on phones; Esc or a click outside closes it. */
function StudentModal({ title, busy, onClose, footer, children }: {
  title: string; busy: boolean; onClose: () => void; footer: React.ReactNode; children: React.ReactNode;
}) {
  useBodyScrollLock();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  return createPortal(
    <div className="st-overlay" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="st-modal" role="dialog" aria-modal="true" aria-labelledby="st-modal-title">
        <div className="st-modal-head">
          <h3 id="st-modal-title">{title}</h3>
          <button type="button" className="st-close" onClick={onClose} disabled={busy} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="st-modal-body">{children}</div>
        <div className="st-modal-foot">{footer}</div>
      </div>
    </div>,
    document.body,
  );
}

const STUDENTS_CSS = `
.st { container: st / inline-size; }
.st-toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 22px; flex-wrap: wrap; }
.st-input { width: 100%; height: 40px; padding: 0 12px; border: 1.5px solid #e2e8f0; border-radius: 10px; font: inherit; font-size: 14px; color: #1e293b; background: #fff; outline: none; box-sizing: border-box; transition: border-color .15s, box-shadow .15s; }
.st-input:focus { border-color: #5156be; box-shadow: 0 0 0 3px rgba(81,86,190,0.15); }
select.st-input { cursor: pointer; }
.st-search { position: relative; flex: 1 1 240px; min-width: 0; max-width: 440px; }
.st-search svg { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: #adb5bd; pointer-events: none; }
.st-search .st-input { padding-left: 36px; }
.st-prog { width: auto; min-width: 150px; max-width: 260px; flex: 0 1 auto; }
.st-icon-btn { height: 40px; width: 40px; flex-shrink: 0; border: 1.5px solid #e2e8f0; background: #fff; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.st-icon-btn:disabled { opacity: .6; cursor: default; }
.st-btn, .st-ghost { height: 40px; padding: 0 16px; border-radius: 10px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; font: inherit; font-weight: 700; font-size: 13px; white-space: nowrap; transition: filter .15s, background .15s; }
.st-btn { border: none; background: #5156be; color: #fff; }
.st-btn:hover:not(:disabled) { filter: brightness(1.08); }
.st-ghost { border: 1.5px solid #e2e8f0; background: #f8fafc; color: #1e293b; }
.st-ghost:hover:not(:disabled) { background: #f1f5f9; }
.st-btn:disabled, .st-ghost:disabled { opacity: .65; cursor: not-allowed; }
.st-count { font-size: 13px; color: #94a3b8; font-weight: 600; margin-left: auto; white-space: nowrap; }
.st-link { background: none; border: none; padding: 0; margin-top: 8px; color: #7a6fbe; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
.st-loading { display: flex; justify-content: center; padding: 60px 0; }
.st-empty { text-align: center; padding: 60px 20px; color: #adb5bd; }
.st-spin { animation: st-spin 1s linear infinite; }

.st-group { margin-bottom: 24px; border-radius: 14px; overflow: hidden; background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
.st-group-head { display: flex; align-items: center; justify-content: space-between; gap: 10px 14px; flex-wrap: wrap; border-bottom: 2px solid; padding: 12px 18px; }
.st-group-title { display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 600; }
.st-level { color: #fff; font-weight: 800; font-size: 13px; padding: 4px 14px; border-radius: 20px; white-space: nowrap; }
.st-bulk { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.st-bulk-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 0 14px; height: 32px; border: 1px solid; border-radius: 8px; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; }
.st-bulk-btn:disabled { opacity: .7; cursor: not-allowed; }
.st-bulk-note { font-size: 11px; font-weight: 600; opacity: .7; }

.st-row { display: flex; align-items: center; gap: 12px; padding: 12px 18px; background: #fff; border-bottom: 1px solid #f1f5f7; }
.st-row:last-child { border-bottom: none; }
.st-row:hover { background: #fafbff; }
.st-avatar { width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; font-size: 15px; }
.st-info { flex: 1; min-width: 0; }
.st-name { font-weight: 700; font-size: 14px; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.st-off { display: inline-block; vertical-align: 1px; margin-left: 8px; font-size: 10.5px; font-weight: 800; padding: 2px 7px; border-radius: 6px; background: #fdeeee; color: #9f1f1f; }
.st-meta { display: flex; flex-wrap: wrap; gap: 4px 10px; margin-top: 3px; font-size: 11px; color: #64748b; min-width: 0; }
.st-meta > span { display: inline-flex; align-items: center; gap: 3px; min-width: 0; overflow-wrap: anywhere; }
.st-meta svg { flex-shrink: 0; }
.st-actions { display: flex; gap: 5px; flex-shrink: 0; align-items: center; }
.st-actions-spacer { display: none; }
.st-move { height: 30px; padding: 0 10px; border-radius: 7px; border: 1.5px solid; cursor: pointer; font: inherit; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 3px; }
.st-icon { width: 30px; height: 30px; border-radius: 7px; border: 1.5px solid; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.st-move:disabled, .st-icon:disabled { opacity: .6; cursor: not-allowed; }
.st-icon-btn:focus-visible, .st-btn:focus-visible, .st-ghost:focus-visible, .st-bulk-btn:focus-visible, .st-move:focus-visible, .st-icon:focus-visible, .st-close:focus-visible { outline: 2px solid #5156be; outline-offset: 2px; }

.st-overlay { position: fixed; inset: 0; height: 100vh; height: 100dvh; box-sizing: border-box; overscroll-behavior: contain; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px; animation: st-fade .15s ease-out; }
.st-modal { width: 100%; max-width: 560px; max-height: 100%; display: flex; flex-direction: column; background: #fff; border-radius: 16px; box-shadow: 0 25px 60px rgba(0,0,0,0.3); color: #1e293b; animation: st-pop .18s ease-out; }
.st-modal-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 20px 24px 14px; border-bottom: 1px solid #f1f5f9; }
.st-modal-head h3 { margin: 0; font-size: 18px; font-weight: 800; }
.st-close { width: 36px; height: 36px; border-radius: 8px; border: none; background: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #475569; }
.st-close:hover:not(:disabled) { background: #f1f5f9; }
.st-modal-body { padding: 18px 24px; overflow-y: auto; overscroll-behavior: contain; flex: 1 1 auto; min-height: 0; }
.st-modal-foot { display: flex; gap: 10px; padding: 14px 24px; border-top: 1px solid #f1f5f9; }
.st-modal-foot > button { flex: 1 1 0; }
.st-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr)); gap: 14px 16px; }
.st-label { font-size: 12px; font-weight: 700; color: #64748b; display: block; margin-bottom: 5px; }
.st-form .st-input { border-radius: 8px; background: #fff; }

@container st (max-width: 640px) {
  .st-toolbar { margin-bottom: 16px; }
  .st-search { flex-basis: 100%; max-width: none; }
  .st-prog { flex: 1 1 0; min-width: 0; max-width: none; }
  .st-btn { flex: 0 0 auto; }
  .st-count { flex-basis: 100%; margin-left: 0; }
  .st-group { margin-bottom: 18px; }
  .st-group-head { padding: 12px 14px; }
  .st-bulk { width: 100%; }
  .st-bulk-btn { flex: 1 1 auto; }
  .st-row { flex-wrap: wrap; padding: 12px 14px; row-gap: 10px; }
  .st-actions { flex-basis: 100%; padding-left: 50px; flex-wrap: wrap; }
  .st-actions-spacer { display: block; flex: 1; }
}
@container st (max-width: 380px) {
  .st-btn { flex: 1 1 100%; order: 1; }
  .st-actions { padding-left: 0; }
}
@media (max-width: 640px) {
  .st-overlay { align-items: flex-end; padding: 0; }
  .st-modal { max-width: none; max-height: 92vh; max-height: 92dvh; border-radius: 20px 20px 0 0; animation: st-sheet .22s ease-out; }
  .st-modal::before { content: ''; display: block; width: 38px; height: 4px; border-radius: 4px; background: #e2e8f0; margin: 8px auto 0; flex-shrink: 0; }
  .st-modal-head { padding: 10px 16px 12px; }
  .st-modal-body { padding: 16px; }
  .st-modal-foot { padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); }
  /* 16px stops iOS Safari zooming into a field when it gets focus */
  .st-input { font-size: 16px; }
}
@media (pointer: coarse) {
  .st-input, .st-btn, .st-ghost, .st-icon-btn { height: 44px; }
  .st-icon-btn { width: 44px; }
  .st-bulk-btn { height: 40px; }
  .st-move { height: 38px; padding: 0 12px; }
  .st-icon { width: 38px; height: 38px; }
}
@media (prefers-reduced-motion: reduce) {
  .st-overlay, .st-modal { animation-duration: .01ms !important; }
}
@keyframes st-spin { to { transform: rotate(360deg); } }
@keyframes st-fade { from { opacity: 0; } }
@keyframes st-pop { from { opacity: 0; transform: translateY(8px) scale(.98); } }
@keyframes st-sheet { from { transform: translateY(100%); } }
`;
