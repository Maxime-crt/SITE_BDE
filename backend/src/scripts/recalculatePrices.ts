/**
 * Script pour recalculer les prix estimés de tous les rides existants
 * Usage: npx ts-node src/scripts/recalculatePrices.ts
 */

import { prisma } from '../utils/prisma';
import { estimateUberPrice } from '../services/uberPricingService';

async function recalculateAllPrices() {
  console.log('🔄 Début du recalcul des prix pour tous les rides...\n');

  try {
    // Récupérer tous les rides actifs
    const rides = await prisma.uberRide.findMany({
      where: {
        status: { in: ['MATCHING', 'CONFIRMED'] }
      },
      include: {
        requests: {
          where: { status: { in: ['PENDING', 'ACCEPTED'] } }
        }
      }
    });

    console.log(`📊 ${rides.length} ride(s) trouvé(s)\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const ride of rides) {
      try {
        if (ride.requests.length === 0) {
          console.log(`⏭️  Ride ${ride.id}: Aucune requête, ignoré`);
          continue;
        }

        // Récupérer toutes les destinations
        const destinations = ride.requests.map(req => ({
          lat: req.destinationLat,
          lng: req.destinationLng
        }));

        // Calculer le prix estimé
        const priceEstimate = estimateUberPrice({
          departurePoint: {
            lat: ride.departureLat,
            lng: ride.departureLng
          },
          destinations,
          numberOfPassengers: ride.currentPassengers
        });

        // Mettre à jour dans la base de données
        await prisma.uberRide.update({
          where: { id: ride.id },
          data: {
            estimatedCost: priceEstimate.perPersonEstimate
          }
        });

        console.log(`✅ Ride ${ride.id}: ${priceEstimate.perPersonEstimate}€/personne (${priceEstimate.totalEstimate}€ total, ${priceEstimate.totalDistance}km, ${ride.currentPassengers} passager(s))`);
        successCount++;
      } catch (error) {
        console.error(`❌ Erreur pour ride ${ride.id}:`, error);
        errorCount++;
      }
    }

    console.log(`\n✨ Recalcul terminé!`);
    console.log(`   ✅ ${successCount} ride(s) mis à jour`);
    console.log(`   ❌ ${errorCount} erreur(s)`);
  } catch (error) {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script
recalculateAllPrices();
