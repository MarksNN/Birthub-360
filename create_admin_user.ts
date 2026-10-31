import bcrypt from 'bcrypt';
import { prisma } from './src/lib/prisma.js';

async function createAdminUser() {
  const initialPassword = process.env.ADMIN_INITIAL_PASSWORD;
  if (!initialPassword) {
    throw new Error('Defina ADMIN_INITIAL_PASSWORD no ambiente antes de executar este script.');
  }

  try {
    const org = await prisma.organization.upsert({
      where: { id: 'org_admin' },
      update: {},
      create: {
        id: 'org_admin',
        name: 'Birth Hub 360 Admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log('Organização criada:', org.id);

    const passwordHash = await bcrypt.hash(initialPassword, 10);

    const user = await prisma.user.upsert({
      where: { email: 'marcelinmark@gmail.com' },
      update: {},
      create: {
        id: 'user_admin_001',
        name: 'Marcelin Admin',
        email: 'marcelinmark@gmail.com',
        passwordHash,
        organizationId: 'org_admin',
        emailVerified: true,
        role: 'ADMIN',
        mustChangePassword: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log('Usuário criado:', user.email);
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

void createAdminUser();
