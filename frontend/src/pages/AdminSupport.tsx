import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, User, ArrowLeft, Pencil, Trash2, X, Check, Reply } from 'lucide-react';
import { adminApi, supportApi } from '../services/api';
import type { SupportMessage } from '../types';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { handleApiErrorWithLog } from '../utils/errorHandler';
import LandingNav from '../components/LandingNav';
import logoFLR from '../assets/Logo_FLR.png';

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [replyTo, setReplyTo] = useState<SupportMessage | null>(null);
  const [pressingMsg, setPressingMsg] = useState<string | null>(null);
  const [longPressMsg, setLongPressMsg] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadUserMessages(selectedUser.id).then(() => {
        loadConversations(false);
      });
    }
  }, [selectedUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const data = await adminApi.getAllConversations();
      setConversations(data);
    } catch (error: any) {
      handleApiErrorWithLog(error, 'Erreur lors du chargement des conversations', 'AdminSupport.loadConversations');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const loadUserMessages = async (userId: string) => {
    try {
      const data = await adminApi.getUserMessages(userId);
      setMessages(data);
    } catch (error: any) {
      handleApiErrorWithLog(error, 'Erreur lors du chargement des messages', 'AdminSupport.loadUserMessages');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    const messageToSend = newMessage.trim();
    const currentUserId = selectedUser.id;

    const replyToId = replyTo?.id;

    try {
      setSending(true);
      setNewMessage('');
      setReplyTo(null);
      await adminApi.replyToUser({ userId: currentUserId, message: messageToSend, replyToId });
      await loadUserMessages(currentUserId);
      loadConversations(false);
    } catch (error: any) {
      handleApiErrorWithLog(error, 'Erreur lors de l\'envoi du message', 'AdminSupport.handleSendMessage');
      setNewMessage(messageToSend);
    } finally {
      setSending(false);
    }
  };

  const handleEdit = async (msgId: string) => {
    if (!editText.trim() || !selectedUser) return;
    try {
      await supportApi.updateMessage(msgId, editText.trim());
      setEditingId(null);
      setEditText('');
      await loadUserMessages(selectedUser.id);
      loadConversations(false);
    } catch (error: any) {
      handleApiErrorWithLog(error, 'Erreur lors de la modification', 'AdminSupport.handleEdit');
    }
  };

  const openDeleteDialog = (msgId: string) => {
    setMessageToDelete(msgId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedUser || !messageToDelete) return;
    try {
      await supportApi.deleteMessage(messageToDelete);
      await loadUserMessages(selectedUser.id);
      loadConversations(false);
      toast.success('Message supprimé');
    } catch (error: any) {
      handleApiErrorWithLog(error, 'Erreur lors de la suppression', 'AdminSupport.confirmDelete');
    } finally {
      setShowDeleteDialog(false);
      setMessageToDelete(null);
    }
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

  const getLastMessage = (user: UserWithMessages) => {
    if (user.supportMessages.length === 0) return null;
    return user.supportMessages[user.supportMessages.length - 1];
  };

  const hasUnreadMessages = (user: UserWithMessages) => {
    return user.supportMessages.some(msg => !msg.isFromBDE && !msg.isRead);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1128] font-dm-sans text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-2 border-blue-400/20 border-t-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1128] font-dm-sans text-white flex flex-col">
      <LandingNav />

      <div className="pt-28 pb-16 px-6 flex-1">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour au tableau de bord
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h1 className="font-syne font-bold text-3xl text-white">Support</h1>
                <p className="text-white/40 text-sm">Gérez les demandes des utilisateurs</p>
              </div>
            </div>
          </div>

          {/* Chat layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
            {/* Conversation list */}
            <div className="rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-white/10 flex-shrink-0">
                <h2 className="font-syne font-bold text-white">Conversations</h2>
              </div>
              <div className="flex-1 overflow-y-auto p-2 min-h-0 chat-scrollbar">
                {conversations.length === 0 ? (
                  <div className="text-center py-12 text-white/30">
                    <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune conversation</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {conversations.map((user) => {
                      const lastMessage = getLastMessage(user);
                      const unread = hasUnreadMessages(user);
                      const isSelected = selectedUser?.id === user.id;
                      return (
                        <div
                          key={user.id}
                          onClick={() => setSelectedUser(user)}
                          className={`p-3 rounded-xl cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-blue-500/20 border border-blue-400/20'
                              : 'hover:bg-white/[0.04] border border-transparent'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-400/20 flex items-center justify-center flex-shrink-0">
                              <span className="font-syne font-bold text-xs text-blue-300">
                                {user.firstName[0]}{user.lastName[0]}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <p className="font-bold text-sm text-white truncate">
                                    {user.firstName} {user.lastName}
                                  </p>
                                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${user.isOnline ? 'bg-green-400' : 'bg-white/20'}`} />
                                  {unread && (
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white flex-shrink-0">
                                      Nouveau
                                    </span>
                                  )}
                                </div>
                                {lastMessage && (
                                  <span className="text-[11px] text-white/30 flex-shrink-0">
                                    {formatDate(lastMessage.createdAt)}
                                  </span>
                                )}
                              </div>
                              {lastMessage && (
                                <p className="text-xs text-white/30 truncate mt-0.5">
                                  {lastMessage.isFromBDE ? 'Vous : ' : ''}
                                  {lastMessage.message}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="lg:col-span-2 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col overflow-hidden">
              {selectedUser ? (
                <>
                  {/* Chat header */}
                  <div className="p-4 border-b border-white/10 flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-400/20 flex items-center justify-center">
                        <span className="font-syne font-bold text-sm text-blue-300">
                          {selectedUser.firstName[0]}{selectedUser.lastName[0]}
                        </span>
                      </div>
                      <div>
                        <Link
                          to={`/admin?search=${encodeURIComponent(selectedUser.firstName + ' ' + selectedUser.lastName)}`}
                          className="font-syne font-bold text-white hover:text-blue-300 transition-colors"
                        >
                          {selectedUser.firstName} {selectedUser.lastName}
                        </Link>
                        <p className="text-xs text-white/30">{selectedUser.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-0 chat-scrollbar" onClick={() => longPressMsg && setLongPressMsg(null)}>
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.isFromBDE ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex flex-col ${msg.isFromBDE ? 'items-end' : 'items-start'} max-w-[80%] sm:max-w-[70%] group relative`}>
                          <div
                            className={`w-full rounded-2xl px-4 py-3 transition-all duration-200 ${
                              msg.isFromBDE
                                ? 'bg-blue-600/80 border border-blue-500/30'
                                : 'bg-white/[0.06] border border-white/10'
                            } ${longPressMsg === msg.id ? 'ring-1 ring-blue-400/40 scale-[0.97]' : ''} ${pressingMsg === msg.id && longPressMsg !== msg.id ? (msg.isFromBDE ? 'bg-blue-600' : 'bg-white/[0.12]') + ' scale-[0.98]' : ''}`}
                            onTouchStart={() => {
                              setPressingMsg(msg.id);
                              longPressTimer.current = setTimeout(() => {
                                setLongPressMsg(msg.id);
                                setPressingMsg(null);
                              }, 500);
                            }}
                            onTouchEnd={() => {
                              setPressingMsg(null);
                              if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
                            }}
                            onTouchMove={() => {
                              setPressingMsg(null);
                              if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
                            }}
                          >
                            {msg.isDeleted ? (
                              <p className="text-sm italic text-white/30">message supprimé</p>
                            ) : (
                              <>
                                {!msg.isFromBDE && msg.user && (
                                  <p className="text-xs font-bold text-blue-400 mb-1.5 font-syne">
                                    {msg.user.firstName} {msg.user.lastName}
                                  </p>
                                )}

                                {/* Quoted message */}
                                {msg.replyTo && (
                                  <div className="mb-2 px-3 py-2 rounded-xl bg-white/[0.06] border-l-2 border-blue-400/50">
                                    <p className="text-[11px] font-bold text-blue-400/70 mb-0.5">
                                      {msg.replyTo.isFromBDE ? 'Fuelers' : (msg.replyTo.user ? `${msg.replyTo.user.firstName}` : 'Utilisateur')}
                                    </p>
                                    <p className="text-xs text-white/40 line-clamp-2">
                                      {msg.replyTo.isDeleted ? 'message supprimé' : msg.replyTo.message}
                                    </p>
                                  </div>
                                )}

                                {editingId === msg.id ? (
                                  <div className="space-y-3">
                                    <textarea
                                      value={editText}
                                      onChange={(e) => setEditText(e.target.value)}
                                      className="w-full px-3 py-2 text-sm bg-[#0a1128] text-white border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                                      autoFocus
                                      rows={Math.max(2, editText.split('\n').length)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEdit(msg.id); }
                                        if (e.key === 'Escape') setEditingId(null);
                                      }}
                                    />
                                    <div className="flex gap-2 justify-end">
                                      <button
                                        onClick={() => setEditingId(null)}
                                        className="px-3 py-1.5 text-xs text-white/50 hover:text-white rounded-lg hover:bg-white/5 transition-all flex items-center gap-1"
                                      >
                                        <X className="w-3 h-3" />
                                        Annuler
                                      </button>
                                      <button
                                        onClick={() => handleEdit(msg.id)}
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
                                      <p className={`text-[10px] ${msg.isFromBDE ? 'text-white/50' : 'text-white/25'}`}>
                                        {formatDate(msg.createdAt)}
                                      </p>
                                      <div className="flex items-center gap-1.5">
                                        {msg.isEdited && (
                                          <p className="text-[10px] italic text-white/30">modifié</p>
                                        )}
                                        {/* Desktop hover buttons */}
                                        <button
                                          onClick={() => { setReplyTo(msg); inputRef.current?.focus(); }}
                                          className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white/80 opacity-0 group-hover:opacity-100 hidden sm:block"
                                          title="Répondre"
                                        >
                                          <Reply className="w-3 h-3" />
                                        </button>
                                        {msg.isFromBDE && (
                                          <>
                                            <button
                                              onClick={() => { setEditingId(msg.id); setEditText(msg.message); }}
                                              className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white/80 opacity-0 group-hover:opacity-100 hidden sm:block"
                                              title="Modifier"
                                            >
                                              <Pencil className="w-3 h-3" />
                                            </button>
                                            <button
                                              onClick={() => openDeleteDialog(msg.id)}
                                              className="p-1 hover:bg-red-500/10 rounded-lg transition-colors text-white/40 hover:text-red-400 opacity-0 group-hover:opacity-100 hidden sm:block"
                                              title="Supprimer"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </>
                                )}
                              </>
                            )}
                          </div>

                          {/* Mobile long-press context menu */}
                          {longPressMsg === msg.id && !msg.isDeleted && (
                            <div className={`absolute z-20 ${msg.isFromBDE ? 'right-0' : 'left-0'} -top-12 flex items-center gap-1 px-2 py-1.5 rounded-xl bg-[#0d1530] border border-white/15 shadow-xl shadow-black/40`}>
                              <button
                                onClick={() => { setReplyTo(msg); setLongPressMsg(null); inputRef.current?.focus(); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                              >
                                <Reply className="w-3.5 h-3.5" />
                                Répondre
                              </button>
                              {msg.isFromBDE && (
                                <>
                                  <button
                                    onClick={() => { setEditingId(msg.id); setEditText(msg.message); setLongPressMsg(null); }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                    Modifier
                                  </button>
                                  <button
                                    onClick={() => { openDeleteDialog(msg.id); setLongPressMsg(null); }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Supprimer
                                  </button>
                                </>
                              )}
                            </div>
                          )}

                          {/* Read checks */}
                          <div className={`flex items-center space-x-1 mt-0.5 px-1 ${msg.isFromBDE ? 'justify-end' : 'justify-start'}`}>
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
                  </div>

                  {/* Input */}
                  <div className="px-4 sm:px-6 py-4 border-t border-white/10 bg-white/[0.02] flex-shrink-0">
                    {/* Reply preview */}
                    {replyTo && (
                      <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10">
                        <Reply className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-blue-400">
                            {replyTo.isFromBDE ? 'Fuelers' : (replyTo.user ? `${replyTo.user.firstName} ${replyTo.user.lastName}` : 'Utilisateur')}
                          </p>
                          <p className="text-xs text-white/40 truncate">{replyTo.message}</p>
                        </div>
                        <button onClick={() => setReplyTo(null)} className="p-1 text-white/30 hover:text-white transition-colors flex-shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <form onSubmit={handleSendMessage} className="flex gap-3 items-end">
                      <input
                        ref={inputRef}
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Tapez votre réponse..."
                        className="flex-1 px-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400/30 transition-all"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(e);
                          }
                        }}
                        disabled={sending}
                      />
                      <button
                        type="submit"
                        disabled={sending || !newMessage.trim()}
                        className="h-11 px-5 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center gap-2 flex-shrink-0"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-white/20">
                  <div className="text-center">
                    <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Sélectionnez une conversation</p>
                  </div>
                </div>
              )}
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
              Le message sera remplacé par "message supprimé".
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setShowDeleteDialog(false); setMessageToDelete(null); }} className="px-4 py-2 text-sm text-white/50 hover:text-white rounded-xl hover:bg-white/5 transition-all border border-white/10">
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
