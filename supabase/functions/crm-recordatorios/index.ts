import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const money = (n: number | null) =>
  `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const diasDesde = (iso: string | null) => {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: config } = await supabase
      .from('crm_recordatorios_config')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (!config || !config.activo) {
      return new Response(JSON.stringify({ ok: true, skipped: 'recordatorios desactivados', creados: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const diasSinContacto: number = config.dias_sin_contacto ?? 5;
    const diasAnticipacion: number = config.dias_anticipacion_accion ?? 5;

    const { data: cots, error } = await supabase
      .from('cotizaciones')
      .select(
        'id, folio_cotizacion, cliente_nombre, atencion, telefono, correo, vendedor, vendedor_correo, vendedor_telefono, equipo_descripcion, total_con_iva, status, created_at, ultimo_acercamiento_fecha',
      )
      .eq('status', 'pendiente')
      .limit(500);

    if (error) throw new Error(error.message);

    // Próximas acciones agendadas en el CRM
    const hoy = new Date();
    const limite = new Date(hoy.getTime() + diasAnticipacion * 86400000);
    const { data: acciones } = await supabase
      .from('crm_seguimientos')
      .select('cotizacion_id, proxima_accion, proxima_accion_fecha')
      .not('proxima_accion_fecha', 'is', null)
      .gte('proxima_accion_fecha', hoy.toISOString().slice(0, 10))
      .lte('proxima_accion_fecha', limite.toISOString().slice(0, 10));

    const accionPorCot = new Map<string, { accion: string | null; fecha: string }>();
    (acciones || []).forEach((a: any) => {
      if (!accionPorCot.has(a.cotizacion_id)) {
        accionPorCot.set(a.cotizacion_id, { accion: a.proxima_accion, fecha: a.proxima_accion_fecha });
      }
    });

    const rows: any[] = [];

    for (const c of cots || []) {
      const dContacto = diasDesde(c.ultimo_acercamiento_fecha);
      const dCreada = diasDesde(c.created_at) ?? 0;
      const folio = c.folio_cotizacion || 'cotización';

      const pendientes: { motivo: string; detalle: string }[] = [];

      if (
        (dContacto !== null && dContacto >= diasSinContacto) ||
        (dContacto === null && dCreada >= diasSinContacto)
      ) {
        pendientes.push({
          motivo: 'sin_contacto',
          detalle: `Sin acercamiento registrado desde hace ${dContacto ?? dCreada} días.`,
        });
      }

      const accion = accionPorCot.get(c.id);
      if (accion) {
        pendientes.push({
          motivo: 'proxima_accion',
          detalle: `Próxima acción "${accion.accion || 'seguimiento'}" programada para el ${accion.fecha}.`,
        });
      }

      for (const p of pendientes) {
        const resumen = `${folio} · ${c.cliente_nombre} · ${c.equipo_descripcion} · ${money(c.total_con_iva)}`;

        if (config.notificar_vendedor) {
          const msgVendedor =
            `Recordatorio COMYMAQ\n${resumen}\n${p.detalle}\n` +
            `Contacto: ${c.atencion || 'N/D'} ${c.telefono || ''} ${c.correo || ''}`.trim();
          if (c.vendedor_correo) {
            rows.push({
              cotizacion_id: c.id,
              motivo: p.motivo,
              destinatario_tipo: 'vendedor',
              destinatario_nombre: c.vendedor,
              destinatario_email: c.vendedor_correo,
              destinatario_telefono: c.vendedor_telefono,
              canal: 'correo',
              asunto: `Seguimiento pendiente: ${folio}`,
              mensaje: msgVendedor,
            });
          }
          if (c.vendedor_telefono) {
            rows.push({
              cotizacion_id: c.id,
              motivo: p.motivo,
              destinatario_tipo: 'vendedor',
              destinatario_nombre: c.vendedor,
              destinatario_email: c.vendedor_correo,
              destinatario_telefono: c.vendedor_telefono,
              canal: 'whatsapp',
              asunto: `Seguimiento pendiente: ${folio}`,
              mensaje: msgVendedor,
            });
          }
        }

        if (config.notificar_cliente) {
          const msgCliente =
            `Hola ${c.atencion || c.cliente_nombre}, le escribimos de COMYMAQ para dar seguimiento a su cotización ${folio} ` +
            `(${c.equipo_descripcion}, ${money(c.total_con_iva)}). ¿Podemos ayudarle con alguna duda para avanzar con la renta?`;
          if (c.correo) {
            rows.push({
              cotizacion_id: c.id,
              motivo: p.motivo,
              destinatario_tipo: 'cliente',
              destinatario_nombre: c.atencion || c.cliente_nombre,
              destinatario_email: c.correo,
              destinatario_telefono: c.telefono,
              canal: 'correo',
              asunto: `Seguimiento a su cotización ${folio}`,
              mensaje: msgCliente,
            });
          }
          if (c.telefono) {
            rows.push({
              cotizacion_id: c.id,
              motivo: p.motivo,
              destinatario_tipo: 'cliente',
              destinatario_nombre: c.atencion || c.cliente_nombre,
              destinatario_email: c.correo,
              destinatario_telefono: c.telefono,
              canal: 'whatsapp',
              asunto: `Seguimiento a su cotización ${folio}`,
              mensaje: msgCliente,
            });
          }
        }
      }
    }

    let creados = 0;
    if (rows.length) {
      const { data: inserted, error: insErr } = await supabase
        .from('crm_recordatorios')
        .upsert(rows, {
          onConflict: 'cotizacion_id,motivo,destinatario_tipo,canal,dia',
          ignoreDuplicates: true,
        })
        .select('id');
      if (insErr) throw new Error(insErr.message);
      creados = inserted?.length || 0;
    }

    return new Response(JSON.stringify({ ok: true, evaluadas: cots?.length || 0, creados }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('crm-recordatorios error:', e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
