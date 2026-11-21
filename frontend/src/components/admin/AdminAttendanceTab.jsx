import React, { useState, useEffect } from 'react';
import {
  CheckCircle2, XCircle, Clock, AlertCircle, Users,
  Calendar, Download, Save, RotateCcw, Search, Check, AlertTriangle,
  Plus, BookOpen, ArrowRight, GraduationCap, X
} from 'lucide-react';
import { exportToCsv, formatDateTime } from '../../adminUtils';
import { getRouteParam, setRouteParam } from '../../routes';

export default function AdminAttendanceTab({
  sessions = [],
  batches = [],
  faculty = [],
  selectedSessionId = null,
  onFetchSessionAttendance,
  onSaveAttendance,
  onCorrectAttendance,
  onScheduleSession,
  onNavigateToSchedule,
  onNavigateToBatches
}) {
  const [activeSessionId, setActiveSessionId] = useState(() => {
    return getRouteParam('session') || sessionStorage.getItem('aaroha_admin_active_session_id') || selectedSessionId || '';
  });
  const [sessionData, setSessionData] = useState(null);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [batchFilter, setBatchFilter] = useState('all');

  useEffect(() => {
    if (activeSessionId) {
      setRouteParam('session', activeSessionId);
      try {
        sessionStorage.setItem('aaroha_admin_active_session_id', String(activeSessionId));
      } catch (e) {}
    }
  }, [activeSessionId]);

  // Correction Modal
  const [correctionRecord, setCorrectionRecord] = useState(null);
  const [newStatus, setNewStatus] = useState('present');
  const [correctionReason, setCorrectionReason] = useState('');

  // Save review confirmation modal
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Quick Schedule Modal state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
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

  // Filter sessions by chosen batch if batchFilter !== 'all'
  const filteredSessions = sessions.filter(s => {
    if (batchFilter === 'all') return true;
    return String(s.batch_id) === String(batchFilter);
  });

  // Auto-select session when sessions load or batchFilter changes
  useEffect(() => {
    if (selectedSessionId && sessions.some(s => String(s.id) === String(selectedSessionId))) {
      setActiveSessionId(selectedSessionId);
    } else if (filteredSessions.length > 0) {
      const exists = filteredSessions.some(s => String(s.id) === String(activeSessionId));
      if (!exists) {
        setActiveSessionId(filteredSessions[0].id);
      }
    } else {
      setActiveSessionId('');
      setSessionData(null);
      setRoster([]);
    }
  }, [selectedSessionId, sessions, batchFilter]);

  // Load roster when activeSessionId changes
  useEffect(() => {
    if (!activeSessionId) return;
    setLoading(true);
    setSaveSuccess(false);

    if (onFetchSessionAttendance) {
      onFetchSessionAttendance(activeSessionId)
        .then(res => {
          if (res && res.roster) {
            setSessionData(res.session);
            setRoster(res.roster.map(r => ({
              ...r,
              current_status: r.attendance_status || 'present'
            })));
          }
        })
        .catch(err => {
          console.warn('Failed to load session attendance:', err);
        })
        .finally(() => setLoading(false));
    }
  }, [activeSessionId]);

  const handleStatusChange = (userId, status) => {
    setRoster(prev => prev.map(item => {
      if (item.user_id === userId) {
        return { ...item, current_status: status };
      }
      return item;
    }));
  };

  const handleBulkMarkPresent = () => {
    setRoster(prev => prev.map(item => ({ ...item, current_status: 'present' })));
  };

  const handleCommitSave = async () => {
    if (!activeSessionId || !onSaveAttendance) return;
    const records = roster.map(r => ({
      user_id: r.user_id,
      enrollment_id: r.enrollment_id,
      status: r.current_status
    }));

    await onSaveAttendance(activeSessionId, { records });
    setIsConfirmModalOpen(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 4000);
  };

  const handleCommitCorrection = async () => {
    if (!correctionRecord || !correctionReason || !onCorrectAttendance) return;
    await onCorrectAttendance(correctionRecord.record_id || correctionRecord.user_id, {
      status: newStatus,
      reason: correctionReason
    });

    setRoster(prev => prev.map(r => {
      if (r.user_id === correctionRecord.user_id) {
        return { ...r, current_status: newStatus, attendance_status: newStatus, correction_reason: correctionReason };
      }
      return r;
    }));

    setCorrectionRecord(null);
    setCorrectionReason('');
  };

  const handleExportAttendance = () => {
    if (!sessionData) return;
    const headers = [
      { label: 'Student ID', key: 'student_id_code' },
      { label: 'Full Name', key: 'full_name' },
      { label: 'Email', key: 'email' },
      { label: 'Attendance Status', key: 'current_status' },
      { label: 'Correction Reason', key: 'correction_reason' }
    ];
    exportToCsv(`attendance_${sessionData.batch_code}_session_${sessionData.id}`, headers, roster);
  };

  const handleOpenScheduleModal = (preferredBatchId = null) => {
    const targetBatchId = preferredBatchId || (batchFilter !== 'all' ? batchFilter : (batches[0]?.id || ''));
    const targetBatch = batches.find(b => String(b.id) === String(targetBatchId));

    // Default start time: rounded to next hour
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    const startIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    const end = new Date(now.getTime() + 60 * 60 * 1000);
    const endIso = new Date(end.getTime() - end.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    setNewSession({
      batch_id: targetBatchId ? String(targetBatchId) : '',
      faculty_id: targetBatch?.lead_faculty_id ? String(targetBatch.lead_faculty_id) : (faculty[0]?.id ? String(faculty[0].id) : ''),
      topic: '',
      description: '',
      start_time: startIso,
      end_time: endIso,
      session_type: 'Lecture',
      meeting_link: '',
      classroom_location: ''
    });
    setScheduleError('');
    setIsScheduleModalOpen(true);
  };

  const handleQuickScheduleSubmit = async (e) => {
    e.preventDefault();
    setScheduleError('');

    if (!newSession.batch_id) {
      setScheduleError('Please select a cohort batch.');
      return;
    }
    if (!newSession.faculty_id) {
      setScheduleError('Please assign an instructor / faculty member.');
      return;
    }
    if (!newSession.topic.trim()) {
      setScheduleError('Session topic is required.');
      return;
    }
    if (!newSession.start_time || !newSession.end_time) {
      setScheduleError('Start time and end time are required.');
      return;
    }
    if (new Date(newSession.end_time) <= new Date(newSession.start_time)) {
      setScheduleError('End time must be after start time.');
      return;
    }

    try {
      setIsScheduling(true);
      if (onScheduleSession) {
        const res = await onScheduleSession(newSession);
        setIsScheduleModalOpen(false);
        if (res?.session_id) {
          setActiveSessionId(res.session_id);
        }
      }
    } catch (err) {
      setScheduleError(err.message || 'Failed to schedule class session');
    } finally {
      setIsScheduling(false);
    }
  };

  // Metrics summary
  const presentCount = roster.filter(r => r.current_status === 'present').length;
  const absentCount = roster.filter(r => r.current_status === 'absent').length;
  const lateCount = roster.filter(r => r.current_status === 'late').length;
  const excusedCount = roster.filter(r => r.current_status === 'excused').length;
  const attendanceRate = roster.length > 0 ? Math.round(((presentCount + lateCount) / roster.length) * 100) : 0;

  const currentSelectedBatch = batches.find(b => String(b.id) === String(batchFilter));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Session Attendance Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Log live attendance, record reason-backed corrections, and monitor cohort absenteeism thresholds (80% minimum).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {roster.length > 0 && (
            <button
              onClick={handleExportAttendance}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-medium transition-colors"
            >
              <Download size={14} /> Export Report
            </button>
          )}
          <button
            onClick={() => handleOpenScheduleModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0A7CB3] hover:bg-[#086491] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus size={15} /> Schedule Class Session
          </button>
          {roster.length > 0 && (
            <button
              onClick={() => setIsConfirmModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Save size={15} /> Save Attendance Roster
            </button>
          )}
        </div>
      </div>

      {/* When NO sessions exist in system: Guided Empty State */}
      {sessions.length === 0 ? (
        <div className="space-y-5">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-sky-50/50 via-white to-slate-50 border border-sky-100 shadow-xs">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-sky-100 text-[#0A7CB3] flex items-center justify-center shrink-0 shadow-2xs">
                <Calendar size={24} />
              </div>
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">No Class Sessions Scheduled Yet</h2>
                  <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                    Action Required
                  </span>
                </div>
                <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                  Student attendance in Aaroha LMS is strictly tracked per scheduled class session. Enrolled students and cohort registrations are securely saved in the system, but taking attendance requires a class session to record against.
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => handleOpenScheduleModal()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0A7CB3] hover:bg-[#086491] text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    <Plus size={14} /> Schedule First Class Session
                  </button>
                  {onNavigateToBatches && (
                    <button
                      onClick={onNavigateToBatches}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition-colors"
                    >
                      <Users size={14} /> View Enrolled Fellows
                    </button>
                  )}
                  {onNavigateToSchedule && (
                    <button
                      onClick={onNavigateToSchedule}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition-colors"
                    >
                      <Calendar size={14} /> Open Class Calendar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Active Cohorts Card Preview */}
          <div className="rounded-xl bg-white border border-slate-200 p-5 space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <GraduationCap size={15} className="text-[#0A7CB3]" />
                Active Cohort Batches Ready for Scheduling ({batches.length})
              </h3>
              {onNavigateToBatches && (
                <button
                  onClick={onNavigateToBatches}
                  className="text-xs text-[#0A7CB3] hover:underline font-medium flex items-center gap-1"
                >
                  Manage Cohorts <ArrowRight size={12} />
                </button>
              )}
            </div>

            {batches.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                No active cohort batches found. Please create a cohort batch first before scheduling sessions.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {batches.map(b => (
                  <div
                    key={b.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-sky-300 transition-all flex flex-col justify-between gap-3 group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-[#0A7CB3] bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                          {b.batch_code}
                        </span>
                        <span className="text-[11px] font-medium text-slate-600 flex items-center gap-1">
                          <Users size={12} className="text-slate-400" />
                          <strong className="text-slate-900">{b.enrolled_count || 0}</strong> fellows
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {b.title || b.batch_code}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {b.course_title || 'General Coursework'}
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenScheduleModal(b.id)}
                      className="w-full flex items-center justify-center gap-1 py-1.5 px-3 rounded-lg bg-white group-hover:bg-[#0A7CB3] group-hover:text-white border border-slate-200 group-hover:border-[#0A7CB3] text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
                    >
                      <Plus size={13} /> Schedule Session for this Cohort
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* When sessions exist: Show Selectors & Filters */
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              {/* Batch Filter Dropdown */}
              <div className="sm:w-56">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Filter by Batch
                </label>
                <select
                  value={batchFilter}
                  onChange={e => setBatchFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-hidden focus:border-blue-500 font-medium"
                >
                  <option value="all">All Batches ({sessions.length} sessions)</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>
                      [{b.batch_code}] {b.title || b.batch_code} ({b.enrolled_count || 0} fellows)
                    </option>
                  ))}
                </select>
              </div>

              {/* Class Session Dropdown */}
              <div className="flex-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Select Class Session to Mark / Inspect
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={activeSessionId}
                    onChange={e => setActiveSessionId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="">-- Choose Session --</option>
                    {filteredSessions.map(s => (
                      <option key={s.id} value={s.id}>
                        [{s.batch_code}] {s.topic} — {formatDateTime(s.start_time)}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => handleOpenScheduleModal(batchFilter !== 'all' ? batchFilter : null)}
                    className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg bg-sky-50 text-[#0A7CB3] border border-sky-200 hover:bg-sky-100 text-xs font-semibold transition-colors"
                    title="Schedule a new session"
                  >
                    <Plus size={14} /> New
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Rate Metrics */}
            {roster.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono shrink-0">
                <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[9px] text-slate-500 uppercase block">Roster</span>
                  <span className="text-slate-900 font-bold text-xs">{roster.length}</span>
                </div>
                <div className="px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
                  <span className="text-[9px] text-emerald-700 uppercase block">Present</span>
                  <span className="text-emerald-900 font-bold text-xs">{presentCount}</span>
                </div>
                <div className="px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-center">
                  <span className="text-[9px] text-rose-700 uppercase block">Absent</span>
                  <span className="text-rose-900 font-bold text-xs">{absentCount}</span>
                </div>
                <div className="px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-center">
                  <span className="text-[9px] text-amber-700 uppercase block">Late / Exc</span>
                  <span className="text-amber-900 font-bold text-xs">{lateCount + excusedCount}</span>
                </div>
                <div className={`px-2.5 py-1.5 rounded-lg border text-center ${
                  attendanceRate >= 80 ? 'bg-sky-50 border-sky-200 text-[#086491]' : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  <span className="text-[9px] uppercase block">Rate</span>
                  <span className="font-bold text-xs">{attendanceRate}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Alert if current batch has 0 sessions */}
          {batchFilter !== 'all' && filteredSessions.length === 0 && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                <span>
                  No class sessions scheduled for <strong>[{currentSelectedBatch?.batch_code}]</strong> ({currentSelectedBatch?.enrolled_count || 0} enrolled fellows).
                </span>
              </div>
              <button
                onClick={() => handleOpenScheduleModal(batchFilter)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors"
              >
                <Plus size={14} /> Schedule Session for this Batch
              </button>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2 shadow-2xs">
              <CheckCircle2 size={16} /> Attendance saved successfully! Status updated for all enrolled fellows.
            </div>
          )}

          {/* Bulk action toolbar */}
          {roster.length > 0 && (
            <div className="flex items-center justify-between">
              <button
                onClick={handleBulkMarkPresent}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-[#0A7CB3] border border-sky-200 text-xs font-semibold transition-colors"
              >
                <Check size={14} /> Bulk Mark All Present
              </button>
              <span className="text-xs text-slate-500">
                Click status pills below to toggle individual student records.
              </span>
            </div>
          )}

          {/* Attendance Roster Table */}
          <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold tracking-wider uppercase text-[11px]">
                  <th className="py-3 px-4">Student ID & Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Current Status Selection</th>
                  <th className="py-3 px-4">Audit Justification</th>
                  <th className="py-3 px-4 text-right">Correction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
                        <span>Loading session attendance roster...</span>
                      </div>
                    </td>
                  </tr>
                ) : !activeSessionId ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-slate-500">
                      <Calendar size={24} className="mx-auto mb-2 text-slate-400" />
                      <p className="font-medium text-slate-700">Please choose a scheduled class session from the dropdown above</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">The student enrollment roster will automatically load for the selected session.</p>
                    </td>
                  </tr>
                ) : roster.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-slate-500">
                      <Users size={24} className="mx-auto mb-2 text-amber-500" />
                      <p className="font-semibold text-slate-800">
                        No students are currently enrolled in cohort batch [{sessionData?.batch_code || 'this cohort'}].
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto">
                        Attendance rosters are dynamically generated from active cohort enrollments. You can enrol fellows in this batch from the Cohort Batches management tab.
                      </p>
                      {onNavigateToBatches && (
                        <button
                          onClick={onNavigateToBatches}
                          className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0A7CB3] hover:bg-[#086491] text-white text-xs font-semibold shadow-2xs transition-colors"
                        >
                          <Users size={13} /> Enrol Fellows in Batches
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  roster.map(r => (
                    <tr key={r.user_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <strong className="text-slate-900 block">{r.full_name}</strong>
                        <span className="text-[11px] font-mono text-[#0A7CB3]">{r.student_id_code}</span>
                      </td>

                      <td className="py-3 px-4 text-slate-700">{r.email}</td>

                      {/* 4 Status Toggle Buttons */}
                      <td className="py-3 px-4">
                        <div className="inline-flex rounded-lg bg-slate-50 p-1 border border-slate-200 gap-1">
                          {[
                            { id: 'present', label: 'Present', activeBg: 'bg-emerald-600 text-white' },
                            { id: 'absent', label: 'Absent', activeBg: 'bg-rose-600 text-white' },
                            { id: 'late', label: 'Late', activeBg: 'bg-amber-600 text-slate-900' },
                            { id: 'excused', label: 'Excused', activeBg: 'bg-purple-600 text-slate-900' }
                          ].map(opt => {
                            const isSelected = r.current_status === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => handleStatusChange(r.user_id, opt.id)}
                                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                                  isSelected ? opt.activeBg : 'text-slate-500 hover:text-slate-900'
                                }`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {r.correction_reason ? (
                          <span className="text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {r.correction_reason}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setCorrectionRecord(r);
                            setNewStatus(r.current_status);
                            setCorrectionReason(r.correction_reason || '');
                          }}
                          className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-[#0A7CB3] text-xs transition-colors"
                          title="Correct Attendance with Audit Note"
                        >
                          <RotateCcw size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Schedule Class Session Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-[#0A7CB3]" />
                <h2 className="text-base font-bold text-slate-900">Schedule Class Session</h2>
              </div>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            {scheduleError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{scheduleError}</span>
              </div>
            )}

            <form onSubmit={handleQuickScheduleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Cohort Batch *</label>
                  <select
                    required
                    value={newSession.batch_id}
                    onChange={e => {
                      const bId = e.target.value;
                      const b = batches.find(item => String(item.id) === String(bId));
                      setNewSession(prev => ({
                        ...prev,
                        batch_id: bId,
                        faculty_id: b?.lead_faculty_id ? String(b.lead_faculty_id) : prev.faculty_id
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="">-- Choose Cohort Batch --</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>
                        [{b.batch_code}] {b.title || b.batch_code} ({b.enrolled_count || 0} fellows)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Lead Faculty / Instructor *</label>
                  <select
                    required
                    value={newSession.faculty_id}
                    onChange={e => setNewSession(prev => ({ ...prev, faculty_id: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="">-- Choose Instructor --</option>
                    {faculty.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.full_name} ({f.faculty_id_code || f.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Session Topic *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Consensus & Raft Architecture"
                  value={newSession.topic}
                  onChange={e => setNewSession(prev => ({ ...prev, topic: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Start Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={newSession.start_time}
                    onChange={e => setNewSession(prev => ({ ...prev, start_time: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">End Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={newSession.end_time}
                    onChange={e => setNewSession(prev => ({ ...prev, end_time: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Session Type</label>
                  <select
                    value={newSession.session_type}
                    onChange={e => setNewSession(prev => ({ ...prev, session_type: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="Lecture">Lecture</option>
                    <option value="Lab">Hands-on Lab</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Review">Review & Q&A</option>
                    <option value="Assessment">Live Assessment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Meeting Link (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://meet.google.com/xyz"
                    value={newSession.meeting_link}
                    onChange={e => setNewSession(prev => ({ ...prev, meeting_link: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isScheduling}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0A7CB3] hover:bg-[#086491] disabled:opacity-50 text-white font-semibold shadow-xs transition-colors"
                >
                  {isScheduling ? 'Scheduling...' : 'Schedule & Open Roster'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review & Save Confirmation Dialog */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-xs">
            <h2 className="text-base font-bold text-slate-900">Confirm Attendance Commit</h2>
            <p className="text-slate-700">
              You are about to commit attendance for <strong className="text-slate-900">{sessionData?.topic}</strong>:
            </p>

            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono">
              <span className="text-emerald-700">Present: {presentCount}</span>
              <span className="text-rose-700">Absent: {absentCount}</span>
              <span className="text-amber-700">Late: {lateCount}</span>
              <span className="text-purple-600">Excused: {excusedCount}</span>
            </div>

            <p className="text-slate-500 text-[11px]">
              This will update overall student attendance metrics and trigger follow-up alerts for fellows who fall below 80%.
            </p>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-700"
              >
                Back to Review
              </button>
              <button
                onClick={handleCommitSave}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
              >
                Confirm & Commit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Correction Modal */}
      {correctionRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-xs">
            <h2 className="text-base font-bold text-slate-900">Correct Attendance Record</h2>
            <p className="text-slate-700">
              Student: <strong className="text-slate-900">{correctionRecord.full_name}</strong> ({correctionRecord.student_id_code})
            </p>

            <div>
              <label className="block text-slate-700 font-medium mb-1">New Attendance Status</label>
              <select
                value={newStatus}
                onChange={e => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
              >
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="excused">Excused</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Audit Justification Reason *</label>
              <textarea
                rows="2"
                required
                placeholder="Reason for changing past attendance record (e.g. joined via alternate Google Meet device, approved medical slip)..."
                value={correctionReason}
                onChange={e => setCorrectionReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
              ></textarea>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setCorrectionRecord(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-700"
              >
                Cancel
              </button>
              <button
                disabled={!correctionReason}
                onClick={handleCommitCorrection}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold"
              >
                Save Correction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
