import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { prisma } from '../utils/prisma';

export interface AuthRequest extends Request {
  userId?: string;
  user?: any;
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token d\'accès requis' });
  }

  try {
    const decoded = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, isAdmin: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Utilisateur non trouvé' });
    }

    req.userId = decoded.userId;
    req.user = user;

    // Mettre à jour la dernière activité (de façon asynchrone pour ne pas ralentir la requête)
    prisma.user.update({
      where: { id: decoded.userId },
      data: { lastActivityAt: new Date() }
    }).catch(error => {
      console.error('Erreur mise à jour activité:', error);
    });

    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token invalide' });
  }
};