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
      clientes: {
        Row: {
          celular: string | null
          correo_electronico: string | null
          created_at: string
          direccion: string | null
          id: string
          nombre: string
          persona_contacto: string | null
          razon_social: string | null
          rfc: string | null
          telefono: string | null
          tipo: string | null
          updated_at: string
          vendedor: string | null
        }
        Insert: {
          celular?: string | null
          correo_electronico?: string | null
          created_at?: string
          direccion?: string | null
          id?: string
          nombre: string
          persona_contacto?: string | null
          razon_social?: string | null
          rfc?: string | null
          telefono?: string | null
          tipo?: string | null
          updated_at?: string
          vendedor?: string | null
        }
        Update: {
          celular?: string | null
          correo_electronico?: string | null
          created_at?: string
          direccion?: string | null
          id?: string
          nombre?: string
          persona_contacto?: string | null
          razon_social?: string | null
          rfc?: string | null
          telefono?: string | null
          tipo?: string | null
          updated_at?: string
          vendedor?: string | null
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
          direccion: string | null
          equipo_id: string | null
          estado_ubicacion: string | null
          fecha_inicio: string | null
          fecha_vencimiento: string | null
          folio_contrato: string
          horas_trabajo: number | null
          id: string
          municipio: string | null
          numero_contrato: string | null
          obra: string | null
          status: string | null
          suma: number | null
          ubicacion_gps: string | null
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
          direccion?: string | null
          equipo_id?: string | null
          estado_ubicacion?: string | null
          fecha_inicio?: string | null
          fecha_vencimiento?: string | null
          folio_contrato: string
          horas_trabajo?: number | null
          id?: string
          municipio?: string | null
          numero_contrato?: string | null
          obra?: string | null
          status?: string | null
          suma?: number | null
          ubicacion_gps?: string | null
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
          direccion?: string | null
          equipo_id?: string | null
          estado_ubicacion?: string | null
          fecha_inicio?: string | null
          fecha_vencimiento?: string | null
          folio_contrato?: string
          horas_trabajo?: number | null
          id?: string
          municipio?: string | null
          numero_contrato?: string | null
          obra?: string | null
          status?: string | null
          suma?: number | null
          ubicacion_gps?: string | null
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
      cotizaciones: {
        Row: {
          atencion: string | null
          cliente_id: string | null
          cliente_nombre: string
          contrato_id: string | null
          correo: string | null
          created_at: string
          created_by: string | null
          dias_renta: number
          direccion: string | null
          entrega_recoleccion: number | null
          equipo_descripcion: string
          equipo_id: string | null
          equipo_marca: string | null
          equipo_modelo: string | null
          es_prospecto: boolean | null
          estado_ubicacion: string | null
          id: string
          municipio: string | null
          otros_concepto: string | null
          otros_monto: number | null
          precio_base: number
          precio_total: number | null
          seguro: number | null
          seguro_percent: number | null
          status: string | null
          subtotal: number
          telefono: string | null
          tipo_renta: string | null
          total_con_iva: number
          ubicacion_gps: string | null
          vendedor: string | null
          vendedor_correo: string | null
          vendedor_telefono: string | null
        }
        Insert: {
          atencion?: string | null
          cliente_id?: string | null
          cliente_nombre: string
          contrato_id?: string | null
          correo?: string | null
          created_at?: string
          created_by?: string | null
          dias_renta: number
          direccion?: string | null
          entrega_recoleccion?: number | null
          equipo_descripcion: string
          equipo_id?: string | null
          equipo_marca?: string | null
          equipo_modelo?: string | null
          es_prospecto?: boolean | null
          estado_ubicacion?: string | null
          id?: string
          municipio?: string | null
          otros_concepto?: string | null
          otros_monto?: number | null
          precio_base: number
          precio_total?: number | null
          seguro?: number | null
          seguro_percent?: number | null
          status?: string | null
          subtotal: number
          telefono?: string | null
          tipo_renta?: string | null
          total_con_iva: number
          ubicacion_gps?: string | null
          vendedor?: string | null
          vendedor_correo?: string | null
          vendedor_telefono?: string | null
        }
        Update: {
          atencion?: string | null
          cliente_id?: string | null
          cliente_nombre?: string
          contrato_id?: string | null
          correo?: string | null
          created_at?: string
          created_by?: string | null
          dias_renta?: number
          direccion?: string | null
          entrega_recoleccion?: number | null
          equipo_descripcion?: string
          equipo_id?: string | null
          equipo_marca?: string | null
          equipo_modelo?: string | null
          es_prospecto?: boolean | null
          estado_ubicacion?: string | null
          id?: string
          municipio?: string | null
          otros_concepto?: string | null
          otros_monto?: number | null
          precio_base?: number
          precio_total?: number | null
          seguro?: number | null
          seguro_percent?: number | null
          status?: string | null
          subtotal?: number
          telefono?: string | null
          tipo_renta?: string | null
          total_con_iva?: number
          ubicacion_gps?: string | null
          vendedor?: string | null
          vendedor_correo?: string | null
          vendedor_telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cotizaciones_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_equipo_id_fkey"
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
          contrato_id: string | null
          created_at: string
          created_by: string | null
          descripcion_danos: string | null
          equipo_id: string | null
          fecha: string
          firma_aceptacion_url: string | null
          firma_liberacion_url: string | null
          foto_calca_url: string | null
          foto_cargador_url: string | null
          foto_extintor_url: string | null
          foto_odometro_url: string | null
          foto_tablero_url: string | null
          fotografia_url: string | null
          fotografia_url_2: string | null
          fotografia_url_3: string | null
          id: string
          modelo: string | null
          obra: string | null
          serie: string | null
          tiene_danos: boolean | null
          tipo: string
          transporte: string | null
        }
        Insert: {
          almacen_destino_id?: string | null
          almacen_origen_id?: string | null
          chofer?: string | null
          cliente?: string | null
          comentarios?: string | null
          contrato_id?: string | null
          created_at?: string
          created_by?: string | null
          descripcion_danos?: string | null
          equipo_id?: string | null
          fecha?: string
          firma_aceptacion_url?: string | null
          firma_liberacion_url?: string | null
          foto_calca_url?: string | null
          foto_cargador_url?: string | null
          foto_extintor_url?: string | null
          foto_odometro_url?: string | null
          foto_tablero_url?: string | null
          fotografia_url?: string | null
          fotografia_url_2?: string | null
          fotografia_url_3?: string | null
          id?: string
          modelo?: string | null
          obra?: string | null
          serie?: string | null
          tiene_danos?: boolean | null
          tipo: string
          transporte?: string | null
        }
        Update: {
          almacen_destino_id?: string | null
          almacen_origen_id?: string | null
          chofer?: string | null
          cliente?: string | null
          comentarios?: string | null
          contrato_id?: string | null
          created_at?: string
          created_by?: string | null
          descripcion_danos?: string | null
          equipo_id?: string | null
          fecha?: string
          firma_aceptacion_url?: string | null
          firma_liberacion_url?: string | null
          foto_calca_url?: string | null
          foto_cargador_url?: string | null
          foto_extintor_url?: string | null
          foto_odometro_url?: string | null
          foto_tablero_url?: string | null
          fotografia_url?: string | null
          fotografia_url_2?: string | null
          fotografia_url_3?: string | null
          id?: string
          modelo?: string | null
          obra?: string | null
          serie?: string | null
          tiene_danos?: boolean | null
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
            foreignKeyName: "entradas_salidas_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
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
      entradas_salidas_archivos: {
        Row: {
          archivo_url: string
          created_at: string
          entrada_salida_id: string
          id: string
          nombre_archivo: string | null
          tipo_archivo: string
        }
        Insert: {
          archivo_url: string
          created_at?: string
          entrada_salida_id: string
          id?: string
          nombre_archivo?: string | null
          tipo_archivo: string
        }
        Update: {
          archivo_url?: string
          created_at?: string
          entrada_salida_id?: string
          id?: string
          nombre_archivo?: string | null
          tipo_archivo?: string
        }
        Relationships: []
      }
      equipos: {
        Row: {
          almacen_id: string | null
          anio: number | null
          asegurado: string | null
          categoria: string | null
          clase: string | null
          codigo_qr: string | null
          costo_proveedor_mxn: number | null
          costo_proveedor_usd: number | null
          created_at: string
          descripcion: string
          estado: string | null
          folio: number
          ganancia: number | null
          id: string
          marca: string | null
          modelo: string | null
          numero_equipo: string
          precio_lista: number | null
          precio_real_cliente: number | null
          proveedor: string | null
          serie: string | null
          tipo: string | null
          tipo_negocio: string | null
          ubicacion_actual: string | null
          updated_at: string
        }
        Insert: {
          almacen_id?: string | null
          anio?: number | null
          asegurado?: string | null
          categoria?: string | null
          clase?: string | null
          codigo_qr?: string | null
          costo_proveedor_mxn?: number | null
          costo_proveedor_usd?: number | null
          created_at?: string
          descripcion: string
          estado?: string | null
          folio?: number
          ganancia?: number | null
          id?: string
          marca?: string | null
          modelo?: string | null
          numero_equipo: string
          precio_lista?: number | null
          precio_real_cliente?: number | null
          proveedor?: string | null
          serie?: string | null
          tipo?: string | null
          tipo_negocio?: string | null
          ubicacion_actual?: string | null
          updated_at?: string
        }
        Update: {
          almacen_id?: string | null
          anio?: number | null
          asegurado?: string | null
          categoria?: string | null
          clase?: string | null
          codigo_qr?: string | null
          costo_proveedor_mxn?: number | null
          costo_proveedor_usd?: number | null
          created_at?: string
          descripcion?: string
          estado?: string | null
          folio?: number
          ganancia?: number | null
          id?: string
          marca?: string | null
          modelo?: string | null
          numero_equipo?: string
          precio_lista?: number | null
          precio_real_cliente?: number | null
          proveedor?: string | null
          serie?: string | null
          tipo?: string | null
          tipo_negocio?: string | null
          ubicacion_actual?: string | null
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
      equipos_archivos: {
        Row: {
          archivo_url: string
          created_at: string
          descripcion: string | null
          equipo_id: string
          id: string
          nombre_archivo: string | null
          tipo_archivo: string
        }
        Insert: {
          archivo_url: string
          created_at?: string
          descripcion?: string | null
          equipo_id: string
          id?: string
          nombre_archivo?: string | null
          tipo_archivo: string
        }
        Update: {
          archivo_url?: string
          created_at?: string
          descripcion?: string | null
          equipo_id?: string
          id?: string
          nombre_archivo?: string | null
          tipo_archivo?: string
        }
        Relationships: []
      }
      equipos_log: {
        Row: {
          cliente: string | null
          contrato_folio: string | null
          created_at: string
          datos_extra: Json | null
          descripcion: string | null
          equipo_id: string
          estado_anterior: string | null
          estado_nuevo: string | null
          id: string
          numero_equipo: string
          tipo_movimiento: string
          ubicacion_anterior: string | null
          ubicacion_nueva: string | null
          usuario_email: string | null
          usuario_id: string | null
        }
        Insert: {
          cliente?: string | null
          contrato_folio?: string | null
          created_at?: string
          datos_extra?: Json | null
          descripcion?: string | null
          equipo_id: string
          estado_anterior?: string | null
          estado_nuevo?: string | null
          id?: string
          numero_equipo: string
          tipo_movimiento: string
          ubicacion_anterior?: string | null
          ubicacion_nueva?: string | null
          usuario_email?: string | null
          usuario_id?: string | null
        }
        Update: {
          cliente?: string | null
          contrato_folio?: string | null
          created_at?: string
          datos_extra?: Json | null
          descripcion?: string | null
          equipo_id?: string
          estado_anterior?: string | null
          estado_nuevo?: string | null
          id?: string
          numero_equipo?: string
          tipo_movimiento?: string
          ubicacion_anterior?: string | null
          ubicacion_nueva?: string | null
          usuario_email?: string | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      mantenimientos: {
        Row: {
          created_at: string
          descripcion: string
          equipo_id: string
          fecha: string
          firma_aceptacion_url: string | null
          id: string
          id_interno: string | null
          orden_servicio: string | null
          proximo_servicio_horas: number | null
          snapshot_equipo: Json | null
          tecnico: string | null
          tipo_negocio: string | null
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
          id_interno?: string | null
          orden_servicio?: string | null
          proximo_servicio_horas?: number | null
          snapshot_equipo?: Json | null
          tecnico?: string | null
          tipo_negocio?: string | null
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
          id_interno?: string | null
          orden_servicio?: string | null
          proximo_servicio_horas?: number | null
          snapshot_equipo?: Json | null
          tecnico?: string | null
          tipo_negocio?: string | null
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
      mantenimientos_archivos: {
        Row: {
          archivo_url: string
          created_at: string
          id: string
          mantenimiento_id: string
          nombre_archivo: string | null
          tipo_archivo: string
        }
        Insert: {
          archivo_url: string
          created_at?: string
          id?: string
          mantenimiento_id: string
          nombre_archivo?: string | null
          tipo_archivo: string
        }
        Update: {
          archivo_url?: string
          created_at?: string
          id?: string
          mantenimiento_id?: string
          nombre_archivo?: string | null
          tipo_archivo?: string
        }
        Relationships: []
      }
      modelos_configuracion: {
        Row: {
          created_at: string
          foto_url: string | null
          id: string
          modelo: string
          precio_lista: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          foto_url?: string | null
          id?: string
          modelo: string
          precio_lista?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          foto_url?: string | null
          id?: string
          modelo?: string
          precio_lista?: number | null
          updated_at?: string
        }
        Relationships: []
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
      admin_create_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      generate_contrato_folio: { Args: never; Returns: string }
      generate_mantenimiento_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "usuario"
        | "moderator"
        | "user"
        | "vendedor"
        | "almacen"
        | "tecnico"
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
      app_role: [
        "admin",
        "usuario",
        "moderator",
        "user",
        "vendedor",
        "almacen",
        "tecnico",
      ],
    },
  },
} as const
