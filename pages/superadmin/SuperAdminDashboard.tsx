
import React, { useState, useEffect } from 'react';
import { storageService } from '../../services/storage.ts';
import { aiService } from '../../services/ai.ts';
import { Exam, AcademicYear, Subject, GlobalSystemState, User } from '../../types.ts';
import { useAuth } from '../../contexts/AuthContext.tsx';
import Logo from '../../components/common/Logo.tsx';
import { useNavigate } from 'react-router-dom';
import SystemStatusBanner from '../../components/common/SystemStatusBanner.tsx';
import { useToast } from '../../contexts/ToastContext.tsx';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { logout, user: currentUser } = useAuth();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('deploy');
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [settings, setSettings] = useState<GlobalSystemState>(storageService.getDefaultSettings());
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  
  // Super Student Specific State
  const [guardianSearch, setGuardianSearch] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  const isJay = currentUser?.email === 'jk365242@gmail.com' || currentUser?.rollNumber === '33' || currentUser?.isSuperStudent;

  const load = async () => {
    setIsLoading(true);
    const [s, sub, usr] = await Promise.all([storageService.getSettings(), storageService.getSubjects(), storageService.getUsers()]);
    setSettings(s);
    setSubjects(sub);
    setStudents(usr);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Guardian Unit: Bulk Actions
  const toggleStudentSelection = (id: string) => {
    const newSet = new Set(selectedStudentIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedStudentIds(newSet);
  };

  const selectAllFiltered = () => {
    const filtered = students.filter(s => 
      s.name.toLowerCase().includes(guardianSearch.toLowerCase()) || 
      s.rollNumber?.includes(guardianSearch)
    );
    const newSet = new Set(selectedStudentIds);
    filtered.forEach(s => newSet.add(s.id));
    setSelectedStudentIds(newSet);
  };

  const deselectAll = () => setSelectedStudentIds(new Set());

  const handleBulkBlock = async () => {
    if (selectedStudentIds.size === 0) return addToast("No nodes selected.", "warning");
    
    const reason = prompt("Enter Terminal Restriction Reason for selected nodes:");
    if (!reason) return;

    if (confirm(`Restrict access for ${selectedStudentIds.size} users for 24 hours?`)) {
      const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 Hours
      
      const promises = Array.from(selectedStudentIds).map(id => 
        storageService.updateUser(id as string, { blockedUntil: expiry, blockReason: reason })
      );
      
      await Promise.all(promises);
      addToast(`${selectedStudentIds.size} Nodes Restricted.`, "success");
      setSelectedStudentIds(new Set());
      load();
    }
  };

  const handleBulkUnblock = async () => {
    if (selectedStudentIds.size === 0) return addToast("No nodes selected.", "warning");

    if (confirm(`Restore access for ${selectedStudentIds.size} users?`)) {
      const promises = Array.from(selectedStudentIds).map(id => 
        storageService.updateUser(id as string, { blockedUntil: null, blockReason: '' })
      );
      
      await Promise.all(promises);
      addToast(`${selectedStudentIds.size} Nodes Restored.`, "success");
      setSelectedStudentIds(new Set());
      load();
    }
  };

  const handleSingleBlock = async (studentId: string) => {
    const reason = prompt("Enter Terminal Restriction Reason:");
    if (reason) {
      const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await storageService.updateUser(studentId, { blockedUntil: expiry, blockReason: reason });
      addToast("Student restricted successfully.", "warning");
      load();
    }
  };

  const handleSingleUnblock = async (studentId: string) => {
    if (confirm("Restore Master link access for this node?")) {
      await storageService.updateUser(studentId, { blockedUntil: null, blockReason: '' });
      addToast("Student access restored.", "success");
      load();
    }
  };

  const saveSystemSettings = async () => {
    await storageService.saveSettings(settings);
    addToast("System Framework Synced.", "success");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-['Plus_Jakarta_Sans'] flex flex-col lg:flex-row">
      <SystemStatusBanner />
      
      {/* Mobile Nav Toggle */}
      <button 
        onClick={() => setIsSidebarOpen(true)} 
        className="lg:hidden fixed top-8 left-8 z-[2000] w-16 h-16 bg-indigo-600 text-white rounded-[1.5rem] shadow-2xl flex items-center justify-center active:scale-95 transition-all"
      >
        <i className="fa-solid fa-gear text-xl"></i>
      </button>

      {/* Master Side Navigation */}
      <aside className={`fixed inset-y-0 left-0 z-[5000] w-96 bg-slate-950 text-white lg:sticky lg:h-screen lg:translate-x-0 transition-all duration-700 ease-in-out border-r-[6px] border-indigo-500/20 ${isSidebarOpen ? 'translate-x-0 shadow-[0_0_100px_rgba(0,0,0,0.6)]' : '-translate-x-full'}`}>
         <div className="p-12 space-y-16 h-full flex flex-col relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 blur-[100px] rounded-full pointer-events-none"></div>
            
            <div className="flex items-center gap-8 relative z-10">
               <Logo size="lg" variant="light" />
               <div className="space-y-1.5">
                 <h1 className="text-3xl font-black italic tracking-tighter leading-none text-white">Council Hub</h1>
                 <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.5em]">Global Governance</p>
               </div>
            </div>

            <nav className="flex-1 space-y-5 relative z-10">
               {[
                 { id: 'deploy', label: 'Deploy node', icon: 'fa-rocket' },
                 { id: 'governance', label: 'System Policy', icon: 'fa-shield-halved' },
                 { id: 'promotion', label: 'Global reset', icon: 'fa-arrow-up-from-bracket' }
               ].map(item => (
                 <button 
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-6 px-8 py-5 rounded-[2.2rem] transition-all group ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-2xl' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                 >
                   <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${activeTab === item.id ? 'bg-white/20' : 'bg-white/5 group-hover:bg-white/10'}`}>
                     <i className={`fa-solid ${item.icon} text-lg`}></i>
                   </div>
                   <span className="text-[11px] font-black uppercase tracking-[0.25em]">{item.label}</span>
                 </button>
               ))}
               {isJay && (
                 <button 
                  onClick={() => { setActiveTab('guardian'); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-6 px-8 py-5 rounded-[2.2rem] transition-all group ${activeTab === 'guardian' ? 'bg-red-600 text-white shadow-2xl' : 'text-red-400/60 hover:text-red-400 hover:bg-red-600/5'}`}
                 >
                   <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${activeTab === 'guardian' ? 'bg-white/20' : 'bg-red-600/10'}`}>
                     <i className="fa-solid fa-bolt text-lg"></i>
                   </div>
                   <span className="text-[11px] font-black uppercase tracking-[0.25em]">Guardian Unit</span>
                 </button>
               )}
            </nav>

            <div className="pt-12 border-t border-white/5 relative z-10">
               <button onClick={() => navigate('/admin-dashboard')} className="w-full py-7 bg-white/5 text-white rounded-[2.5rem] font-black uppercase text-[11px] tracking-[0.4em] hover:bg-white/10 transition-all active:scale-95 flex items-center justify-center gap-5">
                  <i className="fa-solid fa-arrow-left text-indigo-400"></i>
                  Faculty hub
               </button>
            </div>
            
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden absolute top-10 right-10 w-14 h-14 bg-white/5 rounded-[1.5rem] flex items-center justify-center hover:bg-white/10 transition-colors"><i className="fa-solid fa-xmark text-white text-xl"></i></button>
         </div>
      </aside>

      {/* Command Workspace */}
      <main className="flex-1 p-8 lg:p-20 overflow-y-auto">
        <header className="flex justify-between items-center mb-16 ml-auto lg:ml-0">
          <div className="space-y-2">
            <h2 className="text-5xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">{activeTab} Interface</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] mt-2">Class-Quiz Portal / Security Council Governance</p>
          </div>
          <div className="hidden md:flex items-center gap-8">
             <div className="text-right">
                <p className="text-xl font-black italic leading-none text-slate-950">{currentUser?.name}</p>
                <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mt-2 bg-indigo-50 px-4 py-1.5 rounded-lg border border-indigo-100">Council Master</p>
             </div>
             <div className="w-20 h-20 bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center text-4xl font-black italic shadow-2xl border-4 border-white">
                {currentUser?.name?.[0]}
             </div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto pb-32">
          {activeTab === 'deploy' && (
            <div className="bg-white p-12 lg:p-20 rounded-[5rem] border-4 border-slate-100 shadow-sm space-y-12 animate-in fade-in duration-700">
               <div className="flex items-center gap-6 border-b-4 border-slate-50 pb-8 px-4">
                  <div className="w-14 h-14 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center text-white text-2xl shadow-xl">
                    <i className="fa-solid fa-brain"></i>
                  </div>
                  <div>
                    <h3 className="text-3xl font-black uppercase italic tracking-tight text-slate-900 leading-none">Neural Deployment</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">AI-Driven Node Generation Core</p>
                  </div>
               </div>
               <div className="grid md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-6">Target Hub Year</label>
                    <select className="elite-input bg-slate-50"><option>1st Year Hub</option><option>2nd Year Hub</option><option>3rd Year Hub</option></select>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-6">Subject Domain</label>
                    <select className="elite-input bg-slate-50"><option>Choose Domain Registry...</option></select>
                  </div>
                  <div className="space-y-4 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-6">Synthesis Context (Reference Material)</label>
                    <textarea className="w-full h-56 p-10 bg-slate-50 rounded-[4rem] border-4 border-slate-100 outline-none focus:border-indigo-600 transition-all font-bold italic" placeholder="Enter reference payload for AI generation..." />
                  </div>
               </div>
               <button className="w-full h-28 bg-slate-950 text-white rounded-[3.5rem] font-black uppercase tracking-[0.4em] shadow-2xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-8 active:scale-95 text-lg">
                  <i className="fa-solid fa-rocket animate-bounce"></i>
                  Deploy Master Node
               </button>
            </div>
          )}

          {activeTab === 'governance' && (
            <div className="bg-white p-12 lg:p-20 rounded-[5rem] border-4 border-slate-100 shadow-sm space-y-16 animate-in fade-in duration-700">
               <h3 className="text-4xl font-black italic tracking-tight uppercase border-b-4 border-slate-50 pb-8 px-4">System Policy Framework</h3>
               <div className="grid md:grid-cols-2 gap-16">
                  <div className="space-y-6">
                    <div className="flex justify-between items-center px-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Neural Face Sensitivity</p>
                      <span className="text-xl font-black text-indigo-600">{settings.proctoringSensitivity}/10</span>
                    </div>
                    <input type="range" className="w-full accent-indigo-600" min="1" max="10" value={settings.proctoringSensitivity} onChange={e => setSettings({...settings, proctoringSensitivity: parseInt(e.target.value)})} />
                  </div>
                  <div className="space-y-6">
                    <div className="flex justify-between items-center px-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Audio Monitoring Sensitivity</p>
                      <span className="text-xl font-black text-blue-600">{settings.audioSensitivity || 5}/10</span>
                    </div>
                    <input type="range" className="w-full accent-blue-600" min="1" max="10" value={settings.audioSensitivity || 5} onChange={e => setSettings({...settings, audioSensitivity: parseInt(e.target.value)})} />
                  </div>
                  <div className="space-y-6 md:col-span-2">
                    <div className="flex justify-between items-center px-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Strike Threshold (Auto-Block)</p>
                      <span className="text-xl font-black text-red-600">{settings.autoBlockThreshold} Units</span>
                    </div>
                    <input type="range" className="w-full accent-red-600" min="1" max="5" value={settings.autoBlockThreshold} onChange={e => setSettings({...settings, autoBlockThreshold: parseInt(e.target.value)})} />
                  </div>
               </div>
               <button onClick={saveSystemSettings} className="w-full h-28 bg-[#4F46E5] text-white rounded-[3.5rem] font-black uppercase tracking-[0.3em] shadow-2xl text-lg active:scale-95 transition-all">Synchronize Policy Hub</button>
            </div>
          )}

          {activeTab === 'guardian' && isJay && (
            <div className="bg-slate-950 p-12 rounded-[4rem] border-4 border-indigo-500/30 shadow-2xl space-y-12 animate-in zoom-in duration-700 text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-red-600/5 blur-[150px] rounded-full"></div>
               <div className="space-y-4 relative z-10 border-b border-white/5 pb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                 <div>
                    <h3 className="text-4xl font-black italic tracking-tighter uppercase text-indigo-400">Guardian Hub v9.0</h3>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em]">Master Identity Unit • Super Student Jay Kamble</p>
                 </div>
                 <div className="flex gap-4">
                    <button onClick={selectAllFiltered} className="px-6 py-3 bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all">Select All</button>
                    <button onClick={deselectAll} className="px-6 py-3 bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all">Deselect</button>
                 </div>
               </div>
               
               {/* Controls */}
               <div className="grid md:grid-cols-2 gap-6 relative z-10">
                  <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 space-y-4">
                     <input 
                       value={guardianSearch}
                       onChange={e => setGuardianSearch(e.target.value)}
                       placeholder="SEARCH NODE ID / NAME..." 
                       className="w-full bg-black/40 border-none rounded-xl px-4 py-3 text-white text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-600"
                     />
                     <div className="flex gap-4">
                        <button onClick={handleBulkBlock} className="flex-1 py-4 bg-red-600/20 text-red-500 rounded-xl border border-red-500/20 font-black uppercase text-[10px] tracking-widest hover:bg-red-600 hover:text-white transition-all disabled:opacity-50" disabled={selectedStudentIds.size === 0}>
                           Block Selected ({selectedStudentIds.size})
                        </button>
                        <button onClick={handleBulkUnblock} className="flex-1 py-4 bg-emerald-600/20 text-emerald-500 rounded-xl border border-emerald-500/20 font-black uppercase text-[10px] tracking-widest hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-50" disabled={selectedStudentIds.size === 0}>
                           Unblock Selected ({selectedStudentIds.size})
                        </button>
                     </div>
                  </div>
                  <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 flex items-center justify-center">
                     <div className="text-center space-y-2">
                        <p className="text-2xl font-black text-white">{students.length}</p>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Active Nodes</p>
                     </div>
                  </div>
               </div>

               <div className="bg-indigo-600/5 p-8 rounded-[3rem] border border-indigo-500/10 space-y-6 relative z-10 flex-1">
                  <h4 className="text-xl font-black italic uppercase tracking-tight text-white/90">Identity Override Command</h4>
                  <div className="h-[500px] overflow-y-auto space-y-3 pr-4 custom-scrollbar">
                     {students
                       .filter(s => s.name.toLowerCase().includes(guardianSearch.toLowerCase()) || s.rollNumber?.includes(guardianSearch))
                       .map(s => {
                         const isBanned = s.blockedUntil && new Date(s.blockedUntil) > new Date();
                         const isSelected = selectedStudentIds.has(s.id);
                         return (
                          <div key={s.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${isSelected ? 'bg-indigo-600/20 border-indigo-500' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                             <div 
                                onClick={() => toggleStudentSelection(s.id)}
                                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-600'}`}
                             >
                                {isSelected && <i className="fa-solid fa-check text-[10px] text-white"></i>}
                             </div>
                             
                             <div className="flex-1">
                               <p className="font-bold text-sm text-white">{s.name}</p>
                               <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{s.academicYear} • {s.rollNumber} {isBanned && <span className="text-red-500 ml-2">● RESTRICTED</span>}</p>
                             </div>

                             <div className="flex gap-2">
                                {isBanned ? (
                                  <button onClick={() => handleSingleUnblock(s.id)} className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all"><i className="fa-solid fa-lock-open text-xs"></i></button>
                                ) : (
                                  <button onClick={() => handleSingleBlock(s.id)} className="w-8 h-8 rounded-lg bg-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"><i className="fa-solid fa-ban text-xs"></i></button>
                                )}
                             </div>
                          </div>
                         );
                       })}
                     {students.length === 0 && <div className="text-center text-slate-600 py-10 font-bold uppercase text-xs tracking-widest">No nodes found in registry</div>}
                  </div>
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
