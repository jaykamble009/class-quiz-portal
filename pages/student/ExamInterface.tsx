
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Exam, ExamAttempt, GlobalSystemState, ViolationEvent } from '../../types.ts';
import { storageService, getErrorMessage } from '../../services/storage.ts';
import ProctorNode from '../../components/exam/ProctorNode.tsx';
import { useAuth } from '../../contexts/AuthContext.tsx';
import Logo from '../../components/common/Logo.tsx';

interface ExamInterfaceProps {
  exam: Exam;
  initialAttempt?: ExamAttempt;
  onComplete: (attempt: ExamAttempt) => void;
}

const ExamInterface: React.FC<ExamInterfaceProps> = ({ exam, initialAttempt, onComplete }) => {
  const { user } = useAuth();
  
  // FIX: Ensure questions have Unique IDs to prevent answer collision (The "Select All" Bug)
  const safeExam = useMemo(() => {
    if (!exam || !exam.questions) return { ...exam, questions: [] };
    
    const seenIds = new Set();
    const uniqueQuestions = exam.questions.map((q, i) => {
        let finalId = q.id;
        // If ID is missing, 'undefined' string, or duplicate, generate a stable fallback based on index
        if (!finalId || finalId === 'undefined' || seenIds.has(finalId)) {
            finalId = `stable-q-${exam.id || 'ex'}-${i}`; 
        }
        seenIds.add(finalId);
        return { ...q, id: finalId };
    });

    return { ...exam, questions: uniqueQuestions };
  }, [exam]);

  // Hydrate state from DB to prevent reset on reload
  const [currentIdx, setCurrentIdx] = useState(initialAttempt?.currentQuestionIndex || 0);
  const [answers, setAnswers] = useState<Record<string, any>>(initialAttempt?.answersMap || {});

  // End Time Logic - Robust Calculation
  const [endTime] = useState<Date>(() => {
      const sessionStart = initialAttempt ? new Date(initialAttempt.timestamp).getTime() : Date.now();
      const duration = (safeExam.durationMinutes && !isNaN(Number(safeExam.durationMinutes))) ? Number(safeExam.durationMinutes) : 30;
      const durationEnd = sessionStart + (duration * 60 * 1000);
      
      let effectiveEnd = durationEnd;
      if (safeExam.expiresAt) {
          const globalExpiry = new Date(safeExam.expiresAt).getTime();
          if (!isNaN(globalExpiry) && globalExpiry > sessionStart) {
             effectiveEnd = Math.min(durationEnd, globalExpiry);
          }
      }
      return new Date(effectiveEnd);
  });

  const [timeLeft, setTimeLeft] = useState(() => {
      const diff = Math.floor((endTime.getTime() - Date.now()) / 1000);
      return diff > -5 ? diff : -999;
  });

  // State
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReady, setIsReady] = useState(!!initialAttempt);
  const [settings, setSettings] = useState<GlobalSystemState | null>(null);
  
  const [warningLevel, setWarningLevel] = useState<'none' | 'soft' | 'hard' | 'terminated'>('none');
  const [warningMsg, setWarningMsg] = useState<string | null>(null);
  const [warningSeconds, setWarningSeconds] = useState(0); 
  const [showResult, setShowResult] = useState(false);

  // Refs
  const answersRef = useRef(answers);
  const currentIdxRef = useRef(currentIdx);
  const strikeCount = useRef(initialAttempt?.cheatScore || 0);
  const violationsRef = useRef<ViolationEvent[]>(initialAttempt?.violations || []);
  const attemptIdRef = useRef(initialAttempt?.id || 'SES-' + Math.random().toString(36).substr(2, 6).toUpperCase());
  const alertSoundRef = useRef<HTMLAudioElement | null>(null);
  const isTerminatedRef = useRef(false);

  // Sync refs
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { currentIdxRef.current = currentIdx; }, [currentIdx]);

  useEffect(() => {
    storageService.getSettings().then(setSettings);
    alertSoundRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    
    if (timeLeft === -999) {
        handleSubmit();
    }
  }, []);

  // Warning Timer Logic
  useEffect(() => {
    if (warningSeconds > 0 && warningLevel !== 'terminated') {
      const interval = setInterval(() => {
        setWarningSeconds(prev => {
          if (prev <= 1) {
            setWarningLevel('none');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [warningSeconds, warningLevel]);

  // Auto-Save Interval
  useEffect(() => {
    if (!isReady || isSubmitted || isTerminatedRef.current) return;
    const saveInterval = setInterval(async () => {
      if (isTerminatedRef.current) return;
      await saveToDB('in_progress');
    }, 5000); // Aggressive save (5s) to prevent data loss
    return () => clearInterval(saveInterval);
  }, [isReady, isSubmitted]);

  const saveToDB = async (status: 'in_progress' | 'completed' | 'blocked') => {
    if (!user) return;
    
    let correctCount = 0;
    const currentAnswers = answersRef.current;
    if (safeExam.questions) {
        safeExam.questions.forEach(q => {
          if (String(currentAnswers[q.id]) === String(q.correctAnswer)) correctCount++;
        });
    }

    const attempt: ExamAttempt = {
      id: attemptIdRef.current,
      examId: safeExam.id,
      studentId: user.id,
      score: correctCount,
      totalQuestions: safeExam.questions ? safeExam.questions.length : 0,
      status,
      timestamp: initialAttempt?.timestamp || new Date().toISOString(),
      tabSwitchCount: violationsRef.current.filter(v => v.type === 'tab-switch' || v.type === 'fullscreen-exit').length,
      faceMoveCount: violationsRef.current.filter(v => v.type.includes('face') || v.type === 'looking-away').length,
      cheatScore: strikeCount.current,
      integrityStatus: status === 'blocked' ? 'AUTO-TERMINATED' : strikeCount.current > 0 ? 'SUSPICIOUS' : 'CLEAN',
      violations: violationsRef.current,
      answersMap: currentAnswers,
      correctCount,
      currentQuestionIndex: currentIdxRef.current // Persist progress
    };
    await storageService.saveAttempt(attempt);
  };

  const playAlert = () => {
    if (alertSoundRef.current) {
      alertSoundRef.current.currentTime = 0;
      alertSoundRef.current.play().catch(() => {});
    }
  };

  const handleViolation = useCallback(async (type: any, msg: string, confidence: number, snapshotHash?: string) => {
    if (isSubmitted || !isReady || isTerminatedRef.current) return;
    
    strikeCount.current++;
    playAlert();

    violationsRef.current.push({ 
      type, 
      count: 1, 
      timestamp: new Date().toISOString(),
      snapshotHash, 
      confidence
    });
    
    const limit = safeExam.settings?.strikeLimit || 3;
    const strikes = strikeCount.current;
    
    if (strikes >= limit) {
        isTerminatedRef.current = true;
        setWarningLevel('terminated');
        setWarningMsg("MAXIMUM VIOLATIONS REACHED. EXAM LOCKED.");
        await saveToDB('blocked');
        
        if (user && !user.isSuperStudent) {
            const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            storageService.updateUser(user.id, {
                blockedUntil: expiry,
                blockReason: `Automated Block: Cheating detected in '${safeExam.title}'.`
            }).catch(console.error);
        }

        setTimeout(() => {
             setIsSubmitted(true);
             setShowResult(true);
             if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        }, 4000);

    } else if (strikes === limit - 1) {
        setWarningLevel('hard');
        setWarningMsg(`CRITICAL WARNING: ${msg} (Last Strike!)`);
        setWarningSeconds(10);
        await saveToDB('in_progress');
    } else {
        setWarningLevel('soft');
        setWarningMsg(`Warning: ${msg} (${strikes}/${limit})`);
        setWarningSeconds(5);
        await saveToDB('in_progress');
    }
  }, [isSubmitted, isReady, safeExam, user]);

  useEffect(() => {
    if (!isReady || isSubmitted || isTerminatedRef.current) return;

    const onVisChange = () => {
      if (document.visibilityState === 'hidden' && !isTerminatedRef.current) handleViolation('tab-switch', "Tab Switch Detected", 1.0);
    };
    const onBlur = () => {
      if (!isTerminatedRef.current) handleViolation('tab-switch', "Focus Lost (Screen Switch)", 1.0);
    };

    document.addEventListener('visibilitychange', onVisChange);
    window.addEventListener('blur', onBlur);
    return () => {
        document.removeEventListener('visibilitychange', onVisChange);
        window.removeEventListener('blur', onBlur);
    };
  }, [isReady, isSubmitted, handleViolation]);

  useEffect(() => {
    if (!isReady || isSubmitted || isTerminatedRef.current) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isReady, isSubmitted]);

  const handleSubmit = async () => {
    if (isSubmitted || isSubmitting || isTerminatedRef.current) return;
    setIsSubmitting(true);
    try {
        if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
        await saveToDB('completed'); 
    } catch (e) {
        console.error("Submission error:", e);
    } finally {
        setIsSubmitted(true);
        setShowResult(true);
    }
  };

  const enterLockdown = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      setIsReady(true);
    } catch (e) { 
        setIsReady(true);
    }
  };

  const preventCopyPaste = (e: React.ClipboardEvent | React.MouseEvent) => {
      e.preventDefault();
      if (!isTerminatedRef.current) handleViolation('sensor', 'Copy/Paste Attempt Blocked', 0.5);
  };

  const calculateResultStats = () => {
      let correct = 0;
      let wrong = 0;
      let answered = 0;
      if (safeExam.questions) {
          safeExam.questions.forEach(q => {
              const ans = answersRef.current[q.id];
              if (ans !== undefined) {
                  answered++;
                  if (String(ans) === String(q.correctAnswer)) correct++;
                  else wrong++;
              }
          });
      }
      return { correct, wrong, skipped: (safeExam.questions?.length || 0) - answered };
  };

  const handleOptionSelect = (qId: string, optionIdx: number) => {
      // RULE: One-time Answer using Ref to prevent rapid-fire changes before state updates
      if (answersRef.current[qId] !== undefined) return;
      
      const newState = { ...answers, [qId]: optionIdx };
      setAnswers(newState);
      answersRef.current = newState; // Immediate ref update for local logic
      
      // Immediate save to DB
      setTimeout(() => saveToDB('in_progress'), 0);
  };

  const handleNextQuestion = () => {
      if (safeExam.questions && currentIdx < safeExam.questions.length - 1) {
          setCurrentIdx(prev => {
              const next = prev + 1;
              currentIdxRef.current = next;
              return next;
          });
          // Save progress immediately
          setTimeout(() => saveToDB('in_progress'), 0);
      }
  };

  if (!isReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white text-center font-['Plus_Jakarta_Sans']">
        <div className="max-w-xl w-full bg-[#020617] p-12 rounded-[3rem] border-2 border-slate-800 space-y-8 animate-in zoom-in duration-500 shadow-2xl">
           <Logo size="lg" variant="light" className="mx-auto" />
           <div className="space-y-2"><h2 className="text-3xl font-black italic uppercase tracking-tighter">Security Check</h2><p className="text-indigo-400 text-xs font-black uppercase tracking-[0.2em]">Face Verification Phase</p></div>
           <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-xs leading-relaxed text-slate-400 text-left space-y-2"><p>1. <strong className="text-white">One Face Only:</strong> Ensure you are alone.</p><p>2. <strong className="text-white">Lighting:</strong> Face must be clearly visible.</p><p>3. <strong className="text-white">Privacy:</strong> No images are sent to the cloud. Analysis is local.</p></div>
           <button onClick={enterLockdown} className="w-full h-20 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-white hover:text-indigo-600 transition-all text-xs">Initialize Secure Exam</button>
        </div>
      </div>
    );
  }

  if (showResult) {
    const { correct, wrong, skipped } = calculateResultStats();
    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-6 text-center font-['Plus_Jakarta_Sans']">
            <div className="max-w-xl w-full space-y-6 animate-in zoom-in duration-300 flex flex-col h-[90vh]">
                <div className="flex-none">
                    <Logo size="lg" className="mx-auto mb-4" />
                    <h2 className="text-3xl font-black text-slate-900">Exam Finalized</h2>
                    
                    <div className="grid grid-cols-3 gap-4 mt-6">
                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                            <span className="text-3xl font-black text-emerald-600">{correct}</span>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-800 mt-1">Right</p>
                        </div>
                        <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-center">
                            <span className="text-3xl font-black text-red-600">{wrong}</span>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-red-800 mt-1">Wrong</p>
                        </div>
                         <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                            <span className="text-3xl font-black text-slate-500">{skipped}</span>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-1">Skipped</p>
                        </div>
                    </div>

                    <div className="mt-4 p-6 bg-slate-50 rounded-2xl border border-slate-100"><p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Integrity Status</p><p className={`text-2xl font-black mt-2 ${strikeCount.current > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{strikeCount.current > 0 ? `Flagged (${strikeCount.current} Violations)` : 'Verified Clean'}</p></div>
                    {warningLevel === 'terminated' && <div className="mt-2 p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold uppercase tracking-widest border border-red-100">Exam Terminated & Account Restricted.</div>}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 rounded-[2rem] p-6 border border-slate-100 text-left space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 sticky top-0 bg-slate-50 py-2 border-b border-slate-200">Detailed Report</h3>
                    {safeExam.questions?.map((q, i) => {
                        const userAnsIdx = answersRef.current[q.id];
                        const isSkipped = userAnsIdx === undefined;
                        const isCorrect = String(userAnsIdx) === String(q.correctAnswer);
                        
                        return (
                            <div key={q.id} className={`p-4 rounded-xl border-2 bg-white ${isCorrect ? 'border-emerald-100' : isSkipped ? 'border-slate-100' : 'border-red-100'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Question {i+1}</span>
                                    {isCorrect ? <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Correct</span> : isSkipped ? <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-1 rounded">Skipped</span> : <span className="text-[9px] font-black uppercase text-red-600 bg-red-50 px-2 py-1 rounded">Wrong</span>}
                                </div>
                                <p className="font-bold text-sm text-slate-900 mb-3">{q.text}</p>
                                <div className="space-y-1">
                                    {q.options?.map((opt, optIdx) => {
                                        const isSelected = userAnsIdx === optIdx;
                                        const isRealCorrect = String(optIdx) === String(q.correctAnswer);
                                        return (
                                            <div key={optIdx} className={`text-xs px-3 py-2 rounded-lg flex justify-between items-center ${
                                                isRealCorrect ? 'bg-emerald-100/50 text-emerald-800 font-bold border border-emerald-100' : 
                                                (isSelected && !isRealCorrect) ? 'bg-red-50 text-red-800 font-bold border border-red-100' : 'bg-slate-50 text-slate-500'
                                            }`}>
                                                <span>{String.fromCharCode(65+optIdx)}. {opt}</span>
                                                {isRealCorrect && <i className="fa-solid fa-check"></i>}
                                                {isSelected && !isRealCorrect && <i className="fa-solid fa-xmark"></i>}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="flex-none pt-4">
                    <button onClick={() => onComplete({} as any)} className="px-10 py-4 bg-slate-950 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all w-full">Return to Dashboard</button>
                </div>
            </div>
        </div>
    );
  }

  const q = safeExam.questions && safeExam.questions.length > 0 ? safeExam.questions[currentIdx] : null;

  return (
    <div 
      className="min-h-screen bg-white text-slate-950 flex flex-col no-select select-none relative font-['Plus_Jakarta_Sans'] overflow-hidden"
      onContextMenu={(e) => { e.preventDefault(); if(!isTerminatedRef.current) handleViolation('sensor', 'Right Click Detected', 0.5); }}
      onCopy={preventCopyPaste} onCut={preventCopyPaste} onPaste={preventCopyPaste}
    >
      <ProctorNode onViolation={handleViolation} faceSensitivity={settings?.proctoringSensitivity || 5} />
      
      {warningLevel !== 'none' && (
        <div className={`fixed inset-0 z-[5000] flex items-center justify-center p-6 backdrop-blur-md ${warningLevel === 'terminated' ? 'bg-red-950/95' : warningLevel === 'hard' ? 'bg-red-600/30' : 'bg-amber-500/20'} transition-all duration-300`}>
           <div className={`max-w-lg w-full p-10 rounded-[3rem] shadow-2xl text-center space-y-8 animate-in zoom-in ${warningLevel === 'terminated' ? 'bg-white' : 'bg-white border-4 border-red-500'}`}>
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto text-5xl ${warningLevel === 'terminated' ? 'bg-red-100 text-red-600 animate-bounce' : 'bg-amber-100 text-amber-600'}`}><i className={`fa-solid ${warningLevel === 'terminated' ? 'fa-ban' : 'fa-triangle-exclamation'}`}></i></div>
              <div><h3 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">{warningLevel === 'terminated' ? 'Exam Terminated' : 'Security Alert'}</h3><p className="text-sm font-bold text-red-500 mt-4 uppercase tracking-wide">{warningMsg}</p></div>
              {warningLevel !== 'terminated' && (<div className="py-6 bg-slate-50 rounded-3xl border border-slate-100"><p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">Resuming in</p><p className="text-6xl font-black text-slate-900 font-mono tracking-tighter">{warningSeconds}</p><p className="text-[10px] font-bold text-slate-400 mt-2">seconds</p></div>)}
              {warningLevel !== 'terminated' && (<div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden"><div className="h-full bg-red-500 transition-all duration-1000 ease-linear" style={{ width: `${(warningSeconds / (warningLevel === 'hard' ? 10 : 5)) * 100}%` }}></div></div>)}
           </div>
        </div>
      )}

      <header className="h-24 border-b-2 border-slate-100 px-6 md:px-12 flex justify-between items-center bg-white sticky top-0 z-[100]">
        <div className="flex items-center gap-4"><Logo size="sm" /><div className="hidden sm:block"><h1 className="font-bold text-lg text-slate-900 leading-none">{safeExam.title}</h1></div></div>
        <div className={`px-6 py-3 rounded-xl font-mono text-xl font-black ${timeLeft < 300 ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-100 text-slate-900'}`}>
            {timeLeft > 0 ? `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}` : '00:00'}
        </div>
      </header>

      <main className="flex-1 p-6 md:p-12 bg-[#F8FAFC] flex flex-col items-center justify-center">
        <div className="max-w-3xl w-full space-y-8">
           <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl space-y-8">
               {q ? (
                 <>
                   <div className="flex justify-between"><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Question {currentIdx + 1}/{safeExam.questions.length}</span><span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{q.difficulty}</span></div>
                   <h2 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">{q.text}</h2>
                   <div className="space-y-3">
                      {q.options?.map((opt, i) => {
                        const isLocked = answers[q.id] !== undefined; // Lock entire question if answered
                        const isSelected = answers[q.id] === i;
                        return (
                            <button 
                                key={i} 
                                onClick={() => handleOptionSelect(q.id, i)}
                                disabled={isLocked}
                                className={`w-full p-5 rounded-2xl text-left border-2 transition-all flex items-center justify-between gap-4 
                                    ${isSelected 
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' 
                                        : isLocked 
                                            ? 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed opacity-50' 
                                            : 'bg-slate-50 border-slate-100 hover:bg-white text-slate-900 hover:border-indigo-200'}`
                                }
                            >
                              <div className="flex items-center gap-4">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${isSelected ? 'bg-white/20' : 'bg-white border border-slate-200'}`}>{String.fromCharCode(65 + i)}</div>
                                <span className="font-bold text-sm">{opt}</span>
                              </div>
                              {isSelected && <i className="fa-solid fa-lock text-white/50"></i>}
                            </button>
                        );
                      })}
                   </div>
                 </>
               ) : (
                 <div className="text-center py-12 text-slate-400 font-bold uppercase tracking-widest text-xs">
                    Questions data unavailable.
                 </div>
               )}
           </div>
           
           {/* Navigation Control: Strictly One-Way */}
           <div className="flex justify-end items-center">
             {/* No Previous Button - Strictly One Way */}
             {safeExam.questions && currentIdx === safeExam.questions.length - 1 ? (
                 <button onClick={handleSubmit} disabled={isSubmitting} className="px-10 py-4 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-emerald-600 disabled:opacity-50 disabled:bg-emerald-400">{isSubmitting ? <i className="fa-solid fa-circle-notch animate-spin"></i> : 'Submit Exam'}</button>
             ) : (
                 <button onClick={handleNextQuestion} className="px-12 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-indigo-600 transition-all flex items-center gap-3">
                    Next Question <i className="fa-solid fa-arrow-right"></i>
                 </button>
             )}
           </div>
        </div>
      </main>
    </div>
  );
};

export default ExamInterface;
