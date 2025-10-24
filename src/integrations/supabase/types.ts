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
      almacenes: {
        Row: {
          created_at: string
          id: string
          nombre: string
          ubicacion: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          nombre: string
          ubicacion?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string
          ubicacion?: string | null
        }
        Relationships: []
      }
      contratos: {
        Row: {
          cliente: string
          comentarios: string | null
          comprador: string | null
          created_at: string
          dentro_fuera: string | null
          dias_contratado: number | null
          equipo_id: string | null
          fecha_inicio: string | null
          fecha_vencimiento: string | null
          folio_contrato: string
          horas_trabajo: number | null
          id: string
          numero_contrato: string | null
          obra: string | null
          status: string | null
          suma: number | null
          updated_at: string
          vendedor: string | null
        }
        Insert: {
          cliente: string
          comentarios?: string | null
          comprador?: string | null
          created_at?: string
          dentro_fuera?: string | null
          dias_contratado?: number | null
          equipo_id?: string | null
          fecha_inicio?: string | null
          fecha_vencimiento?: string | null
          folio_contrato: string
          horas_trabajo?: number | null
          id?: string
          numero_contrato?: string | null
          obra?: string | null
          status?: string | null
          suma?: number | null
          updated_at?: string
          vendedor?: string | null
        }
        Update: {
          cliente?: string
          comentarios?: string | null
          comprador?: string | null
          created_at?: string
          dentro_fuera?: string | null
          dias_contratado?: number | null
          equipo_id?: string | null
          fecha_inicio?: string | null
          fecha_vencimiento?: string | null
          folio_contrato?: string
          horas_trabajo?: number | null
          id?: string
          numero_contrato?: string | null
          obra?: string | null
          status?: string | null
          suma?: number | null
          updated_at?: string
          vendedor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
        ]
      }
      entradas_salidas: {
        Row: {
          almacen_destino_id: string | null
          almacen_origen_id: string | null
          chofer: string | null
          cliente: string | null
          comentarios: string | null
          created_at: string
          created_by: string | null
          equipo_id: string | null
          fecha: string
          firma_aceptacion_url: string | null
          firma_liberacion_url: string | null
          fotografia_url: string | null
          id: string
          modelo: string | null
          obra: string | null
          serie: string | null
          tipo: string
          transporte: string | null
        }
        Insert: {
          almacen_destino_id?: string | null
          almacen_origen_id?: string | null
          chofer?: string | null
          cliente?: string | null
          comentarios?: string | null
          created_at?: string
          created_by?: string | null
          equipo_id?: string | null
          fecha?: string
          firma_aceptacion_url?: string | null
          firma_liberacion_url?: string | null
          fotografia_url?: string | null
          id?: string
          modelo?: string | null
          obra?: string | null
          serie?: string | null
          tipo: string
          transporte?: string | null
        }
        Update: {
          almacen_destino_id?: string | null
          almacen_origen_id?: string | null
          chofer?: string | null
          cliente?: string | null
          comentarios?: string | null
          created_at?: string
          created_by?: string | null
          equipo_id?: string | null
          fecha?: string
          firma_aceptacion_url?: string | null
          firma_liberacion_url?: string | null
          fotografia_url?: string | null
          id?: string
          modelo?: string | null
          obra?: string | null
          serie?: string | null
          tipo?: string
          transporte?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entradas_salidas_almacen_destino_id_fkey"
            columns: ["almacen_destino_id"]
            isOneToOne: false
            referencedRelation: "almacenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entradas_salidas_almacen_origen_id_fkey"
            columns: ["almacen_origen_id"]
            isOneToOne: false
            referencedRelation: "almacenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entradas_salidas_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
        ]
      }
      equipos: {
        Row: {
          almacen_id: string | null
          anio: number | null
          categoria: string | null
          clase: string | null
          created_at: string
          descripcion: string
          id: string
          marca: string | null
          modelo: string | null
          numero_equipo: string
          serie: string | null
          updated_at: string
        }
        Insert: {
          almacen_id?: string | null
          anio?: number | null
          categoria?: string | null
          clase?: string | null
          created_at?: string
          descripcion: string
          id?: string
          marca?: string | null
          modelo?: string | null
          numero_equipo: string
          serie?: string | null
          updated_at?: string
        }
        Update: {
          almacen_id?: string | null
          anio?: number | null
          categoria?: string | null
          clase?: string | null
          created_at?: string
          descripcion?: string
          id?: string
          marca?: string | null
          modelo?: string | null
          numero_equipo?: string
          serie?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipos_almacen_id_fkey"
            columns: ["almacen_id"]
            isOneToOne: false
            referencedRelation: "almacenes"
            referencedColumns: ["id"]
          },
        ]
      }
      mantenimientos: {
        Row: {
          created_at: string
          descripcion: string
          equipo_id: string
          fecha: string
          firma_aceptacion_url: string | null
          id: string
          orden_servicio: string | null
          proximo_servicio: string | null
          tecnico: string | null
          tipo_servicio: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          descripcion: string
          equipo_id: string
          fecha?: string
          firma_aceptacion_url?: string | null
          id?: string
          orden_servicio?: string | null
          proximo_servicio?: string | null
          tecnico?: string | null
          tipo_servicio: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          descripcion?: string
          equipo_id?: string
          fecha?: string
          firma_aceptacion_url?: string | null
          id?: string
          orden_servicio?: string | null
          proximo_servicio?: string | null
          tecnico?: string | null
          tipo_servicio?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mantenimientos_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          updated_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "usuario"
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
      app_role: ["admin", "usuario"],
    },
  },
} as const
