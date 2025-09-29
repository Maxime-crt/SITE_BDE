import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { prisma } from '../utils/prisma';
import { generateToken } from '../utils/jwt';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Inscription
router.post('/register', [
  body('email').isEmail().normalizeEmail().withMessage('Email valide requis'),
  body('firstName').trim().isLength({ min: 2 }).withMessage('Prénom requis (min 2 caractères)'),
  body('lastName').trim().isLength({ min: 2 }).withMessage('Nom requis (min 2 caractères)'),
  body('phone').isMobilePhone('fr-FR').withMessage('Numéro de téléphone français valide requis'),
  body('password').isLength({ min: 6 }).withMessage('Mot de passe requis (min 6 caractères)')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, firstName, lastName, phone, password } = req.body;

    // Vérifier si email IESEG
    if (!email.endsWith('@ieseg.fr')) {
      return res.status(400).json({ error: 'Email IESEG requis (@ieseg.fr)' });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Un compte existe déjà avec cet email' });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 12);

    // Définir si l'utilisateur est admin
    const isAdmin = email === 'maxime.coriton@ieseg.fr';

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        phone,
        password: hashedPassword,
        isAdmin
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        rating: true,
        isAdmin: true
      }
    });

    const token = generateToken(user.id);

    res.status(201).json({
      message: 'Compte créé avec succès',
      user,
      token
    });
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ error: 'Erreur serveur lors de l\'inscription' });
  }
});

// Connexion
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Mettre à jour le statut de connexion
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isOnline: true,
        lastLoginAt: new Date(),
        lastActivityAt: new Date()
      }
    });

    const token = generateToken(user.id);

    res.json({
      message: 'Connexion réussie',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        rating: user.rating,
        isAdmin: user.isAdmin
      },
      token
    });
  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la connexion' });
  }
});

// Profil utilisateur
router.get('/me', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  // Mettre à jour la dernière activité
  await prisma.user.update({
    where: { id: req.userId! },
    data: { lastActivityAt: new Date() }
  });

  res.json({ user: req.user });
});

// Déconnexion
router.post('/logout', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    // Mettre à jour le statut de connexion
    await prisma.user.update({
      where: { id: req.userId! },
      data: { isOnline: false }
    });

    res.json({ message: 'Déconnexion réussie' });
  } catch (error) {
    console.error('Erreur déconnexion:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la déconnexion' });
  }
});

export default router;