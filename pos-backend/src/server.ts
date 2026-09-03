import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { startCloudBackupScheduler } from './jobs/cloudBackupScheduler';

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`🚀 Servidor POS corriendo en http://localhost:${env.port} [${env.nodeEnv}]`);
  startCloudBackupScheduler();
});

// Cierre ordenado: cierra conexiones de Prisma y del servidor HTTP
async function shutdown(signal: string) {
  console.log(`\n${signal} recibido. Cerrando servidor...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log('Servidor y conexión a base de datos cerrados correctamente.');
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
