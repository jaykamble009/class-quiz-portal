
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { storageService, getErrorMessage } from '../../services/storage.ts';
import { aiService } from '../../services/ai.ts';
import { Exam, ExamAttempt, User, Subject, Notice, GlobalSystemState } from '../../types.ts';
import { AcademicYear } from '../../types.ts';
import Logo from '../../components/common/Logo.tsx';
import SystemStatusBanner from '../../components/common/SystemStatusBanner.tsx';
import { useToast } from '../../contexts/ToastContext.tsx';

type Section = 'overview' | 'subjects' | 'create_exam' | 'live_monitor' | 'exam_history' | 'students' | 'blocked_users' | 'broadcast';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Data State
  const [students, setStudents] = useState<User[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [settings, setSettings] = useState<GlobalSystemState>(storageService.getDefaultSettings());
  
  const [subjectYear, setSubjectYear] = useState<AcademicYear>('1st Year');
  const [subjectSemester, setSubjectSemester] = useState('Semester 1');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [editingSubject, setEditingSubject] = useState<{id: string, name: string} | null>(null);

  const [createStep, setCreateStep] = useState(1);
  const [customExpiry, setCustomExpiry] = useState('');
  const [newExamData, setNewExamData] = useState({
    year: '1st Year' as AcademicYear, subject: '', notes: '', difficulty: { Easy: 30, Medium: 40, Hard: 30 },
    count: 10, timer: 30, strikeLimit: 3, negativeMarking: true, randomizeOrder: true, showResultImmediately: true,
    questions: [] as any[], files: [] as { name: string; data: string; mimeType: string }[]
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState('');
  const [createdExamId, setCreatedExamId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [studentSearch, setStudentSearch] = useState({ year: 'All', query: '' });
  
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastPriority, setBroadcastPriority] = useState<'info' | 'warning' | 'critical'>('info');
  
  // Live Monitor Enhanced State
  const [monitorViewMode, setMonitorViewMode] = useState<'grid' | 'list'>('grid');
  const [monitorFilter, setMonitorFilter] = useState<'all' | 'critical' | 'warning' | 'clean'>('all');
  const [monitorSearch, setMonitorSearch] = useState('');

  const [historyTab, setHistoryTab] = useState<'active' | 'archived'>('active');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  
  const [viewExamInfo, setViewExamInfo] = useState<Exam | null>(null);
  const [viewResultsExam, setViewResultsExam] = useState<Exam | null>(null); 

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'delete_single' | 'delete_all' | 'archive_all' | 'wipe_history' | 'reset_system' | 'archive_single';
    title: string;
    message: string;
    requireTyping?: string;
    data?: any;
  }>({ isOpen: false, type: 'delete_single', title: '', message: '' });
  const [confirmInput, setConfirmInput] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  const fetchData = useCallback(async () => {
    if (students.length === 0) setLoading(true);
    const safetyTimer = setTimeout(() => setLoading(false), 5000);
    try {
      const [u, e, a, sub, n, s] = await Promise.all([
        storageService.getUsers(), storageService.getExams(true),
        storageService.getAttempts(),
        storageService.getSubjects(), storageService.getNotices(), storageService.getSettings()
      ]);
      setStudents(u || []); setExams(e || []); setAttempts(a || []); setSubjects(sub || []); setNotices(n || []);
      setSettings(s || storageService.getDefaultSettings());
      if (s?.globalAlert) setBroadcastMsg(s.globalAlert);
      if (s?.alertPriority) setBroadcastPriority(s.alertPriority);
      setLastRefresh(new Date());
    } catch (err) { console.error("Fetch Error:", err); } finally { clearTimeout(safetyTimer); setLoading(false); }
  }, [students.length]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // LIVE MONITOR POLLING (CRITICAL FIX)
  useEffect(() => {
    let interval: any;
    if (activeSection === 'live_monitor' || viewResultsExam) {
      const refreshLive = async () => {
         try {
             // Only fetch attempts for speed
             const latestAttempts = await storageService.getAttempts();
             setAttempts(latestAttempts);
             setLastRefresh(new Date());
         } catch (e) {
             console.error("Live sync error", e);
         }
      };
      
      refreshLive(); // Immediate call
      interval = setInterval(refreshLive, 3000); // 3s polling
    }
    return () => clearInterval(interval);
  }, [activeSection, viewResultsExam]);

  // Update Semester Options based on Year
  useEffect(() => {
    if (subjectYear === '1st Year') setSubjectSemester('Semester 1');
    else if (subjectYear === '2nd Year') setSubjectSemester('Semester 3');
    else if (subjectYear === '3rd Year') setSubjectSemester('Semester 5');
  }, [subjectYear]);

  const getSemestersForYear = (year: AcademicYear) => {
    switch(year) {
        case '1st Year': return ['Semester 1', 'Semester 2'];
        case '2nd Year': return ['Semester 3', 'Semester 4'];
        case '3rd Year': return ['Semester 5', 'Semester 6'];
        default: return [];
    }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  // ... (Subject Handlers remain same) ...
  const handleAddSubject = async () => {
    if (!newSubjectName) return addToast("Subject Name Required", "warning");
    try {
      await storageService.addSubject(newSubjectName, subjectYear, subjectSemester);
      addToast("Subject Added", "success");
      setNewSubjectName('');
      fetchData();
    } catch (e) { addToast(getErrorMessage(e), "error"); }
  };

  const handleUpdateSubject = async () => {
    if (!editingSubject || !editingSubject.name.trim()) return;
    try {
        await storageService.updateSubject(editingSubject.id, editingSubject.name);
        addToast("Subject Updated", "success");
        setEditingSubject(null);
        fetchData();
    } catch (e) {
        addToast(getErrorMessage(e), "error");
    }
  };
  
  const handleDeleteSubject = async (id: string) => {
    if(confirm("Delete this subject?")) {
        try { await storageService.deleteSubject(id); fetchData(); } catch (e) { addToast(getErrorMessage(e), "error"); }
    }
  };

  // FILE UPLOAD HANDLER
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        const filesArray = Array.from(e.target.files) as File[];
        if (newExamData.files.length + filesArray.length > 3) {
            addToast("Limit exceeded: Max 3 files allowed.", "warning");
            return;
        }
        const processedFiles = await Promise.all(filesArray.map(file => new Promise<{ name: string, data: string, mimeType: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                resolve({ name: file.name, data: result, mimeType: file.type });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        })));
        setNewExamData(prev => ({ ...prev, files: [...prev.files, ...processedFiles] }));
        addToast(`${filesArray.length} file(s) attached.`, "success");
        if(fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    setNewExamData(prev => ({ ...prev, files: prev.files.filter((_, i) => i !== index) }));
  };

  const generateExamContent = async () => {
    if (!newExamData.subject) return addToast("Subject required", "warning");
    if (newExamData.count > 25) return addToast("Maximum 25 questions allowed.", "warning");
    
    setIsGenerating(true);
    setGenStatus('Initializing Neural Core...');
    try {
        const qs = await aiService.generateQuestions(
            { text: newExamData.notes, files: newExamData.files },
            newExamData.subject, newExamData.year, newExamData.count, newExamData.difficulty, ['mcq'],
            (s) => setGenStatus(s)
        );
        
        // CRITICAL FIX: Assign IDs to questions
        const questionsWithIds = qs.map((q: any) => ({
            ...q,
            id: 'Q-' + Math.random().toString(36).substr(2, 9).toUpperCase()
        }));

        setNewExamData(prev => ({ ...prev, questions: questionsWithIds }));
        setCreateStep(2);
    } catch (e) { addToast(getErrorMessage(e), "error"); }
    finally { setIsGenerating(false); setGenStatus(''); }
  };

  const finalizeExam = async () => {
    try {
        // Enforce Timer Duration Limits (5 - 120 mins)
        let duration = newExamData.timer;
        if (isNaN(duration) || duration < 5) duration = 5;
        if (duration > 120) duration = 120;

        const id = 'EX-' + Math.random().toString(36).substr(2, 6).toUpperCase();
        const newExam: Exam = {
            id, title: `${newExamData.subject} - ${new Date().toLocaleDateString()}`,
            subject: newExamData.subject, subjectId: 'auto', academicYear: newExamData.year,
            durationMinutes: duration, totalQuestions: newExamData.questions.length,
            questions: newExamData.questions, status: 'published', qrCode: id, 
            expiresAt: customExpiry ? new Date(customExpiry).toISOString() : new Date(Date.now() + 172800000).toISOString(),
            createdAt: new Date().toISOString(), createdBy: user?.name || 'Admin', allowedTypes: ['mcq'],
            settings: { negativeMarking: newExamData.negativeMarking, randomizeOrder: newExamData.randomizeOrder, showResultImmediately: newExamData.showResultImmediately, strikeLimit: newExamData.strikeLimit },
            rules: `Standard Hub Protocols. Face & Audio Monitoring Active. Strike Limit: ${newExamData.strikeLimit}. Duration: ${duration} Minutes.`
        };
        await storageService.saveExam(newExam);
        setCreatedExamId(id);
        setCreateStep(3);
        fetchData();
        addToast("Exam Deployed Successfully", "success");
    } catch (e) { addToast(getErrorMessage(e), "error"); }
  };

  const resetExamCreation = () => {
      setCreateStep(1);
      setNewExamData({
        year: '1st Year', subject: '', notes: '', difficulty: { Easy: 30, Medium: 40, Hard: 30 },
        count: 10, timer: 30, strikeLimit: 3, negativeMarking: true, randomizeOrder: true, showResultImmediately: true,
        questions: [], files: []
      });
      setCreatedExamId(null);
      setCustomExpiry('');
  };

  // Helper for Monitor
  const getRemainingTime = (attempt: ExamAttempt, exam?: Exam) => {
      if (!exam) return "Unknown";
      const start = new Date(attempt.timestamp).getTime();
      const durationMs = (exam.durationMinutes || 30) * 60 * 1000;
      const end = start + durationMs;
      const now = Date.now();
      const diff = Math.max(0, Math.floor((end - now) / 1000));
      return `${Math.floor(diff / 60)}m ${diff % 60}s`;
  };

  // EXCEL / CSV EXPORT UTILS
  const downloadCSV = (rows: string[][], filename: string) => {
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportSingleExam = (exam: Exam) => {
     const relevantAttempts = attempts.filter(a => a.examId === exam.id);
     if (relevantAttempts.length === 0) return addToast("No data to export.", "warning");

     const headers = ['Student Name', 'Roll No', 'Year', 'Score', 'Total', 'Percentage', 'Status', 'Strikes', 'Violations Count', 'Date'];
     const rows = relevantAttempts.map(a => {
        const s = students.find(u => u.id === a.studentId);
        const pct = Math.round((a.score / a.totalQuestions) * 100);
        return [
            s?.name || 'Unknown',
            s?.rollNumber || 'N/A',
            s?.academicYear || 'N/A',
            a.score.toString(),
            a.totalQuestions.toString(),
            `${pct}%`,
            a.status.toUpperCase(),
            a.cheatScore.toString(),
            (a.violations?.length || 0).toString(),
            new Date(a.timestamp).toLocaleDateString()
        ].map(cell => `"${cell}"`);
     });

     downloadCSV([headers, ...rows], `Exam_${exam.subject}_${exam.academicYear}`);
     addToast("Export downloaded.", "success");
  };

  const handleExportRegistry = () => {
    // Filter attempts based on the Student Tab Search (Year)
    const targetYear = studentSearch.year;
    
    // Filter students first
    const targetStudents = students.filter(s => targetYear === 'All' || s.academicYear === targetYear);
    const targetStudentIds = new Set(targetStudents.map(s => s.id));

    // Get attempts belonging to these students
    const reportAttempts = attempts.filter(a => targetStudentIds.has(a.studentId));

    if (reportAttempts.length === 0) return addToast("No records found for selected year.", "warning");

    const headers = ['Exam Title', 'Subject', 'Student Name', 'Roll No', 'Year', 'Score', 'Total', 'Percentage', 'Status', 'Date'];
    const rows = reportAttempts.map(a => {
        const s = students.find(u => u.id === a.studentId);
        const e = exams.find(ex => ex.id === a.examId);
        const pct = Math.round((a.score / a.totalQuestions) * 100);
        return [
            e?.title || 'Unknown Exam',
            e?.subject || 'N/A',
            s?.name || 'Unknown',
            s?.rollNumber || 'N/A',
            s?.academicYear || 'N/A',
            a.score.toString(),
            a.totalQuestions.toString(),
            `${pct}%`,
            a.status.toUpperCase(),
            new Date(a.timestamp).toLocaleDateString()
        ].map(cell => `"${cell}"`);
    });

    downloadCSV([headers, ...rows], `Registry_Report_${targetYear}`);
    addToast("Registry Report downloaded.", "success");
  };

  const activeAttempts = useMemo(() => attempts.filter(a => a.status === 'in_progress'), [attempts]);
  
  // Advanced Monitoring Logic
  const filteredActiveAttempts = useMemo(() => {
    let filtered = activeAttempts;

    // Filter by Search
    if (monitorSearch.trim()) {
        filtered = filtered.filter(a => {
            const s = students.find(u => u.id === a.studentId);
            return s?.name.toLowerCase().includes(monitorSearch.toLowerCase()) || s?.rollNumber?.includes(monitorSearch);
        });
    }

    // Filter by Risk
    if (monitorFilter === 'critical') filtered = filtered.filter(a => a.cheatScore > 2);
    else if (monitorFilter === 'warning') filtered = filtered.filter(a => a.cheatScore > 0 && a.cheatScore <= 2);
    else if (monitorFilter === 'clean') filtered = filtered.filter(a => a.cheatScore === 0);

    return filtered;
  }, [activeAttempts, monitorFilter, monitorSearch, students]);

  const handleQuickTerminate = async (attempt: ExamAttempt) => {
    if(!confirm("TERMINATE SESSION?\n\nThis will immediately block the student from continuing. Action cannot be undone easily.")) return;
    try {
        await storageService.saveAttempt({ ...attempt, status: 'blocked', integrityStatus: 'ADMIN-TERMINATED' });
        addToast("Session Terminated Successfully", "success");
        fetchData(); 
    } catch(e) {
        addToast("Termination Failed", "error");
    }
  };
  
  // -- Action Triggers --
  const triggerArchiveAll = () => setConfirmModal({ isOpen: true, type: 'archive_all', title: 'Archive All Exams', message: 'This will hide all active exams.', requireTyping: 'CONFIRM' });
  const triggerWipeHistory = () => setConfirmModal({ isOpen: true, type: 'wipe_history', title: 'Wipe All Results', message: 'Permanently delete ALL student attempts?', requireTyping: 'WIPE' });
  const triggerDeleteAllExams = () => setConfirmModal({ isOpen: true, type: 'delete_all', title: 'Delete ALL Exams', message: 'Permanently delete EVERY exam and result?', requireTyping: 'DELETE ALL' });
  const triggerFactoryReset = () => setConfirmModal({ isOpen: true, type: 'reset_system', title: 'Factory Reset', message: 'Complete system wipe. Deletes Everything.', requireTyping: 'RESET' });
  const triggerDeleteSingle = (exam: Exam) => {
    const attemptCount = attempts.filter(a => a.examId === exam.id).length;
    setConfirmModal({ isOpen: true, type: 'delete_single', title: 'Delete Exam', message: `Delete "${exam.title}" and ${attemptCount} results?`, data: exam, requireTyping: 'DELETE' });
  };
  const triggerArchiveSingle = (exam: Exam) => {
    setConfirmModal({ isOpen: true, type: 'archive_single', title: 'Archive Exam', message: `Archive "${exam.title}"?`, data: exam });
  };

  const executeAction = async () => {
    if (confirmModal.requireTyping && confirmInput !== confirmModal.requireTyping) { addToast(`Please type "${confirmModal.requireTyping}" to confirm.`, "warning"); return; }
    setProcessingAction(true);
    try {
      if (confirmModal.type === 'archive_all') await storageService.archiveAllExams();
      else if (confirmModal.type === 'wipe_history') { await storageService.clearAllAttempts(); setAttempts([]); }
      else if (confirmModal.type === 'delete_all') { await storageService.deleteAllExams(); setExams([]); }
      else if (confirmModal.type === 'reset_system') { await storageService.factoryReset(); window.location.reload(); return; }
      else if (confirmModal.type === 'delete_single' && confirmModal.data) { await storageService.deleteExam(confirmModal.data.id); setExams(prev => prev.filter(e => e.id !== confirmModal.data.id)); }
      else if (confirmModal.type === 'archive_single' && confirmModal.data) { await storageService.archiveExam(confirmModal.data.id); }
      fetchData(); closeModal(); addToast("Action Successful", "success");
    } catch (e) { addToast("Action Failed: " + getErrorMessage(e), "error"); } finally { setProcessingAction(false); }
  };

  const closeModal = () => { setConfirmModal({ ...confirmModal, isOpen: false }); setConfirmInput(''); };

  const unblockStudent = async (id: string) => {
      try { await storageService.updateUser(id, { blockedUntil: null, blockReason: '' }); addToast("Student Unblocked", "success"); fetchData(); } catch (e) { addToast(getErrorMessage(e), "error"); }
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => (studentSearch.year === 'All' || s.academicYear === studentSearch.year) && (s.name.toLowerCase().includes(studentSearch.query.toLowerCase()) || s.rollNumber?.includes(studentSearch.query)));
  }, [students, studentSearch]);

  const saveBroadcast = async () => {
    try { const updated = { ...settings, globalAlert: broadcastMsg, alertPriority: broadcastPriority }; await storageService.saveSettings(updated); setSettings(updated); addToast("Broadcast Updated", "success"); } catch (e) { addToast(getErrorMessage(e), "error"); }
  };

  const clearBroadcast = async () => {
    try { setBroadcastMsg(''); const updated = { ...settings, globalAlert: '', alertPriority: 'info' as const }; await storageService.saveSettings(updated); setSettings(updated); addToast("Broadcast Cleared", "success"); } catch (e) { addToast(getErrorMessage(e), "error"); }
  };

  const displayedExams = useMemo(() => historyTab === 'archived' ? exams.filter(e => e.status === 'archived') : exams.filter(e => e.status !== 'archived'), [exams, historyTab]);

  if (loading && students.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white font-['Plus_Jakarta_Sans']">
        <div className="text-center space-y-4">
           <i className="fa-solid fa-circle-notch animate-spin text-4xl text-indigo-500"></i>
           <p className="text-[10px] font-black uppercase tracking-[0.3em]">Syncing Neural Hub...</p>
        </div>
      </div>
    );
  }

  const sidebarItems: { id: Section, label: string, icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: 'fa-chart-pie' },
    { id: 'subjects', label: 'Subjects', icon: 'fa-book' },
    { id: 'create_exam', label: 'Create Exam', icon: 'fa-wand-magic-sparkles' },
    { id: 'live_monitor', label: 'Live Monitor', icon: 'fa-eye' },
    { id: 'exam_history', label: 'Exam History', icon: 'fa-clock-rotate-left' },
    { id: 'students', label: 'Students', icon: 'fa-users' },
    { id: 'blocked_users', label: 'Blocked Nodes', icon: 'fa-ban' },
    { id: 'broadcast', label: 'Broadcast', icon: 'fa-tower-broadcast' }
  ];

  // Active Exams Logic: Filter out expired exams
  const activeExamsCount = exams.filter(e => 
    e.status === 'published' && 
    (!e.expiresAt || new Date(e.expiresAt) > new Date())
  ).length;

  return (
    <div className="min-h-screen h-screen overflow-hidden bg-[#F8FAFC] flex flex-col font-['Plus_Jakarta_Sans'] overflow-hidden">
      <SystemStatusBanner />
      
      {/* CONFIRMATION MODAL */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[7000] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
           <div className="bg-white max-w-md w-full p-8 rounded-[2.5rem] shadow-2xl space-y-6 text-center border-4 border-slate-100 transform transition-all scale-100">
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto text-4xl shadow-lg ${confirmModal.type.includes('delete') || confirmModal.type.includes('wipe') || confirmModal.type.includes('reset') ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-500'}`}>
                 <i className={`fa-solid ${confirmModal.type.includes('delete') ? 'fa-trash' : confirmModal.type.includes('wipe') ? 'fa-eraser' : confirmModal.type.includes('reset') ? 'fa-radiation' : 'fa-box-archive'}`}></i>
              </div>
              <div className="space-y-2">
                 <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{confirmModal.title}</h3>
                 <p className="text-sm font-bold text-slate-500 leading-relaxed px-4">{confirmModal.message}</p>
              </div>
              
              {confirmModal.requireTyping && (
                <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Type <span className="text-slate-900">"{confirmModal.requireTyping}"</span> to confirm</p>
                   <input 
                      value={confirmInput} 
                      onChange={e => setConfirmInput(e.target.value.toUpperCase())} 
                      className="w-full text-center bg-white border-2 border-slate-200 rounded-xl py-3 font-black text-sm uppercase tracking-widest outline-none focus:border-red-500 transition-colors"
                      placeholder={confirmModal.requireTyping}
                   />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                 <button onClick={closeModal} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-colors">Cancel</button>
                 <button 
                    onClick={executeAction} 
                    disabled={processingAction || (confirmModal.requireTyping ? confirmInput !== confirmModal.requireTyping : false)}
                    className={`flex-1 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest text-white shadow-xl transition-all ${confirmModal.type.includes('delete') || confirmModal.type.includes('wipe') || confirmModal.type.includes('reset') ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'} disabled:opacity-50 disabled:cursor-not-allowed`}
                 >
                    {processingAction ? <i className="fa-solid fa-circle-notch animate-spin"></i> : 'Confirm'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Exam Info Modal */}
      {viewExamInfo && (
        <div className="fixed inset-0 z-[6000] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setViewExamInfo(null)}>
           <div className="bg-white p-10 rounded-[3rem] text-center space-y-6 animate-in zoom-in duration-300 shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
               <div className="space-y-2">
                 <h3 className="text-2xl font-black italic uppercase tracking-tighter">{viewExamInfo.title}</h3>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Exam Details</p>
               </div>
               <div className="p-6 bg-white border-4 border-slate-900 rounded-[2rem] inline-block shadow-xl">
                 <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${viewExamInfo.qrCode || viewExamInfo.id}`} alt="QR Code" className="w-40 h-40" />
               </div>
               <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Exam Unique ID</p>
                  <p className="text-3xl font-black text-indigo-600 font-mono tracking-widest select-all">{viewExamInfo.id}</p>
               </div>
               <button onClick={() => setViewExamInfo(null)} className="w-full py-4 bg-slate-950 text-white rounded-2xl font-black uppercase text-xs tracking-widest">Close Info</button>
           </div>
        </div>
      )}

      {/* Results View Modal */}
      {viewResultsExam && (
        <div className="fixed inset-0 z-[6000] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-6" onClick={() => setViewResultsExam(null)}>
           <div className="bg-white max-w-4xl w-full h-[85vh] rounded-[3rem] p-8 md:p-12 shadow-2xl flex flex-col relative animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
               <button onClick={() => setViewResultsExam(null)} className="absolute top-8 right-8 w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center hover:bg-slate-200"><i className="fa-solid fa-xmark"></i></button>
               <div className="mb-8 flex justify-between items-end">
                  <div>
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest">{viewResultsExam.subject}</span>
                    <h3 className="text-3xl font-black italic uppercase tracking-tighter mt-2">{viewResultsExam.title}</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1 flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                        Live Sync: {lastRefresh.toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                      <button onClick={() => handleExportSingleExam(viewResultsExam)} className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2">
                          <i className="fa-solid fa-file-excel"></i> Export Excel
                      </button>
                      <button onClick={() => fetchData()} className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all"><i className="fa-solid fa-rotate"></i></button>
                  </div>
               </div>
               <div className="flex-1 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left">
                     <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr>
                           <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 rounded-l-xl">Student</th>
                           <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                           <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Score</th>
                           <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Strikes</th>
                           <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 rounded-r-xl text-right">Action</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {attempts.filter(a => a.examId === viewResultsExam.id).sort((a, b) => b.score - a.score).map(a => {
                            const student = students.find(s => s.id === a.studentId);
                            const percentage = Math.round((a.score / a.totalQuestions) * 100);
                            const passed = percentage >= 40; 
                            return (
                               <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="p-4"><p className="font-bold text-slate-900">{student?.name || 'Unknown'}</p><p className="text-[9px] font-bold text-slate-400">{student?.rollNumber}</p></td>
                                  <td className="p-4">{a.status === 'in_progress' ? <span className="text-blue-600 text-[9px] font-black uppercase bg-blue-50 px-2 py-1 rounded animate-pulse">Live</span> : a.status === 'blocked' ? <span className="text-red-600 text-[9px] font-black uppercase bg-red-50 px-2 py-1 rounded">Terminated</span> : <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${passed ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>{passed ? 'Passed' : 'Failed'}</span>}</td>
                                  <td className="p-4 text-center"><span className="text-lg font-black">{a.score}</span><span className="text-xs text-slate-400">/{a.totalQuestions}</span></td>
                                  <td className="p-4 text-center"><span className={`font-black ${a.cheatScore > 0 ? 'text-red-500' : 'text-slate-300'}`}>{a.cheatScore}</span></td>
                                  <td className="p-4 text-right"><button onClick={() => { setViewResultsExam(null); navigate(`/admin/student/${a.studentId}`); }} className="text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800">Audit</button></td>
                               </tr>
                            );
                        })}
                        {attempts.filter(a => a.examId === viewResultsExam.id).length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">No submissions yet.</td></tr>}
                     </tbody>
                  </table>
               </div>
           </div>
        </div>
      )}
      
      <div className="flex-1 flex overflow-hidden relative">
        {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[90] lg:hidden animate-in fade-in" onClick={() => setIsSidebarOpen(false)}></div>}
        <aside className={`fixed inset-y-0 left-0 z-[100] w-72 bg-slate-950 text-white transition-transform duration-500 ease-out transform ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'} lg:relative lg:translate-x-0 border-r border-indigo-500/10`}>
          <div className="p-8 h-full flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 blur-[80px] rounded-full pointer-events-none"></div>
            <div className="flex items-center justify-between mb-12 relative z-10">
              <div className="flex items-center gap-4"><Logo size="sm" variant="light" /><div><h2 className="text-lg font-black italic uppercase tracking-tighter leading-none">Admin</h2><p className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-400 mt-1">Control Panel</p></div></div>
              <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white transition-colors"><i className="fa-solid fa-xmark text-xl"></i></button>
            </div>
            <nav className="flex-1 space-y-2 relative z-10 overflow-y-auto custom-scrollbar pr-2">
              {sidebarItems.map((item) => <button key={item.id} onClick={() => { setActiveSection(item.id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-6 py-3.5 rounded-2xl transition-all group ${activeSection === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${activeSection === item.id ? 'bg-white/20' : 'bg-white/5 group-hover:bg-white/10'}`}><i className={`fa-solid ${item.icon} text-xs`}></i></div><span className="text-[10px] font-black uppercase tracking-[0.15em]">{item.label}</span></button>)}
            </nav>
            <div className="mt-auto pt-8 border-t border-white/10 relative z-10 space-y-3">
               <button onClick={() => navigate('/database-setup')} className="w-full h-12 flex items-center justify-center gap-3 rounded-xl bg-amber-500/10 hover:bg-amber-500 hover:text-slate-900 text-amber-500 transition-all text-[10px] font-black uppercase tracking-widest group">
                  <i className="fa-solid fa-database"></i><span>Database Setup</span>
               </button>
               <button onClick={handleLogout} className="w-full h-12 flex items-center justify-center gap-3 rounded-xl bg-white/5 hover:bg-red-600 hover:text-white text-slate-400 transition-all text-[10px] font-black uppercase tracking-widest group">
                  <i className="fa-solid fa-power-off"></i><span>Logout</span>
               </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto relative scroll-smooth bg-[#F8FAFC] w-full">
          <div className="lg:hidden sticky top-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-center px-6 z-50"><Logo size="sm" /><button onClick={() => setIsSidebarOpen(true)} className="absolute right-6 w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-transform"><i className="fa-solid fa-bars"></i></button></div>
          <div className="p-6 lg:p-12 max-w-7xl mx-auto min-h-full flex flex-col">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 animate-fade-in"><div className="space-y-2"><span className="px-3 py-1 rounded-lg bg-slate-50 text-slate-500 text-[9px] font-black uppercase tracking-widest border border-slate-100">{sidebarItems.find(i => i.id === activeSection)?.label}</span><h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">{activeSection === 'overview' ? 'Institutional Overview' : sidebarItems.find(i => i.id === activeSection)?.label}</h1></div></header>

            {activeSection === 'overview' && (
              <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                 <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                    {[{ label: 'Registered Nodes', val: students.length, color: 'text-indigo-600' }, { label: 'Active Exams', val: activeExamsCount, color: 'text-emerald-600' }, { label: 'Live Sessions', val: activeAttempts.length, color: 'text-blue-600' }, { label: 'Blocked Nodes', val: students.filter(s => s.blockedUntil && new Date(s.blockedUntil) > new Date()).length, color: 'text-red-600' }].map((stat, i) => (
                      <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all"><p className={`text-4xl font-black italic tracking-tighter ${stat.color}`}>{stat.val}</p><p className="text-sm font-bold text-slate-900 mt-2">{stat.label}</p></div>
                    ))}
                 </div>
              </div>
            )}

            {/* Other Sections (Subjects, Create Exam, etc.) */}
            {activeSection === 'subjects' && (
               <div className="space-y-8 animate-in fade-in">
                  <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col gap-6">
                     <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-1 w-full space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Academic Year</label>
                            <select value={subjectYear} onChange={e => setSubjectYear(e.target.value as AcademicYear)} className="elite-input bg-slate-50">
                                <option value="1st Year">1st Year</option>
                                <option value="2nd Year">2nd Year</option>
                                <option value="3rd Year">3rd Year</option>
                            </select>
                        </div>
                        <div className="flex-1 w-full space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Semester</label>
                            <select value={subjectSemester} onChange={e => setSubjectSemester(e.target.value)} className="elite-input bg-slate-50">
                                {getSemestersForYear(subjectYear).map(sem => (
                                    <option key={sem} value={sem}>{sem}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-[2] w-full space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Subject Name</label>
                            <input value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} placeholder="e.g. Advanced AI Systems" className="elite-input" />
                        </div>
                     </div>
                     <button onClick={handleAddSubject} className="w-full h-[52px] bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-indigo-700 transition-all">Add Subject to {subjectSemester}</button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {subjects.filter(s => s.academicYear === subjectYear).map(s => (
                        <div key={s.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 flex justify-between items-center group hover:shadow-lg transition-all">
                           {editingSubject?.id === s.id ? (
                                <div className="flex items-center gap-2 w-full">
                                    <input value={editingSubject.name} onChange={e => setEditingSubject({...editingSubject, name: e.target.value})} className="elite-input h-10 text-sm" autoFocus />
                                    <button onClick={handleUpdateSubject} className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center"><i className="fa-solid fa-check"></i></button>
                                    <button onClick={() => setEditingSubject(null)} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-200 transition-all flex items-center justify-center"><i className="fa-solid fa-xmark"></i></button>
                                </div>
                           ) : (
                                <>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-900">{s.name}</span>
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.semester || 'General'}</span>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={() => setEditingSubject({ id: s.id, name: s.name })} className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center"><i className="fa-solid fa-pen text-xs"></i></button>
                                        <button onClick={() => handleDeleteSubject(s.id)} className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center"><i className="fa-solid fa-trash text-xs"></i></button>
                                    </div>
                                </>
                           )}
                        </div>
                     ))}
                     {subjects.filter(s => s.academicYear === subjectYear).length === 0 && <div className="col-span-full py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">No subjects found for {subjectYear}</div>}
                  </div>
               </div>
            )}

            {activeSection === 'live_monitor' && (
               <div className="animate-in fade-in space-y-8">
                  
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
                         <div>
                            <p className="text-3xl font-black text-blue-600">{activeAttempts.length}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Active</p>
                         </div>
                         <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600"><i className="fa-solid fa-users"></i></div>
                      </div>
                      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
                         <div>
                            <p className="text-3xl font-black text-red-600">{activeAttempts.filter(a => a.cheatScore > 2).length}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Critical Risk</p>
                         </div>
                         <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 animate-pulse"><i className="fa-solid fa-triangle-exclamation"></i></div>
                      </div>
                      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
                         <div>
                            <p className="text-3xl font-black text-amber-500">{activeAttempts.filter(a => a.cheatScore > 0 && a.cheatScore <= 2).length}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Warnings</p>
                         </div>
                         <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500"><i className="fa-solid fa-circle-exclamation"></i></div>
                      </div>
                  </div>

                  {/* Filter Toolbar */}
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm">
                     <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                           <i className="fa-solid fa-search text-slate-400 text-xs"></i>
                           <input 
                              value={monitorSearch} 
                              onChange={e => setMonitorSearch(e.target.value)} 
                              placeholder="Search Student..." 
                              className="bg-transparent border-none outline-none text-xs font-bold text-slate-700 w-32 md:w-48 placeholder:text-slate-400" 
                           />
                        </div>
                        <select 
                           value={monitorFilter} 
                           onChange={e => setMonitorFilter(e.target.value as any)} 
                           className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 text-xs font-bold text-slate-600 outline-none cursor-pointer"
                        >
                           <option value="all">All Risks</option>
                           <option value="critical">Critical Only</option>
                           <option value="warning">Warnings Only</option>
                           <option value="clean">Clean Sessions</option>
                        </select>
                     </div>
                     <div className="flex gap-2">
                        <button onClick={() => fetchData()} className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all"><i className="fa-solid fa-rotate"></i></button>
                        <button onClick={() => setMonitorViewMode('grid')} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${monitorViewMode === 'grid' ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'}`}><i className="fa-solid fa-grip"></i></button>
                        <button onClick={() => setMonitorViewMode('list')} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${monitorViewMode === 'list' ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'}`}><i className="fa-solid fa-list"></i></button>
                     </div>
                  </div>

                  {monitorViewMode === 'grid' ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredActiveAttempts.map(a => {
                           const student = students.find(s => s.id === a.studentId);
                           const exam = exams.find(e => e.id === a.examId);
                           const timeLeft = getRemainingTime(a, exam);
                           const isCritical = a.cheatScore > 2;
                           const isWarning = a.cheatScore > 0 && !isCritical;
                           const borderColor = isCritical ? 'border-red-500' : isWarning ? 'border-amber-400' : 'border-emerald-500/30';
                           const statusColor = isCritical ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-emerald-500';
                           const statusBg = isCritical ? 'bg-red-50' : isWarning ? 'bg-amber-50' : 'bg-emerald-50';

                           return (
                              <div key={a.id} className={`bg-white p-6 rounded-[2.5rem] border-2 shadow-sm relative overflow-hidden group transition-all hover:shadow-xl ${borderColor}`}>
                                 {/* Status Header */}
                                 <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-3">
                                       <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm ${statusBg} ${statusColor}`}>
                                          {student?.name[0]}
                                       </div>
                                       <div>
                                          <h4 className="font-bold text-slate-900 leading-tight">{student?.name || 'Loading...'}</h4>
                                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{student?.rollNumber}</p>
                                       </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                       <span className={`text-xl font-black ${statusColor}`}>{a.cheatScore}</span>
                                       <div className="flex items-center gap-1.5 mt-0.5">
                                          <span className={`w-1.5 h-1.5 rounded-full ${isCritical ? 'bg-red-500 animate-ping' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Strikes</span>
                                       </div>
                                    </div>
                                 </div>

                                 {/* Exam Details */}
                                 <div className="space-y-4 mb-6">
                                     <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                                         <span>{exam?.subject}</span>
                                         <span className="font-mono">{timeLeft} Left</span>
                                     </div>
                                     <div>
                                        <div className="flex justify-between mb-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                            <span>Progress</span>
                                            <span>Q{a.currentQuestionIndex !== undefined ? a.currentQuestionIndex + 1 : 1} / {a.totalQuestions}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                            <div className={`h-full transition-all duration-500 ${isCritical ? 'bg-red-500' : 'bg-indigo-600'}`} style={{ width: `${(a.score / a.totalQuestions) * 100}%` }}></div>
                                        </div>
                                     </div>
                                 </div>
                                 
                                 {/* Detailed Violations */}
                                 <div className="flex gap-2 mb-6">
                                     <div className="flex-1 bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center justify-between px-3">
                                         <i className="fa-solid fa-window-maximize text-slate-400 text-xs"></i>
                                         <span className="text-xs font-black text-slate-700">{a.tabSwitchCount || 0}</span>
                                     </div>
                                     <div className="flex-1 bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center justify-between px-3">
                                         <i className="fa-solid fa-user-slash text-slate-400 text-xs"></i>
                                         <span className="text-xs font-black text-slate-700">{a.faceMoveCount || 0}</span>
                                     </div>
                                 </div>

                                 {/* Actions */}
                                 <div className="flex gap-3">
                                     <button onClick={() => navigate(`/admin/student/${a.studentId}`)} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-white hover:text-indigo-600 hover:shadow-md transition-all border border-transparent hover:border-slate-100">
                                        View
                                     </button>
                                     <button onClick={() => handleQuickTerminate(a)} className="flex-1 py-3 bg-red-50 text-red-500 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-red-500 hover:text-white hover:shadow-lg hover:shadow-red-500/30 transition-all">
                                        Terminate
                                     </button>
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                  ) : (
                     <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                           <thead className="bg-slate-50"><tr><th className="p-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Student</th><th className="p-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Risk Level</th><th className="p-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Violations</th><th className="p-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Progress</th><th className="p-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Action</th></tr></thead>
                           <tbody>
                              {filteredActiveAttempts.map(a => {
                                 const student = students.find(s => s.id === a.studentId);
                                 const isCritical = a.cheatScore > 2;
                                 return (
                                    <tr key={a.id} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
                                       <td className="p-4 font-bold text-slate-900">{student?.name || 'Loading...'}</td>
                                       <td className="p-4">
                                          {isCritical ? 
                                            <span className="bg-red-100 text-red-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">Critical</span> : 
                                            a.cheatScore > 0 ? 
                                            <span className="bg-amber-100 text-amber-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">Warning</span> : 
                                            <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">Clean</span>
                                          }
                                       </td>
                                       <td className="p-4 text-xs font-bold text-slate-600">
                                          <span className="mr-3"><i className="fa-solid fa-window-maximize mr-1 text-slate-400"></i>{a.tabSwitchCount || 0}</span>
                                          <span><i className="fa-solid fa-user-slash mr-1 text-slate-400"></i>{a.faceMoveCount || 0}</span>
                                       </td>
                                       <td className="p-4 text-xs font-mono font-bold text-slate-700">{Math.round((a.score / a.totalQuestions) * 100)}%</td>
                                       <td className="p-4 text-right">
                                           <button onClick={() => handleQuickTerminate(a)} className="text-[10px] font-black uppercase text-red-500 hover:text-red-700 tracking-widest">Terminate</button>
                                       </td>
                                    </tr>
                                 );
                              })}
                           </tbody>
                        </table>
                     </div>
                  )}
                  {filteredActiveAttempts.length === 0 && <div className="text-center py-12 text-slate-400 text-xs font-bold uppercase tracking-widest">No active sessions match criteria.</div>}
               </div>
            )}

            {/* ... (Create Exam, History, Students, Broadcast Sections remain the same) ... */}
            {activeSection === 'create_exam' && (
               <div className="animate-in fade-in zoom-in duration-300">
                  {createStep === 1 && (
                     <div className="bg-white p-8 lg:p-12 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
                        <div className="grid md:grid-cols-2 gap-8">
                           <div className="space-y-4"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Target Year</label><select value={newExamData.year} onChange={e => setNewExamData({...newExamData, year: e.target.value as AcademicYear})} className="elite-input bg-slate-50"><option value="1st Year">1st Year</option><option value="2nd Year">2nd Year</option><option value="3rd Year">3rd Year</option></select></div>
                           <div className="space-y-4">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Subject</label>
                               <select value={newExamData.subject} onChange={e => setNewExamData({...newExamData, subject: e.target.value})} className="elite-input bg-slate-50">
                                   <option value="">Select Subject...</option>
                                   {subjects.filter(s => s.academicYear === newExamData.year).map(s => (
                                       <option key={s.id} value={s.name}>{s.name} {s.semester ? `(${s.semester})` : ''}</option>
                                   ))}
                               </select>
                           </div>
                           <div className="md:col-span-2 space-y-4">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Source Material (Text / PDF / Images)</label>
                               <textarea value={newExamData.notes} onChange={e => setNewExamData({...newExamData, notes: e.target.value})} className="w-full h-32 p-6 bg-slate-50 rounded-[2rem] border-2 border-slate-200 outline-none focus:border-indigo-600 transition-all font-bold text-slate-700 placeholder:text-slate-400 mb-2" placeholder="Paste study notes or syllabus context here..." />
                               <div className="flex flex-col md:flex-row gap-4 items-start">
                                    <div className="relative overflow-hidden group w-full md:w-auto">
                                        <button className="px-6 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-3">
                                            <i className="fa-solid fa-paperclip"></i> Attach File (PDF/Img)
                                        </button>
                                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,.pdf,text/plain" multiple className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </div>
                                    <div className="flex flex-wrap gap-2">{newExamData.files.map((f, i) => (<div key={i} className="px-4 py-2 bg-slate-100 rounded-lg flex items-center gap-2 text-xs font-bold text-slate-600 animate-in zoom-in"><span>{f.name}</span><button onClick={() => removeFile(i)} className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"><i className="fa-solid fa-xmark text-[10px]"></i></button></div>))}</div>
                               </div>
                           </div>
                           <div className="md:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-6 pt-4 border-t border-slate-50">
                                <div className="space-y-2">
                                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Question Count</label>
                                   <input type="number" min="1" max="25" value={newExamData.count} onChange={e => setNewExamData({...newExamData, count: parseInt(e.target.value)})} className="elite-input text-center" />
                                   <p className="text-[9px] font-bold text-emerald-600 mt-1 text-center">Max 25 (Cost Optimization)</p>
                                </div>
                                <div className="space-y-2">
                                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Exam Timer (5-120m)</label>
                                   <div className="relative">
                                       <input 
                                           type="number" 
                                           min="5" 
                                           max="120" 
                                           value={newExamData.timer} 
                                           onChange={e => setNewExamData({...newExamData, timer: parseInt(e.target.value)})} 
                                           onBlur={e => {
                                               let val = parseInt(e.target.value);
                                               if (isNaN(val) || val < 5) val = 5;
                                               if (val > 120) val = 120;
                                               setNewExamData({...newExamData, timer: val});
                                           }}
                                           className="elite-input text-center font-bold text-indigo-900" 
                                       />
                                       <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 pointer-events-none">MIN</div>
                                   </div>
                                </div>
                                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Strike Limit</label><select value={newExamData.strikeLimit} onChange={e => setNewExamData({...newExamData, strikeLimit: parseInt(e.target.value)})} className="elite-input bg-slate-50 text-center"><option value="1">1 Strike</option><option value="3">3 Strikes</option><option value="5">5 Strikes</option></select></div>
                                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expiry Date</label><input type="datetime-local" value={customExpiry} onChange={e => setCustomExpiry(e.target.value)} className="elite-input text-xs" /></div>
                           </div>
                        </div>
                        <div className="pt-4"><button onClick={generateExamContent} disabled={isGenerating} className="w-full h-20 bg-slate-950 text-white rounded-[2.5rem] font-black uppercase tracking-[0.3em] shadow-xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-4 text-sm disabled:opacity-70">{isGenerating ? <><i className="fa-solid fa-circle-notch animate-spin"></i> {genStatus}</> : 'Generate Exam'}</button></div>
                     </div>
                  )}
                  {createStep === 2 && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-8">
                       <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                          <h3 className="text-xl font-black italic uppercase tracking-tighter mb-6 flex items-center gap-3"><i className="fa-solid fa-eye text-indigo-600"></i> Review Generated Content</h3>
                          <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                             {newExamData.questions.map((q, i) => (
                                <div key={i} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                                   <div className="flex justify-between mb-2"><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Question {i + 1}</span><span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded ${q.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-600' : q.difficulty === 'Medium' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>{q.difficulty}</span></div>
                                   <p className="font-bold text-slate-900 mb-4">{q.text}</p>
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{q.options.map((opt: string, idx: number) => <div key={idx} className={`p-3 rounded-xl text-xs font-bold ${idx === q.correctAnswer ? 'bg-emerald-500 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'}`}>{opt}</div>)}</div>
                                </div>
                             ))}
                          </div>
                       </div>
                       <div className="flex gap-4">
                          <button onClick={() => setCreateStep(1)} className="flex-1 py-5 bg-white border border-slate-200 text-slate-600 rounded-[2rem] font-black uppercase text-xs tracking-widest hover:bg-slate-50">Back</button>
                          <button onClick={finalizeExam} className="flex-[2] py-5 bg-emerald-500 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl hover:bg-emerald-600">Publish Exam</button>
                       </div>
                    </div>
                  )}
                  {createStep === 3 && createdExamId && (
                     <div className="bg-white p-12 rounded-[3rem] border border-slate-100 text-center space-y-8 animate-in zoom-in">
                        <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-4xl text-emerald-500 shadow-xl"><i className="fa-solid fa-check"></i></div>
                        <h3 className="text-3xl font-black italic uppercase tracking-tighter">Exam Deployed</h3>
                        <div className="p-8 bg-slate-50 rounded-[2.5rem] inline-block shadow-inner"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${createdExamId}`} alt="QR" className="mix-blend-multiply" /></div>
                        <p className="font-mono text-2xl font-black text-slate-900 tracking-widest">{createdExamId}</p>
                        <button onClick={resetExamCreation} className="px-12 py-5 bg-slate-950 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest hover:bg-indigo-600 shadow-xl">Create Another</button>
                     </div>
                  )}
               </div>
            )}

            {activeSection === 'exam_history' && (
                <div className="space-y-8 animate-in fade-in">
                    <div className="flex gap-4 p-2 bg-white rounded-2xl w-fit shadow-sm border border-slate-100">
                        <button onClick={() => setHistoryTab('active')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${historyTab === 'active' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-600'}`}>Active</button>
                        <button onClick={() => setHistoryTab('archived')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${historyTab === 'archived' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-600'}`}>Archived</button>
                    </div>
                    <div className="space-y-4">
                        {displayedExams.map(e => (
                            <div key={e.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 group hover:shadow-lg transition-all">
                                <div className="flex items-center gap-6">
                                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 font-bold text-xs shadow-inner"><i className="fa-solid fa-file-contract text-lg"></i></div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-lg">{e.title}</h4>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            {e.subject} • {e.academicYear} • <span className="text-indigo-600">{e.durationMinutes}m</span> • {e.totalQuestions} Qs
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setViewExamInfo(e)} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center"><i className="fa-solid fa-eye"></i></button>
                                    <button onClick={() => setViewResultsExam(e)} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center"><i className="fa-solid fa-square-poll-vertical"></i></button>
                                    {e.status !== 'archived' ? (
                                        <button onClick={() => triggerArchiveSingle(e)} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-amber-500 hover:text-white transition-all flex items-center justify-center"><i className="fa-solid fa-box-archive"></i></button>
                                    ) : (
                                        <button onClick={() => triggerDeleteSingle(e)} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center"><i className="fa-solid fa-trash"></i></button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {displayedExams.length === 0 && <div className="text-center py-12 text-slate-400 text-xs font-bold uppercase tracking-widest">No exams found.</div>}
                    </div>
                    {historyTab === 'active' && displayedExams.length > 0 && <button onClick={triggerArchiveAll} className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-amber-100 hover:text-amber-600 transition-all">Archive All Active Exams</button>}
                    {historyTab === 'archived' && displayedExams.length > 0 && <button onClick={triggerDeleteAllExams} className="w-full py-4 bg-red-50 text-red-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-600 hover:text-white transition-all">Delete All Archived</button>}
                </div>
            )}

            {activeSection === 'students' && (
                <div className="space-y-6 animate-in fade-in">
                    <div className="flex flex-col md:flex-row gap-4 justify-between">
                       <div className="flex gap-4 flex-1">
                           <input value={studentSearch.query} onChange={e => setStudentSearch({...studentSearch, query: e.target.value})} placeholder="Search Student..." className="elite-input bg-white w-full" />
                           <select value={studentSearch.year} onChange={e => setStudentSearch({...studentSearch, year: e.target.value})} className="elite-input bg-white w-40"><option value="All">All Years</option><option value="1st Year">1st Year</option><option value="2nd Year">2nd Year</option><option value="3rd Year">3rd Year</option></select>
                       </div>
                       <button onClick={handleExportRegistry} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition-all shadow-lg flex items-center gap-2 whitespace-nowrap">
                          <i className="fa-solid fa-file-csv"></i> Export Data (CSV)
                       </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredStudents.map(s => (
                            <div key={s.id} onClick={() => navigate(`/admin/student/${s.id}`)} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">{s.name[0]}</div>
                                    <div><p className="font-bold text-slate-900">{s.name}</p><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{s.rollNumber}</p></div>
                                </div>
                                <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                                    <span className="text-[10px] font-bold text-slate-400">{s.academicYear}</span>
                                    {s.blockedUntil ? <span className="text-[9px] font-black uppercase text-red-500 bg-red-50 px-2 py-1 rounded">Restricted</span> : <span className="text-[9px] font-black uppercase text-emerald-500 bg-emerald-50 px-2 py-1 rounded">Active</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeSection === 'blocked_users' && (
                <div className="space-y-6 animate-in fade-in">
                    {students.filter(s => s.blockedUntil && new Date(s.blockedUntil) > new Date()).map(s => (
                        <div key={s.id} className="bg-white p-6 rounded-[2rem] border border-red-100 shadow-sm flex justify-between items-center">
                            <div><h4 className="font-bold text-slate-900">{s.name}</h4><p className="text-xs text-red-500 font-bold mt-1"><i className="fa-solid fa-ban mr-2"></i>{s.blockReason}</p></div>
                            <button onClick={() => unblockStudent(s.id)} className="px-6 py-3 bg-emerald-50 text-emerald-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-600 hover:text-white transition-all">Unblock</button>
                        </div>
                    ))}
                    {students.filter(s => s.blockedUntil && new Date(s.blockedUntil) > new Date()).length === 0 && <div className="text-center py-12 text-slate-400 text-xs font-bold uppercase tracking-widest">No restricted nodes.</div>}
                </div>
            )}

            {activeSection === 'broadcast' && (
                <div className="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-sm space-y-8 animate-in zoom-in">
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">Global System Broadcast</h3>
                    <textarea value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} className="w-full h-40 p-6 bg-slate-50 rounded-[2rem] border-2 border-slate-200 outline-none focus:border-indigo-600 font-bold text-slate-700" placeholder="Type announcement for all terminals..." />
                    <div className="flex gap-4">
                        <select value={broadcastPriority} onChange={e => setBroadcastPriority(e.target.value as any)} className="elite-input bg-slate-50"><option value="info">Info (Blue)</option><option value="warning">Warning (Amber)</option><option value="critical">Critical (Red)</option></select>
                        <button onClick={saveBroadcast} className="flex-[2] bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all shadow-xl">Transmit</button>
                        <button onClick={clearBroadcast} className="px-6 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-200 transition-all"><i className="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            )}

            <div className="mt-20 pt-10 border-t border-slate-100 text-center">
               <button onClick={triggerWipeHistory} className="text-[10px] font-black uppercase tracking-widest text-red-300 hover:text-red-500 transition-colors">Dangerous: Wipe All Student Data</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
