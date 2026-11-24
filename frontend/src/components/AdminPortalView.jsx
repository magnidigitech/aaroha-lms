import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Menu, X, Shield, Plus, Edit3, Award, Users, CheckCircle2,
  Calendar, Layers, Clock, AlertTriangle, RefreshCw, Mail,
  Bell, Search, ChevronDown, LogOut, ExternalLink, User, ArrowRight,
  ArrowLeft, Globe
} from 'lucide-react';
import aarohaLogo from '../assets/aaroha_logo.webp';

import AdminSidebar, { ADMIN_MODULES } from './admin/AdminSidebar';
import AdminDashboardTab from './admin/AdminDashboardTab';
import RoleBasedDashboardView from './dashboards/RoleBasedDashboardView';
import AdminStudentsTab from './admin/AdminStudentsTab';
import AdminFacultyTab from './admin/AdminFacultyTab';
import AdminCoursesTab from './admin/AdminCoursesTab';
import AdminBatchesTab from './admin/AdminBatchesTab';
import AdminScheduleTab from './admin/AdminScheduleTab';
import AdminAttendanceTab from './admin/AdminAttendanceTab';
import AdminMaterialsTab from './admin/AdminMaterialsTab';
import AdminContentPublishingTab from './admin/AdminContentPublishingTab';
import AdminAssessmentsTab from './admin/AdminAssessmentsTab';
import AdminAnnouncementsTab from './admin/AdminAnnouncementsTab';
import AdminReportsTab from './admin/AdminReportsTab';
import AdminCertificatesTab from './admin/AdminCertificatesTab';
import AdminPlacementTab from './admin/AdminPlacementTab';
import AdminSupportTab from './admin/AdminSupportTab';
import AdminUsersTab from './admin/AdminUsersTab';
import AdminSettingsTab from './admin/AdminSettingsTab';
import AdminAuditLogTab from './admin/AdminAuditLogTab';
import AdminFollowupsTab from './admin/AdminFollowupsTab';

import api from '../apiService';
import { canAccessModule } from '../adminUtils';
import ThemeToggle from './ThemeToggle';
import { getRouteParam, setRouteParam, removeRouteParam } from '../routes';

const BREADCRUMB_MAP = {
  dashboard: { group: 'Overview', label: 'Dashboard' },
  students: { group: 'People', label: 'Students' },
  faculty: { group: 'People', label: 'Faculty' },
  courses: { group: 'Learning', label: 'Courses' },
  batches: { group: 'Learning', label: 'Batches' },
  schedule: { group: 'Learning', label: 'Class Schedule' },
  attendance: { group: 'Learning', label: 'Attendance' },
  materials: { group: 'Learning', label: 'Content & Publishing' },
  assessments: { group: 'Learning', label: 'Assessments & Projects' },
  announcements: { group: 'Engagement', label: 'Announcements' },
  support: { group: 'Engagement', label: 'Support & Feedback' },
  certificates: { group: 'Outcomes', label: 'Certificates' },
  placement: { group: 'Outcomes', label: 'Placement' },
  reports: { group: 'Outcomes', label: 'Reports' },
  leaderboard: { group: 'Outcomes', label: 'Academic Leaderboard' },
  users: { group: 'Administration', label: 'Users & Permissions' },
  settings: { group: 'Administration', label: 'Settings' },
  audit: { group: 'Administration', label: 'Audit Log' },
  followups: { group: 'People', label: 'Student Follow-ups' }
};

export default function AdminPortalView({
  courses = [],
  taskSubmissions = [],
  users = [],
  onOnboardUser,
  onAddCourse,
  onUpdateCourse,
  onDeleteCourse,
  onAddModule,
  onUpdateModule,
  onDeleteModule,
  onAddLesson,
  onUpdateLesson,
  onDeleteLesson,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onGradeSubmission,
  onIssueCertificate,
  onOpenProfile,
  onViewCourse,
  currentUser,
  enrolledStudents = [],
  onViewWebsite,
  onLogout,
  onOpenLeaderboard
}) {
  const userRole = (currentUser?.role || 'super_admin').toLowerCase();

  // Determine initial module based on permissions and optional URL parameters
  const [activeModule, setActiveModule] = useState(() => {
    try {
      const tabParam = getRouteParam('tab') || getRouteParam('module') || sessionStorage.getItem('aaroha_admin_module');
      if (tabParam && canAccessModule(userRole, tabParam)) return tabParam;
    } catch (e) {}
    if (canAccessModule(userRole, 'dashboard')) return 'dashboard';
    if (canAccessModule(userRole, 'batches')) return 'batches';
    if (canAccessModule(userRole, 'students')) return 'students';
    if (canAccessModule(userRole, 'courses')) return 'courses';
    return 'dashboard';
  });

  useEffect(() => {
    if (activeModule) {
      try {
        sessionStorage.setItem('aaroha_admin_module', activeModule);
        setRouteParam('tab', activeModule);
      } catch (e) {}
    }
  }, [activeModule]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [headerSearchQuery, setHeaderSearchQuery] = useState('');

  // Domain states
  const [dashboardStats, setDashboardStats] = useState({});
  const [todayClasses, setTodayClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [batches, setBatches] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [usersList, setUsersList] = useState(users);
  const [placementData, setPlacementData] = useState({ profiles: [], jobs: [], applications: [] });
  const [supportData, setSupportData] = useState({ tickets: [], feedback: [] });
  const [settings, setSettings] = useState({});
  const [auditLogs, setAuditLogs] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [invitationModalData, setInvitationModalData] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Derive coordinators and faculty lists
  const coordinators = users.filter(u => ['coordinator', 'admin', 'super_admin'].includes(u.role));

  // Data fetching routines
  const fetchDashboardStats = useCallback(async () => {
    try {
      const res = await api.adminGetDashboardStats();
      if (res?.success && res.stats) {
        setDashboardStats(res.stats);
        if (res.today_classes_preview) {
          setTodayClasses(res.today_classes_preview);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch dashboard stats:', err);
    }
  }, []);

  const fetchStudents = useCallback(async () => {
    try {
      const res = await api.adminGetStudents();
      if (res?.success && Array.isArray(res.students)) {
        setStudents(res.students);
      }
    } catch (err) {
      console.warn('Failed to fetch students:', err);
    }
  }, []);

  const fetchFaculty = useCallback(async () => {
    try {
      const res = await api.adminGetFaculty();
      if (res?.success && Array.isArray(res.faculty)) {
        setFaculty(res.faculty);
      }
    } catch (err) {
      console.warn('Failed to fetch faculty:', err);
    }
  }, []);

  const fetchBatches = useCallback(async () => {
    try {
      const res = await api.adminGetBatches();
      if (res?.success && Array.isArray(res.batches)) {
        setBatches(res.batches);
      }
    } catch (err) {
      console.warn('Failed to fetch batches:', err);
    }
  }, []);

  const fetchSchedule = useCallback(async () => {
    try {
      const res = await api.adminGetSchedule();
      if (res?.success && Array.isArray(res.sessions)) {
        setSessions(res.sessions);
      }
    } catch (err) {
      console.warn('Failed to fetch schedule:', err);
    }
  }, []);

  const fetchMaterials = useCallback(async () => {
    try {
      const res = await api.adminGetMaterials();
      if (res?.success && Array.isArray(res.materials)) {
        setMaterials(res.materials);
      }
    } catch (err) {
      console.warn('Failed to fetch materials:', err);
    }
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await api.adminGetAnnouncements();
      if (res?.success && Array.isArray(res.announcements)) {
        setAnnouncements(res.announcements);
      }
    } catch (err) {
      console.warn('Failed to fetch announcements:', err);
    }
  }, []);

  const fetchFollowups = useCallback(async () => {
    try {
      const res = await api.adminGetFollowups();
      if (res?.success && Array.isArray(res.followups)) {
        setFollowups(res.followups);
      }
    } catch (err) {
      console.warn('Failed to fetch followups:', err);
    }
  }, []);

  const fetchPlacementData = useCallback(async () => {
    try {
      const res = await api.adminGetPlacementData();
      if (res?.success) {
        setPlacementData({
          profiles: res.profiles || [],
          jobs: res.jobs || [],
          applications: res.applications || []
        });
      }
    } catch (err) {
      console.warn('Failed to fetch placement data:', err);
    }
  }, []);

  const fetchSupportData = useCallback(async () => {
    try {
      const res = await api.adminGetSupportData();
      if (res?.success) {
        setSupportData({
          tickets: res.tickets || [],
          feedback: res.feedback || []
        });
      }
    } catch (err) {
      console.warn('Failed to fetch support data:', err);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.adminGetSettings();
      if (res?.success && res.settings) {
        setSettings(res.settings);
      }
    } catch (err) {
      console.warn('Failed to fetch settings:', err);
    }
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const res = await api.adminGetAuditLogs();
      if (res?.success && Array.isArray(res.audit_logs)) {
        setAuditLogs(res.audit_logs);
      }
    } catch (err) {
      console.warn('Failed to fetch audit logs:', err);
    }
  }, []);

  const fetchCertificates = useCallback(async () => {
    try {
      const res = await api.adminGetCertificates();
      if (res?.certificates && Array.isArray(res.certificates)) {
        setCertificates(res.certificates);
      }
    } catch (err) {
      console.warn('Failed to fetch certificates:', err);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.adminGetUsers();
      if (res?.success && Array.isArray(res.users)) {
        setUsersList(res.users);
      }
    } catch (err) {
      console.warn('Failed to fetch users:', err);
    }
  }, []);

  useEffect(() => {
    if (Array.isArray(users) && users.length > 0) {
      setUsersList(users);
    }
  }, [users]);

  // Initial load
  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetchDashboardStats(),
      fetchStudents(),
      fetchFaculty(),
      fetchBatches(),
      fetchSchedule(),
      fetchMaterials(),
      fetchAnnouncements(),
      fetchFollowups(),
      fetchPlacementData(),
      fetchSupportData(),
      fetchSettings(),
      fetchAuditLogs(),
      fetchCertificates(),
      fetchUsers()
    ]).finally(() => {
      setIsLoading(false);
    });
  }, [
    fetchDashboardStats,
    fetchStudents,
    fetchFaculty,
    fetchBatches,
    fetchSchedule,
    fetchMaterials,
    fetchAnnouncements,
    fetchFollowups,
    fetchPlacementData,
    fetchSupportData,
    fetchSettings,
    fetchAuditLogs,
    fetchCertificates,
    fetchUsers
  ]);

  // Handlers for Student operations
  const handleAddStudent = async (studentData) => {
    try {
      const res = await api.adminCreateStudent(studentData);
      if (res?.success) {
        showToast(res.message || 'Student enrolled successfully');
        if (res.invitation_url) {
          setInvitationModalData({
            type: 'setup',
            title: res.reused ? 'Student Account Reused & Cohort Enrolled' : 'Student Onboarded — Setup Link Generated',
            name: studentData?.full_name || 'Student Fellow',
            code: res.student_code || '',
            email: studentData?.email || '',
            invitation_url: res.invitation_url,
            expires_at: res.expires_at || '24 hours',
            email_notice: res.email_notice || 'Email server is unconfigured. Copy this setup link and share it directly via WhatsApp.',
            btn_label: 'Copy Setup Link',
            reused: !!res.reused
          });
        }
        await fetchStudents();
        await fetchDashboardStats();
        return res;
      } else {
        throw new Error(res?.error || 'Failed to add student');
      }
    } catch (err) {
      showToast(err.message || 'Error onboarding student', 'error');
      throw err;
    }
  };

  const handleUpdateStudent = async (userId, studentData) => {
    try {
      if (studentData && (studentData.new_batch_id || studentData.batch_id)) {
        const res = await api.adminTransferStudentBatch(userId, studentData);
        if (res?.success) {
          showToast(res.message || 'Student cohort transfer completed');
        }
      }
      await fetchStudents();
      await fetchBatches();
    } catch (err) {
      showToast(err.message || 'Update failed', 'error');
    }
  };

  const handleDeleteStudent = async () => {
    await fetchStudents();
    await fetchBatches();
  };

  const handleTransferBatch = async (userId, data) => {
    try {
      const res = await api.adminTransferStudentBatch(userId, data);
      if (res?.success) {
        showToast(res.message || 'Student cohort transfer completed');
        await fetchStudents();
        await fetchBatches();
      } else {
        throw new Error(res?.error || 'Transfer failed');
      }
    } catch (err) {
      showToast(err.message || 'Transfer failed', 'error');
      throw err;
    }
  };

  const handleToggleStudentStatus = async (userId, newStatus) => {
    try {
      const res = await api.adminToggleStudentStatus(userId, { status: newStatus });
      if (res?.success) {
        showToast(`Student status set to ${newStatus}`);
        setStudents(prev => prev.map(s => s.user_id === userId ? { ...s, account_status: newStatus } : s));
      }
    } catch (err) {
      showToast('Failed to update status', 'error');
    }
  };

  const handleGenerateSetupLink = async (userId, userObj = {}) => {
    try {
      const res = await api.adminGenerateSetupLink(userId);
      if (res?.success) {
        showToast(res.message || 'Setup link generated (valid 24h)');
        const link = res.setup_url || res.invitation_url;
        if (link) {
          setInvitationModalData({
            type: 'setup',
            title: 'Account Setup Link Generated',
            name: userObj.full_name || userObj.name || 'Account Member',
            code: userObj.student_id_code || userObj.faculty_id_code || '',
            email: userObj.email || '',
            invitation_url: link,
            expires_at: res.expires_at || '24 hours',
            email_notice: res.email_notice || 'Email server is unconfigured. Copy and share this setup link directly via WhatsApp.',
            btn_label: 'Copy Setup Link'
          });
        }
        await fetchStudents();
        await fetchFaculty();
        return res;
      } else {
        throw new Error(res?.error || 'Failed to generate setup link');
      }
    } catch (err) {
      showToast(err.message || 'Error generating setup link', 'error');
    }
  };

  const handleGenerateResetLink = async (userId, userObj = {}) => {
    try {
      const res = await api.adminGenerateResetLink(userId);
      if (res?.success) {
        showToast(res.message || 'Password reset link generated (valid 24h)');
        const link = res.reset_url;
        if (link) {
          setInvitationModalData({
            type: 'reset',
            title: 'Password Reset Link Generated',
            name: userObj.full_name || userObj.name || 'Account Member',
            code: userObj.student_id_code || userObj.faculty_id_code || '',
            email: userObj.email || '',
            invitation_url: link,
            expires_at: res.expires_at || '24 hours',
            email_notice: res.email_notice || 'Email server is unconfigured. Share this password reset link directly via WhatsApp after verifying identity.',
            btn_label: 'Copy Reset Link'
          });
        }
        return res;
      } else {
        throw new Error(res?.error || 'Failed to generate password reset link');
      }
    } catch (err) {
      showToast(err.message || 'Error generating password reset link', 'error');
    }
  };

  const handleResendInvite = async (userId, userObj = {}) => {
    return handleGenerateSetupLink(userId, userObj);
  };

  const handleRevokeInvite = async (userId) => {
    try {
      const res = await api.adminRevokeInvitation(userId);
      if (res?.success) {
        showToast(res.message || 'Invitation revoked');
        await fetchStudents();
        await fetchFaculty();
      } else {
        throw new Error(res?.error || 'Failed to revoke invitation');
      }
    } catch (err) {
      showToast(err.message || 'Error revoking invitation', 'error');
    }
  };

  const handleViewStudentDetail = async (userId) => {
    try {
      const res = await api.adminGetStudentDetail(userId);
      if (res?.success) {
        setSelectedStudentDetail(res);
        try {
          setRouteParam('student', userId);
          sessionStorage.setItem('aaroha_selected_student_id', String(userId));
        } catch (e) {}
      }
    } catch (err) {
      showToast('Could not load student profile', 'error');
    }
  };

  const handleCloseStudentDetail = () => {
    setSelectedStudentDetail(null);
    try {
      removeRouteParam('student');
      sessionStorage.removeItem('aaroha_selected_student_id');
    } catch (e) {}
  };

  // Restore selected student detail drawer across refresh
  useEffect(() => {
    const studentParam = getRouteParam('student') || sessionStorage.getItem('aaroha_selected_student_id');
    if (studentParam && !selectedStudentDetail) {
      handleViewStudentDetail(studentParam);
    }
  }, []);

  // Faculty Handlers
  const handleAddFaculty = async (facultyData) => {
    try {
      const res = await api.adminCreateFaculty(facultyData);
      if (res?.success) {
        showToast(res.message || 'Faculty onboarded successfully');
        if (res.invitation_url) {
          setInvitationModalData({
            type: 'setup',
            title: res.reused ? 'Faculty Account Reused & Cohorts Assigned' : 'Faculty Onboarded — Setup Link Generated',
            name: facultyData?.full_name || 'Faculty Member',
            code: res.faculty_code || '',
            email: facultyData?.email || '',
            invitation_url: res.invitation_url,
            expires_at: res.expires_at || '24 hours',
            email_notice: res.email_notice || 'Email server is unconfigured. Copy this setup link and share it directly via WhatsApp.',
            btn_label: 'Copy Setup Link',
            reused: !!res.reused
          });
        }
        await fetchFaculty();
        await fetchDashboardStats();
        return res;
      }
    } catch (err) {
      showToast(err.message || 'Error adding faculty', 'error');
      throw err;
    }
  };

  const handleToggleFacultyStatus = async (facultyId, data) => {
    try {
      const res = await api.adminToggleFacultyStatus(facultyId, data);
      if (res?.success) {
        showToast(res.message || 'Faculty status updated');
        await fetchFaculty();
        await fetchDashboardStats();
      } else {
        throw new Error(res?.error || 'Failed to update faculty status');
      }
    } catch (err) {
      showToast(err.message || 'Error updating faculty status', 'error');
    }
  };

  // Batch Handlers
  const handleCreateBatch = async (batchData) => {
    try {
      const res = await api.adminCreateBatch(batchData);
      if (res?.success) {
        showToast(res.message || 'Batch created successfully');
        await fetchBatches();
        await fetchDashboardStats();
      }
    } catch (err) {
      showToast(err.message || 'Error creating batch', 'error');
      throw err;
    }
  };

  // Schedule & Attendance Handlers
  const handleScheduleSession = async (sessionData) => {
    try {
      const res = await api.adminCreateSession(sessionData);
      if (res?.success) {
        showToast(res.message || 'Class session scheduled');
        await fetchSchedule();
        await fetchDashboardStats();
        return res;
      }
      return res;
    } catch (err) {
      showToast(err.message || 'Error scheduling session', 'error');
      throw err;
    }
  };

  const handleRescheduleSession = async (sessionId, data) => {
    try {
      const res = await api.adminRescheduleSession(sessionId, data);
      if (res?.success) {
        showToast(res.message || 'Session rescheduled');
        await fetchSchedule();
      }
    } catch (err) {
      showToast(err.message || 'Error rescheduling session', 'error');
      throw err;
    }
  };

  const handleCancelSession = async (sessionId, data) => {
    try {
      const res = await api.adminCancelSession(sessionId, data);
      if (res?.success) {
        showToast(res.message || 'Session cancelled');
        await fetchSchedule();
        await fetchDashboardStats();
      }
    } catch (err) {
      showToast(err.message || 'Error cancelling session', 'error');
      throw err;
    }
  };

  const handleDeleteSession = async (sessionId) => {
    try {
      const deleteFn = api.adminDeleteScheduleSession || api.adminDeleteSession;
      const res = await deleteFn(sessionId);
      if (res?.success) {
        showToast(res.message || 'Class session permanently deleted');
        await fetchSchedule();
        await fetchDashboardStats();
      }
      return res;
    } catch (err) {
      showToast(err.message || 'Error deleting session', 'error');
      throw err;
    }
  };

  const handleFetchSessionAttendance = async (sessionId) => {
    return await api.adminGetSessionAttendance(sessionId);
  };

  const handleSaveAttendance = async (sessionId, data) => {
    try {
      const res = await api.adminSaveSessionAttendance(sessionId, data);
      if (res?.success) {
        showToast(res.message || 'Attendance committed successfully');
        await fetchSchedule();
        await fetchDashboardStats();
      }
    } catch (err) {
      showToast(err.message || 'Error saving attendance', 'error');
      throw err;
    }
  };

  const handleCorrectAttendance = async (recordId, data) => {
    try {
      const res = await api.adminCorrectAttendance(recordId, data);
      if (res?.success) {
        showToast(res.message || 'Attendance correction recorded');
      }
    } catch (err) {
      showToast(err.message || 'Error correcting attendance', 'error');
      throw err;
    }
  };

  // Learning Materials Handlers
  const handleCreateMaterial = async (data) => {
    try {
      const res = await api.adminCreateMaterial(data);
      if (res?.success) {
        showToast(res.message || 'Material published');
        await fetchMaterials();
      }
    } catch (err) {
      showToast(err.message || 'Error uploading material', 'error');
      throw err;
    }
  };

  const handleDeleteMaterial = async (id) => {
    try {
      const res = await api.adminDeleteMaterial(id);
      if (res?.success) {
        showToast('Learning material removed');
        setMaterials(prev => prev.filter(m => m.id !== id));
      }
    } catch (err) {
      showToast('Error removing material', 'error');
    }
  };

  // Announcements Handlers
  const handleCreateAnnouncement = async (data) => {
    try {
      const res = await api.adminCreateAnnouncement(data);
      if (res?.success) {
        showToast(res.message || 'Announcement broadcasted');
        await fetchAnnouncements();
      }
    } catch (err) {
      showToast(err.message || 'Error broadcasting announcement', 'error');
      throw err;
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    try {
      const res = await api.adminDeleteAnnouncement(id);
      if (res?.success) {
        showToast('Announcement removed');
        setAnnouncements(prev => prev.filter(a => a.id !== id));
      }
    } catch (err) {
      showToast('Error removing announcement', 'error');
    }
  };

  // Follow-up Handlers
  const handleCreateFollowup = async (data) => {
    try {
      const res = await api.adminCreateFollowup(data);
      if (res?.success) {
        showToast('Student follow-up logged');
        await fetchFollowups();
        await fetchDashboardStats();
      }
    } catch (err) {
      showToast('Error creating follow-up', 'error');
    }
  };

  const handleUpdateFollowup = async (id, data) => {
    try {
      const res = await api.adminUpdateFollowup(id, data);
      if (res?.success) {
        showToast('Follow-up status resolved');
        await fetchFollowups();
        await fetchDashboardStats();
      }
    } catch (err) {
      showToast('Error updating follow-up', 'error');
    }
  };

  // Placement Handlers
  const handleUpdatePlacementProfile = async (userId, data) => {
    try {
      const res = await api.adminUpdatePlacementProfile(userId, data);
      if (res?.success) {
        showToast('Placement profile updated');
        await fetchPlacementData();
        return res;
      }
    } catch (err) {
      showToast('Error updating placement profile', 'error');
    }
  };

  const handleSyncPlacementReadiness = async (userId) => {
    try {
      const res = await api.adminSyncPlacementReadiness(userId);
      if (res?.success) {
        showToast('Placement readiness score synchronized from student progress');
        await fetchPlacementData();
        return res;
      }
    } catch (err) {
      showToast('Error syncing placement readiness', 'error');
    }
  };

  const handleCreateJobOpening = async (data) => {
    try {
      const res = await api.adminCreateJobOpening(data);
      if (res?.success) {
        showToast(res.message || 'Job opening published');
        await fetchPlacementData();
      }
    } catch (err) {
      showToast('Error publishing job opening', 'error');
    }
  };

  // Users & Roles Handlers
  const handleUpdateUserRole = async (userId, newRole) => {
    try {
      const res = await api.adminUpdateUserRole(userId, { role: newRole });
      if (res?.success) {
        showToast(res.message || 'User role updated');
        await fetchUsers();
      } else {
        showToast(res?.error || 'Error updating user role', 'error');
      }
    } catch (err) {
      showToast('Error updating user role', 'error');
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      const res = await api.adminDeleteUser(userId);
      if (res?.success) {
        showToast(res.message || 'User account deleted successfully');
        await Promise.all([fetchUsers(), fetchStudents(), fetchFaculty()]);
      } else {
        showToast(res?.error || 'Failed to delete user account', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete user account', 'error');
    }
  };

  // Settings Handlers
  const handleSaveSettings = async (data) => {
    try {
      const res = await api.adminUpdateSettings(data);
      if (res?.success) {
        showToast('System configuration saved');
        setSettings(data);
      }
    } catch (err) {
      showToast('Error saving settings', 'error');
    }
  };

  // Certificate Revocation
  const handleRevokeCertificate = async (id, data) => {
    try {
      const res = await api.adminRevokeCertificate(id, data);
      if (res?.success) {
        showToast('Certificate revoked');
      }
    } catch (err) {
      showToast('Revocation recorded');
    }
  };

  // Badge counts for sidebar
  const pendingSubmissionsCount = taskSubmissions.filter(s => s.status === 'under_review').length;
  const badgeCounts = {
    assessments: pendingSubmissionsCount,
    followups: followups.filter(f => f.status === 'open').length,
    schedule: todayClasses.length
  };

  // Quick navigation helper from dashboard cards
  const handleNavigateTab = async (tabId, filter) => {
    if (canAccessModule(userRole, tabId)) {
      setActiveModule(tabId);
      if (tabId === 'attendance' && filter?.sessionId) {
        setSelectedSessionId(filter.sessionId);
      }
      if (tabId === 'students' && filter?.studentId) {
        await handleViewStudentDetail(filter.studentId);
      }
    } else {
      showToast(`Module '${tabId}' is restricted to your role`, 'error');
    }
  };

  const breadcrumb = BREADCRUMB_MAP[activeModule] || { group: 'Workspace', label: activeModule };
  const totalNotificationCount = (followups.filter(f => f.status === 'open').length) +
    (taskSubmissions.filter(s => s.status === 'under_review').length) +
    (todayClasses.length);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-row font-sans text-slate-800 antialiased">
      {/* Toast Notification */}
      {toastMessage && (
        <div 
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-xs font-semibold border transition-all animate-in fade-in slide-in-from-bottom-2 duration-200 ${
            toastMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Unified Left Sidebar (~240px wide, collapsible to icons, mobile drawer) */}
      <AdminSidebar
        activeModule={activeModule}
        onSelectModule={(id) => {
          if (id === 'leaderboard') {
            if (onOpenLeaderboard) onOpenLeaderboard();
            setIsMobileSidebarOpen(false);
            return;
          }
          if (id !== 'students') {
            removeRouteParam('student');
            sessionStorage.removeItem('aaroha_selected_student_id');
            setSelectedStudentDetail(null);
          }
          if (id !== 'support') {
            removeRouteParam('ticket');
            sessionStorage.removeItem('aaroha_admin_selected_ticket_id');
          }
          if (id !== 'faculty') {
            removeRouteParam('faculty');
            sessionStorage.removeItem('aaroha_admin_selected_faculty_id');
          }
          if (id !== 'batches') {
            removeRouteParam('batch');
            removeRouteParam('drawer');
            sessionStorage.removeItem('aaroha_admin_selected_batch_id');
            sessionStorage.removeItem('aaroha_admin_selected_batch_drawer');
          }
          setActiveModule(id);
          setIsMobileSidebarOpen(false);
        }}
        userRole={userRole}
        badgeCounts={badgeCounts}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onViewWebsite={onViewWebsite}
      />

      {/* Main Content Area (Remaining Width, Single Scroll) */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen bg-slate-50 dark:bg-[#070e1b] text-slate-900 dark:text-slate-100 transition-colors duration-200">
        {/* Compact Operational Header (~64px / h-16) */}
        <header className="h-16 px-4 sm:px-6 bg-white dark:bg-[#0c1527] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-2xs shrink-0 transition-colors duration-200">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Drawer Hamburger */}
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>

            {/* Mobile Clickable Aaroha Logo */}
            <div
              onClick={onViewWebsite}
              className="md:hidden flex items-center cursor-pointer select-none group mr-1"
              title="Return to Public Homepage"
              role="button"
            >
              <img
                src={aarohaLogo}
                alt="Aaroha LMS"
                className="h-6 w-auto object-contain"
              />
            </div>

            {/* Breadcrumb Navigation */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
              <span className="font-medium text-slate-500 dark:text-slate-400">{breadcrumb.group}</span>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="font-semibold text-slate-900 dark:text-white truncate">{breadcrumb.label}</span>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Clearly Visible Back to Website Header Link */}
            <button
              type="button"
              onClick={onViewWebsite}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-[#0a7cb3] dark:hover:text-sky-300 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Return to public homepage"
              aria-label="Back to Website"
            >
              <ArrowLeft size={14} className="text-[#0a7cb3] dark:text-sky-400" />
              <span className="hidden sm:inline">Back to Website</span>
            </button>

            {/* Academic Leaderboard Quick Trigger for Admin / Staff */}
            <button
              type="button"
              onClick={onOpenLeaderboard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-700/60 text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Open Academic Leaderboard & Student Standings"
              aria-label="Academic Leaderboard"
            >
              <Award size={14} className="text-amber-600 dark:text-amber-400" />
              <span className="hidden sm:inline">Leaderboard</span>
            </button>

            {/* Small Round Theme Toggle in Admin Header */}
            <ThemeToggle size="small" />

            {/* Role-Scoped Workspace Search */}
            <div className="relative hidden sm:block w-48 md:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search workspace..."
                value={headerSearchQuery}
                onChange={(e) => setHeaderSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && headerSearchQuery.trim()) {
                    const q = headerSearchQuery.toLowerCase();
                    if (q.includes('stud') || q.includes('admit')) setActiveModule('students');
                    else if (q.includes('fac') || q.includes('prof')) setActiveModule('faculty');
                    else if (q.includes('batch') || q.includes('cohort')) setActiveModule('batches');
                    else if (q.includes('class') || q.includes('sched')) setActiveModule('schedule');
                    else if (q.includes('announc') || q.includes('notice')) setActiveModule('announcements');
                    else if (q.includes('cert')) setActiveModule('certificates');
                  }
                }}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-[#0a7cb3] focus:ring-1 focus:ring-[#0a7cb3] transition-colors"
                aria-label="Search workspace"
              />
            </div>

            {/* Notifications Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsNotificationsOpen(prev => !prev)}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 relative cursor-pointer focus-visible:outline-2 focus-visible:outline-[#0a7cb3]"
                title="Operational Notifications"
                aria-label="Notifications"
                aria-expanded={isNotificationsOpen}
              >
                <Bell size={18} />
                {totalNotificationCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500" />
                )}
              </button>

              {isNotificationsOpen && (
                <div
                  className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95"
                  onMouseLeave={() => setIsNotificationsOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Operational Alerts</span>
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-blue-50 text-[#0a7cb3]">
                      {totalNotificationCount} Active
                    </span>
                  </div>

                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 text-xs thin-scrollbar">
                    {totalNotificationCount === 0 ? (
                      <div className="py-6 text-center text-slate-400 text-xs">
                        No operational alerts at this time.
                      </div>
                    ) : (
                      <>
                        {todayClasses.length > 0 && (
                          <div
                            onClick={() => { setActiveModule('schedule'); setIsNotificationsOpen(false); }}
                            className="p-3 hover:bg-slate-50 cursor-pointer flex items-start gap-2.5"
                          >
                            <Calendar size={15} className="text-[#0a7cb3] shrink-0 mt-0.5" />
                            <div>
                              <div className="font-semibold text-slate-900">{todayClasses.length} live classes scheduled today</div>
                              <div className="text-[11px] text-slate-500">Click to view session times and links</div>
                            </div>
                          </div>
                        )}

                        {taskSubmissions.filter(s => s.status === 'under_review').length > 0 && (
                          <div
                            onClick={() => { setActiveModule('assessments'); setIsNotificationsOpen(false); }}
                            className="p-3 hover:bg-slate-50 cursor-pointer flex items-start gap-2.5"
                          >
                            <Clock size={15} className="text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <div className="font-semibold text-slate-900">
                                {taskSubmissions.filter(s => s.status === 'under_review').length} submissions awaiting review
                              </div>
                              <div className="text-[11px] text-slate-500">Student projects ready for faculty scoring</div>
                            </div>
                          </div>
                        )}

                        {followups.filter(f => f.status === 'open').length > 0 && (
                          <div
                            onClick={() => { setActiveModule('dashboard'); setIsNotificationsOpen(false); }}
                            className="p-3 hover:bg-slate-50 cursor-pointer flex items-start gap-2.5"
                          >
                            <AlertTriangle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <div className="font-semibold text-slate-900">
                                {followups.filter(f => f.status === 'open').length} student attendance alerts
                              </div>
                              <div className="text-[11px] text-slate-500">Academic intervention required</div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Single Profile Menu */}
            {currentUser && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen(prev => !prev)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200 cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-[#0a7cb3]"
                  aria-expanded={isProfileMenuOpen}
                  aria-label="User profile menu"
                >
                  <img
                    src={currentUser.avatar || '/avatars/3d/memo_1.png'}
                    alt={currentUser.full_name}
                    className="w-7 h-7 rounded-md object-cover ring-1 ring-slate-200 shrink-0 bg-slate-100"
                  />
                  <div className="hidden sm:block text-left pr-1">
                    <div className="text-xs font-semibold text-slate-900 leading-tight">
                      {currentUser.full_name}
                    </div>
                    <div className="text-[10px] text-slate-500 capitalize">
                      {userRole.replace('_', ' ')}
                    </div>
                  </div>
                  <ChevronDown size={13} className="text-slate-400" />
                </button>

                {/* Profile Menu Dropdown */}
                {isProfileMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 text-xs"
                    onMouseLeave={() => setIsProfileMenuOpen(false)}
                  >
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <div className="font-bold text-slate-900 truncate">{currentUser.full_name}</div>
                      <div className="text-[11px] text-slate-500 truncate">{currentUser.email}</div>
                      <span className="inline-block mt-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 text-[#0a7cb3] border border-blue-100 uppercase">
                        {userRole.replace('_', ' ')}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        if (onOpenProfile) onOpenProfile();
                      }}
                      className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-[#0a7cb3] flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <User size={14} className="text-slate-400" />
                      <span>Profile & Settings</span>
                    </button>

                    {onViewWebsite && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          onViewWebsite();
                        }}
                        className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-[#0a7cb3] flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <Globe size={14} className="text-[#0a7cb3]" />
                        <span>Back to Website</span>
                      </button>
                    )}

                    <div className="border-t border-slate-100 my-1" />

                    {onLogout && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full text-left px-4 py-2 text-rose-700 hover:bg-rose-50 flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <LogOut size={14} className="text-rose-500" />
                        <span>Sign Out</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Tab View Container: Consistent ~24-32px padding, Single Natural Page Scroll */}
        <main className="p-6 sm:p-8 flex-1">
          {activeModule === 'dashboard' && (
            <AdminDashboardTab
              stats={dashboardStats}
              todayClasses={todayClasses}
              students={students}
              batches={batches}
              faculty={faculty}
              taskSubmissions={taskSubmissions}
              followups={followups}
              placementData={placementData}
              supportData={supportData}
              auditLogs={auditLogs}
              currentUser={currentUser}
              onNavigateTab={handleNavigateTab}
              onQuickAction={(action, payload) => {
                if (action === 'onboard_student' || action === 'add_student') setActiveModule('students');
                else if (action === 'create_batch') setActiveModule('batches');
                else if (action === 'schedule_session' || action === 'schedule_class') setActiveModule('schedule');
                else if (action === 'attendance') {
                  if (payload) setSelectedSessionId(payload);
                  setActiveModule('attendance');
                }
                else if (action === 'grading') setActiveModule('assessments');
                else if (action === 'upload_material') setActiveModule('materials');
                else if (action === 'create_assignment') setActiveModule('assessments');
                else if (action === 'send_announcement') setActiveModule('announcements');
                else if (action === 'review_resume' || action === 'schedule_mock' || action === 'add_job' || action === 'update_application' || action === 'record_offer') setActiveModule('placement');
                else if (ADMIN_MODULES.some(m => m.id === action)) setActiveModule(action);
              }}
            />
          )}

          {activeModule === 'students' && (
            <AdminStudentsTab
              students={students}
              courses={courses}
              batches={batches}
              coordinators={coordinators}
              onAddStudent={handleAddStudent}
              onUpdateStudent={handleUpdateStudent}
              onDeleteStudent={handleDeleteStudent}
              onTransferBatch={handleTransferBatch}
              onToggleStatus={handleToggleStudentStatus}
              onResendInvite={handleResendInvite}
              onGenerateSetupLink={handleGenerateSetupLink}
              onGenerateResetLink={handleGenerateResetLink}
              onRevokeInvite={handleRevokeInvite}
              onViewStudentDetail={handleViewStudentDetail}
              selectedStudentDetail={selectedStudentDetail}
              onCloseStudentDetail={handleCloseStudentDetail}
            />
          )}

          {activeModule === 'faculty' && (
            <AdminFacultyTab
              faculty={faculty}
              courses={courses}
              batches={batches}
              onAddFaculty={handleAddFaculty}
              onUpdateFaculty={fetchFaculty}
              onDeleteFaculty={fetchFaculty}
              onToggleFacultyStatus={handleToggleFacultyStatus}
              onResendInvite={handleResendInvite}
              onGenerateSetupLink={handleGenerateSetupLink}
              onGenerateResetLink={handleGenerateResetLink}
              onRevokeInvite={handleRevokeInvite}
              showToast={showToast}
            />
          )}

          {activeModule === 'courses' && (
            <AdminCoursesTab
              courses={courses}
              faculty={faculty}
              onAddCourse={onAddCourse}
              onUpdateCourse={onUpdateCourse}
              onDeleteCourse={onDeleteCourse}
              onAddModule={onAddModule}
              onUpdateModule={onUpdateModule}
              onDeleteModule={onDeleteModule}
              onAddLesson={onAddLesson}
              onUpdateLesson={onUpdateLesson}
              onDeleteLesson={onDeleteLesson}
              onAddTask={onAddTask}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
              onIssueCertificate={onIssueCertificate}
              onViewCourse={onViewCourse}
              currentUser={currentUser}
            />
          )}

          {activeModule === 'batches' && (
            <AdminBatchesTab
              batches={batches}
              courses={courses}
              faculty={faculty}
              coordinators={coordinators}
              onCreateBatch={handleCreateBatch}
              onUpdateBatch={fetchBatches}
              showToast={showToast}
            />
          )}

          {activeModule === 'schedule' && (
            <AdminScheduleTab
              sessions={sessions}
              batches={batches}
              faculty={faculty}
              onScheduleSession={handleScheduleSession}
              onRescheduleSession={handleRescheduleSession}
              onCancelSession={handleCancelSession}
              onDeleteSession={handleDeleteSession}
              onMarkAttendance={(sess) => {
                setSelectedSessionId(sess.id);
                setActiveModule('attendance');
              }}
            />
          )}

          {activeModule === 'attendance' && (
            <AdminAttendanceTab
              sessions={sessions}
              batches={batches}
              faculty={faculty}
              selectedSessionId={selectedSessionId}
              onFetchSessionAttendance={handleFetchSessionAttendance}
              onSaveAttendance={handleSaveAttendance}
              onCorrectAttendance={handleCorrectAttendance}
              onScheduleSession={handleScheduleSession}
              onNavigateToSchedule={() => setActiveModule('schedule')}
              onNavigateToBatches={() => setActiveModule('batches')}
            />
          )}

          {activeModule === 'materials' && (
            <AdminContentPublishingTab
              courses={courses}
              batches={batches}
              students={students}
              currentUser={currentUser}
              showToast={showToast}
            />
          )}

          {activeModule === 'assessments' && (
            <AdminAssessmentsTab
              taskSubmissions={taskSubmissions}
              courses={courses}
              onGradeSubmission={onGradeSubmission}
            />
          )}

          {activeModule === 'announcements' && (
            <AdminAnnouncementsTab
              announcements={announcements}
              courses={courses}
              batches={batches}
              students={students}
              faculty={faculty}
              onCreateAnnouncement={handleCreateAnnouncement}
              onDeleteAnnouncement={handleDeleteAnnouncement}
              currentUser={currentUser}
            />
          )}

          {activeModule === 'reports' && (
            <AdminReportsTab
              students={students}
              courses={courses}
              batches={batches}
              faculty={faculty}
              placementData={placementData}
              certificates={certificates}
            />
          )}

          {activeModule === 'certificates' && (
            <AdminCertificatesTab
              certificates={certificates}
              students={students}
              courses={courses}
              batches={batches}
              onIssueCertificate={onIssueCertificate}
              onRevokeCertificate={handleRevokeCertificate}
              onRefreshCertificates={fetchCertificates}
              onViewCertificate={(c) => {}}
            />
          )}

          {activeModule === 'placement' && (
            <AdminPlacementTab
              placementData={placementData}
              students={students}
              courses={courses}
              batches={batches}
              onUpdatePlacementProfile={handleUpdatePlacementProfile}
              onSyncPlacementReadiness={handleSyncPlacementReadiness}
              onCreateJobOpening={handleCreateJobOpening}
            />
          )}

          {activeModule === 'support' && (
            <AdminSupportTab
              supportData={supportData}
              onRefreshSupport={fetchSupportData}
            />
          )}

          {activeModule === 'users' && (
            <AdminUsersTab
              users={usersList}
              currentUser={currentUser}
              onUpdateUserRole={handleUpdateUserRole}
              onDeleteUser={handleDeleteUser}
              onRefreshUsers={fetchUsers}
              onCreateUser={onOnboardUser}
              showToast={showToast}
            />
          )}

          {activeModule === 'settings' && (
            <AdminSettingsTab
              settings={settings}
              onSaveSettings={handleSaveSettings}
            />
          )}

          {activeModule === 'audit' && (
            <AdminAuditLogTab
              auditLogs={auditLogs}
            />
          )}

          {activeModule === 'followups' && (
            <AdminFollowupsTab
              followups={followups}
              students={students}
              batches={batches}
              onCreateFollowup={handleCreateFollowup}
              onUpdateFollowup={handleUpdateFollowup}
            />
          )}
        </main>
      </div>

      {/* Generated Single-Use Setup / Reset Link Modal */}
      {invitationModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-xs animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-[#0A7CB3] flex items-center justify-center">
                  <Mail size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{invitationModalData.title}</h3>
                  <p className="text-[11px] text-slate-500">Expiring Single-Use Cryptographic Token (24h Validity)</p>
                </div>
              </div>
              <button
                onClick={() => setInvitationModalData(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {invitationModalData.name && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Recipient Name:</span>
                  <span className="font-semibold text-slate-900">{invitationModalData.name}</span>
                </div>
                {invitationModalData.code && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Institutional ID:</span>
                    <span className="font-mono font-semibold text-[#0A7CB3]">{invitationModalData.code}</span>
                  </div>
                )}
                {invitationModalData.email && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Registered Email:</span>
                    <span className="font-mono text-slate-800">{invitationModalData.email}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Status Recorded:</span>
                  <span className="font-semibold text-amber-700">Link Generated</span>
                </div>
              </div>
            )}


            {/* Link Box */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block text-[11px]">
                {invitationModalData.type === 'reset' ? 'Single-Use Password Reset URL (Expires in 24 hours):' : 'Single-Use Activation URL (Expires in 24 hours):'}
              </label>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-800 break-all select-all">
                {invitationModalData.invitation_url}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(invitationModalData.invitation_url);
                  showToast((invitationModalData.btn_label || 'Setup link') + ' copied to clipboard!');
                }}
                className="px-3 py-2 bg-[#0A7CB3] hover:bg-[#086491] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                {invitationModalData.btn_label || 'Copy Setup Link'}
              </button>
              <button
                type="button"
                onClick={() => setInvitationModalData(null)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
