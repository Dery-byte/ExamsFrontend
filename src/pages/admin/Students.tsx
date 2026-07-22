import { useState, useEffect, useCallback } from "react";
import {
  adminGetAllStudents, getStudentById, updateStudent, deleteStudent,
  adminPromoteStudent, adminPromoteAllAtLevel, adminPromoteSemesterAllAtLevel,
  saGetAllStudents, saPromoteStudent, saPromoteAllAtLevel, saPromoteSemesterAllAtLevel,
  getPrograms, registerStudent
} from "../../api/endpoints";
import { useAuth } from "../../contexts/AuthContext";
import Swal from "sweetalert2";
import toast, { Toaster } from "react-hot-toast";
import PageHeader from "../../components/PageHeader";
import {
  Users, Search, Edit, Trash2, GraduationCap, Mail,
  X, Save, Loader2, ChevronsUp, ArrowRight, RefreshCw, UserPlus,
} from "lucide-react";

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
    } catch { toast.error("Failed to load students"); }
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
    return prog?.configuredLevels ?? [100, 200, 300, 400];
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
      title: fwd ? "Promote Student" : "Demote Student",
      html: `Move <b>${name}</b> to <b>Level ${target}</b>?`,
      icon: fwd ? "question" : "warning",
      showCancelButton: true,
      confirmButtonText: fwd ? "Promote ?" : "? Demote",
      confirmButtonColor: fwd ? "#5156be" : "#f59e0b",
      cancelButtonColor: "#adb5bd",
    });
    if (!conf.isConfirmed) return;
    setPromotingId(s.id);
    try {
      await (isSuper ? saPromoteStudent : adminPromoteStudent)(s.id, target);
      toast.success(`Student moved to Level ${target}`);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Promotion failed");
    } finally { setPromotingId(null); }
  };

  const promoteAll = async (level: string, target: number) => {
    if (!programFilter) {
      toast.error("Please select a Program first before promoting in bulk.");
      return;
    }
    const count = grouped[level]?.length ?? 0;
    const conf  = await Swal.fire({
      title: "Promote Level",
      html: `Promote all <b>${count}</b> Level ${level} students in the selected program to <b>Level ${target}</b>?`,
      icon: "question", showCancelButton: true,
      confirmButtonText: `Promote Level (${count})`,
      confirmButtonColor: "#5156be", cancelButtonColor: "#adb5bd",
    });
    if (!conf.isConfirmed) return;
    setPromotingLv(level);
    try {
      const res = await (isSuper ? saPromoteAllAtLevel : adminPromoteAllAtLevel)(Number(programFilter), Number(level), target);
      toast.success(res?.message ?? `${count} students promoted!`);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Bulk promotion failed");
    } finally { setPromotingLv(null); }
  };

  const promoteSemesterAll = async (level: string) => {
    if (!programFilter) {
      toast.error("Please select a Program first before promoting in bulk.");
      return;
    }
    const count = grouped[level]?.length ?? 0;
    const conf  = await Swal.fire({
      title: "Promote Semester",
      html: `Promote all <b>${count}</b> Level ${level} students in the selected program to the next semester?`,
      icon: "question", showCancelButton: true,
      confirmButtonText: `Promote Semester (${count})`,
      confirmButtonColor: "#2ab57d", cancelButtonColor: "#adb5bd",
    });
    if (!conf.isConfirmed) return;
    setPromotingSem(level);
    try {
      const res = await (isSuper ? saPromoteSemesterAllAtLevel : adminPromoteSemesterAllAtLevel)(Number(programFilter), Number(level));
      toast.success(res?.message ?? `${count} students promoted to next semester!`);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Bulk promotion failed");
    } finally { setPromotingSem(null); }
  };

  const openEdit = async (id: number) => {
    try { setStudentEdit(await getStudentById(id)); setEditModal(true); } catch {}
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await updateStudent(studentEdit.id, studentEdit);
      toast.success("Student updated");
      setEditModal(false); await load();
    } catch { toast.error("Update failed"); } finally { setSaving(false); }
  };

  const remove = async (id: number, name: string) => {
    const c = await Swal.fire({ title: "Delete Student?", text: `Remove ${name}?`, icon: "warning",
      showCancelButton: true, confirmButtonText: "Delete",
      confirmButtonColor: "#fd625e", cancelButtonColor: "#adb5bd" });
    if (!c.isConfirmed) return;
    try { await deleteStudent(id); toast.success("Deleted"); await load(); }
    catch { toast.error("Delete failed"); }
  };

  const saveNewStudent = async () => {
    if (!newStudent.firstname || !newStudent.lastname || !newStudent.username || !newStudent.password || !newStudent.programId || !newStudent.currentLevel || !newStudent.currentSemester) {
      toast.error("Please fill in all required fields (Name, Student ID, Password, Program, Level, Semester)");
      return;
    }
    setAdding(true);
    try {
      await registerStudent({ ...newStudent, programId: Number(newStudent.programId), currentLevel: Number(newStudent.currentLevel), currentSemester: Number(newStudent.currentSemester) });
      toast.success("Student added successfully");
      setAddModal(false);
      setNewStudent(emptyStudent);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to add student");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      <Toaster position="top-right" />
      <PageHeader title="Students" breadcrumbs={["Admin", "Students"]} />

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 22, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 440 }}>
          <Search size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#adb5bd" }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, program…"
            style={{ width: "100%", paddingLeft: 36, height: 40, border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        </div>
        <select value={programFilter} onChange={e => setProgramFilter(e.target.value)}
          style={{ height: 40, padding: "0 14px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, outline: "none", background: "#fff", cursor: "pointer", minWidth: 150 }}>
          <option value="">All Programs</option>
          {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button onClick={load} title="Refresh"
          style={{ height: 40, width: 40, border: "1.5px solid #e2e8f0", background: "#fff", borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <RefreshCw size={15} color="#5156be" />
        </button>
        <button onClick={() => setAddModal(true)} title="Add Student"
          style={{ height: 40, padding: "0 16px", border: "none", background: "#5156be", color: "#fff", borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 13 }}>
          <UserPlus size={15} /> Add Student
        </button>
        <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600, marginLeft: "auto" }}>{students.length} total</span>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
          <Loader2 size={36} color="#5156be" style={{ animation: "spin 1s linear infinite" }} />
        </div>
      ) : sortedLevels.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#adb5bd" }}>
          <Users size={40} style={{ marginBottom: 12 }} />
          <p style={{ fontWeight: 700 }}>No students found</p>
        </div>
      ) : sortedLevels.map(level => {
        const col   = colorFor(level);
        const grp   = grouped[level];
        const nxtG  = nextLvForGroup(level);
        const bulky = promotingLv === level;

        return (
          <div key={level} style={{ marginBottom: 28, borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            {/* Level header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
              background: col.bg, borderBottom: `2px solid ${col.badge}30`, padding: "13px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ background: col.badge, color: "#fff", fontWeight: 800, fontSize: 13,
                  padding: "4px 14px", borderRadius: 20 }}>Level {level}</span>
                <span style={{ fontSize: 13, color: col.text, fontWeight: 600 }}>
                  {grp.length} student{grp.length !== 1 ? "s" : ""}</span></div><div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {programFilter ? (
                  <>
                    <button onClick={() => promoteSemesterAll(level)} disabled={promotingSem === level || bulky}
                      style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(42,181,125,0.15)",
                        color: "#065f46", border: "1px solid #2ab57d", padding: "6px 14px", borderRadius: 8,
                        fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: promotingSem === level ? 0.7 : 1 }}>
                      {promotingSem === level ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <ArrowRight size={13} />}
                      Promote Semester
                    </button>
                    {nxtG ? (
                      <button onClick={() => promoteAll(level, nxtG)} disabled={bulky || promotingSem === level}
                        style={{ display: "flex", alignItems: "center", gap: 6, background: col.badge,
                          color: "#fff", border: "none", padding: "7px 16px", borderRadius: 8,
                          fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: bulky ? 0.7 : 1 }}>
                        {bulky
                          ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                          : <ChevronsUp size={13} />}
                        Promote Level {nxtG}
                      </button>
                    ) : (
                      <span style={{ fontSize: 11, color: col.text, opacity: 0.55, fontWeight: 600 }}>
                        {isSuper ? "Final level (Super Admin can demote)" : "Final Level"}
                      </span>
                    )}
                  </>
                ) : (
                  <span style={{ fontSize: 11, color: col.text, opacity: 0.7, fontWeight: 600, fontStyle: "italic" }}>
                    Select a Program to enable bulk promotion
                  </span>
                )}
              </div>
            </div>

            {/* Student rows */}
            {grp.map((s, idx) => {
              const name  = s.fullName ?? `${s.firstname ?? ""} ${s.lastname ?? ""}`.trim();
              const nxt   = nextLv(s);
              const prv   = prevLv(s);
              const isPro = promotingId === s.id;

              return (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 18px", background: "#fff",
                  borderBottom: idx < grp.length - 1 ? "1px solid #f1f5f7" : "none" }}>
                  {/* Avatar */}
                  <div style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                    background: `linear-gradient(135deg,${col.badge},${col.badge}99)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontWeight: 800, fontSize: 15 }}>
                    {name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 3 }}>
                      {s.email && <span style={{ fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", gap: 3 }}>
                        <Mail size={10} />{s.email}</span>}
                      {s.program && <span style={{ fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", gap: 3 }}>
                        <GraduationCap size={10} />{s.program}</span>}
                      {s.currentSemester > 0 && <span style={{ fontSize: 11, color: col.badge, fontWeight: 700 }}>
                        Sem {s.currentSemester}</span>}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 5, flexShrink: 0, alignItems: "center" }}>
                    {isSuper && prv && (
                      <button onClick={() => promoteOne(s, prv)} disabled={isPro} title={`Demote to ${prv}`}
                        style={{ padding: "5px 10px", borderRadius: 7, border: "1.5px solid #f59e0b",
                          background: "rgba(245,158,11,0.07)", color: "#b45309", cursor: "pointer",
                          fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
                        <ArrowRight size={10} style={{ transform: "rotate(180deg)" }} />L{prv}
                      </button>
                    )}
                    {nxt && (
                      <button onClick={() => promoteOne(s, nxt)} disabled={isPro} title={`Promote to ${nxt}`}
                        style={{ padding: "5px 10px", borderRadius: 7, border: `1.5px solid ${col.badge}`,
                          background: col.bg, color: col.text, cursor: "pointer",
                          fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
                        {isPro ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> : "?"}
                        L{nxt}
                      </button>
                    )}
                    <button onClick={() => openEdit(s.id)} title="Edit"
                      style={{ width: 30, height: 30, borderRadius: 7, border: "1.5px solid #e2e8f0",
                        background: "#f8fafc", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Edit size={13} color="#5156be" />
                    </button>
                    <button onClick={() => remove(s.id, name)} title="Delete"
                      style={{ width: 30, height: 30, borderRadius: 7, border: "1.5px solid #fee2e2",
                        background: "#fff5f5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Trash2 size={13} color="#fd625e" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Edit Modal */}
      {editModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 540 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Edit Student</h3>
              <button onClick={() => setEditModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px 16px" }}>
              {[
                { key: "firstname", label: "First Name" }, { key: "lastname", label: "Last Name" },
                { key: "email", label: "Email" }, { key: "username", label: "Username" }, { key: "phone", label: "Phone" },
                { key: "programId", label: "Program", type: "programSelect" },
                { key: "currentLevel", label: "Level", type: "select", options: [100, 200, 300, 400, 500, 600] },
                { key: "currentSemester", label: "Semester", type: "select", options: [1, 2, 3] },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 5 }}>{f.label}</label>
                  {(f as any).type === "select" ? (
                    <select value={studentEdit[f.key] ?? ""} onChange={e => setStudentEdit((p: any) => ({ ...p, [f.key]: Number(e.target.value) }))}
                      style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, boxSizing: "border-box", background: "#fff", cursor: "pointer" }}>
                      <option value="" disabled>Select {f.label}</option>
                      {(f as any).options.map((opt: number) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : (f as any).type === "programSelect" ? (
                    <select value={studentEdit[f.key] ?? ""} onChange={e => setStudentEdit((p: any) => ({ ...p, [f.key]: Number(e.target.value) }))}
                      style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, boxSizing: "border-box", background: "#fff", cursor: "pointer" }}>
                      <option value="" disabled>Select Program</option>
                      {programs.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  ) : (
                    <input type={(f as any).type || "text"} value={studentEdit[f.key] ?? ""} onChange={e => setStudentEdit((p: any) => ({ ...p, [f.key]: e.target.value }))}
                      style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setEditModal(false)}
                style={{ flex: 1, height: 40, border: "1.5px solid #e2e8f0", background: "#f8fafc", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>Cancel</button>
              <button onClick={saveEdit} disabled={saving}
                style={{ flex: 1, height: 40, border: "none", background: "#5156be", color: "#fff", borderRadius: 8, cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={14} />}Save
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Add Modal */}
      {addModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 540 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Add New Student</h3>
              <button onClick={() => setAddModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px 16px" }}>
              {(() => {
                const selectedProg = programs.find((p: any) => p.id === Number(newStudent.programId));
                const dynamicLevels = selectedProg?.configuredLevels ?? [100, 200, 300, 400, 500, 600];
                return [
                  { key: "firstname", label: "First Name" }, { key: "lastname", label: "Last Name" },
                  { key: "email", label: "Email (Optional)" }, { key: "phone", label: "Phone (Optional)" },
                  { key: "username", label: "Student ID (Username)" }, { key: "password", label: "Password", type: "password" },
                  { key: "programId", label: "Program", type: "programSelect" },
                  { key: "currentLevel", label: "Level", type: "select", options: dynamicLevels },
                  { key: "currentSemester", label: "Semester", type: "select", options: [1, 2, 3] },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 5 }}>
                      {f.label} {!f.label.includes("Optional") && <span style={{color: "#fd625e"}}>*</span>}
                    </label>
                    {(f as any).type === "select" ? (
                      <select value={newStudent[f.key] ?? ""} onChange={e => setNewStudent((p: any) => ({ ...p, [f.key]: e.target.value }))}
                        style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, boxSizing: "border-box", background: "#fff", cursor: "pointer" }}>
                        <option value="" disabled>Select {f.label}</option>
                        {(f as any).options.map((opt: number) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                  ) : (f as any).type === "programSelect" ? (
                    <select value={newStudent[f.key] ?? ""} onChange={e => setNewStudent((p: any) => ({ ...p, [f.key]: e.target.value }))}
                      style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, boxSizing: "border-box", background: "#fff", cursor: "pointer" }}>
                      <option value="" disabled>Select Program</option>
                      {programs.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  ) : (
                    <input type={(f as any).type || "text"} value={newStudent[f.key] ?? ""} onChange={e => setNewStudent((p: any) => ({ ...p, [f.key]: e.target.value }))}
                      style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
                  )}
                </div>
              ))
            })()}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setAddModal(false)}
                style={{ flex: 1, height: 40, border: "1.5px solid #e2e8f0", background: "#f8fafc", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>Cancel</button>
              <button onClick={saveNewStudent} disabled={adding}
                style={{ flex: 1, height: 40, border: "none", background: "#5156be", color: "#fff", borderRadius: 8, cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {adding ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <UserPlus size={14} />} Add Student
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}







