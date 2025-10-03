import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';

import authRoutes from './routes/auth';
import eventRoutes from './routes/events';
import ticketRoutes from './routes/tickets';
import eventRatingRoutes from './routes/eventRatings';
import supportRoutes from './routes/support';
import userRoutes from './routes/users';
import addressRoutes from './routes/address';
import { sessionManager } from './services/sessionManager';
import { runMigrations } from './utils/migrate';

dotenv.config();

const app = express();
const server = createServer(app);

// Configuration CORS pour développement et production
const isDevelopment = process.env.NODE_ENV !== 'production';
const allowedOrigins = isDevelopment
  ? ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176"]
  : [process.env.FRONTEND_URL || "https://bde-ieseg.onrender.com"];

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
      connectSrc: ["'self'", "https://api-adresse.data.gouv.fr"],
    },
  },
}));

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// Servir les fichiers statiques du frontend en production
if (!isDevelopment) {
  app.use(express.static(path.join(__dirname, '../public')));
}

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/event-ratings', eventRatingRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/address', addressRoutes);

app.get('/api/health', (req, res) => {
  res.json({ message: 'BDE Billetterie API is running!' });
});

// Catch-all pour servir le frontend React (SPA)
if (!isDevelopment) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

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
    // Diffuser le message à tous les autres utilisateurs du chat (admin et utilisateur)
    socket.to(`support-${data.userId}`).emit('support-message', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Fonction de démarrage asynchrone
async function startServer() {
  try {
    // Exécuter les migrations en premier
    await runMigrations();

    // Démarrer le serveur
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} - Database ready`);

      // Démarrer le gestionnaire de sessions
      sessionManager.start();
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