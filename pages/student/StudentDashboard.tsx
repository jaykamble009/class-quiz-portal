
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { storageService, getErrorMessage } from '../../services/storage.ts';
import ExamInterface from './ExamInterface.tsx';
import { Exam, ExamAttempt, User, AcademicYear, GlobalSystemState, Notice } from '../../types.ts';
import Logo from '../../components/common/Logo.tsx';
import SystemStatusBanner from '../../components/common/SystemStatusBanner.tsx';
import DeveloperCreditPopup from '../../components/auth/DeveloperCreditPopup.tsx';
import QRScanner from '../../components/exam/QRScanner.tsx';
import { useToast } from '../../contexts/ToastContext.tsx';
import ExamHistory from '../../components/student/ExamHistory.tsx';

// ... (NavIcon, InstructionsModal components helpers)

const NavIcon = ({ icon, label, active, onClick, disabled }: { icon: string, label: string, active: boolean, onClick: () => void, disabled?: boolean }) => (
  <button
    disabled={disabled}
    onClick={onClick}
    className={`flex flex-col items-center justify-center space-y-2 transition-all flex-1 py-4 lg:w-full lg:flex-row lg:space-y-0 lg:space-x-6 lg:p-6 lg:rounded-[2rem] lg:justify-start ${disabled ? 'opacity-30 grayscale' : active ? 'text-indigo-600 lg:bg-[#2F5BEA] lg:text-white lg:shadow-2xl' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
  >
    <div className={`w-12 h-11 lg:w-11 lg:h-11 flex items-center justify-center rounded-2xl transition-all ${active ? 'bg-indigo-600 text-white lg:bg-white/20' : 'bg-slate-100'}`}>
      <i className={`fa-solid ${icon} text-lg`}></i>
    </div>
    <span className="text-[10px] font-black uppercase tracking-widest hidden md:block lg:block">{label}</span>
  </button>
);

const InstructionsModal: React.FC<{ exam: Exam, onClose: () => void, onStart: () => void }> = ({ exam, onClose, onStart }) => {
  return (
    <div className="fixed inset-0 z-[6000] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6">
      <div className="bg-white max-w-2xl w-full rounded-[3rem] p-10 md:p-14 shadow-2xl space-y-8 animate-in zoom-in duration-300 relative">
        <button onClick={onClose} className="absolute top-8 right-8 w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center hover:bg-slate-200">
          <i className="fa-solid fa-xmark"></i>
        </button>

        <div className="space-y-4">
          <div className="inline-block px-4 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
            {exam.subject}
          </div>
          <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">{exam.title}</h2>
        </div>

        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 max-h-[40vh] overflow-y-auto custom-scrollbar">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Official Instructions & Rules</h3>
          <div className="prose prose-sm prose-slate max-w-none font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">
            {exam.rules || "No specific rules provided. Standard academic integrity protocols apply. Ensure your camera and microphone are active. Full-screen mode is mandatory."}
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button onClick={onClose} className="flex-1 py-5 bg-white border-2 border-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={onStart} className="flex-[2] py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">
            Start Exam
          </button>
        </div>
      </div>
    </div>
  );
};

// ResultCard
const ResultCard: React.FC<{ h: any, isLive?: boolean }> = ({ h, isLive }) => (
  <div className={`bg-white p-6 lg:p-10 rounded-[2.5rem] border-4 flex flex-col items-start gap-6 shadow-sm relative overflow-hidden group transition-all hover:scale-[1.01] ${isLive ? 'border-indigo-600/20 shadow-indigo-100/50' : 'border-slate-50'}`}>
    <div className={`absolute left-0 top-0 bottom-0 w-3 ${h.isPass ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
    {isLive && (
      <div className="absolute top-6 right-10 flex items-center gap-2">
        <div className="w-2 h-2 bg-indigo-600 rounded-full animate-ping"></div>
        <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest italic">Auditing</span>
      </div>
    )}
    <div className="w-full flex justify-between items-start">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-slate-100 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-500">{h.subject}</span>
          <span className="text-[9px] font-bold text-slate-300">{h.date}</span>
        </div>
        <h4 className="text-xl font-black italic uppercase tracking-tighter text-slate-900 leading-none truncate max-w-[200px]">{h.title}</h4>
      </div>
      <div className="text-right">
        <p className={`text-3xl font-black italic leading-none tracking-tighter ${h.isPass ? 'text-emerald-600' : 'text-red-600'}`}>
          {Math.round((h.score / h.totalQuestions) * 100)}<span className="text-sm">%</span>
        </p>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Accuracy</p>
      </div>
    </div>

    <div className="w-full flex gap-2">
      <div className="flex-1 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
        <span className="block text-lg font-black text-slate-900">{h.score}/{h.totalQuestions}</span>
        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Score</span>
      </div>
      <div className="flex-1 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
        <span className="block text-lg font-black text-red-600">{h.cheatScore}</span>
        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Strikes</span>
      </div>
    </div>
  </div>
);

const StudentDashboard: React.FC = () => {
  const { user, logout, forgotPassword } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'home' | 'hub' | 'results' | 'history' | 'profile' | 'guardian'>('home');
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<ExamAttempt | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [examJoinCode, setExamJoinCode] = useState('');
  const [settings, setSettings] = useState<GlobalSystemState | null>(null);
  const [showCredits, setShowCredits] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);


  // Allow perfect scrolling on this page
  useEffect(() => {
    document.body.style.setProperty('overflow', 'auto', 'important');
    
    // Check for critical permissions proactively
    const initPermissionCheck = async () => {
      try {
        if (navigator.permissions) {
          const cam = await navigator.permissions.query({ name: 'camera' as any });
          if (cam.state === 'prompt') {
            setShowPermissionModal(true);
          }
          cam.onchange = () => {
             if (cam.state === 'granted') setShowPermissionModal(false);
          };
        } else {
          // Fallback for browsers that don't support permission query
          setShowPermissionModal(true);
        }
      } catch (e) {
        setShowPermissionModal(true);
      }
    };
    initPermissionCheck();

    return () => {
      document.body.style.setProperty('overflow', 'hidden', 'important');
    };
  }, []);

  // Real Data States
  const [exams, setExams] = useState<Exam[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [globalAttempts, setGlobalAttempts] = useState<ExamAttempt[]>([]); // For leaderboard
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);

  const [profile, setProfile] = useState<User | null>(user);
  const [selectedExamForInstructions, setSelectedExamForInstructions] = useState<Exam | null>(null);
  const [blockTimer, setBlockTimer] = useState<string | null>(null);

  // Guardian State
  const [guardianSearch, setGuardianSearch] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null); // Tracks which student ID is being processed

  // Determine Super User (Jay Kamble) Status - IMMUNITY LOGIC
  const isSuperUser = useMemo(() => {
    if (!profile) return false;
    return profile.isSuperStudent ||
      profile.email.includes('jk365242') ||
      profile.rollNumber === '33' ||
      profile.name.toLowerCase().includes('jay kamble');
  }, [profile]);

  const load = async () => {
    if (!user) return;
    setIsLoading(true);

    const safetyTimer = setTimeout(() => setIsLoading(false), 5000);

    try {
      const [allEx, allAtt, allUsr, sysSettings, sysNotices, freshUserData] = await Promise.all([
        storageService.getExams(),
        storageService.getAttempts(),
        storageService.getUsers(),
        storageService.getSettings(),
        storageService.getNotices(),
        storageService.getUserByEmail(user.email)
      ]);

      setExams(allEx || []);
      setGlobalAttempts(allAtt || []); // Save all for leaderboard
      setAttempts((allAtt || []).filter(a => a.studentId === user.id)); // Personal attempts
      setAllUsers(allUsr || []);
      setSettings(sysSettings || storageService.getDefaultSettings());
      setNotices(sysNotices || []);

      if (freshUserData) {
        setProfile(freshUserData);
      } else {
        const found = (allUsr || []).find(u => u.id === user.id);
        setProfile(found || user);
      }

      if (sysSettings?.showDevPopup && !sessionStorage.getItem('dev_credit_shown')) {
        setShowCredits(true);
        sessionStorage.setItem('dev_credit_shown', 'true');
      }
    } catch (err) {
      console.error("Dashboard Load Error:", err);
    } finally {
      clearTimeout(safetyTimer);
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, [user]);

  // Guardian Logic
  const toggleStudentSelection = (id: string) => {
    const newSet = new Set(selectedStudentIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedStudentIds(newSet);
  };

  const selectAllFiltered = () => {
    const filtered = allUsers.filter(s =>
      s.name.toLowerCase().includes(guardianSearch.toLowerCase()) ||
      s.rollNumber?.includes(guardianSearch)
    );
    const newSet = new Set(selectedStudentIds);
    filtered.forEach(s => newSet.add(s.id));
    setSelectedStudentIds(newSet);
  };

  const deselectAll = () => setSelectedStudentIds(new Set());

  const handleBulkBlock = async () => {
    if (selectedStudentIds.size === 0) return addToast("No nodes selected.", "warning");
    const reason = prompt("Restriction Reason (Guardian Protocol):");
    if (!reason) return;

    if (confirm(`Restrict ${selectedStudentIds.size} users for 24h?`)) {
      setActionLoading("bulk");
      const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const promises = Array.from(selectedStudentIds).map(id =>
        storageService.updateUser(id as string, { blockedUntil: expiry, blockReason: reason })
      );
      await Promise.all(promises);
      addToast("Protocol Executed: Targets Restricted.", "success");
      setSelectedStudentIds(new Set());
      setActionLoading(null);
      load();
    }
  };

  const handleBulkUnblock = async () => {
    if (selectedStudentIds.size === 0) return addToast("No nodes selected.", "warning");
    if (confirm(`Restore access for ${selectedStudentIds.size} users?`)) {
      setActionLoading("bulk");
      const promises = Array.from(selectedStudentIds).map(id =>
        storageService.updateUser(id as string, { blockedUntil: null, blockReason: '' })
      );
      await Promise.all(promises);
      addToast("Protocol Executed: Targets Restored.", "success");
      setSelectedStudentIds(new Set());
      setActionLoading(null);
      load();
    }
  };

  // Direct Actions
  const handleSingleBlock = async (studentId: string) => {
    const reason = prompt("Restriction Reason (Guardian Protocol):");
    if (!reason) return;
    setActionLoading(studentId);

    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Optimistic Update
    setAllUsers(prev => prev.map(u => u.id === studentId ? { ...u, blockedUntil: expiry, blockReason: reason } : u));

    try {
      await storageService.updateUser(studentId, { blockedUntil: expiry, blockReason: reason });
      addToast("Target Restricted.", "warning");
    } catch (e) {
      addToast("Action failed.", "error");
      load(); // Revert on fail
    } finally {
      setActionLoading(null);
    }
  };

  const handleSingleUnblock = async (studentId: string) => {
    if (!confirm("Restore access for this node?")) return;
    setActionLoading(studentId);

    // Optimistic Update
    setAllUsers(prev => prev.map(u => u.id === studentId ? { ...u, blockedUntil: null, blockReason: '' } : u));

    try {
      await storageService.updateUser(studentId, { blockedUntil: null, blockReason: '' });
      addToast("Target Restored.", "success");
    } catch (e) {
      addToast("Action failed.", "error");
      load(); // Revert
    } finally {
      setActionLoading(null);
    }
  };

  const toggleAppealPermission = async (e: any, userId: string, currentVal: boolean) => {
    e.stopPropagation();
    setActionLoading(userId);

    // Optimistic Update
    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, allowUnblockRequest: !currentVal } : u));

    try {
      await storageService.updateUser(userId, { allowUnblockRequest: !currentVal });
      addToast(`Appeal Permission ${!currentVal ? 'GRANTED' : 'REVOKED'}`, "success");
    } catch (e) {
      addToast("Action failed", "error");
      load(); // Revert
    } finally {
      setActionLoading(null);
    }
  };

  // DEVELOPER POPUP TOGGLE LOGIC
  const toggleDevPopup = async () => {
    if (!settings) return;
    const newState = !settings.showDevPopup;
    const updated = { ...settings, showDevPopup: newState };
    setSettings(updated);
    try {
      await storageService.saveSettings(updated);
      addToast(`Global Popup Protocol: ${newState ? 'ENABLED' : 'DISABLED'}`, newState ? 'success' : 'warning');
    } catch (e) {
      addToast("Failed to sync setting.", "error");
    }
  };

  // Leaderboard Calculation (Memoized)
  const leaderboard = useMemo(() => {
    if (globalAttempts.length === 0 || allUsers.length === 0) return [];
    const studentScores: Record<string, { user: User, score: number }> = {};
    globalAttempts.forEach(att => {
      if (!studentScores[att.studentId]) {
        const student = allUsers.find(u => u.id === att.studentId);
        if (student) {
          studentScores[att.studentId] = { user: student, score: 0 };
        }
      }
      if (studentScores[att.studentId]) {
        studentScores[att.studentId].score += att.score;
      }
    });
    return Object.values(studentScores).sort((a, b) => b.score - a.score).slice(0, 5);
  }, [globalAttempts, allUsers]);

  // Real-time Block Status Polling
  useEffect(() => {
    if (!user || isSuperUser) return; // Don't poll if immune

    const checkStatus = async () => {
      try {
        const fresh = await storageService.getUserByEmail(user.email);
        if (fresh) {
          // Only update profile if critical blocking info changed
          setProfile(prev => {
            if (prev?.blockedUntil !== fresh.blockedUntil || prev?.allowUnblockRequest !== fresh.allowUnblockRequest) {
              return fresh;
            }
            return prev;
          });
        }
      } catch (e) { /* silent poll fail */ }
    };

    const interval = setInterval(checkStatus, 5000); // Check every 5s
    return () => clearInterval(interval);
  }, [user, isSuperUser]);

  // Block Logic & Timer - IMMUNITY CHECK
  useEffect(() => {
    if (isSuperUser) {
      setBlockTimer(null);
      return;
    }

    if (!profile || !profile.blockedUntil) {
      setBlockTimer(null);
      return;
    }

    const checkExpiration = () => {
      const expiry = new Date(profile.blockedUntil!).getTime();
      const now = Date.now();

      if (now > expiry) {
        setBlockTimer(null);
        setProfile(prev => prev ? ({ ...prev, blockedUntil: null, blockReason: '' }) : null);
        storageService.updateUser(profile.id, { blockedUntil: null, blockReason: '' })
          .catch(e => console.error("Auto-unblock sync failed:", getErrorMessage(e)));
        return true;
      }

      const distance = expiry - now;
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      let timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      if (days > 0) timeStr = `${days}d ${timeStr}`;

      setBlockTimer(timeStr);
      return false;
    };

    if (checkExpiration()) return;
    const interval = setInterval(() => { if (checkExpiration()) clearInterval(interval); }, 1000);
    return () => clearInterval(interval);
  }, [profile, isSuperUser]);

  const analytics = useMemo(() => {
    if (!profile) return null;
    const totalExams = attempts.length;
    const totalScorePct = attempts.reduce((acc, curr) => acc + (curr.score / curr.totalQuestions), 0);
    const avgAccuracy = totalExams > 0 ? Math.round((totalScorePct / totalExams) * 100) : 0;
    const totalMinutes = attempts.reduce((acc, att) => {
      const ex = exams.find(e => e.id === att.examId);
      return acc + (ex ? ex.durationMinutes : 30);
    }, 0);
    const studyHours = (totalMinutes / 60).toFixed(1);
    const subjectStats: Record<string, { total: number, scored: number }> = {};
    attempts.forEach(att => {
      const ex = exams.find(e => e.id === att.examId);
      const sub = ex ? ex.subject : 'General';
      if (!subjectStats[sub]) subjectStats[sub] = { total: 0, scored: 0 };
      subjectStats[sub].total += att.totalQuestions;
      subjectStats[sub].scored += att.score;
    });
    const mastery = Object.entries(subjectStats).map(([sub, data]) => ({ subject: sub, percentage: Math.round((data.scored / data.total) * 100) }));
    const trajectory = [...attempts].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).slice(-5).map(a => Math.round((a.score / a.totalQuestions) * 100));
    return { rank: "Top 10%", avgAccuracy, totalExams, studyHours, mastery, trajectory };
  }, [attempts, exams, profile, allUsers]);

  const resultsData = useMemo(() => {
    const twoHoursInMs = 2 * 60 * 60 * 1000;
    const now = Date.now();
    const processed = attempts.map(a => {
      const exam = exams.find(e => e.id === a.examId);
      const passMark = Math.ceil(a.totalQuestions * 0.4);
      const isPass = a.score >= passMark;
      const expiryTime = exam ? new Date(exam.expiresAt).getTime() : new Date(a.timestamp).getTime();
      const isFinalized = now > (expiryTime + twoHoursInMs);
      return { ...a, title: exam?.title || 'System Assessment', isPass, statusLabel: isPass ? 'PASS' : 'FAIL', date: new Date(a.timestamp).toLocaleDateString(), subject: exam?.subject || 'Registry', isFinalized };
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return processed;
  }, [attempts, exams]);

  const activeNotices = useMemo(() => {
    const adminNotices = notices.filter(n => n.targetYear === 'All' || n.targetYear === profile?.academicYear);
    return adminNotices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [notices, profile]);

  const handleJoinExamRequest = async (code?: string) => {
    if (profile?.isArchived) { addToast("Archive Profile: Assessments locked.", "error"); return; }

    // Strict Global Block Check - IMMUNITY CHECK
    if ((profile?.blockedUntil && new Date(profile.blockedUntil) > new Date()) && !isSuperUser) {
      addToast("Access Denied: Terminal restricted by Administrator.", "error");
      return;
    }

    const targetCode = (code || examJoinCode).trim().toUpperCase();
    if (!targetCode) { addToast("Please enter a valid Exam ID.", "warning"); return; }

    let exam = exams.find(e => e.id === targetCode);
    if (!exam) {
      try {
        const freshExams = await storageService.getExams();
        setExams(freshExams);
        exam = freshExams.find(e => e.id === targetCode);
      } catch (err) { console.debug("Failed to re-fetch exams"); }
    }

    if (!exam) { addToast(`Node identification failed. ID '${targetCode}' not found.`, "error"); return; }

    // Validate Academic Year
    if (exam.academicYear !== profile?.academicYear && !isSuperUser) {
      addToast(`Segment restricted. Exam is for ${exam.academicYear}, you are ${profile?.academicYear}.`, "error");
      return;
    }

    if (exam.status === 'closed') { addToast("This exam has been closed by the administrator.", "error"); return; }

    // 1. Global Expiry Check
    if (exam.expiresAt && new Date(exam.expiresAt) < new Date()) {
      addToast("This exam is no longer available (Expired).", "error");
      return;
    }

    const freshAttempts = await storageService.getAttempts();
    setAttempts(freshAttempts.filter(a => a.studentId === user?.id));

    const existingAttempt = freshAttempts.find(a => a.examId === exam!.id && a.studentId === user?.id);

    if (existingAttempt) {
      if (existingAttempt.status === 'completed') {
        addToast("Access Denied: You have already completed this exam.", "error");
        return;
      }

      if (existingAttempt.status === 'blocked' && !isSuperUser) {
        addToast("Terminated: You were blocked from this exam due to violations. Retake not allowed.", "error");
        return;
      }

      if (existingAttempt.status === 'in_progress') {
        const startTime = new Date(existingAttempt.timestamp).getTime();
        const durationMinutes = exam.durationMinutes || 30;
        const durationMs = durationMinutes * 60 * 1000;

        let endTime = startTime + durationMs;
        if (exam.expiresAt) {
          const globalExpiry = new Date(exam.expiresAt).getTime();
          if (globalExpiry > startTime) endTime = Math.min(endTime, globalExpiry);
        }

        if (Date.now() > endTime + 60000) {
          addToast("Previous session timed out. Finalizing record...", "warning");
          await storageService.saveAttempt({ ...existingAttempt, status: 'completed' });
          load();
          return;
        }
      }
    }

    setSelectedExamForInstructions(exam);
  };

  const startExam = (exam: Exam) => {
    const existingAttempt = attempts.find(a => a.examId === exam.id && a.studentId === user?.id);
    if (existingAttempt && (existingAttempt.status === 'completed' || (existingAttempt.status === 'blocked' && !isSuperUser))) {
      addToast("Action prevented: Exam record finalized or blocked.", "error");
      setSelectedExamForInstructions(null);
      return;
    }
    setActiveAttempt(existingAttempt);
    setActiveExam(exam);
    setSelectedExamForInstructions(null);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white font-['Plus_Jakarta_Sans']">
      <div className="text-center space-y-4">
        <i className="fa-solid fa-circle-notch animate-spin text-4xl text-indigo-500"></i>
        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Connecting to Student Hub...</p>
      </div>
    </div>
  );

  // IMMUNITY: Never show blocked screen to Super User
  if (blockTimer && !isSuperUser) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 text-center font-['Plus_Jakarta_Sans'] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
        <div className="bg-slate-990 p-12 rounded-[4rem] border-4 border-red-600/30 shadow-[0_0_100px_rgba(220,38,38,0.2)] max-w-2xl w-full relative z-10 animate-in zoom-in duration-500">
          <div className="w-24 h-24 bg-red-600/10 text-red-500 rounded-[2.5rem] flex items-center justify-center mx-auto text-5xl mb-8 border border-red-500/20">
            <i className="fa-solid fa-ban"></i>
          </div>
          <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-4">Access Restricted</h1>
          <p className="text-red-400 font-bold text-sm uppercase tracking-widest mb-10">{profile?.blockReason || "Security Violation Detected"}</p>
          <div className="bg-black/40 p-10 rounded-[2.5rem] border border-red-500/20 mb-8">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.5em] mb-4">Unblock Timer</p>
            <div className="text-6xl md:text-8xl font-black text-red-500 font-mono tracking-widest tabular-nums leading-none">{blockTimer}</div>
          </div>

          {/* SUPER STUDENT CONTACT INFO - CONDITIONALLY RENDERED */}
          {profile?.allowUnblockRequest && (
            <div className="mt-8 p-6 bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4">
              <h3 className="text-indigo-400 font-black uppercase tracking-widest text-xs mb-4 flex items-center justify-center gap-2">
                <i className="fa-solid fa-shield-halved"></i> Guardian Intervention
              </h3>
              <p className="text-slate-400 text-xs font-medium mb-6">Permission granted to contact Super Student.</p>
              <div className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/5 max-w-xs mx-auto">
                <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg border border-indigo-400">JK</div>
                <div className="text-left flex-1">
                  <p className="text-white font-bold text-sm">Jay Kamble</p>
                  <p className="text-[9px] text-indigo-400 uppercase tracking-widest font-black">Guardian Node</p>
                </div>
                <button
                  onClick={() => addToast("Request Sent to Guardian Node.", "success")}
                  className="px-4 py-2 bg-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-white hover:bg-indigo-600 transition-colors"
                >
                  Request
                </button>
              </div>
            </div>
          )}

          <button onClick={logout} className="mt-8 px-8 py-4 bg-white/5 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all">Close Connection</button>
        </div>
      </div>
    );
  }

  if (activeExam) return <ExamInterface exam={activeExam} initialAttempt={activeAttempt} onComplete={() => { setActiveExam(null); setActiveAttempt(undefined); load(); setActiveTab('results'); }} />;

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#F8FAFC] flex flex-col font-['Plus_Jakarta_Sans'] relative">
      <SystemStatusBanner />
      {showCredits && <DeveloperCreditPopup onClose={() => setShowCredits(false)} />}
      {showScanner && <QRScanner onScan={(d) => { setShowScanner(false); setExamJoinCode(d); handleJoinExamRequest(d); }} onClose={() => setShowScanner(false)} />}

      {showPermissionModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-2xl flex items-center justify-center p-6 text-center font-['Plus_Jakarta_Sans']">
          <div className="max-w-md w-full bg-white rounded-[3rem] p-10 md:p-14 shadow-2xl space-y-8 animate-in zoom-in duration-500 border-b-[8px] border-indigo-600">
            <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-[2.5rem] flex items-center justify-center mx-auto text-4xl shadow-inner border-2 border-indigo-100 relative">
               <i className="fa-solid fa-shield-halved"></i>
               <div className="absolute -top-2 -right-2 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs animate-bounce">
                 <i className="fa-solid fa-lock-open"></i>
               </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 leading-tight">Terminal Activation</h2>
              <p className="text-slate-500 font-medium leading-relaxed">To ensure a secure and proctored examination environment, this portal requires <span className="text-indigo-600 font-black">Camera Access</span>.</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-start gap-4 text-left">
               <i className="fa-solid fa-circle-info text-indigo-500 mt-1"></i>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Permission will only be used for live proctoring during active exam sessions.</p>
            </div>
            <button 
              onClick={async () => {
                try {
                  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                  stream.getTracks().forEach(t => t.stop());
                  setShowPermissionModal(false);
                  addToast("Biometric Node Activated.", "success");
                } catch (e) {
                  addToast("Permission Denied. Check settings.", "error");
                }
              }}
              className="w-full py-6 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-slate-950 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              Enable Secure Node
              <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row relative h-full overflow-hidden">

      <aside className="hidden lg:flex w-80 bg-white border-r-4 border-slate-100 flex-col p-10 space-y-12 z-20 overflow-y-auto custom-scrollbar">
        <div className="flex items-center gap-6"><Logo size="md" /><div className="leading-none"><h2 className="text-lg font-black tracking-tighter uppercase italic text-slate-900">Student</h2><p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Portal v1.2</p></div></div>
        <nav className="flex-1 space-y-5">
          <NavIcon icon="fa-house" label="Dashboard" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <NavIcon icon="fa-layer-group" label="Exam Hub" active={activeTab === 'hub'} onClick={() => setActiveTab('hub')} />
          <NavIcon icon="fa-chart-pie" label="Registry" active={activeTab === 'results'} onClick={() => setActiveTab('results')} />
          <NavIcon icon="fa-clock-rotate-left" label="History" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
          <NavIcon icon="fa-id-card" label="Profile" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
          {isSuperUser && (
            <NavIcon icon="fa-shield-dog" label="Guardian" active={activeTab === 'guardian'} onClick={() => setActiveTab('guardian')} />
          )}
        </nav>
        <button onClick={() => logout()} className="w-full py-5 bg-red-50 text-red-500 rounded-[2rem] font-black uppercase text-[10px] tracking-widest hover:bg-red-600 hover:text-white transition-all">Log Out</button>
      </aside>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-2 sm:p-4 z-50 flex justify-around items-center shadow-2xl overflow-x-auto overflow-y-hidden custom-scrollbar">
        <NavIcon icon="fa-house" label="" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
        <NavIcon icon="fa-layer-group" label="" active={activeTab === 'hub'} onClick={() => setActiveTab('hub')} />
        <NavIcon icon="fa-chart-pie" label="" active={activeTab === 'results'} onClick={() => setActiveTab('results')} />
        <NavIcon icon="fa-clock-rotate-left" label="" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
        <NavIcon icon="fa-id-card" label="" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
        {isSuperUser && <NavIcon icon="fa-shield-dog" label="" active={activeTab === 'guardian'} onClick={() => setActiveTab('guardian')} />}
      </div>

      <main className="flex-1 overflow-y-auto p-4 md:p-12 pb-32 lg:pb-12 max-w-7xl mx-auto w-full mt-14 lg:mt-0 custom-scrollbar relative">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-4 md:gap-0">
          <div className="space-y-1 w-full md:w-auto">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{getGreeting()}</p>
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg border-2 border-white shrink-0">
                  {(profile?.name?.[0] || 'U').toUpperCase()}
               </div>
               <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter italic uppercase leading-none break-all sm:break-normal">{profile?.name}</h1>
            </div>
          </div>
          {isSuperUser && (
            <div className="px-6 py-2 bg-indigo-600 text-white rounded-xl shadow-lg border border-indigo-400 flex items-center gap-2 self-start md:self-auto">
              <i className="fa-solid fa-star text-xs animate-pulse"></i>
              <span className="text-[9px] font-black uppercase tracking-widest">Guardian Node</span>
            </div>
          )}
        </header>

        {activeTab === 'home' && (
          <div className="space-y-10 animate-fade-in">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
              {[
                { label: 'Avg Accuracy', val: `${analytics?.avgAccuracy}%`, icon: 'fa-bullseye', col: 'text-indigo-600' },
                { label: 'Exams Taken', val: analytics?.totalExams, icon: 'fa-file-signature', col: 'text-emerald-600' },
                { label: 'Study Hours', val: analytics?.studyHours, icon: 'fa-clock', col: 'text-blue-600' },
                { label: 'Global Rank', val: analytics?.rank, icon: 'fa-trophy', col: 'text-amber-500' }
              ].map((s, i) => (
                <div key={i} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center bg-slate-50 ${s.col}`}><i className={`fa-solid ${s.icon}`}></i></div>
                  <div><p className="text-2xl font-black italic tracking-tight text-slate-900">{s.val}</p><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{s.label}</p></div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-slate-950 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 blur-[80px] rounded-full pointer-events-none"></div>
                <div className="relative z-10 flex justify-between items-end mb-8">
                  <div><h3 className="text-2xl font-black italic uppercase tracking-tighter">Performance Trajectory</h3><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Last 5 Assessments</p></div>
                  <button onClick={() => setActiveTab('results')} className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white hover:text-slate-950 transition-all"><i className="fa-solid fa-arrow-right"></i></button>
                </div>
                <div className="h-40 flex items-end justify-between gap-2 md:gap-4 relative z-10 px-2">
                  {analytics?.trajectory.length === 0 ? <div className="w-full text-center text-slate-600 text-xs font-black uppercase tracking-widest self-center">No Data Available</div> : analytics?.trajectory.map((score, i) => (
                    <div key={i} className="flex-1 flex flex-col justify-end items-center group">
                      <span className="mb-2 text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">{score}%</span>
                      <div className="w-full bg-indigo-600/30 rounded-t-2xl relative overflow-hidden transition-all group-hover:bg-indigo-50" style={{ height: `${score}%` }}><div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-400"></div></div>
                      <div className="mt-3 w-2 h-2 rounded-full bg-slate-800"></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-6">
                <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex-1">
                  <div className="flex items-center gap-3 mb-6"><div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 text-sm shadow-sm"><i className="fa-solid fa-trophy"></i></div><h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-900">Top Achievers</h3></div>
                  <div className="space-y-4">
                    {leaderboard.length > 0 ? leaderboard.map((item, index) => (
                      <div key={index} className="flex items-center justify-between group">
                        <div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs border-2 ${index === 0 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-white text-slate-400 border-slate-100'}`}>{index + 1}</div><div><p className="text-xs font-bold leading-tight text-slate-700">{item.user.name}</p></div></div><span className="text-sm font-black text-indigo-600">{item.score}</span>
                      </div>
                    )) : <div className="text-center py-6 text-slate-400 text-[10px] font-black uppercase tracking-widest">No rankings available yet.</div>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'hub' && (
          <div className="space-y-12 animate-fade-in">
            <div className="bg-indigo-600 text-white p-10 md:p-14 rounded-[3.5rem] shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
              <div className="relative z-10 space-y-4 max-w-lg">
                <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter leading-none">Exam Hub</h2>
                <p className="text-indigo-200 font-medium text-sm leading-relaxed">Access authorized assessments via QR Code or Secure Exam ID only.</p>
              </div>
              <button onClick={() => setShowScanner(true)} className="relative z-10 px-10 py-5 bg-white text-indigo-600 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center gap-3 hover:scale-105 transition-transform"><i className="fa-solid fa-qrcode text-lg"></i> Scan Entry</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-slate-950 p-8 rounded-[3rem] shadow-xl text-center space-y-6 flex flex-col justify-center">
                <div className="w-16 h-16 bg-white/10 rounded-2xl mx-auto flex items-center justify-center text-white text-2xl mb-2"><i className="fa-solid fa-keyboard"></i></div>
                <h3 className="text-white font-black uppercase tracking-widest text-xs">Manual Exam Entry</h3>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest px-10">Enter the unique Exam ID provided by your faculty to begin.</p>
                <div className="flex gap-2">
                  <input value={examJoinCode} onChange={e => setExamJoinCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleJoinExamRequest()} placeholder="ENTER EXAM ID" className="w-full bg-white/10 border-none rounded-xl text-center text-white font-black tracking-widest outline-none focus:bg-white/20 transition-all uppercase placeholder:text-white/20" />
                  <button onClick={() => handleJoinExamRequest()} className="w-12 h-12 bg-white text-slate-950 rounded-xl flex items-center justify-center hover:bg-indigo-500 hover:text-white transition-colors"><i className="fa-solid fa-arrow-right"></i></button>
                </div>
              </div>
              <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col justify-center items-center text-center space-y-4">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 text-2xl"><i className="fa-solid fa-lock"></i></div>
                <div><h3 className="text-slate-900 font-black uppercase tracking-widest text-xs">Secure Access Protocol</h3><p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2 max-w-xs mx-auto">For security, visible exam listings are disabled. You must scan a QR code or enter a valid ID to access any assessment.</p></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'results' && (
          <div className="space-y-10 animate-fade-in">
            <div className="flex justify-between items-end border-b-4 border-slate-100 pb-8">
              <div><h2 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900">Registry Archive</h2><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Historical outcomes & Analytics</p></div>
              <div className="hidden md:block bg-indigo-50 text-indigo-600 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">{resultsData.length} Records Found</div>
            </div>
            <div className="grid gap-6">
              {resultsData.map(h => <ResultCard key={h.id} h={h} isLive={!h.isFinalized} />)}
              {resultsData.length === 0 && <div className="py-24 text-center opacity-40 italic font-black text-xl uppercase tracking-widest">No history available.</div>}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="animate-fade-in max-w-2xl mx-auto space-y-12">
            <div className="bg-white p-12 rounded-[4rem] border-4 border-slate-50 shadow-sm text-center relative overflow-hidden">
              <div className="w-32 h-32 bg-slate-950 text-white rounded-[2.5rem] flex items-center justify-center font-black text-5xl mx-auto mb-6 shadow-2xl relative z-10 border-4 border-white">{profile?.name[0]}</div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">{profile?.name}</h2>
              <p className="text-indigo-600 font-bold text-sm mt-2">{profile?.email}</p>
              <div className="mt-8 flex justify-center gap-4"><span className="px-6 py-2 bg-slate-50 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 border border-slate-100">{profile?.role}</span><span className="px-6 py-2 bg-slate-50 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 border border-slate-100">{profile?.academicYear}</span></div>
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-900 px-4">Account Actions</h3>
              <button className="w-full p-6 bg-white rounded-[2.5rem] border border-slate-100 flex items-center justify-between group hover:border-indigo-600/30 transition-all shadow-sm" onClick={async () => {
                  try {
                      const res = await forgotPassword(profile?.email || '', profile?.rollNumber || '', '', profile?.academicYear);
                      addToast(res.message || (res.success ? "Password reset link sent to your email." : "Failed to send link."), res.success ? "success" : "error");
                  } catch (e) {
                      addToast("Error requesting password reset.", "error");
                  }
              }}><div className="flex items-center gap-4"><div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-900 group-hover:bg-indigo-600 group-hover:text-white transition-colors"><i className="fa-solid fa-key"></i></div><div className="text-left"><p className="font-black text-slate-900 text-sm">Change Password</p><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Update your login password</p></div></div><i className="fa-solid fa-chevron-right text-slate-300"></i></button>
              <button className="w-full p-6 bg-white rounded-[2.5rem] border border-slate-100 flex items-center justify-between group hover:border-blue-600/30 transition-all shadow-sm" onClick={() => setShowCredits(true)}><div className="flex items-center gap-4"><div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors"><i className="fa-solid fa-code"></i></div><div className="text-left"><p className="font-black text-slate-900 text-sm">Developer Credits</p><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">View Architects</p></div></div><i className="fa-solid fa-chevron-right text-slate-300"></i></button>
              <button className="w-full p-6 bg-red-50 rounded-[2.5rem] border border-red-100 flex items-center justify-between group hover:bg-red-600 hover:text-white transition-all shadow-sm mt-4" onClick={() => logout()}><div className="flex items-center gap-4"><div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 group-hover:bg-white/20 group-hover:text-white transition-colors"><i className="fa-solid fa-arrow-right-from-bracket"></i></div><div className="text-left"><p className="font-black text-sm">Logout</p><p className="text-[9px] font-black uppercase tracking-widest opacity-60">Sign out of account</p></div></div></button>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="animate-fade-in">
            <ExamHistory exams={exams} />
          </div>
        )}

        {/* GUARDIAN UNIT INTERFACE - Super Student Access */}
        {activeTab === 'guardian' && isSuperUser && (
          <div className="bg-slate-950 p-12 rounded-[4rem] border-4 border-indigo-500/30 shadow-2xl space-y-12 animate-in zoom-in duration-700 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-red-600/5 blur-[150px] rounded-full"></div>
            <div className="space-y-4 relative z-10 border-b border-white/5 pb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h3 className="text-4xl font-black italic tracking-tighter uppercase text-indigo-400">Guardian Hub</h3>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em]">Identity Control Unit</p>
              </div>
              <div className="flex gap-4">
                <button onClick={selectAllFiltered} className="px-6 py-3 bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all">Select All</button>
                <button onClick={deselectAll} className="px-6 py-3 bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all">Deselect</button>
              </div>
            </div>

            {/* Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
              {/* Search & Action Panel */}
              <div className="lg:col-span-2 bg-white/5 p-6 rounded-[2rem] border border-white/5 space-y-4">
                <input
                  value={guardianSearch}
                  onChange={e => setGuardianSearch(e.target.value)}
                  placeholder="SEARCH NODE ID / NAME..."
                  className="w-full bg-black/40 border-none rounded-xl px-4 py-3 text-white text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-600"
                />
                <div className="flex gap-4">
                  <button
                    onClick={handleBulkBlock}
                    disabled={selectedStudentIds.size === 0 || actionLoading === "bulk"}
                    className="flex-1 py-4 bg-red-600/20 text-red-500 rounded-xl border border-red-500/20 font-black uppercase text-[10px] tracking-widest hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"
                  >
                    {actionLoading === "bulk" ? <i className="fa-solid fa-circle-notch animate-spin"></i> : `Block Selected (${selectedStudentIds.size})`}
                  </button>
                  <button
                    onClick={handleBulkUnblock}
                    disabled={selectedStudentIds.size === 0 || actionLoading === "bulk"}
                    className="flex-1 py-4 bg-emerald-600/20 text-emerald-500 rounded-xl border border-emerald-500/20 font-black uppercase text-[10px] tracking-widest hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-50"
                  >
                    {actionLoading === "bulk" ? <i className="fa-solid fa-circle-notch animate-spin"></i> : `Unblock Selected (${selectedStudentIds.size})`}
                  </button>
                </div>
              </div>

              {/* Stats & Toggle Panel */}
              <div className="flex flex-col gap-4">
                <div className="flex-1 bg-white/5 p-4 rounded-[2rem] border border-white/5 flex items-center justify-center">
                  <div className="text-center space-y-1">
                    <p className="text-2xl font-black text-white">{allUsers.length}</p>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Nodes</p>
                  </div>
                </div>

                {/* Popup Toggle - SUPER USER PRIVILEGE */}
                <div className="flex-1 bg-white/5 p-4 rounded-[2rem] border border-white/5 flex items-center justify-between px-6">
                  <div className="text-left">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Popup System</p>
                    <p className={`text-xs font-black uppercase tracking-widest ${settings?.showDevPopup ? 'text-emerald-400' : 'text-red-400'}`}>{settings?.showDevPopup ? 'SHOWN' : 'HIDDEN'}</p>
                  </div>
                  <button onClick={toggleDevPopup} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${settings?.showDevPopup ? 'bg-red-500/20 text-red-500 hover:bg-red-600 hover:text-white' : 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-600 hover:text-white'}`}>
                    {settings?.showDevPopup ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-indigo-600/5 p-8 rounded-[3rem] border border-indigo-500/10 space-y-6 relative z-10 flex-1">
              <h4 className="text-xl font-black italic uppercase tracking-tight text-white/90">Identity Override Command</h4>
              <div className="h-[500px] overflow-y-auto space-y-3 pr-4 custom-scrollbar">
                {allUsers
                  .filter(s => s.name.toLowerCase().includes(guardianSearch.toLowerCase()) || s.rollNumber?.includes(guardianSearch))
                  .map(s => {
                    const isBanned = s.blockedUntil && new Date(s.blockedUntil) > new Date();
                    const isSelected = selectedStudentIds.has(s.id);
                    const isSelf = s.id === user?.id;
                    const isProcessing = actionLoading === s.id;

                    return (
                      <div key={s.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${isSelected ? 'bg-indigo-600/20 border-indigo-500' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                        <div
                          onClick={() => !isSelf && toggleStudentSelection(s.id)}
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer ${isSelf ? 'border-slate-800 opacity-20 cursor-not-allowed' : isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-600'}`}
                        >
                          {isSelected && <i className="fa-solid fa-check text-[10px] text-white"></i>}
                        </div>

                        <div className="flex-1">
                          <p className="font-bold text-sm text-white">{s.name} {isSelf && <span className="text-[8px] bg-white/20 px-2 rounded ml-2">YOU</span>}</p>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{s.academicYear} • {s.rollNumber} {isBanned && <span className="text-red-500 ml-2">● RESTRICTED</span>}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          {isProcessing ? (
                            <div className="w-8 h-8 flex items-center justify-center"><i className="fa-solid fa-circle-notch animate-spin text-indigo-500"></i></div>
                          ) : (
                            <>
                              {isBanned ? (
                                <>
                                  <button
                                    onClick={() => handleSingleUnblock(s.id)}
                                    className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/30"
                                    title="Unblock Node"
                                  >
                                    <i className="fa-solid fa-lock-open text-xs"></i>
                                  </button>

                                  <button
                                    onClick={(e) => toggleAppealPermission(e, s.id, s.allowUnblockRequest || false)}
                                    className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border transition-all ${s.allowUnblockRequest ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-transparent text-slate-400 border-slate-700 hover:border-slate-500'}`}
                                  >
                                    {s.allowUnblockRequest ? 'Appeal: ON' : 'Appeal: OFF'}
                                  </button>
                                </>
                              ) : (
                                !isSelf && (
                                  <button
                                    onClick={() => handleSingleBlock(s.id)}
                                    className="w-8 h-8 rounded-lg bg-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all border border-red-500/30"
                                    title="Block Node"
                                  >
                                    <i className="fa-solid fa-ban text-xs"></i>
                                  </button>
                                )
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                {allUsers.length === 0 && <div className="text-center text-slate-600 py-10 font-bold uppercase text-xs tracking-widest">No nodes found in registry</div>}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  </div>
);
};

export default StudentDashboard;
