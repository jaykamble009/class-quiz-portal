
import React, { useEffect, useState } from 'react';
import { storageService } from '../../services/storage.ts';
import { GlobalSystemState } from '../../types.ts';
import { useAuth } from '../../contexts/AuthContext.tsx';

const SystemStatusBanner: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<GlobalSystemState | null>(null);
  const [status, setStatus] = useState<{connected: boolean, setupRequired: boolean, message: string}>({
    connected: false,
    setupRequired: false,
    message: 'Verifying Hub...'
  });
  const [dismissed, setDismissed] = useState(false);

  const checkStatus = async () => {
    try {
      const s = await storageService.getSettings();
      const conn = await storageService.testConnection();
      setSettings(s);
      setStatus({
        connected: conn.connected,
        setupRequired: conn.setupRequired,
        message: conn.message
      });
    } catch (e) {
      console.debug("Status check silent failure");
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  // Priority 1: Panic Mode (System Block)
  if (settings?.isPanicMode) {
    return (
      <div className="w-full bg-red-600 text-white py-2 px-4 flex items-center justify-center gap-3 animate-pulse z-[200]">
        <i className="fa-solid fa-radiation"></i>
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Panic Protocol Activated: Assessments Locked</span>
      </div>
    );
  }

  // Priority 2: Global Institutional Alert (Dismissible for students)
  if (settings?.globalAlert && !dismissed) {
    const priorityStyles = {
      critical: 'bg-red-500 text-white border-red-600 animate-pulse',
      warning: 'bg-amber-500 text-white border-amber-600',
      info: 'bg-indigo-600 text-white border-indigo-700'
    };
    const style = priorityStyles[settings.alertPriority || 'info'];
    
    return (
      <div className={`${style} w-full py-2.5 px-6 flex items-center justify-between gap-4 z-[200] shadow-lg`}>
        <div className="flex items-center gap-3 flex-1">
          <i className={`fa-solid ${settings.alertPriority === 'critical' ? 'fa-triangle-exclamation' : 'fa-bullhorn'} text-sm`}></i>
          <span className="text-[10px] font-black uppercase tracking-[0.15em]">{settings.globalAlert}</span>
        </div>
        <div className="flex items-center gap-4">
           <div className="hidden md:block text-[8px] font-black uppercase tracking-widest opacity-60">
             Official Institutional Broadcast
           </div>
           {user?.role === 'student' && (
             <button onClick={() => setDismissed(true)} className="w-6 h-6 flex items-center justify-center bg-white/20 rounded-full hover:bg-white/40 transition-colors">
                <i className="fa-solid fa-xmark text-xs"></i>
             </button>
           )}
        </div>
      </div>
    );
  }

  // Priority 3: Offline Status
  if (!status.connected) {
    return (
      <div className="w-full bg-slate-900 text-slate-300 py-2 px-4 flex items-center justify-center gap-3 z-[200]">
        <i className="fa-solid fa-link-slash"></i>
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{status.message}</span>
      </div>
    );
  }

  // Priority 4: Maintenance Mode
  if (settings?.maintenanceMode) {
    return (
      <div className="w-full bg-slate-800 text-slate-400 py-2 px-4 flex items-center justify-center gap-3 z-[200]">
        <i className="fa-solid fa-wrench"></i>
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Maintenance: Scheduled Environment Sync</span>
      </div>
    );
  }

  // Default: Health Check Verified
  return (
    <div className="w-full bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-600 py-1.5 px-4 flex items-center justify-center gap-2 z-[200]">
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
      <span className="text-[8px] font-black uppercase tracking-[0.3em] text-center">{status.message}</span>
    </div>
  );
};

export default SystemStatusBanner;
