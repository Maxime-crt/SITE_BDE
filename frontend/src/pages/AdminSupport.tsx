import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, User, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { adminApi } from '../services/api';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

interface SupportMessage {
  id: string;
  userId: string;
  message: string;
  isEdited: boolean;
  isFromBDE: boolean;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    firstName: string;
    lastName: string;
    email?: string;
    isAdmin: boolean;
  };
}

interface UserWithMessages {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isOnline: boolean;
  supportMessages: SupportMessage[];
}

export default function AdminSupport() {
  const [conversations, setConversations] = useState<UserWithMessages[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserWithMessages | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadUserMessages(selectedUser.id).then(() => {
        // Recharger les conversations pour mettre à jour le badge "Nouveau"
        loadConversations();
      });
    }
  }, [selectedUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getAllConversations();
      setConversations(data);
    } catch (error: any) {
      console.error('Erreur lors du chargement des conversations:', error);
      toast.error('Erreur lors du chargement des conversations');
    } finally {
      setLoading(false);
    }
  };

  const loadUserMessages = async (userId: string) => {
    try {
      const data = await adminApi.getUserMessages(userId);
      setMessages(data);
    } catch (error: any) {
      console.error('Erreur lors du chargement des messages:', error);
      toast.error('Erreur lors du chargement des messages');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    try {
      setSending(true);
      await adminApi.replyToUser({
        userId: selectedUser.id,
        message: newMessage.trim()
      });
      setNewMessage('');
      await loadUserMessages(selectedUser.id);
      await loadConversations();
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi du message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      // Afficher seulement l'heure
      return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      // Afficher la date au format JJ/MM/AAAA
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  };

  const getLastMessage = (user: UserWithMessages) => {
    if (user.supportMessages.length === 0) return null;
    return user.supportMessages[user.supportMessages.length - 1];
  };

  const hasUnreadMessages = (user: UserWithMessages) => {
    // Vérifier s'il y a des messages de l'utilisateur (non-BDE) qui n'ont pas été lus
    return user.supportMessages.some(msg => !msg.isFromBDE && !msg.isRead);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Link
          to="/admin"
          className="inline-flex items-center text-blue-600 hover:text-blue-500 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour au tableau de bord admin
        </Link>

        <div className="flex items-center space-x-3">
          <MessageCircle className="w-8 h-8 text-blue-500" />
          <h1 className="text-3xl font-bold">Support - Conversations</h1>
        </div>
        <p className="text-muted-foreground mt-2">
          Gérez les demandes de support des utilisateurs
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste des conversations */}
        <Card className="flex flex-col h-[600px]">
          <div className="p-4 border-b flex-shrink-0">
            <h2 className="text-lg font-semibold">Conversations</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 min-h-0 chat-scrollbar">
            {conversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucune conversation</p>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((user) => {
                  const lastMessage = getLastMessage(user);
                  const unread = hasUnreadMessages(user);
                  return (
                    <div
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedUser?.id === user.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <div className="relative">
                              <p className="font-medium">
                                {user.firstName} {user.lastName}
                              </p>
                            </div>
                            {/* Indicateur en ligne */}
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                user.isOnline
                                  ? selectedUser?.id === user.id
                                    ? 'bg-green-500/20 text-green-300'
                                    : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : selectedUser?.id === user.id
                                    ? 'bg-primary-foreground/20 text-primary-foreground/70'
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full mr-1 ${
                                user.isOnline ? 'bg-green-500' : 'bg-gray-400'
                              }`}></span>
                              {user.isOnline ? 'En ligne' : 'Hors ligne'}
                            </span>
                            {/* Badge nouveau message */}
                            {unread && (
                              <Badge variant="destructive" className="h-5 px-2 text-xs">
                                Nouveau
                              </Badge>
                            )}
                          </div>
                          {lastMessage && (
                            <p className={`text-sm truncate mt-1 ${
                              selectedUser?.id === user.id
                                ? 'text-primary-foreground/80'
                                : 'text-muted-foreground'
                            }`}>
                              {lastMessage.isFromBDE ? 'Vous: ' : ''}
                              {lastMessage.message}
                            </p>
                          )}
                        </div>
                        {lastMessage && (
                          <span className={`text-xs ${
                            selectedUser?.id === user.id
                              ? 'text-primary-foreground/70'
                              : 'text-muted-foreground'
                          }`}>
                            {formatDate(lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        {/* Messages */}
        <Card className="lg:col-span-2 flex flex-col h-[600px]">
          {selectedUser ? (
            <>
              {/* Header */}
              <div className="p-4 border-b flex-shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-full">
                    <User className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 chat-scrollbar">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.isFromBDE ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex flex-col ${msg.isFromBDE ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`max-w-[70%] min-w-[200px] rounded-lg p-3 ${
                          msg.isFromBDE
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm">{msg.message}</p>
                        <div className="flex items-center justify-end space-x-2 mt-1">
                          {msg.isEdited && (
                            <span className={`text-xs ${
                              msg.isFromBDE ? 'text-primary-foreground/70' : 'text-muted-foreground'
                            }`}>
                              modifié
                            </span>
                          )}
                          <span className={`text-xs ${
                            msg.isFromBDE ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}>
                            {formatDate(msg.createdAt)}
                          </span>
                        </div>
                      </div>
                      {/* WhatsApp style checks */}
                      <div className={`flex items-center space-x-1 mt-0.5 px-1 ${msg.isFromBDE ? 'justify-end' : 'justify-start'}`}>
                        <span
                          className={`text-xs ${
                            msg.isRead
                              ? msg.isFromBDE ? 'text-blue-400' : 'text-blue-600'
                              : msg.isFromBDE ? 'text-primary-foreground/50' : 'text-muted-foreground'
                          }`}
                          title={msg.isRead ? `Lu ${formatDate(msg.updatedAt)}` : 'Envoyé'}
                        >
                          {msg.isRead ? '✓✓' : '✓'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t flex-shrink-0">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Tapez votre réponse..."
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={sending}
                  />
                  <Button type="submit" disabled={sending || !newMessage.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Sélectionnez une conversation pour commencer</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
