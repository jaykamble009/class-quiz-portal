
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface DeveloperCreditPopupProps {
  onClose: () => void;
}

const DeveloperCreditPopup: React.FC<DeveloperCreditPopupProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onClose]);

  const handleSeeMore = () => {
    onClose();
    navigate('/about-developer');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md transition-all duration-500">
      <div className="glass w-full max-w-sm rounded-[3rem] overflow-hidden shadow-2xl transform transition-all animate-in fade-in zoom-in duration-500 border-4 border-white/20">
        <div className="relative p-8 text-center space-y-8">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 w-10 h-10 rounded-2xl bg-slate-100/50 flex items-center justify-center hover:bg-slate-200 transition-colors"
          >
            <i className="fa-solid fa-xmark text-slate-600"></i>
          </button>

          <div className="w-24 h-24 bg-slate-900 rounded-[2.5rem] mx-auto flex items-center justify-center shadow-2xl shadow-slate-200 border-4 border-white">
            <i className="fa-solid fa-terminal text-4xl text-white"></i>
          </div>
          
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">The Architects</h2>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mt-3 bg-slate-50 px-4 py-1.5 rounded-full inline-block">Class-Quiz Portal</p>
          </div>
          
          <div className="space-y-4">
            <div className="bg-slate-50 p-5 rounded-3xl flex items-center space-x-5 border border-slate-100">
              <div className="w-12 h-12 bg-slate-950 rounded-2xl shadow-md flex items-center justify-center text-white font-black text-xl italic">JK</div>
              <div className="text-left">
                <p className="text-sm font-black text-slate-900 uppercase italic">Jay Kamble</p>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Lead Architect</p>
              </div>
            </div>
            
            <div className="bg-slate-50 p-5 rounded-3xl flex items-center space-x-5 border border-slate-100">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl shadow-md flex items-center justify-center text-white font-black text-xl italic">AB</div>
              <div className="text-left">
                <p className="text-sm font-black text-slate-900 uppercase italic">Aakash Birsone</p>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">UX Strategist</p>
              </div>
            </div>
          </div>
          
          <div className="pt-4">
            <button 
              onClick={handleSeeMore}
              className="w-full py-6 bg-slate-950 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:bg-indigo-600 active:scale-95 transition-all"
            >
              Examine Profiles
            </button>
            <p className="text-[9px] text-slate-300 font-black mt-6 uppercase tracking-widest italic">Sync finalized in {timeLeft}s...</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperCreditPopup;
