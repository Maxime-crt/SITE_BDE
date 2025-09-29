import { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, X, Edit, Trash2, Check, XCircle, Users, ChevronDown, ChevronUp, Reply } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messagesApi, RideMessage } from '../services/messagesApi';
import { ridesApi, RideParticipant } from '../services/ridesApi';
import { socketService } from '../services/socket';
import { toast } from 'react-hot-toast';
import type { User } from '../types';

interface RideChatProps {
  rideId: string;
  isOpen: boolean;
  onClose: () => void;
  user: User;
}

export default function RideChat({ rideId, isOpen, onClose, user }: RideChatProps) {
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [showParticipants, setShowParticipants] = useState(false);
  const [replyingTo, setReplyingTo] = useState<RideMessage | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Récupérer les messages existants
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['ride-messages', rideId],
    queryFn: () => messagesApi.getRideMessages(rideId),
    enabled: isOpen && !!rideId
  });

  // Récupérer les informations du trajet pour avoir les participants
  const { data: rideInfo } = useQuery({
    queryKey: ['ride-info', rideId],
    queryFn: () => ridesApi.getRideDetails(rideId),
    enabled: isOpen && !!rideId
  });

  // Mutation pour envoyer un message
  const sendMessageMutation = useMutation({
    mutationFn: ({ message, replyToId }: { message: string; replyToId?: string }) =>
      messagesApi.sendRideMessage(rideId, message, replyToId),
    onSuccess: (newMessage) => {
      setNewMessage('');
      setReplyingTo(null);
      // Ajouter le message localement
      queryClient.setQueryData(['ride-messages', rideId], (old: RideMessage[]) => {
        return old ? [...old, newMessage] : [newMessage];
      });
      // Envoyer via socket
      socketService.sendRideMessage(rideId, newMessage);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'envoi du message');
    }
  });

  // Mutation pour modifier un message
  const updateMessageMutation = useMutation({
    mutationFn: ({ messageId, message }: { messageId: string; message: string }) =>
      messagesApi.updateMessage(messageId, message),
    onSuccess: (updatedMessage) => {
      setEditingMessageId(null);
      setEditingText('');
      // Mettre à jour le message localement
      queryClient.setQueryData(['ride-messages', rideId], (old: RideMessage[]) => {
        return old ? old.map(msg => msg.id === updatedMessage.id ? updatedMessage : msg) : [];
      });
      // Envoyer via socket
      socketService.sendRideMessage(rideId, { type: 'message-updated', message: updatedMessage });
      toast.success('Message modifié');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erreur lors de la modification');
    }
  });

  // Mutation pour supprimer un message
  const deleteMessageMutation = useMutation({
    mutationFn: (messageId: string) => messagesApi.deleteMessage(messageId),
    onSuccess: (_, messageId) => {
      // Supprimer le message localement
      queryClient.setQueryData(['ride-messages', rideId], (old: RideMessage[]) => {
        return old ? old.filter(msg => msg.id !== messageId) : [];
      });
      // Envoyer via socket
      socketService.sendRideMessage(rideId, { type: 'message-deleted', messageId });
      toast.success('Message supprimé');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression');
    }
  });

  // Empêcher le scroll de la page en arrière-plan quand le chat est ouvert
  useEffect(() => {
    if (isOpen) {
      // Sauvegarder la position de scroll actuelle
      const scrollY = window.scrollY;

      // Désactiver le scroll
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';

      return () => {
        // Restaurer le scroll
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';

        // Restaurer la position de scroll
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Gérer Socket.io
  useEffect(() => {
    if (!isOpen || !rideId) return;

    const socket = socketService.getSocket();
    if (!socket) {
      socketService.init();
      setIsConnected(true);
    }

    // Rejoindre le chat du trajet
    socketService.joinRideChat(rideId);

    // Écouter les nouveaux messages
    const handleNewMessage = (message: RideMessage) => {
      queryClient.setQueryData(['ride-messages', rideId], (old: RideMessage[]) => {
        return old ? [...old, message] : [message];
      });
    };

    const currentSocket = socketService.getSocket();
    if (currentSocket) {
      currentSocket.on('ride-message', handleNewMessage);
    }

    return () => {
      if (currentSocket) {
        currentSocket.off('ride-message', handleNewMessage);
      }
      socketService.leaveRideChat(rideId);
    };
  }, [isOpen, rideId, queryClient]);

  // Auto-scroll vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage) return;

    sendMessageMutation.mutate({
      message: trimmedMessage,
      replyToId: replyingTo?.id
    });
  };

  // Fonction pour initier une réponse à un message
  const handleReply = (message: RideMessage) => {
    setReplyingTo(message);
    setEditingMessageId(null); // Fermer l'édition si ouverte
  };

  // Fonction pour annuler la réponse
  const cancelReply = () => {
    setReplyingTo(null);
  };

  // Fonction pour faire défiler vers un message spécifique
  const scrollToMessage = (messageId: string) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });

      // Effet de mise en évidence
      setHighlightedMessageId(messageId);
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 800); // Retirer la mise en évidence après 800ms
    }
  };

  const handleEditMessage = (message: RideMessage) => {
    setEditingMessageId(message.id);
    setEditingText(message.message);
    setReplyingTo(null); // Fermer la réponse si ouverte
  };

  const handleUpdateMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = editingText.trim();
    if (!trimmedMessage || !editingMessageId) return;

    updateMessageMutation.mutate({ messageId: editingMessageId, message: trimmedMessage });
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText('');
  };

  const handleDeleteMessage = (messageId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) {
      deleteMessageMutation.mutate(messageId);
    }
  };

  // Obtenir la liste de tous les participants
  const getAllParticipants = () => {
    if (!rideInfo) return [];

    const participants = [];
    // Ajouter le créateur
    participants.push({
      id: rideInfo.creator.id,
      firstName: rideInfo.creator.firstName,
      lastName: rideInfo.creator.lastName,
      isCreator: true
    });

    // Ajouter les participants confirmés
    rideInfo.participants?.filter((p: RideParticipant) => p.status === 'CONFIRMED').forEach((participant: RideParticipant) => {
      participants.push({
        id: participant.user.id,
        firstName: participant.user.firstName,
        lastName: participant.user.lastName,
        isCreator: false
      });
    });

    return participants;
  };

  // Insérer un tag dans le message
  const insertTag = (firstName: string, lastName: string) => {
    const tag = `@${firstName} ${lastName} `;
    setNewMessage(prev => prev + tag);
  };

  // Fonction pour mettre en évidence les mentions dans les messages
  const highlightMentions = (text: string) => {
    const mentionRegex = /@(\w+\s+\w+)/g;
    const parts = text.split(mentionRegex);

    return parts.map((part, index) => {
      if (index % 2 === 1) { // C'est une mention
        const mentionedName = part.toLowerCase();
        const currentUserName = `${user.firstName} ${user.lastName}`.toLowerCase();
        const isMentioned = mentionedName === currentUserName;

        return (
          <span
            key={index}
            className={`font-medium px-1 rounded ${
              isMentioned
                ? 'bg-primary/20 text-primary dark:bg-primary/30'
                : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
            }`}
          >
            @{part}
          </span>
        );
      }
      return part;
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-lg shadow-xl w-full max-w-2xl h-[600px] flex flex-col border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-border">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Chat du trajet</h3>
              {isConnected && (
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowParticipants(!showParticipants)}
                className="flex items-center gap-1 px-2 py-1 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50"
                title="Participants du trajet"
              >
                <Users className="h-4 w-4" />
                <span>{getAllParticipants().length}</span>
                {showParticipants ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Liste des participants */}
          {showParticipants && (
            <div className="px-4 pb-3 border-t border-border/50">
              <div className="text-xs font-medium text-muted-foreground mb-2 mt-3">
                Participants ({getAllParticipants().length})
              </div>
              <div className="flex flex-wrap gap-1">
                {getAllParticipants().map((participant) => (
                  <button
                    key={participant.id}
                    onClick={() => insertTag(participant.firstName, participant.lastName)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md transition-colors"
                    title={`Cliquez pour taguer ${participant.firstName} ${participant.lastName}`}
                  >
                    {participant.isCreator && <span className="text-primary">👑</span>}
                    <span>
                      {participant.id === user.id ? 'Vous' : `${participant.firstName} ${participant.lastName}`}
                    </span>
                  </button>
                ))}
              </div>
              <div className="text-xs text-muted-foreground mt-2 opacity-75">
                💡 Cliquez sur un nom pour le taguer dans votre message
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto p-4 space-y-4 chat-scrollbar"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgb(156 163 175) transparent'
          }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Aucun message encore</p>
                <p className="text-sm">Soyez le premier à écrire !</p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                id={`message-${message.id}`}
                key={message.id}
                className={`flex ${message.userId === user?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`${editingMessageId === message.id ? 'max-w-sm lg:max-w-lg' : 'max-w-xs lg:max-w-md'} ${message.userId === user?.id ? 'text-right' : 'text-left'}`}>
                  <div
                    className={`px-4 py-2 rounded-lg transition-all duration-150 ${
                      highlightedMessageId === message.id
                        ? 'ring-4 ring-primary shadow-lg scale-105 bg-primary/20 dark:bg-primary/30'
                        : ''
                    } ${
                      message.userId === user?.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/70 dark:bg-muted text-muted-foreground dark:text-gray-200 border border-border/50'
                    }`}
                  >
                    <div className="text-xs mb-1 opacity-75">
                      {message.userId === user?.id ? 'Vous' : `${message.user.firstName} ${message.user.lastName}`}
                    </div>

                    {editingMessageId === message.id ? (
                      // Mode édition
                      <form onSubmit={handleUpdateMessage} className="space-y-3">
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-background text-foreground border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                          maxLength={1000}
                          rows={3}
                          autoFocus
                          placeholder="Modifiez votre message..."
                        />
                        <div className="space-y-2">
                          <div className={`text-xs ${editingText.length > 900 ? 'text-orange-500 dark:text-orange-400' : editingText.length > 950 ? 'text-red-500 dark:text-red-400' : 'text-muted-foreground dark:text-muted-foreground'}`}>
                            {editingText.length}/1000 caractères
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="px-3 py-1 text-xs bg-muted text-muted-foreground rounded hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-muted"
                            >
                              Annuler
                            </button>
                            <button
                              type="submit"
                              disabled={updateMessageMutation.isPending || !editingText.trim()}
                              className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {updateMessageMutation.isPending ? (
                                <div className="flex items-center gap-1">
                                  <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent"></div>
                                  <span>Sauvegarde...</span>
                                </div>
                              ) : (
                                'Sauvegarder'
                              )}
                            </button>
                          </div>
                        </div>
                      </form>
                    ) : (
                      // Mode affichage normal
                      <div>
                        {/* Affichage de la réponse */}
                        {message.replyTo && (
                          <div
                            className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 border-l-3 border-primary rounded-md text-xs border border-blue-200 dark:border-blue-800/50 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                            onClick={() => scrollToMessage(message.replyTo!.id)}
                            title="Cliquer pour aller au message original"
                          >
                            <div className="font-semibold text-primary dark:text-blue-400">
                              En réponse à {message.replyTo.user.firstName} {message.replyTo.user.lastName}
                            </div>
                            <div className="text-gray-700 dark:text-gray-200 truncate font-medium">
                              {message.replyTo.message}
                            </div>
                          </div>
                        )}
                        <div className="text-sm">{highlightMentions(message.message)}</div>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-1">
                      <div className="text-xs opacity-50">
                        {new Date(message.createdAt).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                        {message.isEdited && <span className="ml-1">(modifié)</span>}
                      </div>

                      {/* Bouton de réponse pour tous les messages */}
                      {editingMessageId !== message.id && (
                        <button
                          onClick={() => handleReply(message)}
                          className="text-xs opacity-50 hover:opacity-100 p-1 rounded hover:bg-muted/50 transition-all"
                          title="Répondre"
                        >
                          <Reply className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Boutons d'action pour ses propres messages */}
                  {message.userId === user?.id && editingMessageId !== message.id && (
                    <div className={`flex gap-1 mt-1 ${message.userId === user?.id ? 'justify-end' : 'justify-start'}`}>
                      <button
                        onClick={() => handleEditMessage(message)}
                        className="p-1 text-muted-foreground hover:text-foreground"
                        title="Modifier"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteMessage(message.id)}
                        className="p-1 text-muted-foreground hover:text-red-600"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-border">
          <div className="space-y-2">
            {/* Affichage de la réponse en cours */}
            {replyingTo && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-primary rounded-md border border-blue-200 dark:border-blue-800/50">
                <div className="flex-1">
                  <div className="text-xs font-semibold text-primary dark:text-blue-400 mb-1">
                    En réponse à {replyingTo.user.firstName} {replyingTo.user.lastName}
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-200 truncate font-medium">
                    {replyingTo.message}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={cancelReply}
                  className="text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  title="Annuler la réponse"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Tapez votre message..."
                className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                maxLength={1000}
                disabled={sendMessageMutation.isPending}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sendMessageMutation.isPending}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendMessageMutation.isPending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            {newMessage.length > 0 && (
              <div className={`text-right text-xs ${newMessage.length > 900 ? 'text-orange-500 dark:text-orange-400' : newMessage.length > 950 ? 'text-red-500 dark:text-red-400' : 'text-muted-foreground dark:text-gray-400'}`}>
                {newMessage.length}/1000 caractères
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}