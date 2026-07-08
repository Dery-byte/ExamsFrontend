import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  saGetAllStudents, adminGetAllStudents,
  adminGetCoursesForProgram, saGetCoursesForProgram,
  adminEnrollStudent, adminGetEnrolledCourseIds, adminUnenrollStudent, saEnrollStudent, saGetEnrolledCourseIds, saUnenrollStudent,
} from "../../api/endpoints";
import toast, { Toaster } from "react-hot-toast";
import PageHeader from "../../components/PageHeader";
import { BookMarked, BookOpen, CheckCircle2, GraduationCap, Loader2, Search, User, Users, X } from 'lucide-react';

export default function EnrollStudent() {
  const auth    = useAuth() as any;
  const isSuper = typeof auth.isSuperAdmin === "function" ? auth.isSuperAdmin() : false;

  const [students, setStudents]         = useState<any[]>([]);
  const [courses,  setCourses]          = useState<any[]>([]);
  const [selected, setSelected]         = useState<any>(null);
  const [stuSearch, setStuSearch]       = useState("");
  const [courseSearch, setCourseSearch] = useState("");
  const [stuProgramFilter, setStuProgramFilter] = useState("");
  const [semFilter, setSemFilter]       = useState("");
  const [lvFilter,  setLvFilter]        = useState("");
  const [enrolling, setEnrolling]       = useState<number | null>(null);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<number[]>([]);
  const [loadingStu, setLoadingStu]     = useState(false);
  const [loadingCrs, setLoadingCrs]     = useState(false);

  // ── Load students (rich: includes programId, currentLevel, currentSemester) ──
  useEffect(() => {
    setLoadingStu(true);
    // adminGetAllStudents hits /api/v1/auth/admin/students which is accessible
    // to both ADMIN and SUPER_ADMIN roles.
    const fn = isSuper ? saGetAllStudents : adminGetAllStudents;
    fn()
      .then((d: any) => setStudents(Array.isArray(d) ? d : []))
      .catch(() => toast.error("Failed to load students"))
      .finally(() => setLoadingStu(false));
  }, [isSuper]);

  // ── Load courses when a student is selected ───────────────────────────────
  useEffect(() => {
    if (!selected) { setCourses([]); setEnrolledCourseIds([]); return; }
    const progId = selected.programId;
    if (!progId) {
      // No program assigned — load global courses only
      setCourses([]);
      setEnrolledCourseIds([]);
      return;
    }
    
    // Fetch courses
    setLoadingCrs(true);
    const fn = isSuper ? saGetCoursesForProgram : adminGetCoursesForProgram;
    fn(progId)
      .then((d: any) => setCourses(Array.isArray(d) ? d : []))
      .catch(() => toast.error("Failed to load courses"))
      .finally(() => setLoadingCrs(false));

    // Fetch enrolled course IDs to persist the state
    const enrollFn = isSuper ? saGetEnrolledCourseIds : adminGetEnrolledCourseIds;
    enrollFn(selected.id).then((ids: any) => {
      setEnrolledCourseIds(Array.isArray(ids) ? ids : []);
    }).catch((e: any) => {
      console.error(e);
      setEnrolledCourseIds([]);
    });

  }, [selected, isSuper]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const normLevel = (l: string) => (l ?? "").replace(/^level\s+/i, "").trim();
  const stuName   = (s: any) =>
    s.fullName ?? `${s.firstname ?? ""}${s.lastname ? " " + s.lastname : ""}`.trim();

  const filteredStudents = students.filter(s => {
    if (stuProgramFilter && String(s.programId) !== stuProgramFilter) return false;
    const q = stuSearch.toLowerCase();
    if (!q) return true;
    return stuName(s).toLowerCase().includes(q) || 
           (s.email ?? "").toLowerCase().includes(q) || 
           (s.username ?? "").toLowerCase().includes(q) ||
           (s.program ?? "").toLowerCase().includes(q);
  });

  const uniquePrograms = Array.from(new Map(students.filter(s => s.programId).map(s => [s.programId, s.program])).entries());

  const filteredCourses = courses.filter(c => {
    const q = courseSearch.toLowerCase();
    const matchQ   = !q || (c.title ?? "").toLowerCase().includes(q) ||
                     (c.courseCode ?? "").toLowerCase().includes(q);
    const matchSem = !semFilter || String(c.semester) === semFilter;
    const matchLv  = !lvFilter  || normLevel(c.level ?? "") === lvFilter;
    return matchQ && matchSem && matchLv;
  });

  const uniqueLevels = [...new Set(
    courses.map(c => normLevel(c.level ?? "")).filter(Boolean)
  )].sort((a, b) => Number(a) - Number(b));

  const uniqueSems = [...new Set(
    courses.map(c => String(c.semester)).filter(v => v && v !== "null" && v !== "0")
  )].sort();

  const toggleEnrollment = async (course: any, isEnrolled: boolean) => {
    if (!selected) return;
    setEnrolling(course.cid);
    try {
      if (isEnrolled) {
        const fn = isSuper ? saUnenrollStudent : adminUnenrollStudent;
        const res = await fn(selected.id, course.cid);
        toast.success(res?.message ?? `Unenrolled from ${course.title}`);
        setEnrolledCourseIds(prev => prev.filter(id => id !== course.cid));
      } else {
        const fn = isSuper ? saEnrollStudent : adminEnrollStudent;
        const res = await fn(selected.id, course.cid);
        toast.success(res?.message ?? `Enrolled in ${course.title}!`);
        setEnrolledCourseIds(prev => [...prev, course.cid]);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Operation failed");
    } finally { setEnrolling(null); }
  };

  // ── Styles ────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: "#fff", borderRadius: 14,
    border: "1.5px solid #e2e8f0", overflow: "hidden",
    boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      <Toaster position="top-right" />
      <PageHeader title="Enroll Student in Course" breadcrumbs={["Admin", "Enroll Student"]} />

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, alignItems: "start" }}>

        {/* ── LEFT: Student picker ─────────────────────────────────────── */}
        <div style={card}>
          {/* Header */}
          <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #f1f5f7" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Users size={16} color="#5156be" />
              <span style={{ fontSize: 14, fontWeight: 800, color: "#1e293b" }}>Select Student</span>
              <span style={{ marginLeft: "auto", fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>
                {students.length} total
              </span>
            </div>
            <div style={{ position: "relative" }}>
              <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#adb5bd" }} />
              <input
                value={stuSearch} onChange={e => setStuSearch(e.target.value)}
                placeholder="Search students…"
                style={{ width: "100%", paddingLeft: 30, height: 36, border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <select value={stuProgramFilter} onChange={e => setStuProgramFilter(e.target.value)}
              style={{ width: "100%", marginTop: 8, padding: "0 10px", height: 36, border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none", cursor: "pointer", background: "#f8fafc" }}>
              <option value="">All Programs</option>
              {uniquePrograms.map(([id, name]) => <option key={id} value={id}>{name as string}</option>)}
            </select>
          </div>

          {/* Student list */}
          <div style={{ maxHeight: 520, overflowY: "auto" }}>
            {loadingStu ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 28 }}>
                <Loader2 size={26} color="#5156be" style={{ animation: "spin 1s linear infinite" }} />
              </div>
            ) : filteredStudents.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 16px", color: "#94a3b8", fontSize: 13 }}>
                No students found
              </div>
            ) : filteredStudents.map(s => {
              const isSel  = selected?.id === s.id;
              const name   = stuName(s);
              const initials = name.charAt(0).toUpperCase();

              return (
                <div
                  key={s.id}
                  onClick={() => { setSelected(isSel ? null : s); setSemFilter(""); setLvFilter(""); setCourseSearch(""); setEnrolledCourseIds([]); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px", cursor: "pointer",
                    borderBottom: "1px solid #f8fafc",
                    background: isSel ? "rgba(81,86,190,0.08)" : "transparent",
                    transition: "background 0.15s",
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                    background: isSel ? "#5156be" : "#e2e8f0",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: isSel ? "#fff" : "#64748b", fontWeight: 800, fontSize: 14,
                  }}>{initials}</div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: isSel ? "#3730a3" : "#1e293b",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", display: "flex", gap: 5, flexWrap: "wrap" }}>
                      <span>{s.program || "No program"}</span>
                      {s.currentLevel > 0 && <span>· L{s.currentLevel} S{s.currentSemester}</span>}
                    </div>
                  </div>

                  {isSel && <CheckCircle2 size={16} color="#5156be" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT: Course picker ──────────────────────────────────────── */}
        <div>
          {/* Banner */}
          {selected ? (
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 18px", marginBottom: 14,
              background: "rgba(81,86,190,0.07)",
              border: "1.5px solid rgba(81,86,190,0.2)", borderRadius: 10,
            }}>
              <GraduationCap size={18} color="#5156be" />
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#3730a3" }}>{stuName(selected)}</div>
                <div style={{ fontSize: 12, color: "#6366f1" }}>
                  {selected.program || "No program assigned"}
                  {selected.currentLevel > 0 && ` · Level ${selected.currentLevel}`}
                  {selected.currentSemester > 0 && ` · Sem ${selected.currentSemester}`}
                  {" "}— enroll in any course below
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              padding: "48px 20px", textAlign: "center", color: "#94a3b8",
              background: "#f8fafc", borderRadius: 12,
              border: "1.5px dashed #e2e8f0", marginBottom: 14,
            }}>
              <User size={36} style={{ marginBottom: 10 }} />
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>
                Select a student on the left to browse available courses
              </p>
            </div>
          )}

          {selected && (
            <div style={card}>
              {/* Filters row */}
              <div style={{
                padding: "12px 14px", borderBottom: "1px solid #f1f5f7",
                display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center",
              }}>
                <div style={{ position: "relative", flex: 1, minWidth: 160 }}>
                  <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#adb5bd" }} />
                  <input
                    value={courseSearch} onChange={e => setCourseSearch(e.target.value)}
                    placeholder="Search courses…"
                    style={{ width: "100%", paddingLeft: 30, height: 34, border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                {uniqueLevels.length > 0 && (
                  <select
                    value={lvFilter} onChange={e => setLvFilter(e.target.value)}
                    style={{ height: 34, border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, padding: "0 10px", background: "#f8fafc", cursor: "pointer" }}
                  >
                    <option value="">All Levels</option>
                    {uniqueLevels.map(l => <option key={l} value={l}>Level {l}</option>)}
                  </select>
                )}
                {uniqueSems.length > 0 && (
                  <select
                    value={semFilter} onChange={e => setSemFilter(e.target.value)}
                    style={{ height: 34, border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, padding: "0 10px", background: "#f8fafc", cursor: "pointer" }}
                  >
                    <option value="">All Semesters</option>
                    {uniqueSems.map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                )}
                <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, whiteSpace: "nowrap" }}>
                  {filteredCourses.length} course{filteredCourses.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Course rows */}
              <div style={{ maxHeight: 500, overflowY: "auto" }}>
                {loadingCrs ? (
                  <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
                    <Loader2 size={28} color="#5156be" style={{ animation: "spin 1s linear infinite" }} />
                  </div>
                ) : !selected.programId ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                    <GraduationCap size={32} style={{ marginBottom: 8 }} />
                    <p style={{ margin: 0, fontWeight: 700 }}>This student has no program assigned</p>
                    <p style={{ margin: "6px 0 0", fontSize: 12 }}>Assign a program via Student Directory first</p>
                  </div>
                ) : filteredCourses.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                    <BookOpen size={32} style={{ marginBottom: 8 }} />
                    <p style={{ margin: 0, fontWeight: 700 }}>No courses match your filters</p>
                  </div>
                ) : filteredCourses.map((c, idx) => {
                  const lvl        = normLevel(c.level ?? "");
                  const isEnrolling = enrolling === c.cid;
                  const isGlobal   = !c.program;

                  const isAlreadyEnrolled = enrolledCourseIds.includes(c.cid);

                  return (
                    <div key={c.cid} style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "13px 16px",
                      borderBottom: idx < filteredCourses.length - 1 ? "1px solid #f1f5f7" : "none",
                    }}>
                      {/* Icon */}
                      <div style={{
                        width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                        background: isGlobal
                          ? "linear-gradient(135deg,#10b981,#059669)"
                          : "linear-gradient(135deg,#5156be,#4f46e5)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <BookMarked size={18} color="#fff" />
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>{c.title}</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                          {c.courseCode && (
                            <span style={{ fontSize: 11, background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                              {c.courseCode}
                            </span>
                          )}
                          {lvl && (
                            <span style={{ fontSize: 11, color: "#5156be", fontWeight: 700 }}>
                              Level {lvl}
                            </span>
                          )}
                          {c.semester && (
                            <span style={{ fontSize: 11, color: "#64748b" }}>Sem {c.semester}</span>
                          )}
                          {isGlobal && (
                            <span style={{ fontSize: 11, background: "#f0fdf4", color: "#16a34a", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                              🌐 Global
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Enroll / Unenroll button */}
                      <button
                        onClick={() => toggleEnrollment(c, isAlreadyEnrolled)}
                        disabled={isEnrolling}
                        style={{
                          flexShrink: 0, padding: "7px 18px", borderRadius: 8,
                          border: "none", background: isAlreadyEnrolled ? "#ef4444" : "#5156be", color: "#fff",
                          fontSize: 13, fontWeight: 700, cursor: "pointer",
                          opacity: isEnrolling ? 0.7 : 1,
                          display: "flex", alignItems: "center", gap: 6,
                          transition: "opacity 0.15s",
                        }}
                      >
                        {isEnrolling
                          ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                          : isAlreadyEnrolled ? <X size={13} /> : <CheckCircle2 size={13} />}
                        {isAlreadyEnrolled ? "Unenroll" : "Enroll"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}





