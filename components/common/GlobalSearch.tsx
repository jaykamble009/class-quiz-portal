
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, Exam } from '../../types.ts';
import { useNavigate } from 'react-router-dom';

interface GlobalSearchProps {
  students: User[];
  exams: Exam[];
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ students, exams }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    if (!query || query.length < 2) return { students: [], exams: [] };
    
    const lowerQuery = query.toLowerCase();
    
    return {
      students: students.filter(s => 
        s.name.toLowerCase().includes(lowerQuery) || 
        s.rollNumber?.includes(lowerQuery) ||
        s.email.toLowerCase().includes(lowerQuery)
      ).slice(0, 5),
      exams: exams.filter(e => 
        e.title.toLowerCase().includes(lowerQuery) ||
        e.subject.toLowerCase().includes(lowerQuery)
      ).slice(0, 5)
    };
  }, [query, students, exams]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full max-w-md" ref={containerRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <i className="fa-solid fa-magnifying-glass text-slate-400"></i>
        </div>
        <input
          type="text"
          className="w-full h-12 pl-12 pr-4 rounded-2xl bg-white border border-slate-200 text-sm font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
          placeholder="Global Search (Students, Exams)..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          aria-label="Global Search"
          aria-expanded={isOpen}
          aria-controls="global-search-results"
        />
        {query && (
          <button 
            onClick={() => { setQuery(''); setIsOpen(false); }}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
            aria-label="Clear search"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        )}
      </div>

      {isOpen && (results.students.length > 0 || results.exams.length > 0) && (
        <div 
          id="global-search-results"
          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[100] animate-in slide-in-from-top-2 duration-200 max-h-[400px] overflow-y-auto custom-scrollbar"
        >
          {results.students.length > 0 && (
            <div className="p-2">
              <h4 className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Students</h4>
              {results.students.map(s => (
                <button
                  key={s.id}
                  onClick={() => { navigate(`/admin/student/${s.id}`); setIsOpen(false); setQuery(''); }}
                  className="w-full text-left px-4 py-3 rounded-xl hover:bg-indigo-50 transition-colors flex items-center gap-3 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    {s.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 leading-none">{s.name}</p>
                    <p className="text-[10px] font-medium text-slate-500 mt-1">{s.rollNumber} • {s.academicYear}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {results.exams.length > 0 && (
            <div className="p-2 border-t border-slate-50">
              <h4 className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Exams</h4>
              {results.exams.map(e => (
                <div key={e.id} className="w-full text-left px-4 py-3 rounded-xl hover:bg-emerald-50 transition-colors flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs">
                    <i className="fa-solid fa-file-contract"></i>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 leading-none">{e.title}</p>
                    <p className="text-[10px] font-medium text-slate-500 mt-1">{e.subject} • {e.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {isOpen && query.length >= 2 && results.students.length === 0 && results.exams.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 p-6 text-center z-[100]">
           <p className="text-xs font-bold text-slate-400">No matching records found.</p>
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
