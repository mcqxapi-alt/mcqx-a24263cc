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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      amm_content: {
        Row: {
          body: string
          channel: string | null
          created_at: string
          decision_id: string | null
          external_id: string | null
          id: string
          metadata: Json
          metrics: Json
          published_at: string | null
          scheduled_for: string | null
          status: string
          title: string | null
          type: string
          updated_at: string
        }
        Insert: {
          body: string
          channel?: string | null
          created_at?: string
          decision_id?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json
          metrics?: Json
          published_at?: string | null
          scheduled_for?: string | null
          status?: string
          title?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          body?: string
          channel?: string | null
          created_at?: string
          decision_id?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json
          metrics?: Json
          published_at?: string | null
          scheduled_for?: string | null
          status?: string
          title?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "amm_content_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "amm_decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      amm_decisions: {
        Row: {
          actions: Json
          created_at: string
          executed_at: string | null
          id: string
          metrics_snapshot: Json
          reasoning: string | null
          run_date: string
          status: string
          triggered_by: string
        }
        Insert: {
          actions?: Json
          created_at?: string
          executed_at?: string | null
          id?: string
          metrics_snapshot?: Json
          reasoning?: string | null
          run_date?: string
          status?: string
          triggered_by?: string
        }
        Update: {
          actions?: Json
          created_at?: string
          executed_at?: string | null
          id?: string
          metrics_snapshot?: Json
          reasoning?: string | null
          run_date?: string
          status?: string
          triggered_by?: string
        }
        Relationships: []
      }
      amm_events: {
        Row: {
          campaign: string | null
          created_at: string
          event_type: string
          id: string
          medium: string | null
          metadata: Json
          path: string | null
          session_ref: string | null
          source: string | null
          user_id: string | null
        }
        Insert: {
          campaign?: string | null
          created_at?: string
          event_type: string
          id?: string
          medium?: string | null
          metadata?: Json
          path?: string | null
          session_ref?: string | null
          source?: string | null
          user_id?: string | null
        }
        Update: {
          campaign?: string | null
          created_at?: string
          event_type?: string
          id?: string
          medium?: string | null
          metadata?: Json
          path?: string | null
          session_ref?: string | null
          source?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      amm_targets: {
        Row: {
          created_at: string
          goal: number
          id: string
          metric: string
          month: string
        }
        Insert: {
          created_at?: string
          goal: number
          id?: string
          metric: string
          month: string
        }
        Update: {
          created_at?: string
          goal?: number
          id?: string
          metric?: string
          month?: string
        }
        Relationships: []
      }
      boards: {
        Row: {
          created_at: string
          display_order: number
          icon: string
          id: string
          name: string
          type: Database["public"]["Enums"]["board_type"]
        }
        Insert: {
          created_at?: string
          display_order?: number
          icon?: string
          id?: string
          name: string
          type?: Database["public"]["Enums"]["board_type"]
        }
        Update: {
          created_at?: string
          display_order?: number
          icon?: string
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["board_type"]
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          created_at: string
          id: string
          question_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_progress: {
        Row: {
          challenge_id: string
          current_question: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          current_question?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          current_question?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          challenger_answers: Json | null
          challenger_finished_at: string | null
          challenger_id: string
          challenger_ready: boolean
          challenger_score: number | null
          challenger_time_ms: number | null
          chapter_id: string
          completed_at: string | null
          created_at: string
          id: string
          opponent_answers: Json | null
          opponent_finished_at: string | null
          opponent_id: string | null
          opponent_ready: boolean
          opponent_score: number | null
          opponent_time_ms: number | null
          question_ids: string[]
          started_at: string | null
          status: Database["public"]["Enums"]["challenge_status"]
        }
        Insert: {
          challenger_answers?: Json | null
          challenger_finished_at?: string | null
          challenger_id: string
          challenger_ready?: boolean
          challenger_score?: number | null
          challenger_time_ms?: number | null
          chapter_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          opponent_answers?: Json | null
          opponent_finished_at?: string | null
          opponent_id?: string | null
          opponent_ready?: boolean
          opponent_score?: number | null
          opponent_time_ms?: number | null
          question_ids: string[]
          started_at?: string | null
          status?: Database["public"]["Enums"]["challenge_status"]
        }
        Update: {
          challenger_answers?: Json | null
          challenger_finished_at?: string | null
          challenger_id?: string
          challenger_ready?: boolean
          challenger_score?: number | null
          challenger_time_ms?: number | null
          chapter_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          opponent_answers?: Json | null
          opponent_finished_at?: string | null
          opponent_id?: string | null
          opponent_ready?: boolean
          opponent_score?: number | null
          opponent_time_ms?: number | null
          question_ids?: string[]
          started_at?: string | null
          status?: Database["public"]["Enums"]["challenge_status"]
        }
        Relationships: [
          {
            foreignKeyName: "challenges_challenger_id_fkey"
            columns: ["challenger_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_opponent_id_fkey"
            columns: ["opponent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
          subject_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
          subject_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          board_id: string
          created_at: string
          display_order: number
          id: string
          name: string
        }
        Insert: {
          board_id: string
          created_at?: string
          display_order?: number
          id?: string
          name: string
        }
        Update: {
          board_id?: string
          created_at?: string
          display_order?: number
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_pages: {
        Row: {
          created_at: string
          exam_id: string
          faq: Json
          generated_at: string
          id: string
          intro_md: string
          language: string
          meta_description: string
          published: boolean
          question_ids: string[]
          slug: string
          syllabus_md: string
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          created_at?: string
          exam_id: string
          faq?: Json
          generated_at?: string
          id?: string
          intro_md?: string
          language?: string
          meta_description: string
          published?: boolean
          question_ids?: string[]
          slug: string
          syllabus_md?: string
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          created_at?: string
          exam_id?: string
          faq?: Json
          generated_at?: string
          id?: string
          intro_md?: string
          language?: string
          meta_description?: string
          published?: boolean
          question_ids?: string[]
          slug?: string
          syllabus_md?: string
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "exam_pages_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exam_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_targets: {
        Row: {
          annual_aspirants: number | null
          created_at: string
          id: string
          language: string
          last_quality_check: string | null
          mcq_count: number | null
          name: string
          quality_score: number | null
          region: string | null
          seed_chapter_ids: string[] | null
          slug: string
          status: string
          syllabus_json: Json | null
          tier: number
          updated_at: string
          word_count: number | null
        }
        Insert: {
          annual_aspirants?: number | null
          created_at?: string
          id?: string
          language?: string
          last_quality_check?: string | null
          mcq_count?: number | null
          name: string
          quality_score?: number | null
          region?: string | null
          seed_chapter_ids?: string[] | null
          slug: string
          status?: string
          syllabus_json?: Json | null
          tier?: number
          updated_at?: string
          word_count?: number | null
        }
        Update: {
          annual_aspirants?: number | null
          created_at?: string
          id?: string
          language?: string
          last_quality_check?: string | null
          mcq_count?: number | null
          name?: string
          quality_score?: number | null
          region?: string | null
          seed_chapter_ids?: string[] | null
          slug?: string
          status?: string
          syllabus_json?: Json | null
          tier?: number
          updated_at?: string
          word_count?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          last_practice_date: string | null
          streak_days: number
          total_attempts: number
          total_correct: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          last_practice_date?: string | null
          streak_days?: number
          total_attempts?: number
          total_correct?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_practice_date?: string | null
          streak_days?: number
          total_attempts?: number
          total_correct?: number
          updated_at?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          chapter_id: string
          correct_answer: number
          created_at: string
          difficulty: Database["public"]["Enums"]["question_difficulty"]
          explanation: string | null
          id: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          source: Database["public"]["Enums"]["question_source"]
          status: Database["public"]["Enums"]["question_status"]
          text: string
          updated_at: string
        }
        Insert: {
          chapter_id: string
          correct_answer: number
          created_at?: string
          difficulty?: Database["public"]["Enums"]["question_difficulty"]
          explanation?: string | null
          id?: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          source?: Database["public"]["Enums"]["question_source"]
          status?: Database["public"]["Enums"]["question_status"]
          text: string
          updated_at?: string
        }
        Update: {
          chapter_id?: string
          correct_answer?: number
          created_at?: string
          difficulty?: Database["public"]["Enums"]["question_difficulty"]
          explanation?: string | null
          id?: string
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          source?: Database["public"]["Enums"]["question_source"]
          status?: Database["public"]["Enums"]["question_status"]
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          question_id: string
          reason: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          reason: string
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string
          reason?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_pages: {
        Row: {
          board_name: string
          chapter_id: string
          chapter_name: string
          class_name: string
          created_at: string
          faq: Json
          generated_at: string
          id: string
          intro_md: string
          meta_description: string
          published: boolean
          question_ids: string[]
          slug: string
          subject_name: string
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          board_name: string
          chapter_id: string
          chapter_name: string
          class_name: string
          created_at?: string
          faq?: Json
          generated_at?: string
          id?: string
          intro_md: string
          meta_description: string
          published?: boolean
          question_ids?: string[]
          slug: string
          subject_name: string
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          board_name?: string
          chapter_id?: string
          chapter_name?: string
          class_name?: string
          created_at?: string
          faq?: Json
          generated_at?: string
          id?: string
          intro_md?: string
          meta_description?: string
          published?: boolean
          question_ids?: string[]
          slug?: string
          subject_name?: string
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "seo_pages_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: true
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          ai_count: number
          answers: number[]
          chapter_id: string
          completed_at: string
          id: string
          question_ids: string[]
          score: number
          total_questions: number
          user_id: string | null
          verified_count: number
        }
        Insert: {
          ai_count?: number
          answers: number[]
          chapter_id: string
          completed_at?: string
          id?: string
          question_ids: string[]
          score: number
          total_questions: number
          user_id?: string | null
          verified_count?: number
        }
        Update: {
          ai_count?: number
          answers?: number[]
          chapter_id?: string
          completed_at?: string
          id?: string
          question_ids?: string[]
          score?: number
          total_questions?: number
          user_id?: string | null
          verified_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "sessions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          class_id: string | null
          created_at: string
          display_order: number
          icon: string
          id: string
          name: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          display_order?: number
          icon: string
          id?: string
          name: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          display_order?: number
          icon?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_difficulty_state: {
        Row: {
          chapter_id: string
          consecutive_correct: number
          consecutive_incorrect: number
          current_difficulty: Database["public"]["Enums"]["question_difficulty"]
          id: string
          total_easy_attempts: number
          total_easy_correct: number
          total_hard_attempts: number
          total_hard_correct: number
          total_medium_attempts: number
          total_medium_correct: number
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_id: string
          consecutive_correct?: number
          consecutive_incorrect?: number
          current_difficulty?: Database["public"]["Enums"]["question_difficulty"]
          id?: string
          total_easy_attempts?: number
          total_easy_correct?: number
          total_hard_attempts?: number
          total_hard_correct?: number
          total_medium_attempts?: number
          total_medium_correct?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_id?: string
          consecutive_correct?: number
          consecutive_incorrect?: number
          current_difficulty?: Database["public"]["Enums"]["question_difficulty"]
          id?: string
          total_easy_attempts?: number
          total_easy_correct?: number
          total_hard_attempts?: number
          total_hard_correct?: number
          total_medium_attempts?: number
          total_medium_correct?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_difficulty_state_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      user_question_progress: {
        Row: {
          answered_at: string
          chapter_id: string
          id: string
          question_id: string
          recycle_count: number
          user_id: string
          was_correct: boolean | null
        }
        Insert: {
          answered_at?: string
          chapter_id: string
          id?: string
          question_id: string
          recycle_count?: number
          user_id: string
          was_correct?: boolean | null
        }
        Update: {
          answered_at?: string
          chapter_id?: string
          id?: string
          question_id?: string
          recycle_count?: number
          user_id?: string
          was_correct?: boolean | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      count_unseen_questions: {
        Args: { p_chapter_id: string; p_user_id: string }
        Returns: number
      }
      count_user_chapter_attempts: {
        Args: { p_chapter_id: string; p_user_id: string }
        Returns: number
      }
      get_adaptive_questions: {
        Args: { p_chapter_id: string; p_limit?: number; p_user_id: string }
        Returns: {
          chapter_id: string
          created_at: string
          difficulty: Database["public"]["Enums"]["question_difficulty"]
          id: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          source: Database["public"]["Enums"]["question_source"]
          status: Database["public"]["Enums"]["question_status"]
          text: string
          updated_at: string
        }[]
      }
      get_leaderboard: {
        Args: { p_limit?: number; p_metric?: string }
        Returns: {
          accuracy: number
          avatar_url: string
          challenge_wins: number
          display_name: string
          streak_days: number
          total_attempts: number
          total_correct: number
          user_id: string
        }[]
      }
      get_leaderboard_by_wins: {
        Args: { p_limit?: number }
        Returns: {
          accuracy: number
          avatar_url: string
          challenge_wins: number
          display_name: string
          streak_days: number
          total_attempts: number
          total_correct: number
          user_id: string
        }[]
      }
      get_mixed_questions_for_power_user: {
        Args: {
          p_chapter_id: string
          p_limit?: number
          p_max_recycle_count?: number
          p_min_days_ago?: number
          p_recycle_ratio?: number
          p_user_id: string
        }
        Returns: {
          chapter_id: string
          created_at: string
          difficulty: Database["public"]["Enums"]["question_difficulty"]
          id: string
          is_recycled: boolean
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          source: Database["public"]["Enums"]["question_source"]
          status: Database["public"]["Enums"]["question_status"]
          text: string
          updated_at: string
        }[]
      }
      get_public_questions: {
        Args: { p_chapter_id: string; p_limit?: number }
        Returns: {
          chapter_id: string
          created_at: string
          difficulty: Database["public"]["Enums"]["question_difficulty"]
          id: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          source: Database["public"]["Enums"]["question_source"]
          status: Database["public"]["Enums"]["question_status"]
          text: string
          updated_at: string
        }[]
      }
      get_question_answers: {
        Args: { p_question_ids: string[] }
        Returns: {
          correct_answer: number
          explanation: string
          question_id: string
        }[]
      }
      get_questions_by_ids: {
        Args: { p_question_ids: string[] }
        Returns: {
          chapter_id: string
          created_at: string
          difficulty: Database["public"]["Enums"]["question_difficulty"]
          id: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          source: Database["public"]["Enums"]["question_source"]
          status: Database["public"]["Enums"]["question_status"]
          text: string
          updated_at: string
        }[]
      }
      get_random_questions_for_guest: {
        Args: { p_chapter_id: string; p_limit?: number }
        Returns: {
          chapter_id: string
          created_at: string
          difficulty: Database["public"]["Enums"]["question_difficulty"]
          id: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          source: Database["public"]["Enums"]["question_source"]
          status: Database["public"]["Enums"]["question_status"]
          text: string
          updated_at: string
        }[]
      }
      get_seo_page: {
        Args: { p_slug: string }
        Returns: {
          board_name: string
          chapter_id: string
          chapter_name: string
          class_name: string
          faq: Json
          generated_at: string
          id: string
          intro_md: string
          meta_description: string
          question_ids: string[]
          slug: string
          subject_name: string
          title: string
        }[]
      }
      get_unseen_questions_for_user: {
        Args: { p_chapter_id: string; p_limit?: number; p_user_id: string }
        Returns: {
          chapter_id: string
          created_at: string
          difficulty: Database["public"]["Enums"]["question_difficulty"]
          id: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          source: Database["public"]["Enums"]["question_source"]
          status: Database["public"]["Enums"]["question_status"]
          text: string
          updated_at: string
        }[]
      }
      get_user_difficulty_stats: {
        Args: { p_chapter_id: string; p_user_id: string }
        Returns: {
          current_difficulty: Database["public"]["Enums"]["question_difficulty"]
          easy_accuracy: number
          hard_accuracy: number
          medium_accuracy: number
          total_attempts: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_recycle_count: {
        Args: { p_question_id: string; p_user_id: string }
        Returns: undefined
      }
      increment_seo_view: { Args: { p_slug: string }; Returns: undefined }
      join_open_challenge: {
        Args: { p_challenge_id: string }
        Returns: {
          challenger_answers: Json | null
          challenger_finished_at: string | null
          challenger_id: string
          challenger_ready: boolean
          challenger_score: number | null
          challenger_time_ms: number | null
          chapter_id: string
          completed_at: string | null
          created_at: string
          id: string
          opponent_answers: Json | null
          opponent_finished_at: string | null
          opponent_id: string | null
          opponent_ready: boolean
          opponent_score: number | null
          opponent_time_ms: number | null
          question_ids: string[]
          started_at: string | null
          status: Database["public"]["Enums"]["challenge_status"]
        }
        SetofOptions: {
          from: "*"
          to: "challenges"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      list_seo_slugs: {
        Args: never
        Returns: {
          slug: string
          updated_at: string
        }[]
      }
      record_question_progress: {
        Args: {
          p_chapter_id: string
          p_question_id: string
          p_user_id: string
          p_was_correct: boolean
        }
        Returns: undefined
      }
      update_difficulty_state: {
        Args: {
          p_chapter_id: string
          p_question_difficulty: Database["public"]["Enums"]["question_difficulty"]
          p_user_id: string
          p_was_correct: boolean
        }
        Returns: Database["public"]["Enums"]["question_difficulty"]
      }
      validate_answer: {
        Args: { p_question_id: string; p_selected_answer: number }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      board_type: "board" | "competitive" | "state"
      challenge_status: "open" | "closed" | "lobby" | "playing" | "finished"
      question_difficulty: "easy" | "medium" | "hard"
      question_source: "verified" | "ai"
      question_status: "active" | "flagged" | "retired"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
      board_type: ["board", "competitive", "state"],
      challenge_status: ["open", "closed", "lobby", "playing", "finished"],
      question_difficulty: ["easy", "medium", "hard"],
      question_source: ["verified", "ai"],
      question_status: ["active", "flagged", "retired"],
    },
  },
} as const
