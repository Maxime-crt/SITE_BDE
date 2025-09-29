import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private isInitialized = false;

  init(token?: string) {
    if (this.isInitialized && this.socket?.connected) {
      return this.socket;
    }

    // Configuration dynamique de l'URL Socket.io
    const socketUrl = import.meta.env.PROD
      ? window.location.origin  // En production, même domaine que l'app
      : 'http://localhost:3001';  // En développement, serveur local

    this.socket = io(socketUrl, {
      auth: {
        token
      },
      autoConnect: true
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.isInitialized = true;
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.isInitialized = false;
    });

    return this.socket;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  joinRideChat(rideId: string) {
    if (this.socket) {
      this.socket.emit('join-ride-chat', rideId);
    }
  }

  leaveRideChat(rideId: string) {
    if (this.socket) {
      this.socket.emit('leave-ride-chat', rideId);
    }
  }

  sendRideMessage(rideId: string, message: any) {
    if (this.socket) {
      this.socket.emit('ride-message', { rideId, ...message });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isInitialized = false;
    }
  }
}

export const socketService = new SocketService();