export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    public: {
        Tables: {
            attempts: {
                Row: {
                    answers_map: Json | null
                    cheat_score: number | null
                    correct_count: number | null
                    current_question_index: number | null
                    exam_id: string
                    face_move_count: number | null
                    id: string
                    integrity_status: string | null
                    not_answered_count: number | null
                    rank: number | null
                    score: number | null
                    status: string | null
                    student_id: string
                    tab_switch_count: number | null
                    timestamp: string | null
                    total_questions: number
                    violations: Json | null
                    wrong_count: number | null
                }
                Insert: {
                    answers_map?: Json | null
                    cheat_score?: number | null
                    correct_count?: number | null
                    current_question_index?: number | null
                    exam_id: string
                    face_move_count?: number | null
                    id: string
                    integrity_status?: string | null
                    not_answered_count?: number | null
                    rank?: number | null
                    score?: number | null
                    status?: string | null
                    student_id: string
                    tab_switch_count?: number | null
                    timestamp?: string | null
                    total_questions: number
                    violations?: Json | null
                    wrong_count?: number | null
                }
                Update: {
                    answers_map?: Json | null
                    cheat_score?: number | null
                    correct_count?: number | null
                    current_question_index?: number | null
                    exam_id?: string
                    face_move_count?: number | null
                    id?: string
                    integrity_status?: string | null
                    not_answered_count?: number | null
                    rank?: number | null
                    score?: number | null
                    status?: string | null
                    student_id?: string
                    tab_switch_count?: number | null
                    timestamp?: string | null
                    total_questions?: number
                    violations?: Json | null
                    wrong_count?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "attempts_exam_id_fkey"
                        columns: ["exam_id"]
                        isOneToOne: false
                        referencedRelation: "exams"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "attempts_student_id_fkey"
                        columns: ["student_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                ]
            }
            // Additional tables: audit_logs, exams, notices, settings, subjects, users
            // Full type definitions available in database
        }
    }
}

// Type helpers
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
