import React, { useState } from 'react';
import {
  AlertTriangle, Clock, CheckCircle2, User, PlusCircle,
  MessageSquare, Calendar, Search, Filter, X
} from 'lucide-react';
import { formatDate } from '../../adminUtils';

export default function AdminFollowupsTab({
  followups = [],
  students = [],
  batches = [],
  onCreateFollowup,
  onUpdateFollowup
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reasonFilter, setReasonFilter] = useState('all');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [updateModalItem, setUpdateModalItem] = useState(null);
  const [updateStatus, setUpdateStatus] = useState('resolved');
  const [resolutionNotes, setResolutionNotes] = useState('');

  const [newFollowup, setNewFollowup] = useState({
    user_id: '',
    batch_id: '',
    reason: 'low_attendance',
    description: '',
    priority: 'medium',
    next_followup_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]
  });

  const filteredFollowups = followups.filter(f => {
    const matchesSearch = !searchTerm ||
      (f.student_name && f.student_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (f.student_id_code && f.student_id_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (f.description && f.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
    const matchesReason = reasonFilter === 'all' || f.reason === reasonFilter;

    return matchesSearch && matchesStatus && matchesReason;
  });

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newFollowup.user_id || !newFollowup.description) return;

    await onCreateFollowup(newFollowup);
    setIsCreateModalOpen(false);
    setNewFollowup({
      user_id: '',
      batch_id: '',
      reason: 'low_attendance',
      description: '',
      priority: 'medium',
      next_followup_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]
    });
  };

  const handleCommitUpdate = async () => {
    if (!updateModalItem) return;
    await onUpdateFollowup(updateModalItem.id, {
      status: updateStatus,
      resolution_notes: resolutionNotes
    });
    setUpdateModalItem(null);
    setResolutionNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Student Success & Academic Follow-up Triage</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Intervene early on attendance dips, missing assignments, and onboarding stalls.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-colors"
        >
          <PlusCircle size={15} /> Log Follow-up Case
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          type="text"
          placeholder="Search by student, ID, or case description..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs focus:outline-hidden focus:border-blue-500"
        />

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-hidden"
        >
          <option value="all">All Case Statuses</option>
          <option value="open">Open (Immediate Attention)</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>

        <select
          value={reasonFilter}
          onChange={e => setReasonFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-hidden"
        >
          <option value="all">All Triage Categories</option>
          <option value="low_attendance">Low Attendance (&lt; 80%)</option>
          <option value="missing_assignments">Missing Assignments</option>
          <option value="prolonged_inactivity">Prolonged Inactivity</option>
          <option value="incomplete_onboarding">Incomplete Onboarding</option>
        </select>
      </div>

      {/* Follow-up Cases Cards */}
      <div className="space-y-3">
        {filteredFollowups.length === 0 ? (
          <div className="py-12 text-center text-slate-500 bg-white border border-slate-200 rounded-xl">
            No active follow-up cases found matching filters.
          </div>
        ) : (
          filteredFollowups.map(item => (
            <div
              key={item.id}
              className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                item.status === 'resolved'
                  ? 'bg-slate-50 border-slate-200 opacity-70'
                  : 'bg-white border-slate-200 hover:border-slate-200'
              }`}
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                    item.reason === 'low_attendance'
                      ? 'bg-amber-100 text-amber-900 border border-amber-200'
                      : 'bg-blue-100 text-blue-900 border border-blue-200'
                  }`}>
                    {item.reason.replace('_', ' ')}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-semibold ${
                    item.status === 'open'
                      ? 'bg-rose-100 text-rose-900 border border-rose-200 animate-pulse'
                      : item.status === 'in_progress'
                      ? 'bg-amber-100 text-amber-900 border border-amber-200'
                      : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                  }`}>
                    {item.status.replace('_', ' ')}
                  </span>
                  {item.priority === 'urgent' && (
                    <span className="text-[10px] font-mono text-rose-700 font-bold uppercase">Urgent</span>
                  )}
                </div>

                <div className="flex items-baseline gap-2">
                  <strong className="text-slate-900 text-sm">{item.student_name}</strong>
                  <span className="text-xs font-mono text-[#0A7CB3]">({item.student_id_code})</span>
                  {item.batch_code && (
                    <span className="text-xs text-slate-500">Batch: {item.batch_code}</span>
                  )}
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">{item.description}</p>

                {item.resolution_notes && (
                  <div className="p-2 rounded bg-slate-50 border border-slate-200 text-[11px] text-emerald-900">
                    Resolution Note: {item.resolution_notes}
                  </div>
                )}

                <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-4 pt-1">
                  <span>Assigned Coordinator: <strong className="text-slate-500">{item.assigned_to_name || 'Academic Operations'}</strong></span>
                  <span>Next Follow-up Due: <strong className="text-slate-700">{formatDate(item.next_followup_date)}</strong></span>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <button
                  onClick={() => {
                    setUpdateModalItem(item);
                    setUpdateStatus(item.status === 'open' ? 'in_progress' : 'resolved');
                    setResolutionNotes(item.resolution_notes || '');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-xs"
                >
                  Update Status / Add Note
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Log Follow-up Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Log Academic Intervention Case</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-500 hover:text-slate-900">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Target Student Fellow *</label>
                <select
                  required
                  value={newFollowup.user_id}
                  onChange={e => setNewFollowup({ ...newFollowup, user_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
                >
                  <option value="">-- Choose Student --</option>
                  {students.map(s => (
                    <option key={s.user_id} value={s.user_id}>
                      {s.full_name} ({s.student_id_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Triage Reason Category</label>
                  <select
                    value={newFollowup.reason}
                    onChange={e => setNewFollowup({ ...newFollowup, reason: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
                  >
                    <option value="low_attendance">Low Attendance (&lt; 80%)</option>
                    <option value="missing_assignments">Missing Assignments</option>
                    <option value="prolonged_inactivity">Prolonged Inactivity</option>
                    <option value="incomplete_onboarding">Incomplete Onboarding</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Priority</label>
                  <select
                    value={newFollowup.priority}
                    onChange={e => setNewFollowup({ ...newFollowup, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Case Description & Observed Pattern *</label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Missed 3 consecutive live sessions on Raft consensus. Student unreachable via email."
                  value={newFollowup.description}
                  onChange={e => setNewFollowup({ ...newFollowup, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
                ></textarea>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Next Outreach Date</label>
                <input
                  type="date"
                  required
                  value={newFollowup.next_followup_date}
                  onChange={e => setNewFollowup({ ...newFollowup, next_followup_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md"
                >
                  Create Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Followup Modal */}
      {updateModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Update Case Progress</h2>
              <button onClick={() => setUpdateModalItem(null)} className="text-slate-500 hover:text-slate-900">
                <X size={18} />
              </button>
            </div>

            <div>
              <span className="text-slate-500 block">Student:</span>
              <strong className="text-slate-900 text-sm">{updateModalItem.student_name}</strong>
              <p className="text-slate-700 mt-1 italic">"{updateModalItem.description}"</p>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Case Status</label>
              <select
                value={updateStatus}
                onChange={e => setUpdateStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Resolution / Progress Notes</label>
              <textarea
                rows="3"
                placeholder="Log phone call outcome, agreed catch-up schedule, or academic support plan..."
                value={resolutionNotes}
                onChange={e => setResolutionNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
              ></textarea>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setUpdateModalItem(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCommitUpdate}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold"
              >
                Save Progress
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

