import { execSync } from 'child_process';
import { prisma } from './prisma';

const ADMIN_EMAILS = [
  'maxime.coriton@ieseg.fr'
];

async function setupAdminUser() {
  try {
    for (const adminEmail of ADMIN_EMAILS) {
      // Vérifier si l'utilisateur admin existe
      const adminUser = await prisma.user.findUnique({
        where: { email: adminEmail }
      });

      if (adminUser) {
        // Mettre à jour pour être sûr qu'il est admin
        await prisma.user.update({
          where: { email: adminEmail },
          data: { isAdmin: true }
        });
        console.log(`✅ Admin rights granted to ${adminEmail}`);
      } else {
        console.log(`⚠️ Admin user ${adminEmail} not found - will be promoted when created`);
      }
    }
  } catch (error) {
    console.error('❌ Failed to setup admin users:', error);
  }
}

export async function runMigrations() {
  try {
    console.log('📊 Setting up database...');

    // Note: En Docker, les migrations sont gérées par docker-entrypoint.sh
    // Ici on ne fait que vérifier la connexion et configurer les admins

    // Tester la connexion DB
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // Définir l'admin principal si il existe
    await setupAdminUser();
    console.log('👑 Admin user configured');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }
}