
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { storageService } from '../../services/storage.ts';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { User, ExamAttempt, Exam, ViolationEvent } from '../../types.ts';
import Logo from '../../components/common/Logo.tsx';
import { useToast } from '../../contexts/ToastContext.tsx';

const StudentDetailView: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [student, setStudent] = useState<User | undefined>(undefined);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewProof, setViewProof] = useState<string | null>(null);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    rollNumber: '',
    academicYear: '1st Year'
  });

  const loadStudentData = async () => {
    if (!studentId) return;
    setIsLoading(true);
    try {
      const [allUsers, allAttempts, allExams] = await Promise.all([
        storageService.getUsers(),
        storageService.getAttempts(),
        storageService.getExams()
      ]);
      const foundStudent = allUsers.find(u => u.id === studentId);
      setStudent(foundStudent);
      setAttempts(allAttempts.filter(a => a.studentId === studentId));
      setExams(allExams);

      if (foundStudent) {
        setEditForm({
            name: foundStudent.name,
            rollNumber: foundStudent.rollNumber || '',
            academicYear: foundStudent.academicYear || '1st Year'
        });
      }
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { loadStudentData(); }, [studentId]);

  const studentHistory = useMemo(() => {
    return attempts.map(a => {
      const exam = exams.find(e => e.id === a.examId);
      return { ...a, exam };
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [attempts, exams]);

  const stats = useMemo(() => {
    if (attempts.length === 0) return { avg: 0, violations: 0 };
    const totalScorePercent = attempts.reduce((acc, curr) => acc + (curr.score / curr.totalQuestions), 0);
    const totalViolations = attempts.reduce((acc, curr) => acc + (curr.violations?.length || 0), 0);
    return {
      avg: Math.round((totalScorePercent / attempts.length) * 100),
      violations: totalViolations
    };
  }, [attempts]);

  const acknowledgeViolation = async (attemptId: string, timestamp: string) => {
    // Note: Since violations are inside ExamAttempt in JSON, we update the whole attempt.
    const attempt = attempts.find(a => a.id === attemptId);
    if (!attempt) return;

    const updatedViolations = attempt.violations.map(v => {
      if (v.timestamp === timestamp) {
        return { ...v, reviewed: true, reviewedBy: user?.name || 'Admin' };
      }
      return v;
    });

    const updatedAttempt = { ...attempt, violations: updatedViolations };
    
    // Update local state first
    setAttempts(prev => prev.map(a => a.id === attemptId ? updatedAttempt : a));
    
    // Persist
    await storageService.saveAttempt(updatedAttempt);
    addToast("Violation acknowledged.", "success");
  };

  const handleSaveProfile = async () => {
    if (!student) return;
    try {
        await storageService.updateUser(student.id, {
            name: editForm.name,
            rollNumber: editForm.rollNumber,
            academicYear: editForm.academicYear as any
        });
        
        setStudent(prev => prev ? ({ ...prev, ...editForm, academicYear: editForm.academicYear as any }) : undefined);
        setIsEditing(false);
        addToast("Profile updated successfully.", "success");
    } catch (e) {
        addToast("Failed to update profile.", "error");
    }
  };

  const handleCancelEdit = () => {
    if (!student) return;
    setEditForm({
        name: student.name,
        rollNumber: student.rollNumber || '',
        academicYear: student.academicYear || '1st Year'
    });
    setIsEditing(false);
  };

  if (isLoading) return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <i className="fa-solid fa-circle-notch animate-spin text-4xl text-indigo-600"></i>
    </div>
  );

  if (!student) return (
    <div className="min-h-screen bg-[#f8faff] flex flex-col items-center justify-center p-6 text-center space-y-6">
      <i className="fa-solid fa-user-slash text-7xl text-indigo-100"></i>
      <h2 className="text-3xl font-black text-slate-900 tracking-tight">Record Not Found</h2>
      <button onClick={() => navigate('/admin-dashboard')} className="px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl">Return to Hub</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-['Plus_Jakarta_Sans'] flex flex-col">
      {/* Evidence Modal */}
      {viewProof && (
        <div className="fixed inset-0 z-[6000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-white p-6 rounded-[2rem] max-w-lg w-full shadow-2xl animate-in zoom-in duration-300">
              <div className="relative rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center">
                 {viewProof.startsWith('data:') ? (
                    <img src={viewProof} alt="Violation Proof" className="w-full h-auto object-contain" />
                 ) : (
                    <div className="p-8 text-center w-full">
                       <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 text-2xl">
                          <i className="fa-solid fa-fingerprint"></i>
                       </div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Privacy Protected Hash</p>
                       <div className="p-3 bg-slate-100 rounded-lg border border-slate-200">
                         <p className="font-mono text-[10px] text-slate-600 break-all">{viewProof}</p>
                       </div>
                       <p className="text-[10px] text-slate-400 mt-4 leading-relaxed">
                         Actual imagery is not stored on cloud servers for privacy compliance. This hash verifies the integrity of the local detection event.
                       </p>
                    </div>
                 )}
              </div>
              <div className="mt-6 flex justify-between items-center">
                 <p className="text-xs font-black uppercase tracking-widest text-slate-500">Security Snapshot</p>
                 <button onClick={() => setViewProof(null)} className="px-6 py-2 bg-slate-100 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-200 transition-colors">Close</button>
              </div>
           </div>
        </div>
      )}

      <nav className="bg-slate-950 text-white p-6 sticky top-0 z-50 shadow-2xl flex justify-between items-center">
        <button onClick={() => navigate(-1)} className="flex items-center space-x-3 text-slate-400 hover:text-white transition-colors font-black uppercase text-[10px] tracking-widest">
          <i className="fa-solid fa-arrow-left"></i>
          <span>Registry</span>
        </button>
        <div className="text-center leading-none">
          <h1 className="font-black text-xl tracking-tighter uppercase italic">Candidate Audit</h1>
          <p className="text-[8px] text-blue-400 font-black uppercase tracking-[0.3em] mt-1">Institutional Terminal</p>
        </div>
        <div className="w-20"></div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-12 grid grid-cols-1 lg:grid-cols-3 gap-10 w-full flex-1">
        <aside className="lg:col-span-1 space-y-8">
          <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm flex flex-col items-center text-center space-y-8 relative overflow-hidden group">
            
            {/* Edit Toggle */}
            <button 
                onClick={() => isEditing ? handleCancelEdit() : setIsEditing(true)} 
                className="absolute top-8 right-8 w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:bg-indigo-600 hover:text-white transition-colors z-20 shadow-sm"
                title={isEditing ? "Cancel" : "Edit Profile"}
            >
               <i className={`fa-solid ${isEditing ? 'fa-xmark' : 'fa-pen'}`}></i>
            </button>

            <div className="w-32 h-32 bg-indigo-600 text-white rounded-[2.5rem] flex items-center justify-center font-black text-5xl shadow-2xl shadow-indigo-100 relative z-10">
              {student.name[0]}
            </div>

            {isEditing ? (
                <div className="w-full space-y-4 relative z-10 animate-in fade-in">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Full Name</label>
                        <input 
                            value={editForm.name}
                            onChange={e => setEditForm({...editForm, name: e.target.value})}
                            className="w-full text-center font-bold text-slate-900 border-b-2 border-slate-200 focus:border-indigo-600 outline-none pb-1 bg-transparent text-lg"
                        />
                    </div>
                    <p className="text-sm font-bold text-slate-400">{student.email}</p>
                    
                    <div className="pt-4 space-y-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Roll Number</label>
                            <input 
                                value={editForm.rollNumber}
                                onChange={e => setEditForm({...editForm, rollNumber: e.target.value})}
                                className="w-full text-center font-bold text-slate-900 border-b-2 border-slate-200 focus:border-indigo-600 outline-none pb-1 bg-transparent"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Academic Year</label>
                            <select 
                                value={editForm.academicYear}
                                onChange={e => setEditForm({...editForm, academicYear: e.target.value})}
                                className="w-full text-center font-bold text-slate-900 border-b-2 border-slate-200 focus:border-indigo-600 outline-none pb-1 bg-transparent appearance-none cursor-pointer"
                            >
                                <option value="1st Year">1st Year</option>
                                <option value="2nd Year">2nd Year</option>
                                <option value="3rd Year">3rd Year</option>
                            </select>
                        </div>
                    </div>

                    <button onClick={handleSaveProfile} className="w-full py-3 bg-emerald-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-600 shadow-lg mt-4 transition-all">
                        Save Changes
                    </button>
                </div>
            ) : (
                <>
                    <div className="space-y-2 relative z-10">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{student.name}</h2>
                        <p className="text-sm font-bold text-slate-400">{student.email}</p>
                    </div>
                    <div className="w-full space-y-4 pt-8 border-t border-slate-50 relative z-10">
                        <div className="flex justify-between items-center px-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Roll Number</span>
                            <span className="text-sm font-black text-slate-900">{student.rollNumber}</span>
                        </div>
                        <div className="flex justify-between items-center px-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Academic Year</span>
                            <span className="text-sm font-black text-slate-900">{student.academicYear}</span>
                        </div>
                    </div>
                </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 text-center space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Avg Score</p>
                <p className="text-3xl font-black italic text-blue-600">{stats.avg}%</p>
             </div>
             <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 text-center space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Violations</p>
                <p className="text-3xl font-black italic text-red-600">{stats.violations}</p>
             </div>
          </div>
        </aside>

        <section className="lg:col-span-2 space-y-10">
           <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-10 flex items-center gap-4">
                <i className="fa-solid fa-clock-rotate-left text-indigo-600"></i>
                <span>Session History</span>
              </h3>
              
              <div className="space-y-8">
                {studentHistory.map(h => (
                  <div key={h.id} className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 group transition-all hover:border-indigo-100 hover:bg-white hover:shadow-lg">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-4">
                        <div className="flex-1">
                            <h4 className="font-black text-xl text-slate-950">{h.exam?.title || 'System Assessment'}</h4>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">
                              {new Date(h.timestamp).toLocaleDateString()} • {h.exam?.subject}
                            </p>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-3xl font-black text-indigo-600">{h.score}<span className="text-sm opacity-20 ml-1">/{h.totalQuestions}</span></p>
                          </div>
                          <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-black text-lg ${h.score/h.totalQuestions >= 0.4 ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                            {Math.round((h.score/h.totalQuestions)*100)}%
                          </div>
                        </div>
                    </div>
                    
                    {/* Violation Tracking Detail */}
                    {h.violations && h.violations.length > 0 ? (
                      <div className="mt-6 bg-red-50 rounded-2xl p-6 border border-red-100">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-4 flex items-center gap-2">
                          <i className="fa-solid fa-triangle-exclamation"></i> Security Violation Log
                        </h5>
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                          {h.violations.map((v: ViolationEvent, idx: number) => (
                             <div key={idx} className={`flex flex-wrap justify-between items-center text-xs p-3 rounded-xl border ${v.reviewed ? 'bg-emerald-50 border-emerald-100 opacity-75' : 'bg-white border-slate-100'}`}>
                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-slate-700 capitalize flex items-center gap-2">
                                    {v.type === 'tab-switch' ? <i className="fa-solid fa-window-restore text-slate-400"></i> : 
                                     (v.type === 'face-missing' || v.type === 'face-mismatch' || v.type === 'multiple-faces' || v.type === 'looking-away') ? <i className="fa-solid fa-user-xmark text-slate-400"></i> : 
                                     v.type === 'fullscreen-exit' ? <i className="fa-solid fa-expand text-slate-400"></i> : 
                                     <i className="fa-solid fa-circle-exclamation text-slate-400"></i>}
                                    {v.type.replace(/-/g, ' ')}
                                  </span>
                                  {v.reviewed && <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-100 px-2 py-0.5 rounded">Reviewed</span>}
                                </div>
                                
                                <div className="flex items-center gap-3 mt-2 sm:mt-0">
                                  <span className="font-mono text-slate-500 font-bold">{new Date(v.timestamp).toLocaleTimeString()}</span>
                                  {v.snapshotHash ? (
                                    <button onClick={() => setViewProof(v.snapshotHash!)} className="px-3 py-1 bg-slate-950 text-white rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-indigo-600 transition-colors">
                                      View Hash
                                    </button>
                                  ) : (
                                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">No Media</span>
                                  )}
                                  {!v.reviewed && (
                                    <button onClick={() => acknowledgeViolation(h.id, v.timestamp)} className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors" title="Acknowledge">
                                      <i className="fa-solid fa-check"></i>
                                    </button>
                                  )}
                                </div>
                             </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-emerald-600">
                         <i className="fa-solid fa-shield-check"></i>
                         <span className="text-[10px] font-black uppercase tracking-widest">Clean Session Integrity</span>
                      </div>
                    )}
                  </div>
                ))}
                
                {studentHistory.length === 0 && (
                  <div className="py-24 text-center opacity-30 italic font-black text-xl uppercase tracking-widest">
                    No activity found in records.
                  </div>
                )}
              </div>
           </div>
        </section>
      </main>
    </div>
  );
};

export default StudentDetailView;
    