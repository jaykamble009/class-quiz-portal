
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/common/Logo.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import SystemStatusBanner from '../components/common/SystemStatusBanner.tsx';

export default function LoginPage() {
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ id?: string; pass?: string }>({});
  
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const { login, isAuthenticated, user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(user.role === 'student' ? '/student-dashboard' : '/admin-dashboard');
    }
  }, [isAuthenticated, user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const errors: { id?: string; pass?: string } = {};
    if (!identifier) errors.id = role === 'student' ? 'Student ID/Email is required' : 'Admin ID is required';
    if (!password) errors.pass = 'Password is required';
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      addToast("Please fill in all fields.", "warning");
      return;
    }

    setLoading(true);
    setValidationErrors({});

    try {
      const res = await login(identifier, role, password);
      
      if (res.success) {
        addToast(`Welcome back, ${role === 'admin' ? 'Administrator' : 'Student'}`, "success");
        // Navigation handled by useEffect
      } else {
        addToast(res.message || "Login Failed: Invalid Credentials", "error");
        setLoading(false);
      }
    } catch (err: any) {
      if (err?.message?.includes('Failed to fetch')) {
        addToast("Database Connection Failed. Check your internet or Supabase status.", "error");
      } else {
        addToast(err?.message || "Internal Protocol Failure. Check Terminal Logs.", "error");
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen h-screen overflow-hidden bg-slate-50 flex items-center justify-center p-4 md:p-6 font-['Plus_Jakarta_Sans'] relative">
      <div className="w-full fixed top-0 left-0 z-50">
        <SystemStatusBanner />
      </div>
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#2F5BEA] via-indigo-500 to-purple-500"></div>
      <div className="absolute top-[-10%] right-[-5%] w-[700px] h-[700px] bg-[#2F5BEA]/10 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-[480px] bg-white rounded-[3.5rem] p-6 md:p-8 shadow-[0_40px_80px_-20px_rgba(47,91,234,0.12)] border border-white/50 animate-in fade-in zoom-in duration-500 relative z-10 mt-12 mb-4">
        
        <div className="text-center mb-6 space-y-4">
          <Logo size="md" className="mx-auto" />
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tighter uppercase italic">Class-Quiz Portal</h1>
            <p className="text-[9px] text-[#64748B] font-black uppercase tracking-[0.4em] mt-1">Login to Continue</p>
          </div>
        </div>

        <div className="flex bg-[#F1F5F9] p-2 rounded-[1.8rem] mb-6 border border-[#E2E8F0] relative">
          <div className={`absolute top-2 bottom-2 w-[calc(50%-8px)] bg-white rounded-[1.4rem] shadow-sm transition-all duration-300 ease-out ${role === 'admin' ? 'translate-x-[calc(100%+8px)]' : 'left-2'}`}></div>
          <button 
            type="button"
            onClick={() => setRole('student')}
            className={`flex-1 relative z-10 py-3.5 text-[10px] font-black uppercase tracking-widest transition-colors ${role === 'student' ? 'text-[#2F5BEA]' : 'text-[#94A3B8] hover:text-[#64748B]'}`}
          >
            Student
          </button>
          <button 
            type="button"
            onClick={() => setRole('admin')}
            className={`flex-1 relative z-10 py-3.5 text-[10px] font-black uppercase tracking-widest transition-colors ${role === 'admin' ? 'text-[#2F5BEA]' : 'text-[#94A3B8] hover:text-[#64748B]'}`}
          >
            Teacher
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2.5">
            <div className="flex justify-between px-3">
              <label className="text-[9px] font-black text-[#64748B] uppercase tracking-widest">
                {role === 'student' ? 'Email / Roll Number' : 'Admin ID'}
              </label>
            </div>
            <input 
              className={`elite-input bg-[#F8FAFC] border-[#E2E8F0] focus:border-[#2F5BEA] focus:ring-4 focus:ring-[#2F5BEA]/10 transition-all ${validationErrors.id ? 'border-red-500 bg-red-50' : ''}`} 
              type="text" 
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={role === 'student' ? 'e.g. student@college.edu' : 'Admin ID'}
            />
          </div>

          <div className="space-y-2.5">
             <div className="flex justify-between px-3">
               <label className="text-[9px] font-black text-[#64748B] uppercase tracking-widest">Password</label>
             </div>
             <div className="relative">
               <input 
                  className={`elite-input pr-12 bg-[#F8FAFC] border-[#E2E8F0] focus:border-[#2F5BEA] focus:ring-4 focus:ring-[#2F5BEA]/10 transition-all ${validationErrors.pass ? 'border-red-500 bg-red-50' : ''}`} 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#2F5BEA] transition-colors"
                >
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
             </div>
          </div>

          <div className="pt-6">
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full h-16 md:h-18 bg-blue-600 text-white rounded-[1.8rem] font-black uppercase tracking-[0.3em] shadow-2xl shadow-blue-600/20 disabled:opacity-50 hover:bg-slate-950 transition-all text-xs active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-70 disabled:pointer-events-none"
            >
              {loading ? <i className="fa-solid fa-circle-notch animate-spin text-lg"></i> : 'Login'}
            </button>
          </div>
        </form>

        <div className="mt-10 flex items-center justify-between px-4">
           <button 
             onClick={() => navigate('/forgot-password')} 
             className="text-[10px] font-bold text-[#94A3B8] hover:text-[#2F5BEA] transition-colors"
           >
             Forgot Password?
           </button>
           <button 
             onClick={() => navigate('/register')} 
             className="text-[10px] font-bold text-[#94A3B8] hover:text-[#2F5BEA] transition-colors"
           >
             Register Now
           </button>
        </div>
      </div>
    </div>
  );
}
