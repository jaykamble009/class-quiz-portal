
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/common/Logo.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';

const developers = [
  {
    name: 'Jay Kamble',
    role: 'System Guardian & Lead Engineer',
    instagram: '@jay_kamble_009',
    instagramUrl: 'https://www.instagram.com/jay_kamble_009/',
    github: 'github.com/jaykamble009',
    githubUrl: 'https://github.com/jaykamble009',
    bio: 'Architecting high-security examination systems and supervising global integrity protocols.',
    icon: 'fa-shield-halved'
  },
  {
    name: 'Aakash Birsone',
    role: 'UX / UI Architect',
    instagram: '@akash_birsone_21',
    instagramUrl: 'https://www.instagram.com/akash_birsone_21/',
    github: 'github.com/akashbirsone',
    githubUrl: 'https://github.com/akashbirsone',
    bio: 'Crafting fluid digital experiences with a focus on institutional reliability.',
    icon: 'fa-bezier-curve'
  }
];

const AboutDeveloper: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const handleReturn = () => {
    if (!isAuthenticated || !user) {
      navigate('/');
      return;
    }

    if (user.role === 'admin') {
      navigate('/admin-dashboard');
    } else {
      navigate('/student-dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 lg:p-16 relative overflow-hidden font-['Plus_Jakarta_Sans'] bg-gradient-to-br from-[#f3f4f6] to-[#eef2ff]">
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-indigo-600/5 blur-[150px] rounded-full -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-600/5 blur-[150px] rounded-full translate-x-1/2 translate-y-1/2"></div>

      <div className="max-w-5xl w-full space-y-20 relative z-10 animate-in fade-in duration-1000">
        <div className="text-center space-y-8">
          <div className="flex justify-center mb-8">
             <Logo size="xl" />
          </div>
          <div className="inline-block px-6 py-2 bg-indigo-600/5 rounded-full border border-indigo-600/10 mb-4 shadow-sm">
             <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em]">The Architects of Class-Quiz Portal</span>
          </div>
          <h1 className="text-7xl lg:text-8xl font-black text-slate-950 tracking-tighter leading-none">Visionary <br />Engineering.</h1>
          <p className="text-slate-500 font-medium text-xl max-w-2xl mx-auto leading-relaxed">
            Innovating the future of academic evaluation through advanced proctoring and neural content synthesis.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {developers.map((dev, idx) => (
            <div key={idx} className="bg-white p-12 rounded-[4rem] border border-slate-200 shadow-2xl shadow-indigo-100/30 space-y-10 group hover:border-indigo-600/40 transition-all duration-700 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-600/5 rounded-full blur-3xl group-hover:scale-150 transition-transform"></div>
              
              <div className="flex justify-between items-start relative z-10">
                <div className="w-24 h-24 bg-slate-900 rounded-[2.5rem] flex items-center justify-center border border-white/5 shadow-2xl group-hover:scale-110 transition-transform duration-700 group-hover:rotate-3">
                  <i className={`fa-solid ${dev.icon} text-4xl text-white shadow-xl`}></i>
                </div>
                <div className="flex space-x-4">
                   <a href={dev.instagramUrl} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-white transition-all border border-slate-100"><i className="fa-brands fa-instagram text-xl"></i></a>
                   <a href={dev.githubUrl} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-950 hover:bg-white transition-all border border-slate-100"><i className="fa-brands fa-github text-xl"></i></a>
                </div>
              </div>
              
              <div className="space-y-5 relative z-10">
                <h2 className="text-4xl font-black text-slate-950 tracking-tighter leading-none">{dev.name}</h2>
                <p className="text-indigo-600 font-black uppercase text-[11px] tracking-[0.4em]">{dev.role}</p>
                <p className="text-slate-500 text-lg leading-relaxed font-medium italic opacity-80">
                  "{dev.bio}"
                </p>
              </div>
              
              <div className="pt-8 space-y-4 border-t border-slate-100 relative z-10">
                 <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><i className="fa-brands fa-instagram"></i></div>
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">{dev.instagram}</span>
                 </div>
                 <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><i className="fa-brands fa-github"></i></div>
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">{dev.github}</span>
                 </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center pt-10">
          <button 
            onClick={handleReturn}
            className="bg-indigo-600 text-white px-14 py-7 flex items-center space-x-5 shadow-2xl rounded-2xl font-black uppercase tracking-widest"
          >
            <i className="fa-solid fa-arrow-left"></i>
            <span>Return to Terminal</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AboutDeveloper;
