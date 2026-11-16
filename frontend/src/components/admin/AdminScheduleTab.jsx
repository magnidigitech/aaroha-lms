import React, { useState } from 'react';
import {
  Calendar, Clock, Video, MapPin, PlusCircle, AlertTriangle,
  RotateCcw, XCircle, CheckCircle2, Search, Link as LinkIcon, X, Trash2
} from 'lucide-react';
import api from '../../apiService';
import { formatDateTime } from '../../adminUtils';

export default function AdminScheduleTab({
  sessions = [],
  batches = [],
  faculty = [],
  onScheduleSession,
  onRescheduleSession,
  onCancelSession,
  onMarkAttendance
}) {
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
  const [batchFilter, setBatchFilter] = useState('all');
  const [facultyFilter, setFacultyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [deleteSessionModal, setDeleteSessionModal] = useState({
    isOpen: false,
    session: null,
    isSubmitting: false,
    error: ''
  });

  const handleOpenDeleteSession = (session) => {
    setDeleteSessionModal({
      isOpen: true,
      session,
      isSubmitting: false,
      error: ''
    });
  };

  const handleExecuteDeleteSession = async () => {
    if (!deleteSessionModal.session) return;
    try {
      setDeleteSessionModal(prev => ({ ...prev, isSubmitting: true, error: '' }));
      await api.adminDeleteScheduleSession(deleteSessionModal.session.id);
      const sessId = deleteSessionModal.session.id;
      setDeleteSessionModal({ isOpen: false, session: null, isSubmitting: false, error: '' });
      if (onCancelSession) await onCancelSession(sessId, { reason: 'Deleted from schedule' });
    } catch (err) {
      setDeleteSessionModal(prev => ({
        ...prev,
        isSubmitting: false,
        error: err.message || 'Cannot delete session because attendance has already been recorded.'
      }));
    }
  };
  const [rescheduleModalSession, setRescheduleModalSession] = useState(null);
  const [cancelModalSession, setCancelModalSession] = useState(null);

  // New session state
  const [newSession, setNewSession] = useState({
    batch_id: '',
    faculty_id: '',
    topic: '',
    description: '',
    start_time: '',
    end_time: '',
    session_type: 'Lecture',
    meeting_link: '',
    classroom_location: ''
  });

  const [rescheduleData, setRescheduleData] = useState({ start_time: '', end_time: '', reason: '' });
  const [cancelReason, setCancelReason] = useState('');
  const [conflictWarning, setConflictWarning] = useState(null);

  const filteredSessions = sessions.filter(s => {
    const matchesBatch = batchFilter === 'all' || String(s.batch_id) === String(batchFilter);
    const matchesFaculty = facultyFilter === 'all' || String(s.faculty_id) === String(facultyFilter);
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchesSearch = !searchTerm ||
      (s.topic && s.topic.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.batch_code && s.batch_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.faculty_name && s.faculty_name.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesBatch && matchesFaculty && matchesStatus && matchesSearch;
  });

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setConflictWarning(null);

    // Front-end Conflict Pre-check
    const newStart = new Date(newSession.start_time).getTime();
    const newEnd = new Date(newSession.end_time).getTime();

    if (newEnd <= newStart) {
      setConflictWarning('End time must be after start time.');
      return;
    }

    const overlap = sessions.find(s => {
      if (s.status === 'cancelled') return false;
      if (String(s.faculty_id) !== String(newSession.faculty_id)) return false;
      const sStart = new Date(s.start_time).getTime();
      const sEnd = new Date(s.end_time).getTime();
      return (newStart < sEnd && newEnd > sStart);
    });

    if (overlap) {
      setConflictWarning(
        `Schedule Conflict: Faculty is already assigned to '${overlap.topic}' (${overlap.batch_code}) from ${formatDateTime(overlap.start_time)} to ${formatDateTime(overlap.end_time)}.`
      );
      return;
    }

    await onScheduleSession(newSession);
    setIsScheduleModalOpen(false);
    setNewSession({
      batch_id: '',
      faculty_id: '',
      topic: '',
      description: '',
      start_time: '',
      end_time: '',
      session_type: 'Lecture',
      meeting_link: '',
      classroom_location: ''
    });
  };

  const handleCommitReschedule = async () => {
    if (!rescheduleModalSession || !rescheduleData.start_time || !rescheduleData.end_time) return;
    await onRescheduleSession(rescheduleModalSession.id, rescheduleData);
    setRescheduleModalSession(null);
    setRescheduleData({ start_time: '', end_time: '', reason: '' });
  };

  const handleCommitCancel = async () => {
    if (!cancelModalSession) return;
    await onCancelSession(cancelModalSession.id, { reason: cancelReason || 'Cancelled by coordinator' });
    setCancelModalSession(null);
    setCancelReason('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Class Schedule</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Coordinate live sessions, lab demonstrations, faculty assignments, and meeting links.
          </p>
        </div>

        <button
          onClick={() => setIsScheduleModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0a7cb3] hover:bg-[#086491] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <PlusCircle size={15} /> Schedule Class
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shadow-xs">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search topic, batch, faculty..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 placeholder-slate-400 text-xs focus:outline-hidden focus:border-[#0a7cb3] focus:ring-1 focus:ring-[#0a7cb3]"
          />
        </div>

        <div>
          <select
            value={batchFilter}
            onChange={e => setBatchFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs focus:outline-hidden focus:border-[#0a7cb3] cursor-pointer"
          >
            <option value="all">All Batches</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>{b.batch_code}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={facultyFilter}
            onChange={e => setFacultyFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs focus:outline-hidden focus:border-[#0a7cb3] cursor-pointer"
          >
            <option value="all">All Faculty</option>
            {faculty.map(f => (
              <option key={f.user_id} value={f.user_id}>{f.full_name}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs focus:outline-hidden focus:border-[#0a7cb3] cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="rescheduled">Rescheduled</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Sessions List */}
      <div className="space-y-3">
        {filteredSessions.length === 0 ? (
          <div className="py-12 px-4 text-center bg-white border border-slate-200 rounded-xl shadow-xs">
            {sessions.length === 0 ? (
              <div className="max-w-xs mx-auto space-y-3">
                <div className="w-10 h-10 rounded-full bg-sky-50 text-[#0a7cb3] flex items-center justify-center mx-auto">
                  <Calendar size={20} />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">No classes scheduled</h3>
                <p className="text-xs text-slate-500">
                  Schedule upcoming live lectures, doubt-clearing sessions, or mentor connects.
                </p>
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0a7cb3] hover:bg-[#086491] text-white text-xs font-semibold cursor-pointer"
                >
                  <PlusCircle size={15} /> Schedule Class
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-slate-700 font-medium">No class sessions match the current schedule filters.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setBatchFilter('all');
                    setFacultyFilter('all');
                    setStatusFilter('all');
                  }}
                  className="text-xs text-[#0a7cb3] font-semibold hover:underline cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        ) : (
          filteredSessions.map(s => (
            <div
              key={s.id}
              className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                s.status === 'cancelled'
                  ? 'bg-slate-50 border-slate-200 opacity-60'
                  : 'bg-white border-slate-200 hover:border-slate-200'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
                    {s.batch_code}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-50 text-slate-700 font-medium">
                    {s.session_type || 'Lecture'}
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold ${
                    s.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                      : s.status === 'scheduled'
                      ? 'bg-sky-50 text-[#086491] border border-sky-200'
                      : s.status === 'rescheduled'
                      ? 'bg-amber-100 text-amber-900 border border-amber-200'
                      : 'bg-rose-100 text-rose-900 border border-rose-200'
                  }`}>
                    {s.status}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{s.topic}</h3>
                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-4 mt-1">
                    <span className="flex items-center gap-1 text-slate-700">
                      <Clock size={13} className="text-[#0A7CB3]" />
                      {formatDateTime(s.start_time)} - {formatDateTime(s.end_time)}
                    </span>
                    <span>Faculty: <strong className="text-slate-900">{s.faculty_name}</strong></span>
                    {s.classroom_location && (
                      <span className="flex items-center gap-1 text-slate-500">
                        <MapPin size={13} /> {s.classroom_location}
                      </span>
                    )}
                  </div>
                </div>

                {s.cancel_reason && (
                  <p className="text-xs text-rose-700 bg-rose-50 px-2 py-1 rounded border border-rose-200">
                    Cancelled: {s.cancel_reason}
                  </p>
                )}
                {s.reschedule_reason && (
                  <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                    Rescheduled: {s.reschedule_reason}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {s.meeting_link && s.status !== 'cancelled' && (
                  <a
                    href={s.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs"
                  >
                    <Video size={13} /> Join Live
                  </a>
                )}
                {s.status !== 'cancelled' && (
                  <>
                    <button
                      onClick={() => onMarkAttendance(s.id)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                    >
                      Attendance
                    </button>
                    <button
                      onClick={() => {
                        setRescheduleModalSession(s);
                        setRescheduleData({ start_time: s.start_time, end_time: s.end_time, reason: '' });
                      }}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs"
                      title="Reschedule Session"
                    >
                      <RotateCcw size={14} />
                    </button>
                    <button
                      onClick={() => setCancelModalSession(s)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-900/60 text-slate-500 hover:text-rose-900 border border-slate-200 text-xs"
                      title="Cancel Session"
                    >
                      <XCircle size={14} />
                    </button>
                    <button
                      onClick={() => handleOpenDeleteSession(s)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-700 border border-slate-200 text-xs"
                      title="Delete Unused Session"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Schedule Session Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Schedule Class Session</h2>
              <button onClick={() => setIsScheduleModalOpen(false)} className="text-slate-500 hover:text-slate-900">
                <X size={18} />
              </button>
            </div>

            {conflictWarning && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200/80 text-rose-900 flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>{conflictWarning}</span>
              </div>
            )}

            <form onSubmit={handleCreateSession} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Batch *</label>
                  <select
                    required
                    value={newSession.batch_id}
                    onChange={e => setNewSession({ ...newSession, batch_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
                  >
                    <option value="">-- Select Batch --</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>{b.batch_code} ({b.title})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Assigned Faculty *</label>
                  <select
                    required
                    value={newSession.faculty_id}
                    onChange={e => setNewSession({ ...newSession, faculty_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
                  >
                    <option value="">-- Select Faculty --</option>
                    {faculty.map(f => (
                      <option key={f.user_id} value={f.user_id}>{f.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Topic / Lecture Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Raft Consensus Lease Management & Log Replication"
                  value={newSession.topic}
                  onChange={e => setNewSession({ ...newSession, topic: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Start Time (IST) *</label>
                  <input
                    type="datetime-local"
                    required
                    value={newSession.start_time}
                    onChange={e => setNewSession({ ...newSession, start_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">End Time (IST) *</label>
                  <input
                    type="datetime-local"
                    required
                    value={newSession.end_time}
                    onChange={e => setNewSession({ ...newSession, end_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Session Type</label>
                  <select
                    value={newSession.session_type}
                    onChange={e => setNewSession({ ...newSession, session_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
                  >
                    <option value="Lecture">Lecture</option>
                    <option value="Lab">Hands-on Lab</option>
                    <option value="Doubt Clearing">Doubt Clearing</option>
                    <option value="Mentor Connect">Mentor Connect</option>
                    <option value="Project Review">Project Review</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Live Meeting Link</label>
                  <input
                    type="url"
                    placeholder="https://meet.google.com/..."
                    value={newSession.meeting_link}
                    onChange={e => setNewSession({ ...newSession, meeting_link: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md"
                >
                  Schedule Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleModalSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Reschedule Class Session</h2>
              <button onClick={() => setRescheduleModalSession(null)} className="text-slate-500 hover:text-slate-900">
                <X size={18} />
              </button>
            </div>

            <div>
              <span className="text-slate-500 block">Session:</span>
              <strong className="text-slate-900 text-sm">{rescheduleModalSession.topic}</strong>
              <span className="text-[#0A7CB3] font-mono block">Batch: {rescheduleModalSession.batch_code}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">New Start Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={rescheduleData.start_time}
                  onChange={e => setRescheduleData({ ...rescheduleData, start_time: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">New End Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={rescheduleData.end_time}
                  onChange={e => setRescheduleData({ ...rescheduleData, end_time: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Recorded Reschedule Reason *</label>
              <textarea
                rows="2"
                placeholder="Reason for changing scheduled timetable..."
                value={rescheduleData.reason}
                onChange={e => setRescheduleData({ ...rescheduleData, reason: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
              ></textarea>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setRescheduleModalSession(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCommitReschedule}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold"
              >
                Confirm Reschedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModalSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200 text-rose-700">
              <AlertTriangle size={20} />
              <h2 className="text-base font-bold text-slate-900">Cancel Class Session</h2>
            </div>

            <p className="text-slate-700">
              Are you sure you want to cancel <strong className="text-slate-900">'{cancelModalSession.topic}'</strong> for batch{' '}
              <strong className="text-slate-900">{cancelModalSession.batch_code}</strong>?
            </p>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Recorded Cancellation Reason *</label>
              <textarea
                rows="2"
                placeholder="e.g. Faculty medical leave, public holiday, unforeseen infrastructure maintenance..."
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
              ></textarea>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setCancelModalSession(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCommitCancel}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: DELETE SCHEDULE SESSION                                */}
      {/* ------------------------------------------------------------- */}
      {deleteSessionModal.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Delete Scheduled Session</h3>
                <p className="text-slate-600 leading-relaxed">
                  Topic: <strong className="text-slate-900">{deleteSessionModal.session?.topic}</strong> ({deleteSessionModal.session?.batch_code})
                </p>
                <p className="text-slate-500 text-[11px] mt-1">
                  Safety Notice: Sessions can only be deleted if no student attendance has been marked. If attendance was already recorded, deletion is blocked to preserve academic history.
                </p>
              </div>
            </div>

            {deleteSessionModal.error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs leading-relaxed">
                {deleteSessionModal.error}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={deleteSessionModal.isSubmitting}
                onClick={() => setDeleteSessionModal({ isOpen: false, session: null, isSubmitting: false, error: '' })}
                className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteSessionModal.isSubmitting}
                onClick={handleExecuteDeleteSession}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-semibold cursor-pointer"
              >
                {deleteSessionModal.isSubmitting ? 'Deleting...' : 'Delete Session'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

