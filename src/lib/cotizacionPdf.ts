import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

const ACCENT: [number, number, number] = [0, 100, 150];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(value);

const loadImage = async (src: string): Promise<HTMLImageElement | null> => {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = src;
    });
    return img.complete && img.naturalWidth > 0 ? img : null;
  } catch {
    return null;
  }
};

/**
 * Genera la cotización COMYMAQ en una sola hoja tamaño carta.
 */
export const buildCotizacionPdf = async (data: CotizacionPdfData): Promise<jsPDF> => {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const colWidth = (contentWidth - 8) / 2;
  const rightColX = margin + colWidth + 8;

  const sectionBar = (title: string, y: number, x = margin, w = contentWidth) => {
    doc.setFillColor(...ACCENT);
    doc.rect(x, y, w, 6.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(title, x + 2, y + 4.6);
    doc.setTextColor(0, 0, 0);
  };

  // Logo
  const logoImg = await loadImage('/comymaq-cotizacion-logo.png');
  if (logoImg) {
    const maxW = 62;
    const maxH = 22;
    const ar = logoImg.naturalWidth / logoImg.naturalHeight;
    let w = maxW;
    let h = w / ar;
    if (h > maxH) {
      h = maxH;
      w = h * ar;
    }
    doc.addImage(logoImg, 'PNG', margin, 8, w, h);
  } else {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ACCENT);
    doc.text('COMYMAQ', margin, 18);
  }

  // Fecha y folio
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  const fechaTexto =
    'Escobedo Nuevo León, ' +
    data.fecha.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(fechaTexto, pageWidth - margin - doc.getTextWidth(fechaTexto), 32);
  if (data.folio) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    const folioText = `Folio: ${data.folio}`;
    doc.text(folioText, pageWidth - margin - doc.getTextWidth(folioText), 37.5);
  }

  // Datos del cliente
  const clientY = 42;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`EMPRESA: ${data.clienteNombre.toUpperCase()}`, margin, clientY);
  doc.setFont('helvetica', 'normal');
  doc.text(`ATENCIÓN: ${(data.atencion || '').toUpperCase()}`, margin, clientY + 5.5);
  doc.text(`TELÉFONO: ${data.telefono || ''}`, margin, clientY + 11);
  doc.text(`correo: ${data.correo || ''}`, margin, clientY + 16.5);

  // Foto del equipo (arriba a la derecha)
  let equipoImg: HTMLImageElement | null = null;
  if (data.equipoFotoUrl) equipoImg = await loadImage(data.equipoFotoUrl);
  const imgBoxW = 46;
  const imgBoxH = 34;
  if (equipoImg) {
    const ar = equipoImg.naturalWidth / equipoImg.naturalHeight;
    let w = imgBoxW;
    let h = w / ar;
    if (h > imgBoxH) {
      h = imgBoxH;
      w = h * ar;
    }
    doc.addImage(
      equipoImg,
      'PNG',
      pageWidth - margin - imgBoxW + (imgBoxW - w) / 2,
      clientY - 4 + (imgBoxH - h) / 2,
      w,
      h,
    );
  }

  // Texto introductorio
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  const introWidth = equipoImg ? contentWidth - imgBoxW - 6 : contentWidth;
  const introText = `Buen día:

Espero que se encuentre bien. Por medio de la presente, me permito presentar la cotización formal correspondiente a la renta del equipo en cuestión.

Cabe señalar que los precios considerados en esta propuesta están calculados con base en una jornada de trabajo de 8 horas diarias, 50 horas semanales y un total de 200 horas mensuales.

Asimismo, reiteramos nuestro compromiso de brindar a su personal una capacitación formal y completa sobre el uso y operación del equipo cotizado. De igual manera, garantizamos que el proceso de entrega y capacitación no se dará por concluido hasta que su personal se encuentre plenamente satisfecho y capacitado respecto al equipo.

Quedo a sus órdenes para cualquier aclaración o información adicional que requiera.`;
  const splitIntro = doc.splitTextToSize(introText, introWidth);
  const introStartY = 68;
  doc.text(splitIntro, margin, introStartY);
  let yPos = Math.max(introStartY + splitIntro.length * 3.9, clientY + imgBoxH) + 5;

  // Equipo cotizado (referencia informativa)
  sectionBar('EQUIPO COTIZADO (REFERENCIA)', yPos);
  yPos += 11;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  const descLines = doc.splitTextToSize(data.equipoDescripcion.toUpperCase(), contentWidth);
  doc.text(descLines.slice(0, 2), margin, yPos);
  yPos += descLines.slice(0, 2).length * 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const marcaModelo = [
    data.equipoMarca ? `MARCA: ${data.equipoMarca.toUpperCase()}` : null,
    data.equipoModelo ? `MODELO: ${data.equipoModelo.toUpperCase()}` : null,
  ]
    .filter(Boolean)
    .join('     ');
  if (marcaModelo) {
    doc.text(marcaModelo, margin, yPos + 1);
    yPos += 5;
  }
  yPos += 4;

  // Tablas a dos columnas: referencia | cotización
  const tipoRentaLabel =
    data.tipoRenta === 'diario' ? 'DIARIO' : data.tipoRenta === 'semanal' ? 'SEMANAL' : 'MENSUAL';

  sectionBar('PRECIOS DE RENTA DE REFERENCIA', yPos, margin, colWidth);
  sectionBar(`COTIZACIÓN - RENTA ${tipoRentaLabel} (${data.dias} días)`, yPos, rightColX, colWidth);
  const tablesY = yPos + 8;

  autoTable(doc, {
    startY: tablesY,
    head: [['PERIODO', 'PRECIO']],
    body: [
      ['MENSUAL (200 hrs)', formatCurrency(data.precioMensual)],
      ['SEMANAL (50 hrs)', formatCurrency(data.precioSemanal)],
      ['DIARIO (8 hrs)', formatCurrency(data.precioDiario)],
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.6 },
    headStyles: { fillColor: ACCENT, fontSize: 8 },
    columnStyles: { 0: { cellWidth: colWidth * 0.55 }, 1: { cellWidth: colWidth * 0.45, halign: 'right' } },
    margin: { left: margin },
    tableWidth: colWidth,
  });
  const leftEnd = (doc as any).lastAutoTable.finalY;

  const pdfBody: string[][] = [
    [`RENTA ${tipoRentaLabel} (${data.dias} días)`, formatCurrency(data.precioTotal)],
    ['ENTREGA Y RECOLECCIÓN', formatCurrency(data.entregaRecoleccion)],
    [`SEGURO (${data.seguroPercent}% DE LA RENTA)`, formatCurrency(data.seguro)],
  ];
  if (data.otrosMonto > 0) {
    pdfBody.push([(data.otrosConcepto || 'OTROS SERVICIOS').toUpperCase(), formatCurrency(data.otrosMonto)]);
  }
  pdfBody.push(['SUBTOTAL (SIN IVA)', formatCurrency(data.subtotal)]);
  pdfBody.push(['TOTAL (CON IVA 16%)', formatCurrency(data.subtotal * 1.16)]);

  autoTable(doc, {
    startY: tablesY,
    body: pdfBody,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.6 },
    columnStyles: { 0: { cellWidth: colWidth * 0.6 }, 1: { cellWidth: colWidth * 0.4, halign: 'right' } },
    margin: { left: rightColX },
    tableWidth: colWidth,
    didParseCell: (hook: any) => {
      if (hook.row.index >= pdfBody.length - 2) hook.cell.styles.fontStyle = 'bold';
    },
  });
  const rightEnd = (doc as any).lastAutoTable.finalY;

  yPos = Math.max(leftEnd, rightEnd) + 6;

  // Incluye | Condiciones de pago
  sectionBar('EN EL PRECIO INCLUYE', yPos, margin, colWidth);
  sectionBar('CONDICIONES DE PAGO', yPos, rightColX, colWidth);
  const infoY = yPos + 11;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('• ATENCIÓN A FALLAS EN GENERAL', margin, infoY);
  doc.text('• ATENCIÓN ESPECIAL A DESHORAS', margin, infoY + 5);

  doc.text('CONTADO', rightColX, infoY);
  doc.text('VIGENCIA DE LA COTIZACIÓN: 15 DÍAS', rightColX, infoY + 5);
  doc.setFont('helvetica', 'bold');
  doc.text('LOS PRECIOS NO INCLUYEN I.V.A.', rightColX, infoY + 10);
  doc.setFont('helvetica', 'normal');
  const tiempo = doc.splitTextToSize(
    'TIEMPO DE ENTREGA: 24 HORAS DESPUÉS DE RECIBIR SU ORDEN DE COMPRA.',
    colWidth,
  );
  doc.text(tiempo, rightColX, infoY + 15);

  yPos = Math.max(infoY + 10, infoY + 15 + tiempo.length * 4) + 8;

  // Cierre y datos del vendedor
  doc.setFontSize(8.5);
  doc.text('Sin más por el momento, esperando vernos favorecidos por su pedido.', margin, yPos);
  yPos += 7;
  doc.setFont('helvetica', 'bold');
  doc.text((data.vendedor || '').toUpperCase(), margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(`correo: ${data.vendedorCorreo || ''}`, margin, yPos + 4.5);
  doc.text('Oficina: 01 81 89 01 07 12', margin, yPos + 9);
  doc.text(`Cel.: ${data.vendedorTelefono || ''}`, margin, yPos + 13.5);

  // Garantiza una sola hoja
  while (doc.getNumberOfPages() > 1) {
    doc.deletePage(doc.getNumberOfPages());
  }

  return doc;
};
