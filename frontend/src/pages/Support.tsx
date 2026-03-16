import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supportApi } from '../services/api';
import type { User, SupportMessage } from '../types';
import { Send, MessageCircle, Edit2, X, AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { handleApiErrorWithLog } from '../utils/errorHandler';
import LandingNav from '../components/LandingNav';
import logoFLR from '../assets/Logo_FLR.png';

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

  const isAdmin = user?.isAdmin === true;

  const { data: messages, isLoading } = useQuery({
    queryKey: ['support-messages'],
    queryFn: () => supportApi.getMessages(),
    refetchInterval: 5000
  });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

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

    const msg = messages?.find((m: SupportMessage) => m.id === messageId);

    if (msg && msg.message === editedMessage.trim()) {
      toast('Aucune modification détectée', { icon: 'ℹ️' });
      setEditingMessageId(null);
      setEditedMessage('');
      return;
    }

    const editCount = (msg as any)?.editCount || 0;

    if (editCount === 1) {
      setPendingMessageId(messageId);
      setShowConfirmDialog(true);
      return;
    }

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
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1128] font-dm-sans text-white flex flex-col">
      <LandingNav isAdmin={isAdmin} />

      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-indigo-500/6 rounded-full blur-[100px]" />
      </div>

      <div className="relative flex-1 pt-28 pb-12 px-6">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="font-syne font-extrabold text-2xl sm:text-3xl text-white mb-2">
              Support Fuelers
            </h1>
            <p className="text-white/40 text-sm">
              Posez vos questions, nous sommes là pour vous aider. Réponse en moins de 24h.
            </p>
          </div>

          {/* Chat card */}
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden">
            {/* Chat header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3">
              <img src={logoFLR} alt="Fuelers" className="w-8 h-8 rounded-full ring-2 ring-blue-400/20" />
              <div>
                <p className="font-syne font-bold text-white text-sm">Conversation avec Fuelers</p>
                <p className="text-white/30 text-xs">En ligne</p>
              </div>
            </div>

            {/* Messages */}
            <div className="h-[450px] sm:h-[500px] overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-2" />
                    <p className="text-sm text-white/30">Chargement des messages...</p>
                  </div>
                </div>
              ) : messages && messages.length > 0 ? (
                <>
                  {messages.map((msg: SupportMessage) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.isFromBDE ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`flex flex-col ${msg.isFromBDE ? 'items-start' : 'items-end'} max-w-[80%] sm:max-w-[70%]`}>
                        <div
                          className={`w-full rounded-2xl px-4 py-3 ${
                            msg.isFromBDE
                              ? 'bg-white/[0.06] border border-white/10'
                              : 'bg-blue-600/80 border border-blue-500/30'
                          }`}
                        >
                          {msg.isFromBDE && (
                            <p className="text-xs font-bold text-blue-400 mb-1.5 font-syne">Fuelers</p>
                          )}

                          {editingMessageId === msg.id ? (
                            <div className="space-y-3">
                              <textarea
                                value={editedMessage}
                                onChange={(e) => setEditedMessage(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-[#0a1128] text-white border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                                autoFocus
                                rows={Math.max(2, editedMessage.split('\n').length)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                              />
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={cancelEdit}
                                  className="px-3 py-1.5 text-xs text-white/50 hover:text-white rounded-lg hover:bg-white/5 transition-all flex items-center gap-1"
                                >
                                  <X className="w-3 h-3" />
                                  Annuler
                                </button>
                                <button
                                  onClick={() => saveEdit(msg.id)}
                                  className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                                >
                                  Enregistrer
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm whitespace-pre-wrap break-words text-white/90 mb-2">{msg.message}</p>
                              <div className="flex items-center justify-between gap-2">
                                <p className={`text-[10px] ${msg.isFromBDE ? 'text-white/25' : 'text-white/50'}`}>
                                  {formatDate(msg.createdAt)}
                                </p>
                                <div className="flex items-center gap-1.5">
                                  {msg.isEdited && (
                                    <p className="text-[10px] italic text-white/30">modifié</p>
                                  )}
                                  {!msg.isFromBDE && (
                                    <>
                                        <button
                                          onClick={() => startEditingMessage(msg)}
                                          className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white/80"
                                          title="Modifier"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                        </button>
                                      <button
                                        onClick={() => handleDeleteMessage(msg.id)}
                                        className="p-1 hover:bg-red-500/10 rounded-lg transition-colors text-white/40 hover:text-red-400"
                                        title="Supprimer ce message"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                        {/* Read checks */}
                        <div className={`flex items-center space-x-1 mt-0.5 px-1 ${msg.isFromBDE ? 'justify-start' : 'justify-end'}`}>
                          <span
                            className={`text-[10px] ${msg.isRead ? 'text-blue-400' : 'text-white/20'}`}
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
                    <MessageCircle className="w-16 h-16 mx-auto mb-4 text-white/10" />
                    <p className="text-white/30 font-syne font-bold">Aucun message pour le moment</p>
                    <p className="text-sm text-white/20 mt-1">Commencez la conversation ci-dessous</p>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="px-4 sm:px-6 py-4 border-t border-white/10 bg-white/[0.02]">
              <form onSubmit={handleSend} className="flex gap-3 items-end">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tapez votre message..."
                  rows={2}
                  className="flex-1 min-h-[60px] max-h-[120px] bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400/30 resize-none custom-scrollbar"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !message.trim()}
                  className="h-11 px-5 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center gap-2 flex-shrink-0"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
              <p className="text-[10px] text-white/20 mt-2">
                Entrée pour envoyer, Shift+Entrée pour un saut de ligne
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative py-16 px-6 border-t border-white/10 bg-gradient-to-b from-[#0a1128] to-[#0d1530]">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-950/20 via-transparent to-indigo-950/20" />
        <div className="relative max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <img src={logoFLR} alt="Fuelers" className="w-10 h-10 rounded-full ring-2 ring-blue-400/30 shadow-lg shadow-blue-500/10" />
              <span className="font-syne font-bold text-xl bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Fuelers
              </span>
            </div>
            <div className="flex items-center gap-6">
              <a href="https://www.instagram.com/listebde.fuelers" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-blue-400 transition-colors duration-300" aria-label="Instagram">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
              <a href="https://www.tiktok.com/@listebde.fuelers" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors duration-300" aria-label="TikTok">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-.88-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/></svg>
              </a>
            </div>
            <p className="text-white/60 text-sm font-medium">&copy; {new Date().getFullYear()} Fuelers. Tous droits réservés.</p>
          </div>
        </div>
      </footer>

      {/* Confirm last edit dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="max-w-md w-full rounded-2xl bg-[#0d1530] border border-white/10 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
              </div>
              <h3 className="font-syne font-bold text-white text-lg">Dernière modification</h3>
            </div>
            <p className="text-white/60 text-sm">
              Attention : Vous ne pourrez plus modifier votre message après cette fois.
            </p>
            <p className="text-white/80 text-sm font-medium">
              Êtes-vous sûr de vouloir le modifier ?
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={cancelFinalEdit} className="px-4 py-2 text-sm text-white/50 hover:text-white rounded-xl hover:bg-white/5 transition-all border border-white/10">
                Annuler
              </button>
              <button onClick={confirmFinalEdit} className="px-4 py-2 text-sm bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 rounded-xl transition-colors border border-yellow-500/30">
                Confirmer la modification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="max-w-md w-full rounded-2xl bg-[#0d1530] border border-white/10 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="font-syne font-bold text-white text-lg">Supprimer le message</h3>
            </div>
            <p className="text-white/60 text-sm">
              Êtes-vous sûr de vouloir supprimer ce message ?
            </p>
            <p className="text-white/30 text-xs">
              Cette action est irréversible.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={cancelDelete} className="px-4 py-2 text-sm text-white/50 hover:text-white rounded-xl hover:bg-white/5 transition-all border border-white/10">
                Annuler
              </button>
              <button onClick={confirmDelete} className="px-4 py-2 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl transition-colors border border-red-500/30">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
