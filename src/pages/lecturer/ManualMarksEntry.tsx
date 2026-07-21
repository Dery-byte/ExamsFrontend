import React, { useState, useEffect } from 'react';
import client from '../../api/client';
import { toast } from 'react-hot-toast';
import { syncMarksForStudent, syncMarksBulk, addSheetSection, deleteSheetSection } from '../../api/endpoints';
import { DownloadCloud, RefreshCw, Plus, Trash2 } from 'lucide-react';

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

    const handleMarkChange = (studentIdx: number, courseIdx: number, sectionIdx: number, value: string) => {
        const newData = { ...sheetData };
        let val = parseFloat(value);
        if (isNaN(val)) val = 0;

        const maxScore = newData.sections[sectionIdx].maxScore;
        if (val > maxScore) {
            val = maxScore;
            toast.error(`Score cannot exceed maximum marks (${maxScore})`);
        } else if (val < 0) {
            val = 0;
        }

        newData.studentMarks[studentIdx].courseMarks[courseIdx].sectionMarks[sectionIdx].scoreObtained = val;

        // Recalculate total score
        let total = 0;
        newData.studentMarks[studentIdx].courseMarks[courseIdx].sectionMarks.forEach((sec: any) => {
            total += (sec.scoreObtained || 0);
        });

        // Recalculate grade
        let grade = "F";
        if (total >= 90) grade = "A+";
        else if (total >= 80) grade = "A";
        else if (total >= 70) grade = "B";
        else if (total >= 60) grade = "C";
        else if (total >= 50) grade = "D";

        newData.studentMarks[studentIdx].courseMarks[courseIdx].totalScore = total;
        newData.studentMarks[studentIdx].courseMarks[courseIdx].grade = grade;

        setSheetData(newData);
    };

    const handleSave = async () => {
        try {
            await client.post(client.defaults.baseURL!.replace('/v1/auth', '') + `/marks/sheet/${selectedSheetId}/save`, sheetData);
            toast.success("Marks saved successfully!");
        } catch(error) {
            toast.error("Failed to save marks");
        }
    };

    const handleSubmit = async () => {
        if (!window.confirm("Are you sure you want to submit? You won't be able to edit after submission.")) return;
        try {
            await client.post(client.defaults.baseURL!.replace('/v1/auth', '') + `/marks/sheet/${selectedSheetId}/save`, sheetData);
            await client.post(client.defaults.baseURL!.replace('/v1/auth', '') + `/marks/sheet/${selectedSheetId}/submit`);
            toast.success("Sheet submitted to Super Admin!");
            setSheetData(null);
            fetchSheets();
        } catch (error) {
            toast.error("Failed to submit sheet");
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
            <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
                <h2 style={{ marginBottom: '24px', fontWeight: '800', color: '#2a3142' }}>Manual Marks Entry</h2>
                <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <select style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', width: '100%', maxWidth: '520px' }} value={selectedSheetId} onChange={handleSheetSelect}>
                        <option value="">Select an active semester sheet</option>
                        {sheets.map((s: any) => (
                            <option key={s.id} value={s.id}>
                                {s.courseName || `Sheet #${s.id}`} — Level {s.level} | Sem {s.semester} | {s.status}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        );
    }

    const isReadOnly = sheetData.status === 'SUBMITTED' || sheetData.status === 'PUBLISHED';
    const allCourses = sheetData.studentMarks.length > 0 ? sheetData.studentMarks[0].courseMarks : [];

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
            <h2 style={{ marginBottom: '24px', fontWeight: '800', color: '#2a3142' }}>Manual Marks Entry</h2>
            <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                    <h5 style={{ fontWeight: '700', color: '#2a3142', margin: 0 }}>Sheet Data (Level {sheetData.level}, Sem {sheetData.semester})</h5>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={() => setSheetData(null)} style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Back</button>
                        {!isReadOnly && (
                            <button onClick={() => setShowAddSection(!showAddSection)} style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Plus size={16} /> Add Section
                            </button>
                        )}
                        {!isReadOnly && (
                            <button onClick={handleBulkSync} disabled={bulkSyncing || !sheetData.sections?.length} style={{ background: '#8b5cf6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: bulkSyncing || !sheetData.sections?.length ? 'not-allowed' : 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', opacity: bulkSyncing || !sheetData.sections?.length ? 0.7 : 1 }}>
                                <DownloadCloud size={16} /> {bulkSyncing ? 'Fetching...' : 'Bulk Fetch Marks'}
                            </button>
                        )}
                        {!isReadOnly && <button onClick={handleSave} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Save Progress</button>}
                        {!isReadOnly && <button onClick={handleSubmit} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Submit Final</button>}
                    </div>
                </div>

                {showAddSection && !isReadOnly && (
                    <div style={{ padding: '16px', background: '#fef3c7', borderRadius: '8px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <input type="text" placeholder="Section Name (e.g. CA, Exam)" value={newSectionName} onChange={e => setNewSectionName(e.target.value)} style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #d1d5db', outline: 'none' }} />
                        <input type="number" placeholder="Max Score" value={newSectionMax} onChange={e => setNewSectionMax(e.target.value)} style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #d1d5db', outline: 'none', width: '120px' }} />
                        <button onClick={handleAddSection} disabled={addingSection} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}>
                            {addingSection ? 'Saving...' : 'Save Section'}
                        </button>
                    </div>
                )}
                
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ minWidth: '1000px', width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}>
                        <thead style={{ background: '#f8f9fa' }}>
                            <tr>
                                <th rowSpan={2} style={{ padding: '12px', border: '1px solid #e5e7eb', verticalAlign: 'middle', minWidth: '200px', textAlign: 'left' }}>Student</th>
                                {allCourses.map((c: any) => (
                                    <th key={c.courseId} colSpan={sheetData.sections.length + 2} style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'center', background: '#f3f4f6' }}>
                                        <div style={{ fontWeight: '700', color: '#111827' }}>{c.courseCode}</div>
                                        <div style={{ fontWeight: '400', fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{c.courseTitle}</div>
                                    </th>
                                ))}
                            </tr>
                            <tr>
                                {allCourses.map((c: any) => (
                                    <React.Fragment key={c.courseId}>
                                        {sheetData.sections.map((sec: any) => (
                                            <th key={`${c.courseId}-${sec.id}`} style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center', fontSize: '12px', color: '#4b5563' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                    {sec.sectionName} (/{sec.maxScore})
                                                    {!isReadOnly && sec.deletable !== false && <Trash2 size={12} color="#ef4444" style={{ cursor: 'pointer' }} onClick={() => handleDeleteSection(sec.id)} />}
                                                </div>
                                            </th>
                                        ))}
                                        <th key={`${c.courseId}-total`} style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center', fontSize: '12px', color: '#111827', fontWeight: 'bold' }}>
                                            Total
                                        </th>
                                        <th key={`${c.courseId}-grade`} style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center', fontSize: '12px', color: '#111827', fontWeight: 'bold' }}>
                                            Grade
                                        </th>
                                    </React.Fragment>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sheetData.studentMarks.map((student: any, sIdx: number) => (
                                <tr key={student.studentId} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                    <td style={{ padding: '12px', border: '1px solid #e5e7eb' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <div style={{ fontWeight: '600', color: '#111827' }}>{student.studentName}</div>
                                                <div style={{ fontSize: '12px', color: '#6b7280' }}>{student.username}</div>
                                            </div>
                                            {!isReadOnly && (
                                                <button 
                                                    onClick={() => handleSyncStudent(student.studentId)}
                                                    disabled={syncingStudent === student.studentId}
                                                    title="Fetch System Marks"
                                                    style={{ background: 'transparent', border: 'none', cursor: syncingStudent === student.studentId ? 'not-allowed' : 'pointer', color: '#8b5cf6', padding: '4px' }}
                                                >
                                                    <RefreshCw size={16} className={syncingStudent === student.studentId ? 'spin' : ''} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    {student.courseMarks.map((cMark: any, cIdx: number) => (
                                        <React.Fragment key={cMark.courseId}>
                                            {cMark.sectionMarks.map((sMark: any, secIdx: number) => (
                                                <td key={`${cMark.courseId}-${sMark.sectionId}`} style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                                                    <input 
                                                        type="number" 
                                                        value={sMark.scoreObtained === 0 ? '' : sMark.scoreObtained}
                                                        onChange={(e) => handleMarkChange(sIdx, cIdx, secIdx, e.target.value)}
                                                        disabled={isReadOnly}
                                                        max={sheetData.sections[secIdx].maxScore}
                                                        min="0"
                                                        style={{ width: '60px', padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db', textAlign: 'center', outline: 'none' }}
                                                    />
                                                </td>
                                            ))}
                                            <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center', fontWeight: 'bold', color: '#111827', background: '#f9fafb' }}>
                                                {cMark.totalScore || 0}
                                            </td>
                                            <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center', fontWeight: 'bold', color: cMark.grade === 'F' ? '#ef4444' : '#10b981', background: '#f9fafb' }}>
                                                {cMark.grade || 'N/A'}
                                            </td>
                                        </React.Fragment>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default ManualMarksEntry;
