
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.tsx';
import Logo from '../components/common/Logo.tsx';
import { AcademicYear } from '../types.ts';
import { useToast } from '../contexts/ToastContext.tsx';
import SystemStatusBanner from '../components/common/SystemStatusBanner.tsx';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { addToast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '', email: '', rollNumber: '', academicYear: '1st Year' as AcademicYear,
    password: '', confirmPassword: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) { 
      addToast("Passwords do not match.", "warning"); 
      return; 
    }

    setLoading(true);

    try {
      const res = await register({
        name: formData.name, email: formData.email, rollNumber: formData.rollNumber,
        academicYear: formData.academicYear, password: formData.password
      });

      if (res.success) {
        setIsSuccess(true);
        addToast("Registration Successful.", "success");
        setTimeout(() => navigate('/'), 3000);
      } else {
        addToast(res.message || 'Registration failed. Try again.', "error");
        setLoading(false);
      }
    } catch (err: any) {
      const msg = err?.message || 'System Error during registration.';
      addToast(msg, "error");
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="w-full max-w-[500px] bg-white rounded-[3rem] p-16 shadow-2xl text-center space-y-10 animate-slide">
          <div className="w-24 h-24 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center mx-auto text-emerald-500 text-5xl shadow-inner border-2 border-emerald-100">
            <i className="fa-solid fa-user-check"></i>
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Registered!</h2>
            <p className="text-slate-500 font-medium italic">Welcome, <span className="font-black text-blue-600 underline underline-offset-4">{formData.name}</span>.</p>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-8 font-['Plus_Jakarta_Sans'] relative overflow-y-auto">
      <div className="w-full fixed top-0 left-0 z-50">
        <SystemStatusBanner />
      </div>

      <div className="w-full max-w-[650px] bg-white rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-20 shadow-2xl border-t-8 border-blue-600 animate-in fade-in duration-700 mt-20 md:mt-12 mb-8">
        <div className="text-center mb-12 md:mb-16 space-y-6">
          <Logo size="lg" className="mx-auto scale-90 md:scale-100" />
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Registration</h1>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.5em]">New Student Sign Up</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Full Name</label>
            <input className="elite-input" name="name" value={formData.name} onChange={handleChange} placeholder="First Last" required />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Roll Number</label>
              <input className="elite-input" name="rollNumber" value={formData.rollNumber} onChange={handleChange} placeholder="Roll No" required />
            </div>
            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Academic Year</label>
              <select className="elite-input bg-[#F1F5F9] cursor-pointer" name="academicYear" value={formData.academicYear} onChange={handleChange}>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
              </select>
            </div>
          </div>

          <div className="space-y-2.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Email Address</label>
            <input className="elite-input" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="name@college.edu" required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Password</label>
              <div className="relative group">
                <input className="elite-input pr-14" type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors">
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>
            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Confirm Password</label>
              <input className="elite-input" type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" required />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full h-20 md:h-24 bg-blue-600 text-white rounded-[2.2rem] font-black uppercase tracking-[0.3em] shadow-2xl shadow-blue-600/30 disabled:opacity-50 hover:bg-slate-950 transition-all mt-10 text-[11px] md:text-[13px] active:scale-[0.98]">
            {loading ? <i className="fa-solid fa-sync animate-spin text-2xl"></i> : 'Register'}
          </button>
          
          <div className="pt-6 text-center">
            <button type="button" onClick={() => navigate('/')} className="text-[11px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors">
              Already registered? <span className="text-blue-600 underline">Login here</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
