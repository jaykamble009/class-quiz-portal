
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, AcademicYear } from '../types.ts';
import { storageService, normalizeEmail, supabase } from '../services/storage.ts';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (idOrEmail: string, role: UserRole, pass?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  showDevPopup: boolean;
  setShowDevPopup: (show: boolean) => void;
  acceptTerms: () => void;
  register: (userData: Partial<User>) => Promise<{ success: boolean; message?: string }>;
  forgotPassword: (email: string, rollNumber: string, newPass: string, year?: AcademicYear) => Promise<{ success: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = sessionStorage.getItem('quizgen_session');
      if (!saved) return null;
      return JSON.parse(saved);
    } catch (e) { return null; }
  });
  const [showDevPopup, setShowDevPopup] = useState(false);

  useEffect(() => {
    if (user) sessionStorage.setItem('quizgen_session', JSON.stringify(user));
    else sessionStorage.removeItem('quizgen_session');
  }, [user]);

  // Special Access Identification: Jay Kamble & Roll No 33
  const checkSuperStudent = (u: Partial<User>) => {
    const email = normalizeEmail(u.email || '');
    return (
      email === 'jk365242@gmail.com' || 
      u.rollNumber === '33' || 
      u.name?.toLowerCase().includes('jay kamble')
    );
  };

  const login = async (idOrEmail: string, role: UserRole, pass?: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const cleanId = String(idOrEmail || '').trim();
      const cleanPass = String(pass || '').trim();
      
      if (!cleanId || !cleanPass) return { success: false, message: 'Missing credentials.' };

      if (role === 'admin') {
        const adminBase = {
          email: 'staff@institutional.edu',
          role: 'admin' as UserRole,
          violationsCount: 0,
          acceptedTerms: true,
          termsAcceptedAt: new Date().toISOString()
        };

        // Super Admin Credentials
        if ((cleanId === '2324000526' && cleanPass === '2324000526') || (cleanId === 'admin' && cleanPass === 'admin')) {
          setUser({ ...adminBase, id: 'adm-root', name: 'Principal Authority', adminLevel: 'Super Admin' });
          storageService.saveAuditLog({ id: Math.random().toString(), action: "ADMIN_LOGIN", details: "Super Admin Access", performedBy: "Root", timestamp: new Date().toISOString() });
          return { success: true };
        }

        // Exam Manager Credentials
        if (cleanId === 'manager' && cleanPass === 'manager') {
          setUser({ ...adminBase, id: 'adm-mgr', name: 'Exam Controller', adminLevel: 'Exam Manager' });
          storageService.saveAuditLog({ id: Math.random().toString(), action: "ADMIN_LOGIN", details: "Manager Access", performedBy: "Manager", timestamp: new Date().toISOString() });
          return { success: true };
        }

        // Proctor Credentials
        if (cleanId === 'proctor' && cleanPass === 'proctor') {
          setUser({ ...adminBase, id: 'adm-prc', name: 'Floor Supervisor', adminLevel: 'Proctor' });
          storageService.saveAuditLog({ id: Math.random().toString(), action: "ADMIN_LOGIN", details: "Proctor Access", performedBy: "Proctor", timestamp: new Date().toISOString() });
          return { success: true };
        }

        storageService.saveAuditLog({ id: Math.random().toString(), action: "LOGIN_FAILED", details: `Invalid Admin ID: ${cleanId}`, performedBy: "System", timestamp: new Date().toISOString() });
        return { success: false, message: 'Invalid Admin Credentials' };
      }

      if (role === 'student') {
        if (!supabase) return { success: false, message: 'Database node offline.' };
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizeEmail(cleanId),
          password: cleanPass
        });

        if (error) {
          storageService.saveAuditLog({ id: Math.random().toString(), action: "LOGIN_FAILED", details: `Failed student login: ${cleanId}`, performedBy: "System", timestamp: new Date().toISOString() });
          return { success: false, message: "Invalid email or password." };
        }

        let dbProfile = await storageService.getUserByEmail(cleanId);
        if (dbProfile) {
          // Force super student status for specific credentials
          if (checkSuperStudent(dbProfile)) {
            dbProfile.isSuperStudent = true;
            // Background update to ensure DB stays in sync
            storageService.updateUser(dbProfile.id, { isSuperStudent: true });
          }
          setUser(dbProfile);
          storageService.saveAuditLog({ id: Math.random().toString(), action: "USER_LOGIN", details: "Student Session Started", performedBy: dbProfile.name, timestamp: new Date().toISOString() });
          return { success: true };
        }
        return { success: false, message: 'User profile not found.' };
      }

      return { success: false, message: 'Protocol mismatch.' };
    } catch (err) {
      return { success: false, message: 'Security layer failure.' };
    }
  };

  const register = async (userData: Partial<User>): Promise<{ success: boolean; message?: string }> => {
    if (!supabase) return { success: false, message: 'Registration node offline.' };
    try {
      if (!userData.email || !userData.password || !userData.rollNumber) {
        return { success: false, message: 'Missing identifiers.' };
      }

      const { data: existingRoll } = await supabase
        .from('users')
        .select('id')
        .eq('roll_number', userData.rollNumber)
        .eq('academic_year', userData.academicYear)
        .maybeSingle();

      if (existingRoll) {
        return { success: false, message: `Roll number ${userData.rollNumber} is already registered for ${userData.academicYear}.` };
      }

      const { data, error } = await supabase.auth.signUp({
        email: normalizeEmail(userData.email),
        password: userData.password
      });

      if (error) {
        if (error.message.includes('already registered')) return { success: false, message: 'Email already exists' };
        return { success: false, message: error.message };
      }

      if (!data.user) return { success: false, message: 'Auth generation failed.' };

      const isJay = checkSuperStudent(userData);

      const userProfile: User = {
        id: data.user.id,
        name: userData.name || 'Student',
        email: normalizeEmail(userData.email),
        rollNumber: userData.rollNumber,
        academicYear: userData.academicYear as AcademicYear,
        role: 'student',
        violationsCount: 0,
        isRegistered: true,
        isSuperStudent: isJay
      };

      await storageService.saveUser(userProfile);
      storageService.saveAuditLog({ id: Math.random().toString(), action: "USER_REGISTER", details: `New Registration: ${userProfile.name}`, performedBy: "System", timestamp: new Date().toISOString() });
      return { success: true, message: 'Enrollment successful.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Enrollment failure.' };
    }
  };

  const forgotPassword = async (email: string, rollNumber: string, newPass: string, year?: AcademicYear) => {
    if (!supabase) return { success: false, message: "Offline." };
    try {
      const cleanEmail = normalizeEmail(email);
      const dbProfile = await storageService.getUserByEmail(cleanEmail);
      
      if (!dbProfile) return { success: false, message: 'Identity not found in records.' };
      
      if (dbProfile.rollNumber !== rollNumber) return { success: false, message: 'Identity check failed: Roll Number mismatch.' };
      if (year && dbProfile.academicYear !== year) return { success: false, message: 'Identity check failed: Year mismatch.' };
      
      const siteUrl = (import.meta as any).env.VITE_SITE_URL || window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${siteUrl}/#/reset-password`
      });
      if (error) throw error;
      
      return { 
        success: true, 
        message: 'Identity Verified. A security link has been sent to your registered email to finalize the password reset.' 
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Recovery protocol failed.' };
    }
  };

  const logout = () => { 
    if (user) {
       storageService.saveAuditLog({ id: Math.random().toString(), action: "LOGOUT", details: "Session Terminated", performedBy: user.name, timestamp: new Date().toISOString() });
    }
    setUser(null); 
    sessionStorage.removeItem('quizgen_session'); 
  };

  const acceptTerms = async () => {
    if (user) {
      const updatedUser = { ...user, acceptedTerms: true, termsAcceptedAt: new Date().toISOString() };
      setUser(updatedUser);
      await storageService.saveUser(updatedUser);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, showDevPopup, setShowDevPopup, acceptTerms, register, forgotPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth error');
  return context;
};
