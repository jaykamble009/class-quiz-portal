import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useNavigate } from 'react-router-dom';

const AdminLoginPage: React.FC = () => {
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'admin') navigate('/admin-dashboard');
      else if (user.role === 'student') navigate('/student-dashboard');
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (!adminId || !password) {
      setError('Credentials required.');
      setIsError(true);
      setTimeout(() => setIsError(false), 500);
      setLoading(false);
      return;
    }

    const result = await login(adminId, 'admin', password);
    if (result.success) {
      setIsSuccess(true);
    } else {
      setError(result.message || 'Access Denied: Invalid Credentials.');
      setIsError(true);
      setTimeout(() => setIsError(false), 500);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex justify-center items-center bg-[#f8faff] p-4 font-['Plus_Jakarta_Sans']">
      <div className={`w-full max-w-[460px] bg-white rounded-[40px] shadow-[0_40px_100px_-20px_rgba(15,23,42,0.15)] p-12 md:p-16 page-entry border border-slate-100 ${isError ? 'shake-error' : ''}`}>
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl bg-slate-950">
            <i className="fa-solid fa-shield-halved text-white text-3xl"></i>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Faculty Hub</h1>
          <p className="font-bold mt-2 uppercase tracking-widest text-[10px] text-slate-400">AUTHORIZED ACCESS ONLY</p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-100 flex items-center space-x-3">
            <i className="fa-solid fa-triangle-exclamation text-lg"></i>
            <span>{error}</span>
          </div>
        )}

        {isSuccess && (
          <div className="mb-8 p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center space-x-3 success-pop">
            <i className="fa-solid fa-shield-check"></i>
            <span>Verified. Accessing Hub...</span>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="field-box">
            <input 
              className="elite-input" 
              type="text" 
              placeholder="ID" 
              value={adminId} 
              onChange={(e) => setAdminId(e.target.value)} 
            />
          </div>

          <div className="field-box">
            <input 
              className="elite-input" 
              type={showPassword ? "text" : "password"} 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="eye-toggle">
              <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-[64px] rounded-[20px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl transition-all btn-haptic flex items-center justify-center text-white bg-slate-950 hover:bg-black"
          >
            {loading ? <i className="fa-solid fa-circle-notch animate-spin text-xl"></i> : <span>Authorize Access</span>}
          </button>

          <div className="pt-4 text-center">
            <button 
              type="button"
              onClick={() => navigate('/')}
              className="text-[10px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest"
            >
              Candidate Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginPage;