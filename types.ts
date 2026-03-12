
export type UserRole = 'student' | 'admin';
export type AdminLevel = 'Super Admin' | 'Exam Manager' | 'Proctor' | 'Subject Admin';
export type AcademicYear = '1st Year' | '2nd Year' | '3rd Year';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type QuestionType = 'mcq' | 'boolean' | 'fib' | 'subjective';

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  performedBy: string;
  timestamp: string;
}

export interface Notice {
  id: string;
  text: string;
  date: string;
  author: string;
  priority: 'low' | 'medium' | 'high';
  targetYear?: AcademicYear | 'All';
}

export interface Subject {
  id: string;
  name: string;
  academicYear: AcademicYear;
  semester?: string;
  status: 'active' | 'inactive';
}

export interface User {
  id: string;
  name: string;
  email: string;
  rollNumber?: string;
  role: UserRole;
  adminLevel?: AdminLevel;
  academicYear?: AcademicYear;
  isRegistered?: boolean;
  blockedUntil?: string | null;
  blockReason?: string;
  violationsCount: number;
  isSuperStudent?: boolean;
  isArchived?: boolean;
  allowUnblockRequest?: boolean; // Controls if student sees contact info when blocked
  unblockAdProgress?: number;
  acceptedTerms?: boolean;
  termsAcceptedAt?: string;
  password?: string;
  globalRank?: number;
  totalPoints?: number;
  lastSync?: string;
  faceEmbedding?: number[]; // Encrypted vector of face geometry
}

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[];
  correctAnswer: any;
  difficulty: Difficulty;
}

export interface Exam {
  id: string;
  title: string;
  subject: string;
  subjectId: string;
  academicYear: AcademicYear;
  durationMinutes: number;
  totalQuestions: number;
  questions: Question[];
  status: 'draft' | 'published' | 'closed' | 'archived';
  qrCode: string;
  expiresAt: string;
  createdAt: string;
  createdBy: string;
  allowedTypes?: QuestionType[];
  settings?: {
    negativeMarking: boolean;
    randomizeOrder: boolean;
    showResultImmediately: boolean;
    lockAnswers?: boolean;
    strikeLimit?: number; // Custom strike limit for this exam
  };
  rules?: string;
}

export interface ViolationEvent {
  type: 'face-missing' | 'multiple-faces' | 'face-mismatch' | 'looking-away' | 'tab-switch' | 'fullscreen-exit' | 'sensor';
  count: number;
  timestamp: string;
  snapshotHash?: string; // SHA-256 Hash of the snapshot (No Raw Images)
  confidence: number;
  reviewed?: boolean;
  reviewedBy?: string;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  studentId: string;
  score: number;
  totalQuestions: number;
  status: 'in_progress' | 'completed' | 'blocked';
  timestamp: string;
  tabSwitchCount: number;
  faceMoveCount: number;
  cheatScore: number;
  integrityStatus: string;
  violations: ViolationEvent[];
  answersMap: Record<string, any>;
  rank?: number;
  correctCount?: number;
  wrongCount?: number;
  notAnsweredCount?: number;
  currentQuestionIndex?: number;
}

export interface GlobalSystemState {
  isPanicMode: boolean;
  maintenanceMode: boolean;
  showDevPopup: boolean;
  showAds: boolean;
  appName: string;
  brandColor: string;
  questionLimit: number;
  proctoringSensitivity: number;
  audioSensitivity: number;
  autoBlockThreshold: number;
  tabSwitchLimit: number;
  faceMoveLimit: number;
  blockReasonTemplate: string;
  allowedExamDurations: number[];
  globalAlert?: string;
  alertPriority?: 'info' | 'warning' | 'critical';
}
