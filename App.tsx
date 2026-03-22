
import React, { ReactNode, useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.tsx';
import { ToastProvider } from './contexts/ToastContext.tsx';
import { supabase } from './services/storage.ts';
import LoginPage from './pages/LoginPage.tsx';
import RegisterPage from './pages/RegisterPage.tsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.tsx';
import ResetPasswordPage from './pages/ResetPasswordPage.tsx';
import AdminDashboard from './pages/admin/AdminDashboard.tsx';
import StudentDashboard from './pages/student/StudentDashboard.tsx';
import StudentDetailView from './pages/admin/StudentDetailView.tsx';
import AboutDeveloper from './pages/AboutDeveloper.tsx';
import DatabaseSetup from './pages/DatabaseSetup.tsx';
import Logo from './components/common/Logo.tsx';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard.tsx';

interface ErrorBoundaryProps { children?: ReactNode; }
interface ErrorBoundaryState { hasError: boolean; error: any; }

/**
 * ErrorBoundary class to catch and display fatal application errors.
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };
  public readonly props: Readonly<ErrorBoundaryProps>;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Critical Terminal Failure:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9] p-6 font-['Plus_Jakarta_Sans']">
          <div className="bg-white p-12 lg:p-20 rounded-[4rem] shadow-2xl border-4 border-red-100 text-center max-w-2xl w-full space-y-10">
            <div className="w-24 h-24 bg-red-50 text-red-600 rounded-[2rem] flex items-center justify-center mx-auto text-5xl shadow-inner border border-red-100 animate-pulse">
               <i className="fa-solid fa-microchip-slash"></i>
            </div>
            <div className="space-y-4">
               <h2 className="text-4xl font-black text-slate-900 mb-4 uppercase italic tracking-tighter Terminal Fatal Error">Terminal Fatal Error</h2>
               <p className="text-sm text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Identity node encountered an irrecoverable protocol break. System must be re-initialized.</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-[10px] font-mono text-red-400 text-left overflow-hidden">
               Payload: {this.state.error?.toString()}
            </div>
            <button 
              onClick={() => window.location.href = window.location.origin} 
              className="w-full h-20 bg-slate-950 text-white rounded-2xl font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-blue-600 transition-all text-xs"
            >
               Force Re-Initialize
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Handles Supabase Password Recovery Redirects
const AuthListener = () => {
  const navigate = useNavigate();
  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password');
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);
  return null;
};

const IntroSlider = ({ onFinish }: { onFinish: () => void }) => {
  const [slide, setSlide] = useState(1);
  const slides = [
    {
      id: 1,
      title: "Class-Quiz Portal",
      desc: "Authorized Institutional Assessment & Management Hub.",
      icon: <Logo size="xl" variant="light" />,
      tag: "IDENTITY NODE 01"
    },
    {
      id: 2,
      title: "Neural Synergy",
      desc: "AI-Proctoring • Real-time Monitoring • Automated Verification",
      icon: <div className="w-32 h-32 rounded-[2.5rem] bg-indigo-600 flex items-center justify-center text-5xl text-white shadow-2xl border-4 border-white/20 float-box"><i className="fa-solid fa-microchip"></i></div>,
      tag: "FUTURE TECH 02"
    },
    {
      id: 3,
      title: "Secure & Trusted",
      desc: "Establish secure identity link to begin professional synchronization.",
      icon: <div className="w-32 h-32 rounded-[2.5rem] bg-blue-600 flex items-center justify-center text-5xl text-white shadow-2xl border-4 border-white/20 float-box"><i className="fa-solid fa-lock-shield"></i></div>,
      tag: "SECURITY PASS 03"
    }
  ];
  const current = slides[slide - 1];
  return (
    <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center p-8 transition-all duration-1000 intro-gradient overflow-hidden">
      <div key={slide} className="max-w-md w-full text-center space-y-12 animate-slide-up relative z-10">
        <div className="space-y-4">
           <span className="px-4 py-1.5 bg-white/10 rounded-full text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] border border-white/10">{current.tag}</span>
           <div className="flex justify-center pt-4">{current.icon}</div>
        </div>
        <div className="space-y-4">
          <h1 className="text-5xl lg:text-6xl font-black text-white italic tracking-tighter uppercase leading-none">{current.title}</h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] leading-relaxed max-w-xs mx-auto">{current.desc}</p>
        </div>
        <div className="flex justify-center gap-3 pt-4">
          {slides.map(s => (
            <div key={s.id} className={`h-1.5 rounded-full transition-all duration-500 ${slide === s.id ? 'w-12 bg-white' : 'w-2 bg-white/20'}`}></div>
          ))}
        </div>
        <button 
          onClick={() => slide < 3 ? setSlide(slide + 1) : onFinish()}
          className="w-full h-20 bg-white text-slate-950 rounded-[1.8rem] font-black uppercase tracking-[0.3em] shadow-2xl hover:scale-105 active:scale-95 transition-all text-xs border-b-4 border-slate-200"
        >
          {slide === 3 ? "Initialize Portal" : "Continue Protocol"}
        </button>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children, role }: { children?: ReactNode; role?: 'student' | 'admin' }) => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated || !user) return <Navigate to="/" />;
  if (role && user.role !== role) return <Navigate to="/" />;
  return <>{children}</>;
};

export default function App() {
  const [showIntro, setShowIntro] = useState(() => !sessionStorage.getItem('portal_intro_complete'));
  const finishIntro = () => { sessionStorage.setItem('portal_intro_complete', 'true'); setShowIntro(false); };

  return (
    <ErrorBoundary>
      <ToastProvider>
        {showIntro && <IntroSlider onFinish={finishIntro} />}
        <Router>
          <AuthListener />
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/about-developer" element={<AboutDeveloper />} />
            <Route path="/database-setup" element={<DatabaseSetup />} />
            <Route path="/student-dashboard" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
            <Route path="/admin-dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/super-admin-dashboard" element={<ProtectedRoute role="admin"><SuperAdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/student/:studentId" element={<ProtectedRoute role="admin"><StudentDetailView /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </ToastProvider>
    </ErrorBoundary>
  );
}
