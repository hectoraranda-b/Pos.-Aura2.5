import { api } from './client';

export const backupApi = {
  // Descarga el archivo directamente en el navegador (no es un ApiEnvelope,
  // el backend responde el JSON crudo con Content-Disposition: attachment).
  async downloadExport() {
    const response = await api.get('/backup/export', { responseType: 'blob' });

    const disposition = response.headers['content-disposition'] as string | undefined;
    const filenameMatch = disposition?.match(/filename="?([^"]+)"?/);
    const filename = filenameMatch?.[1] ?? `pos-backup-${Date.now()}.json`;

    const url = URL.createObjectURL(response.data as Blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};
