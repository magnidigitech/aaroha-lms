import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Search, Filter, PlusCircle, Download, Upload, ArrowUpDown,
  MoreVertical, CheckCircle2, XCircle, AlertTriangle, Mail,
  Eye, Edit3, UserCheck, UserX, RefreshCw, Layers, FileText,
  Calendar, Clock, ExternalLink, X, ShieldAlert, UserMinus, UserPlus, AlertCircle,
  RotateCcw, Trash2, Archive, ChevronDown
} from 'lucide-react';
import { exportToCsv, formatDate, formatDateTime, calculateAccessExpiry, getAccessWindowInfo } from '../../adminUtils';
import api from '../../apiService';

export default function AdminStudentsTab({
  students = [],
  courses = [],
  batches = [],
  coordinators = [],
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onTransferBatch,
  onToggleStatus,
  onResendInvite,
  onRevokeInvite,
  onViewStudentDetail,
  selectedStudentDetail = null,
  onCloseStudentDetail
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Available batches filtered by course selection (ensures dependent selector isolation)
  const availableBatchesForFilter = useMemo(() => {
    if (courseFilter === 'all') return batches;
    return batches.filter(b => String(b.course_id) === String(courseFilter));
  }, [batches, courseFilter]);

  const handleCourseFilterChange = (val) => {
    setCourseFilter(val);
    setCurrentPage(1);
    if (val !== 'all') {
      const selectedBatch = batches.find(b => String(b.id) === String(batchFilter));
      if (selectedBatch && String(selectedBatch.course_id) !== String(val)) {
        setBatchFilter('all');
      }
    }
  };

  // Roster View: Active Students vs Archived Students
  const [rosterView, setRosterView] = useState('active'); // 'active' | 'archived'
  const [archivedStudents, setArchivedStudents] = useState([]);
  const [isArchivedLoading, setIsArchivedLoading] = useState(false);
  const [openActionMenuId, setOpenActionMenuId] = useState(null);

  // Edit Profile Modal
  const [editProfileModal, setEditProfileModal] = useState({
    isOpen: false,
    student: null,
    full_name: '',
    email: '',
    mobile: '',
    education: '',
    experience_years: '0-1 Years',
    coordinator_id: '',
    internal_notes: '',
    isSubmitting: false,
    error: ''
  });

  // Archive Student Modal
  const [archiveModal, setArchiveModal] = useState({
    isOpen: false,
    student: null,
    reason: '',
    enrolment_resolution: 'retain_history', // 'retain_history' | 'withdraw_active'
    isSubmitting: false,
    error: ''
  });

  // Restore Student Modal
  const [restoreModal, setRestoreModal] = useState({
    isOpen: false,
    student: null,
    isSubmitting: false,
    error: ''
  });

  // Delete Student Modal (with real-time dependency checks)
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    student: null,
    isChecking: true,
    eligibility: null,
    confirmText: '',
    isSubmitting: false,
    error: ''
  });

  const loadArchivedStudents = async () => {
    setIsArchivedLoading(true);
    try {
      const res = await api.adminGetStudents({ view: 'archived' });
      if (res && res.success && Array.isArray(res.students)) {
        setArchivedStudents(res.students);
      }
    } catch (err) {
      console.warn('Failed to load archived students:', err);
    } finally {
      setIsArchivedLoading(false);
    }
  };

  useEffect(() => {
    if (rosterView === 'archived') {
      loadArchivedStudents();
    }
  }, [rosterView]);

  const handleOpenEditProfile = (student) => {
    setEditProfileModal({
      isOpen: true,
      student,
      full_name: student.full_name || '',
      email: student.email || '',
      mobile: student.mobile || '',
      education: student.education || '',
      experience_years: student.experience_years || '0-1 Years',
      coordinator_id: student.coordinator_id || '',
      internal_notes: student.internal_notes || '',
      isSubmitting: false,
      error: ''
    });
  };

  const handleExecuteEditProfile = async (e) => {
    e.preventDefault();
    if (!editProfileModal.student || !editProfileModal.full_name.trim()) return;
    try {
      setEditProfileModal(prev => ({ ...prev, isSubmitting: true, error: '' }));
      await api.adminUpdateStudentProfile(editProfileModal.student.user_id, {
        full_name: editProfileModal.full_name,
        email: editProfileModal.email,
        mobile: editProfileModal.mobile,
        education: editProfileModal.education,
        experience_years: editProfileModal.experience_years,
        coordinator_id: editProfileModal.coordinator_id || null,
        internal_notes: editProfileModal.internal_notes
      });
      const studentId = editProfileModal.student.user_id;
      setEditProfileModal({ isOpen: false, student: null, full_name: '', email: '', mobile: '', education: '', experience_years: '0-1 Years', coordinator_id: '', internal_notes: '', isSubmitting: false, error: '' });
      if (onUpdateStudent) await onUpdateStudent(studentId, {});
      if (selectedStudentDetail && (selectedStudentDetail.student?.user_id === studentId || selectedStudentDetail.student?.id === studentId)) {
        await onViewStudentDetail(studentId);
      }
      if (rosterView === 'archived') await loadArchivedStudents();
    } catch (err) {
      setEditProfileModal(prev => ({ ...prev, isSubmitting: false, error: err.message || 'Failed to update student profile.' }));
    }
  };

  const handleOpenArchiveModal = (student) => {
    setArchiveModal({
      isOpen: true,
      student,
      reason: '',
      enrolment_resolution: 'retain_history',
      isSubmitting: false,
      error: ''
    });
  };

  const handleExecuteArchive = async (e) => {
    e.preventDefault();
    if (!archiveModal.student || !archiveModal.reason.trim()) return;
    try {
      setArchiveModal(prev => ({ ...prev, isSubmitting: true, error: '' }));
      await api.adminArchiveStudent(archiveModal.student.user_id, {
        reason: archiveModal.reason,
        enrolment_resolution: archiveModal.enrolment_resolution
      });
      const studentId = archiveModal.student.user_id;
      setArchiveModal({ isOpen: false, student: null, reason: '', enrolment_resolution: 'retain_history', isSubmitting: false, error: '' });
      if (onUpdateStudent) await onUpdateStudent(studentId, {});
      if (selectedStudentDetail && (selectedStudentDetail.student?.user_id === studentId || selectedStudentDetail.student?.id === studentId)) {
        await onViewStudentDetail(studentId);
      }
      if (rosterView === 'archived') await loadArchivedStudents();
    } catch (err) {
      setArchiveModal(prev => ({ ...prev, isSubmitting: false, error: err.message || 'Failed to archive student.' }));
    }
  };

  const handleOpenRestoreModal = (student) => {
    setRestoreModal({
      isOpen: true,
      student,
      isSubmitting: false,
      error: ''
    });
  };

  const handleExecuteRestore = async () => {
    if (!restoreModal.student) return;
    try {
      setRestoreModal(prev => ({ ...prev, isSubmitting: true, error: '' }));
      await api.adminRestoreStudent(restoreModal.student.user_id);
      const studentId = restoreModal.student.user_id;
      setRestoreModal({ isOpen: false, student: null, isSubmitting: false, error: '' });
      if (onUpdateStudent) await onUpdateStudent(studentId, {});
      if (selectedStudentDetail && (selectedStudentDetail.student?.user_id === studentId || selectedStudentDetail.student?.id === studentId)) {
        await onViewStudentDetail(studentId);
      }
      if (rosterView === 'archived') await loadArchivedStudents();
    } catch (err) {
      setRestoreModal(prev => ({ ...prev, isSubmitting: false, error: err.message || 'Failed to restore student.' }));
    }
  };

  const handleOpenDeleteModal = async (student) => {
    setDeleteModal({
      isOpen: true,
      student,
      isChecking: true,
      eligibility: null,
      confirmText: '',
      isSubmitting: false,
      error: ''
    });
    try {
      const res = await api.adminCheckStudentDeletion(student.user_id);
      setDeleteModal(prev => ({
        ...prev,
        isChecking: false,
        eligibility: res
      }));
    } catch (err) {
      setDeleteModal(prev => ({
        ...prev,
        isChecking: false,
        error: err.message || 'Failed to verify deletion eligibility.'
      }));
    }
  };

  const handleExecuteDeleteStudent = async () => {
    if (!deleteModal.student || deleteModal.confirmText !== 'DELETE') return;
    try {
      setDeleteModal(prev => ({ ...prev, isSubmitting: true, error: '' }));
      await api.adminDeleteStudent(deleteModal.student.user_id);
      const studentId = deleteModal.student.user_id;
      setDeleteModal({ isOpen: false, student: null, isChecking: false, eligibility: null, confirmText: '', isSubmitting: false, error: '' });
      if (selectedStudentDetail && (selectedStudentDetail.student?.user_id === studentId || selectedStudentDetail.student?.id === studentId)) {
        onCloseStudentDetail();
      }
      if (onDeleteStudent) await onDeleteStudent();
      else if (onUpdateStudent) await onUpdateStudent(studentId, {});
      if (rosterView === 'archived') await loadArchivedStudents();
    } catch (err) {
      setDeleteModal(prev => ({ ...prev, isSubmitting: false, error: err.message || 'Failed to delete student.' }));
    }
  };

  // Modals state
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [transferModalStudent, setTransferModalStudent] = useState(null);
  const [selectedTargetBatchId, setSelectedTargetBatchId] = useState('');
  const [transferReason, setTransferReason] = useState('');

  // Account Status Action Modal
  const [accountActionModal, setAccountActionModal] = useState({
    isOpen: false,
    student: null,
    action: '', // 'deactivate' | 'suspend' | 'reactivate' | 'restore' | 'revoke_invitation'
    title: '',
    reason: '',
    endDate: '',
    effectDescription: '',
    confirmLabel: '',
    isSubmitting: false
  });

  // Drawer Enrolment Action Modals
  const [enrollDrawerModal, setEnrollDrawerModal] = useState({
    isOpen: false,
    course_id: '',
    batch_id: '',
    isSubmitting: false,
    error: ''
  });

  const [withdrawDrawerModal, setWithdrawDrawerModal] = useState({
    isOpen: false,
    enrollment: null,
    reason: '',
    isSubmitting: false,
    error: ''
  });

  const [transferDrawerModal, setTransferDrawerModal] = useState({
    isOpen: false,
    enrollment: null,
    target_batch_id: '',
    reason: '',
    isSubmitting: false,
    error: ''
  });

  const [extendAccessModal, setExtendAccessModal] = useState({
    isOpen: false,
    enrollment: null,
    new_expires_at: '',
    reason: '',
    isSubmitting: false,
    error: ''
  });

  // Student Detail Drawer Active Tab
  const [detailTab, setDetailTab] = useState('profile'); // profile, enrolments, attendance, assessments, documents, communications, activity

  // New Student Form State
  const [newStudent, setNewStudent] = useState({
    full_name: '',
    email: '',
    mobile: '',
    education: '',
    experience_years: '0-1 Years',
    course_id: '',
    batch_id: '',
    coordinator_id: '',
    internal_notes: ''
  });

  // CSV Import State
  const [csvFile, setCsvFile] = useState(null);
  const [importRows, setImportRows] = useState([]);
  const [importErrors, setImportErrors] = useState([]);

  // Filter students
  const currentRosterList = rosterView === 'active' ? students : archivedStudents;
  const filteredStudents = useMemo(() => {
    return currentRosterList.filter(s => {
      const matchesSearch = !searchTerm ||
        (s.full_name && s.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.student_id_code && s.student_id_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.mobile && s.mobile.includes(searchTerm));

      const matchesCourse = courseFilter === 'all' || String(s.course_id) === String(courseFilter);
      const matchesBatch = batchFilter === 'all' || String(s.batch_id) === String(batchFilter);
      const matchesStatus = statusFilter === 'all' || s.account_status === statusFilter;

      return matchesSearch && matchesCourse && matchesBatch && matchesStatus;
    });
  }, [currentRosterList, searchTerm, courseFilter, batchFilter, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // CSV Export with Formula Injection Protection
  const handleExportCsv = () => {
    const headers = [
      { label: 'Student ID', key: 'student_id_code' },
      { label: 'Full Name', key: 'full_name' },
      { label: 'Email Address', key: 'email' },
      { label: 'Mobile Number', key: 'mobile' },
      { label: 'Course Enrolled', key: 'course_title' },
      { label: 'Batch Code', key: 'batch_code' },
      { label: 'Admission Date', key: 'admission_date' },
      { label: 'Account Status', key: 'account_status' }
    ];
    exportToCsv('aaroha_students_roster', headers, filteredStudents);
  };

  // Download CSV Import Template
  const handleDownloadTemplate = () => {
    const sampleHeaders = ['Full Name', 'Email', 'Mobile', 'Education', 'Experience', 'Course ID', 'Batch ID'];
    const sampleRows = [
      ['Aditya Rao', 'aditya.rao@example.com', '+91 98450 12345', 'B.Tech CSE', '2 Years', '1', '1'],
      ['Pooja Hegde', 'pooja.h@example.com', '+91 98765 67890', 'B.E. Information Science', '1 Year', '1', '1']
    ];
    const csvContent = '\uFEFF' + [sampleHeaders.join(','), ...sampleRows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aaroha_student_onboarding_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Parse CSV File for Preview
  const handleCsvFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
      if (lines.length <= 1) {
        setImportErrors(['CSV file must have a header row and at least one student row.']);
        setImportRows([]);
        return;
      }

      const rows = [];
      const errors = [];
      const existingEmails = new Set(students.map(s => (s.email || '').toLowerCase()));
      const fileEmails = new Set();

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
        const [fullName, email, mobile, education, exp, courseId, batchId] = parts;

        const rowErrors = [];
        if (!fullName) rowErrors.push('Missing Name');
        if (!email || !email.includes('@')) rowErrors.push('Invalid Email');
        const isReuse = !!(email && existingEmails.has(email.toLowerCase()));
        if (email && fileEmails.has(email.toLowerCase())) rowErrors.push('Duplicate email inside CSV');
        if (email) fileEmails.add(email.toLowerCase());

        rows.push({
          rowNum: i + 1,
          fullName: fullName || '',
          email: email || '',
          mobile: mobile || '',
          education: education || '',
          experience: exp || '0-1 Years',
          courseId: courseId || '',
          batchId: batchId || '',
          errors: rowErrors,
          isReuse: isReuse,
          isValid: rowErrors.length === 0
        });

        if (rowErrors.length > 0) {
          errors.push(`Row ${i + 1}: ${rowErrors.join(', ')}`);
        }
      }

      setImportRows(rows);
      setImportErrors(errors);
    };
    reader.readAsText(file);
  };

  const handleCommitImport = async () => {
    const validRows = importRows.filter(r => r.isValid);
    if (validRows.length === 0) return;

    for (const r of validRows) {
      await onAddStudent({
        full_name: r.fullName,
        email: r.email,
        mobile: r.mobile,
        education: r.education,
        experience_years: r.experience,
        course_id: r.courseId,
        batch_id: r.batchId
      });
    }

    setIsImportModalOpen(false);
    setCsvFile(null);
    setImportRows([]);
  };

  const handleSubmitNewStudent = async (e) => {
    e.preventDefault();
    if (!newStudent.full_name || !newStudent.email) return;

    await onAddStudent(newStudent);
    setIsOnboardModalOpen(false);
    setNewStudent({
      full_name: '',
      email: '',
      mobile: '',
      education: '',
      experience_years: '0-1 Years',
      course_id: '',
      batch_id: '',
      coordinator_id: '',
      internal_notes: ''
    });
  };

  const handleCommitTransfer = async () => {
    if (!transferModalStudent || !selectedTargetBatchId) return;
    await onTransferBatch(transferModalStudent.user_id, {
      target_batch_id: selectedTargetBatchId,
      reason: transferReason || 'Transfer approved by academic coordinator'
    });
    setTransferModalStudent(null);
    setSelectedTargetBatchId('');
    setTransferReason('');
  };

  const handleOpenAccountAction = (student, action) => {
    let title = '';
    let effectDescription = '';
    let confirmLabel = '';

    if (action === 'deactivate') {
      title = 'Deactivate Student Account';
      effectDescription = 'Deactivating this account will immediately revoke all active JWT sessions and block login to the student portal. Student enrollments, attendance, scores, and academic history remain strictly preserved.';
      confirmLabel = 'Deactivate Account';
    } else if (action === 'suspend') {
      title = 'Suspend Student Account';
      effectDescription = 'Suspension immediately terminates active sessions and blocks API access. You must provide an explicit administrative reason for the audit log.';
      confirmLabel = 'Suspend Account';
    } else if (action === 'reactivate') {
      title = 'Reactivate Student Account';
      effectDescription = 'Reactivating restores the student\'s ability to log in with their institutional credentials. All previous enrolments, attendance, and coursework remain unchanged.';
      confirmLabel = 'Reactivate Account';
    } else if (action === 'restore') {
      title = 'Restore Suspended Account';
      effectDescription = 'Clears the suspension status and restores login access. All academic records and enrolments remain unchanged.';
      confirmLabel = 'Restore Access';
    } else if (action === 'revoke_invitation') {
      title = 'Revoke Activation Invitation';
      effectDescription = 'Invalidates the single-use onboarding token. The user will not be able to activate an account until a new invitation is generated.';
      confirmLabel = 'Revoke Invitation';
    }

    setAccountActionModal({
      isOpen: true,
      student,
      action,
      title,
      reason: '',
      endDate: '',
      effectDescription,
      confirmLabel,
      isSubmitting: false
    });
  };

  const handleExecuteAccountAction = async () => {
    if (!accountActionModal.student || !accountActionModal.action) return;
    if (accountActionModal.action === 'suspend' && !accountActionModal.reason.trim()) {
      alert('Suspension requires an explicit administrative reason.');
      return;
    }

    try {
      setAccountActionModal(prev => ({ ...prev, isSubmitting: true }));
      await api.adminManageAccountStatus(accountActionModal.student.user_id, {
        action: accountActionModal.action,
        reason: accountActionModal.reason || undefined,
        end_date: accountActionModal.endDate || undefined
      });
      const userId = accountActionModal.student.user_id;
      setAccountActionModal({
        isOpen: false,
        student: null,
        action: '',
        title: '',
        reason: '',
        endDate: '',
        effectDescription: '',
        confirmLabel: '',
        isSubmitting: false
      });
      if (onToggleStatus) {
        await onToggleStatus(userId, { status: accountActionModal.action });
      }
      if (selectedStudentDetail && (selectedStudentDetail.student?.user_id === userId || selectedStudentDetail.student?.id === userId)) {
        await onViewStudentDetail(userId);
      }
    } catch (err) {
      alert('Failed to update account status: ' + (err.message || 'Server rejected request'));
      setAccountActionModal(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleExecuteEnrollDrawer = async (e) => {
    e.preventDefault();
    if (!enrollDrawerModal.course_id || !enrollDrawerModal.batch_id || !selectedStudentDetail?.student?.user_id) return;

    try {
      setEnrollDrawerModal(prev => ({ ...prev, isSubmitting: true, error: '' }));
      await api.adminEnrollStudent(selectedStudentDetail.student.user_id, {
        course_id: enrollDrawerModal.course_id,
        batch_id: enrollDrawerModal.batch_id
      });
      setEnrollDrawerModal({ isOpen: false, course_id: '', batch_id: '', isSubmitting: false, error: '' });
      await onViewStudentDetail(selectedStudentDetail.student.user_id);
      if (onUpdateStudent) await onUpdateStudent(selectedStudentDetail.student.user_id, {});
    } catch (err) {
      setEnrollDrawerModal(prev => ({ ...prev, isSubmitting: false, error: err.message || 'Failed to enrol student in course.' }));
    }
  };

  const handleExecuteWithdrawDrawer = async (e) => {
    e.preventDefault();
    if (!withdrawDrawerModal.enrollment || !withdrawDrawerModal.reason.trim() || !selectedStudentDetail?.student?.user_id) return;

    try {
      setWithdrawDrawerModal(prev => ({ ...prev, isSubmitting: true, error: '' }));
      await api.adminWithdrawStudentEnrollment(selectedStudentDetail.student.user_id, {
        enrollment_id: withdrawDrawerModal.enrollment.enrollment_id,
        reason: withdrawDrawerModal.reason
      });
      setWithdrawDrawerModal({ isOpen: false, enrollment: null, reason: '', isSubmitting: false, error: '' });
      await onViewStudentDetail(selectedStudentDetail.student.user_id);
      if (onUpdateStudent) await onUpdateStudent(selectedStudentDetail.student.user_id, {});
    } catch (err) {
      setWithdrawDrawerModal(prev => ({ ...prev, isSubmitting: false, error: err.message || 'Failed to withdraw enrolment.' }));
    }
  };

  const handleExecuteTransferDrawer = async (e) => {
    e.preventDefault();
    if (!transferDrawerModal.enrollment || !transferDrawerModal.target_batch_id || !selectedStudentDetail?.student?.user_id) return;

    try {
      setTransferDrawerModal(prev => ({ ...prev, isSubmitting: true, error: '' }));
      await onTransferBatch(selectedStudentDetail.student.user_id, {
        target_batch_id: transferDrawerModal.target_batch_id,
        reason: transferDrawerModal.reason || 'Batch transfer approved by coordinator'
      });
      setTransferDrawerModal({ isOpen: false, enrollment: null, target_batch_id: '', reason: '', isSubmitting: false, error: '' });
      await onViewStudentDetail(selectedStudentDetail.student.user_id);
    } catch (err) {
      setTransferDrawerModal(prev => ({ ...prev, isSubmitting: false, error: err.message || 'Failed to transfer batch.' }));
    }
  };

  const handleExecuteExtendAccess = async (e) => {
    e.preventDefault();
    if (!extendAccessModal.enrollment || !extendAccessModal.new_expires_at || !extendAccessModal.reason.trim()) return;

    try {
      setExtendAccessModal(prev => ({ ...prev, isSubmitting: true, error: '' }));
      const eid = extendAccessModal.enrollment.id || extendAccessModal.enrollment.enrollment_id;
      // Convert date string to standard YYYY-MM-DD 23:59:59 if needed
      let formattedExpiry = extendAccessModal.new_expires_at;
      if (formattedExpiry.length === 10) {
        formattedExpiry += ' 23:59:59';
      }
      await api.adminExtendAccess(eid, {
        new_expires_at: formattedExpiry,
        reason: extendAccessModal.reason.trim()
      });
      setExtendAccessModal({ isOpen: false, enrollment: null, new_expires_at: '', reason: '', isSubmitting: false, error: '' });
      if (selectedStudentDetail?.student?.user_id) {
        await onViewStudentDetail(selectedStudentDetail.student.user_id);
      }
    } catch (err) {
      setExtendAccessModal(prev => ({ ...prev, isSubmitting: false, error: err.message || 'Failed to extend access.' }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls: Search, Filters, and Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Students</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage student admissions, batch assignments, single-use invitations, and academic progress.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium shadow-xs transition-colors cursor-pointer"
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium shadow-xs transition-colors cursor-pointer"
          >
            <Upload size={14} /> Import Students
          </button>
          <button
            onClick={() => setIsOnboardModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0a7cb3] hover:bg-[#086491] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <PlusCircle size={15} /> Add Student
          </button>
        </div>
      </div>

      {/* Roster View Mode Switcher: Active Students vs Archived Students */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => { setRosterView('active'); setCurrentPage(1); }}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
            rosterView === 'active'
              ? 'bg-[#0a7cb3] text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Users size={14} />
          <span>Active Students ({students.length})</span>
        </button>
        <button
          type="button"
          onClick={() => { setRosterView('archived'); setCurrentPage(1); }}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
            rosterView === 'archived'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Archive size={14} />
          <span>Archived Students {isArchivedLoading ? '...' : `(${archivedStudents.length})`}</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search Input */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, email, ID, or mobile..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs focus:outline-hidden focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Filter by Course */}
        <div>
          <select
            value={courseFilter}
            onChange={(e) => handleCourseFilterChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-hidden focus:border-blue-500"
          >
            <option value="all">All Courses</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>

        {/* Filter by Batch (Scoped strictly to selected Course) */}
        <div>
          <select
            value={batchFilter}
            onChange={(e) => { setBatchFilter(e.target.value); setCurrentPage(1); }}
            className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-hidden focus:border-blue-500"
          >
            <option value="all">{courseFilter === 'all' ? 'All Batches' : 'All Batches in Course'}</option>
            {availableBatchesForFilter.map(b => (
              <option key={b.id} value={b.id}>{b.batch_code} ({b.title})</option>
            ))}
          </select>
        </div>

        {/* Filter by Login Status */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-hidden focus:border-blue-500"
            title="Filter roster by Login Status"
          >
            <option value="all">All Login Statuses</option>
            <option value="invited">Invited — Pending Activation</option>
            <option value="active">Active</option>
            <option value="deactivated">Deactivated</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Main Student Roster Table */}
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold tracking-wider uppercase text-[11px]">
                <th className="py-3 px-4">Student ID & Name</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Course & Batch</th>
                <th className="py-3 px-4">Admission Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500">
                    {students.length === 0 ? (
                      <div className="max-w-xs mx-auto space-y-3">
                        <div className="w-10 h-10 rounded-full bg-sky-50 text-[#0a7cb3] flex items-center justify-center mx-auto">
                          <Users size={20} />
                        </div>
                        <div className="text-sm font-semibold text-slate-900">No students yet</div>
                        <p className="text-xs text-slate-500">Get started by adding a student manually or importing a roster via CSV.</p>
                        <div className="flex items-center justify-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setIsOnboardModalOpen(true)}
                            className="px-3 py-1.5 rounded-lg bg-[#0a7cb3] hover:bg-[#086491] text-white text-xs font-semibold cursor-pointer"
                          >
                            Add Student
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsImportModalOpen(true)}
                            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium cursor-pointer"
                          >
                            Import Students
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm text-slate-700 font-medium">No students match the current filter criteria.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchTerm('');
                            setCourseFilter('all');
                            setBatchFilter('all');
                            setStatusFilter('all');
                          }}
                          className="text-xs text-[#0a7cb3] font-semibold hover:underline cursor-pointer"
                        >
                          Clear Filters
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((s, idx) => {
                  const uniqueKey = s.id ? `student-${s.id}` : `${s.user_id}-${s.enrollment_id || s.batch_id || idx}`;
                  return (
                    <tr key={uniqueKey} className="hover:bg-slate-50/50 transition-colors">
                      {/* Name & ID */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-800 text-xs shrink-0 overflow-hidden">
                            {s.avatar ? (
                              <img src={s.avatar} alt={s.full_name} className="w-full h-full object-cover" />
                            ) : (
                              (s.full_name || 'S')[0]
                            )}
                          </div>
                          <div className="truncate">
                            <span className="font-semibold text-slate-900 block hover:text-[#0a7cb3] cursor-pointer" onClick={() => onViewStudentDetail(s.user_id)}>
                              {s.full_name}
                            </span>
                            <span className="text-[11px] font-mono text-[#0a7cb3]">{s.student_id_code || 'STU-NEW'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-4">
                        <div className="text-slate-700">{s.email}</div>
                        <div className="text-slate-500 text-[11px]">{s.mobile || 'No mobile recorded'}</div>
                      </td>

                      {/* Course & Batch */}
                      <td className="py-3 px-4">
                        <div className="text-slate-800 font-medium truncate max-w-[200px]">{s.course_title || 'Unassigned Course'}</div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {s.batch_code ? `Batch: ${s.batch_code}` : 'No active batch'}
                        </div>
                      </td>

                      {/* Admission Date & Delivery Mode */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-slate-800 font-medium text-[11px]">
                          {formatDate(s.admission_date || s.created_at)}
                        </span>
                        <div className="text-[10px] text-slate-500">{s.delivery_mode || 'Online Live'}</div>
                      </td>

                      {/* Login Status */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium tracking-wide ${
                          s.account_status === 'active'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            : s.account_status === 'invited'
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : s.account_status === 'suspended'
                            ? 'bg-rose-100 text-rose-900 border border-rose-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {s.account_status === 'invited' ? 'Invited — Pending' : (s.account_status || 'active')}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Inspect Button */}
                          <button
                            type="button"
                            onClick={() => onViewStudentDetail(s.user_id)}
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                            title="Inspect Student Record"
                          >
                            <Eye size={15} />
                          </button>

                          {/* Actions Dropdown */}
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={() => setOpenActionMenuId(openActionMenuId === s.user_id ? null : s.user_id)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-1 cursor-pointer transition-colors text-[11px]"
                            >
                              <span>Actions</span>
                              <ChevronDown size={12} />
                            </button>

                            {openActionMenuId === s.user_id && (
                              <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 text-left text-xs">
                                <button
                                  type="button"
                                  onClick={() => { setOpenActionMenuId(null); onViewStudentDetail(s.user_id); }}
                                  className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                >
                                  <Eye size={13} className="text-slate-500" />
                                  <span>Inspect Record</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setOpenActionMenuId(null); handleOpenEditProfile(s); }}
                                  className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                >
                                  <Edit3 size={13} className="text-blue-600" />
                                  <span>Edit Profile</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setOpenActionMenuId(null); setTransferModalStudent(s); }}
                                  className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                >
                                  <Layers size={13} className="text-[#0a7cb3]" />
                                  <span>Transfer Cohort Batch</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionMenuId(null);
                                    onViewStudentDetail(s.user_id);
                                    setDetailTab('enrolments');
                                    setEnrollDrawerModal({ isOpen: true, course_id: '', batch_id: '', isSubmitting: false, error: '' });
                                  }}
                                  className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                >
                                  <UserPlus size={13} className="text-emerald-600" />
                                  <span>Enrol in Course</span>
                                </button>

                                <div className="my-1 border-t border-slate-100" />

                                {s.account_status === 'active' ? (
                                  <button
                                    type="button"
                                    onClick={() => { setOpenActionMenuId(null); handleOpenAccountAction(s, 'deactivate'); }}
                                    className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                  >
                                    <UserX size={13} className="text-slate-600" />
                                    <span>Deactivate Account</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => { setOpenActionMenuId(null); handleOpenAccountAction(s, 'reactivate'); }}
                                    className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                  >
                                    <UserCheck size={13} className="text-emerald-600" />
                                    <span>Reactivate Account</span>
                                  </button>
                                )}

                                {s.is_archived || s.account_status === 'archived' ? (
                                  <button
                                    type="button"
                                    onClick={() => { setOpenActionMenuId(null); handleOpenRestoreModal(s); }}
                                    className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                  >
                                    <RotateCcw size={13} className="text-blue-600" />
                                    <span>Restore Student</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => { setOpenActionMenuId(null); handleOpenArchiveModal(s); }}
                                    className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Archive size={13} className="text-amber-600" />
                                    <span>Archive Student</span>
                                  </button>
                                )}

                                <div className="my-1 border-t border-slate-100" />

                                <button
                                  type="button"
                                  onClick={() => { setOpenActionMenuId(null); handleOpenDeleteModal(s); }}
                                  className="w-full px-3 py-1.5 text-left text-rose-700 hover:bg-rose-50 flex items-center gap-2 cursor-pointer font-medium"
                                >
                                  <Trash2 size={13} className="text-rose-600" />
                                  <span>Delete Student...</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {filteredStudents.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
            {Math.min(currentPage * pageSize, filteredStudents.length)} of {filteredStudents.length} students
          </span>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="px-2.5 py-1 rounded bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none text-slate-700"
            >
              Previous
            </button>
            <span className="font-mono text-slate-900">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="px-2.5 py-1 rounded bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none text-slate-700"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: ONBOARD STUDENT (WIZARD)                             */}
      {/* ------------------------------------------------------------- */}
      {isOnboardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-base font-bold text-slate-900">Student Onboarding Workflow</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Register demographics, assign course and batch, and generate single-use invitation link.
                </p>
              </div>
              <button onClick={() => setIsOnboardModalOpen(false)} className="text-slate-500 hover:text-slate-900">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitNewStudent} className="p-5 space-y-4 text-xs">
              {/* Demographics */}
              <div className="space-y-3">
                <h3 className="font-semibold text-[#0A7CB3] uppercase tracking-wider text-[11px]">1. Student Demographics</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Full Legal Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={newStudent.full_name}
                      onChange={e => setNewStudent({ ...newStudent, full_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. ramesh.kumar@enterprise.com"
                      value={newStudent.email}
                      onChange={e => setNewStudent({ ...newStudent, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Mobile Number</label>
                    <input
                      type="text"
                      placeholder="e.g. +91 98450 11223"
                      value={newStudent.mobile}
                      onChange={e => setNewStudent({ ...newStudent, mobile: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Education Background</label>
                    <input
                      type="text"
                      placeholder="e.g. B.Tech Computer Science, NIT"
                      value={newStudent.education}
                      onChange={e => setNewStudent({ ...newStudent, education: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Course & Batch Selection */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <h3 className="font-semibold text-[#0A7CB3] uppercase tracking-wider text-[11px]">2. Course & Cohort Batch Assignment</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Primary Course</label>
                    <select
                      value={newStudent.course_id}
                      onChange={e => setNewStudent({ ...newStudent, course_id: e.target.value, batch_id: '' })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
                    >
                      <option value="">-- Select Course --</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Cohort Batch</label>
                    <select
                      value={newStudent.batch_id}
                      onChange={e => setNewStudent({ ...newStudent, batch_id: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
                    >
                      <option value="">-- Select Batch --</option>
                      {batches
                        .filter(b => !newStudent.course_id || String(b.course_id) === String(newStudent.course_id))
                        .map(b => (
                          <option key={b.id} value={b.id}>
                            {b.batch_code} ({b.delivery_mode}) - {b.title}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Internal Notes */}
              <div className="pt-3 border-t border-slate-200">
                <label className="block text-slate-700 font-medium mb-1">Internal Staff Notes (Restricted View)</label>
                <textarea
                  rows="2"
                  placeholder="Record admissions comments, prerequisite evaluations, or scholarship justification..."
                  value={newStudent.internal_notes}
                  onChange={e => setNewStudent({ ...newStudent, internal_notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
                ></textarea>
              </div>

              {/* Form Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOnboardModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-100 text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md"
                >
                  Confirm & Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: BATCH CSV / XLSX IMPORT WITH PREVIEW & VALIDATION    */}
      {/* ------------------------------------------------------------- */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Batch Student Import</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload a CSV file of prospective students. Every row is strictly validated before commit.
                </p>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-500 hover:text-slate-900">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Template Download Prompt */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 block">Need the standard import format?</span>
                  <span className="text-slate-500 text-[11px]">Download our pre-structured template containing sample columns.</span>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-100 text-[#0A7CB3] border border-slate-200 font-medium flex items-center gap-1.5"
                >
                  <Download size={13} /> Download Template
                </button>
              </div>

              {/* File Input */}
              <div>
                <label className="block text-slate-700 font-medium mb-1.5">Select CSV File to Inspect</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFileChange}
                  className="w-full text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                />
              </div>

              {/* Error Summary Banner */}
              {importErrors.length > 0 && (
                <div className="p-3 rounded-lg bg-rose-100/40 border border-rose-200 text-rose-900 space-y-1">
                  <div className="flex items-center gap-2 font-semibold">
                    <ShieldAlert size={15} /> Row-Level Validation Issues Detected ({importErrors.length})
                  </div>
                  <ul className="list-disc list-inside text-[11px] space-y-0.5">
                    {importErrors.slice(0, 5).map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                    {importErrors.length > 5 && (
                      <li>...and {importErrors.length - 5} more issues.</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Preview Table */}
              {importRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-slate-700 font-semibold">
                    <span>Parsed Preview ({importRows.length} rows)</span>
                    <span className="text-emerald-700 font-mono">
                      {importRows.filter(r => r.isValid).length} Valid / {importRows.filter(r => !r.isValid).length} Invalid
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 text-slate-500 sticky top-0">
                        <tr>
                          <th className="py-2 px-3">Row</th>
                          <th className="py-2 px-3">Name</th>
                          <th className="py-2 px-3">Email</th>
                          <th className="py-2 px-3">Batch ID</th>
                          <th className="py-2 px-3">Validity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importRows.map(r => (
                          <tr key={r.rowNum} className={r.isValid ? 'bg-white' : 'bg-rose-50'}>
                            <td className="py-2 px-3 font-mono text-slate-500">{r.rowNum}</td>
                            <td className="py-2 px-3 text-slate-900">{r.fullName}</td>
                            <td className="py-2 px-3 text-slate-700">{r.email}</td>
                            <td className="py-2 px-3 text-slate-500">{r.batchId || 'Default'}</td>
                            <td className="py-2 px-3">
                              {r.isValid ? (
                                <span className="flex items-center gap-1.5">
                                  <span className="text-emerald-700 flex items-center gap-1 font-medium">
                                    <CheckCircle2 size={13} /> Valid
                                  </span>
                                  {r.isReuse && (
                                    <span className="px-1.5 py-0.5 rounded bg-sky-100 text-[#0A7CB3] border border-sky-200 text-[10px] font-semibold">
                                      Reuse Account
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-rose-700 flex items-center gap-1 font-medium">
                                  <XCircle size={13} /> {r.errors.join(', ')}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-100 text-slate-700 font-medium"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={importRows.filter(r => r.isValid).length === 0}
                  onClick={handleCommitImport}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none text-white font-semibold"
                >
                  Commit {importRows.filter(r => r.isValid).length} Valid Students
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: BATCH TRANSFER DIALOG                                */}
      {/* ------------------------------------------------------------- */}
      {transferModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Transfer Student Cohort</h2>
              <button onClick={() => setTransferModalStudent(null)} className="text-slate-500 hover:text-slate-900">
                <X size={18} />
              </button>
            </div>

            <div>
              <span className="text-slate-500 block">Student:</span>
              <strong className="text-slate-900 text-sm">{transferModalStudent.full_name}</strong>
              <span className="text-xs text-[#0A7CB3] block font-mono">Current: {transferModalStudent.batch_code || 'Unassigned'}</span>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Target Batch *</label>
              <select
                value={selectedTargetBatchId}
                onChange={e => setSelectedTargetBatchId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
              >
                <option value="">-- Choose New Batch --</option>
                {batches
                  .filter(b => String(b.id) !== String(transferModalStudent.batch_id))
                  .map(b => (
                    <option key={b.id} value={b.id}>
                      {b.batch_code} - {b.title} ({b.delivery_mode})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Transfer Justification *</label>
              <textarea
                rows="2"
                placeholder="Reason for transfer (schedule conflict, pace adjustment, academic review)..."
                value={transferReason}
                onChange={e => setTransferReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
              ></textarea>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 text-[11px]">
              Academic and financial history will be preserved. Past attendance and submissions remain tied to their original sessions.
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setTransferModalStudent(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-100 text-slate-700"
              >
                Cancel
              </button>
              <button
                disabled={!selectedTargetBatchId}
                onClick={handleCommitTransfer}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold"
              >
                Execute Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 4: ACCOUNT LOGIN STATUS ACTION                          */}
      {/* ------------------------------------------------------------- */}
      {accountActionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
              <AlertTriangle className={accountActionModal.action === 'suspend' || accountActionModal.action === 'deactivate' || accountActionModal.action === 'revoke_invitation' ? 'text-rose-600' : 'text-emerald-600'} size={20} />
              <h2 className="text-base font-bold text-slate-900">
                {accountActionModal.title}
              </h2>
            </div>

            <p className="text-slate-700 text-sm">
              Account: <strong className="text-slate-900">{accountActionModal.student?.full_name}</strong> ({accountActionModal.student?.email})
            </p>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 leading-relaxed text-[11px]">
              {accountActionModal.effectDescription}
            </div>

            {/* Suspension Reason (Required for suspend) */}
            {accountActionModal.action === 'suspend' && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Reason for Suspension *</label>
                  <textarea
                    required
                    rows="3"
                    placeholder="State administrative or compliance justification..."
                    value={accountActionModal.reason}
                    onChange={e => setAccountActionModal(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Optional End Date</label>
                  <input
                    type="date"
                    value={accountActionModal.endDate}
                    onChange={e => setAccountActionModal(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#0a7cb3]"
                  />
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={accountActionModal.isSubmitting}
                onClick={() => setAccountActionModal(prev => ({ ...prev, isOpen: false, student: null }))}
                className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={accountActionModal.isSubmitting || (accountActionModal.action === 'suspend' && !accountActionModal.reason.trim())}
                onClick={handleExecuteAccountAction}
                className={`px-4 py-2 rounded-lg font-semibold text-white shadow-xs cursor-pointer ${
                  accountActionModal.action === 'suspend' || accountActionModal.action === 'deactivate' || accountActionModal.action === 'revoke_invitation'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {accountActionModal.isSubmitting ? 'Updating...' : accountActionModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 5: ENROL STUDENT IN COURSE & BATCH                      */}
      {/* ------------------------------------------------------------- */}
      {enrollDrawerModal.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Enrol in Course & Batch</h2>
              <button
                type="button"
                onClick={() => setEnrollDrawerModal(prev => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {enrollDrawerModal.error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {enrollDrawerModal.error}
              </div>
            )}

            <form onSubmit={handleExecuteEnrollDrawer} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Select Program Course *</label>
                <select
                  required
                  value={enrollDrawerModal.course_id}
                  onChange={e => setEnrollDrawerModal(prev => ({ ...prev, course_id: e.target.value, batch_id: '' }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#0a7cb3]"
                >
                  <option value="">-- Choose Course --</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Select Cohort Batch *</label>
                <select
                  required
                  value={enrollDrawerModal.batch_id}
                  onChange={e => setEnrollDrawerModal(prev => ({ ...prev, batch_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#0a7cb3]"
                >
                  <option value="">-- Choose Batch --</option>
                  {batches
                    .filter(b => String(b.course_id) === String(enrollDrawerModal.course_id))
                    .map(b => (
                      <option key={b.id} value={b.id}>
                        {b.batch_code} - {b.title} ({b.delivery_mode})
                      </option>
                    ))}
                </select>
              </div>

              {(() => {
                const selectedCourse = courses.find(c => String(c.id) === String(enrollDrawerModal.course_id));
                if (!selectedCourse) return null;
                const isAccountActive = selectedStudentDetail?.student?.account_status === 'active';
                const dt = selectedCourse.access_duration_type || '6_months';
                let durText = '6 Months';
                let val = 6;
                let unit = 'months';
                if (dt === '1_month') { durText = '1 Month'; val = 1; }
                else if (dt === '3_months') { durText = '3 Months'; val = 3; }
                else if (dt === '6_months') { durText = '6 Months'; val = 6; }
                else if (dt === '12_months') { durText = '12 Months'; val = 12; }
                else if (dt === 'custom') {
                  val = selectedCourse.access_duration_value || 1;
                  unit = selectedCourse.access_duration_unit || 'months';
                  durText = `${val} ${unit.charAt(0).toUpperCase() + unit.slice(1)}`;
                }
                const expDate = calculateAccessExpiry(new Date(), val, unit);
                const expPreview = formatDate(expDate);

                return (
                  <div className="p-3 rounded-lg bg-sky-50 border border-sky-200 text-sky-950 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-sky-900">Course Access Duration:</span>
                      <span className="font-bold text-[#0a7cb3]">{durText}</span>
                    </div>
                    {isAccountActive ? (
                      <p className="text-[11px] text-sky-800">
                        Student account is active. Access will start immediately upon confirmation and will expire on <strong>{expPreview}</strong>.
                      </p>
                    ) : (
                      <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                        <strong>Pending Account Activation:</strong> This student has not yet activated their login. The {durText} access window clock will start automatically on the day they activate their account.
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={enrollDrawerModal.isSubmitting}
                  onClick={() => setEnrollDrawerModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enrollDrawerModal.isSubmitting || !enrollDrawerModal.course_id || !enrollDrawerModal.batch_id}
                  className="px-4 py-2 rounded-lg bg-[#0a7cb3] hover:bg-[#086491] disabled:opacity-40 text-white font-semibold cursor-pointer"
                >
                  {enrollDrawerModal.isSubmitting ? 'Enrolling...' : 'Confirm Enrolment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 6: WITHDRAW ENROLMENT CONFIRMATION                      */}
      {/* ------------------------------------------------------------- */}
      {withdrawDrawerModal.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Withdraw from Enrolment</h3>
                <p className="text-slate-600 leading-relaxed">
                  Withdraw student from <strong className="text-slate-900">{withdrawDrawerModal.enrollment?.course_title}</strong> (Batch: {withdrawDrawerModal.enrollment?.batch_code}).
                </p>
                <p className="text-slate-500 text-[11px] mt-1">
                  Academic continuity note: Withdrawing changes enrolment status but does not delete the student account or erase previous attendance, submissions, or grades.
                </p>
              </div>
            </div>

            {withdrawDrawerModal.error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {withdrawDrawerModal.error}
              </div>
            )}

            <form onSubmit={handleExecuteWithdrawDrawer} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Withdrawal Reason *</label>
                <textarea
                  required
                  rows="3"
                  placeholder="State the academic or administrative reason for withdrawal..."
                  value={withdrawDrawerModal.reason}
                  onChange={e => setWithdrawDrawerModal(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-rose-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={withdrawDrawerModal.isSubmitting}
                  onClick={() => setWithdrawDrawerModal(prev => ({ ...prev, isOpen: false, enrollment: null }))}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={withdrawDrawerModal.isSubmitting || !withdrawDrawerModal.reason.trim()}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-semibold cursor-pointer"
                >
                  {withdrawDrawerModal.isSubmitting ? 'Withdrawing...' : 'Confirm Withdrawal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 7: TRANSFER BATCH FROM ENROLMENT TAB                   */}
      {/* ------------------------------------------------------------- */}
      {transferDrawerModal.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Transfer Cohort Batch</h2>
              <button
                type="button"
                onClick={() => setTransferDrawerModal(prev => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {transferDrawerModal.error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {transferDrawerModal.error}
              </div>
            )}

            <form onSubmit={handleExecuteTransferDrawer} className="space-y-3">
              <div>
                <span className="text-slate-500 block mb-1">Current Course & Batch:</span>
                <p className="font-semibold text-slate-900">
                  {transferDrawerModal.enrollment?.course_title} ({transferDrawerModal.enrollment?.batch_code})
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Target Batch *</label>
                <select
                  required
                  value={transferDrawerModal.target_batch_id}
                  onChange={e => setTransferDrawerModal(prev => ({ ...prev, target_batch_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#0a7cb3]"
                >
                  <option value="">-- Choose Target Batch --</option>
                  {batches
                    .filter(b => String(b.course_id) === String(transferDrawerModal.enrollment?.course_id) && String(b.id) !== String(transferDrawerModal.enrollment?.batch_id))
                    .map(b => (
                      <option key={b.id} value={b.id}>
                        {b.batch_code} - {b.title} ({b.delivery_mode})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Reason for Transfer</label>
                <textarea
                  rows="2"
                  placeholder="Reason for cohort transfer..."
                  value={transferDrawerModal.reason}
                  onChange={e => setTransferDrawerModal(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#0a7cb3]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={transferDrawerModal.isSubmitting}
                  onClick={() => setTransferDrawerModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferDrawerModal.isSubmitting || !transferDrawerModal.target_batch_id}
                  className="px-4 py-2 rounded-lg bg-[#0a7cb3] hover:bg-[#086491] disabled:opacity-40 text-white font-semibold cursor-pointer"
                >
                  {transferDrawerModal.isSubmitting ? 'Transferring...' : 'Execute Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 8: EXTEND ENROLMENT ACCESS DURATION                     */}
      {/* ------------------------------------------------------------- */}
      {extendAccessModal.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 text-[#0a7cb3] flex items-center justify-center">
                  <Clock size={16} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Extend Course Access</h2>
                  <p className="text-slate-500 text-[11px]">Individual student access window extension</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExtendAccessModal(prev => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {extendAccessModal.error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {extendAccessModal.error}
              </div>
            )}

            <form onSubmit={handleExecuteExtendAccess} className="space-y-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <div className="text-slate-500">Course & Student:</div>
                <div className="font-semibold text-slate-900 text-xs">
                  {extendAccessModal.enrollment?.course_title}
                </div>
                <div className="text-[11px] text-slate-600">
                  Student: <strong>{selectedStudentDetail?.student?.full_name}</strong> ({selectedStudentDetail?.student?.email})
                </div>
                <div className="text-[11px] text-slate-500 pt-1">
                  Current Expiry: <strong className="text-slate-800">{extendAccessModal.enrollment?.expires_at ? formatDate(extendAccessModal.enrollment.expires_at) : 'Pending Activation'}</strong>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">New Access Expiry Date *</label>
                <input
                  type="date"
                  required
                  value={extendAccessModal.new_expires_at}
                  onChange={e => setExtendAccessModal(prev => ({ ...prev, new_expires_at: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#0a7cb3]"
                />
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[10.5px] text-slate-500 font-medium">Quick Add:</span>
                  {[
                    { label: '+1 Month', val: 1, unit: 'months' },
                    { label: '+3 Months', val: 3, unit: 'months' },
                    { label: '+6 Months', val: 6, unit: 'months' }
                  ].map(q => (
                    <button
                      key={q.label}
                      type="button"
                      onClick={() => {
                        const curExp = extendAccessModal.enrollment?.expires_at ? new Date(extendAccessModal.enrollment.expires_at) : new Date();
                        const base = curExp > new Date() ? curExp : new Date();
                        const nextD = calculateAccessExpiry(base, q.val, q.unit);
                        const yyyy = nextD.getFullYear();
                        const mm = String(nextD.getMonth() + 1).padStart(2, '0');
                        const dd = String(nextD.getDate()).padStart(2, '0');
                        setExtendAccessModal(prev => ({ ...prev, new_expires_at: `${yyyy}-${mm}-${dd}` }));
                      }}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-[10.5px] font-medium cursor-pointer"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Reason for Extension *</label>
                <textarea
                  required
                  rows="3"
                  placeholder="State the academic, medical, or administrative reason for granting additional access time..."
                  value={extendAccessModal.reason}
                  onChange={e => setExtendAccessModal(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#0a7cb3]"
                />
              </div>

              <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg text-[11px] text-sky-900">
                <strong>Progress Protection:</strong> Extending access will immediately restore or prolong full course access without resetting completed lessons, assignment scores, or attendance records.
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={extendAccessModal.isSubmitting}
                  onClick={() => setExtendAccessModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={extendAccessModal.isSubmitting || !extendAccessModal.new_expires_at || !extendAccessModal.reason.trim()}
                  className="px-4 py-2 rounded-lg bg-[#0a7cb3] hover:bg-[#086491] disabled:opacity-40 text-white font-semibold cursor-pointer"
                >
                  {extendAccessModal.isSubmitting ? 'Extending...' : 'Confirm Extension'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* DRAWER: 8-TAB COMPREHENSIVE STUDENT RECORD DETAIL             */}
      {/* ------------------------------------------------------------- */}
      {selectedStudentDetail && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-3xl bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl overflow-hidden">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-900 overflow-hidden">
                  {selectedStudentDetail.student?.avatar ? (
                    <img src={selectedStudentDetail.student.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    (selectedStudentDetail.student?.full_name || 'S')[0]
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">{selectedStudentDetail.student?.full_name}</h2>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      selectedStudentDetail.student?.account_status === 'active'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        : selectedStudentDetail.student?.account_status === 'invited'
                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                        : selectedStudentDetail.student?.account_status === 'archived'
                        ? 'bg-slate-200 text-slate-800'
                        : 'bg-rose-100 text-rose-900 border border-rose-200'
                    }`}>
                      {selectedStudentDetail.student?.account_status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs mt-0.5">
                    <span className="font-mono text-[#0A7CB3]">{selectedStudentDetail.student?.student_id_code}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-700">{selectedStudentDetail.student?.email}</span>
                  </div>
                </div>
              </div>
              <button onClick={onCloseStudentDetail} className="text-slate-500 hover:text-slate-900 p-2 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            {/* Student Record Action Toolbar */}
            <div className="px-5 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleOpenEditProfile(selectedStudentDetail.student)}
                  className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold flex items-center gap-1 text-[11px] cursor-pointer"
                >
                  <Edit3 size={13} className="text-blue-600" /> Edit Profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDetailTab('enrolments');
                    setEnrollDrawerModal({ isOpen: true, course_id: '', batch_id: '', isSubmitting: false, error: '' });
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold flex items-center gap-1 text-[11px] cursor-pointer"
                >
                  <UserPlus size={13} className="text-emerald-600" /> Enrol Course
                </button>
                {selectedStudentDetail.enrollments?.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setDetailTab('enrolments');
                      setTransferDrawerModal({ isOpen: true, enrollment: selectedStudentDetail.enrollments[0], target_batch_id: '', reason: '', isSubmitting: false, error: '' });
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <Layers size={13} className="text-[#0a7cb3]" /> Transfer Batch
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {selectedStudentDetail.student?.account_status === 'active' ? (
                  <button
                    type="button"
                    onClick={() => handleOpenAccountAction(selectedStudentDetail.student, 'deactivate')}
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <UserX size={13} className="text-slate-600" /> Deactivate
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenAccountAction(selectedStudentDetail.student, 'reactivate')}
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <UserCheck size={13} className="text-emerald-600" /> Reactivate
                  </button>
                )}
                {selectedStudentDetail.student?.is_archived || selectedStudentDetail.student?.account_status === 'archived' ? (
                  <button
                    type="button"
                    onClick={() => handleOpenRestoreModal(selectedStudentDetail.student)}
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-blue-50 border border-blue-200 text-blue-700 font-semibold flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <RotateCcw size={13} /> Restore
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenArchiveModal(selectedStudentDetail.student)}
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-amber-50 border border-amber-200 text-amber-800 font-semibold flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <Archive size={13} /> Archive
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleOpenDeleteModal(selectedStudentDetail.student)}
                  className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 font-semibold flex items-center gap-1 text-[11px] cursor-pointer"
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>

            {/* 8-Tab Navigation Bar */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-4 overflow-x-auto custom-scrollbar shrink-0">
              {[
                { id: 'profile', label: 'Profile' },
                { id: 'enrolments', label: 'Enrolments' },
                { id: 'attendance', label: 'Attendance' },
                { id: 'assessments', label: 'Assessments' },
                { id: 'documents', label: 'Documents' },
                { id: 'communications', label: 'Communications' },
                { id: 'activity', label: 'Activity' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setDetailTab(t.id)}
                  className={`px-3.5 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
                    detailTab === t.id
                      ? 'border-blue-500 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-5 text-xs text-slate-700 space-y-4 custom-scrollbar">
              {/* Tab 1: Profile */}
              {detailTab === 'profile' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Admission Date</span>
                      <strong className="text-slate-900">{formatDate(selectedStudentDetail.student?.admission_date)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Academic Coordinator</span>
                      <strong className="text-slate-900">{selectedStudentDetail.student?.coordinator_name || 'Unassigned'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Education</span>
                      <strong className="text-slate-900">{selectedStudentDetail.student?.education || 'Not specified'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Experience</span>
                      <strong className="text-slate-900">{selectedStudentDetail.student?.experience_years || '0-1 Years'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Account Status</span>
                      <span className="font-mono text-[#0A7CB3] uppercase font-semibold">{selectedStudentDetail.student?.account_status}</span>
                    </div>
                  </div>

                  {selectedStudentDetail.student?.internal_notes && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-xs font-semibold text-[#0A7CB3] uppercase tracking-wider">Internal Staff Notes</span>
                      <p className="text-slate-700 leading-relaxed">{selectedStudentDetail.student.internal_notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Enrolments */}
              {detailTab === 'enrolments' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Course & Batch Enrolments</h4>
                      <p className="text-xs text-slate-500">Manage enrolled courses, cohort batches, transfers, and withdrawals.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEnrollDrawerModal({
                        isOpen: true,
                        course_id: courses[0]?.id || '',
                        batch_id: '',
                        isSubmitting: false,
                        error: ''
                      })}
                      className="px-3 py-1.5 rounded-lg bg-[#0a7cb3] hover:bg-[#086491] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
                    >
                      <UserPlus size={14} /> Enrol in Course & Batch
                    </button>
                  </div>

                  {/* Enrolments List */}
                  {(selectedStudentDetail.enrollments || []).length === 0 ? (
                    <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="font-semibold text-slate-700">No active or historical enrolments</p>
                      <p className="text-xs text-slate-400 mt-1">Click above to enrol this student into a course and cohort.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(selectedStudentDetail.enrollments || []).map(e => {
                        const win = getAccessWindowInfo(e.expires_at);
                        const isPending = e.access_status === 'pending_activation';
                        const enrStatus = e.status || e.enrollment_status;
                        const eid = e.id || e.enrollment_id;

                        return (
                        <div key={eid} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-bold text-slate-900 text-sm">{e.course_title}</h3>
                              <span className="font-mono text-xs font-semibold text-[#0a7cb3] bg-sky-50 px-2 py-0.5 rounded border border-sky-200 mt-1 inline-block">
                                {e.batch_code || 'Unassigned Batch'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                                enrStatus === 'active'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : enrStatus === 'transferred'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-rose-100 text-rose-800 border border-rose-200'
                              }`}>
                                {enrStatus}
                              </span>

                              {isPending ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                  Pending Activation
                                </span>
                              ) : win.isExpired ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                                  Access Expired
                                </span>
                              ) : win.isExpiringSoon ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                                  <AlertTriangle size={10} /> Expiring Soon ({win.remainingDays}d)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  Access Active ({win.remainingDays}d)
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-500 text-[11px] pt-1 border-t border-slate-200/60">
                            <div>Duration: <strong className="text-slate-800">{e.access_duration_applied || '6 Months'}</strong></div>
                            <div>Access Start: <strong className="text-slate-800">{e.access_start_at ? formatDate(e.access_start_at) : (isPending ? 'Upon Activation' : 'Immediate')}</strong></div>
                            <div>Access Expiry: <strong className="text-slate-800">{e.expires_at ? formatDate(e.expires_at) : (isPending ? 'Upon Activation' : 'No Expiry')}</strong></div>
                            <div>Status: <strong className={win.isExpired ? 'text-rose-600' : (win.isExpiringSoon ? 'text-amber-600' : 'text-slate-800')}>{isPending ? 'Pending' : (win.isExpired ? 'Expired' : `${win.remainingDays}d left`)}</strong></div>
                          </div>

                          {e.extensions && e.extensions.length > 0 && (
                            <div className="p-2.5 rounded-lg bg-sky-50/70 border border-sky-100 text-[11px] text-sky-950 space-y-1">
                              <div className="font-semibold text-sky-900 flex items-center gap-1">
                                <Clock size={12} className="text-[#0a7cb3]" />
                                <span>Access Extension History ({e.extensions.length})</span>
                              </div>
                              {e.extensions.map((ext, idx) => (
                                <div key={idx} className="pl-2 border-l-2 border-sky-300 text-[10.5px] text-slate-700">
                                  Extended to <strong>{formatDate(ext.new_expires_at)}</strong> by {ext.extended_by_name || 'Admin'} on {formatDate(ext.created_at)}: <em>"{ext.reason}"</em>
                                </div>
                              ))}
                            </div>
                          )}

                          {e.transfer_from_batch_id && (
                            <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                              Transferred from batch #{e.transfer_from_batch_id}: {e.transfer_reason}
                            </div>
                          )}

                          {enrStatus === 'withdrawn' && (
                            <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-900 text-[11px]">
                              Withdrawn: {e.withdrawal_reason || 'Administrative withdrawal'}. Historical attendance and submissions remain intact.
                            </div>
                          )}

                          {/* Actions: Extend Access, Transfer, Withdraw */}
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
                            <button
                              type="button"
                              onClick={() => {
                                const curExp = e.expires_at ? new Date(e.expires_at) : new Date();
                                const base = curExp > new Date() ? curExp : new Date();
                                const nextD = calculateAccessExpiry(base, 1, 'months');
                                const yyyy = nextD.getFullYear();
                                const mm = String(nextD.getMonth() + 1).padStart(2, '0');
                                const dd = String(nextD.getDate()).padStart(2, '0');
                                setExtendAccessModal({
                                  isOpen: true,
                                  enrollment: e,
                                  new_expires_at: `${yyyy}-${mm}-${dd}`,
                                  reason: '',
                                  isSubmitting: false,
                                  error: ''
                                });
                              }}
                              className="px-2.5 py-1 rounded bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 text-sky-700 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                            >
                              <Clock size={12} /> Extend Access
                            </button>

                            {enrStatus === 'active' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setTransferDrawerModal({
                                    isOpen: true,
                                    enrollment: e,
                                    target_batch_id: '',
                                    reason: '',
                                    isSubmitting: false,
                                    error: ''
                                  })}
                                  className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                                >
                                  <Layers size={12} /> Transfer Batch
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setWithdrawDrawerModal({
                                    isOpen: true,
                                    enrollment: e,
                                    reason: '',
                                    isSubmitting: false,
                                    error: ''
                                  })}
                                  className="px-2.5 py-1 rounded bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-rose-700 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                                >
                                  <UserMinus size={12} /> Withdraw
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                      })}
                    </div>
                  )}

                  {/* Academic History Preservation Note */}
                  <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 text-xs text-sky-900 space-y-1">
                    <div className="font-semibold flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-[#0a7cb3]" />
                      <span>Academic Continuity Guaranteed</span>
                    </div>
                    <p className="text-slate-600 text-[11px]">
                      Enrolment changes, transfers, and withdrawals maintain full audit trails without erasing attendance records, assignment deliverables, or awarded grades.
                    </p>
                  </div>
                </div>
              )}

              {/* Tab 3: Attendance */}
              {detailTab === 'attendance' && (
                <div className="space-y-3">
                  {(selectedStudentDetail.attendance || []).length === 0 ? (
                    <p className="text-slate-500 text-center py-8">No attendance records logged yet.</p>
                  ) : (
                    (selectedStudentDetail.attendance || []).map(a => (
                      <div key={a.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                        <div>
                          <strong className="text-slate-900 block">{a.topic}</strong>
                          <span className="text-[11px] text-slate-500">{formatDateTime(a.start_time)} ({a.session_type})</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold uppercase ${
                          a.status === 'present' ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' : 'bg-rose-100 text-rose-900 border border-rose-200'
                        }`}>
                          {a.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 4: Assessments */}
              {detailTab === 'assessments' && (
                <div className="space-y-3">
                  {(selectedStudentDetail.assessments || []).length === 0 ? (
                    <p className="text-slate-500 text-center py-8">No submissions recorded.</p>
                  ) : (
                    (selectedStudentDetail.assessments || []).map(sub => (
                      <div key={sub.id} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <strong className="text-slate-900">{sub.task_title}</strong>
                          <span className="font-mono font-bold text-[#0A7CB3]">Score: {sub.score !== null ? `${sub.score}/100` : 'Ungraded'}</span>
                        </div>
                        {sub.feedback && (
                          <div className="p-2 rounded bg-white text-slate-700 text-[11px] border border-slate-200">
                            Faculty Feedback: "{sub.feedback}"
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 5: Documents */}
              {detailTab === 'documents' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="font-semibold text-slate-900 block">Admissions Dossier</span>
                    <p className="text-slate-500 text-xs">
                      ID verification, degree credentials, and technical resume.
                    </p>
                    <div className="flex items-center gap-2 pt-2">
                      <span className="px-2.5 py-1 rounded bg-slate-50 text-slate-700 border border-slate-200 text-xs">
                        National ID: Verified
                      </span>
                      <span className="px-2.5 py-1 rounded bg-slate-50 text-slate-700 border border-slate-200 text-xs">
                        Academic Transcripts: On File
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 7: Communications */}
              {detailTab === 'communications' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="font-semibold text-slate-900 block">Single-Use Account Activation Link</span>
                    <p className="text-slate-500 text-xs">
                      Invitation status: <strong className="text-amber-700 uppercase font-mono">{selectedStudentDetail.student?.account_status}</strong>
                    </p>
                    {selectedStudentDetail.student?.invitation_token && (
                      <div className="p-2.5 rounded bg-white border border-slate-200 font-mono text-[#0A7CB3] text-[11px] break-all select-all">
                        https://lms.aaroha-inc.com/activate?token={selectedStudentDetail.student.invitation_token}
                      </div>
                    )}
                    <button
                      onClick={() => onResendInvite(selectedStudentDetail.student?.id)}
                      className="mt-2 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs"
                    >
                      Regenerate & Resend Link
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 8: Activity */}
              {detailTab === 'activity' && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-slate-900 mb-2">Audit History</h4>
                  <div className="space-y-2 font-mono text-[11px]">
                    <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-slate-700">
                      [{formatDate(selectedStudentDetail.student?.admission_date)}] Student profile created & enrolled.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: EDIT STUDENT PROFILE                                   */}
      {/* ------------------------------------------------------------- */}
      {editProfileModal.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Edit Student Profile</h2>
              <button
                type="button"
                onClick={() => setEditProfileModal(prev => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {editProfileModal.error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {editProfileModal.error}
              </div>
            )}

            <form onSubmit={handleExecuteEditProfile} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={editProfileModal.full_name}
                  onChange={e => setEditProfileModal(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#0a7cb3]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={editProfileModal.email}
                    onChange={e => setEditProfileModal(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#0a7cb3]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Mobile Contact</label>
                  <input
                    type="text"
                    value={editProfileModal.mobile}
                    onChange={e => setEditProfileModal(prev => ({ ...prev, mobile: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#0a7cb3]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Highest Degree / Education</label>
                  <input
                    type="text"
                    placeholder="e.g. B.Tech Computer Science"
                    value={editProfileModal.education}
                    onChange={e => setEditProfileModal(prev => ({ ...prev, education: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#0a7cb3]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Work Experience</label>
                  <select
                    value={editProfileModal.experience_years}
                    onChange={e => setEditProfileModal(prev => ({ ...prev, experience_years: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#0a7cb3]"
                  >
                    <option value="0-1 Years">0-1 Years (Fresher)</option>
                    <option value="1-3 Years">1-3 Years (Junior)</option>
                    <option value="3-5 Years">3-5 Years (Mid-level)</option>
                    <option value="5+ Years">5+ Years (Senior)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Assigned Academic Coordinator</label>
                <select
                  value={editProfileModal.coordinator_id}
                  onChange={e => setEditProfileModal(prev => ({ ...prev, coordinator_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#0a7cb3]"
                >
                  <option value="">-- No Dedicated Coordinator --</option>
                  {coordinators.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Internal Academic Notes</label>
                <textarea
                  rows="2"
                  value={editProfileModal.internal_notes}
                  onChange={e => setEditProfileModal(prev => ({ ...prev, internal_notes: e.target.value }))}
                  className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#0a7cb3]"
                  placeholder="Private coordinator notes, special learning requirements..."
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={editProfileModal.isSubmitting}
                  onClick={() => setEditProfileModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editProfileModal.isSubmitting || !editProfileModal.full_name.trim()}
                  className="px-4 py-2 rounded-lg bg-[#0a7cb3] hover:bg-[#086491] disabled:opacity-40 text-white font-semibold cursor-pointer"
                >
                  {editProfileModal.isSubmitting ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ARCHIVE STUDENT MODAL                                  */}
      {/* ------------------------------------------------------------- */}
      {archiveModal.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                <Archive className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Archive Student Record</h3>
                <p className="text-slate-600 leading-relaxed">
                  Student: <strong className="text-slate-900">{archiveModal.student?.full_name}</strong> ({archiveModal.student?.student_id_code})
                </p>
                <p className="text-slate-500 text-[11px] mt-1">
                  Archiving removes the student from default operational rosters, blocks login and terminates active sessions, while strictly preserving all historical coursework, attendance, scores, and issued certificates.
                </p>
              </div>
            </div>

            {archiveModal.error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {archiveModal.error}
              </div>
            )}

            <form onSubmit={handleExecuteArchive} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Archival Reason *</label>
                <textarea
                  required
                  rows="2"
                  placeholder="Reason for archiving (e.g. Program completed, long-term leave, administrative hold)..."
                  value={archiveModal.reason}
                  onChange={e => setArchiveModal(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1.5">Active Enrolment Resolution *</label>
                <div className="space-y-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px]">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="enrolment_resolution"
                      value="retain_history"
                      checked={archiveModal.enrolment_resolution === 'retain_history'}
                      onChange={() => setArchiveModal(prev => ({ ...prev, enrolment_resolution: 'retain_history' }))}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-900 block">Retain Current Enrolment History</span>
                      <span className="text-slate-500">Preserves active cohort status on file without altering enrollment state.</span>
                    </div>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="enrolment_resolution"
                      value="withdraw_active"
                      checked={archiveModal.enrolment_resolution === 'withdraw_active'}
                      onChange={() => setArchiveModal(prev => ({ ...prev, enrolment_resolution: 'withdraw_active' }))}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-900 block">Formally Withdraw Active Enrolments</span>
                      <span className="text-slate-500">Marks active enrollments as withdrawn with the archival reason recorded.</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={archiveModal.isSubmitting}
                  onClick={() => setArchiveModal(prev => ({ ...prev, isOpen: false, student: null }))}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={archiveModal.isSubmitting || !archiveModal.reason.trim()}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-semibold cursor-pointer"
                >
                  {archiveModal.isSubmitting ? 'Archiving...' : 'Confirm Archival'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: RESTORE STUDENT MODAL                                  */}
      {/* ------------------------------------------------------------- */}
      {restoreModal.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Restore Archived Student</h3>
                <p className="text-slate-600 leading-relaxed">
                  Restore <strong className="text-slate-900">{restoreModal.student?.full_name}</strong> to the operational roster.
                </p>
                <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                  Governance Notice: In accordance with academic audit regulations, restoring an archived student places their account in a <strong>DEACTIVATED</strong> state. It does <em>NOT</em> automatically grant login access or re-enroll them into withdrawn cohorts. Reactivation and cohort assignment must be performed explicitly.
                </p>
              </div>
            </div>

            {restoreModal.error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {restoreModal.error}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={restoreModal.isSubmitting}
                onClick={() => setRestoreModal(prev => ({ ...prev, isOpen: false, student: null }))}
                className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={restoreModal.isSubmitting}
                onClick={handleExecuteRestore}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold cursor-pointer"
              >
                {restoreModal.isSubmitting ? 'Restoring...' : 'Restore Student'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: DELETE STUDENT WITH DEPENDENCY VERIFICATION            */}
      {/* ------------------------------------------------------------- */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                deleteModal.eligibility?.can_delete
                  ? 'bg-rose-50 border border-rose-200 text-rose-700'
                  : 'bg-amber-50 border border-amber-200 text-amber-700'
              }`}>
                {deleteModal.eligibility?.can_delete ? <Trash2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {deleteModal.isChecking ? 'Checking Record Dependencies...' : deleteModal.eligibility?.can_delete ? 'Permanently Delete Student' : 'Permanent Deletion Blocked'}
                </h3>
                <p className="text-slate-600 mt-0.5">
                  Student: <strong className="text-slate-900">{deleteModal.student?.full_name}</strong> ({deleteModal.student?.student_id_code || deleteModal.student?.email})
                </p>
              </div>
            </div>

            {deleteModal.isChecking ? (
              <div className="p-4 text-center text-slate-500 font-medium">Checking academic and financial records...</div>
            ) : !deleteModal.eligibility?.can_delete ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
                  <div className="font-semibold flex items-center gap-1.5 text-xs text-rose-800">
                    <AlertCircle size={15} /> Academic & Regulatory Retention Notice
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Institutional governance strictly prohibits permanently deleting students with historical coursework or financial records. This student has active dependencies that must be retained for academic integrity and compliance.
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-rose-200/60 font-medium text-[11px]">
                    <div>• Attendance Sessions: <strong className="font-mono">{deleteModal.eligibility?.stats?.attendance_count || 0}</strong></div>
                    <div>• Task Submissions: <strong className="font-mono">{deleteModal.eligibility?.stats?.submissions_count || 0}</strong></div>
                    <div>• Fee Payments: <strong className="font-mono">{deleteModal.eligibility?.stats?.payments_count || 0}</strong></div>
                    <div>• Issued Certificates: <strong className="font-mono">{deleteModal.eligibility?.stats?.certificates_count || 0}</strong></div>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-[11px] space-y-1">
                  <span className="font-semibold block text-slate-900">Recommended Alternative Actions:</span>
                  <p>• <strong>Deactivate:</strong> Blocks student login immediately and invalidates active sessions while preserving records.</p>
                  <p>• <strong>Archive:</strong> Removes the student from operational rosters and blocks login, preserving full historical transcripts.</p>
                  <p>• <strong>Withdraw Enrolment:</strong> Ends their active cohort participation while keeping their account intact.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] space-y-1">
                  <span className="font-semibold block">Dependency Verification Passed: Eligible for Deletion</span>
                  <p>This student has zero attendance records, zero task submissions, zero fee payments, and zero certificates. They can be safely deleted.</p>
                  {deleteModal.eligibility?.is_multi_role && (
                    <p className="text-amber-800 font-medium pt-1">
                      Notice: This user also has another authorized role ({deleteModal.eligibility?.roles?.filter(r => r !== 'student').join(', ')}). Only the student role and profile will be deleted; their primary account and other roles remain safe.
                    </p>
                  )}
                </div>
                <p className="text-slate-600 text-[11px]">
                  To confirm permanent deletion, please type <strong className="text-slate-900">DELETE</strong> below:
                </p>
                <input
                  type="text"
                  placeholder="Type DELETE to confirm"
                  value={deleteModal.confirmText}
                  onChange={e => setDeleteModal(prev => ({ ...prev, confirmText: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-rose-500 font-mono text-xs"
                />
              </div>
            )}

            {deleteModal.error && (
              <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {deleteModal.error}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={deleteModal.isSubmitting}
                onClick={() => setDeleteModal({ isOpen: false, student: null, isChecking: false, eligibility: null, confirmText: '', isSubmitting: false, error: '' })}
                className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              {deleteModal.eligibility?.can_delete ? (
                <button
                  type="button"
                  disabled={deleteModal.isSubmitting || deleteModal.confirmText !== 'DELETE'}
                  onClick={handleExecuteDeleteStudent}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-semibold cursor-pointer"
                >
                  {deleteModal.isSubmitting ? 'Deleting...' : 'Permanently Delete'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const st = deleteModal.student;
                    setDeleteModal({ isOpen: false, student: null, isChecking: false, eligibility: null, confirmText: '', isSubmitting: false, error: '' });
                    if (st) handleOpenArchiveModal(st);
                  }}
                  className="px-4 py-2 rounded-lg bg-[#0a7cb3] hover:bg-[#086491] text-white font-semibold cursor-pointer"
                >
                  Archive Student Instead
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

