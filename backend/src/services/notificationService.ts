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
 * Cr�er une nouvelle notification pour un utilisateur
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
    console.error('Erreur cr�ation notification:', error);
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
      console.error('Ride non trouv�:', rideId);
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
 * Notifier qu'un nouveau match a �t� trouv�
 */
export async function notifyUberMatch(userId: string, rideId: string, nbPassengers: number) {
  return createNotification({
    userId,
    type: 'UBER_MATCH',
    title: 'Trajet trouv� !',
    message: `${nbPassengers} personne(s) souhaitent partager un Uber avec vous. Discutez pour confirmer.`,
    rideId
  });
}

/**
 * Notifier qu'un trajet est confirm�
 */
export async function notifyUberConfirmed(rideId: string, departureTime: Date) {
  return notifyRideMembers(
    rideId,
    'UBER_CONFIRMED',
    'Trajet confirm�',
    `Votre trajet est confirm� pour le ${departureTime.toLocaleString('fr-FR')}. Pr�parez-vous !`
  );
}

/**
 * Notifier qu'un trajet est annul�
 */
export async function notifyUberCancelled(rideId: string, reason?: string) {
  return notifyRideMembers(
    rideId,
    'UBER_CANCELLED',
    'Trajet annul�',
    reason || 'Votre trajet partag� a �t� annul�.'
  );
}

/**
 * Notifier qu'un passager a quitt� le trajet
 */
export async function notifyPassengerLeft(rideId: string, passengerName: string, excludeUserId: string) {
  return notifyRideMembers(
    rideId,
    'UBER_PASSENGER_LEFT',
    'Passager retir�',
    `${passengerName} a quitt� le trajet. L'itin�raire a �t� mis � jour.`,
    excludeUserId
  );
}

/**
 * Notifier qu'un nouveau message a �t� envoy�
 */
export async function notifyNewMessage(rideId: string, senderName: string, excludeUserId: string) {
  return notifyRideMembers(
    rideId,
    'UBER_MESSAGE',
    'Nouveau message',
    `${senderName} a envoy� un message dans le chat du trajet.`,
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
    message: `Veuillez payer votre part du trajet : ${amount.toFixed(2)}�`,
    rideId
  });
}

/**
 * Notifier qu'un paiement a �t� re�u
 */
export async function notifyPaymentReceived(userId: string, rideId: string, amount: number) {
  return createNotification({
    userId,
    type: 'PAYMENT_RECEIVED',
    title: 'Paiement re�u',
    message: `Vous avez re�u ${amount.toFixed(2)}� sur votre cr�dit Fuelers.`,
    rideId
  });
}

/**
 * Notifier qu'un paiement a �chou�
 */
export async function notifyPaymentFailed(userId: string, rideId: string) {
  return createNotification({
    userId,
    type: 'PAYMENT_FAILED',
    title: 'Paiement �chou�',
    message: 'Le paiement de votre part du trajet a �chou�. Veuillez r�essayer.',
    rideId
  });
}
