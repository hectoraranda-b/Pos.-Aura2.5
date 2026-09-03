// jspdf y xlsx se importan de forma diferida (dynamic import) para que no
// engorden el bundle principal — solo se descargan cuando el usuario realmente
// hace clic en exportar.

export interface ExportColumn {
  header: string;
  key: string;
}

export interface ExportOptions {
  title: string;
  subtitle?: string;
  columns: ExportColumn[];
  rows: Record<string, string | number>[];
  filename: string; // sin extensión
  businessName: string;
  logoDataUrl?: string | null;
}

function detectImageFormat(dataUrl: string): 'PNG' | 'JPEG' | null {
  if (dataUrl.startsWith('data:image/png')) return 'PNG';
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return 'JPEG';
  return null; // SVG/WEBP no son compatibles con jsPDF.addImage
}

export async function exportToPdf(opts: ExportOptions) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const marginX = 14;
  let textX = marginX;

  const format = opts.logoDataUrl ? detectImageFormat(opts.logoDataUrl) : null;
  if (opts.logoDataUrl && format) {
    try {
      doc.addImage(opts.logoDataUrl, format, marginX, 8, 24, 13);
      textX = marginX + 30;
    } catch {
      // Si el logo no se puede decodificar, se omite sin interrumpir la exportación
    }
  }

  doc.setFontSize(13);
  doc.setTextColor(20, 23, 31); // ink
  doc.text(opts.businessName, textX, 14);

  doc.setFontSize(10);
  doc.setTextColor(90, 95, 105);
  doc.text(opts.title, textX, 20);

  if (opts.subtitle) {
    doc.setFontSize(8.5);
    doc.setTextColor(130, 135, 145);
    doc.text(opts.subtitle, textX, 25);
  }

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, marginX, 32);

  autoTable(doc, {
    startY: 36,
    head: [opts.columns.map((c) => c.header)],
    body: opts.rows.map((row) => opts.columns.map((c) => String(row[c.key] ?? ''))),
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [15, 157, 107], textColor: 255 }, // brand green
    alternateRowStyles: { fillColor: [246, 248, 250] },
    margin: { left: marginX, right: marginX },
    didDrawPage: () => {
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(7.5);
      doc.setTextColor(170, 170, 170);
      doc.text('by MeraSystems', pageWidth / 2, pageHeight - 6, { align: 'center' });
    },
  });

  doc.save(`${opts.filename}.pdf`);
}

export async function exportToExcel(opts: ExportOptions) {
  const XLSX = await import('xlsx');

  const headerBlock: (string | number)[][] = [
    [opts.businessName],
    [opts.title],
    ...(opts.subtitle ? [[opts.subtitle]] : []),
    [`Generado: ${new Date().toLocaleString('es-MX')}`],
    [],
  ];

  const tableHeader = opts.columns.map((c) => c.header);
  const tableRows = opts.rows.map((row) => opts.columns.map((c) => row[c.key] ?? ''));

  const sheetData: (string | number)[][] = [
    ...headerBlock,
    tableHeader,
    ...tableRows,
    [],
    ['by MeraSystems'],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  worksheet['!cols'] = opts.columns.map(() => ({ wch: 20 }));

  const workbook = XLSX.utils.book_new();
  // Los nombres de hoja en Excel tienen un máximo de 31 caracteres
  XLSX.utils.book_append_sheet(workbook, worksheet, opts.title.slice(0, 31));

  XLSX.writeFile(workbook, `${opts.filename}.xlsx`);
}
