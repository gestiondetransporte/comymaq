import jsPDF from 'jspdf';
import { formatMty } from '@/lib/timezone';

export interface CotizacionPdfData {
  folio?: string | null;
  fecha: Date;
  clienteNombre: string;
  atencion?: string | null;
  telefono?: string | null;
  correo?: string | null;
  equipoDescripcion: string;
  equipoMarca?: string | null;
  equipoModelo?: string | null;
  equipoFotoUrl?: string | null;
  tipoRenta: string | null;
  dias: number;
  precioMensual: number;
  precioSemanal: number;
  precioDiario: number;
  precioTotal: number;
  entregaRecoleccion: number;
  seguroPercent: number;
  seguro: number;
  otrosConcepto?: string | null;
  otrosMonto: number;
  subtotal: number;
  vendedor?: string | null;
  vendedorCorreo?: string | null;
  vendedorTelefono?: string | null;
}

// Colors belong to the printed COMYMAQ stationery, independently of the app theme.
const INK: [number, number, number] = [76, 143, 219];
const RULE: [number, number, number] = [83, 157, 249];
const BLACK: [number, number, number] = [0, 0, 0];

const formatAmount = (value: number) =>
  new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

const loadImage = async (src: string): Promise<HTMLImageElement | null> => {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve) => {
      const timeout = window.setTimeout(() => resolve(), 8000);
      const finish = () => { window.clearTimeout(timeout); resolve(); };
      img.onload = finish;
      img.onerror = finish;
      img.src = src;
    });
    return img.complete && img.naturalWidth > 0 ? img : null;
  } catch {
    return null;
  }
};

/** COMYMAQ stationery matching the supplied reference, fitted before drawing. */
export const buildCotizacionPdf = async (data: CotizacionPdfData): Promise<jsPDF> => {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const width = pageWidth - margin * 2;
  const [logo, equipment] = await Promise.all([
    loadImage('/comymaq-cotizacion-logo.png'),
    data.equipoFotoUrl ? loadImage(data.equipoFotoUrl) : Promise.resolve(null),
  ]);

  const image = (img: HTMLImageElement, x: number, y: number, w: number, h: number) => {
    const ratio = Math.min(w / img.naturalWidth, h / img.naturalHeight);
    const actualW = img.naturalWidth * ratio;
    const actualH = img.naturalHeight * ratio;
    doc.addImage(img, x + (w - actualW) / 2, y + (h - actualH) / 2, actualW, actualH);
  };
  if (logo) {
    image(logo, margin, 24, width, 30);
  } else {
    doc.setTextColor(...INK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(44);
    doc.text('COMYMAQ', margin, 48);
  }

  const rentLabel = data.tipoRenta === 'diario' ? 'DIARIO' : data.tipoRenta === 'semanal' ? 'SEMANAL' : 'MENSUAL';
  const charges: [string, number][] = [
    [`PRECIO ${rentLabel}`, data.precioTotal],
    ['ENTREGA Y RECOLECCIÓN', data.entregaRecoleccion],
    [`SEGURO DEL EQUIPO (${data.seguroPercent}% DEL COSTO DE LA RENTA)`, data.seguro],
  ];
  if (data.otrosMonto > 0) charges.push([(data.otrosConcepto || 'OTROS SERVICIOS').toUpperCase(), data.otrosMonto]);

  // A measuring pass uses exactly the same wrapping as the drawing pass.
  // Reduce spacing and typography together only when long entered values require it.
  const layout = (scale: number, draw: boolean): number => {
    let y = 59;
    const text = (
      value: string, x: number, top: number, maxWidth: number,
      size = 8, bold = true, color: [number, number, number] = INK,
      italic = false,
    ): number => {
      doc.setFont('helvetica', italic ? 'italic' : bold ? 'bold' : 'normal');
      doc.setFontSize(size * scale);
      doc.setTextColor(...color);
      const lines: string[] = doc.splitTextToSize(value || ' ', maxWidth);
      const leading = size * scale * 0.3528 * 1.3;
      if (draw) doc.text(lines, x, top, { lineHeightFactor: 1.3 });
      return lines.length * leading;
    };
    const bar = (top: number, height = 3.2) => {
      if (draw) { doc.setFillColor(...RULE); doc.rect(margin, top, width, height * scale, 'F'); }
    };
    bar(y);
    y += 9 * scale;
    const clientTop = y;
    const fields: [string, string][] = [
      ['EMPRESA', data.clienteNombre.toUpperCase()],
      ['ATENCIÓN', (data.atencion || '').toUpperCase()],
      ['TELÉFONO', data.telefono || ''],
      ['correo', data.correo || ''],
    ];
    for (const [label, value] of fields) {
      text(label, margin, y, 25, 8, false, INK, true);
      const height = text(value, margin + 27, y, 75);
      y += Math.max(4.2 * scale, height);
    }
    text('Escobedo Nuevo León', margin + 106, clientTop, 34, 6);
    text(formatMty(data.fecha, 'EEEE, d \'de\' MMMM \'de\' yyyy'), margin + 141, clientTop, width - 141, 6);
    // Keep the folio in PDF metadata so the reference stationery stays unchanged.
    y += 7 * scale;
    const greetingHeight = text('Buen día', margin, y, 25);
    const recipientHeight = text((data.atencion || data.clienteNombre).toUpperCase(), margin + 27, y, 64);
    y += Math.max(greetingHeight, recipientHeight);
    const intro = 'Espero usted se encuentre bien en general. A continuación presento mi cotización formal en renta del equipo en cuestión. Cabe señalar que se están presentando precios para trabajar 8 horas diarias, 50 horas a la semana y 200 horas al mes. En esta cotización estamos comprometidos a que su personal que reciba el equipo reciba una capacitación formal del equipo cotizado y que NO nos retiraremos hasta que su personal quede satisfecho con la capacitación.';
    y += text(intro, margin, y, 91);
    y = Math.max(122, y + 5 * scale);
    bar(y, 3.8);
    y += 7.5 * scale;
    y += text('EQUIPO COTIZADO EN ESTA OPORTUNIDAD', margin, y, width, 11);
    y += 4 * scale;
    const equipmentTop = y;
    y += text(data.equipoDescripcion.toUpperCase(), margin, y, 100);
    if (data.equipoMarca) y += text(`MARCA ${data.equipoMarca.toUpperCase()}`, margin, y, 100);
    if (data.equipoModelo) y += text(`MODELO ${data.equipoModelo.toUpperCase()}`, margin, y, 100);
    y += 6 * scale;
    y += text('PRECIOS DE RENTA MENSUAL, SEMANA Y POR DÍA', margin, y, width, 11);
    y += 4 * scale;
    for (const [label, amount] of charges) {
      const labelHeight = text(label, margin, y, 52);
      text('$', margin + 53, y, 5);
      // Measure amounts as well: large totals never collide with the label or image.
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8 * scale);
      const amountLines: string[] = doc.splitTextToSize(formatAmount(amount), 29);
      if (draw) doc.text(amountLines, margin + 82, y, { align: 'right', lineHeightFactor: 1.3 });
      y += Math.max(labelHeight, amountLines.length * 8 * scale * 0.3528 * 1.3);
    }
    const equipmentHeight = 47 * scale;
    if (draw && equipment) image(equipment, margin + 101, equipmentTop - 2 * scale, width - 110, equipmentHeight);
    y = Math.max(y + 3 * scale, equipment ? equipmentTop + equipmentHeight : y);
    bar(y, 3.8);
    y += 7.5 * scale;
    y += text('EN EL PRECIO INCLUYE', margin, y, width, 11);
    y += text('ATENCIÓN A FALLAS EN GENERAL', margin, y, width);
    y += text('ATENCIÓN ESPECIAL A DESHORAS', margin, y, width);
    y += 5 * scale;
    y += text('CONDICIONES DE PAGO, CONTADO', margin, y, width);
    y += text('VIGENCIA DE LA COTIZACIÓN: 15 DÍAS', margin, y, width);
    y += text('LOS PRECIOS NO INCLUYEN I.V.A.', margin, y, width);
    y += text('TIEMPO DE ENTREGA 24 HORAS DESPUÉS DE RECIBIR SU ORDEN DE COMPRA', margin, y, width);
    y += 5 * scale;
    y += text('Sin más por el momento, esperando vernos favorecidos por su pedido.', margin, y, width);
    y += 2 * scale;
    bar(y);
    y += 10 * scale;
    y += text((data.vendedor || '').toUpperCase(), margin, y, width, 8, true, BLACK);
    y += text(data.vendedorCorreo || '', margin, y, width, 8, true, BLACK);
    y += text('Oficina 01 81 89 01 07 12', margin, y, width, 8, true, BLACK);
    y += text(`Cel. ${data.vendedorTelefono || ''}`, margin, y, width, 8, true, BLACK);
    return y;
  };

  let scale = 1;
  while (layout(scale, false) > pageHeight - 18 && scale > 0.6) scale = Math.max(0.6, scale - 0.025);
  if (layout(scale, false) > pageHeight - 18) {
    throw new Error('El contenido de la cotización excede una hoja carta. Reduce la longitud de los datos para generar el PDF sin recortes.');
  }
  layout(scale, true);
  doc.setProperties({
    title: `Cotización COMYMAQ${data.folio ? ` - ${data.folio}` : ''}`,
    subject: `Renta ${rentLabel.toLowerCase()} - ${data.dias} días - ${data.clienteNombre}`,
    author: data.vendedor || 'COMYMAQ',
    creator: 'COMYMAQ',
  });
  return doc;
};
