import React, { useState, useEffect } from 'react';
import {
  CheckCircle2, XCircle, Clock, AlertCircle, Users,
  Calendar, Download, Save, RotateCcw, Search, Check, AlertTriangle
} from 'lucide-react';
import { exportToCsv, formatDateTime } from '../../adminUtils';

export default function AdminAttendanceTab({
  sessions = [],
  batches = [],
  selectedSessionId = null,
  onFetchSessionAttendance,
  onSaveAttendance,
  onCorrectAttendance
}) {
  const [activeSessionId, setActiveSessionId] = useState(selectedSessionId || '');
  const [sessionData, setSessionData] = useState(null);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Correction Modal
  const [correctionRecord, setCorrectionRecord] = useState(null);
  const [newStatus, setNewStatus] = useState('present');
  const [correctionReason, setCorrectionReason] = useState('');

  // Save review confirmation modal
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Auto-select initial session if available
  useEffect(() => {
    if (selectedSessionId) {
      setActiveSessionId(selectedSessionId);
    } else if (sessions.length > 0 && !activeSessionId) {
      setActiveSessionId(sessions[0].id);
    }
  }, [selectedSessionId, sessions]);

  // Load roster when activeSessionId changes
  useEffect(() => {
    if (!activeSessionId) return;
    setLoading(true);
    setSaveSuccess(false);

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
    if (!activeSessionId) return;
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
    if (!correctionRecord || !correctionReason) return;
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

  // Metrics summary
  const presentCount = roster.filter(r => r.current_status === 'present').length;
  const absentCount = roster.filter(r => r.current_status === 'absent').length;
  const lateCount = roster.filter(r => r.current_status === 'late').length;
  const excusedCount = roster.filter(r => r.current_status === 'excused').length;
  const attendanceRate = roster.length > 0 ? Math.round(((presentCount + lateCount) / roster.length) * 100) : 0;

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
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium"
            >
              <Download size={14} /> Export Report
            </button>
          )}
          <button
            disabled={roster.length === 0}
            onClick={() => setIsConfirmModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold shadow-md transition-colors"
          >
            <Save size={15} /> Save Attendance Roster
          </button>
        </div>
      </div>

      {/* Session Selector & Summary Strip */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Select Class Session to Mark / Inspect
          </label>
          <select
            value={activeSessionId}
            onChange={e => setActiveSessionId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-hidden focus:border-blue-500"
          >
            <option value="">-- Choose Session --</option>
            {sessions.map(s => (
              <option key={s.id} value={s.id}>
                [{s.batch_code}] {s.topic} - {formatDateTime(s.start_time)}
              </option>
            ))}
          </select>
        </div>

        {/* Quick Rate Metrics */}
        {roster.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] text-slate-500 uppercase block">Roster Size</span>
              <span className="text-slate-900 font-bold">{roster.length}</span>
            </div>
            <div className="px-3 py-2 rounded-lg bg-emerald-100/40 border border-emerald-200 text-center">
              <span className="text-[10px] text-emerald-700 uppercase block">Present</span>
              <span className="text-emerald-900 font-bold">{presentCount}</span>
            </div>
            <div className="px-3 py-2 rounded-lg bg-rose-100/40 border border-rose-200 text-center">
              <span className="text-[10px] text-rose-700 uppercase block">Absent</span>
              <span className="text-rose-900 font-bold">{absentCount}</span>
            </div>
            <div className="px-3 py-2 rounded-lg bg-amber-100/40 border border-amber-200 text-center">
              <span className="text-[10px] text-amber-700 uppercase block">Late / Excused</span>
              <span className="text-amber-900 font-bold">{lateCount + excusedCount}</span>
            </div>
            <div className={`px-3 py-2 rounded-lg border text-center ${
              attendanceRate >= 80 ? 'bg-sky-50/40 border-sky-200 text-[#086491]' : 'bg-rose-100/40 border-rose-200 text-rose-900'
            }`}>
              <span className="text-[10px] uppercase block">Attendance Rate</span>
              <span className="font-bold text-sm">{attendanceRate}%</span>
            </div>
          </div>
        )}
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-lg bg-emerald-100/50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} /> Attendance saved successfully! Status updated for all enrolled fellows.
        </div>
      )}

      {/* Bulk action toolbar */}
      {roster.length > 0 && (
        <div className="flex items-center justify-between">
          <button
            onClick={handleBulkMarkPresent}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-100/60 hover:bg-blue-900/60 text-blue-900 border border-blue-200 text-xs font-semibold transition-colors"
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
                  Loading session attendance roster...
                </td>
              </tr>
            ) : roster.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-12 text-center text-slate-500">
                  Select a class session above to load student enrollment roster.
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
                      <span className="text-amber-900 bg-amber-100/30 px-2 py-0.5 rounded border border-amber-200">
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
                      className="p-1 rounded hover:bg-slate-50 text-slate-500 hover:text-[#0A7CB3] text-xs"
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

      {/* Review & Save Confirmation Dialog */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-2xl p-5 space-y-4 text-xs">
            <h2 className="text-base font-bold text-slate-900">Confirm Attendance Commit</h2>
            <p className="text-slate-700">
              You are about to commit attendance for <strong className="text-slate-900">{sessionData?.topic}</strong>:
            </p>

            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono">
              <span className="text-emerald-700">Present: {presentCount}</span>
              <span className="text-rose-700">Absent: {absentCount}</span>
              <span className="text-amber-700">Late: {lateCount}</span>
              <span className="text-purple-400">Excused: {excusedCount}</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-2xl p-5 space-y-4 text-xs">
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

