import express from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../utils/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Mise à jour du profil utilisateur
router.put('/profile', authenticateToken, [
  body('firstName').optional().trim().isLength({ min: 2 })
    .withMessage('Le prénom doit contenir au moins 2 caractères'),
  body('lastName').optional().trim().isLength({ min: 2 })
    .withMessage('Le nom doit contenir au moins 2 caractères'),
  body('phone').optional().trim().isLength({ min: 10 })
    .withMessage('Le numéro de téléphone doit contenir au moins 10 caractères'),
  body('gender').optional().isIn(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_SAY'])
    .withMessage('Genre invalide'),
  body('homeAddress').optional().isString().isLength({ min: 5 })
    .withMessage('Adresse invalide'),
  body('homeCity').optional().isString(),
  body('homePostcode').optional().isString(),
  body('homeLatitude').optional().isFloat(),
  body('homeLongitude').optional().isFloat()
], async (req: AuthRequest, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.userId!;
    const { firstName, lastName, phone, gender, homeAddress, homeCity, homePostcode, homeLatitude, homeLongitude } = req.body;

    // Si une adresse est fournie, valider les coordonnées
    if (homeAddress && (!homeLatitude || !homeLongitude)) {
      return res.status(400).json({
        error: 'Les coordonnées GPS sont requises pour l\'adresse'
      });
    }

    // Préparer les données à mettre à jour (seulement les champs fournis)
    const updateData: any = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (gender !== undefined) updateData.gender = gender;
    if (homeAddress !== undefined) updateData.homeAddress = homeAddress;
    if (homeCity !== undefined) updateData.homeCity = homeCity;
    if (homePostcode !== undefined) updateData.homePostcode = homePostcode;
    if (homeLatitude !== undefined) updateData.homeLatitude = homeLatitude;
    if (homeLongitude !== undefined) updateData.homeLongitude = homeLongitude;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        gender: true,
        homeAddress: true,
        homeCity: true,
        homePostcode: true,
        homeLatitude: true,
        homeLongitude: true,
        isAdmin: true,
        emailVerified: true
      }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer le profil complet de l'utilisateur connecté
router.get('/me/profile', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const userId = req.userId!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        gender: true,
        homeAddress: true,
        homeCity: true,
        homePostcode: true,
        homeLatitude: true,
        homeLongitude: true,
        isAdmin: true,
        emailVerified: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json(user);
  } catch (error) {
    console.error('Erreur récupération profil:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer le profil d'un utilisateur
router.get('/:id', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isAdmin: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json(user);
  } catch (error) {
    console.error('Erreur récupération utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
