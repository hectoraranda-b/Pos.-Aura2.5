const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 [PRISMA SEED] Limpiando datos de prueba y generando usuario administrador de fábrica...');

  try {
    // Si existen modelos relacionales, limpiar datos de prueba residuales
    if (prisma.saleItem) await prisma.saleItem.deleteMany().catch(() => {});
    if (prisma.sale) await prisma.sale.deleteMany().catch(() => {});
    if (prisma.inventoryMovement) await prisma.inventoryMovement.deleteMany().catch(() => {});
    if (prisma.product) await prisma.product.deleteMany().catch(() => {});
    if (prisma.shift) await prisma.shift.deleteMany().catch(() => {});
  } catch (e) {
    // Ignorar si las tablas aún no están migradas
  }

  const hashedPassword = await bcrypt.hash('admin123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'admin@aura.com' },
    update: { 
      passwordHash: hashedPassword,
      name: 'Administrador General',
      role: 'ADMIN'
    },
    create: {
      email: 'admin@aura.com',
      name: 'Administrador General',
      passwordHash: hashedPassword,
      role: 'ADMIN'
    }
  });

  console.log('✅ [PRISMA SEED] Base de datos limpia. Usuario administrador base configurado:', user.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());