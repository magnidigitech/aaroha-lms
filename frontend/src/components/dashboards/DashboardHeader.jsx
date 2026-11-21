import React, { useState } from 'react';
import { 
  User, Shield, GraduationCap, Briefcase, Layers, 
  RefreshCw, Settings, ChevronDown, Check, Clock, Globe, Bell,
  BookOpen, Video, HelpCircle
} from 'lucide-react';

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Operational Admin',
  coordinator: 'Academic Coordinator',
  faculty: 'Faculty Instructor',
  instructor: 'Faculty Instructor',
  placement_officer: 'Placement Officer',
  student: 'Student Learner'
};

export const ROLE_ICONS = {
  super_admin: Shield,
  admin: Shield,
  coordinator: Layers,
  faculty: GraduationCap,
  instructor: GraduationCap,
  placement_officer: Briefcase,
  student: User
};

export default function DashboardHeader({
  currentUser,
  activeRole,
  onRoleSwitch,
  authorizedRoles = [],
  lastRefreshed,
  onRefresh,
  onOpenProfile,
  onViewWebsite,
  isRefreshing = false,
  notificationCount = 0,
  onNavigateTab,
  enrolledCoursesCount = 0,
  nextClass = null,
  onOpenTicketModal = null
}) {
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  const hasRealLink = Boolean(
    nextClass?.meeting_link &&
    typeof nextClass.meeting_link === 'string' &&
    nextClass.meeting_link.trim().startsWith('http') &&
    !nextClass.meeting_link.includes('xyz-aaroha-lms') &&
    !nextClass.meeting_link.includes('example.com') &&
    !nextClass.meeting_link.includes('dummy') &&
    !nextClass.meeting_link.includes('placeholder')
  );

  // Normalize authorized roles list (excluding out-of-scope accounts role)
  const availableRoles = Array.from(new Set([
    currentUser?.role || 'student',
    ...(currentUser?.authorized_roles || []),
    ...(Array.isArray(authorizedRoles) ? authorizedRoles : [])
  ])).filter(r => r && r !== 'accounts');

  // If super_admin, universal perspective switching across core academic/operational roles
  const effectiveRoles = (currentUser?.role === 'super_admin')
    ? ['super_admin', 'coordinator', 'faculty', 'placement_officer', 'student']
    : (currentUser?.role === 'coordinator' || currentUser?.role === 'admin')
    ? ['coordinator', 'faculty', 'student']
    : availableRoles;

  const ActiveIcon = ROLE_ICONS[activeRole] || User;

  return (
    <div className="bg-white dark:bg-[#0f1b33] rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-7 shadow-xs mb-6 transition-colors duration-200">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        
        {/* User Identity & Active Role Badge */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onOpenProfile}
            title="Click to view and edit personal profile & account settings"
            className="relative group cursor-pointer shrink-0 focus:outline-none"
          >
            <img
              src={currentUser?.avatar || '/avatars/3d/memo_13.png'}
              alt={currentUser?.full_name || 'User'}
              onError={(e) => { e.currentTarget.src = '/avatars/3d/memo_13.png'; }}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover ring-2 ring-[#0A7CB3]/30 group-hover:ring-[#0A7CB3] shadow-md group-hover:scale-105 transition-all bg-slate-100 dark:bg-slate-800"
            />
            <div className="absolute -bottom-1 -right-1 bg-[#0A7CB3] text-white p-1 rounded-lg shadow-xs group-hover:bg-[#086491] transition-colors">
              <Settings size={12} />
            </div>
          </button>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {currentUser?.display_name || currentUser?.full_name || 'Aaroha Member'}
              </h1>
              
              {/* Active Role Pill */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 text-[#0A7CB3] dark:text-sky-300 border border-blue-200 dark:border-blue-900/60">
                <ActiveIcon size={12} />
                {ROLE_LABELS[activeRole] || activeRole}
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-2">
              <span>{currentUser?.title || ROLE_LABELS[activeRole] || 'Institutional Member'}</span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="inline-flex items-center gap-1 text-slate-400">
                <Globe size={11} />
                {currentUser?.timezone || 'Asia/Kolkata (IST)'}
              </span>
            </p>
          </div>
        </div>

        {/* Action Controls & Role Switcher */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Freed Space: Direct My Courses Shortcut */}
          <button
            type="button"
            onClick={() => onNavigateTab && onNavigateTab('courses')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-[#0A7CB3] dark:hover:text-sky-300 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer group"
            title="View enrolled courses and cohort syllabus"
          >
            <BookOpen size={14} className="text-[#0A7CB3] dark:text-sky-400" />
            <span>My Courses</span>
            {enrolledCoursesCount > 0 && (
              <span className="bg-[#0A7CB3] text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5">
                {enrolledCoursesCount}
              </span>
            )}
          </button>

          {/* Freed Space: Next Class Shortcut */}
          <button
            type="button"
            onClick={() => onNavigateTab && onNavigateTab('schedule')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-800 text-xs font-bold transition-all shadow-2xs cursor-pointer group"
            title={hasRealLink ? `Next Session: ${nextClass.topic}` : 'View Academic Schedule'}
          >
            <Video size={14} className="text-purple-600 dark:text-purple-400" />
            <span className="hidden sm:inline">Next Class:</span>
            <span className="truncate max-w-[150px] font-semibold text-purple-800 dark:text-purple-300">
              {hasRealLink ? (nextClass.topic || 'Upcoming Session') : 'Schedule'}
            </span>
          </button>

          {/* Dedicated Support & Helpdesk Shortcut */}
          <button
            type="button"
            onClick={() => onOpenTicketModal ? onOpenTicketModal('my_tickets') : (onNavigateTab && onNavigateTab('support'))}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-[#0A7CB3] dark:hover:text-sky-300 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer group"
            title="Academic Support & Helpdesk Tickets"
          >
            <HelpCircle size={14} className="text-[#0A7CB3] dark:text-sky-400" />
            <span>Support & Helpdesk</span>
          </button>
          
          {/* Multi-Role Switcher (Visible when user has multiple authorised roles) */}
          {effectiveRoles.length > 1 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                title="Switch active role dashboard view"
                aria-expanded={isRoleDropdownOpen}
              >
                <ActiveIcon size={14} className="text-[#0A7CB3] dark:text-sky-400" />
                <span className="hidden sm:inline">Role:</span>
                <span>{ROLE_LABELS[activeRole] || activeRole}</span>
                <ChevronDown size={14} className={'text-slate-400 transition-transform duration-200 ' + (isRoleDropdownOpen ? 'rotate-180' : '')} />
              </button>

              {isRoleDropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#0f1b33] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  onMouseLeave={() => setIsRoleDropdownOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Authorised Role Perspectives
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Switching views does not grant additional backend permissions.
                    </div>
                  </div>

                  <div className="p-1 space-y-0.5">
                    {effectiveRoles.map((r) => {
                      const IconComponent = ROLE_ICONS[r] || User;
                      const isSelected = r === activeRole;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            setIsRoleDropdownOpen(false);
                            if (onRoleSwitch) onRoleSwitch(r);
                          }}
                          className={'w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ' + 
                            (isSelected 
                              ? 'bg-blue-50 text-[#0A7CB3] font-bold' 
                              : 'text-slate-700 hover:bg-slate-50')}
                        >
                          <div className="flex items-center gap-2.5">
                            <IconComponent size={14} className={isSelected ? 'text-[#0A7CB3]' : 'text-slate-400'} />
                            <span>{ROLE_LABELS[r] || r}</span>
                          </div>
                          {isSelected && <Check size={14} className="text-[#0A7CB3]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Last Refreshed & Manual Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-xs font-medium shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            title={'Data refreshed at ' + (lastRefreshed || 'recently') + '. Click to refresh.'}
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-[#0A7CB3]' : 'text-slate-400'} />
            <span className="hidden sm:inline">Refresh</span>
            {lastRefreshed && (
              <span className="hidden md:inline text-[10px] text-slate-400">
                ({typeof lastRefreshed === 'string' ? (lastRefreshed.split(' ')[1] || lastRefreshed) : String(lastRefreshed)})
              </span>
            )}
          </button>

          {/* Profile & Settings Visible Link */}
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0A7CB3] hover:bg-[#086491] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Settings size={14} />
            <span>Profile & Settings</span>
          </button>
        </div>

      </div>
    </div>
  );
}
