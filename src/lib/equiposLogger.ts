import { supabase } from '@/integrations/supabase/client';

export type TipoMovimiento = 
  | 'salida' 
  | 'entrada' 
  | 'renta' 
  | 'disponible' 
  | 'apartado' 
  | 'renovacion' 
  | 'recoleccion' 
  | 'taller' 
  | 'mantenimiento' 
  | 'cambio_estado'
  | 'cotizacion'
  | 'contrato';

interface LogEquipoParams {
  equipo_id: string;
  numero_equipo: string;
  tipo_movimiento: TipoMovimiento;
  descripcion?: string;
  estado_anterior?: string | null;
  estado_nuevo?: string | null;
  ubicacion_anterior?: string | null;
  ubicacion_nueva?: string | null;
  cliente?: string | null;
  contrato_folio?: string | null;
  datos_extra?: Record<string, unknown>;
}

/**
 * Logs an equipment movement/change to the equipos_log table
 */
export async function logEquipoMovimiento(params: LogEquipoParams): Promise<void> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    const logData = {
      equipo_id: params.equipo_id,
      numero_equipo: params.numero_equipo,
      tipo_movimiento: params.tipo_movimiento,
      descripcion: params.descripcion || null,
      estado_anterior: params.estado_anterior || null,
      estado_nuevo: params.estado_nuevo || null,
      ubicacion_anterior: params.ubicacion_anterior || null,
      ubicacion_nueva: params.ubicacion_nueva || null,
      cliente: params.cliente || null,
      contrato_folio: params.contrato_folio || null,
      usuario_id: user?.id || null,
      usuario_email: user?.email || null,
      datos_extra: params.datos_extra ? JSON.stringify(params.datos_extra) : null,
    };

    const { error } = await supabase.from('equipos_log').insert([logData]);

    if (error) {
      console.error('Error logging equipment movement:', error);
    }
  } catch (error) {
    console.error('Error in logEquipoMovimiento:', error);
  }
}

/**
 * Log when equipment status changes
 */
export async function logCambioEstado(
  equipo_id: string,
  numero_equipo: string,
  estado_anterior: string | null,
  estado_nuevo: string,
  descripcion?: string
): Promise<void> {
  await logEquipoMovimiento({
    equipo_id,
    numero_equipo,
    tipo_movimiento: 'cambio_estado',
    descripcion: descripcion || `Cambio de estado: ${estado_anterior || 'N/A'} → ${estado_nuevo}`,
    estado_anterior,
    estado_nuevo,
  });
}

/**
 * Log when equipment goes out for rental
 */
export async function logSalidaRenta(
  equipo_id: string,
  numero_equipo: string,
  cliente: string,
  contrato_folio?: string
): Promise<void> {
  await logEquipoMovimiento({
    equipo_id,
    numero_equipo,
    tipo_movimiento: 'salida',
    descripcion: `Salida para renta a ${cliente}`,
    estado_anterior: 'disponible',
    estado_nuevo: 'rentado',
    cliente,
    contrato_folio,
  });
}

/**
 * Log when equipment returns from rental
 */
export async function logEntradaEquipo(
  equipo_id: string,
  numero_equipo: string,
  cliente?: string
): Promise<void> {
  await logEquipoMovimiento({
    equipo_id,
    numero_equipo,
    tipo_movimiento: 'entrada',
    descripcion: cliente ? `Entrada de equipo de ${cliente}` : 'Entrada de equipo',
    estado_anterior: 'rentado',
    estado_nuevo: 'en_inspeccion',
    cliente,
  });
}

/**
 * Log when equipment goes to workshop
 */
export async function logEnvioTaller(
  equipo_id: string,
  numero_equipo: string,
  motivo?: string
): Promise<void> {
  await logEquipoMovimiento({
    equipo_id,
    numero_equipo,
    tipo_movimiento: 'taller',
    descripcion: motivo || 'Enviado a taller para inspección/reparación',
    estado_nuevo: 'en_taller',
  });
}

/**
 * Log when equipment becomes available
 */
export async function logDisponible(
  equipo_id: string,
  numero_equipo: string,
  estado_anterior?: string
): Promise<void> {
  await logEquipoMovimiento({
    equipo_id,
    numero_equipo,
    tipo_movimiento: 'disponible',
    descripcion: 'Equipo marcado como disponible',
    estado_anterior,
    estado_nuevo: 'disponible',
  });
}

/**
 * Log maintenance performed on equipment
 */
export async function logMantenimiento(
  equipo_id: string,
  numero_equipo: string,
  tipo_servicio: string,
  descripcion: string
): Promise<void> {
  await logEquipoMovimiento({
    equipo_id,
    numero_equipo,
    tipo_movimiento: 'mantenimiento',
    descripcion: `${tipo_servicio}: ${descripcion}`,
  });
}

/**
 * Log when a quotation is created for equipment
 */
export async function logCotizacion(
  equipo_id: string,
  numero_equipo: string,
  cliente: string,
  dias_renta: number
): Promise<void> {
  await logEquipoMovimiento({
    equipo_id,
    numero_equipo,
    tipo_movimiento: 'cotizacion',
    descripcion: `Cotización generada para ${cliente} (${dias_renta} días)`,
    cliente,
  });
}

/**
 * Log when a contract is created
 */
export async function logContrato(
  equipo_id: string,
  numero_equipo: string,
  cliente: string,
  contrato_folio: string
): Promise<void> {
  await logEquipoMovimiento({
    equipo_id,
    numero_equipo,
    tipo_movimiento: 'contrato',
    descripcion: `Contrato creado: ${contrato_folio}`,
    estado_nuevo: 'rentado',
    cliente,
    contrato_folio,
  });
}

/**
 * Log contract renewal
 */
export async function logRenovacion(
  equipo_id: string,
  numero_equipo: string,
  cliente: string,
  contrato_folio: string,
  dias_adicionales: number
): Promise<void> {
  await logEquipoMovimiento({
    equipo_id,
    numero_equipo,
    tipo_movimiento: 'renovacion',
    descripcion: `Renovación de contrato ${contrato_folio} (+${dias_adicionales} días)`,
    cliente,
    contrato_folio,
  });
}
