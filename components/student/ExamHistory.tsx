
import React, { useState, useEffect } from 'react';
import { ExamAttempt, Exam } from '../../types.ts';
import { storageService } from '../../services/storage.ts';
import { useAuth } from '../../contexts/AuthContext.tsx';

interface ExamHistoryProps {
    exams: Exam[]; // For matching exam titles
}

const ExamHistory: React.FC<ExamHistoryProps> = ({ exams }) => {
    const { user } = useAuth();
    const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        if (user?.id) {
            loadAttempts();
        }
    }, [user]);

    const loadAttempts = async () => {
        if (!user) return;
        setLoading(true);
        const data = await storageService.getStudentAttempts(user.id);
        setAttempts(data);
        setLoading(false);
    };

    const getExamTitle = (examId: string) => {
        const exam = exams.find(e => e.id === examId);
        return exam?.title || 'Unknown Exam';
    };

    const formatDate = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusColor = (status: string) => {
        if (status === 'CLEAN') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (status === 'SUSPICIOUS') return 'bg-amber-50 text-amber-700 border-amber-200';
        return 'bg-red-50 text-red-700 border-red-200';
    };

    const getStatusIcon = (status: string) => {
        if (status === 'CLEAN') return 'fa-circle-check';
        if (status === 'SUSPICIOUS') return 'fa-triangle-exclamation';
        return 'fa-ban';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center space-y-4">
                    <i className="fa-solid fa-circle-notch fa-spin text-4xl text-indigo-600"></i>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading History...</p>
                </div>
            </div>
        );
    }

    if (attempts.length === 0) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center space-y-6 max-w-md">
                    <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                        <i className="fa-solid fa-clock-rotate-left text-4xl text-slate-300"></i>
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">No History Yet</h3>
                        <p className="text-sm text-slate-500 mt-2">Your exam attempts will appear here once you start taking exams.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-4 md:p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                    <i className="fa-solid fa-clock-rotate-left text-indigo-600"></i>
                    Exam History
                </h2>
                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">{attempts.length} Total</span>
            </div>

            <div className="grid gap-4 md:gap-6">
                {attempts.map((attempt) => {
                    const isExpanded = expandedId === attempt.id;
                    const percentage = attempt.totalQuestions > 0
                        ? Math.round((attempt.score / attempt.totalQuestions) * 100)
                        : 0;

                    return (
                        <div
                            key={attempt.id}
                            className="bg-white rounded-2xl md:rounded-3xl border-2 border-slate-100 shadow-lg hover:shadow-xl transition-all overflow-hidden"
                        >
                            {/* Header */}
                            <div className="p-4 md:p-6 space-y-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <h3 className="text-lg md:text-xl font-black text-slate-900 leading-tight">
                                            {getExamTitle(attempt.examId)}
                                        </h3>
                                        <p className="text-xs md:text-sm text-slate-500 mt-1 flex items-center gap-2">
                                            <i className="fa-solid fa-clock"></i>
                                            {formatDate(attempt.timestamp)}
                                        </p>
                                    </div>
                                    <span className={`px-3 md:px-4 py-1.5 md:py-2 rounded-xl border text-[10px] md:text-xs font-black uppercase tracking-wider flex items-center gap-2 ${getStatusColor(attempt.integrityStatus || 'CLEAN')}`}>
                                        <i className={`fa-solid ${getStatusIcon(attempt.integrityStatus || 'CLEAN')}`}></i>
                                        {attempt.integrityStatus || 'CLEAN'}
                                    </span>
                                </div>

                                {/* Score */}
                                <div className="flex items-center gap-6 flex-wrap">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl md:text-4xl font-black text-indigo-600">{attempt.score}</span>
                                        <span className="text-lg md:text-xl font-bold text-slate-400">/ {attempt.totalQuestions}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-32 md:w-48 h-2 md:h-3 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all ${percentage >= 70 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-sm md:text-base font-black text-slate-900">{percentage}%</span>
                                    </div>
                                </div>

                                {/* Violations */}
                                {(attempt.cheatScore || 0) > 0 && (
                                    <div className="flex items-center gap-2 text-xs md:text-sm text-red-600 bg-red-50 px-3 md:px-4 py-2 rounded-xl border border-red-100">
                                        <i className="fa-solid fa-exclamation-triangle"></i>
                                        <span className="font-bold">{attempt.cheatScore} Violation{attempt.cheatScore > 1 ? 's' : ''} Detected</span>
                                    </div>
                                )}

                                {/* Expand Button */}
                                <button
                                    onClick={() => setExpandedId(isExpanded ? null : attempt.id)}
                                    className="w-full mt-2 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs md:text-sm font-black uppercase tracking-widest text-slate-600 transition-all flex items-center justify-center gap-2"
                                >
                                    <i className={`fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                                    {isExpanded ? 'Hide Details' : 'View Details'}
                                </button>
                            </div>

                            {/* Expanded Details */}
                            {isExpanded && (
                                <div className="border-t-2 border-slate-100 p-4 md:p-6 bg-slate-50 space-y-4">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="text-center p-3 md:p-4 bg-white rounded-xl border border-slate-100">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Correct</p>
                                            <p className="text-2xl md:text-3xl font-black text-emerald-600 mt-1">{attempt.correctCount || 0}</p>
                                        </div>
                                        <div className="text-center p-3 md:p-4 bg-white rounded-xl border border-slate-100">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Wrong</p>
                                            <p className="text-2xl md:text-3xl font-black text-red-600 mt-1">{attempt.wrongCount || 0}</p>
                                        </div>
                                        <div className="text-center p-3 md:p-4 bg-white rounded-xl border border-slate-100">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Skipped</p>
                                            <p className="text-2xl md:text-3xl font-black text-slate-400 mt-1">{attempt.notAnsweredCount || 0}</p>
                                        </div>
                                        <div className="text-center p-3 md:p-4 bg-white rounded-xl border border-slate-100">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status</p>
                                            <p className="text-sm md:text-base font-black text-slate-900 mt-1 uppercase">{attempt.status}</p>
                                        </div>
                                    </div>

                                    {/* Violations List */}
                                    {attempt.violations && attempt.violations.length > 0 && (
                                        <div className="bg-white p-4 rounded-xl border border-slate-100">
                                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Violations Log</h4>
                                            <div className="space-y-2">
                                                {attempt.violations.map((v, i) => (
                                                    <div key={i} className="flex items-center justify-between text-xs p-2 bg-red-50 rounded-lg border border-red-100">
                                                        <span className="font-bold text-red-800">{v.type.replace(/-/g, ' ').toUpperCase()}</span>
                                                        <span className="text-red-600">{new Date(v.timestamp).toLocaleTimeString()}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ExamHistory;
