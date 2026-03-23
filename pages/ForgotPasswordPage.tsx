
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.tsx';
import Logo from '../components/common/Logo.tsx';
import { AcademicYear } from '../types.ts';
import { storageService, normalizeEmail } from '../services/storage.ts';
import { useToast } from '../contexts/ToastContext.tsx';

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { forgotPassword } = useAuth();
  const { addToast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    rollNumber: '',
    academicYear: '1st Year' as AcademicYear
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');

    if (!formData.email || !formData.rollNumber) {
      addToast('Institutional identifiers required.', 'warning');
      return;
    }

    setLoading(true);
    
    try {
      // 1. Institutional Identity Verification
      const cleanEmail = normalizeEmail(formData.email);
      const user = await storageService.getUserByEmail(cleanEmail);

      if (!user) {
        addToast('Identity not found in global registry.', 'error');
        setLoading(false);
        return;
      }

      if (user.rollNumber !== formData.rollNumber) {
        addToast('Registry ID mismatch. Identity cannot be established.', 'error');
        setLoading(false);
        return;
      }

      if (user.academicYear !== formData.academicYear) {
        addToast('Academic node mismatch for the provided identity.', 'error');
        setLoading(false);
        return;
      }

      // 2. Trigger Recovery Link
      // Note: We don't send a new password here anymore. The user sets it after clicking the link.
      const res = await forgotPassword(formData.email, formData.rollNumber, '', formData.academicYear);
      
      if (res.success) {
        const msg = "Verification Complete. A secure recovery link has been sent to your email. Click it to set your new password.";
        setSuccessMsg(msg);
        addToast("Protocol Initiated. Check your email inbox.", 'success');
      } else {
        addToast(res.message || 'Recovery protocol failed.', 'error');
      }
    } catch (err: any) {
      addToast('Critical System Error during recovery protocol.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center p-6 font-['Plus_Jakarta_Sans'] overflow-x-hidden">
      <div className="w-full max-w-[550px] bg-white rounded-[40px] p-10 md:p-14 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] border-2 border-white animate-in fade-in duration-700">
        <div className="text-center mb-12 space-y-6">
          <Logo size="lg" variant="glass" className="mx-auto" />
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Recover Identity</h1>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.5em]">Institutional Audit Node</p>
          </div>
        </div>

        {successMsg && (
          <div className="mb-10 p-10 bg-emerald-50 text-emerald-700 rounded-[30px] border-2 border-emerald-100 animate-slide-up shadow-xl shadow-emerald-500/5">
            <div className="flex flex-col items-center gap-6 text-center">
               <div className="w-20 h-20 bg-emerald-100 rounded-[2rem] flex items-center justify-center text-emerald-600 text-3xl shadow-inner border-2 border-emerald-200">
                  <i className="fa-solid fa-envelope-circle-check"></i>
               </div>
               <div className="space-y-3">
                 <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-800">Email Sent</p>
                 <p className="text-sm font-bold leading-relaxed italic">{successMsg}</p>
               </div>
            </div>
            <button onClick={() => navigate('/')} className="mt-6 w-full py-3 bg-emerald-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition-all">
              Return to Login
            </button>
          </div>
        )}

        {!successMsg && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Registered Email</label>
              <input className="elite-input" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="name@college.edu" required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Academic Year</label>
                <select className="elite-input bg-[#F8FAFC]" name="academicYear" value={formData.academicYear} onChange={handleChange}>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Roll Number</label>
                <input className="elite-input" name="rollNumber" value={formData.rollNumber} onChange={handleChange} placeholder="Registry ID" required />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full h-[72px] bg-[#020617] text-white rounded-[22px] font-black uppercase tracking-[0.3em] shadow-[0_20px_40px_rgba(2,6,23,0.3)] disabled:opacity-50 hover:bg-[#2F5BEA] transition-all mt-8 active:scale-95 border-2 border-white/10">
              {loading ? <i className="fa-solid fa-sync animate-spin text-xl"></i> : 'Send Recovery Link'}
            </button>
          </form>
        )}

        {!successMsg && (
          <div className="mt-10 text-center">
            <button type="button" onClick={() => navigate('/')} className="text-[11px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-colors flex items-center justify-center gap-2 mx-auto">
              <i className="fa-solid fa-arrow-left"></i> 
              <span>Abort and Return</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
