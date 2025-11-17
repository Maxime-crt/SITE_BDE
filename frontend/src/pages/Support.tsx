import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supportApi } from '../services/api';
import type { User, SupportMessage } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ArrowLeft, Send, MessageCircle, Edit2, X, AlertTriangle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { handleApiErrorWithLog } from '../utils/errorHandler';

interface SupportProps {
  user: User;
}

export default function Support({ user }: SupportProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editedMessage, setEditedMessage] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingMessageId, setPendingMessageId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery({
    queryKey: ['support-messages'],
    queryFn: () => supportApi.getMessages(),
    refetchInterval: 5000 // Rafraîchir toutes les 5 secondes
  });

  // Removed auto-scroll to bottom - let user control scroll position

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      return;
    }

    setSending(true);
    try {
      await supportApi.sendMessage({ message: message.trim() });
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['support-messages'] });
    } catch (error: any) {
      handleApiErrorWithLog(error, 'Erreur lors de l\'envoi du message', 'Support.handleSend');
    } finally {
      setSending(false);
    }
  };

  const startEditingMessage = (msg: SupportMessage) => {
    setEditingMessageId(msg.id);
    setEditedMessage(msg.message);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditedMessage('');
  };

  const saveEdit = async (messageId: string) => {
    if (!editedMessage.trim()) {
      toast.error('Le message ne peut pas être vide');
      return;
    }

    // Trouver le message pour vérifier le nombre de modifications
    const msg = messages?.find((m: SupportMessage) => m.id === messageId);

    // Vérifier si le message a réellement changé
    if (msg && msg.message === editedMessage.trim()) {
      toast('Aucune modification détectée', { icon: 'ℹ️' });
      setEditingMessageId(null);
      setEditedMessage('');
      return;
    }

    const editCount = (msg as any)?.editCount || 0;

    // Si c'est la deuxième modification (editCount === 1), demander confirmation
    if (editCount === 1) {
      setPendingMessageId(messageId);
      setShowConfirmDialog(true);
      return;
    }

    // Sinon, sauvegarder directement
    await performSave(messageId);
  };

  const performSave = async (messageId: string) => {
    try {
      await supportApi.updateMessage(messageId, editedMessage.trim());
      queryClient.invalidateQueries({ queryKey: ['support-messages'] });
      setEditingMessageId(null);
      setEditedMessage('');
      toast.success('Message modifié');
    } catch (error: any) {
      handleApiErrorWithLog(error, 'Erreur lors de la modification', 'Support.performSave');
    }
  };

  const confirmFinalEdit = async () => {
    if (pendingMessageId) {
      await performSave(pendingMessageId);
    }
    setShowConfirmDialog(false);
    setPendingMessageId(null);
  };

  const cancelFinalEdit = () => {
    setShowConfirmDialog(false);
    setPendingMessageId(null);
  };

  const handleDeleteMessage = (messageId: string) => {
    setMessageToDelete(messageId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!messageToDelete) return;

    try {
      await supportApi.deleteMessage(messageToDelete);
      queryClient.invalidateQueries({ queryKey: ['support-messages'] });
      toast.success('Message supprimé');
    } catch (error: any) {
      handleApiErrorWithLog(error, 'Erreur lors de la suppression', 'Support.confirmDelete');
    } finally {
      setShowDeleteDialog(false);
      setMessageToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteDialog(false);
    setMessageToDelete(null);
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              to="/"
              className="inline-flex items-center text-blue-600 hover:text-blue-500 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour au tableau de bord
            </Link>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-6 shadow-lg">
                <MessageCircle className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight mb-4">
                Support BDE
              </h1>
              <p className="text-xl text-muted-foreground">
                Posez vos questions, nous sommes là pour vous aider
              </p>
            </div>
          </div>

          {/* Chat */}
          <Card className="shadow-2xl">
            <CardHeader>
              <CardTitle>Conversation avec le BDE</CardTitle>
              <CardDescription>
                Réponse généralement en moins de 24h
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Messages */}
              <div className="h-[500px] overflow-y-auto mb-4 space-y-4 p-4 bg-muted/30 rounded-lg chat-scrollbar">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Chargement des messages...</p>
                    </div>
                  </div>
                ) : messages && messages.length > 0 ? (
                  <>
                    {messages.map((msg: SupportMessage) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.isFromBDE ? 'justify-start' : 'justify-end'}`}
                      >
                        <div className={`flex flex-col ${msg.isFromBDE ? 'items-start' : 'items-end'}`}>
                          <div
                            className={`w-full max-w-[70%] min-w-[200px] rounded-lg px-4 py-3 ${
                              msg.isFromBDE
                                ? 'bg-muted text-foreground'
                                : 'bg-primary text-primary-foreground'
                            }`}
                          >
                            {msg.isFromBDE && (
                              <p className="text-xs font-semibold mb-2">
                                BDE IESEG
                              </p>
                            )}

                            {/* Mode édition */}
                            {editingMessageId === msg.id ? (
                              <div className="space-y-3">
                                <textarea
                                  value={editedMessage}
                                  onChange={(e) => setEditedMessage(e.target.value)}
                                  className="w-full px-3 py-2 text-sm bg-background text-foreground border-2 border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                                  autoFocus
                                  rows={Math.max(2, editedMessage.split('\n').length)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                      cancelEdit();
                                    }
                                  }}
                                />
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={cancelEdit}
                                    className="text-xs h-8"
                                  >
                                    <X className="w-3 h-3 mr-1" />
                                    Annuler
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => saveEdit(msg.id)}
                                    className="text-xs h-8 bg-background text-foreground hover:bg-background/90"
                                  >
                                    Enregistrer
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="text-sm whitespace-pre-wrap break-words mb-2">{msg.message}</p>
                                <div className="flex items-center justify-between gap-2">
                                  <p className={`text-xs ${msg.isFromBDE ? 'text-muted-foreground' : 'text-primary-foreground/70'}`}>
                                    {formatDate(msg.createdAt)}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    {msg.isEdited && (
                                      <p className={`text-xs italic ${msg.isFromBDE ? 'text-muted-foreground' : 'text-primary-foreground/70'}`}>
                                        modifié
                                      </p>
                                    )}
                                    {!msg.isFromBDE && (
                                      <>
                                        {(msg as any).editCount < 2 && (
                                          <button
                                            onClick={() => startEditingMessage(msg)}
                                            className={`p-1.5 hover:bg-background/20 rounded transition-colors ${msg.isFromBDE ? 'text-muted-foreground' : 'text-primary-foreground/80 hover:text-primary-foreground'}`}
                                            title={`Vous pouvez encore modifier ${2 - (msg as any).editCount} fois`}
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleDeleteMessage(msg.id)}
                                          className={`p-1.5 hover:bg-background/20 rounded transition-colors ${msg.isFromBDE ? 'text-muted-foreground' : 'text-primary-foreground/80 hover:text-primary-foreground'}`}
                                          title="Supprimer ce message"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                          {/* WhatsApp style checks */}
                          <div className={`flex items-center space-x-1 mt-0.5 px-1 ${msg.isFromBDE ? 'justify-start' : 'justify-end'}`}>
                            <span
                              className={`text-xs ${
                                msg.isRead
                                  ? msg.isFromBDE ? 'text-blue-600' : 'text-blue-400'
                                  : msg.isFromBDE ? 'text-muted-foreground' : 'text-primary-foreground/50'
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
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Aucun message pour le moment
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Commencez la conversation ci-dessous
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Formulaire d'envoi */}
              <form onSubmit={handleSend} className="flex gap-2">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tapez votre message..."
                  rows={3}
                  className="flex-1 min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                  disabled={sending}
                />
                <Button
                  type="submit"
                  disabled={sending || !message.trim()}
                  className="self-end"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer
                </Button>
              </form>
              <p className="text-xs text-muted-foreground mt-2">
                Appuyez sur Entrée pour envoyer, Shift+Entrée pour un saut de ligne
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogue de confirmation pour la dernière modification */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="w-5 h-5" />
                Dernière modification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-foreground">
                Attention : Vous ne pourrez plus modifier votre message après cette fois.
              </p>
              <p className="font-semibold text-foreground">
                Êtes-vous sûr de vouloir le modifier ?
              </p>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={cancelFinalEdit}>
                  Annuler
                </Button>
                <Button onClick={confirmFinalEdit} className="bg-orange-600 hover:bg-orange-700 text-white">
                  Confirmer la modification
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialogue de confirmation de suppression */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="w-5 h-5" />
                Supprimer le message
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-foreground">
                Êtes-vous sûr de vouloir supprimer ce message ?
              </p>
              <p className="text-sm text-muted-foreground">
                Cette action est irréversible.
              </p>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={cancelDelete}>
                  Annuler
                </Button>
                <Button onClick={confirmDelete} variant="destructive">
                  Supprimer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
