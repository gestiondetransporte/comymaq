import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { formatMty } from "@/lib/timezone";

const TIPO_LABELS: Record<string, string> = {
  entrada_equipo: "ENTRADA DE EQUIPO",
  regreso_renta: "REGRESO DE RENTA",
  salida_renta: "SALIDA A RENTA",
  salida_venta: "SALIDA VENTA",
  salida_taller_externo: "SALIDA A TALLER EXTERNO",
  regreso_proveedor: "REGRESO A PROVEEDOR",
  traspaso: "TRASPASO",
  entrada: "ENTRADA",
  salida: "SALIDA",
};

/** Extrae el subtipo guardado como prefijo "[subtipo]" en comentarios */
function parseComentarios(comentarios: string | null, tipo: string) {
  if (!comentarios) return { subtipo: tipo, texto: "" };
  const match = comentarios.match(/^\[([^\]]+)\]\s*/);
  if (!match) return { subtipo: tipo, texto: comentarios };
  return { subtipo: match[1], texto: comentarios.slice(match[0].length) };
}

export async function generarMovimientoPdf(movimientoId: string) {
  const { data, error } = await supabase
    .from("entradas_salidas")
    .select(
      `*, equipos!equipo_id ( numero_equipo, descripcion, modelo, serie ),
       almacen_origen:almacenes!almacen_origen_id ( nombre ),
       almacen_destino:almacenes!almacen_destino_id ( nombre )`
    )
    .eq("id", movimientoId)
    .maybeSingle();

  if (error || !data) throw error || new Error("Movimiento no encontrado");

  let numeroContrato = "";
  if (data.contrato_id) {
    const { data: c } = await supabase
      .from("contratos")
      .select("numero_contrato, folio_contrato")
      .eq("id", data.contrato_id)
      .maybeSingle();
    numeroContrato = c?.numero_contrato || c?.folio_contrato || "";
  }

  const { subtipo, texto } = parseComentarios(data.comentarios, data.tipo);
  const tipoLabel = TIPO_LABELS[subtipo] || subtipo.replace(/_/g, " ").toUpperCase();
  const esEntrada = data.tipo === "entrada";
  const encabezado = data.tipo === "traspaso"
    ? "TRASPASO DE EQUIPO DE ALMACEN COMYMAQ"
    : esEntrada
      ? "ENTRADA DE EQUIPO A ALMACEN COMYMAQ"
      : "SALIDA DE EQUIPO DE ALMACEN COMYMAQ";

  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const margin = 18;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 22;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(encabezado, margin, y);
  y += 3;
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha: ${data.fecha ? formatMty(data.fecha, "dd/MM/yyyy") : "N/A"}`, margin, y);
  y += 10;

  const rows: [string, string][] = [
    ["TIPO DE MOVIMIENTO", tipoLabel],
    ["NUMERO DE EQUIPO", data.equipos?.numero_equipo || "N/A"],
    ["DESCRIPCION DE EQUIPO", data.equipos?.descripcion || data.modelo || "N/A"],
    ["SERIE", data.serie || data.equipos?.serie || "N/A"],
    ["CHOFER", data.chofer || "N/A"],
    ["TRANSPORTE", data.transporte || "N/A"],
    ["NOMBRE DE CLIENTE", data.cliente || "N/A"],
    ["OBRA", data.obra || "N/A"],
    ["NUMERO DE CONTRATO", numeroContrato || "N/A"],
  ];

  if (data.tipo === "traspaso") {
    rows.push(["ALMACEN ORIGEN", data.almacen_origen?.nombre || "N/A"]);
    rows.push(["ALMACEN DESTINO", data.almacen_destino?.nombre || "N/A"]);
  }
  if (data.odometro != null) rows.push(["ODOMETRO", String(data.odometro)]);
  if (data.lleva_extintor != null) rows.push(["LLEVA EXTINTOR", data.lleva_extintor ? "SI" : "NO"]);
  if (data.tiene_danos) rows.push(["DAÑOS", data.descripcion_danos || "SI"]);
  rows.push(["COMENTARIOS IMPORTANTES", texto || "N/A"]);

  const labelWidth = 62;
  const valueWidth = pageWidth - margin * 2 - labelWidth;

  rows.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`${label} :`, margin, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(String(value).toUpperCase(), valueWidth);
    doc.text(lines, margin + labelWidth, y);
    y += Math.max(lines.length * 5.5, 8);
    if (y > 250) {
      doc.addPage();
      y = 22;
    }
  });

  y += 20;
  if (y > 240) {
    doc.addPage();
    y = 60;
  }
  const colW = (pageWidth - margin * 2) / 2;
  doc.setFontSize(9);
  doc.line(margin, y, margin + colW - 12, y);
  doc.line(margin + colW, y, pageWidth - margin, y);
  doc.text("ENTREGA (COMYMAQ)", margin, y + 5);
  doc.text("RECIBE (CLIENTE / CHOFER)", margin + colW, y + 5);

  const nombre = `${esEntrada ? "ENTRADA" : "SALIDA"}_${data.equipos?.numero_equipo || "EQUIPO"}_${
    data.fecha ? formatMty(data.fecha, "yyyy-MM-dd") : ""
  }.pdf`;
  doc.save(nombre);
}
