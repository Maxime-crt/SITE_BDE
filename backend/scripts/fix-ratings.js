const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixRatings() {
  try {
    console.log('🔍 Recherche des utilisateurs avec des notes incohérentes...');

    // Trouver les utilisateurs avec rating = 5.0 mais ratingCount = 0
    const usersToFix = await prisma.user.findMany({
      where: {
        rating: 5.0,
        ratingCount: 0
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        rating: true,
        ratingCount: true
      }
    });

    console.log(`📊 ${usersToFix.length} utilisateurs à corriger trouvés`);

    if (usersToFix.length > 0) {
      // Mettre à jour tous ces utilisateurs pour avoir rating = null
      const result = await prisma.user.updateMany({
        where: {
          rating: 5.0,
          ratingCount: 0
        },
        data: {
          rating: null
        }
      });

      console.log(`✅ ${result.count} utilisateurs mis à jour avec rating = null`);

      // Afficher les utilisateurs modifiés
      usersToFix.forEach(user => {
        console.log(`   • ${user.firstName} ${user.lastName} (${user.email})`);
      });
    } else {
      console.log('✅ Aucun utilisateur à corriger trouvé');
    }

  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixRatings();