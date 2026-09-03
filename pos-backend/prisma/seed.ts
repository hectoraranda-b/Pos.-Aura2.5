import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Admin123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@pos.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@pos.com',
      passwordHash,
      role: 'ADMIN',
    },
  });

  const category = await prisma.category.upsert({
    where: { name: 'General' },
    update: {},
    create: { name: 'General', description: 'Categoría general de productos' },
  });

  const product = await prisma.product.upsert({
    where: { sku: 'SKU-0001' },
    update: {},
    create: {
      sku: 'SKU-0001',
      name: 'Producto de ejemplo',
      price: 100.0,
      cost: 60.0,
      categoryId: category.id,
    },
  });

  await prisma.inventory.upsert({
    where: { productId: product.id },
    update: {},
    create: { productId: product.id, quantity: 50, minStock: 5 },
  });

  await prisma.storeSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      businessName: 'Mi Tienda',
      ticketMessage: '¡Gracias por su compra!',
      salesGoal: 50000,
    },
  });

  console.log('Seed completado. Usuario admin:', admin.email, '(password: Admin123!)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
