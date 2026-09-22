import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import client from '../../api/client';
import { toast } from 'react-hot-toast';
import { syncMarksForStudent, syncMarksBulk, addSheetSection, deleteSheetSection } from '../../api/endpoints';
import {
    DownloadCloud, RefreshCw, Plus, Trash2, Loader2, X,
    ClipboardCheck, Users, BookOpen, Award, TrendingUp, Save, Send
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; dotColor: string }> = {
    DRAFT:     { label: 'Draft',     bg: '#f3f4f6', color: '#374151', dotColor: '#9ca3af' },
    ACTIVE:    { label: 'Active',    bg: '#dbeafe', color: '#1d4ed8', dotColor: '#3b82f6' },
    SUBMITTED: { label: 'Submitted', bg: '#fef3c7', color: '#92400e', dotColor: '#f59e0b' },
    APPROVED:  { label: 'Approved',  bg: '#d1fae5', color: '#065f46', dotColor: '#10b981' },
    PUBLISHED: { label: 'Published', bg: '#ede9fe', color: '#5b21b6', dotColor: '#7c3aed' },
};

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
    return (
        <span className="mme-status-badge" style={{ background: cfg.bg, color: cfg.color }}>
            <span className="mme-status-dot" style={{ background: cfg.dotColor }} />
            {cfg.label}
        </span>
    );
}

const ManualMarksEntry = () => {
    const [sheets, setSheets] = useState([]);
    const [selectedSheetId, setSelectedSheetId] = useState('');
    const [sheetData, setSheetData] = useState<any>(null);
    const [userContext, setUserContext] = useState<any>(null);
    const [syncingStudent, setSyncingStudent] = useState<number | null>(null);
    const [bulkSyncing, setBulkSyncing] = useState(false);
    const [showAddSection, setShowAddSection] = useState(false);
    const [newSectionName, setNewSectionName] = useState('');
    const [newSectionMax, setNewSectionMax] = useState('');
    const [addingSection, setAddingSection] = useState(false);
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const u = localStorage.getItem('user');
        if (u) {
            setUserContext(JSON.parse(u));
        }
        fetchSheets();
    }, []);

    const fetchSheets = async () => {
        try {
            const res = await client.get(client.defaults.baseURL!.replace('/v1/auth', '') + '/marks/sheet/my-sheets');
            // Lecturers should only see sheets that are ACTIVE or DRAFT (not submitted, approved, or published)
            setSheets(res.data.filter((s: any) => s.status === 'ACTIVE' || s.status === 'DRAFT'));
        } catch (error) {
            console.error(error);
        }
    };

    const loadSheet = async (sheetId: string) => {
        try {
            const res = await client.get(client.defaults.baseURL!.replace('/v1/auth', '') + `/marks/sheet/${sheetId}`);
            setSheetData(res.data);
        } catch (error) {
            toast.error("Failed to load sheet details");
            console.error(error);
        }
    };

    const handleSheetSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const sid = e.target.value;
        setSelectedSheetId(sid);
        if (sid) {
            loadSheet(sid);
        } else {
            setSheetData(null);
        }
    };

    const getSectionMark = (courseMark: any, sectionId: number) => {
        return courseMark?.sectionMarks?.find((sm: any) => sm.sectionId === sectionId);
    };

    const handleMarkChange = (studentIdx: number, courseIdx: number, sectionId: number, maxScore: number, value: string) => {
        const newData = { ...sheetData };
        let val = parseFloat(value);
        if (isNaN(val)) val = 0;

        if (val > maxScore) {
            val = maxScore;
            toast.error(`Score cannot exceed maximum marks (${maxScore})`);
        } else if (val < 0) {
            val = 0;
        }

        const courseMark = newData.studentMarks[studentIdx].courseMarks[courseIdx];
        if (!courseMark.sectionMarks) courseMark.sectionMarks = [];
        let mark = courseMark.sectionMarks.find((sm: any) => sm.sectionId === sectionId);
        if (!mark) {
            mark = { sectionId, scoreObtained: 0 };
            courseMark.sectionMarks.push(mark);
        }
        mark.scoreObtained = val;

        // Recalculate total score based on the sheet's canonical section list
        let total = 0;
        newData.sections.forEach((sec: any) => {
            const m = getSectionMark(courseMark, sec.id);
            total += (m?.scoreObtained || 0);
        });

        // Recalculate grade
        let grade = "F";
        if (total >= 90) grade = "A+";
        else if (total >= 80) grade = "A";
        else if (total >= 70) grade = "B";
        else if (total >= 60) grade = "C";
        else if (total >= 50) grade = "D";

        courseMark.totalScore = total;
        courseMark.grade = grade;

        setSheetData(newData);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await client.post(client.defaults.baseURL!.replace('/v1/auth', '') + `/marks/sheet/${selectedSheetId}/save`, sheetData);
            toast.success("Marks saved successfully!");
        } catch(error: any) {
            const msg = error?.response?.data?.message || error?.message || "Failed to save marks";
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = async () => {
        if (!window.confirm("Are you sure you want to submit? You won't be able to edit after submission.")) return;
        setSubmitting(true);
        try {
            await client.post(client.defaults.baseURL!.replace('/v1/auth', '') + `/marks/sheet/${selectedSheetId}/save`, sheetData);
            await client.post(client.defaults.baseURL!.replace('/v1/auth', '') + `/marks/sheet/${selectedSheetId}/submit`);
            toast.success("Sheet submitted to Super Admin!");
            setSheetData(null);
            fetchSheets();
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || "Failed to submit sheet";
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSyncStudent = async (studentId: number) => {
        if (!selectedSheetId || !sheetData?.sections?.length) return;

        let targetSectionId = sheetData.sections[0].id;
        if (sheetData.sections.length > 1) {
            const res = window.prompt("Enter the exact name of the section you want to fetch these marks into:\n" + sheetData.sections.map((s:any)=>s.sectionName).join(", "));
            if (!res) return;
            const match = sheetData.sections.find((s:any) => s.sectionName.toLowerCase() === res.toLowerCase());
            if (!match) {
                toast.error("Invalid section name");
                return;
            }
            targetSectionId = match.id;
        }

        setSyncingStudent(studentId);
        try {
            await syncMarksForStudent(selectedSheetId, studentId, targetSectionId);
            toast.success("Marks fetched successfully!");
            await loadSheet(selectedSheetId);
        } catch (error) {
            toast.error("Failed to fetch marks");
        } finally {
            setSyncingStudent(null);
        }
    };

    const handleBulkSync = async () => {
        if (!selectedSheetId || !sheetData?.sections?.length) return;

        let targetSectionId = sheetData.sections[0].id;
        if (sheetData.sections.length > 1) {
            const res = window.prompt("Enter the exact name of the section you want to fetch these marks into:\n" + sheetData.sections.map((s:any)=>s.sectionName).join(", "));
            if (!res) return;
            const match = sheetData.sections.find((s:any) => s.sectionName.toLowerCase() === res.toLowerCase());
            if (!match) {
                toast.error("Invalid section name");
                return;
            }
            targetSectionId = match.id;
        }

        if (!window.confirm("This will fetch and overwrite marks for ALL students into that section. Continue?")) return;

        setBulkSyncing(true);
        try {
            await syncMarksBulk(selectedSheetId, targetSectionId);
            toast.success("Bulk fetch completed successfully!");
            await loadSheet(selectedSheetId);
        } catch (error) {
            toast.error("Failed to perform bulk fetch");
        } finally {
            setBulkSyncing(false);
        }
    };

    const handleAddSection = async () => {
        if (!newSectionName || !newSectionMax || !selectedSheetId || !sheetData?.sections) return;

        const newMax = parseFloat(newSectionMax);
        const currentTotal = sheetData.sections.reduce((sum: number, sec: any) => sum + (sec.maxScore || 0), 0);
        if (currentTotal + newMax > 100) {
            toast.error(`Adding this section exceeds the maximum 100 total marks. Current total: ${currentTotal}. Please delete an existing section first.`);
            return;
        }

        setAddingSection(true);
        try {
            await addSheetSection(selectedSheetId, { sectionName: newSectionName, maxScore: parseFloat(newSectionMax) });
            toast.success("Section added successfully!");
            setShowAddSection(false);
            setNewSectionName('');
            setNewSectionMax('');
            await loadSheet(selectedSheetId);
        } catch(e: any) {
            const msg = e?.response?.data?.message || e?.message || "Failed to add section";
            toast.error(msg);
        } finally {
            setAddingSection(false);
        }
    };

    const handleDeleteSection = async (sectionId: number) => {
        if (!window.confirm("Are you sure? This will delete this section and all associated student marks.")) return;
        try {
            await deleteSheetSection(selectedSheetId, sectionId);
            toast.success("Section deleted!");
            await loadSheet(selectedSheetId);
        } catch(e: any) {
            const msg = e?.response?.data?.message || e?.message || "Failed to delete section";
            toast.error(msg);
        }
    };

    if (!sheetData) {
        return (
            <div className="mme-container">
                <h2 className="mme-title">Manual Marks Entry</h2>
                <div className="mme-card">
                    <select className="mme-select" value={selectedSheetId} onChange={handleSheetSelect}>
                        <option value="">Select an active semester sheet</option>
                        {sheets.map((s: any) => (
                            <option key={s.id} value={s.id}>
                                {s.courseName || `Sheet #${s.id}`} — Level {s.level} | Sem {s.semester} | {s.status}
                            </option>
                        ))}
                    </select>
                </div>
                <style>{mmeStyles}</style>
            </div>
        );
    }

    const isReadOnly = sheetData.status === 'SUBMITTED' || sheetData.status === 'PUBLISHED';
    const allCourses = sheetData.studentMarks.length > 0 ? sheetData.studentMarks[0].courseMarks : [];
    const studentCount = sheetData.studentMarks?.length || 0;

    return createPortal(
        <div className="mme-overlay">
            {/* Header bar */}
            <div className="mme-ov-header">
                <div className="mme-ov-header-left">
                    <div className="mme-ov-icon"><ClipboardCheck size={20} color="#fff" /></div>
                    <div className="mme-ov-title-wrap">
                        <div className="mme-ov-title">
                            Manual Marks Entry {allCourses[0]?.courseCode ? `— ${allCourses[0].courseCode}` : ''}
                        </div>
                        <div className="mme-ov-subtitle">
                            Level {sheetData.level} &bull; Sem {sheetData.semester}
                        </div>
                    </div>
                </div>

                <div className="mme-ov-header-right">
                    <StatusBadge status={sheetData.status} />

                    {!isReadOnly && (
                        <button onClick={() => setShowAddSection(!showAddSection)} className="mme-pill mme-pill-warning">
                            <Plus size={13} /> <span>Add Section</span>
                        </button>
                    )}
                    {!isReadOnly && (
                        <button onClick={handleBulkSync} disabled={bulkSyncing || !sheetData.sections?.length} className="mme-pill mme-pill-purple">
                            <DownloadCloud size={13} /> <span>{bulkSyncing ? 'Fetching...' : 'Bulk Fetch Marks'}</span>
                        </button>
                    )}
                    {!isReadOnly && (
                        <button onClick={handleSave} disabled={saving || submitting} className="mme-pill mme-pill-blue">
                            {saving ? <Loader2 size={13} className="spin" /> : <Save size={13} />} <span>{saving ? 'Saving...' : 'Save Progress'}</span>
                        </button>
                    )}
                    {!isReadOnly && (
                        <button onClick={handleSubmit} disabled={saving || submitting} className="mme-pill mme-pill-green">
                            {submitting ? <Loader2 size={13} className="spin" /> : <Send size={13} />} <span>{submitting ? 'Submitting...' : 'Submit Final'}</span>
                        </button>
                    )}

                    <button onClick={() => setSheetData(null)} className="mme-close-btn" title="Back to sheet list">
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="mme-ov-body">
                {/* Summary cards */}
                <div className="mme-stat-grid">
                    {[
                        { icon: <Users size={18} color="#3b82f6" />, label: 'Students', value: studentCount, bg: '#eff6ff' },
                        { icon: <BookOpen size={18} color="#7c3aed" />, label: 'Courses', value: allCourses.length, bg: '#f5f3ff' },
                        { icon: <Award size={18} color="#10b981" />, label: 'Sections', value: sheetData.sections?.length || 0, bg: '#f0fdf4' },
                        { icon: <TrendingUp size={18} color="#f59e0b" />, label: 'Status', value: STATUS_CONFIG[sheetData.status]?.label || sheetData.status, bg: '#fffbeb' },
                    ].map((card, i) => (
                        <div key={i} className="mme-stat-card">
                            <div className="mme-stat-icon" style={{ background: card.bg }}>{card.icon}</div>
                            <div>
                                <div className="mme-stat-label">{card.label}</div>
                                <div className="mme-stat-value">{card.value}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {showAddSection && !isReadOnly && (
                    <div className="mme-add-section">
                        <input type="text" placeholder="Section Name (e.g. CA, Exam)" value={newSectionName} onChange={e => setNewSectionName(e.target.value)} className="mme-input mme-input-name" />
                        <input type="number" placeholder="Max Score" value={newSectionMax} onChange={e => setNewSectionMax(e.target.value)} className="mme-input mme-input-max" />
                        <button onClick={handleAddSection} disabled={addingSection} className="mme-pill mme-pill-green mme-btn-save-section">
                            {addingSection ? 'Saving...' : 'Save Section'}
                        </button>
                    </div>
                )}

                {/* Marks grid */}
                <div className="mme-table-card">
                    <div className="mme-table-wrap">
                        <table className="mme-table">
                            <thead>
                                <tr className="mme-thead-course-row">
                                    <th rowSpan={2} className="mme-th mme-th-student">Student</th>
                                    {allCourses.map((c: any) => (
                                        <th key={c.courseId} colSpan={sheetData.sections.length + 2} className="mme-th mme-th-course">
                                            <div className="mme-course-code">{c.courseCode}</div>
                                            <div className="mme-course-title">{c.courseTitle}</div>
                                        </th>
                                    ))}
                                </tr>
                                <tr className="mme-thead-section-row">
                                    {allCourses.map((c: any) => (
                                        <React.Fragment key={c.courseId}>
                                            {sheetData.sections.map((sec: any) => (
                                                <th key={`${c.courseId}-${sec.id}`} className="mme-th mme-th-section">
                                                    <div className="mme-section-label">
                                                        {sec.sectionName} <span className="mme-section-max">/{sec.maxScore}</span>
                                                        {!isReadOnly && sec.deletable !== false && <Trash2 size={12} color="#ef4444" className="mme-delete-icon" onClick={() => handleDeleteSection(sec.id)} />}
                                                    </div>
                                                </th>
                                            ))}
                                            <th key={`${c.courseId}-total`} className="mme-th mme-th-total">
                                                Total
                                            </th>
                                            <th key={`${c.courseId}-grade`} className="mme-th mme-th-total">
                                                Grade
                                            </th>
                                        </React.Fragment>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sheetData.studentMarks.map((student: any, sIdx: number) => (
                                    <tr key={student.studentId} className={`mme-tr ${sIdx % 2 === 0 ? 'mme-tr-even' : 'mme-tr-odd'}`}>
                                        <td className="mme-td mme-td-student">
                                            <div className="mme-student-row">
                                                <div className="mme-student-avatar">
                                                    {(student.studentName || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div className="mme-student-info">
                                                    <div className="mme-student-name" title={student.studentName}>{student.studentName}</div>
                                                    <div className="mme-student-username">{student.username}</div>
                                                </div>
                                                {!isReadOnly && (
                                                    <button
                                                        onClick={() => handleSyncStudent(student.studentId)}
                                                        disabled={syncingStudent === student.studentId}
                                                        title="Fetch System Marks"
                                                        className="mme-sync-btn"
                                                    >
                                                        <RefreshCw size={15} className={syncingStudent === student.studentId ? 'spin' : ''} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        {student.courseMarks.map((cMark: any, cIdx: number) => (
                                            <React.Fragment key={cMark.courseId}>
                                                {sheetData.sections.map((sec: any) => {
                                                    const mark = getSectionMark(cMark, sec.id);
                                                    const score = mark?.scoreObtained || 0;
                                                    return (
                                                        <td key={`${cMark.courseId}-${sec.id}`} className="mme-td mme-td-score">
                                                            <input
                                                                type="number"
                                                                value={score === 0 ? '' : score}
                                                                onChange={(e) => handleMarkChange(sIdx, cIdx, sec.id, sec.maxScore, e.target.value)}
                                                                disabled={isReadOnly}
                                                                max={sec.maxScore}
                                                                min="0"
                                                                className="mme-score-input"
                                                            />
                                                        </td>
                                                    );
                                                })}
                                                <td className="mme-td mme-td-total">
                                                    <span className="mme-total-badge">{cMark.totalScore || 0}</span>
                                                </td>
                                                <td className="mme-td mme-td-total">
                                                    {cMark.grade && (
                                                        <span className="mme-grade-badge" style={{ color: cMark.grade === 'F' ? '#ef4444' : '#10b981' }}>
                                                            {cMark.grade}
                                                        </span>
                                                    )}
                                                </td>
                                            </React.Fragment>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Legend */}
                <div className="mme-legend">
                    <span>Scores shown are the raw marks entered per section</span>
                    {!isReadOnly && <span>&bull; Tap the refresh icon to auto-fetch a student's system marks</span>}
                    {isReadOnly && <span className="mme-legend-locked">&#9888; This sheet is {sheetData.status.toLowerCase()} and can no longer be edited</span>}
                </div>
            </div>
            <style>{mmeStyles}</style>
        </div>,
        document.body
    );
};

const mmeStyles = `
    .mme-container {
        padding: 24px;
        max-width: 1400px;
        margin: 0 auto;
        box-sizing: border-box;
        min-width: 0;
        width: 100%;
    }

    .mme-title {
        margin-bottom: 24px;
        font-weight: 800;
        color: #2a3142;
        font-size: clamp(18px, 4vw, 24px);
    }

    .mme-card {
        background: #fff;
        padding: 24px;
        border-radius: 16px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        box-sizing: border-box;
        min-width: 0;
        width: 100%;
    }

    .mme-select {
        padding: 10px 14px;
        border-radius: 8px;
        border: 1px solid #d1d5db;
        width: 100%;
        max-width: 520px;
        box-sizing: border-box;
        font-size: 14px;
    }

    /* ── Full-screen overlay ── */
    .mme-overlay {
        position: fixed;
        inset: 0;
        z-index: 99999;
        background: #f8fafc;
        display: flex;
        flex-direction: column;
    }

    .mme-ov-header {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px 24px;
        background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
        flex-shrink: 0;
        flex-wrap: wrap;
        row-gap: 12px;
    }

    .mme-ov-header-left {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
        min-width: 0;
    }

    .mme-ov-icon {
        width: 42px;
        height: 42px;
        border-radius: 10px;
        background: rgba(255,255,255,0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .mme-ov-title-wrap { min-width: 0; }

    .mme-ov-title {
        color: #fff;
        font-weight: 800;
        font-size: 16px;
        line-height: 1.2;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .mme-ov-subtitle {
        color: rgba(255,255,255,0.6);
        font-size: 12px;
        margin-top: 2px;
    }

    .mme-ov-header-right {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
    }

    .mme-status-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.3px;
        white-space: nowrap;
    }

    .mme-status-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        flex-shrink: 0;
    }

    .mme-pill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px 16px;
        border: none;
        border-radius: 8px;
        font-weight: 700;
        font-size: 12px;
        cursor: pointer;
        white-space: nowrap;
        color: #fff;
    }

    .mme-pill:disabled { cursor: not-allowed; opacity: 0.6; }

    .mme-pill-warning { background: rgba(245,158,11,0.2); color: #fbbf24; border: 1.5px solid rgba(245,158,11,0.5); }
    .mme-pill-purple { background: linear-gradient(135deg,#7c3aed,#5b21b6); box-shadow: 0 4px 14px rgba(124,58,237,0.35); }
    .mme-pill-blue { background: linear-gradient(135deg,#3b82f6,#1d4ed8); box-shadow: 0 4px 14px rgba(59,130,246,0.35); }
    .mme-pill-green { background: linear-gradient(135deg,#10b981,#059669); box-shadow: 0 4px 14px rgba(16,185,129,0.35); }

    .mme-close-btn {
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 8px;
        background: rgba(255,255,255,0.1);
        color: #fff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .mme-ov-body {
        flex: 1;
        overflow: auto;
        background: #f8fafc;
        padding: 24px;
        box-sizing: border-box;
    }

    .mme-stat-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
    }

    .mme-stat-card {
        background: #fff;
        border-radius: 12px;
        padding: 16px 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.07);
        display: flex;
        align-items: center;
        gap: 14px;
    }

    .mme-stat-icon {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .mme-stat-label {
        font-size: 11px;
        color: #94a3b8;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .mme-stat-value {
        font-size: 20px;
        font-weight: 800;
        color: #1e293b;
        line-height: 1.2;
        margin-top: 2px;
    }

    .mme-add-section {
        padding: 16px;
        background: #fef3c7;
        border-radius: 12px;
        margin-bottom: 24px;
        display: flex;
        gap: 12px;
        align-items: center;
        flex-wrap: wrap;
    }

    .mme-input {
        padding: 8px 12px;
        border-radius: 4px;
        border: 1px solid #d1d5db;
        outline: none;
        font-size: 14px;
        box-sizing: border-box;
    }

    .mme-input-name { flex: 1 1 200px; min-width: 160px; }
    .mme-input-max { width: 120px; flex: 0 0 120px; }
    .mme-btn-save-section { flex: 0 0 auto; color: #fff; }

    .mme-table-card {
        background: #fff;
        border-radius: 14px;
        box-shadow: 0 2px 12px rgba(0,0,0,0.08);
        overflow: hidden;
    }

    .mme-table-wrap {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        width: 100%;
        max-width: 100%;
    }

    .mme-table {
        min-width: 1000px;
        width: 100%;
        border-collapse: collapse;
    }

    .mme-thead-course-row { background: linear-gradient(135deg,#1e1b4b,#312e81); }
    .mme-thead-section-row { background: #f1f5f9; border-bottom: 2px solid #e2e8f0; }

    .mme-th {
        padding: 12px 10px;
        text-align: center;
        font-size: 12px;
    }

    .mme-th-student {
        text-align: left;
        padding: 14px 18px;
        min-width: 190px;
        max-width: 190px;
        color: rgba(255,255,255,0.7);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        position: sticky;
        left: 0;
        background: #1e1b4b;
        z-index: 3;
        vertical-align: middle;
    }

    .mme-th-course {
        color: #fff;
        font-weight: 800;
        font-size: 13px;
        border-left: 1px solid rgba(255,255,255,0.1);
    }

    .mme-course-code { font-weight: 800; color: #fff; }
    .mme-course-title { font-weight: 400; font-size: 11px; color: rgba(255,255,255,0.6); margin-top: 2px; }

    .mme-th-section {
        color: #5156be;
        font-weight: 700;
        border-left: 1px solid #e2e8f0;
        white-space: nowrap;
    }

    .mme-section-max { font-weight: 400; color: #94a3b8; font-size: 10px; }

    .mme-section-label {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        flex-wrap: wrap;
    }

    .mme-delete-icon { cursor: pointer; flex-shrink: 0; }

    .mme-th-total {
        color: #374151;
        font-weight: 800;
        border-left: 1px solid #cbd5e1;
        background: #f8fafc;
        white-space: nowrap;
    }

    .mme-td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; text-align: center; }

    .mme-tr-even .mme-td { background: #fff; }
    .mme-tr-odd .mme-td { background: #fafbfc; }

    .mme-td-student {
        padding: 12px 18px;
        text-align: left;
        position: sticky;
        left: 0;
        z-index: 2;
        min-width: 190px;
        max-width: 190px;
        box-shadow: 2px 0 4px -2px rgba(0,0,0,0.08);
    }
    .mme-tr-even .mme-td-student { background: #fff; }
    .mme-tr-odd .mme-td-student { background: #fafbfc; }

    .mme-td-total { font-weight: bold; border-left: 1px solid #cbd5e1; }
    .mme-tr-even .mme-td-total { background: #f8fafc; }
    .mme-tr-odd .mme-td-total { background: #f1f5f9; }

    .mme-td-score { min-width: 76px; border-left: 1px solid #f1f5f9; }

    .mme-total-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        border-radius: 8px;
        background: #ede9fe;
        color: #5b21b6;
        font-weight: 800;
        font-size: 14px;
    }

    .mme-grade-badge {
        font-size: 14px;
        font-weight: 800;
    }

    .mme-student-row {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .mme-student-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #ede9fe;
        color: #7c3aed;
        font-weight: 800;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .mme-student-info { min-width: 0; overflow: hidden; flex: 1; }

    .mme-student-name {
        font-weight: 700;
        color: #1e293b;
        font-size: 13px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .mme-student-username {
        font-size: 11px;
        color: #94a3b8;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .mme-sync-btn {
        background: transparent;
        border: none;
        color: #8b5cf6;
        padding: 4px;
        cursor: pointer;
        flex-shrink: 0;
    }
    .mme-sync-btn:disabled { cursor: not-allowed; }

    .mme-score-input {
        width: 56px;
        padding: 5px;
        border-radius: 6px;
        border: 1.5px solid #dbeafe;
        background: #eff6ff;
        color: #1d4ed8;
        text-align: center;
        outline: none;
        box-sizing: border-box;
        font-size: 13px;
        font-weight: 700;
        transition: border-color 0.15s, box-shadow 0.15s;
    }

    .mme-score-input:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
    }

    .mme-score-input:disabled {
        background: #f9fafb;
        border-color: #f1f5f9;
        color: #cbd5e1;
        cursor: not-allowed;
    }

    .mme-legend {
        margin-top: 16px;
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
        font-size: 11px;
        color: #94a3b8;
    }

    .mme-legend-locked { color: #92400e; font-weight: 600; }

    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    @media (max-width: 768px) {
        .mme-container { padding: 16px; }
        .mme-card { padding: 16px; border-radius: 12px; }
        .mme-ov-header { padding: 12px 16px; }
        .mme-ov-body { padding: 16px; }
        .mme-pill span { display: none; }
        .mme-pill { padding: 8px 10px; }
    }

    @media (max-width: 480px) {
        .mme-container { padding: 12px; }
        .mme-card { padding: 12px; }
        .mme-select { max-width: 100%; }
        .mme-add-section { flex-direction: column; align-items: stretch; }
        .mme-input-name, .mme-input-max, .mme-btn-save-section { width: 100%; flex: 1 1 auto; }
        .mme-th-student, .mme-td-student { min-width: 130px; max-width: 130px; }
        .mme-student-name { font-size: 12px; }
        .mme-ov-title { font-size: 14px; }
    }
`;

export default ManualMarksEntry;
