// Centralized list of app modules used for per-user access control.
// The `key` matches the route path used in Layout navigation.

export interface AppModule {
  key: string;
  label: string;
  category: "operaciones" | "gestion" | "administracion";
}

export const APP_MODULES: AppModule[] = [
  { key: "/", label: "Buscador", category: "operaciones" },
  { key: "/inventario", label: "Inventario", category: "operaciones" },
  
  { key: "/entradas-salidas", label: "Entradas/Salidas", category: "operaciones" },
  { key: "/inspeccion-taller", label: "Inspección Taller", category: "operaciones" },
  { key: "/mantenimiento", label: "Mantenimiento", category: "gestion" },
  { key: "/cotizaciones", label: "Cotizaciones", category: "gestion" },
  { key: "/crm", label: "CRM Seguimiento", category: "gestion" },
  { key: "/configuracion", label: "Configuración", category: "gestion" },
  { key: "/contratos", label: "Control", category: "administracion" },
  { key: "/recolecciones", label: "Recolecciones", category: "administracion" },
  { key: "/clientes", label: "Clientes", category: "administracion" },
  { key: "/almacenes", label: "Almacenes", category: "administracion" },
  { key: "/personal", label: "Personal", category: "administracion" },
  { key: "/equipos-log", label: "Historial Equipos", category: "administracion" },
  { key: "/dashboard", label: "Dashboard", category: "administracion" },
  { key: "/reporte-inventario", label: "Reporte Inventario", category: "administracion" },
  { key: "/admin/usuarios", label: "Usuarios", category: "administracion" },
];
