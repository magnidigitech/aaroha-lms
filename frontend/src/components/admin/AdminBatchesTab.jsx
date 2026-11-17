import React, { useState, useEffect } from 'react';
import {
  Layers, PlusCircle, Calendar, Users, GraduationCap,
  MapPin, CheckCircle2, Clock, AlertCircle, X, Search,
  Edit3, UserMinus, UserPlus, Check, ChevronDown, Archive, Trash2, RotateCcw,
  AlertTriangle, ShieldAlert
} from 'lucide-react';
import { formatDate, getAccessWindowInfo } from '../../adminUtils';
import api from '../../apiService';

export default function AdminBatchesTab({
  batches = [],
  courses = [],
  faculty = [],
  coordinators = [],
  onCreateBatch,
  onUpdateBatch
}) {
  const [rosterView, setRosterView] = useState('active'); // 'active' | 'archived'
  const [archivedBatches, setArchivedBatches] = useState([]);
  const [isArchivedLoading, setIsArchivedLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Load archived batches from database
  const loadArchivedBatches = async () => {
    try {
      setIsArchivedLoading(true);
      const res = await api.adminGetBatches({ view: 'archived' });
      if (res && res.batches) {
        setArchivedBatches(res.batches);
      }
    } catch (err) {
      console.warn('Failed to load archived batches:', err);
    } finally {
      setIsArchivedLoading(false);
    }
  };

  useEffect(() => {
    if (rosterView === 'archived') {
      loadArchivedBatches();
    }
  }, [rosterView]);

  // Delete / Dependency Assessment Modal State
  const [deleteBatchModal, setDeleteBatchModal] = useState({
    isOpen: false,
    batch: null,
    isChecking: false,
    eligibility: null,
    confirmText: '',
    isSubmitting: false,
    error: ''
  });

  const handleOpenDeleteBatch = async (batch) => {
    setDeleteBatchModal({
      isOpen: true,
      batch,
      isChecking: true,
      eligibility: null,
      confirmText: '',
      isSubmitting: false,
      error: ''
    });
    try {
      const res = await api.adminCheckBatchDeletion(batch.id);
      setDeleteBatchModal(prev => ({
        ...prev,
        isChecking: false,
        eligibility: res
      }));
    } catch (err) {
      setDeleteBatchModal(prev => ({
        ...prev,
        isChecking: false,
        error: err.message || 'Failed to inspect cohort dependencies.'
      }));
    }
  };

  const handleExecutePermanentDelete = async () => {
    if (!deleteBatchModal.batch || deleteBatchModal.confirmText !== 'DELETE') return;
    try {
      setDeleteBatchModal(prev => ({ ...prev, isSubmitting: true, error: '' }));
      await api.adminDeleteBatch(deleteBatchModal.batch.id, { permanent: true });
      setDeleteBatchModal({ isOpen: false, batch: null, isChecking: false, eligibility: null, confirmText: '', isSubmitting: false, error: '' });
      if (onUpdateBatch) await onUpdateBatch();
      if (rosterView === 'archived') await loadArchivedBatches();
    } catch (err) {
      setDeleteBatchModal(prev => ({ ...prev, isSubmitting: false, error: err.message || 'Failed to permanently delete cohort batch.' }));
    }
  };

  const handleArchiveFromModal = async () => {
    if (!deleteBatchModal.batch) return;
    try {
      setDeleteBatchModal(prev => ({ ...prev, isSubmitting: true, error: '' }));
      await api.adminArchiveBatch(deleteBatchModal.batch.id);
      setDeleteBatchModal({ isOpen: false, batch: null, isChecking: false, eligibility: null, confirmText: '', isSubmitting: false, error: '' });
      if (onUpdateBatch) await onUpdateBatch();
      if (rosterView === 'archived') await loadArchivedBatches();
    } catch (err) {
      setDeleteBatchModal(prev => ({ ...prev, isSubmitting: false, error: err.message || 'Failed to archive cohort batch.' }));
    }
  };

  const handleRestoreBatch = async (batchId) => {
    try {
      await api.adminRestoreBatch(batchId);
      if (onUpdateBatch) await onUpdateBatch();
      if (rosterView === 'archived') await loadArchivedBatches();
    } catch (err) {
      alert('Failed to restore batch: ' + err.message);
    }
  };

  // Super Admin Cleanup Modal State
  const [cleanupModal, setCleanupModal] = useState({
    isOpen: false,
    confirmText: '',
    isSubmitting: false,
    result: null,
    error: ''
  });

  const handleExecuteCleanup = async () => {
    if (cleanupModal.confirmText !== 'CLEANUP-TESTS') return;
    try {
      setCleanupModal(prev => ({ ...prev, isSubmitting: true, error: '' }));
      const res = await api.adminCleanupTestBatches();
      setCleanupModal(prev => ({ ...prev, isSubmitting: false, result: res }));
      if (onUpdateBatch) await onUpdateBatch();
      if (rosterView === 'archived') await loadArchivedBatches();
    } catch (err) {
      setCleanupModal(prev => ({ ...prev, isSubmitting: false, error: err.message || 'Failed to clean up test batches.' }));
    }
  };

  // Editing Batch State
  const [editingBatch, setEditingBatch] = useState(null);

  // Batch Roster / Enrolment Management State
  const [rosterBatch, setRosterBatch] = useState(null);
  const [rosterStudents, setRosterStudents] = useState([]);
  const [isRosterLoading, setIsRosterLoading] = useState(false);
  const [selectedStudentToEnroll, setSelectedStudentToEnroll] = useState('');
  const [allStudents, setAllStudents] = useState([]);
  const [withdrawModal, setWithdrawModal] = useState({ isOpen: false, student: null, reason: '' });

  const [newBatch, setNewBatch] = useState({
    course_id: '',
    batch_code: '',
    title: '',
    start_date: '',
    end_date: '',
    capacity: 30,
    delivery_mode: 'Online Live',
    timezone: 'Asia/Kolkata',
    lead_faculty_id: ''
  });

  // Filter batches: only filters displayed records, never writes to backend
  const currentBatchList = rosterView === 'archived' ? archivedBatches : batches;
  const filteredBatches = currentBatchList.filter(b => {
    const matchesSearch = !searchTerm ||
      (b.batch_code && b.batch_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (b.title && b.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (b.course_title && b.course_title.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCourse = courseFilter === 'all' || String(b.course_id) === String(courseFilter);
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesCourse && matchesStatus;
  });

  // Check duplicate batch code on create
  const isCreateCodeDuplicate = newBatch.batch_code.trim() &&
    batches.some(b => b.batch_code && b.batch_code.toLowerCase() === newBatch.batch_code.trim().toLowerCase());

  // Check duplicate batch code on edit
  const isEditCodeDuplicate = editingBatch && editingBatch.batch_code.trim() &&
    batches.some(b => b.id !== editingBatch.id && b.batch_code && b.batch_code.toLowerCase() === editingBatch.batch_code.trim().toLowerCase());

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!newBatch.course_id || !newBatch.batch_code || !newBatch.title || !newBatch.start_date || !newBatch.end_date) {
      setFormError('Please fill in all required fields.');
      return;
    }
    if (isCreateCodeDuplicate) {
      setFormError('Batch code already exists. Please choose a unique batch code.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onCreateBatch(newBatch);
      setIsCreateModalOpen(false);
      setNewBatch({
        course_id: '',
        batch_code: '',
        title: '',
        start_date: '',
        end_date: '',
        capacity: 30,
        delivery_mode: 'Online Live',
        timezone: 'Asia/Kolkata',
        lead_faculty_id: ''
      });
    } catch (err) {
      setFormError(err.message || 'Failed to create cohort batch.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!editingBatch.title || !editingBatch.batch_code || !editingBatch.start_date || !editingBatch.end_date) {
      setFormError('Please fill in all required fields.');
      return;
    }
    if (isEditCodeDuplicate) {
      setFormError('Batch code already exists. Please choose a unique batch code.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.adminUpdateBatch(editingBatch.id, {
        batch_code: editingBatch.batch_code,
        title: editingBatch.title,
        start_date: editingBatch.start_date,
        end_date: editingBatch.end_date,
        capacity: editingBatch.capacity,
        delivery_mode: editingBatch.delivery_mode,
        timezone: editingBatch.timezone,
        lead_faculty_id: editingBatch.lead_faculty_id || null
      });
      if (onUpdateBatch) await onUpdateBatch();
      setEditingBatch(null);
    } catch (err) {
      setFormError(err.message || 'Failed to update batch details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (batchId, newStatus) => {
    try {
      await api.adminUpdateBatchStatus(batchId, newStatus);
      if (onUpdateBatch) await onUpdateBatch();
    } catch (err) {
      alert('Error updating batch status: ' + err.message);
    }
  };

  // Open Roster & Load Enrolled Students
  const handleOpenRoster = async (batch) => {
    setRosterBatch(batch);
    setIsRosterLoading(true);
    try {
      const [rosterRes, studentsRes] = await Promise.all([
        api.adminGetBatchStudents(batch.id),
        api.adminGetStudents()
      ]);
      if (rosterRes && rosterRes.students) {
        setRosterStudents(rosterRes.students);
      }
      if (studentsRes && studentsRes.students) {
        setAllStudents(studentsRes.students);
      }
    } catch (err) {
      console.warn('Failed to load roster:', err);
    } finally {
      setIsRosterLoading(false);
    }
  };

  const handleEnrollStudentInBatch = async () => {
    if (!selectedStudentToEnroll || !rosterBatch) return;
    try {
      setIsSubmitting(true);
      await api.adminEnrollBatchStudent(rosterBatch.id, { student_user_id: selectedStudentToEnroll });
      const rosterRes = await api.adminGetBatchStudents(rosterBatch.id);
      if (rosterRes && rosterRes.students) {
        setRosterStudents(rosterRes.students);
      }
      setSelectedStudentToEnroll('');
      if (onUpdateBatch) await onUpdateBatch();
    } catch (err) {
      alert('Failed to enroll student: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmWithdraw = async () => {
    if (!withdrawModal.student || !rosterBatch) return;
    try {
      setIsSubmitting(true);
      await api.adminWithdrawBatchStudent(rosterBatch.id, withdrawModal.student.user_id, {
        reason: withdrawModal.reason || 'Administrative withdrawal'
      });
      const rosterRes = await api.adminGetBatchStudents(rosterBatch.id);
      if (rosterRes && rosterRes.students) {
        setRosterStudents(rosterRes.students);
      }
      setWithdrawModal({ isOpen: false, student: null, reason: '' });
      if (onUpdateBatch) await onUpdateBatch();
    } catch (err) {
      alert('Failed to withdraw student: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Batches</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Administer cohort batches, delivery modes, seat capacities, faculty assignments, and student enrolments.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setCleanupModal({ isOpen: true, confirmText: '', isSubmitting: false, result: null, error: '' })}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors cursor-pointer"
            title="Clean up disposable test cohorts"
          >
            <ShieldAlert size={14} className="text-amber-600" />
            <span>Clean Up Test Batches</span>
          </button>

          <button
            onClick={() => {
              setFormError('');
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0a7cb3] hover:bg-[#086491] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <PlusCircle size={15} /> Create Batch
          </button>
        </div>
      </div>

      {/* Roster View Toggle: Active vs Archived */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setRosterView('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              rosterView === 'active'
                ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active Cohorts ({batches.length})
          </button>
          <button
            type="button"
            onClick={() => setRosterView('archived')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              rosterView === 'archived'
                ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Archived Batches ({archivedBatches.length})
          </button>
        </div>
      </div>

      {/* Filter bar: Separated strictly from data modification */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search batches by code, title, or course..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 placeholder-slate-400 text-xs focus:outline-hidden focus:border-[#0a7cb3] focus:ring-1 focus:ring-[#0a7cb3]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Course Filter */}
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs focus:outline-hidden focus:border-[#0a7cb3] cursor-pointer"
          >
            <option value="all">All Courses</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs focus:outline-hidden focus:border-[#0a7cb3] cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="upcoming">Upcoming</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Batches Empty State or Grid */}
      {filteredBatches.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-white border border-slate-200 shadow-xs">
          {batches.length === 0 ? (
            <div className="max-w-xs mx-auto space-y-3">
              <div className="w-10 h-10 rounded-full bg-sky-50 text-[#0a7cb3] flex items-center justify-center mx-auto">
                <Layers size={20} />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">No batches yet</h3>
              <p className="text-xs text-slate-500">
                Create a cohort batch to schedule live lectures and assign enrolled students.
              </p>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0a7cb3] hover:bg-[#086491] text-white text-xs font-semibold cursor-pointer"
              >
                <PlusCircle size={15} /> Create Batch
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-slate-700 font-medium">No batches match the filter criteria.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setCourseFilter('all');
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBatches.map((b) => {
            const cap = Number(b.capacity) || 30;
            const enrolled = Number(b.enrolled_count) || 0;
            const pct = Math.min(100, Math.round((enrolled / cap) * 100));

            return (
              <div
                key={b.id}
                className="p-5 rounded-xl bg-white border border-slate-200 flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors shadow-xs"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono font-bold text-sm text-[#0A7CB3] px-2.5 py-1 rounded bg-sky-50 border border-sky-200">
                      {b.batch_code}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-semibold ${
                      b.status === 'active'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        : b.status === 'upcoming'
                        ? 'bg-blue-100 text-blue-900 border border-blue-200'
                        : b.status === 'completed'
                        ? 'bg-purple-100 text-purple-900 border border-purple-200'
                        : b.status === 'cancelled'
                        ? 'bg-rose-100 text-rose-900 border border-rose-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {b.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{b.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{b.course_title}</p>
                  </div>

                  {/* Seat Capacity Progress */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Users size={13} /> Enrollment
                      </span>
                      <span className="font-mono text-slate-900 font-medium">
                        {enrolled} / {cap} seats ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          pct >= 90 ? 'bg-amber-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Details List */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-500">
                    <div className="flex items-center justify-between">
                      <span>Dates:</span>
                      <span className="text-slate-800">{formatDate(b.start_date)} - {formatDate(b.end_date)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Delivery Mode:</span>
                      <span className="text-[#086491] font-medium">{b.delivery_mode}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Lead Faculty:</span>
                      <span className="text-slate-800 font-medium">{b.lead_faculty_name || 'Unassigned'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Timezone:</span>
                      <span className="text-slate-500 font-mono">{b.timezone || 'Asia/Kolkata'}</span>
                    </div>
                  </div>
                </div>

                {/* Batch Action Bar */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs flex-wrap">
                  <div className="flex items-center gap-1.5">
                    {/* Manage Enrolments */}
                    <button
                      type="button"
                      onClick={() => handleOpenRoster(b)}
                      className="px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-200 text-[#086491] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Manage student enrollments and roster"
                    >
                      <Users size={13} />
                      <span>Roster ({enrolled})</span>
                    </button>

                    {/* Edit Batch */}
                    <button
                      type="button"
                      onClick={() => {
                        setFormError('');
                        setEditingBatch({ ...b });
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Edit cohort dates, capacity, or delivery mode"
                    >
                      <Edit3 size={13} />
                      <span>Edit</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Lifecycle Status Selector */}
                    <select
                      value={b.status}
                      onChange={(e) => handleStatusChange(b.id, e.target.value)}
                      className="px-2 py-1 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium text-[11px] cursor-pointer focus:outline-hidden focus:border-[#0a7cb3]"
                      title="Change Batch Status"
                    >
                      <option value="active">Active</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="archived">Archived</option>
                    </select>

                    {b.status === 'archived' && (
                      <button
                        type="button"
                        onClick={() => handleRestoreBatch(b.id)}
                        className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
                        title="Restore Archived Cohort Batch"
                      >
                        <RotateCcw size={12} />
                      </button>
                    )}

                    {/* Delete / Dependency Review Button (Always discoverable) */}
                    <button
                      type="button"
                      onClick={() => handleOpenDeleteBatch(b)}
                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Review Deletion Dependencies / Archive Cohort"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: CREATE BATCH MODAL                                   */}
      {/* ------------------------------------------------------------- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Create Cohort Batch</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 max-w-full overflow-hidden">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
                <span className="break-words break-all max-w-full overflow-hidden leading-relaxed">{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} noValidate className="space-y-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Parent Course *</label>
                <select
                  required
                  value={newBatch.course_id}
                  onChange={e => setNewBatch({ ...newBatch, course_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-[#0a7cb3] focus:outline-hidden"
                >
                  <option value="">-- Select Parent Course --</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Batch Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DCA-2026-B3"
                    value={newBatch.batch_code}
                    onChange={e => setNewBatch({ ...newBatch, batch_code: e.target.value.toUpperCase() })}
                    className={`w-full px-3 py-2 rounded-lg bg-slate-50 border text-slate-900 font-mono uppercase focus:outline-hidden ${
                      isCreateCodeDuplicate ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200 focus:border-[#0a7cb3]'
                    }`}
                  />
                  {isCreateCodeDuplicate && (
                    <span className="text-[10px] text-rose-600 mt-1 block">Batch code already in use</span>
                  )}
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Seat Capacity</label>
                  <input
                    type="number"
                    min="5"
                    max="200"
                    value={newBatch.capacity}
                    onChange={e => setNewBatch({ ...newBatch, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-[#0a7cb3] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Batch Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DCA Spring 2026 Executive Cohort"
                  value={newBatch.title}
                  onChange={e => setNewBatch({ ...newBatch, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-[#0a7cb3] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={newBatch.start_date}
                    onChange={e => setNewBatch({ ...newBatch, start_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-[#0a7cb3] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={newBatch.end_date}
                    onChange={e => setNewBatch({ ...newBatch, end_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-[#0a7cb3] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Delivery Mode</label>
                  <select
                    value={newBatch.delivery_mode}
                    onChange={e => setNewBatch({ ...newBatch, delivery_mode: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-[#0a7cb3] focus:outline-hidden"
                  >
                    <option value="Online Live">Online Live</option>
                    <option value="Classroom Hybrid">Classroom Hybrid</option>
                    <option value="In-Person Immersion">In-Person Immersion</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Lead Faculty</label>
                  <select
                    value={newBatch.lead_faculty_id}
                    onChange={e => setNewBatch({ ...newBatch, lead_faculty_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-[#0a7cb3] focus:outline-hidden"
                  >
                    <option value="">-- Unassigned --</option>
                    {faculty.map(f => (
                      <option key={f.user_id} value={f.user_id}>{f.full_name} ({f.faculty_id_code || 'Faculty'})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isCreateCodeDuplicate}
                  className="px-4 py-2 rounded-lg bg-[#0a7cb3] hover:bg-[#086491] disabled:opacity-50 text-white font-semibold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Creating...' : 'Create Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: EDIT BATCH MODAL                                     */}
      {/* ------------------------------------------------------------- */}
      {editingBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Edit Cohort Batch: {editingBatch.batch_code}</h2>
              <button onClick={() => setEditingBatch(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 max-w-full overflow-hidden">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
                <span className="break-words break-all max-w-full overflow-hidden leading-relaxed">{formError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} noValidate className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Batch Code *</label>
                  <input
                    type="text"
                    required
                    value={editingBatch.batch_code}
                    onChange={e => setEditingBatch({ ...editingBatch, batch_code: e.target.value.toUpperCase() })}
                    className={`w-full px-3 py-2 rounded-lg bg-slate-50 border text-slate-900 font-mono uppercase focus:outline-hidden ${
                      isEditCodeDuplicate ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200 focus:border-[#0a7cb3]'
                    }`}
                  />
                  {isEditCodeDuplicate && (
                    <span className="text-[10px] text-rose-600 mt-1 block">Batch code already in use</span>
                  )}
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Seat Capacity</label>
                  <input
                    type="number"
                    min="5"
                    max="200"
                    value={editingBatch.capacity}
                    onChange={e => setEditingBatch({ ...editingBatch, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-[#0a7cb3] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Batch Title *</label>
                <input
                  type="text"
                  required
                  value={editingBatch.title}
                  onChange={e => setEditingBatch({ ...editingBatch, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-[#0a7cb3] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={editingBatch.start_date || ''}
                    onChange={e => setEditingBatch({ ...editingBatch, start_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-[#0a7cb3] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={editingBatch.end_date || ''}
                    onChange={e => setEditingBatch({ ...editingBatch, end_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-[#0a7cb3] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Delivery Mode</label>
                  <select
                    value={editingBatch.delivery_mode || 'Online Live'}
                    onChange={e => setEditingBatch({ ...editingBatch, delivery_mode: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-[#0a7cb3] focus:outline-hidden"
                  >
                    <option value="Online Live">Online Live</option>
                    <option value="Classroom Hybrid">Classroom Hybrid</option>
                    <option value="In-Person Immersion">In-Person Immersion</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Lead Faculty</label>
                  <select
                    value={editingBatch.lead_faculty_id || ''}
                    onChange={e => setEditingBatch({ ...editingBatch, lead_faculty_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-[#0a7cb3] focus:outline-hidden"
                  >
                    <option value="">-- Unassigned --</option>
                    {faculty.map(f => (
                      <option key={f.user_id} value={f.user_id}>{f.full_name} ({f.faculty_id_code || 'Faculty'})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setEditingBatch(null)}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isEditCodeDuplicate}
                  className="px-4 py-2 rounded-lg bg-[#0a7cb3] hover:bg-[#086491] disabled:opacity-50 text-white font-semibold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: MANAGE BATCH ENROLMENTS & ROSTER                     */}
      {/* ------------------------------------------------------------- */}
      {rosterBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl text-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-[#0a7cb3] bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    {rosterBatch.batch_code}
                  </span>
                  <h2 className="text-base font-bold text-slate-900">Student Enrolment Roster</h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {rosterBatch.title} • {rosterStudents.length} / {rosterBatch.capacity} enrolled students
                </p>
              </div>
              <button onClick={() => setRosterBatch(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Quick Enrol Bar */}
            <div className="p-4 bg-white border-b border-slate-100 flex items-center gap-2">
              <select
                value={selectedStudentToEnroll}
                onChange={e => setSelectedStudentToEnroll(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-hidden focus:border-[#0a7cb3]"
              >
                <option value="">-- Enrol an Existing Student into this Cohort --</option>
                {allStudents
                  .filter(s => !rosterStudents.some(r => r.user_id === s.user_id))
                  .map(s => (
                    <option key={s.user_id} value={s.user_id}>
                      {s.full_name} ({s.email}) - {s.student_id_code}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                disabled={!selectedStudentToEnroll || isSubmitting}
                onClick={handleEnrollStudentInBatch}
                className="px-3.5 py-2 rounded-lg bg-[#0a7cb3] hover:bg-[#086491] disabled:opacity-40 text-white font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus size={14} /> Enrol Student
              </button>
            </div>

            {/* Enrolled Students Table */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {isRosterLoading ? (
                <div className="py-12 text-center text-slate-500">Loading cohort roster...</div>
              ) : rosterStudents.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <Users size={28} className="mx-auto text-slate-300" />
                  <p className="text-sm font-semibold text-slate-700">No students enrolled yet</p>
                  <p className="text-xs text-slate-400">Use the enrolment selector above to assign admitted students to this batch.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Contact</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Access Expiry</th>
                      <th className="py-2.5 px-3">Enrolled At</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {rosterStudents.map((s) => {
                      const win = getAccessWindowInfo(s.expires_at);
                      const isPending = s.access_status === 'pending_activation';
                      return (
                      <tr key={s.user_id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-medium text-slate-900">
                          {s.full_name}
                          <span className="block text-[11px] font-mono text-[#0a7cb3]">{s.student_id_code}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{s.email}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                            s.enrollment_status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {s.enrollment_status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {isPending ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              Pending Activation
                            </span>
                          ) : win.isExpired ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              Expired ({formatDate(s.expires_at)})
                            </span>
                          ) : win.isExpiringSoon ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              {formatDate(s.expires_at)} ({win.remainingDays}d)
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-700 font-medium">
                              {s.expires_at ? formatDate(s.expires_at) : 'Active'}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{formatDate(s.enrolled_at)}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setWithdrawModal({ isOpen: true, student: s, reason: '' })}
                            className="text-rose-600 hover:text-rose-800 font-medium hover:underline cursor-pointer"
                          >
                            Withdraw
                          </button>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setRosterBatch(null)}
                className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold cursor-pointer"
              >
                Close Roster
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 4: WITHDRAW STUDENT CONFIRMATION (Requires Reason)       */}
      {/* ------------------------------------------------------------- */}
      {withdrawModal.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Withdraw Student from Cohort</h3>
                <p className="text-slate-600 leading-relaxed">
                  Withdraw <strong className="text-slate-900">{withdrawModal.student?.full_name}</strong> from batch{' '}
                  <strong className="text-slate-900">{rosterBatch?.batch_code}</strong>.
                </p>
                <p className="text-slate-500 text-[11px] mt-1">
                  Note: Withdrawing does NOT delete the student account. Previous attendance, scores, and historical batch records are strictly preserved.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Reason for Withdrawal *</label>
              <textarea
                required
                rows="3"
                placeholder="State the academic or administrative reason for withdrawal..."
                value={withdrawModal.reason}
                onChange={e => setWithdrawModal({ ...withdrawModal, reason: e.target.value })}
                className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setWithdrawModal({ isOpen: false, student: null, reason: '' })}
                className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!withdrawModal.reason.trim() || isSubmitting}
                onClick={handleConfirmWithdraw}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-semibold cursor-pointer"
              >
                {isSubmitting ? 'Withdrawing...' : 'Confirm Withdrawal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: COHORT DELETION & ARCHIVE DEPENDENCY REVIEW            */}
      {/* ------------------------------------------------------------- */}
      {deleteBatchModal.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Cohort Deletion & Archive Assessment</h3>
                  <p className="text-slate-500 text-xs">
                    <span className="font-mono font-semibold text-[#0a7cb3]">{deleteBatchModal.batch?.batch_code}</span> — {deleteBatchModal.batch?.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeleteBatchModal({ isOpen: false, batch: null, isChecking: false, eligibility: null, confirmText: '', isSubmitting: false, error: '' })}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {deleteBatchModal.isChecking ? (
              <div className="py-8 text-center text-slate-500 space-y-2">
                <div className="animate-spin w-6 h-6 border-2 border-[#0a7cb3] border-t-transparent rounded-full mx-auto" />
                <p className="font-medium text-xs">Analyzing cohort dependencies across academic records...</p>
              </div>
            ) : deleteBatchModal.eligibility ? (
              <div className="space-y-4">
                {/* Dependency Summary Grid */}
                <div className="space-y-2">
                  <span className="text-slate-700 font-semibold block text-xs">Academic Dependency Summary:</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
                      <span className="text-slate-500 text-[10px] block uppercase font-medium">Students</span>
                      <span className={`text-base font-bold ${deleteBatchModal.eligibility.dependencies?.enrolled_students > 0 ? 'text-amber-700 font-mono' : 'text-slate-800 font-mono'}`}>
                        {deleteBatchModal.eligibility.dependencies?.enrolled_students || 0}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
                      <span className="text-slate-500 text-[10px] block uppercase font-medium">Faculty</span>
                      <span className={`text-base font-bold ${deleteBatchModal.eligibility.dependencies?.faculty_assignments > 0 ? 'text-amber-700 font-mono' : 'text-slate-800 font-mono'}`}>
                        {deleteBatchModal.eligibility.dependencies?.faculty_assignments || 0}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
                      <span className="text-slate-500 text-[10px] block uppercase font-medium">Sessions</span>
                      <span className={`text-base font-bold ${deleteBatchModal.eligibility.dependencies?.scheduled_sessions > 0 ? 'text-amber-700 font-mono' : 'text-slate-800 font-mono'}`}>
                        {deleteBatchModal.eligibility.dependencies?.scheduled_sessions || 0}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
                      <span className="text-slate-500 text-[10px] block uppercase font-medium">Attendance</span>
                      <span className={`text-base font-bold ${deleteBatchModal.eligibility.dependencies?.attendance_records > 0 ? 'text-amber-700 font-mono' : 'text-slate-800 font-mono'}`}>
                        {deleteBatchModal.eligibility.dependencies?.attendance_records || 0}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
                      <span className="text-slate-500 text-[10px] block uppercase font-medium">Submissions</span>
                      <span className={`text-base font-bold ${deleteBatchModal.eligibility.dependencies?.task_submissions > 0 ? 'text-amber-700 font-mono' : 'text-slate-800 font-mono'}`}>
                        {deleteBatchModal.eligibility.dependencies?.task_submissions || 0}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
                      <span className="text-slate-500 text-[10px] block uppercase font-medium">Certificates</span>
                      <span className={`text-base font-bold ${deleteBatchModal.eligibility.dependencies?.issued_certificates > 0 ? 'text-amber-700 font-mono' : 'text-slate-800 font-mono'}`}>
                        {deleteBatchModal.eligibility.dependencies?.issued_certificates || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {deleteBatchModal.eligibility.can_delete_permanently ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1">
                      <span className="font-semibold block flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-700" />
                        Zero Academic Dependencies Detected
                      </span>
                      <p className="text-[11px] text-emerald-800">
                        This batch contains no enrolled students, faculty assignments, scheduled classes, attendance records, task submissions, or issued certificates. It can be safely and permanently removed.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-slate-700 font-medium text-[11px]">
                        To confirm permanent deletion, please type <strong className="text-slate-900 font-mono">DELETE</strong> below:
                      </label>
                      <input
                        type="text"
                        placeholder="Type DELETE to confirm"
                        value={deleteBatchModal.confirmText}
                        onChange={e => setDeleteBatchModal(prev => ({ ...prev, confirmText: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-rose-500 font-mono text-xs"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                      <div className="flex items-center gap-1.5 font-semibold text-amber-800">
                        <AlertTriangle size={15} />
                        <span>Permanent Deletion Blocked</span>
                      </div>
                      <p className="text-[11px] text-amber-800">
                        This cohort has linked academic records. Deleting it permanently would violate data retention policies and compromise student transcripts.
                      </p>
                      {deleteBatchModal.eligibility.blocking_reasons && deleteBatchModal.eligibility.blocking_reasons.length > 0 && (
                        <ul className="list-disc list-inside text-[11px] space-y-0.5 text-amber-900 font-medium pt-1">
                          {deleteBatchModal.eligibility.blocking_reasons.map((reason, idx) => (
                            <li key={idx}>{reason}</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="p-3 rounded-lg bg-sky-50 border border-sky-200 text-sky-900 text-xs space-y-1">
                      <span className="font-semibold block text-[#086491]">Recommended Resolution:</span>
                      <p className="text-[11px] text-sky-800">
                        <strong>Archive this cohort batch instead.</strong> Archiving removes it from active course dropdowns and scheduling calendars while safely preserving all student submissions, attendance records, and certificates.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {deleteBatchModal.error && (
              <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs break-words break-all max-w-full overflow-hidden leading-relaxed">
                {deleteBatchModal.error}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <div>
                {deleteBatchModal.eligibility && !deleteBatchModal.eligibility.can_delete_permanently && deleteBatchModal.eligibility.dependencies?.enrolled_students > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const b = deleteBatchModal.batch;
                      setDeleteBatchModal({ isOpen: false, batch: null, isChecking: false, eligibility: null, confirmText: '', isSubmitting: false, error: '' });
                      if (b) handleOpenRoster(b);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-200 text-[#086491] font-semibold text-xs cursor-pointer flex items-center gap-1"
                  >
                    <Users size={13} /> Manage Roster
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={deleteBatchModal.isSubmitting}
                  onClick={() => setDeleteBatchModal({ isOpen: false, batch: null, isChecking: false, eligibility: null, confirmText: '', isSubmitting: false, error: '' })}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                {deleteBatchModal.eligibility?.can_delete_permanently ? (
                  <button
                    type="button"
                    disabled={deleteBatchModal.isSubmitting || deleteBatchModal.confirmText !== 'DELETE'}
                    onClick={handleExecutePermanentDelete}
                    className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-semibold cursor-pointer"
                  >
                    {deleteBatchModal.isSubmitting ? 'Deleting...' : 'Permanently Delete'}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={deleteBatchModal.isSubmitting}
                    onClick={handleArchiveFromModal}
                    className="px-4 py-2 rounded-lg bg-[#0a7cb3] hover:bg-[#086491] text-white font-semibold cursor-pointer flex items-center gap-1.5"
                  >
                    <Archive size={14} />
                    <span>{deleteBatchModal.isSubmitting ? 'Archiving...' : 'Archive Batch Instead'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: SUPER ADMIN CLEANUP DISPOSABLE TEST BATCHES            */}
      {/* ------------------------------------------------------------- */}
      {cleanupModal.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Clean Up Disposable Test Batches</h3>
                <p className="text-slate-600 leading-relaxed text-xs">
                  This administrative utility deletes unlinked test cohorts that were generated during testing (e.g. cohorts with no student submissions or certificates).
                </p>
                <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                  Academic cohorts with student enrollments or completion records are strictly protected and will not be touched.
                </div>
              </div>
            </div>

            {cleanupModal.result ? (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
                {cleanupModal.result.message || 'Cleanup completed successfully.'}
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-slate-700 font-medium text-[11px]">
                  Type <strong className="text-slate-900 font-mono">CLEANUP-TESTS</strong> to confirm:
                </label>
                <input
                  type="text"
                  placeholder="Type CLEANUP-TESTS"
                  value={cleanupModal.confirmText}
                  onChange={e => setCleanupModal(prev => ({ ...prev, confirmText: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-amber-500 font-mono text-xs"
                />
              </div>
            )}

            {cleanupModal.error && (
              <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs break-words break-all max-w-full overflow-hidden leading-relaxed">
                {cleanupModal.error}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCleanupModal({ isOpen: false, confirmText: '', isSubmitting: false, result: null, error: '' })}
                className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                {cleanupModal.result ? 'Close' : 'Cancel'}
              </button>
              {!cleanupModal.result && (
                <button
                  type="button"
                  disabled={cleanupModal.isSubmitting || cleanupModal.confirmText !== 'CLEANUP-TESTS'}
                  onClick={handleExecuteCleanup}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-semibold cursor-pointer"
                >
                  {cleanupModal.isSubmitting ? 'Cleaning up...' : 'Execute Cleanup'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
