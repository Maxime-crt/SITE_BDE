import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { prisma } from '../utils/prisma';
import { generateToken } from '../utils/jwt';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { generateVerificationCode, sendVerificationEmail, sendPasswordResetEmail } from '../utils/email';
import { ADMIN_EMAILS, ALLOWED_EMAILS } from '../config/admins';

const router = express.Router();

// Inscription
router.post('/register', [
  body('email')
    .trim()
    .toLowerCase()
    .matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    .withMessage('Email valide requis'),
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

    let { email, firstName, lastName, phone, password, gender, address, city, postcode, instagram } = req.body;

    console.log('📧 EMAIL REÇU:', JSON.stringify(email));
    console.log('📧 Type:', typeof email);
    console.log('📧 Longueur:', email?.length);
    console.log('📧 Caractères:', email.split('').map((c: string, i: number) => `${i}:${c}(${c.charCodeAt(0)})`));

    // Bloquer les adresses avec caractère "+" (aliasing)
    if (email.includes('+')) {
      return res.status(400).json({ error: 'Caractère "+" non autorisé dans l\'adresse email' });
    }

    console.log('✅ Test @ieseg.fr:', email.endsWith('@ieseg.fr'));

    // Vérifier si email IESEG ou email explicitement autorisé
    const isAllowedEmail = email.endsWith('@ieseg.fr') || ADMIN_EMAILS.includes(email) || ALLOWED_EMAILS.includes(email);
    if (!isAllowedEmail) {
      console.log('❌ REJET EMAIL');
      return res.status(400).json({ error: 'Seules les adresses email IESEG (@ieseg.fr) sont autorisées pour l\'inscription' });
    }

    console.log('✅ EMAIL ACCEPTÉ');

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Un compte existe déjà avec cet email' });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 12);

    // Définir si l'utilisateur est admin
    const isAdmin = ADMIN_EMAILS.includes(email);

    // Générer un code de vérification
    const verificationCode = generateVerificationCode();
    const codeExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        phone,
        password: hashedPassword,
        isAdmin,
        emailVerified: false,
        verificationCode,
        codeExpiresAt,
        ...(gender && { gender }),
        ...(instagram && { instagram: instagram.replace(/^@/, '') }),
        ...(address && { homeAddress: address }),
        ...(city && { homeCity: city }),
        ...(postcode && { homePostcode: postcode }),
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

    // Répondre immédiatement au client
    res.status(201).json({
      message: 'Compte créé avec succès. Veuillez vérifier votre email pour le code de vérification.',
      user,
      requiresVerification: true
    });

    // Envoyer l'email de vérification en arrière-plan (sans bloquer la réponse)
    sendVerificationEmail(email, firstName, verificationCode).catch((emailError) => {
      console.error('Erreur lors de l\'envoi de l\'email:', emailError);
    });
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ error: 'Erreur serveur lors de l\'inscription' });
  }
});

// Connexion
router.post('/login', [
  body('email').trim().toLowerCase().matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).withMessage('Email valide requis'),
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
      return res.status(404).json({ error: 'Aucun compte n\'existe avec cette adresse email' });
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
        isAdmin: user.isAdmin,
        gender: user.gender,
        homeAddress: user.homeAddress,
        homeCity: user.homeCity,
        homePostcode: user.homePostcode,
        homeLatitude: user.homeLatitude,
        homeLongitude: user.homeLongitude,
        instagram: user.instagram,
        charterAcceptedAt: user.charterAcceptedAt
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
  body('email').trim().toLowerCase().matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).withMessage('Email valide requis'),
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
        emailVerified: true,
        charterAcceptedAt: true
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
  body('email').trim().toLowerCase().matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).withMessage('Email valide requis')
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

    // Répondre immédiatement au client
    res.json({ message: 'Code de vérification renvoyé' });

    // Envoyer l'email en arrière-plan
    sendVerificationEmail(email, user.firstName, verificationCode).catch((emailError) => {
      console.error('Erreur lors de l\'envoi de l\'email:', emailError);
    });
  } catch (error) {
    console.error('Erreur renvoi code:', error);
    res.status(500).json({ error: 'Erreur serveur lors du renvoi du code' });
  }
});

// Accepter la charte d'utilisation
router.post('/accept-charter', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: { charterAcceptedAt: new Date() },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isAdmin: true,
        gender: true,
        homeAddress: true,
        homeCity: true,
        homePostcode: true,
        homeLatitude: true,
        homeLongitude: true,
        instagram: true,
        charterAcceptedAt: true
      }
    });

    res.json({ message: 'Charte acceptée avec succès', user });
  } catch (error) {
    console.error('Erreur acceptation charte:', error);
    res.status(500).json({ error: 'Erreur serveur lors de l\'acceptation de la charte' });
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

// POST /api/auth/forgot-password - Demander la réinitialisation du mot de passe
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Email invalide')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const email = req.body.email.toLowerCase().trim();
    console.log('🔑 Forgot-password demandé pour:', email);

    const user = await prisma.user.findUnique({ where: { email } });
    console.log('🔑 Utilisateur trouvé:', user ? `${user.firstName} (${user.email})` : 'NON');

    // Toujours répondre OK pour ne pas révéler si l'email existe
    if (!user) {
      return res.json({ message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' });
    }

    // Générer un token unique
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationCode: token,
        codeExpiresAt: expiresAt
      }
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
    const resetLink = `${frontendUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
    console.log('🔑 Reset link généré:', resetLink);

    // Envoi asynchrone
    console.log('🔑 Envoi email de reset...');
    sendPasswordResetEmail(email, user.firstName, resetLink)
      .then(() => console.log('🔑 Email de reset envoyé avec succès'))
      .catch(err => {
        console.error('🔑 Erreur envoi email reset:', err);
      });

    res.json({ message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' });
  } catch (error) {
    console.error('Erreur forgot-password:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/reset-password - Réinitialiser le mot de passe avec le token
router.post('/reset-password', [
  body('email').isEmail().withMessage('Email invalide'),
  body('token').trim().notEmpty().withMessage('Token requis'),
  body('password').isLength({ min: 6 }).withMessage('Mot de passe minimum 6 caractères')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;
    const email = req.body.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.verificationCode || !user.codeExpiresAt) {
      return res.status(400).json({ error: 'Lien invalide ou expiré' });
    }

    if (user.verificationCode !== token) {
      return res.status(400).json({ error: 'Lien invalide' });
    }

    if (new Date() > user.codeExpiresAt) {
      return res.status(400).json({ error: 'Le lien a expiré. Veuillez en demander un nouveau.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        verificationCode: null,
        codeExpiresAt: null
      }
    });

    res.json({ message: 'Mot de passe réinitialisé avec succès' });
  } catch (error) {
    console.error('Erreur reset-password:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;