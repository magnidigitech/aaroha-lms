import React, { useState, useEffect } from 'react';
import {
  HelpCircle, MessageSquare, AlertCircle, CheckCircle2,
  Clock, Star, Send, ShieldAlert, Search, X, UserCheck, RefreshCw,
  Trash2, CheckCheck
} from 'lucide-react';
import { formatDateTime } from '../../adminUtils';
import api from '../../apiService';
import { getRouteParam, setRouteParam, removeRouteParam } from '../../routes';

export default function AdminSupportTab({
  supportData = { tickets: [], feedback: [] },
  onRefreshSupport
}) {
  const [activeTab, setActiveTab] = useState(() => {
    return getRouteParam('subtab') || 'tickets';
  }); // 'tickets' | 'feedback'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    if (activeTab) {
      setRouteParam('subtab', activeTab);
    }
  }, [activeTab]);

  const tickets = supportData.tickets || [];
  const feedback = supportData.feedback || [];

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = !searchTerm ||
      (t.subject && t.subject.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.ticket_number && t.ticket_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.student_name && t.student_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenTicket = async (ticket) => {
    setSelectedTicket(ticket);
    try {
      setRouteParam('ticket', ticket.id);
      sessionStorage.setItem('aaroha_admin_selected_ticket_id', String(ticket.id));
    } catch (e) {}
    setReplyText('');
    setIsInternalNote(false);
    setIsLoadingThread(true);
    try {
      const res = await api.adminGetTicketThread(ticket.id);
      if (res && res.messages) {
        setThreadMessages(res.messages);
      } else {
        setThreadMessages([]);
      }
    } catch (err) {
      console.error('Failed to load ticket thread:', err);
      setThreadMessages([]);
    } finally {
      setIsLoadingThread(false);
    }
  };

  const handleCloseDrawer = () => {
    setSelectedTicket(null);
    try {
      removeRouteParam('ticket');
      sessionStorage.removeItem('aaroha_admin_selected_ticket_id');
    } catch (e) {}
  };

  // Restore open ticket thread on refresh
  useEffect(() => {
    const savedTicketId = getRouteParam('ticket') || sessionStorage.getItem('aaroha_admin_selected_ticket_id');
    if (savedTicketId && !selectedTicket && tickets.length > 0) {
      const match = tickets.find(t => String(t.id) === String(savedTicketId) || t.ticket_number === savedTicketId);
      if (match) {
        handleOpenTicket(match);
      }
    }
  }, [tickets]);

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;
    setIsSubmittingReply(true);
    try {
      await api.adminReplySupportTicket(selectedTicket.id, {
        message: replyText.trim(),
        is_internal_note: isInternalNote ? 1 : 0
      });
      setReplyText('');

      // Reload thread messages
      const res = await api.adminGetTicketThread(selectedTicket.id);
      if (res && res.messages) {
        setThreadMessages(res.messages);
      }
      if (onRefreshSupport) onRefreshSupport();
    } catch (err) {
      alert('Failed to send reply: ' + (err.message || 'Server error'));
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedTicket || statusUpdating) return;
    setStatusUpdating(true);
    try {
      await api.adminUpdateTicketStatus(selectedTicket.id, { status: newStatus });
      setSelectedTicket(prev => ({ ...prev, status: newStatus }));
      if (onRefreshSupport) onRefreshSupport();
    } catch (err) {
      alert('Failed to update ticket status: ' + (err.message || 'Server error'));
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleCloseTicket = async (ticketId, ticketNum) => {
    if (!ticketId) return;
    if (!window.confirm(`Are you sure you want to close ticket ${ticketNum || ''}?`)) return;
    setStatusUpdating(true);
    try {
      await api.adminCloseTicket(ticketId);
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket(prev => prev ? ({ ...prev, status: 'closed' }) : null);
      }
      if (onRefreshSupport) onRefreshSupport();
    } catch (err) {
      alert('Failed to close ticket: ' + (err.message || 'Server error'));
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleDeleteTicket = async (ticketId, ticketNum) => {
    if (!ticketId) return;
    if (!window.confirm(`Are you sure you want to permanently delete ticket ${ticketNum || ''}? This cannot be undone.`)) return;
    setStatusUpdating(true);
    try {
      await api.adminDeleteTicket(ticketId);
      if (selectedTicket && selectedTicket.id === ticketId) {
        handleCloseDrawer();
      }
      if (onRefreshSupport) onRefreshSupport();
    } catch (err) {
      alert('Failed to delete ticket: ' + (err.message || 'Server error'));
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleClearAllTickets = async (statusFilter = null) => {
    const scopeDesc = statusFilter ? 'all resolved and closed tickets' : 'ALL support tickets';
    if (!window.confirm(`Are you sure you want to permanently clear ${scopeDesc}? This action cannot be undone.`)) return;
    setStatusUpdating(true);
    try {
      const res = await api.adminClearAllTickets(statusFilter ? { status: statusFilter } : {});
      setSelectedTicket(null);
      if (onRefreshSupport) onRefreshSupport();
      alert(res?.message || 'Support tickets cleared successfully.');
    } catch (err) {
      alert('Failed to clear tickets: ' + (err.message || 'Server error'));
    } finally {
      setStatusUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Support Tickets & Student Feedback</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Resolve student queries, maintain private internal staff threads, and review course evaluations.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('tickets')}
          className={`pb-2.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'tickets' ? 'border-blue-500 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Active Support Tickets ({tickets.length})
        </button>
        <button
          onClick={() => setActiveTab('feedback')}
          className={`pb-2.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'feedback' ? 'border-blue-500 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Curriculum & Faculty Feedback ({feedback.length})
        </button>
      </div>

      {activeTab === 'tickets' ? (
        /* Support Tickets View */
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="relative w-full sm:max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search tickets by subject, fellow, or ID..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 placeholder-slate-400 text-xs focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs focus:outline-hidden focus:border-blue-500 cursor-pointer"
              >
                <option value="all">All Ticket Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>

              {tickets.length > 0 && (
                <>
                  {tickets.some(t => t.status === 'closed' || t.status === 'resolved') && (
                    <button
                      type="button"
                      onClick={() => handleClearAllTickets('closed')}
                      disabled={statusUpdating}
                      className="px-2.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs disabled:opacity-50"
                      title="Clear all resolved and closed tickets"
                    >
                      <CheckCheck size={13} className="text-emerald-600" />
                      <span>Clear Resolved</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleClearAllTickets(null)}
                    disabled={statusUpdating}
                    className="px-2.5 py-2 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs disabled:opacity-50"
                    title="Clear all support tickets"
                  >
                    <Trash2 size={13} className="text-rose-600" />
                    <span>Clear All Tickets</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Tickets Table */}
          <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                  <th className="py-3 px-4">Ticket ID</th>
                  <th className="py-3 px-4">Student Fellow</th>
                  <th className="py-3 px-4">Subject & Category</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-500">
                      No support tickets found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#0A7CB3]">
                        {t.ticket_number}
                      </td>
                      <td className="py-3 px-4">
                        <strong className="text-slate-900 block">{t.student_name}</strong>
                        <span className="text-[11px] text-slate-500">{t.student_email}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-800 font-medium block">{t.subject}</span>
                        <span className="text-[10px] font-mono uppercase text-slate-500">{t.category}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                          t.priority === 'urgent'
                            ? 'bg-rose-100 text-rose-900 border border-rose-200'
                            : t.priority === 'high'
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-semibold ${
                          t.status === 'resolved' || t.status === 'closed'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            : t.status === 'in_progress'
                            ? 'bg-sky-100 text-sky-900 border border-sky-200'
                            : 'bg-amber-100 text-amber-900 border border-amber-200'
                        }`}>
                          {t.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {t.status !== 'closed' && (
                            <button
                              type="button"
                              onClick={() => handleCloseTicket(t.id, t.ticket_number)}
                              disabled={statusUpdating}
                              className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                              title="Close ticket"
                            >
                              Close
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteTicket(t.id, t.ticket_number)}
                            disabled={statusUpdating}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 cursor-pointer transition-colors"
                            title="Clear ticket"
                          >
                            <Trash2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenTicket(t)}
                            className="px-2.5 py-1 rounded bg-[#0a7cb3] hover:bg-[#086491] text-white text-xs font-semibold cursor-pointer transition-colors"
                          >
                            Open Thread
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Feedback Submissions View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {feedback.map(fb => (
            <div
              key={fb.id}
              className="p-5 rounded-xl bg-white border border-slate-200 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">{fb.course_title}</span>
                <div className="flex items-center gap-1 text-amber-700 font-bold font-mono text-sm">
                  <Star size={14} className="fill-amber-400" /> {fb.rating || 5.0}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 font-mono text-center text-xs">
                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Content</span>
                  <span className="text-slate-800">{fb.content_rating || 5}/5</span>
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Faculty</span>
                  <span className="text-slate-800">{fb.faculty_rating || 5}/5</span>
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Facilities</span>
                  <span className="text-slate-800">{fb.facilities_rating || 5}/5</span>
                </div>
              </div>

              {fb.comments && (
                <p className="text-xs text-slate-700 italic bg-slate-50 p-2.5 rounded border border-slate-200">
                  "{fb.comments}"
                </p>
              )}

              <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Fellow: {fb.student_name}</span>
                <span>Cohort: {fb.batch_code || 'Live'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ticket Conversation Drawer */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="font-mono text-[#0A7CB3] font-bold text-xs">{selectedTicket.ticket_number}</span>
                <h2 className="text-base font-bold text-slate-900">{selectedTicket.subject}</h2>
              </div>
              <button onClick={handleCloseDrawer} className="text-slate-500 hover:text-slate-900 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Status Transition & Action Controls in Drawer Header */}
            <div className="flex flex-wrap items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs gap-2">
              <div className="flex items-center gap-2">
                <span className="text-slate-600 font-medium">Status:</span>
                <select
                  disabled={statusUpdating}
                  value={selectedTicket.status}
                  onChange={e => handleStatusChange(e.target.value)}
                  className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-800 text-xs font-semibold focus:border-blue-500 cursor-pointer"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>

                {selectedTicket.status !== 'closed' && (
                  <button
                    type="button"
                    onClick={() => handleCloseTicket(selectedTicket.id, selectedTicket.ticket_number)}
                    disabled={statusUpdating}
                    className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 size={12} className="text-emerald-600" />
                    <span>Close Ticket</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleDeleteTicket(selectedTicket.id, selectedTicket.ticket_number)}
                disabled={statusUpdating}
                className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Permanently clear this ticket"
              >
                <Trash2 size={12} className="text-rose-600" />
                <span>Clear Ticket</span>
              </button>
            </div>

            {/* Messages Thread Container */}
            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar text-xs">
              {/* Original Ticket Description */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center justify-between font-semibold text-slate-700">
                  <span>{selectedTicket.student_name} (Initial Query)</span>
                  <span className="text-[11px] text-slate-500">{formatDateTime(selectedTicket.created_at)}</span>
                </div>
                <p className="text-slate-800 leading-relaxed">{selectedTicket.description}</p>
              </div>

              {isLoadingThread ? (
                <div className="py-6 text-center text-slate-500">Loading conversation thread...</div>
              ) : (
                threadMessages.map(msg => (
                  <div
                    key={msg.id}
                    className={`p-3.5 rounded-lg border space-y-1 ${
                      msg.is_internal_note
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span className="flex items-center gap-1.5">
                        {msg.is_internal_note && <ShieldAlert size={13} className="text-amber-700" />}
                        <span>{msg.sender_name || 'Staff Member'}</span>
                        <span className="text-[10px] font-mono text-slate-500 font-normal">
                          ({msg.is_internal_note ? 'Internal Note' : (msg.sender_role || 'Staff')})
                        </span>
                      </span>
                      <span className="text-[11px] text-slate-500 font-normal">
                        {formatDateTime(msg.created_at)}
                      </span>
                    </div>
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                  </div>
                ))
              )}
            </div>

            {/* Reply Input Box */}
            <div className="pt-3 border-t border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <label className="text-slate-700 font-medium">Add Reply or Note</label>
                <label className="flex items-center gap-1.5 text-amber-900 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={isInternalNote}
                    onChange={e => setIsInternalNote(e.target.checked)}
                    className="rounded bg-slate-50 border-slate-200"
                  />
                  Internal Staff Note Only
                </label>
              </div>

              <textarea
                rows="3"
                placeholder={isInternalNote ? "Record private staff thoughts (never visible to student fellow)..." : "Type reply visible to student fellow..."}
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
              ></textarea>

              <button
                type="button"
                disabled={!replyText.trim() || isSubmittingReply}
                onClick={handleSendReply}
                className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Send size={13} /> {isSubmittingReply ? 'Dispatching...' : (isInternalNote ? 'Save Private Note' : 'Send Student Reply')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
