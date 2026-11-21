import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  GraduationCap, PlusCircle, Search, Mail, Phone, Calendar,
  Layers, Clock, AlertTriangle, CheckCircle2, UserX, UserCheck, X, RefreshCw,
  Eye, Edit3, ShieldAlert, XCircle, UserMinus, UserPlus, AlertCircle,
  RotateCcw, Trash2, Archive, ChevronDown, UserCheck2, KeyRound, Link as LinkIcon
} from 'lucide-react';
import { formatDate } from '../../adminUtils';
import api from '../../apiService';

export default function AdminFacultyTab({
  faculty = [],
  courses = [],
  batches = [],
  onAddFaculty,
  onUpdateFaculty,
  onToggleFacultyStatus,
  onResendInvite,
  onGenerateSetupLink,
  onGenerateResetLink,
  onRevokeInvite,
  onDeleteFaculty,
  showToast
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Roster View: Active Faculty vs Archived Faculty
  const [rosterView, setRosterView] = useState('active'); // 'active' | 'archived'
  const [archivedFaculty, setArchivedFaculty] = useState([]);
  const [isArchivedLoading, setIsArchivedLoading] = useState(false);
  const [actionMenuState, setActionMenuState] = useState(null); // { id, faculty, rect }

  const handleToggleActionMenu = (e, fac) => {
    e.stopPropagation();
    if (actionMenuState?.id === fac.user_id) {
      setActionMenuState(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      setActionMenuState({
        id: fac.user_id,
        faculty: fac,
        rect: {
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
          width: rect.width,
          height: rect.height,
        },
      });
    }
  };

  useEffect(() => {
    if (!actionMenuState) return;

    const handlePointerDown = (e) => {
      const isTrigger = e.target instanceof Element && e.target.closest('[data-action-menu-trigger]');
      const isMenu = e.target instanceof Element && e.target.closest('[data-action-menu-dropdown]');
      if (!isTrigger && !isMenu) {
        setActionMenuState(null);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActionMenuState(null);
      }
    };

    const handleScrollOrResize = (e) => {
      if (e.target instanceof Element && e.target.closest('[data-action-menu-dropdown]')) {
        return;
      }
      setActionMenuState(null);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [actionMenuState]);

  // Edit Faculty Profile Modal
  const [editProfileModal, setEditProfileModal] = useState({
    isOpen: false,
    faculty: null,
    full_name: '',
    email: '',
    mobile: '',
    title: '',
    expertise: '',
    qualifications: '',
    internal_notes: '',
    isSubmitting: false,
    error: ''
  });

  // Deactivate / Archive Workload Resolution Modal
  const [workloadModal, setWorkloadModal] = useState({
    isOpen: false,
    faculty: null,
    action: 'deactivate', // 'deactivate' | 'archive'
    reason: '',
    resolution: 'unassign', // 'reassign' | 'unassign'
    substitute_faculty_id: '',
    workload: null,
    isLoadingWorkload: true,
    isSubmitting: false,
    error: ''
  });

  // Restore Faculty Modal
  const [restoreModal, setRestoreModal] = useState({
    isOpen: false,
    faculty: null,
    isSubmitting: false,
    error: ''
  });

  // Delete Faculty Modal (with dependency checks)
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    faculty: null,
    isChecking: true,
    eligibility: null,
    confirmText: '',
    forceOverride: false,
    isSubmitting: false,
    error: ''
  });

  const loadArchivedFaculty = async () => {
    setIsArchivedLoading(true);
    try {
      const res = await api.adminGetFaculty({ view: 'archived' });
      if (res && res.success && Array.isArray(res.faculty)) {
        setArchivedFaculty(res.faculty);
      }
    } catch (err) {
      console.warn('Failed to load archived faculty:', err);
    } finally {
      setIsArchivedLoading(false);
    }
  };

  useEffect(() => {
    if (rosterView === 'archived') {
      loadArchivedFaculty();
    }
  }, [rosterView]);

  const handleOpenEditProfile = (f) => {
    setEditProfileModal({
      isOpen: true,
      faculty: f,
      full_name: f.full_name || '',
      email: f.email || '',
      mobile: f.mobile || '',
      title: f.title || 'Senior Systems Faculty',
      expertise: f.expertise || '',
      qualifications: f.qualifications || '',
      internal_notes: f.internal_notes || '',
      isSubmitting: false,
      error: ''
    });
  };

  const handleExecuteEditProfile = async (e) => {
    e.preventDefault();
    if (!editProfileModal.faculty || !editProfileModal.full_name.trim()) return;
    try {
      setEditProfileModal(prev => ({ ...prev, isSubmitting: true, error: '' }));
      await api.adminUpdateFacultyProfile(editProfileModal.faculty.user_id, {
        full_name: editProfileModal.full_name,
        email: editProfileModal.email,
        mobile: editProfileModal.mobile,
        title: editProfileModal.title,
        expertise: editProfileModal.expertise,
        qualifications: editProfileModal.qualifications,
        internal_notes: editProfileModal.internal_notes
      });
      const facultyId = editProfileModal.faculty.user_id;
      setEditProfileModal({ isOpen: false, faculty: null, full_name: '', email: '', mobile: '', title: '', expertise: '', qualifications: '', internal_notes: '', isSubmitting: false, error: '' });
      if (onUpdateFaculty) await onUpdateFaculty();
      if (selectedFaculty && selectedFaculty.user_id === facultyId) {
        setSelectedFaculty(prev => ({ ...prev, full_name: editProfileModal.full_name, title: editProfileModal.title, expertise: editProfileModal.expertise }));
      }
      if (rosterView === 'archived') await loadArchivedFaculty();
    } catch (err) {
      setEditProfileModal(prev => ({ ...prev, isSubmitting: false, error: err.message || 'Failed to update faculty profile.' }));
    }
  };

  const handleOpenWorkloadAction = async (f, action) => {
    setWorkloadModal({
      isOpen: true,
      faculty: f,
      action,
      reason: '',
      resolution: 'unassign',
      substitute_faculty_id: '',
      workload: null,
      isLoadingWorkload: true,
      isSubmitting: false,
      error: ''
    });

    try {
      const res = await api.adminGetFacultyWorkload(f.user_id);
      setWorkloadModal(prev => ({
        ...prev,
        isLoadingWorkload: false,
        workload: res,
        substitute_faculty_id: res?.available_substitutes?.[0]?.user_id || ''
      }));
    } catch (err) {
      setWorkloadModal(prev => ({
        ...prev,
        isLoadingWorkload: false,
        error: 'Failed to inspect teaching workload.'
      }));
    }
  };

  const handleExecuteWorkloadAction = async (e) => {
    e.preventDefault();
    if (!workloadModal.faculty) return;
    try {
      setWorkloadModal(prev => ({ ...prev, isSubmitting: true, error: '' }));
      const payload = {
        reason: workloadModal.reason || (workloadModal.action === 'deactivate' ? 'Administrative deactivation' : 'Faculty record archived'),
        workload_resolution: workloadModal.resolution,
        substitute_faculty_id: workloadModal.resolution === 'reassign' ? workloadModal.substitute_faculty_id : undefined
      };

      if (workloadModal.action === 'deactivate') {
        await api.adminDeactivateFaculty(workloadModal.faculty.user_id, payload);
      } else {
        await api.adminArchiveFaculty(workloadModal.faculty.user_id, payload);
      }

      const facultyId = workloadModal.faculty.user_id;
      setWorkloadModal({ isOpen: false, faculty: null, action: 'deactivate', reason: '', resolution: 'unassign', substitute_faculty_id: '', workload: null, isLoadingWorkload: false, isSubmitting: false, error: '' });
      if (onToggleFacultyStatus) await onToggleFacultyStatus(facultyId, { status: workloadModal.action });
      if (onUpdateFaculty) await onUpdateFaculty();
      if (selectedFaculty && selectedFaculty.user_id === facultyId) {
        setSelectedFaculty(prev => ({ ...prev, account_status: workloadModal.action }));
      }
      if (rosterView === 'archived') await loadArchivedFaculty();
    } catch (err) {
      setWorkloadModal(prev => ({ ...prev, isSubmitting: false, error: err.message || 'Operation failed.' }));
    }
  };

  const handleOpenRestoreModal = (f) => {
    setRestoreModal({
      isOpen: true,
      faculty: f,
      isSubmitting: false,
      error: ''
    });
  };

  const handleExecuteRestore = async () => {
    if (!restoreModal.faculty) return;
    try {
      setRestoreModal(prev => ({ ...prev, isSubmitting: true, error: '' }));
      await api.adminRestoreFaculty(restoreModal.faculty.user_id);
      const facultyId = restoreModal.faculty.user_id;
      setRestoreModal({ isOpen: false, faculty: null, isSubmitting: false, error: '' });
      if (onUpdateFaculty) await onUpdateFaculty();
      if (selectedFaculty && selectedFaculty.user_id === facultyId) {
        setSelectedFaculty(prev => ({ ...prev, account_status: 'deactivated', is_archived: 0 }));
      }
      if (rosterView === 'archived') await loadArchivedFaculty();
    } catch (err) {
      setRestoreModal(prev => ({ ...prev, isSubmitting: false, error: err.message || 'Failed to restore faculty.' }));
    }
  };

  const handleOpenDeleteModal = async (f) => {
    setDeleteModal({
      isOpen: true,
      faculty: f,
      isChecking: true,
      eligibility: null,
      confirmText: '',
      forceOverride: false,
      isSubmitting: false,
      error: ''
    });
    try {
      const facultyId = f.user_id || f.id;
      const res = await api.adminCheckFacultyDeletion(facultyId);
      setDeleteModal(prev => ({
        ...prev,
        isChecking: false,
        eligibility: res,
        error: ''
      }));
    } catch (err) {
      setDeleteModal(prev => ({
        ...prev,
        isChecking: false,
        eligibility: {
          can_delete: true,
          can_delete_permanently: true,
          eligible: true,
          is_ghost: true,
          dependencies: [],
          warnings: [],
          reason: 'Faculty record was not found in active database and can be purged from view.'
        },
        error: ''
      }));
    }
  };

  const handleExecuteDeleteFaculty = async () => {
    if (!deleteModal.faculty || deleteModal.confirmText !== 'DELETE') return;
    try {
      setDeleteModal(prev => ({ ...prev, isSubmitting: true, error: '' }));
      const facultyId = deleteModal.faculty.user_id || deleteModal.faculty.id;
      await api.adminDeleteFaculty(facultyId, { force: deleteModal.forceOverride });
      setArchivedFaculty(prev => prev.filter(item => (item.user_id || item.id) !== facultyId));
      setDeleteModal({ isOpen: false, faculty: null, isChecking: false, eligibility: null, confirmText: '', forceOverride: false, isSubmitting: false, error: '' });
      if (selectedFaculty && (selectedFaculty.user_id === facultyId || selectedFaculty.id === facultyId)) {
        setSelectedFaculty(null);
      }
      if (onUpdateFaculty) await onUpdateFaculty();
      if (onDeleteFaculty) await onDeleteFaculty();
      if (rosterView === 'archived') await loadArchivedFaculty();
      if (showToast) showToast('Faculty record removed successfully');
    } catch (err) {
      setDeleteModal(prev => ({ ...prev, isSubmitting: false, error: err.message || 'Failed to delete faculty member.' }));
    }
  };

  // Selected Faculty for Detail / Teaching Assignments Drawer
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [facultyDrawerTab, setFacultyDrawerTab] = useState('assignments'); // 'assignments' | 'profile'
  const [assignments, setAssignments] = useState([]);
  const [isAssignmentsLoading, setIsAssignmentsLoading] = useState(false);

  // Assignment Modals
  const [assignModal, setAssignModal] = useState({
    isOpen: false,
    course_id: '',
    batch_id: '',
    role: 'lead',
    isSubmitting: false,
    error: ''
  });

  const [removeAssignmentModal, setRemoveAssignmentModal] = useState({
    isOpen: false,
    assignment: null,
    isSubmitting: false,
    warning: ''
  });

  // Account Status Action Modal (Deactivate, Suspend, Reactivate, Restore, Revoke)
  const [accountActionModal, setAccountActionModal] = useState({
    isOpen: false,
    faculty: null,
    action: '', // 'deactivate' | 'suspend' | 'reactivate' | 'restore' | 'revoke_invitation'
    title: '',
    reason: '',
    endDate: '',
    effectDescription: '',
    confirmLabel: '',
    isSubmitting: false
  });

  const [newFaculty, setNewFaculty] = useState({
    full_name: '',
    email: '',
    mobile: '',
    title: 'Senior Systems Faculty',
    expertise: '',
    courses_taught: [],
    availability: ['Mon-Fri 18:00-21:00 IST', 'Sat 10:00-14:00 IST'],
    batch_ids: [],
    internal_notes: ''
  });

  // Scoped filtering: strictly displays records, never writes to backend
  const currentFacultyList = rosterView === 'active' ? faculty : archivedFaculty;
  const filteredFaculty = currentFacultyList.filter(f => {
    const matchesSearch = !searchTerm ||
      (f.full_name && f.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (f.email && f.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (f.expertise && f.expertise.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (f.faculty_id_code && f.faculty_id_code.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || f.account_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Load teaching assignments when faculty drawer opens
  const fetchTeachingAssignments = async (facultyId) => {
    setIsAssignmentsLoading(true);
    try {
      const res = await api.adminGetFacultyAssignments(facultyId);
      if (res && res.assignments) {
        setAssignments(res.assignments);
      }
    } catch (err) {
      console.warn('Failed to load teaching assignments:', err);
    } finally {
      setIsAssignmentsLoading(false);
    }
  };

  const handleOpenFacultyDrawer = async (f, tab = 'assignments') => {
    setSelectedFaculty(f);
    setFacultyDrawerTab(tab);
    await fetchTeachingAssignments(f.user_id);
  };

  const handleCreateFaculty = async (e) => {
    e.preventDefault();
    if (!newFaculty.full_name || !newFaculty.email) return;

    try {
      setIsSubmitting(true);
      await onAddFaculty(newFaculty);
      setIsOnboardModalOpen(false);
      setNewFaculty({
        full_name: '',
        email: '',
        mobile: '',
        title: 'Senior Systems Faculty',
        expertise: '',
        courses_taught: [],
        availability: ['Mon-Fri 18:00-21:00 IST', 'Sat 10:00-14:00 IST'],
        batch_ids: [],
        internal_notes: ''
      });
    } catch (err) {
      alert('Failed to onboard faculty: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Account Status Action Modal
  const handleOpenAccountAction = (f, action) => {
    let title = '';
    let effectDescription = '';
    let confirmLabel = '';

    if (action === 'deactivate') {
      title = 'Deactivate Faculty Account';
      effectDescription = 'Deactivating this account will immediately revoke all active JWT sessions and block faculty portal access. Teaching history and existing assignments remain preserved.';
      confirmLabel = 'Deactivate Account';
    } else if (action === 'suspend') {
      title = 'Suspend Faculty Account';
      effectDescription = 'Suspension immediately terminates active sessions and blocks API access. You must provide an explicit administrative reason for the audit log.';
      confirmLabel = 'Suspend Account';
    } else if (action === 'reactivate') {
      title = 'Reactivate Faculty Account';
      effectDescription = 'Reactivating restores the faculty member\'s ability to log in with their institutional credentials. All existing teaching assignments and history remain unchanged.';
      confirmLabel = 'Reactivate Account';
    } else if (action === 'restore') {
      title = 'Restore Suspended Faculty Access';
      effectDescription = 'Clears the suspension status and restores login access. All teaching records remain unchanged.';
      confirmLabel = 'Restore Access';
    } else if (action === 'revoke_invitation') {
      title = 'Revoke Faculty Invitation';
      effectDescription = 'Invalidates the single-use onboarding token. The user will not be able to activate an account until a new invitation is generated.';
      confirmLabel = 'Revoke Invitation';
    }

    setAccountActionModal({
      isOpen: true,
      faculty: f,
      action,
      title,
      reason: '',
      endDate: '',
      effectDescription,
      confirmLabel,
      isSubmitting: false
    });
  };

  // Execute Account Action
  const handleExecuteAccountAction = async () => {
    if (!accountActionModal.faculty || !accountActionModal.action) return;
    if (accountActionModal.action === 'suspend' && !accountActionModal.reason.trim()) {
      alert('Suspension requires an explicit administrative reason.');
      return;
    }

    try {
      setAccountActionModal(prev => ({ ...prev, isSubmitting: true }));
      await api.adminManageAccountStatus(accountActionModal.faculty.user_id, {
        action: accountActionModal.action,
        reason: accountActionModal.reason || undefined,
        end_date: accountActionModal.endDate || undefined
      });
      const userId = accountActionModal.faculty.user_id;
      setAccountActionModal({
        isOpen: false,
        faculty: null,
        action: '',
        title: '',
        reason: '',
        endDate: '',
        effectDescription: '',
        confirmLabel: '',
        isSubmitting: false
      });
      if (onToggleFacultyStatus) {
        await onToggleFacultyStatus(userId, { status: accountActionModal.action });
      }
      if (selectedFaculty && selectedFaculty.user_id === userId) {
        setSelectedFaculty(prev => ({ ...prev, account_status: accountActionModal.action }));
      }
      if (onUpdateFaculty) await onUpdateFaculty();
    } catch (err) {
      alert('Failed to update account status: ' + (err.message || 'Server rejected request'));
      setAccountActionModal(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  // Assign Course / Batch
  const handleExecuteAssignBatch = async (e) => {
    e.preventDefault();
    if (!selectedFaculty || !assignModal.batch_id) return;

    try {
      setAssignModal(prev => ({ ...prev, isSubmitting: true, error: '' }));
      await api.adminAssignFacultyBatch(selectedFaculty.user_id, {
        batch_id: assignModal.batch_id,
        role: assignModal.role || 'lead'
      });
      await fetchTeachingAssignments(selectedFaculty.user_id);
      setAssignModal({ isOpen: false, course_id: '', batch_id: '', role: 'lead', isSubmitting: false, error: '' });
      if (onUpdateFaculty) await onUpdateFaculty();
    } catch (err) {
      setAssignModal(prev => ({ ...prev, isSubmitting: false, error: err.message || 'Failed to assign cohort batch.' }));
    }
  };

  // Change Assignment Role
  const handleChangeAssignmentRole = async (assignmentId, newRole) => {
    if (!selectedFaculty) return;
    try {
      await api.adminUpdateFacultyAssignment(selectedFaculty.user_id, assignmentId, { role: newRole });
      await fetchTeachingAssignments(selectedFaculty.user_id);
      if (onUpdateFaculty) await onUpdateFaculty();
    } catch (err) {
      alert('Failed to update assignment role: ' + err.message);
    }
  };

  // Remove Assignment
  const handleConfirmRemoveAssignment = async () => {
    if (!selectedFaculty || !removeAssignmentModal.assignment) return;
    try {
      setRemoveAssignmentModal(prev => ({ ...prev, isSubmitting: true }));
      await api.adminRemoveFacultyAssignment(selectedFaculty.user_id, removeAssignmentModal.assignment.id);
      await fetchTeachingAssignments(selectedFaculty.user_id);
      setRemoveAssignmentModal({ isOpen: false, assignment: null, isSubmitting: false, warning: '' });
      if (onUpdateFaculty) await onUpdateFaculty();
    } catch (err) {
      alert('Failed to remove teaching assignment: ' + err.message);
      setRemoveAssignmentModal(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Faculty</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage instructional staff, subject matter expertise, teaching assignments, and login access.
          </p>
        </div>

        <button
          onClick={() => setIsOnboardModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0a7cb3] hover:bg-[#086491] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <PlusCircle size={15} /> Add Faculty
        </button>
      </div>

      {/* Roster View Switcher: Active vs Archived Faculty */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setRosterView('active')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
            rosterView === 'active'
              ? 'bg-[#0a7cb3] text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <GraduationCap size={14} />
          <span>Active Faculty ({faculty.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setRosterView('archived')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
            rosterView === 'archived'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Archive size={14} />
          <span>Archived Faculty {isArchivedLoading ? '...' : `(${archivedFaculty.length})`}</span>
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search faculty by name, email, code, or expertise..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 placeholder-slate-400 text-xs focus:outline-hidden focus:border-[#0a7cb3] focus:ring-1 focus:ring-[#0a7cb3]"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Login Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs focus:outline-hidden focus:border-[#0a7cb3] cursor-pointer"
            title="Filter by Login Status"
          >
            <option value="all">All Login Statuses</option>
            <option value="invited">Link Generated / Pending Setup</option>
            <option value="active">Active</option>
            <option value="deactivated">Deactivated</option>
            <option value="suspended">Suspended</option>
          </select>
          <span className="text-xs text-slate-500 font-mono hidden sm:inline">
            {filteredFaculty.length} Faculty Members
          </span>
        </div>
      </div>

      {/* Faculty Cards Grid */}
      {filteredFaculty.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-white border border-slate-200 shadow-xs">
          {faculty.length === 0 ? (
            <div className="max-w-xs mx-auto space-y-3">
              <div className="w-10 h-10 rounded-full bg-sky-50 text-[#0a7cb3] flex items-center justify-center mx-auto">
                <GraduationCap size={20} />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">No faculty yet</h3>
              <p className="text-xs text-slate-500">
                Onboard instructional chairs and subject matter experts to lead course cohorts.
              </p>
              <button
                type="button"
                onClick={() => setIsOnboardModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0a7cb3] hover:bg-[#086491] text-white text-xs font-semibold cursor-pointer"
              >
                <PlusCircle size={15} /> Add Faculty
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-slate-700 font-medium">No faculty match the filter criteria.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFaculty.map((f) => (
            <div
              key={f.user_id}
              className="p-5 rounded-xl bg-white border border-slate-200 flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors shadow-xs"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-900 overflow-hidden shrink-0">
                      {f.avatar ? (
                        <img src={f.avatar} alt={f.full_name} className="w-full h-full object-cover" />
                      ) : (
                        (f.full_name || 'F')[0]
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{f.full_name}</h3>
                      <span className="text-[11px] font-mono text-[#0A7CB3]">{f.faculty_id_code || 'FAC-DIR'}</span>
                    </div>
                  </div>

                  {/* Canonical Login Status Badge */}
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
                    f.account_status === 'active'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                      : (f.account_status === 'invited' || f.account_status === 'link_generated')
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold'
                      : f.account_status === 'suspended'
                      ? 'bg-rose-100 text-rose-900 border border-rose-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    {(f.account_status === 'invited' || f.account_status === 'link_generated') ? 'Link Generated' : (f.account_status || 'active')}
                  </span>
                </div>

                <p className="text-xs text-slate-700 mt-2 font-medium">{f.title || 'Instructional Faculty'}</p>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                  Expertise: {f.expertise || 'Distributed Systems, Cloud & AI'}
                </p>

                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Layers size={13} className="text-[#0A7CB3]" />
                    <span>Assigned: <strong className="text-slate-900">{f.assigned_batches_count || 0} Batches</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-emerald-700" />
                    <span>Upcoming: <strong className="text-slate-900">{f.upcoming_sessions_count || 0} Sessions</strong></span>
                  </div>
                </div>
              </div>

              {/* Action Toolbar on Card */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs flex-wrap gap-2">
                {/* View Details / Assignments */}
                <button
                  type="button"
                  onClick={() => handleOpenFacultyDrawer(f, 'assignments')}
                  className="px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-200 text-[#086491] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Layers size={13} />
                  <span>Teaching & Workload ({f.assigned_batches_count || 0})</span>
                </button>

                {/* Actions Dropdown Trigger */}
                <button
                  type="button"
                  data-action-menu-trigger="true"
                  onClick={(e) => handleToggleActionMenu(e, f)}
                  className={`px-2.5 py-1.5 rounded-lg border font-semibold flex items-center gap-1 cursor-pointer transition-colors text-xs ${
                    actionMenuState?.id === f.user_id
                      ? 'bg-slate-200 border-slate-300 text-slate-900'
                      : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span>Actions</span>
                  <ChevronDown size={12} className={actionMenuState?.id === f.user_id ? 'rotate-180 transition-transform' : 'transition-transform'} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* DRAWER: FACULTY PROFILE & TEACHING ASSIGNMENTS                */}
      {/* ------------------------------------------------------------- */}
      {selectedFaculty && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl overflow-hidden text-xs">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-300">
                  {selectedFaculty.avatar ? (
                    <img src={selectedFaculty.avatar} alt={selectedFaculty.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-slate-700 text-base">
                      {(selectedFaculty.full_name || 'F')[0]}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">{selectedFaculty.full_name}</h2>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      selectedFaculty.account_status === 'active'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        : selectedFaculty.account_status === 'invited'
                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                        : selectedFaculty.account_status === 'archived'
                        ? 'bg-slate-200 text-slate-800'
                        : 'bg-rose-100 text-rose-900 border border-rose-200'
                    }`}>
                      {selectedFaculty.account_status}
                    </span>
                  </div>
                  <p className="text-slate-500 font-mono text-[11px] mt-0.5">
                    {selectedFaculty.faculty_id_code} • {selectedFaculty.email}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedFaculty(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            {/* Faculty Action Toolbar */}
            <div className="px-5 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleOpenEditProfile(selectedFaculty)}
                  className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold flex items-center gap-1 text-[11px] cursor-pointer"
                >
                  <Edit3 size={13} className="text-blue-600" /> Edit Profile
                </button>
                <button
                  type="button"
                  onClick={() => setFacultyDrawerTab('assignments')}
                  className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold flex items-center gap-1 text-[11px] cursor-pointer"
                >
                  <Layers size={13} className="text-[#0a7cb3]" /> Assignments
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                {selectedFaculty.account_status === 'active' ? (
                  <button
                    type="button"
                    onClick={() => handleOpenWorkloadAction(selectedFaculty, 'deactivate')}
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <UserX size={13} className="text-slate-600" /> Deactivate
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenAccountAction(selectedFaculty, 'reactivate')}
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <UserCheck size={13} className="text-emerald-600" /> Reactivate
                  </button>
                )}
                {selectedFaculty.is_archived || selectedFaculty.account_status === 'archived' ? (
                  <button
                    type="button"
                    onClick={() => handleOpenRestoreModal(selectedFaculty)}
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-blue-50 border border-blue-200 text-blue-700 font-semibold flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <RotateCcw size={13} /> Restore
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenWorkloadAction(selectedFaculty, 'archive')}
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-amber-50 border border-amber-200 text-amber-800 font-semibold flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <Archive size={13} /> Archive
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleOpenDeleteModal(selectedFaculty)}
                  className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 font-semibold flex items-center gap-1 text-[11px] cursor-pointer"
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>

            {/* Tabs Bar */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-4 gap-4">
              <button
                type="button"
                onClick={() => setFacultyDrawerTab('assignments')}
                className={`py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  facultyDrawerTab === 'assignments'
                    ? 'border-[#0a7cb3] text-[#0a7cb3]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Layers size={14} /> Teaching Assignments ({assignments.length})
              </button>
              <button
                type="button"
                onClick={() => setFacultyDrawerTab('profile')}
                className={`py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  facultyDrawerTab === 'profile'
                    ? 'border-[#0a7cb3] text-[#0a7cb3]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <GraduationCap size={14} /> Profile & Expertise
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar text-slate-700">
              {facultyDrawerTab === 'assignments' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Active Teaching Assignments</h4>
                      <p className="text-xs text-slate-500">Manage cohort instructional duties, mentor allocations, and course linkages.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAssignModal({
                        isOpen: true,
                        course_id: courses[0]?.id || '',
                        batch_id: '',
                        role: 'lead',
                        isSubmitting: false,
                        error: ''
                      })}
                      className="px-3 py-1.5 rounded-lg bg-[#0a7cb3] hover:bg-[#086491] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
                    >
                      <PlusCircle size={14} /> Assign Course / Batch
                    </button>
                  </div>

                  {isAssignmentsLoading ? (
                    <div className="py-8 text-center text-slate-400">Loading assignments...</div>
                  ) : assignments.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                      <Layers size={24} className="mx-auto text-slate-300" />
                      <p className="font-semibold text-slate-700">No cohort assignments yet</p>
                      <p className="text-xs text-slate-400">Assign this faculty member to lead or mentor an active cohort batch.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {assignments.map((a) => (
                        <div key={a.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h5 className="font-bold text-slate-900 text-sm">{a.course_title}</h5>
                              <span className="font-mono text-xs font-semibold text-[#0a7cb3] bg-sky-50 px-2 py-0.5 rounded border border-sky-200 mt-1 inline-block">
                                Batch: {a.batch_code}
                              </span>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                              Role: {a.role}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-slate-500 text-[11px] pt-1 border-t border-slate-200/60">
                            <div>Delivery Mode: <strong className="text-slate-800">{a.delivery_mode || 'Online Live'}</strong></div>
                            <div>Assigned Date: <strong className="text-slate-800">{formatDate(a.assigned_at)}</strong></div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                            {/* Role selector */}
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-500">Change Role:</span>
                              <select
                                value={a.role}
                                onChange={(e) => handleChangeAssignmentRole(a.id, e.target.value)}
                                className="px-2 py-1 rounded bg-white border border-slate-200 text-slate-800 text-[11px] focus:outline-hidden"
                              >
                                <option value="lead">Lead Instructor</option>
                                <option value="mentor">Mentor / TA</option>
                                <option value="evaluator">Capstone Evaluator</option>
                              </select>
                            </div>

                            {/* Remove assignment */}
                            <button
                              type="button"
                              onClick={() => {
                                const upcomingCount = Number(selectedFaculty.upcoming_sessions_count) || 0;
                                setRemoveAssignmentModal({
                                  isOpen: true,
                                  assignment: a,
                                  isSubmitting: false,
                                  warning: upcomingCount > 0
                                    ? `Faculty has ${upcomingCount} upcoming scheduled session(s) in this batch that will require reassignment.`
                                    : ''
                                });
                              }}
                              className="px-2.5 py-1 rounded bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-rose-700 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                            >
                              <UserMinus size={12} /> Remove Assignment
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Teaching Records Preserved Notice */}
                  <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 text-xs text-sky-900 space-y-1">
                    <div className="font-semibold flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-[#0a7cb3]" />
                      <span>Instructional Records Preserved</span>
                    </div>
                    <p className="text-slate-600 text-[11px]">
                      Removing or modifying a teaching assignment strictly preserves all past attendance evaluations, student feedback, and historical class recordings.
                    </p>
                  </div>
                </div>
              )}

              {facultyDrawerTab === 'profile' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Department / Title</span>
                      <strong className="text-slate-900">{selectedFaculty.title || 'Instructional Faculty'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Login Status</span>
                      <strong className="text-slate-900 uppercase font-mono">{selectedFaculty.account_status || 'active'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Mobile Number</span>
                      <strong className="text-slate-900">{selectedFaculty.mobile || 'On File'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Faculty Code</span>
                      <strong className="text-slate-900 font-mono">{selectedFaculty.faculty_id_code}</strong>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-xs font-semibold text-[#0a7cb3] uppercase tracking-wider">Subject Matter Expertise</span>
                    <p className="text-slate-800 leading-relaxed font-medium">
                      {selectedFaculty.expertise || 'Distributed Systems, Cloud Architecture, Production AI'}
                    </p>
                  </div>

                  {selectedFaculty.internal_notes && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Academic Staff Notes</span>
                      <p className="text-slate-700 leading-relaxed">{selectedFaculty.internal_notes}</p>
                    </div>
                  )}

                  {/* Credentials & WhatsApp Manual Setup Card */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs">Faculty Credentials & Access Setup</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        selectedFaculty.account_status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {selectedFaculty.account_status === 'active' ? 'Active' : 'Link Generated'}
                      </span>
                    </div>

                    <p className="text-slate-600 text-xs">
                      Single-use cryptographic links expire after <strong>24 hours</strong>. When regenerated or revoked, previous tokens are immediately invalidated. Full URLs and passwords are never logged.
                    </p>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const fid = selectedFaculty.id || selectedFaculty.user_id;
                          if (onGenerateSetupLink) onGenerateSetupLink(fid, selectedFaculty);
                          else onResendInvite(fid);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#0A7CB3] hover:bg-[#086491] text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <KeyRound size={13} />
                        <span>Generate Setup Link</span>
                      </button>

                      {selectedFaculty.account_status === 'active' && (
                        <button
                          type="button"
                          onClick={() => {
                            const fid = selectedFaculty.id || selectedFaculty.user_id;
                            if (onGenerateResetLink) onGenerateResetLink(fid, selectedFaculty);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <KeyRound size={13} />
                          <span>Generate Password Reset Link</span>
                        </button>
                      )}

                      {(selectedFaculty.account_status === 'invited' || selectedFaculty.account_status === 'link_generated') && (
                        <button
                          type="button"
                          onClick={() => {
                            const fid = selectedFaculty.id || selectedFaculty.user_id;
                            onRevokeInvite(fid);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <XCircle size={13} />
                          <span>Revoke Invitation</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Account Action Controls in Drawer */}
                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Account Access Control:</span>
                    <div className="flex items-center gap-2">
                      {selectedFaculty.account_status === 'active' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenAccountAction(selectedFaculty, 'deactivate')}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs cursor-pointer"
                          >
                            Deactivate Account
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenAccountAction(selectedFaculty, 'suspend')}
                            className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 font-medium text-xs cursor-pointer"
                          >
                            Suspend Account
                          </button>
                        </>
                      )}
                      {selectedFaculty.account_status === 'deactivated' && (
                        <button
                          type="button"
                          onClick={() => handleOpenAccountAction(selectedFaculty, 'reactivate')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs cursor-pointer"
                        >
                          Reactivate Account
                        </button>
                      )}
                      {selectedFaculty.account_status === 'suspended' && (
                        <button
                          type="button"
                          onClick={() => handleOpenAccountAction(selectedFaculty, 'restore')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs cursor-pointer"
                        >
                          Restore Access
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ASSIGN COURSE / BATCH                                  */}
      {/* ------------------------------------------------------------- */}
      {assignModal.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Assign Course / Cohort Batch</h2>
              <button
                type="button"
                onClick={() => setAssignModal(prev => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {assignModal.error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {assignModal.error}
              </div>
            )}

            <form onSubmit={handleExecuteAssignBatch} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Select Program Course *</label>
                <select
                  required
                  value={assignModal.course_id}
                  onChange={e => setAssignModal(prev => ({ ...prev, course_id: e.target.value, batch_id: '' }))}
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
                  value={assignModal.batch_id}
                  onChange={e => setAssignModal(prev => ({ ...prev, batch_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#0a7cb3]"
                >
                  <option value="">-- Choose Batch --</option>
                  {batches
                    .filter(b => String(b.course_id) === String(assignModal.course_id))
                    .map(b => (
                      <option key={b.id} value={b.id}>
                        {b.batch_code} - {b.title} ({b.delivery_mode})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Instructional Role *</label>
                <select
                  value={assignModal.role}
                  onChange={e => setAssignModal(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#0a7cb3]"
                >
                  <option value="lead">Lead Instructor</option>
                  <option value="mentor">Mentor / TA</option>
                  <option value="evaluator">Capstone Evaluator</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={assignModal.isSubmitting}
                  onClick={() => setAssignModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignModal.isSubmitting || !assignModal.batch_id}
                  className="px-4 py-2 rounded-lg bg-[#0a7cb3] hover:bg-[#086491] disabled:opacity-40 text-white font-semibold cursor-pointer"
                >
                  {assignModal.isSubmitting ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: REMOVE ASSIGNMENT CONFIRMATION                         */}
      {/* ------------------------------------------------------------- */}
      {removeAssignmentModal.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Remove Teaching Assignment</h3>
                <p className="text-slate-600 leading-relaxed">
                  Remove assignment for batch <strong className="text-slate-900">{removeAssignmentModal.assignment?.batch_code}</strong> ({removeAssignmentModal.assignment?.course_title}).
                </p>
                {removeAssignmentModal.warning && (
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-medium mt-2">
                    {removeAssignmentModal.warning}
                  </div>
                )}
                <p className="text-slate-500 text-[11px] mt-1">
                  Past completed lectures, attendance entries, and student reviews linked to this faculty member remain strictly preserved in the permanent institutional audit records.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={removeAssignmentModal.isSubmitting}
                onClick={() => setRemoveAssignmentModal({ isOpen: false, assignment: null, isSubmitting: false, warning: '' })}
                className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={removeAssignmentModal.isSubmitting}
                onClick={handleConfirmRemoveAssignment}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-semibold cursor-pointer"
              >
                {removeAssignmentModal.isSubmitting ? 'Removing...' : 'Confirm Removal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ACCOUNT LOGIN STATUS ACTION                            */}
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
              Faculty: <strong className="text-slate-900">{accountActionModal.faculty?.full_name}</strong> ({accountActionModal.faculty?.email})
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
                onClick={() => setAccountActionModal(prev => ({ ...prev, isOpen: false, faculty: null }))}
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
      {/* MODAL: ONBOARD FACULTY                                        */}
      {/* ------------------------------------------------------------- */}
      {isOnboardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Onboard Instructional Faculty</h2>
              <button onClick={() => setIsOnboardModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateFaculty} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Ramesh Kumar"
                    value={newFaculty.full_name}
                    onChange={e => setNewFaculty({ ...newFaculty, full_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#0a7cb3]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="ramesh.k@aaroha.edu"
                    value={newFaculty.email}
                    onChange={e => setNewFaculty({ ...newFaculty, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#0a7cb3]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Mobile Contact</label>
                  <input
                    type="tel"
                    placeholder="+91 98450 12345"
                    value={newFaculty.mobile}
                    onChange={e => setNewFaculty({ ...newFaculty, mobile: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#0a7cb3]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Academic Title</label>
                  <input
                    type="text"
                    value={newFaculty.title}
                    onChange={e => setNewFaculty({ ...newFaculty, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#0a7cb3]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Subject Matter Expertise</label>
                <input
                  type="text"
                  placeholder="e.g. Distributed Consensus, Cloud Architecture, Vector Databases"
                  value={newFaculty.expertise}
                  onChange={e => setNewFaculty({ ...newFaculty, expertise: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#0a7cb3]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Internal Notes</label>
                <textarea
                  rows="2"
                  placeholder="Credentials, background, or scheduling notes..."
                  value={newFaculty.internal_notes}
                  onChange={e => setNewFaculty({ ...newFaculty, internal_notes: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#0a7cb3]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsOnboardModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-[#0a7cb3] hover:bg-[#086491] disabled:opacity-40 text-white font-semibold shadow-xs cursor-pointer"
                >
                  {isSubmitting ? 'Onboarding...' : 'Onboard Faculty'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: EDIT FACULTY PROFILE                                   */}
      {/* ------------------------------------------------------------- */}
      {editProfileModal.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Edit Faculty Profile</h2>
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
                  <label className="block text-slate-700 font-medium mb-1">Academic Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Lead Technical Architect"
                    value={editProfileModal.title}
                    onChange={e => setEditProfileModal(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#0a7cb3]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Highest Qualification</label>
                  <input
                    type="text"
                    placeholder="e.g. M.Tech / Ph.D."
                    value={editProfileModal.qualifications}
                    onChange={e => setEditProfileModal(prev => ({ ...prev, qualifications: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#0a7cb3]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Specialized Expertise Areas</label>
                <input
                  type="text"
                  placeholder="e.g. Distributed Systems, Kubernetes, Cloud Infrastructure"
                  value={editProfileModal.expertise}
                  onChange={e => setEditProfileModal(prev => ({ ...prev, expertise: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#0a7cb3]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Internal Coordinator Notes</label>
                <textarea
                  rows="2"
                  value={editProfileModal.internal_notes}
                  onChange={e => setEditProfileModal(prev => ({ ...prev, internal_notes: e.target.value }))}
                  className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#0a7cb3]"
                  placeholder="Private coordinator notes, availability preferences..."
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
      {/* MODAL: DEACTIVATE / ARCHIVE WITH WORKLOAD RESOLUTION           */}
      {/* ------------------------------------------------------------- */}
      {workloadModal.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  {workloadModal.action === 'deactivate' ? 'Deactivate Faculty Account' : 'Archive Faculty Record'}
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Faculty: <strong className="text-slate-900">{workloadModal.faculty?.full_name}</strong> ({workloadModal.faculty?.email})
                </p>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Before deactivating or archiving faculty, existing teaching workload must be verified. All past completed lectures, attendance marks, and evaluation scores remain strictly preserved and attributed to this instructor.
                </p>
              </div>
            </div>

            {workloadModal.isLoadingWorkload ? (
              <div className="p-4 text-center text-slate-500 font-medium">Inspecting teaching assignments and upcoming sessions...</div>
            ) : (
              <form onSubmit={handleExecuteWorkloadAction} className="space-y-3">
                {/* Workload Summary */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <div className="font-semibold text-slate-900">Current Workload Assessment</div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>• Active Batches Assigned: <strong className="font-mono text-slate-900">{workloadModal.workload?.assigned_batches?.length || 0}</strong></div>
                    <div>• Upcoming Live Classes: <strong className="font-mono text-slate-900">{workloadModal.workload?.upcoming_sessions?.length || 0}</strong></div>
                  </div>
                </div>

                {/* If upcoming sessions exist, require explicit resolution */}
                {(workloadModal.workload?.upcoming_sessions?.length > 0) && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-2">
                    <span className="font-bold text-amber-900 block text-xs">Upcoming Sessions Resolution Required:</span>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      This instructor has {workloadModal.workload.upcoming_sessions.length} upcoming scheduled live session(s). Choose how future sessions should be handled:
                    </p>

                    <div className="space-y-2 pt-1 text-[11px]">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="resolution"
                          value="reassign"
                          checked={workloadModal.resolution === 'reassign'}
                          onChange={() => setWorkloadModal(prev => ({ ...prev, resolution: 'reassign' }))}
                          className="mt-0.5 text-[#0a7cb3]"
                        />
                        <div>
                          <span className="font-semibold text-slate-900 block">Reassign future sessions to substitute instructor:</span>
                          <select
                            disabled={workloadModal.resolution !== 'reassign'}
                            value={workloadModal.substitute_faculty_id}
                            onChange={e => setWorkloadModal(prev => ({ ...prev, substitute_faculty_id: e.target.value }))}
                            className="mt-1 w-full px-2 py-1.5 rounded bg-white border border-slate-200 text-slate-900 text-xs"
                          >
                            {(workloadModal.workload?.available_substitutes || []).map(sub => (
                              <option key={sub.user_id} value={sub.user_id}>
                                {sub.full_name} ({sub.email})
                              </option>
                            ))}
                          </select>
                        </div>
                      </label>

                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="resolution"
                          value="unassign"
                          checked={workloadModal.resolution === 'unassign'}
                          onChange={() => setWorkloadModal(prev => ({ ...prev, resolution: 'unassign' }))}
                          className="mt-0.5 text-[#0a7cb3]"
                        />
                        <div>
                          <span className="font-semibold text-slate-900 block">Leave future scheduled sessions unassigned</span>
                          <span className="text-slate-500">Unassigns instructor so program coordinators can assign substitutes later.</span>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Administrative Reason *</label>
                  <textarea
                    required
                    rows="2"
                    placeholder="State reason for deactivating or archiving this faculty member..."
                    value={workloadModal.reason}
                    onChange={e => setWorkloadModal(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#0a7cb3]"
                  />
                </div>

                {workloadModal.error && (
                  <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                    {workloadModal.error}
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={workloadModal.isSubmitting}
                    onClick={() => setWorkloadModal(prev => ({ ...prev, isOpen: false, faculty: null }))}
                    className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={workloadModal.isSubmitting || !workloadModal.reason.trim()}
                    className={`px-4 py-2 rounded-lg font-semibold text-white shadow-xs cursor-pointer ${
                      workloadModal.action === 'deactivate' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700'
                    }`}
                  >
                    {workloadModal.isSubmitting ? 'Processing...' : workloadModal.action === 'deactivate' ? 'Confirm Deactivation' : 'Confirm Archival'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: RESTORE FACULTY MODAL                                  */}
      {/* ------------------------------------------------------------- */}
      {restoreModal.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Restore Archived Faculty</h3>
                <p className="text-slate-600 leading-relaxed">
                  Restore <strong className="text-slate-900">{restoreModal.faculty?.full_name}</strong> to the operational faculty roster.
                </p>
                <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                  Notice: Restoring places the faculty member in a <strong>DEACTIVATED</strong> state. Explicit reactivation is required before login credentials or teaching schedules can be utilized.
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
                onClick={() => setRestoreModal(prev => ({ ...prev, isOpen: false, faculty: null }))}
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
                {restoreModal.isSubmitting ? 'Restoring...' : 'Restore Faculty Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: DELETE FACULTY WITH DEPENDENCY VERIFICATION            */}
      {/* ------------------------------------------------------------- */}
      {deleteModal.isOpen && (() => {
        const isEligible = Boolean(
          deleteModal.eligibility?.can_delete ??
          deleteModal.eligibility?.eligible ??
          deleteModal.eligibility?.can_delete_permanently
        );
        const canDelete = isEligible || deleteModal.forceOverride;
        const stats = deleteModal.eligibility?.stats || deleteModal.eligibility || {};
        const dependencies = deleteModal.eligibility?.dependencies || [];

        return (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                canDelete
                  ? 'bg-rose-50 border border-rose-200 text-rose-700'
                  : 'bg-amber-50 border border-amber-200 text-amber-700'
              }`}>
                {canDelete ? <Trash2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {deleteModal.isChecking ? 'Verifying Teaching Dependencies...' : 'Permanently Delete Faculty Member'}
                </h3>
                <p className="text-slate-600 mt-0.5">
                  Faculty: <strong className="text-slate-900">{deleteModal.faculty?.full_name}</strong> ({deleteModal.faculty?.faculty_id_code || deleteModal.faculty?.email})
                </p>
              </div>
            </div>

            {deleteModal.isChecking ? (
              <div className="p-4 text-center text-slate-500 font-medium">Checking teaching history, attendance logs, and grading records...</div>
            ) : (
              <div className="space-y-3">
                {isEligible ? (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] space-y-1">
                    <span className="font-semibold block">Dependency Verification Passed: Eligible for Deletion</span>
                    <p>This faculty member has zero attendance audit records, zero graded submissions, and zero signed certificates.</p>
                    {stats.assigned_batches > 0 && (
                      <p className="text-amber-800 font-medium pt-1">
                        Notice: This faculty member is assigned to {stats.assigned_batches} batch(es). Proceeding will automatically unassign them from all cohorts.
                      </p>
                    )}
                    {deleteModal.eligibility?.is_multi_role && (
                      <p className="text-amber-800 font-medium pt-1">
                        Notice: This user also has another authorized role ({deleteModal.eligibility?.roles?.filter(r => r !== 'faculty').join(', ')}). Only the faculty profile and role will be deleted; their account remains intact.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-2">
                    <div className="font-semibold flex items-center gap-1.5 text-xs text-amber-900">
                      <AlertCircle size={14} className="text-amber-700 shrink-0" />
                      <span>Academic Records Retention Notice</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-amber-800">
                      This faculty member has historical student academic records: {Array.isArray(dependencies) ? dependencies.join(', ') : ''}.
                    </p>
                    <label className="flex items-center gap-2 pt-1 font-semibold text-rose-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={deleteModal.forceOverride}
                        onChange={e => setDeleteModal(prev => ({ ...prev, forceOverride: e.target.checked }))}
                        className="rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                      />
                      <span>Administrator Override: Force delete and unassign historical records</span>
                    </label>
                  </div>
                )}

                {canDelete && (
                  <div className="space-y-2 pt-1">
                    <p className="text-slate-600 text-[11px]">
                      To confirm permanent deletion, please type <strong className="text-slate-900 font-mono">DELETE</strong> below:
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
                onClick={() => setDeleteModal({ isOpen: false, faculty: null, isChecking: false, eligibility: null, confirmText: '', forceOverride: false, isSubmitting: false, error: '' })}
                className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              {canDelete ? (
                <button
                  type="button"
                  disabled={deleteModal.isSubmitting || deleteModal.confirmText !== 'DELETE'}
                  onClick={handleExecuteDeleteFaculty}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-semibold cursor-pointer"
                >
                  {deleteModal.isSubmitting ? 'Deleting...' : (deleteModal.forceOverride ? 'Permanently Delete (Force)' : 'Permanently Delete')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const f = deleteModal.faculty;
                    setDeleteModal({ isOpen: false, faculty: null, isChecking: false, eligibility: null, confirmText: '', forceOverride: false, isSubmitting: false, error: '' });
                    if (f) handleOpenWorkloadAction(f, 'archive');
                  }}
                  className="px-4 py-2 rounded-lg bg-[#0a7cb3] hover:bg-[#086491] text-white font-semibold cursor-pointer"
                >
                  Archive Faculty Instead
                </button>
              )}
            </div>
          </div>
        </div>
        );
      })()}

      {/* Portaled Actions Dropdown (Floating Outside Container Boundary) */}
      {actionMenuState && typeof document !== 'undefined' && createPortal(
        (() => {
          const f = actionMenuState.faculty;
          const { top, bottom, right } = actionMenuState.rect;
          const spaceBelow = window.innerHeight - bottom;
          const spaceAbove = top;
          // Prefer opening downward if there's sufficient room (>= 280px) or if spaceBelow >= spaceAbove
          const openUpward = spaceBelow < 280 && spaceAbove > spaceBelow;
          const maxMenuHeight = openUpward
            ? Math.max(140, top - 16)
            : Math.max(140, window.innerHeight - bottom - 16);

          return (
            <div
              data-action-menu-dropdown="true"
              style={{
                position: 'fixed',
                zIndex: 99999,
                right: Math.max(12, window.innerWidth - right),
                maxHeight: `${maxMenuHeight}px`,
                overflowY: 'auto',
                ...(openUpward
                  ? { bottom: Math.max(8, window.innerHeight - top + 4) }
                  : { top: Math.min(window.innerHeight - 80, bottom + 4) }),
              }}
              className="w-56 max-w-[calc(100vw-24px)] bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 text-left text-xs animate-in fade-in zoom-in-95 duration-100"
            >
              <button
                type="button"
                onClick={() => { setActionMenuState(null); handleOpenFacultyDrawer(f, 'assignments'); }}
                className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <Eye size={13} className="text-slate-500" />
                <span>Inspect Record & Workload</span>
              </button>
              <button
                type="button"
                onClick={() => { setActionMenuState(null); handleOpenEditProfile(f); }}
                className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <Edit3 size={13} className="text-blue-600" />
                <span>Edit Faculty Profile</span>
              </button>
              <button
                type="button"
                onClick={() => { setActionMenuState(null); handleOpenFacultyDrawer(f, 'assignments'); }}
                className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <Layers size={13} className="text-[#0a7cb3]" />
                <span>Manage Teaching Assignments</span>
              </button>

              <div className="my-1 border-t border-slate-100" />

              {/* Setup & Reset Link Actions */}
              {(f.account_status === 'invited' || f.account_status === 'link_generated' || !f.account_status) && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setActionMenuState(null);
                      if (onGenerateSetupLink) onGenerateSetupLink(f.user_id, f);
                      else onResendInvite(f.user_id);
                    }}
                    className="w-full px-3 py-1.5 text-left text-blue-700 hover:bg-blue-50 flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <KeyRound size={13} className="text-blue-600" />
                    <span>Generate Setup Link</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActionMenuState(null); onRevokeInvite(f.user_id); }}
                    className="w-full px-3 py-1.5 text-left text-slate-600 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <XCircle size={13} className="text-slate-500" />
                    <span>Revoke Invitation</span>
                  </button>
                </>
              )}

              {f.account_status === 'active' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setActionMenuState(null);
                      if (onGenerateResetLink) onGenerateResetLink(f.user_id, f);
                    }}
                    className="w-full px-3 py-1.5 text-left text-indigo-700 hover:bg-indigo-50 flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <KeyRound size={13} className="text-indigo-600" />
                    <span>Generate Password Reset Link</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActionMenuState(null);
                      if (onGenerateSetupLink) onGenerateSetupLink(f.user_id, f);
                      else onResendInvite(f.user_id);
                    }}
                    className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Mail size={13} className="text-[#0a7cb3]" />
                    <span>Send Account Setup Invitation</span>
                  </button>
                </>
              )}

              {f.account_status === 'deactivated' && (
                <button
                  type="button"
                  onClick={() => {
                    setActionMenuState(null);
                    if (onGenerateSetupLink) onGenerateSetupLink(f.user_id, f);
                    else onResendInvite(f.user_id);
                  }}
                  className="w-full px-3 py-1.5 text-left text-blue-700 hover:bg-blue-50 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <Mail size={13} className="text-blue-600" />
                  <span>Send Account Setup Invitation</span>
                </button>
              )}

              <div className="my-1 border-t border-slate-100" />

              {f.account_status === 'active' ? (
                <button
                  type="button"
                  onClick={() => { setActionMenuState(null); handleOpenWorkloadAction(f, 'deactivate'); }}
                  className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <UserX size={13} className="text-slate-600" />
                  <span>Deactivate Account...</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setActionMenuState(null); handleOpenAccountAction(f, 'reactivate'); }}
                  className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <UserCheck size={13} className="text-emerald-600" />
                  <span>Reactivate Account</span>
                </button>
              )}

              {f.is_archived || f.account_status === 'archived' ? (
                <button
                  type="button"
                  onClick={() => { setActionMenuState(null); handleOpenRestoreModal(f); }}
                  className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw size={13} className="text-blue-600" />
                  <span>Restore Faculty</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setActionMenuState(null); handleOpenWorkloadAction(f, 'archive'); }}
                  className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Archive size={13} className="text-amber-600" />
                  <span>Archive Faculty...</span>
                </button>
              )}

              <div className="my-1 border-t border-slate-100" />

              <button
                type="button"
                onClick={() => { setActionMenuState(null); handleOpenDeleteModal(f); }}
                className="w-full px-3 py-1.5 text-left text-rose-700 hover:bg-rose-50 flex items-center gap-2 cursor-pointer font-medium"
              >
                <Trash2 size={13} className="text-rose-600" />
                <span>Delete Faculty...</span>
              </button>
            </div>
          );
        })(),
        document.body
      )}

    </div>
  );
}
