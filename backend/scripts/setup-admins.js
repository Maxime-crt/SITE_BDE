const { PrismaClient } = require('@prisma/client');
const { ADMIN_EMAILS } = require('../src/config/admins');

const prisma = new PrismaClient();

async function setupAdmins() {
  try {
    console.log('Setting up admin accounts...');

    for (const email of ADMIN_EMAILS) {
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (user) {
        // Update existing user to admin
        await prisma.user.update({
          where: { email },
          data: { isAdmin: true }
        });
        console.log(`✓ Updated ${email} to admin status`);
      } else {
        console.log(`⚠ User ${email} not found. They need to register first.`);
      }
    }

    console.log('Admin setup completed!');
  } catch (error) {
    console.error('Error setting up admins:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupAdmins();