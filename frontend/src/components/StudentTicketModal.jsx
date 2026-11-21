import React, { useState, useEffect, useCallback } from 'react';
import {
  X, HelpCircle, Send, AlertCircle, CheckCircle2, Clock,
  ShieldCheck, Loader2, ArrowLeft, MessageSquare, ChevronRight,
  User, RefreshCw, PlusCircle, Trash2, CheckCheck
} from 'lucide-react';
import api from '../apiService';
import { formatDate } from '../adminUtils';
import { getRouteParam, setRouteParam, removeRouteParam } from '../routes';

const CATEGORIES = [
  { value: 'academic', label: 'Academic Curriculum & Course Guidance', desc: 'Questions on syllabus, module lessons, or project deliverables' },
  { value: 'scheduling', label: 'Class Schedule & Session Timings', desc: 'Queries on upcoming live classes, timing changes, or faculty sessions' },
  { value: 'technical', label: 'Technical Platform & Playback', desc: 'Issues with video stream playback, login, or portal features' },
  { value: 'fees', label: 'Fee Plan & Payment Inquiries', desc: 'Questions regarding tuition, installments, or payment verification' },
  { value: 'placement', label: 'Career & Placement Assistance', desc: 'Assistance with resume reviews, interviews, or hiring drives' },
  { value: 'other', label: 'General Administrative Support', desc: 'Other institutional or administrative queries' }
];

const PRIORITIES = [
  { value: 'low', label: 'Low', desc: 'General question / no deadline' },
  { value: 'medium', label: 'Medium', desc: 'Standard turnaround (within 24 hours)' },
  { value: 'high', label: 'High', desc: 'Impacting upcoming class or deadline' },
  { value: 'urgent', label: 'Urgent', desc: 'Critical blocker requiring rapid resolution' }
];

export default function StudentTicketModal({
  isOpen,
  onClose,
  currentUser,
  onSuccess,
  initialTab = 'my_tickets',
  initialTicketId = null
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'my_tickets' | 'create'
  const [tickets, setTickets] = useState([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Form states
  const [category, setCategory] = useState('academic');
  const [priority, setPriority] = useState('medium');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isActionInProgress, setIsActionInProgress] = useState(false);
  const [error, setError] = useState('');
  const [replyError, setReplyError] = useState('');

  // Fetch thread messages for a selected ticket
  const fetchThread = useCallback(async (ticketId) => {
    setIsLoadingThread(true);
    setReplyError('');
    try {
      setRouteParam('ticket', ticketId);
      sessionStorage.setItem('aaroha_student_selected_ticket_id', String(ticketId));
    } catch (e) {}
    try {
      const res = await api.studentGetTicketThread(ticketId);
      if (res && res.success) {
        setSelectedTicket(res.ticket);
        setThreadMessages(res.messages || []);
      }
    } catch (err) {
      setReplyError(err.message || 'Failed to load ticket thread.');
    } finally {
      setIsLoadingThread(false);
    }
  }, []);

  const handleBackToTicketsList = useCallback(() => {
    setSelectedTicket(null);
    try {
      removeRouteParam('ticket');
      sessionStorage.removeItem('aaroha_student_selected_ticket_id');
    } catch (e) {}
  }, []);

  // Fetch student's tickets
  const fetchMyTickets = useCallback(async () => {
    setIsLoadingTickets(true);
    try {
      const res = await api.studentGetMySupportTickets();
      if (res && res.success && Array.isArray(res.tickets)) {
        setTickets(res.tickets);
        const targetTicketId = initialTicketId || getRouteParam('ticket') || sessionStorage.getItem('aaroha_student_selected_ticket_id');
        if (targetTicketId) {
          const match = res.tickets.find(t => String(t.id) === String(targetTicketId) || t.ticket_number === targetTicketId);
          if (match) {
            setActiveTab('my_tickets');
            fetchThread(match.id);
            return;
          }
        }
        // If initial tab was not explicitly set to create and tickets exist, show tickets
        if (initialTab !== 'create' && res.tickets.length > 0) {
          setActiveTab('my_tickets');
        } else if (res.tickets.length === 0) {
          setActiveTab('create');
        }
      }
    } catch (err) {
      console.warn('Failed to load student tickets:', err);
    } finally {
      setIsLoadingTickets(false);
    }
  }, [initialTab, initialTicketId, fetchThread]);

  useEffect(() => {
    if (isOpen) {
      setError('');
      setReplyError('');
      const targetTicketId = initialTicketId || getRouteParam('ticket') || sessionStorage.getItem('aaroha_student_selected_ticket_id');
      if (!targetTicketId) {
        setSelectedTicket(null);
      }
      setReplyText('');
      setCategory('academic');
      setPriority('medium');
      setSubject('');
      setDescription('');
      fetchMyTickets();
    }
  }, [isOpen, fetchMyTickets]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Handle new ticket submission
  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    setError('');

    const cleanSubj = subject.trim();
    const cleanDesc = description.trim();

    if (!cleanSubj || cleanSubj.length < 3) {
      setError('Please provide a descriptive subject of at least 3 characters.');
      return;
    }

    if (!cleanDesc || cleanDesc.length < 5) {
      setError('Please provide details explaining your inquiry or issue (at least 5 characters).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.studentCreateSupportTicket({
        category,
        priority,
        subject: cleanSubj,
        description: cleanDesc
      });

      if (res && res.success) {
        if (onSuccess) {
          onSuccess(res.message || 'Support ticket submitted successfully!');
        }
        await fetchMyTickets();
        if (res.ticket_id) {
          await fetchThread(res.ticket_id);
          setActiveTab('my_tickets');
        } else {
          setActiveTab('my_tickets');
        }
      } else {
        setError(res?.error || 'Failed to submit support ticket. Please try again.');
      }
    } catch (err) {
      setError(err?.message || 'A network error occurred while submitting your ticket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle student replying to ticket thread
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setIsSendingReply(true);
    setReplyError('');
    try {
      const res = await api.studentReplyTicket(selectedTicket.id, {
        message: replyText.trim()
      });

      if (res && res.success) {
        setReplyText('');
        await fetchThread(selectedTicket.id);
        await fetchMyTickets();
      } else {
        setReplyError(res?.error || 'Failed to post reply.');
      }
    } catch (err) {
      setReplyError(err.message || 'Network error sending reply.');
    } finally {
      setIsSendingReply(false);
    }
  };

  // Close a specific ticket
  const handleCloseTicket = async (ticketId, ticketNum) => {
    if (!ticketId) return;
    if (!window.confirm(`Are you sure you want to close ticket ${ticketNum || ''}?`)) return;
    
    setIsActionInProgress(true);
    try {
      const res = await api.studentCloseTicket(ticketId);
      if (res && res.success) {
        if (onSuccess) onSuccess(`Ticket ${ticketNum || ''} closed successfully.`);
        if (selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket(prev => prev ? ({ ...prev, status: 'closed' }) : null);
          await fetchThread(ticketId);
        }
        await fetchMyTickets();
      } else {
        alert(res?.error || 'Failed to close ticket.');
      }
    } catch (err) {
      alert(err.message || 'Error closing ticket.');
    } finally {
      setIsActionInProgress(false);
    }
  };

  // Clear / delete a specific ticket from history
  const handleClearTicket = async (ticketId, ticketNum) => {
    if (!ticketId) return;
    if (!window.confirm(`Are you sure you want to permanently clear ticket ${ticketNum || ''} from your helpdesk history? This cannot be undone.`)) return;

    setIsActionInProgress(true);
    try {
      const res = await api.studentClearTicket(ticketId);
      if (res && res.success) {
        if (onSuccess) onSuccess(`Ticket ${ticketNum || ''} cleared from history.`);
        if (selectedTicket && selectedTicket.id === ticketId) {
          handleBackToTicketsList();
        }
        await fetchMyTickets();
      } else {
        alert(res?.error || 'Failed to clear ticket.');
      }
    } catch (err) {
      alert(err.message || 'Error clearing ticket.');
    } finally {
      setIsActionInProgress(false);
    }
  };

  // Clear all tickets (or only closed ones)
  const handleClearAllTickets = async (statusFilter = null) => {
    const scopeLabel = statusFilter ? 'all closed tickets' : 'ALL your support tickets';
    if (!window.confirm(`Are you sure you want to permanently clear ${scopeLabel}? This will remove them from your helpdesk history.`)) return;

    setIsActionInProgress(true);
    try {
      const res = await api.studentClearAllTickets(statusFilter ? { status: statusFilter } : {});
      if (res && res.success) {
        if (onSuccess) onSuccess(res.message || 'Tickets cleared successfully.');
        setSelectedTicket(null);
        await fetchMyTickets();
      } else {
        alert(res?.error || 'Failed to clear tickets.');
      }
    } catch (err) {
      alert(err.message || 'Error clearing tickets.');
    } finally {
      setIsActionInProgress(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || 'open').toLowerCase();
    switch (s) {
      case 'open':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">Open</span>;
      case 'in_progress':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-sky-50 text-[#086491] border border-sky-200">In Progress</span>;
      case 'resolved':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">Resolved</span>;
      case 'closed':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">Closed</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-slate-50 text-slate-600 border border-slate-200">{s}</span>;
    }
  };

  const getPriorityBadge = (p) => {
    const prio = (p || 'medium').toLowerCase();
    switch (prio) {
      case 'urgent':
        return <span className="text-[10px] font-mono font-bold uppercase text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">Urgent</span>;
      case 'high':
        return <span className="text-[10px] font-mono font-bold uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">High</span>;
      case 'medium':
        return <span className="text-[10px] font-mono font-bold uppercase text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">Medium</span>;
      default:
        return <span className="text-[10px] font-mono font-bold uppercase text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">Low</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[90dvh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticket-modal-title"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-[#0A7CB3] text-white flex items-center justify-between border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center border border-white/20 shrink-0">
              <HelpCircle className="w-5 h-5 text-sky-300" />
            </div>
            <div>
              <h2 id="ticket-modal-title" className="text-base sm:text-lg font-bold text-white leading-tight">
                Academic Helpdesk & Support Tickets
              </h2>
              <p className="text-xs text-sky-100">
                Direct communication with Aaroha Faculty & Academic Operations
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Close support dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Tabs Bar */}
        {!selectedTicket && (
          <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 shrink-0 gap-2">
            <button
              onClick={() => {
                setActiveTab('my_tickets');
                handleBackToTicketsList();
              }}
              className={`pb-2.5 px-3.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'my_tickets'
                  ? 'border-[#0A7CB3] text-[#0A7CB3]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <MessageSquare size={14} />
              <span>My Raised Tickets</span>
              {tickets.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-sky-100 text-[#086491] font-bold">
                  {tickets.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('create');
                handleBackToTicketsList();
              }}
              className={`pb-2.5 px-3.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'create'
                  ? 'border-[#0A7CB3] text-[#0A7CB3]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <PlusCircle size={14} />
              <span>Raise New Ticket</span>
            </button>
          </div>
        )}

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {/* VIEW 1: SELECTED TICKET DETAIL & CONVERSATION THREAD */}
          {selectedTicket ? (
            <div className="space-y-5">
              {/* Top back navigation */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <button
                  onClick={handleBackToTicketsList}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#0A7CB3] hover:text-[#086491] cursor-pointer transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>Back to My Tickets</span>
                </button>

                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusBadge(selectedTicket.status)}
                  {getPriorityBadge(selectedTicket.priority)}

                  {selectedTicket.status !== 'closed' && (
                    <button
                      type="button"
                      onClick={() => handleCloseTicket(selectedTicket.id, selectedTicket.ticket_number)}
                      disabled={isActionInProgress}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      title="Close this support inquiry"
                    >
                      <CheckCircle2 size={13} className="text-emerald-600" />
                      <span>Close Ticket</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleClearTicket(selectedTicket.id, selectedTicket.ticket_number)}
                    disabled={isActionInProgress}
                    className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    title="Clear this ticket from your helpdesk history"
                  >
                    <Trash2 size={13} className="text-rose-600" />
                    <span>Clear Ticket</span>
                  </button>
                </div>
              </div>

              {/* Ticket Overview Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono text-xs font-bold text-[#0A7CB3] block">
                      {selectedTicket.ticket_number}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">
                      {selectedTicket.subject}
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500 shrink-0">
                    {formatDate(selectedTicket.created_at)}
                  </span>
                </div>

                <div className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed whitespace-pre-wrap">
                  {selectedTicket.description}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1 font-mono">
                  <span>Category: <strong className="text-slate-700 uppercase">{selectedTicket.category}</strong></span>
                  {selectedTicket.assigned_to_name && (
                    <span>Assigned Coordinator: <strong className="text-slate-700">{selectedTicket.assigned_to_name}</strong></span>
                  )}
                </div>
              </div>

              {/* Conversation Messages */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <MessageSquare size={13} />
                  <span>Discussion & Staff Replies ({threadMessages.length})</span>
                </h4>

                {isLoadingThread ? (
                  <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <Loader2 size={24} className="animate-spin text-[#0A7CB3]" />
                    <span className="text-xs">Loading ticket discussion...</span>
                  </div>
                ) : threadMessages.length === 0 ? (
                  <div className="py-6 px-4 bg-sky-50/50 rounded-xl border border-sky-100 text-center text-xs text-slate-600">
                    Your inquiry is currently in queue with the academic coordinator. Replies will appear here.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {threadMessages.map((msg) => {
                      const isStudent = (msg.sender_role || '').toLowerCase() === 'student' || msg.sender_id === currentUser?.id;
                      return (
                        <div
                          key={msg.id}
                          className={`p-3.5 rounded-2xl border text-xs leading-relaxed space-y-1.5 ${
                            isStudent
                              ? 'bg-sky-50/70 border-sky-200 text-slate-900 ml-4 sm:ml-8'
                              : 'bg-white border-slate-200 text-slate-900 mr-4 sm:mr-8 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <strong className={isStudent ? 'text-[#086491]' : 'text-slate-900'}>
                                {msg.sender_name || (isStudent ? 'You' : 'Academic Coordinator')}
                              </strong>
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold uppercase ${
                                isStudent ? 'bg-sky-200/60 text-[#086491]' : 'bg-purple-100 text-purple-900'
                              }`}>
                                {msg.sender_role || (isStudent ? 'Student' : 'Staff')}
                              </span>
                            </div>
                            <span className="text-slate-500 font-mono text-[10px]">
                              {formatDate(msg.created_at)}
                            </span>
                          </div>

                          <div className="whitespace-pre-wrap text-slate-800">
                            {msg.message}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="pt-2 border-t border-slate-200 space-y-2">
                {replyError && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                    {replyError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Send a Follow-up Message
                  </label>
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your message or clarification here..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs focus:outline-hidden focus:border-[#0A7CB3] focus:bg-white transition-colors"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSendingReply || !replyText.trim()}
                    className="px-4 py-2 rounded-xl bg-[#0A7CB3] hover:bg-[#086491] text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    {isSendingReply ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send size={13} />
                        <span>Send Reply</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : activeTab === 'my_tickets' ? (
            /* VIEW 2: LIST OF RAISED TICKETS */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Your Institutional Tickets</h3>
                  <p className="text-xs text-slate-500">Track status, close resolved inquiries, or clear tickets</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {tickets.length > 0 && (
                    <>
                      {tickets.some(t => t.status === 'closed' || t.status === 'resolved') && (
                        <button
                          type="button"
                          onClick={() => handleClearAllTickets('closed')}
                          disabled={isLoadingTickets || isActionInProgress}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs disabled:opacity-50"
                          title="Clear closed tickets from your list"
                        >
                          <CheckCheck size={13} className="text-emerald-600" />
                          <span>Clear Closed</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleClearAllTickets(null)}
                        disabled={isLoadingTickets || isActionInProgress}
                        className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs disabled:opacity-50"
                        title="Clear all tickets from your helpdesk history"
                      >
                        <Trash2 size={13} className="text-rose-600" />
                        <span>Clear All Tickets</span>
                      </button>
                    </>
                  )}

                  <button
                    onClick={fetchMyTickets}
                    disabled={isLoadingTickets}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    title="Refresh tickets"
                  >
                    <RefreshCw size={12} className={isLoadingTickets ? 'animate-spin' : ''} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {isLoadingTickets ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 size={24} className="animate-spin text-[#0A7CB3]" />
                  <span className="text-xs">Fetching your support tickets...</span>
                </div>
              ) : tickets.length === 0 ? (
                <div className="py-12 px-6 text-center space-y-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center mx-auto shadow-2xs">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">No Support Tickets Raised Yet</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                      Have questions regarding course milestones, scheduling, or technical access? Raise a new ticket below.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="px-4 py-2 rounded-xl bg-[#0A7CB3] hover:bg-[#086491] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                  >
                    <PlusCircle size={14} />
                    <span>Raise a New Ticket</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {tickets.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => fetchThread(t.id)}
                      className="p-4 rounded-2xl border border-slate-200 hover:border-[#0A7CB3] bg-white hover:bg-slate-50/50 transition-all cursor-pointer shadow-2xs space-y-2 group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#0A7CB3]">
                            {t.ticket_number}
                          </span>
                          <span className="text-[10px] font-mono uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                            {t.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(t.status)}
                          {getPriorityBadge(t.priority)}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#0A7CB3] transition-colors">
                          {t.subject}
                        </h4>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {t.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] text-slate-400 gap-2 flex-wrap">
                        <span>Logged: {formatDate(t.created_at)}</span>
                        
                        <div className="flex items-center gap-2">
                          {t.status !== 'closed' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCloseTicket(t.id, t.ticket_number);
                              }}
                              disabled={isActionInProgress}
                              className="px-2 py-0.5 rounded text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1 cursor-pointer transition-colors"
                              title="Close this ticket"
                            >
                              <CheckCircle2 size={11} />
                              <span>Close</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClearTicket(t.id, t.ticket_number);
                            }}
                            disabled={isActionInProgress}
                            className="px-2 py-0.5 rounded text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1 cursor-pointer transition-colors"
                            title="Clear this ticket from history"
                          >
                            <Trash2 size={11} />
                            <span>Clear</span>
                          </button>

                          <div className="flex items-center gap-1 text-[#0A7CB3] font-semibold ml-1">
                            <span>View Thread</span>
                            <ChevronRight size={13} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* VIEW 3: RAISE NEW TICKET FORM */
            <form onSubmit={handleSubmitTicket} className="space-y-4">
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              {/* Category */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Inquiry Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs focus:outline-hidden focus:border-[#0A7CB3] focus:bg-white transition-colors cursor-pointer"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500">
                  {CATEGORIES.find(c => c.value === category)?.desc}
                </p>
              </div>

              {/* Priority */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Urgency Level
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRIORITIES.map(p => {
                    const isSelected = priority === p.value;
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setPriority(p.value)}
                        className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#0A7CB3] bg-sky-50/70 text-[#0A7CB3] font-bold shadow-2xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                        }`}
                      >
                        <div className="text-xs font-semibold">{p.label}</div>
                        <div className="text-[10px] text-slate-500 line-clamp-1">{p.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Subject Summary <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of your question, milestone issue, or technical problem..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs focus:outline-hidden focus:border-[#0A7CB3] focus:bg-white transition-colors"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Detailed Inquiry or Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide context, batch details, lesson names, or screenshots/logs if applicable..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs focus:outline-hidden focus:border-[#0A7CB3] focus:bg-white transition-colors"
                ></textarea>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#0A7CB3] hover:bg-[#086491] text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      <span>Submit Ticket</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
