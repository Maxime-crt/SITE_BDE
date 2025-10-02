import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { prisma } from '../utils/prisma';
import { generateToken } from '../utils/jwt';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { generateVerificationCode, sendVerificationEmail } from '../utils/email';

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
    const adminEmails = ['maxime.coriton@ieseg.fr'];
    const isAdmin = adminEmails.includes(email);

    // Exception pour les comptes de test - pas besoin de vérification email
    const testAccounts = ['maxime.coriton@ieseg.fr', 'maxime.coriton2@ieseg.fr'];
    const isTestAccount = testAccounts.includes(email);

    // Générer un code de vérification (sauf pour le compte test)
    const verificationCode = isTestAccount ? null : generateVerificationCode();
    const codeExpiresAt = isTestAccount ? null : new Date(Date.now() + 15 * 60 * 1000);

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        phone,
        password: hashedPassword,
        isAdmin,
        emailVerified: isTestAccount, // Compte test déjà vérifié
        verificationCode,
        codeExpiresAt
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isAdmin: true,
        emailVerified: true
      }
    });

    // Envoyer l'email de vérification (sauf pour le compte test)
    if (!isTestAccount) {
      try {
        await sendVerificationEmail(email, firstName, verificationCode!);
      } catch (emailError) {
        console.error('Erreur lors de l\'envoi de l\'email:', emailError);
        // On continue même si l'email n'a pas pu être envoyé
      }
    }

    res.status(201).json({
      message: isTestAccount
        ? 'Compte créé avec succès.'
        : 'Compte créé avec succès. Veuillez vérifier votre email pour le code de vérification.',
      user,
      requiresVerification: !isTestAccount,
      token: isTestAccount ? generateToken(user.id) : undefined // Connexion automatique pour le compte test
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

    // Vérifier si l'email est vérifié
    if (!user.emailVerified) {
      return res.status(403).json({
        error: 'Veuillez vérifier votre email avant de vous connecter',
        requiresVerification: true,
        email: user.email
      });
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

// Vérification de l'email
router.post('/verify-email', [
  body('email').isEmail().normalizeEmail(),
  body('code').isLength({ min: 6, max: 6 })
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, code } = req.body;

    // Trouver l'utilisateur
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Vérifier si déjà vérifié
    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email déjà vérifié' });
    }

    // Vérifier le code
    if (!user.verificationCode || user.verificationCode !== code) {
      return res.status(400).json({ error: 'Code de vérification invalide' });
    }

    // Vérifier l'expiration
    if (!user.codeExpiresAt || new Date() > user.codeExpiresAt) {
      return res.status(400).json({ error: 'Code de vérification expiré' });
    }

    // Marquer l'email comme vérifié
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationCode: null,
        codeExpiresAt: null
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isAdmin: true,
        emailVerified: true
      }
    });

    // Générer un token pour la connexion automatique
    const token = generateToken(updatedUser.id);

    res.json({
      message: 'Email vérifié avec succès',
      user: updatedUser,
      token
    });
  } catch (error) {
    console.error('Erreur vérification email:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la vérification' });
  }
});

// Renvoyer le code de vérification
router.post('/resend-verification', [
  body('email').isEmail().normalizeEmail()
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    // Trouver l'utilisateur
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Vérifier si déjà vérifié
    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email déjà vérifié' });
    }

    // Générer un nouveau code
    const verificationCode = generateVerificationCode();
    const codeExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Mettre à jour l'utilisateur
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationCode,
        codeExpiresAt
      }
    });

    // Envoyer l'email
    try {
      await sendVerificationEmail(email, user.firstName, verificationCode);
      res.json({ message: 'Code de vérification renvoyé' });
    } catch (emailError) {
      console.error('Erreur lors de l\'envoi de l\'email:', emailError);
      res.status(500).json({ error: 'Impossible d\'envoyer l\'email de vérification' });
    }
  } catch (error) {
    console.error('Erreur renvoi code:', error);
    res.status(500).json({ error: 'Erreur serveur lors du renvoi du code' });
  }
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