import { prisma } from '../utils/prisma';

export type NotificationType =
  | 'UBER_MATCH'
  | 'UBER_CONFIRMED'
  | 'UBER_CANCELLED'
  | 'UBER_PASSENGER_LEFT'
  | 'UBER_MESSAGE'
  | 'PAYMENT_REQUEST'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_FAILED';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  rideId?: string;
}

/**
 * Créer une nouvelle notification pour un utilisateur
 */
export async function createNotification(params: CreateNotificationParams) {
  const { userId, type, title, message, rideId } = params;

  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        rideId
      }
    });

    return notification;
  } catch (error) {
    console.error('Erreur création notification:', error);
    throw error;
  }
}

/**
 * Notifier tous les membres d'un trajet
 */
export async function notifyRideMembers(
  rideId: string,
  type: NotificationType,
  title: string,
  message: string,
  excludeUserId?: string
) {
  try {
    const ride = await prisma.uberRide.findUnique({
      where: { id: rideId },
      include: {
        requests: {
          where: { status: { in: ['PENDING', 'ACCEPTED'] } },
          select: { userId: true }
        }
      }
    });

    if (!ride) {
      console.error('Ride non trouvé:', rideId);
      return;
    }

    const notifications = ride.requests
      .filter(r => r.userId !== excludeUserId)
      .map(r => ({
        userId: r.userId,
        type,
        title,
        message,
        rideId,
        isRead: false
      }));

    if (notifications.length > 0) {
      await prisma.notification.createMany({
        data: notifications
      });
    }

    return notifications.length;
  } catch (error) {
    console.error('Erreur notification membres ride:', error);
    throw error;
  }
}

/**
 * Notifier qu'un nouveau match a été trouvé
 */
export async function notifyUberMatch(userId: string, rideId: string, nbPassengers: number) {
  return createNotification({
    userId,
    type: 'UBER_MATCH',
    title: 'Trajet trouvé !',
    message: `${nbPassengers} personne(s) souhaitent partager un Uber avec vous. Discutez pour confirmer.`,
    rideId
  });
}

/**
 * Notifier qu'un trajet est confirmé
 */
export async function notifyUberConfirmed(rideId: string, departureTime: Date) {
  return notifyRideMembers(
    rideId,
    'UBER_CONFIRMED',
    'Trajet confirmé',
    `Votre trajet est confirmé pour le ${departureTime.toLocaleString('fr-FR')}. Préparez-vous !`
  );
}

/**
 * Notifier qu'un trajet est annulé
 */
export async function notifyUberCancelled(rideId: string, reason?: string) {
  return notifyRideMembers(
    rideId,
    'UBER_CANCELLED',
    'Trajet annulé',
    reason || 'Votre trajet partagé a été annulé.'
  );
}

/**
 * Notifier qu'un passager a quitté le trajet
 */
export async function notifyPassengerLeft(rideId: string, passengerName: string, excludeUserId: string) {
  return notifyRideMembers(
    rideId,
    'UBER_PASSENGER_LEFT',
    'Passager retiré',
    `${passengerName} a quitté le trajet. L'itinéraire a été mis à jour.`,
    excludeUserId
  );
}

/**
 * Notifier qu'un nouveau message a été envoyé
 */
export async function notifyNewMessage(rideId: string, senderName: string, excludeUserId: string) {
  return notifyRideMembers(
    rideId,
    'UBER_MESSAGE',
    'Nouveau message',
    `${senderName} a envoyé un message dans le chat du trajet.`,
    excludeUserId
  );
}

/**
 * Notifier qu'un paiement est requis
 */
export async function notifyPaymentRequest(userId: string, rideId: string, amount: number) {
  return createNotification({
    userId,
    type: 'PAYMENT_REQUEST',
    title: 'Paiement requis',
    message: `Veuillez payer votre part du trajet : ${amount.toFixed(2)}¬`,
    rideId
  });
}

/**
 * Notifier qu'un paiement a été reçu
 */
export async function notifyPaymentReceived(userId: string, rideId: string, amount: number) {
  return createNotification({
    userId,
    type: 'PAYMENT_RECEIVED',
    title: 'Paiement reçu',
    message: `Vous avez reçu ${amount.toFixed(2)}¬ sur votre crédit BDE.`,
    rideId
  });
}

/**
 * Notifier qu'un paiement a échoué
 */
export async function notifyPaymentFailed(userId: string, rideId: string) {
  return createNotification({
    userId,
    type: 'PAYMENT_FAILED',
    title: 'Paiement échoué',
    message: 'Le paiement de votre part du trajet a échoué. Veuillez réessayer.',
    rideId
  });
}
