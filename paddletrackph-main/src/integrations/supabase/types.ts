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
      coach_waitlist: {
        Row: {
          created_at: string | null
          email: string
          id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
      guest_players: {
        Row: {
          city: string | null
          created_at: string | null
          id: string
          name: string
          owner_user_id: string
          skill_level: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          id?: string
          name: string
          owner_user_id: string
          skill_level?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string | null
          id?: string
          name?: string
          owner_user_id?: string
          skill_level?: string | null
        }
        Relationships: []
      }
      lobby_players: {
        Row: {
          created_at: string | null
          guest_player_id: string | null
          has_confirmed: boolean
          id: string
          is_creator: boolean
          lobby_id: string
          player_notes: string | null
          result: string
          team: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          guest_player_id?: string | null
          has_confirmed?: boolean
          id?: string
          is_creator?: boolean
          lobby_id: string
          player_notes?: string | null
          result?: string
          team?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          guest_player_id?: string | null
          has_confirmed?: boolean
          id?: string
          is_creator?: boolean
          lobby_id?: string
          player_notes?: string | null
          result?: string
          team?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lobby_players_guest_player_id_fkey"
            columns: ["guest_player_id"]
            isOneToOne: false
            referencedRelation: "guest_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lobby_players_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "practice_lobbies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lobby_players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          created_at: string
          id: string
          milestone_label: string
          milestone_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          milestone_label: string
          milestone_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          milestone_label?: string
          milestone_type?: string
          user_id?: string
        }
        Relationships: []
      }
      player_favorites: {
        Row: {
          created_at: string | null
          favorite_user_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          favorite_user_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          favorite_user_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_favorites_favorite_user_id_fkey"
            columns: ["favorite_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_lobbies: {
        Row: {
          created_at: string
          created_by_user_id: string
          date: string
          id: string
          is_scheduled: boolean | null
          location_name: string
          match_format: string
          match_tag: string | null
          notes: string | null
          scheduled_datetime: string | null
          score_team_a: string | null
          score_team_b: string | null
          status: string
          winning_team: string | null
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          date: string
          id?: string
          is_scheduled?: boolean | null
          location_name: string
          match_format: string
          match_tag?: string | null
          notes?: string | null
          scheduled_datetime?: string | null
          score_team_a?: string | null
          score_team_b?: string | null
          status?: string
          winning_team?: string | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          date?: string
          id?: string
          is_scheduled?: boolean | null
          location_name?: string
          match_format?: string
          match_tag?: string | null
          notes?: string | null
          scheduled_datetime?: string | null
          score_team_a?: string | null
          score_team_b?: string | null
          status?: string
          winning_team?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practice_lobbies_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          city: string | null
          club_id: string | null
          created_at: string | null
          display_name: string
          id: string
          self_assessed_level: string | null
          skill_level: string | null
          user_role: string | null
          username: string
        }
        Insert: {
          city?: string | null
          club_id?: string | null
          created_at?: string | null
          display_name: string
          id: string
          self_assessed_level?: string | null
          skill_level?: string | null
          user_role?: string | null
          username: string
        }
        Update: {
          city?: string | null
          club_id?: string | null
          created_at?: string | null
          display_name?: string
          id?: string
          self_assessed_level?: string | null
          skill_level?: string | null
          user_role?: string | null
          username?: string
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
