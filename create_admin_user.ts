import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    // Criar organização
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

    // Hash da senha
    const passwordHash = await bcrypt.hash('Admin@123456', 10);
    console.log('Senha hash gerada');

    // Criar usuário admin
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
        mustChangePassword: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log('Usuário criado:', user.email);
    console.log('Senha: Admin@123456');
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
