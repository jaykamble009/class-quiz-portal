
import { createClient } from '@supabase/supabase-js';
import { User, Exam, ExamAttempt, GlobalSystemState, Subject, Notice, AcademicYear, AuditLog } from '../types.ts';

// Robust Environment Variable Getter
const getEnv = (key: string) => {
  // 1. Check Standard Vite Env (Production/Vercel/Netlify)
  // Note: Vite requires 'VITE_' prefix for client-side exposure by default, checking both just in case.
  const metaEnv = (import.meta as any).env;
  if (metaEnv) {
    if (metaEnv[`VITE_${key}`]) return metaEnv[`VITE_${key}`];
    if (metaEnv[key]) return metaEnv[key];
  }

  // 2. Check Global Shim (Local/Index.html hardcoded values)
  try {
    return (window as any).process?.env?.[key] || (process as any)?.env?.[key] || '';
  } catch {
    return '';
  }
};

const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseKey = getEnv('SUPABASE_ANON_KEY');

export const supabase = (supabaseUrl && supabaseUrl.startsWith('http') && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: { 'x-application-name': 'class-quiz-portal' },
    },
  })
  : null;

export const normalizeEmail = (email: string) => email ? email.trim().toLowerCase() : '';

const normalizeAcademicYear = (input: string | null): AcademicYear => {
  if (!input) return '1st Year';
  const clean = input.toLowerCase().trim();
  if (clean.includes('1') || clean.includes('first')) return '1st Year';
  if (clean.includes('2') || clean.includes('second')) return '2nd Year';
  if (clean.includes('3') || clean.includes('third')) return '3rd Year';
  return input as AcademicYear;
};

export const getErrorMessage = (error: unknown): string => {
  if (!navigator.onLine) return "Network Disconnected. Please check your internet.";
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) return String((error as any).message);
  if (typeof error === 'string') return error;
  return "An unexpected system protocol error occurred.";
};

async function withRetry(operation: () => PromiseLike<any>, retries = 3, baseDelay = 1000): Promise<any> {
  try {
    const result = await operation();
    if (result && result.error && (
      result.error.message?.includes('fetch') ||
      result.error.message?.includes('network') ||
      result.error.message?.includes('connection')
    )) {
      throw new Error(result.error.message);
    }
    return result;
  } catch (err: any) {
    const message = err.message || '';
    const isNetworkError = message.includes('fetch') || message.includes('network') || message.includes('connection');
    if (retries > 0 && isNetworkError) {
      await new Promise(resolve => setTimeout(resolve, baseDelay));
      return withRetry(operation, retries - 1, baseDelay * 2);
    }
    throw err;
  }
}

export const storageService = {
  async testConnection() {
    if (!supabase) return { connected: false, setupRequired: false, message: "Terminal Offline: Check Environment Variables" };
    try {
      const { data, error } = await Promise.race([
        supabase.from('settings').select('app_name').limit(1),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]) as any;
      if (error) throw error;
      return { connected: true, setupRequired: data?.length === 0, message: "Secure Link Active" };
    } catch (err: any) {
      return { connected: false, setupRequired: false, message: "Offline Mode" };
    }
  },

  getDefaultSettings(): GlobalSystemState {
    return {
      isPanicMode: false, maintenanceMode: false, showDevPopup: true, showAds: false,
      appName: 'Class-Quiz Portal', brandColor: '#4F46E5', questionLimit: 50,
      proctoringSensitivity: 5, audioSensitivity: 5, autoBlockThreshold: 3,
      tabSwitchLimit: 2, faceMoveLimit: 5, blockReasonTemplate: 'Terminal restricted due to security violations.',
      allowedExamDurations: [15, 30, 45, 60, 90, 120]
    };
  },

  async getSettings(): Promise<GlobalSystemState> {
    const defaults = this.getDefaultSettings();
    if (!supabase) return defaults;
    try {
      const { data, error } = await withRetry(() => supabase!.from('settings').select('*').single());
      if (error || !data) return defaults;
      return {
        isPanicMode: data.is_panic_mode ?? defaults.isPanicMode,
        maintenanceMode: data.maintenance_mode ?? defaults.maintenanceMode,
        showDevPopup: data.show_dev_popup ?? defaults.showDevPopup,
        showAds: data.show_ads ?? false,
        appName: data.app_name ?? defaults.appName,
        brandColor: data.brand_color ?? defaults.brandColor,
        questionLimit: data.question_limit ?? defaults.questionLimit,
        proctoringSensitivity: data.proctoring_sensitivity ?? defaults.proctoringSensitivity,
        audioSensitivity: data.audio_sensitivity ?? defaults.audioSensitivity,
        autoBlockThreshold: data.auto_block_threshold ?? defaults.autoBlockThreshold,
        tabSwitchLimit: data.tab_switch_limit ?? defaults.tabSwitchLimit,
        faceMoveLimit: data.face_move_limit ?? defaults.faceMoveLimit,
        blockReasonTemplate: data.block_reason_template ?? defaults.blockReasonTemplate,
        allowedExamDurations: data.allowed_exam_durations ?? defaults.allowedExamDurations,
        globalAlert: data.global_alert,
        alertPriority: data.alert_priority || 'info'
      } as GlobalSystemState;
    } catch (err) { return defaults; }
  },

  async saveSettings(settings: GlobalSystemState) {
    if (!supabase) return;
    try {
      const payload: any = {
        id: 1,
        is_panic_mode: settings.isPanicMode, maintenance_mode: settings.maintenanceMode,
        show_dev_popup: settings.showDevPopup, show_ads: false, app_name: settings.appName,
        brand_color: settings.brandColor, proctoring_sensitivity: settings.proctoringSensitivity,
        audio_sensitivity: settings.audioSensitivity, auto_block_threshold: settings.autoBlockThreshold,
        global_alert: settings.globalAlert, alert_priority: settings.alertPriority,
        allowed_exam_durations: settings.allowedExamDurations
      };
      await withRetry(() => supabase!.from('settings').upsert(payload));
    } catch (err: any) { console.error("Save settings error:", getErrorMessage(err)); }
  },

  async getUsers(): Promise<User[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await withRetry(() => supabase!.from('users').select('*'));
      if (error) throw error;
      return (data || []).map((u: any) => ({
        id: u.id, name: u.name || 'Unknown', email: u.email, rollNumber: u.roll_number,
        role: u.role ? u.role.toLowerCase() : 'student', academicYear: normalizeAcademicYear(u.academic_year),
        blockedUntil: u.blocked_until, blockReason: u.block_reason, violationsCount: u.violations_count || 0,
        isSuperStudent: u.is_super_student || false, isArchived: u.is_archived || false,
        allowUnblockRequest: u.allow_unblock_request || false
      }));
    } catch (err) { return []; }
  },

  async getUserByEmail(email: string): Promise<User | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await withRetry(() => supabase!.from('users').select('*').eq('email', normalizeEmail(email)).maybeSingle());
      if (error || !data) return null;
      return {
        id: data.id, name: data.name, email: data.email, rollNumber: data.roll_number,
        role: data.role ? data.role.toLowerCase() : 'student', academicYear: normalizeAcademicYear(data.academic_year),
        blockedUntil: data.blocked_until, blockReason: data.block_reason, violationsCount: data.violations_count || 0,
        isSuperStudent: data.is_super_student, allowUnblockRequest: data.allow_unblock_request || false
      } as User;
    } catch (err) { return null; }
  },

  async saveUser(user: User) {
    if (!supabase) return;
    try {
      const payload: any = {
        id: user.id, name: user.name, email: normalizeEmail(user.email), roll_number: user.rollNumber,
        role: user.role, academic_year: user.academicYear, blocked_until: user.blockedUntil,
        block_reason: user.blockReason, violations_count: user.violationsCount,
        is_super_student: user.isSuperStudent, is_archived: user.isArchived,
        allow_unblock_request: user.allowUnblockRequest
      };
      await withRetry(() => supabase!.from('users').upsert(payload));
    } catch (err) { throw err; }
  },

  async updateUser(id: string, updates: Partial<User>) {
    if (!supabase) return;
    try {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.email !== undefined) dbUpdates.email = normalizeEmail(updates.email);
      if (updates.rollNumber !== undefined) dbUpdates.roll_number = updates.rollNumber;
      if (updates.role !== undefined) dbUpdates.role = updates.role;
      if (updates.academicYear !== undefined) dbUpdates.academic_year = updates.academicYear;
      if (updates.blockedUntil !== undefined) dbUpdates.blocked_until = updates.blockedUntil;
      if (updates.blockReason !== undefined) dbUpdates.block_reason = updates.blockReason;
      if (updates.violationsCount !== undefined) dbUpdates.violations_count = updates.violationsCount;
      if (updates.isSuperStudent !== undefined) dbUpdates.is_super_student = updates.isSuperStudent;
      if (updates.isArchived !== undefined) dbUpdates.is_archived = updates.isArchived;
      if (updates.allowUnblockRequest !== undefined) dbUpdates.allow_unblock_request = updates.allowUnblockRequest;
      if (Object.keys(dbUpdates).length === 0) return;
      await withRetry(() => supabase!.from('users').update(dbUpdates).eq('id', id));
    } catch (err) { throw err; }
  },

  async getExams(includeArchived = false): Promise<Exam[]> {
    if (!supabase) return [];
    try {
      let query = supabase!.from('exams').select('*').order('created_at', { ascending: false });

      if (!includeArchived) {
        query = query.neq('status', 'archived');
      }

      const { data, error } = await withRetry(() => query);

      if (error) throw error;
      return (data || []).map((e: any) => ({
        ...e, academicYear: e.academic_year, totalQuestions: e.total_questions, createdAt: e.created_at,
        expiresAt: e.expires_at, allowedTypes: e.allowed_types || ['mcq'],
        settings: e.settings || { negativeMarking: false, randomizeOrder: false, showResultImmediately: true, strikeLimit: 3 },
        rules: e.rules
      }));
    } catch (err) { return []; }
  },

  async saveExam(exam: Exam) {
    if (!supabase) return;
    try {
      const payload: any = {
        id: exam.id, title: exam.title, subject: exam.subject, academic_year: exam.academicYear,
        duration_minutes: exam.durationMinutes, total_questions: exam.totalQuestions, questions: exam.questions,
        status: exam.status, qr_code: exam.qrCode, expires_at: exam.expiresAt, allowed_types: exam.allowedTypes,
        settings: exam.settings, rules: exam.rules
      };
      await withRetry(() => supabase!.from('exams').upsert(payload));
    } catch (err) { throw err; }
  },

  async archiveExam(id: string) {
    if (!supabase) throw new Error("Database disconnected.");
    const cleanId = id.trim();
    console.log(`[Storage] Archiving exam: ${cleanId}`);

    // Attempt update
    const { error } = await supabase.from('exams').update({ status: 'archived' }).eq('id', cleanId);

    if (error) {
      console.error("Archive SQL Error:", error);
      throw new Error(`Archive failed: ${error.message} (Code: ${error.code})`);
    }
  },

  async deleteExam(id: string) {
    if (!supabase) throw new Error("Database disconnected.");

    const cleanId = id.trim();
    console.log(`[Storage] Deleting exam: ${cleanId}`);

    // Strategy 1: Manual Cascade (Delete attempts first)
    try {
      await supabase.from('attempts').delete().eq('exam_id', cleanId);
    } catch (e) {
      console.warn("Manual cascade delete warnings:", e);
    }

    // Strategy 2: Hard Delete Exam
    const { error: hardDeleteError } = await supabase.from('exams').delete().eq('id', cleanId);

    if (!hardDeleteError) {
      console.log("Hard delete successful.");
      return;
    }

    console.warn(`Hard delete failed (${hardDeleteError.message}). Attempting Soft Archive.`);

    // Strategy 3: Fallback to Soft Delete (Archive)
    const { error: softDeleteError } = await supabase
      .from('exams')
      .update({ status: 'archived' })
      .eq('id', cleanId);

    if (softDeleteError) {
      console.error("Critical: Soft delete also failed.", softDeleteError);
      throw new Error(`Action Failed. DB Error: ${softDeleteError.message}. Try disabling RLS in Database Setup.`);
    }

    console.log("Soft delete (archive) successful.");
  },

  async archiveAllExams() {
    if (!supabase) throw new Error("Database disconnected.");
    const { error } = await supabase.from('exams').update({ status: 'archived' }).neq('status', 'archived');
    if (error) throw error;
  },

  async deleteAllExams() {
    if (!supabase) throw new Error("Database disconnected.");

    // 1. Wipe attempts
    const { error: attError } = await supabase.from('attempts').delete().neq('id', '000000');
    if (attError) console.warn("Batch attempts delete warning:", attError.message);

    // 2. Wipe exams
    const { error: examError } = await supabase.from('exams').delete().neq('id', '000000');

    if (examError) {
      console.warn("Batch hard delete failed. Falling back to Archive All.");
      // Fallback: Archive all
      await supabase.from('exams').update({ status: 'archived' }).neq('id', '000000');
    }
  },

  async clearAllAttempts() {
    if (!supabase) throw new Error("Database disconnected.");

    // 1. Delete all attempts
    const { error } = await supabase.from('attempts').delete().neq('id', '000000');
    if (error) throw error;

    // 2. Reset violations count for all users (Fresh Start)
    const { error: uError } = await supabase.from('users').update({ violations_count: 0 }).neq('id', '000000');
    if (uError) console.warn("Violation reset warning:", uError.message);
  },

  async getAttempts(): Promise<ExamAttempt[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await withRetry(() => supabase!.from('attempts').select('*').order('timestamp', { ascending: false }));
      if (error) return [];
      return (data || []).map((a: any) => ({
        id: a.id, examId: a.exam_id, studentId: a.student_id, score: a.score, totalQuestions: a.total_questions,
        status: a.status, timestamp: a.timestamp, tabSwitchCount: a.tab_switch_count, faceMoveCount: a.face_move_count,
        cheatScore: a.cheat_score, integrityStatus: a.integrity_status, violations: a.violations || [], answersMap: a.answers_map || {},
        correctCount: a.correct_count, wrongCount: a.wrong_count, notAnsweredCount: a.not_answered_count, currentQuestionIndex: a.current_question_index
      }));
    } catch (err) { return []; }
  },

  async saveAttempt(attempt: ExamAttempt) {
    if (!supabase) return;
    try {
      const payload: any = {
        id: attempt.id, exam_id: attempt.examId, student_id: attempt.studentId, score: attempt.score,
        total_questions: attempt.totalQuestions, status: attempt.status, timestamp: attempt.timestamp,
        tab_switch_count: attempt.tabSwitchCount, face_move_count: attempt.faceMoveCount,
        cheat_score: attempt.cheatScore, integrity_status: attempt.integrityStatus,
        violations: attempt.violations, answers_map: attempt.answersMap,
        correct_count: attempt.correctCount, wrong_count: attempt.wrongCount,
        not_answered_count: attempt.notAnsweredCount, current_question_index: attempt.currentQuestionIndex
      };
      await withRetry(() => supabase!.from('attempts').upsert(payload));
    } catch (err) { /* silent fail */ }
  },

  async getStudentAttempts(studentId: string): Promise<ExamAttempt[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await withRetry(() =>
        supabase!.from('attempts')
          .select('*')
          .eq('student_id', studentId)
          .order('timestamp', { ascending: false })
      );
      if (error) throw error;
      return (data || []).map((a: any) => ({
        id: a.id, examId: a.exam_id, studentId: a.student_id, score: a.score, totalQuestions: a.total_questions,
        status: a.status, timestamp: a.timestamp, tabSwitchCount: a.tab_switch_count, faceMoveCount: a.face_move_count,
        cheatScore: a.cheat_score, integrityStatus: a.integrity_status, violations: a.violations || [], answersMap: a.answers_map || {},
        correctCount: a.correct_count, wrongCount: a.wrong_count, notAnsweredCount: a.not_answered_count, currentQuestionIndex: a.current_question_index
      }));
    } catch (err) {
      console.error('Error fetching student attempts:', err);
      return [];
    }
  },

  async getSubjects(): Promise<Subject[]> {
    if (!supabase) return [];
    try {
      const { data } = await withRetry(() => supabase!.from('subjects').select('*').order('name'));
      return (data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        academicYear: s.academic_year as AcademicYear,
        semester: s.semester,
        status: s.status
      }));
    } catch (err) { return []; }
  },

  async addSubject(name: string, year: AcademicYear, semester?: string) {
    if (!supabase) return;
    try {
      const id = 'SUB-' + Math.random().toString(36).substr(2, 6).toUpperCase();
      await withRetry(() => supabase!.from('subjects').insert({ id, name, academic_year: year, semester, status: 'active' }));
    } catch (err) { throw err; }
  },

  async updateSubject(id: string, name: string) {
    if (!supabase) return;
    try { await withRetry(() => supabase!.from('subjects').update({ name }).eq('id', id)); } catch (err) { throw err; }
  },

  async deleteSubject(id: string) {
    if (!supabase) return;
    try { await withRetry(() => supabase!.from('subjects').delete().eq('id', id)); } catch (err) { throw err; }
  },

  async getNotices(): Promise<Notice[]> {
    if (!supabase) return [];
    try {
      const { data } = await withRetry(() => supabase!.from('notices').select('*').order('date', { ascending: false }));
      return (data || []).map((n: any) => ({
        id: n.id, text: n.text, date: n.date, author: n.author, priority: n.priority, targetYear: n.target_year || n.targetYear || 'All'
      }));
    } catch (err) { return []; }
  },

  async saveNotice(notice: Notice) {
    if (!supabase) return;
    try {
      const payload: any = {
        id: notice.id, text: notice.text, date: notice.date, author: notice.author,
        priority: notice.priority, target_year: notice.targetYear
      };
      await withRetry(() => supabase!.from('notices').insert(payload));
    } catch (e) { throw e; }
  },

  async deleteNotice(id: string) {
    if (!supabase) return;
    try { await withRetry(() => supabase!.from('notices').delete().eq('id', id)); } catch (e) { throw e; }
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    if (!supabase) return [];
    try {
      const { data } = await withRetry(() => supabase!.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(100));
      return (data || []).map((l: any) => ({ id: l.id, action: l.action, details: l.details, performedBy: l.performed_by, timestamp: l.timestamp }));
    } catch (e) { return []; }
  },

  async saveAuditLog(log: AuditLog) {
    if (!supabase) return;
    try {
      await supabase.from('audit_logs').insert({
        id: log.id, action: log.action, details: log.details, performed_by: log.performedBy, timestamp: log.timestamp
      });
    } catch (e) { }
  },

  async factoryReset() {
    if (!supabase) throw new Error("Database offline");
    const wipeTable = async (table: string) => {
      const { error } = await supabase!.from(table).delete().neq('id', '00000');
      if (error) console.error(`Wipe failed ${table}:`, error.message);
    };
    await wipeTable('attempts');
    await wipeTable('exams');
    await wipeTable('notices');
    await wipeTable('audit_logs');
    await this.saveSettings(this.getDefaultSettings());
  }
};
