
import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    // Deduplication: Don't add if the same message is already showing
    setToasts((prev) => {
      if (prev.some(t => t.message === message)) return prev;
      
      const id = Math.random().toString(36).substr(2, 9);
      const newToast = { id, message, type };
      
      // Auto-remove after 5s
      setTimeout(() => removeToast(id), 5000);
      
      return [...prev, newToast];
    });
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-xl flex items-center gap-3 text-sm font-bold animate-in slide-in-from-right duration-300 max-w-sm ${
              toast.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' :
              toast.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
              toast.type === 'warning' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
              'bg-white text-slate-800 border border-slate-100'
            }`}
          >
            <i className={`fa-solid ${
              toast.type === 'error' ? 'fa-circle-exclamation' :
              toast.type === 'success' ? 'fa-circle-check' :
              toast.type === 'warning' ? 'fa-triangle-exclamation' :
              'fa-circle-info'
            } text-lg`}></i>
            <span className="flex-1 leading-tight">{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="ml-2 hover:opacity-70 text-current">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};
