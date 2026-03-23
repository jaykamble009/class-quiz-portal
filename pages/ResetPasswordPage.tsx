
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/storage.ts';
import Logo from '../components/common/Logo.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import SystemStatusBanner from '../components/common/SystemStatusBanner.tsx';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Ensure we have a valid session (user came from email link)
    const checkSession = async () => {
      const { data: { session } } = await supabase!.auth.getSession();
      if (!session) {
        addToast("Invalid or expired recovery link.", "error");
        navigate('/');
      }
    };
    if(supabase) checkSession();
  }, [navigate, addToast]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      addToast("Passwords do not match.", "warning");
      return;
    }
    if (password.length < 6) {
      addToast("Password must be at least 6 characters.", "warning");
      return;
    }

    setLoading(true);
    try {
      if (!supabase) throw new Error("Offline");
      const { error } = await supabase.auth.updateUser({ password: password });
      
      if (error) throw error;
      
      addToast("Security Key Updated Successfully!", "success");
      setTimeout(() => navigate('/'), 2000);
    } catch (err: any) {
      addToast(err.message || "Failed to update password.", "error");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 font-['Plus_Jakarta_Sans'] relative">
      <div className="w-full fixed top-0 left-0 z-50">
        <SystemStatusBanner />
      </div>

      <div className="w-full max-w-[480px] bg-white rounded-[3.5rem] p-10 md:p-14 shadow-2xl border border-slate-100 animate-in zoom-in duration-500">
        <div className="text-center mb-10 space-y-6">
          <Logo size="lg" variant="glass" className="mx-auto" />
          <div>
            <h1 className="text-2xl font-black text-[#0F172A] tracking-tighter uppercase italic">Secure New Key</h1>
            <p className="text-[10px] text-[#64748B] font-black uppercase tracking-[0.4em] mt-2">Finalize Recovery</p>
          </div>
        </div>

        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="space-y-2.5">
             <div className="flex justify-between px-3">
               <label className="text-[9px] font-black text-[#64748B] uppercase tracking-widest">New Password</label>
             </div>
             <div className="relative">
               <input 
                  className="elite-input pr-12" 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-blue-600 transition-colors"
                >
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
             </div>
          </div>

          <div className="space-y-2.5">
             <div className="flex justify-between px-3">
               <label className="text-[9px] font-black text-[#64748B] uppercase tracking-widest">Confirm Password</label>
             </div>
             <input 
                className="elite-input" 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full h-16 bg-blue-600 text-white rounded-[1.8rem] font-black uppercase text-[11px] tracking-[0.3em] shadow-xl shadow-blue-600/20 hover:bg-slate-950 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-70 disabled:pointer-events-none mt-8"
          >
            {loading ? <i className="fa-solid fa-circle-notch animate-spin text-lg"></i> : 'Update & Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
