import cron from 'node-cron';
import { prisma } from '../utils/prisma';
import { runPeriodicMatching } from './uberMatchingService';
import { notifyRideUpdated } from './rideSocketService';

/**
 * Cron job qui vérifie toutes les minutes les trajets dont l'heure de départ est passée de plus de 30 minutes
 * et met à jour leur statut vers COMPLETED ou CANCELLED
 *
 * Logique:
 * - Les demandes ACCEPTED (groupes formés) deviennent COMPLETED
 * - Les demandes PENDING/MATCHED (pas de groupe) deviennent CANCELLED
 * - Période de grâce de 30 minutes après l'heure de départ prévue
 */
export function startRideStatusCron() {
  // Exécuter toutes les minutes
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      console.log('🕐 [CRON] Checking for expired rides...');

      // Trouver toutes les demandes avec une heure de départ passée de plus de 30 minutes et encore actives
      const expiryThreshold = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes avant maintenant
      const expiredRequests = await prisma.uberRideRequest.findMany({
        where: {
          maxDepartureTime: { lt: expiryThreshold },
          status: { in: ['PENDING', 'ACCEPTED', 'MATCHED'] }
        },
        include: {
          ride: true
        }
      });

      if (expiredRequests.length > 0) {
        console.log(`⏰ [CRON] Found ${expiredRequests.length} expired ride requests, updating...`);

        // Mettre à jour les statuts des demandes
        // Si ACCEPTED (groupe formé) → COMPLETED
        // Si PENDING/MATCHED (pas de groupe) → CANCELLED
        for (const request of expiredRequests) {
          const newStatus = request.status === 'ACCEPTED' ? 'COMPLETED' : 'CANCELLED';

          await prisma.uberRideRequest.update({
            where: { id: request.id },
            data: { status: newStatus }
          });

          console.log(`✅ [CRON] Request ${request.id} updated: ${request.status} → ${newStatus}`);
        }

        // Mettre à jour les statuts des rides correspondants
        const rideIds = [...new Set(expiredRequests.map(r => r.rideId).filter(id => id !== null))];

        for (const rideId of rideIds) {
          // Vérifier si toutes les requêtes du ride sont terminées
          const activeRequestsCount = await prisma.uberRideRequest.count({
            where: {
              rideId: rideId,
              status: { in: ['PENDING', 'ACCEPTED', 'MATCHED'] }
            }
          });

          if (activeRequestsCount === 0) {
            // Toutes les requêtes sont terminées, mettre à jour le ride
            await prisma.uberRide.update({
              where: { id: rideId },
              data: { status: 'COMPLETED' }
            });
            console.log(`✅ [CRON] Ride ${rideId} updated to COMPLETED`);
          }
        }

        // Notifier les utilisateurs concernés via socket
        const affectedUserIds = [...new Set(expiredRequests.map(r => r.userId))];
        notifyRideUpdated(affectedUserIds);

        console.log(`✅ [CRON] Successfully processed ${expiredRequests.length} expired requests`);
      }
    } catch (error) {
      console.error('🔴 [CRON] Error updating expired rides:', error);
    }
  });

  console.log('🔄 [CRON] Ride status cron job started (runs every minute)');

  // Cron job pour le matching périodique toutes les 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      console.log('🔍 [CRON] Running periodic matching...');
      await runPeriodicMatching();
    } catch (error) {
      console.error('🔴 [CRON] Error in periodic matching:', error);
    }
  });

  console.log('🔍 [CRON] Periodic matching cron job started (runs every 5 minutes)');
}
