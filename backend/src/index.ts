import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';

import authRoutes from './routes/auth';
import eventRoutes from './routes/events';
import eventRatingRoutes from './routes/eventRatings';
import supportRoutes from './routes/support';
import userRoutes from './routes/users';
import addressRoutes from './routes/address';
import uberRidesRoutes from './routes/uberRides';
import notificationsRoutes from './routes/notifications';
import { sessionManager } from './services/sessionManager';
import { runMigrations } from './utils/migrate';
import { startRideStatusCron } from './services/rideStatusCron';

dotenv.config();

const app = express();
const server = createServer(app);

// Configuration CORS pour développement et production
const isDevelopment = process.env.NODE_ENV !== 'production';
const frontendUrl = (process.env.FRONTEND_URL || "https://www.fuelers.fr").replace(/\/$/, ''); // Retirer le slash final
const wwwVariant = frontendUrl.includes('://www.') ? frontendUrl.replace('://www.', '://') : frontendUrl.replace('://', '://www.');
const allowedOrigins = isDevelopment
  ? ["http://localhost:5000", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176"]
  : [frontendUrl, wwwVariant];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api-adresse.data.gouv.fr", "http://router.project-osrm.org"],
    },
  },
}));

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// Rate limiting global : 100 requetes par minute par IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requetes, veuillez reessayer dans une minute.' },
});
app.use('/api', globalLimiter);

// Rate limiting auth : 10 requetes par minute par IP (protection brute-force)
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives, veuillez reessayer dans une minute.' },
});
app.use('/api/auth', authLimiter);

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/event-ratings', eventRatingRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/address', addressRoutes);
app.use('/api/uber-rides', uberRidesRoutes);
app.use('/api/notifications', notificationsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ message: 'Fuelers Rideshare API is running!' });
});

// Servir les fichiers statiques du frontend en production
if (process.env.NODE_ENV === 'production') {
  const publicPath = path.join(__dirname, '..', 'public');
  app.use(express.static(publicPath));

  // Fallback pour le routing SPA (React Router)
  app.get('*', (req, res) => {
    // Ne pas intercepter les routes API
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(publicPath, 'index.html'));
    }
  });
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Support chat events
  socket.on('join-support-chat', (userId) => {
    console.log(`User ${socket.id} joined support chat: ${userId}`);
    socket.join(`support-${userId}`);
  });

  socket.on('leave-support-chat', (userId) => {
    console.log(`User ${socket.id} left support chat: ${userId}`);
    socket.leave(`support-${userId}`);
  });

  socket.on('support-message', (data) => {
    console.log('Broadcasting message to support:', data.userId);
    socket.to(`support-${data.userId}`).emit('support-message', data);
  });

  // Uber ride events
  socket.on('join-user-notifications', (userId) => {
    console.log(`User ${socket.id} joined notifications: ${userId}`);
    socket.join(`user-${userId}`);
  });

  socket.on('leave-user-notifications', (userId) => {
    console.log(`User ${socket.id} left notifications: ${userId}`);
    socket.leave(`user-${userId}`);
  });

  socket.on('join-uber-ride', (rideId) => {
    console.log(`User ${socket.id} joined uber ride: ${rideId}`);
    socket.join(`uber-ride-${rideId}`);
  });

  socket.on('leave-uber-ride', (rideId) => {
    console.log(`User ${socket.id} left uber ride: ${rideId}`);
    socket.leave(`uber-ride-${rideId}`);
  });

  socket.on('uber-ride-message', (data) => {
    console.log('Broadcasting uber ride message:', data.rideId);
    socket.to(`uber-ride-${data.rideId}`).emit('uber-ride-message', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Exporter io pour l'utiliser dans les services
export { io };

// Fonction de démarrage asynchrone
async function startServer() {
  try {
    // Exécuter les migrations en premier
    await runMigrations();

    // Démarrer le serveur (écouter sur 0.0.0.0 pour Railway)
    const host = '0.0.0.0';
    server.listen(Number(PORT), host, () => {
      console.log(`🚀 Server running on ${host}:${PORT} - Database ready`);

      // Démarrer le gestionnaire de sessions
      sessionManager.start();

      // Démarrer le cron job pour la mise à jour automatique des statuts de trajets
      startRideStatusCron();
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Démarrer le serveur
startServer();

// Gérer l'arrêt propre du serveur
process.on('SIGINT', () => {
  console.log('🛑 Arrêt du serveur...');
  sessionManager.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Arrêt du serveur...');
  sessionManager.stop();
  process.exit(0);
});
