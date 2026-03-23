
import React, { useState, useEffect } from 'react';
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
        <div className="w-full max-w-[500px] bg-white rounded-[2.5rem] p-10 md:p-16 shadow-2xl text-center space-y-8">
          <div className="w-20 h-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center mx-auto text-emerald-500 text-4xl shadow-inner border-2 border-emerald-100">
            <i className="fa-solid fa-user-check"></i>
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl md:text-4xl font-black text-slate-900 uppercase italic tracking-tighter">Registered!</h2>
            <p className="text-slate-500 font-medium italic">Welcome, <span className="font-black text-blue-600 underline underline-offset-4">{formData.name}</span>.</p>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] overflow-hidden bg-slate-50 flex flex-col font-['Plus_Jakarta_Sans'] relative">
      <div className="w-full z-50 flex-none text-center">
        <SystemStatusBanner />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar flex items-center justify-center p-4 md:p-8">
        {/* Card — ultra compact to fit any screen */}
        <div className="w-full max-w-[520px] bg-white rounded-[1.8rem] md:rounded-[3rem] px-5 py-5 md:p-12 shadow-2xl border-t-[5px] border-blue-600 my-auto">

        {/* Header */}
        <div className="text-center mb-4 md:mb-8 flex items-center gap-3 justify-center">
          <Logo size="sm" variant="glass" className="shrink-0" />
          <div className="text-left">
            <h1 className="text-lg md:text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Registration</h1>
            <p className="text-[8px] text-slate-400 font-black uppercase tracking-[0.3em] mt-0.5">New Student Sign Up</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">

          {/* Full Name */}
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
            <input className="elite-input !h-11" name="name" value={formData.name} onChange={handleChange} placeholder="First Last" required />
          </div>

          {/* Roll + Academic Year */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Roll Number</label>
              <input className="elite-input !h-11" name="rollNumber" value={formData.rollNumber} onChange={handleChange} placeholder="Roll No" required />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Academic Year</label>
              <select className="elite-input !h-11 bg-[#F1F5F9] cursor-pointer" name="academicYear" value={formData.academicYear} onChange={handleChange}>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
              </select>
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
            <input className="elite-input !h-11" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="name@college.edu" required />
          </div>

          {/* Password + Confirm */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
              <div className="relative">
                <input className="elite-input !h-11 pr-10" type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors text-sm">
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm</label>
              <input className="elite-input !h-11" type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" required />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-blue-600 text-white rounded-[1.2rem] font-black uppercase tracking-[0.25em] shadow-lg shadow-blue-600/25 disabled:opacity-50 hover:bg-slate-950 transition-all text-[10px] active:scale-[0.98] flex items-center justify-center mt-1"
          >
            {loading ? <i className="fa-solid fa-sync animate-spin text-lg"></i> : 'Create Account'}
          </button>

          {/* Login Link */}
          <div className="text-center pt-1">
            <button type="button" onClick={() => navigate('/')} className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors">
              Already registered? <span className="text-blue-600 underline">Login here</span>
            </button>
          </div>

        </form>
        </div>
      </div>
    </div>
  );
}

