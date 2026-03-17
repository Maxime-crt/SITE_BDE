/**
 * Notifie les utilisateurs concernés qu'un ride a été mis à jour,
 * pour que le frontend rafraîchisse les données sans polling.
 */
export function notifyRideUpdated(userIds: string[]) {
  // Import lazy pour éviter les dépendances circulaires
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { io } = require('../index');
  for (const userId of userIds) {
    io.to(`user-${userId}`).emit('ride-updated');
  }
}
