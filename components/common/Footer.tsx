
import React from 'react';

const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#0f172a] text-indigo-300 py-12 lg:py-20 border-t border-indigo-500/10 relative overflow-hidden">
      {/* Subtle Background Detail */}
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-indigo-600/5 blur-[100px] rounded-full pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 lg:gap-8 mb-16">
          {/* Column 1: App Info */}
          <div className="space-y-6 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start space-x-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                <i className="fa-solid fa-bolt-lightning text-white"></i>
              </div>
              <span className="text-2xl font-black text-white tracking-tighter">Class – Quiz Portal</span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs mx-auto md:mx-0">
              Advanced AI-powered examination ecosystem with real-time proctoring and neural content synthesis for professional institutions.
            </p>
            <div className="flex items-center justify-center md:justify-start space-x-4">
              <a href="#" className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all">
                <i className="fa-brands fa-instagram"></i>
              </a>
              <a href="#" className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all">
                <i className="fa-brands fa-github"></i>
              </a>
              <a href="#" className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all">
                <i className="fa-brands fa-linkedin-in"></i>
              </a>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-6 text-center md:text-left">
            <h4 className="text-white font-black uppercase text-[10px] tracking-[0.3em]">Resources</h4>
            <ul className="space-y-4">
              {['Home', 'Dashboard', 'About App', 'Help Center'].map((link) => (
                <li key={link}>
                  <button onClick={scrollToTop} className="text-sm font-bold hover:text-indigo-400 transition-colors">{link}</button>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Legal */}
          <div className="space-y-6 text-center md:text-left">
            <h4 className="text-white font-black uppercase text-[10px] tracking-[0.3em]">Compliance</h4>
            <ul className="space-y-4">
              {['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Security Protocol'].map((link) => (
                <li key={link}>
                  <a href="#" className="text-sm font-bold hover:text-indigo-400 transition-colors">{link}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-10 border-t border-indigo-500/10 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-700">
            &copy; 2025 Class – Quiz Portal. Built with Institutional Integrity.
          </p>
          <div className="flex items-center space-x-6">
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-lg">v1.0 Stable</span>
            <button 
              onClick={scrollToTop}
              className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:scale-110 transition-transform active:scale-95 shadow-lg shadow-indigo-600/30"
            >
              <i className="fa-solid fa-arrow-up"></i>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
