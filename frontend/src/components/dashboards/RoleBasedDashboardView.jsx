import React, { useState, useEffect, useCallback } from 'react';
import DashboardHeader from './DashboardHeader';
import StudentDashboardView from './StudentDashboardView';
import FacultyDashboardView from './FacultyDashboardView';
import PlacementDashboardView from './PlacementDashboardView';
import CoordinatorDashboardView from './CoordinatorDashboardView';
import SuperAdminDashboardView from './SuperAdminDashboardView';
import { api } from '../../apiService';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export default function RoleBasedDashboardView({
  currentUser,
  onOpenCourse,
  onContinueLearning,
  onOpenClassroom,
  onOpenProfile,
  onOpenTicketModal,
  onExploreCatalog,
  onNavigateAdminTab,
  onQuickAction,
  onViewWebsite
}) {
  // Active role perspective state (persisted per session)
  const [activeRole, setActiveRole] = useState(() => {
    try {
      const saved = sessionStorage.getItem('aaroha_active_dashboard_role');
      if (saved) return saved;
      return (currentUser?.role || 'student').toLowerCase();
    } catch (e) {
      return (currentUser?.role || 'student').toLowerCase();
    }
  });

  const [dashboardData, setDashboardData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // Fetch real database-backed dashboard info based on active role
  const fetchDashboardData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      let data = null;
      const role = activeRole.toLowerCase();

      if (role === 'student') {
        data = await api.getStudentDashboard();
      } else if (role === 'faculty' || role === 'instructor') {
        data = await api.getFacultyDashboard();
      } else if (role === 'placement_officer') {
        data = await api.getPlacementDashboard();
      } else if (role === 'coordinator') {
        data = await api.getCoordinatorDashboard();
      } else if (role === 'super_admin' || role === 'admin') {
        data = await api.getSuperAdminDashboard();
      } else {
        data = await api.getStudentDashboard();
      }

      if (data) {
        setDashboardData(data);
        setLastRefreshed(data.last_refreshed || new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }));
      }
    } catch (err) {
      console.warn('Dashboard fetch error:', err);
      setError(err.message || 'Failed to load database-backed dashboard data.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeRole]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handle Role Switching
  const handleRoleSwitch = (newRole) => {
    setActiveRole(newRole);
    try {
      sessionStorage.setItem('aaroha_active_dashboard_role', newRole);
    } catch (e) {}
  };

  return (
    <div className="space-y-6">
      
      {/* Universal Dashboard Header (Identity, Role Switcher, Timezone, Refresh, Settings) */}
      <DashboardHeader
        currentUser={currentUser}
        activeRole={activeRole}
        onRoleSwitch={handleRoleSwitch}
        authorizedRoles={currentUser?.authorized_roles || []}
        lastRefreshed={lastRefreshed}
        onRefresh={() => fetchDashboardData(true)}
        onOpenProfile={onOpenProfile}
        onViewWebsite={onViewWebsite || onExploreCatalog}
        isRefreshing={isRefreshing}
      />

      {/* Loading State */}
      {isLoading ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center space-y-4 shadow-xs">
          <Loader2 className="w-8 h-8 text-[#0A7CB3] animate-spin mx-auto" />
          <div className="text-sm font-bold text-slate-800">Synchronizing Institutional Records...</div>
          <p className="text-xs text-slate-500">Querying real-time database ledger, schedules, and active enrollments.</p>
        </div>
      ) : error ? (
        /* Error State with Retry */
        <div className="bg-white rounded-3xl border border-rose-200 p-8 sm:p-12 text-center space-y-4 shadow-xs">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <div className="text-base font-black text-slate-900">Dashboard Synchronization Alert</div>
          <p className="text-xs text-slate-600 max-w-md mx-auto">{error}</p>
          <button
            type="button"
            onClick={() => fetchDashboardData(false)}
            className="px-5 py-2.5 rounded-xl bg-[#0A7CB3] hover:bg-[#086491] text-white text-xs font-bold inline-flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>Retry Connection</span>
          </button>
        </div>
      ) : (
        /* Role-Specific Dashboard Content */
        <div>
          {activeRole === 'student' && (
            <StudentDashboardView
              dashboardData={dashboardData}
              onOpenCourse={onOpenCourse}
              onContinueLearning={onContinueLearning}
              onOpenClassroom={onOpenClassroom}
              onOpenProfile={onOpenProfile}
              onOpenTicketModal={onOpenTicketModal}
              onExploreCatalog={onExploreCatalog}
            />
          )}

          {(activeRole === 'faculty' || activeRole === 'instructor') && (
            <FacultyDashboardView
              dashboardData={dashboardData}
              onNavigateTab={onNavigateAdminTab}
              onOpenAttendance={(sessionId) => onQuickAction && onQuickAction('attendance', sessionId)}
              onOpenGrading={(subId) => onQuickAction && onQuickAction('grading', subId)}
              onOpenMaterialModal={() => onQuickAction && onQuickAction('upload_material')}
              onOpenAssignmentModal={() => onQuickAction && onQuickAction('create_assignment')}
              onOpenAnnouncementModal={() => onQuickAction && onQuickAction('send_announcement')}
            />
          )}



          {activeRole === 'placement_officer' && (
            <PlacementDashboardView
              dashboardData={dashboardData}
              onOpenReviewResume={(st) => onQuickAction && onQuickAction('review_resume', st)}
              onOpenScheduleMock={(st) => onQuickAction && onQuickAction('schedule_mock', st)}
              onOpenAddJob={() => onQuickAction && onQuickAction('add_job')}
              onOpenUpdateApplication={(app) => onQuickAction && onQuickAction('update_application', app)}
              onOpenRecordOffer={() => onQuickAction && onQuickAction('record_offer')}
            />
          )}

          {activeRole === 'coordinator' && (
            <CoordinatorDashboardView
              dashboardData={dashboardData}
              onNavigateTab={onNavigateAdminTab}
              onQuickAction={onQuickAction}
            />
          )}

          {(activeRole === 'super_admin' || activeRole === 'admin') && (
            <SuperAdminDashboardView
              dashboardData={dashboardData}
              onNavigateTab={onNavigateAdminTab}
              onQuickAction={onQuickAction}
            />
          )}
        </div>
      )}

    </div>
  );
}
