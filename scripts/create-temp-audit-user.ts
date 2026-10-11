import { auth } from '../src/lib/auth.js';
import { prisma } from '../src/lib/prisma.js';

async function main() {
  try {
    const timestamp = Date.now();
    const email = `audit-${timestamp}@birthhub360.internal`;
    const password = 'AuditTemp123!';
    const orgName = `Audit Org ${timestamp}`;

    const res = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: 'Audit Temp User',
        organizationName: orgName,
      },
    });

    console.log('User created:', JSON.stringify({ email, password, organizationName: orgName }, null, 2));
    console.log('COPY THESE CREDENTIALS FOR THE AUDIT:');
    console.log(`EMAIL: ${email}`);
    console.log(`PASSWORD: ${password}`);
    console.log(`ORGANIZATION: ${orgName}`);
  } catch (err) {
    console.error('Error creating user:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
