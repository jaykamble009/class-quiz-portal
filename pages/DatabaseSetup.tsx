
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/common/Logo.tsx';
import { storageService, getErrorMessage } from '../services/storage.ts';

const SQL_SCHEMA = `-- 1. Settings Table
CREATE TABLE IF NOT EXISTS settings (
    id BIGINT PRIMARY KEY DEFAULT 1,
    is_panic_mode BOOLEAN DEFAULT FALSE,
    maintenance_mode BOOLEAN DEFAULT FALSE,
    show_dev_popup BOOLEAN DEFAULT TRUE,
    show_ads BOOLEAN DEFAULT FALSE,
    app_name TEXT DEFAULT 'Class-Quiz Portal',
    brand_color TEXT DEFAULT '#4F46E5',
    question_limit INTEGER DEFAULT 50,
    proctoring_sensitivity INTEGER DEFAULT 5,
    audio_sensitivity INTEGER DEFAULT 5,
    auto_block_threshold INTEGER DEFAULT 3,
    tab_switch_limit INTEGER DEFAULT 2,
    face_move_limit INTEGER DEFAULT 5,
    block_reason_template TEXT DEFAULT 'Terminal restricted due to security violations.',
    allowed_exam_durations INTEGER[] DEFAULT '{15, 30, 45, 60, 90, 120}',
    global_alert TEXT,
    alert_priority TEXT DEFAULT 'info'
);
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    roll_number TEXT,
    role TEXT,
    academic_year TEXT,
    is_registered BOOLEAN DEFAULT TRUE,
    blocked_until TIMESTAMPTZ,
    block_reason TEXT,
    violations_count INTEGER DEFAULT 0,
    is_super_student BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    allow_unblock_request BOOLEAN DEFAULT FALSE
);
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 3. Subjects Table
CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    name TEXT,
    academic_year TEXT,
    semester TEXT,
    status TEXT DEFAULT 'active'
);
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;

-- 4. Exams Table
CREATE TABLE IF NOT EXISTS exams (
    id TEXT PRIMARY KEY,
    title TEXT,
    subject TEXT,
    academic_year TEXT,
    duration_minutes INTEGER,
    total_questions INTEGER,
    qr_code TEXT,
    questions JSONB,
    status TEXT DEFAULT 'published',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    allowed_types TEXT[],
    rules TEXT,
    settings JSONB
);
ALTER TABLE exams DISABLE ROW LEVEL SECURITY;

-- 5. Attempts Table
CREATE TABLE IF NOT EXISTS attempts (
    id TEXT PRIMARY KEY,
    exam_id TEXT,
    student_id UUID,
    score INTEGER,
    total_questions INTEGER,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    tab_switch_count INTEGER DEFAULT 0,
    face_move_count INTEGER DEFAULT 0,
    status TEXT,
    integrity_status TEXT,
    time_taken_seconds INTEGER,
    current_question_index INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    wrong_count INTEGER DEFAULT 0,
    not_answered_count INTEGER DEFAULT 0,
    violations JSONB,
    answers_map JSONB,
    cheat_score INTEGER DEFAULT 0
);
ALTER TABLE attempts DISABLE ROW LEVEL SECURITY;

-- 6. Notices Table
CREATE TABLE IF NOT EXISTS notices (
    id TEXT PRIMARY KEY,
    text TEXT,
    date TIMESTAMPTZ DEFAULT NOW(),
    author TEXT,
    priority TEXT,
    target_year TEXT
);
ALTER TABLE notices DISABLE ROW LEVEL SECURITY;

-- 7. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    action TEXT,
    details TEXT,
    performed_by TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

-- 8. Migrations
ALTER TABLE exams ADD COLUMN IF NOT EXISTS allowed_types TEXT[];
ALTER TABLE exams ADD COLUMN IF NOT EXISTS rules TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS settings JSONB;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_student BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS allow_unblock_request BOOLEAN DEFAULT FALSE;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS audio_sensitivity INTEGER DEFAULT 5;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS proctoring_sensitivity INTEGER DEFAULT 5;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS auto_block_threshold INTEGER DEFAULT 3;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS alert_priority TEXT DEFAULT 'info';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS global_alert TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_ads BOOLEAN DEFAULT FALSE;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS answers_map JSONB;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS violations JSONB;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS cheat_score INTEGER DEFAULT 0;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS correct_count INTEGER DEFAULT 0;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS wrong_count INTEGER DEFAULT 0;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS not_answered_count INTEGER DEFAULT 0;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS current_question_index INTEGER DEFAULT 0;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS time_taken_seconds INTEGER DEFAULT 0;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS semester TEXT;

INSERT INTO settings (id, app_name) VALUES (1, 'Class-Quiz Portal') ON CONFLICT (id) DO NOTHING;`;

const FIX_DELETE_SQL = `-- REPAIR SCRIPT V5 (Permissions & Orphan Cleanup)

-- 1. Disable Permissions Checks
ALTER TABLE attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE exams DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;

-- 2. CRITICAL: Remove Orphan Attempts
DELETE FROM attempts WHERE exam_id NOT IN (SELECT id FROM exams);

-- 3. Fix Attempts Table Link
ALTER TABLE attempts DROP CONSTRAINT IF EXISTS attempts_exam_id_fkey;
ALTER TABLE attempts 
ADD CONSTRAINT attempts_exam_id_fkey 
FOREIGN KEY (exam_id) REFERENCES exams(id) 
ON DELETE CASCADE;

-- 4. Grant Permissions (Critical for Super Student actions)
GRANT ALL ON attempts TO anon, authenticated, service_role;
GRANT ALL ON exams TO anon, authenticated, service_role;
GRANT ALL ON users TO anon, authenticated, service_role;
GRANT ALL ON subjects TO anon, authenticated, service_role;
GRANT ALL ON settings TO anon, authenticated, service_role;

-- 5. Final Cleanup
UPDATE exams SET status = 'archived' WHERE status = 'closed';
`;

const DatabaseSetup: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<{connected: boolean, setupRequired: boolean, message: string}>({
    connected: false,
    setupRequired: true,
    message: 'Checking status...'
  });
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const checkConnection = async () => {
    setIsVerifying(true);
    const res = await storageService.testConnection();
    setStatus(res);
    setIsVerifying(false);
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(SQL_SCHEMA);
    alert("Standard Schema Copied.");
  };

  const handleCopyFix = () => {
    navigator.clipboard.writeText(FIX_DELETE_SQL);
    alert("Permission Fix Script Copied! Run this in Supabase SQL Editor immediately.");
  };

  const handleFactoryReset = async () => {
    if (confirm("DANGER: This will wipe ALL exams, student results, logs, and notices.\n\nThe app will be reset to a 'New' state.\n\nAre you sure you want to proceed?")) {
        setIsResetting(true);
        try {
            await storageService.factoryReset();
            alert("System Successfully Reset to New State.");
            navigate('/');
        } catch (e) {
            alert("Reset Failed: " + getErrorMessage(e));
        } finally {
            setIsResetting(false);
        }
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-6 md:p-12 flex items-center justify-center font-['Plus_Jakarta_Sans'] overflow-y-auto">
      <div className="max-w-4xl w-full py-12 space-y-10 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-6">
          <Logo size="xl" variant="light" className="mx-auto" />
          <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">Portal Infrastructure</h1>
          <p className="text-slate-400 max-w-xl mx-auto italic font-medium">
            System requires specific table relationships to enable AI proctoring and real-time monitoring. Apply the schema below.
          </p>
        </div>

        <div className={`p-6 rounded-3xl border flex items-center justify-between transition-all ${status.connected && !status.setupRequired ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${status.connected && !status.setupRequired ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">System Link Status</p>
              <p className="text-sm font-bold">{status.connected && !status.setupRequired ? 'NODE ONLINE & READY' : status.message}</p>
            </div>
          </div>
          <button 
            onClick={checkConnection}
            disabled={isVerifying}
            className="px-6 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
            {isVerifying ? <i className="fa-solid fa-spinner animate-spin"></i> : 'Sync Status'}
          </button>
        </div>

        {/* REPAIR SECTION */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-[3rem] p-8 shadow-2xl relative">
           <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-black shadow-lg">
                 <i className="fa-solid fa-wrench text-lg"></i>
              </div>
              <div>
                 <h3 className="text-xl font-black text-amber-500 uppercase tracking-tight">Exam Deletion Repair V5</h3>
                 <p className="text-xs text-amber-200/70 font-medium">Cleans orphan data and fixes delete errors (Error 23503).</p>
              </div>
           </div>
           <div className="bg-black/40 rounded-2xl p-4 border border-amber-500/10 mb-6">
              <pre className="text-[10px] font-mono text-amber-300 overflow-x-auto whitespace-pre-wrap">{FIX_DELETE_SQL}</pre>
           </div>
           <button onClick={handleCopyFix} className="w-full py-4 bg-amber-500 text-black rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-amber-400 transition-all shadow-lg active:scale-95">
              Copy Fix Script
           </button>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl relative">
          <div className="p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 bg-white/5">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
                  <i className="fa-solid fa-database text-xl"></i>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Master Registry Schema</p>
                  <p className="text-sm font-bold text-white">Full Production Table Set (Auto-Patch Included)</p>
                </div>
             </div>
             <div className="flex gap-2">
                <button onClick={handleCopy} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg">Copy Script</button>
                <button 
                    onClick={handleFactoryReset} 
                    disabled={isResetting}
                    className="px-8 py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 transition-all shadow-lg flex items-center gap-2"
                >
                    {isResetting ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-dumpster-fire"></i>}
                    <span>Factory Reset (Wipe All)</span>
                </button>
             </div>
          </div>
          <div className="p-8">
            <div className="relative group">
              <pre className="text-[11px] font-mono text-indigo-400/80 leading-relaxed h-80 overflow-y-auto bg-black/40 p-6 rounded-2xl custom-scrollbar border border-white/5 group-hover:border-indigo-500/30 transition-all">
                {SQL_SCHEMA}
              </pre>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 justify-center">
           <button onClick={() => navigate('/')} className={`px-12 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all ${status.connected && !status.setupRequired ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-white text-slate-900 hover:bg-slate-100'}`}>
             {status.connected && !status.setupRequired ? 'Access Portal Hub' : 'Return to Login'}
           </button>
        </div>
      </div>
    </div>
  );
};

export default DatabaseSetup;
