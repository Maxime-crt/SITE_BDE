import { prisma } from '../utils/prisma';

const SESSION_TIMEOUT_MINUTES = 15; // 15 minutes d'inactivité

class SessionManager {
  private cleanupInterval: NodeJS.Timeout | null = null;

  // Démarrer le nettoyage automatique des sessions expirées
  start() {
    // Nettoyer toutes les 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000); // 5 minutes

    console.log('SessionManager démarré - nettoyage des sessions expirées toutes les 5 minutes');
  }

  // Arrêter le service
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('SessionManager arrêté');
    }
  }

  // Nettoyer les sessions expirées
  private async cleanupExpiredSessions() {
    try {
      const timeoutDate = new Date();
      timeoutDate.setMinutes(timeoutDate.getMinutes() - SESSION_TIMEOUT_MINUTES);

      const result = await prisma.user.updateMany({
        where: {
          isOnline: true,
          lastActivityAt: {
            lt: timeoutDate
          }
        },
        data: {
          isOnline: false
        }
      });

      if (result.count > 0) {
        console.log(`Sessions expirées nettoyées: ${result.count} utilisateur(s) marqué(s) comme offline`);
      }
    } catch (error) {
      console.error('Erreur lors du nettoyage des sessions expirées:', error);
    }
  }

  // Forcer un utilisateur à être offline (en cas de déconnexion forcée)
  async forceOffline(userId: string) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { isOnline: false }
      });
    } catch (error) {
      console.error('Erreur lors de la déconnexion forcée:', error);
    }
  }

  // Obtenir les statistiques de connexion
  async getConnectionStats() {
    try {
      const onlineUsers = await prisma.user.count({
        where: { isOnline: true }
      });

      const totalUsers = await prisma.user.count();

      const recentActiveUsers = await prisma.user.count({
        where: {
          lastActivityAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24h
          }
        }
      });

      return {
        onlineUsers,
        totalUsers,
        recentActiveUsers
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des stats:', error);
      return {
        onlineUsers: 0,
        totalUsers: 0,
        recentActiveUsers: 0
      };
    }
  }
}

export const sessionManager = new SessionManager();