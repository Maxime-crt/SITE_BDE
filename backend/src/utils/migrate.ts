import { execSync } from 'child_process';
import { prisma } from './prisma';

export async function runMigrations() {
  try {
    console.log('📊 Setting up database...');

    // En production, utiliser db push pour créer la DB/tables
    if (process.env.NODE_ENV === 'production') {
      console.log('🔄 Running Prisma db push...');
      execSync('npx prisma db push --accept-data-loss', {
        stdio: 'inherit',
        cwd: process.cwd()
      });
    }

    // Tester la connexion DB
    await prisma.$connect();
    console.log('✅ Database connected successfully');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }
}