export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      answer_keys: {
        Row: {
          answers: Json
          created_at: string
          id: string
          max_score: number
          name: string
          subject_breakdown: Json
          total_questions: number
          updated_at: string
          version: string
        }
        Insert: {
          answers: Json
          created_at?: string
          id?: string
          max_score?: number
          name: string
          subject_breakdown: Json
          total_questions?: number
          updated_at?: string
          version: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          max_score?: number
          name?: string
          subject_breakdown?: Json
          total_questions?: number
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      omr_audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown | null
          performed_by: string | null
          sheet_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          performed_by?: string | null
          sheet_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          performed_by?: string | null
          sheet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "omr_audit_logs_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "omr_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      omr_results: {
        Row: {
          ambiguous_answers: Json | null
          answer_key_id: string
          confidence_score: number | null
          correct_answers: number
          created_at: string
          detected_answers: Json
          id: string
          incorrect_answers: number
          max_score: number
          percentage: number
          processing_time: number | null
          sheet_id: string
          subject_scores: Json
          total_score: number
          unanswered: number
        }
        Insert: {
          ambiguous_answers?: Json | null
          answer_key_id: string
          confidence_score?: number | null
          correct_answers?: number
          created_at?: string
          detected_answers: Json
          id?: string
          incorrect_answers?: number
          max_score: number
          percentage: number
          processing_time?: number | null
          sheet_id: string
          subject_scores: Json
          total_score: number
          unanswered?: number
        }
        Update: {
          ambiguous_answers?: Json | null
          answer_key_id?: string
          confidence_score?: number | null
          correct_answers?: number
          created_at?: string
          detected_answers?: Json
          id?: string
          incorrect_answers?: number
          max_score?: number
          percentage?: number
          processing_time?: number | null
          sheet_id?: string
          subject_scores?: Json
          total_score?: number
          unanswered?: number
        }
        Relationships: [
          {
            foreignKeyName: "omr_results_answer_key_id_fkey"
            columns: ["answer_key_id"]
            isOneToOne: false
            referencedRelation: "answer_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omr_results_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "omr_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      omr_sheets: {
        Row: {
          created_at: string
          file_path: string
          id: string
          original_filename: string
          processed_file_path: string | null
          roll_number: string | null
          sheet_version: string | null
          status: string
          student_id: string | null
          student_name: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_path: string
          id?: string
          original_filename: string
          processed_file_path?: string | null
          roll_number?: string | null
          sheet_version?: string | null
          status?: string
          student_id?: string | null
          student_name?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_path?: string
          id?: string
          original_filename?: string
          processed_file_path?: string | null
          roll_number?: string | null
          sheet_version?: string | null
          status?: string
          student_id?: string | null
          student_name?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
