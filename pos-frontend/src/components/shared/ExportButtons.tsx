import { useState } from 'react';
import { FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { exportToPdf, exportToExcel, type ExportColumn } from '../../lib/exporters';
import { useSettings } from '../../context/SettingsContext';

interface ExportButtonsProps {
  title: string;
  subtitle?: string;
  columns: ExportColumn[];
  rows: Record<string, string | number>[];
  filename: string;
}

export function ExportButtons({ title, subtitle, columns, rows, filename }: ExportButtonsProps) {
  const { settings } = useSettings();
  const businessName = settings?.businessName ?? 'Pos Aura';
  const logoDataUrl = settings?.logoDataUrl ?? null;
  const [loadingFormat, setLoadingFormat] = useState<'pdf' | 'excel' | null>(null);

  const disabled = rows.length === 0 || loadingFormat !== null;

  async function handlePdf() {
    setLoadingFormat('pdf');
    try {
      await exportToPdf({ title, subtitle, columns, rows, filename, businessName, logoDataUrl });
    } finally {
      setLoadingFormat(null);
    }
  }

  async function handleExcel() {
    setLoadingFormat('excel');
    try {
      await exportToExcel({ title, subtitle, columns, rows, filename, businessName, logoDataUrl });
    } finally {
      setLoadingFormat(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handlePdf}
        disabled={disabled}
        title={rows.length === 0 ? 'No hay datos para exportar' : 'Exportar a PDF'}
        className="flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2.5 text-sm font-medium text-ink/60 transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loadingFormat === 'pdf' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        PDF
      </button>
      <button
        type="button"
        onClick={handleExcel}
        disabled={disabled}
        title={rows.length === 0 ? 'No hay datos para exportar' : 'Exportar a Excel'}
        className="flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2.5 text-sm font-medium text-ink/60 transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loadingFormat === 'excel' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="h-4 w-4" />
        )}
        Excel
      </button>
    </div>
  );
}
