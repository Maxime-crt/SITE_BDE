import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';

import authRoutes from './routes/auth';
import eventRoutes from './routes/events';
import rideRoutes from './routes/rides';
import userRoutes from './routes/users';
import messageRoutes from './routes/messages';
import { sessionManager } from './services/sessionManager';
import { runMigrations } from './utils/migrate';

dotenv.config();

const app = express();
const server = createServer(app);

// Configuration CORS pour développement et production
const isDevelopment = process.env.NODE_ENV !== 'production';
const allowedOrigins = isDevelopment
  ? ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176"]
  : [process.env.FRONTEND_URL || "https://your-app.railway.app"];

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
app.use('/api/rides', rideRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);

app.get('/api/health', (req, res) => {
  res.json({ message: 'BDE Covoiturage API is running!' });
});

// Catch-all pour servir le frontend React (SPA)
if (!isDevelopment) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-ride-chat', (rideId) => {
    console.log(`User ${socket.id} joined ride chat: ${rideId}`);
    socket.join(`ride-${rideId}`);
  });

  socket.on('leave-ride-chat', (rideId) => {
    console.log(`User ${socket.id} left ride chat: ${rideId}`);
    socket.leave(`ride-${rideId}`);
  });

  socket.on('ride-message', (data) => {
    console.log('Broadcasting message to ride:', data.rideId);
    // Diffuser le message à tous les autres utilisateurs du chat
    socket.to(`ride-${data.rideId}`).emit('ride-message', data);
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