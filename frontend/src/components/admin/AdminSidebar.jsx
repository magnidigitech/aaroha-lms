import React, { useState } from 'react';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, Layers, Calendar,
  CheckCircle2, FileText, ListTodo, Bell, BarChart3, Award, Briefcase,
  HelpCircle, ShieldCheck, Settings, History, ChevronLeft, ChevronRight,
  ChevronDown, X, UserCheck, Globe
} from 'lucide-react';
import aarohaLogo from '../../assets/aaroha_logo.webp';
import { canAccessModule } from '../../adminUtils';

export const NAVIGATION_GROUPS = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }
    ]
  },
  {
    id: 'people',
    label: 'People',
    items: [
      { id: 'students', label: 'Students', icon: Users },
      { id: 'faculty', label: 'Faculty', icon: GraduationCap }
    ]
  },
  {
    id: 'learning',
    label: 'Learning',
    items: [
      { id: 'courses', label: 'Courses', icon: BookOpen },
      { id: 'batches', label: 'Batches', icon: Layers },
      { id: 'schedule', label: 'Class Schedule', icon: Calendar },
      { id: 'attendance', label: 'Attendance', icon: CheckCircle2 },
      { id: 'materials', label: 'Content & Publishing', icon: Globe },
      { id: 'assessments', label: 'Assessments & Projects', icon: ListTodo }
    ]
  },
  {
    id: 'engagement',
    label: 'Engagement',
    items: [
      { id: 'announcements', label: 'Announcements', icon: Bell },
      { id: 'support', label: 'Support & Feedback', icon: HelpCircle }
    ]
  },
  {
    id: 'outcomes',
    label: 'Outcomes',
    items: [
      { id: 'certificates', label: 'Certificates', icon: Award },
      { id: 'placement', label: 'Placement', icon: Briefcase },
      { id: 'reports', label: 'Reports', icon: BarChart3 }
    ]
  },
  {
    id: 'administration',
    label: 'Administration',
    items: [
      { id: 'users', label: 'Users & Permissions', icon: ShieldCheck },
      { id: 'settings', label: 'Settings', icon: Settings },
      { id: 'audit', label: 'Audit Log', icon: History }
    ]
  }
];

export const ADMIN_MODULES = NAVIGATION_GROUPS.flatMap(g => g.items);

export default function AdminSidebar({
  activeModule,
  onSelectModule,
  userRole = 'super_admin',
  badgeCounts = {},
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
  onViewWebsite
}) {
  // Collapsible section state (default all open)
  const [collapsedSections, setCollapsedSections] = useState({});

  const toggleSection = (groupId) => {
    setCollapsedSections(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-xs transition-opacity duration-200"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 h-screen z-50 flex flex-col bg-white dark:bg-[#0c1527] border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 transition-all duration-200 shadow-xs ${
          isCollapsed ? 'w-20' : 'w-60'
        } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        aria-label="Main Navigation"
      >
        {/* Brand Header with Aaroha Logo Linking to Public Homepage */}
        <div className={`h-16 flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-4'} border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1527] shrink-0`}>
          {!isCollapsed && (
            <div
              onClick={() => {
                if (onViewWebsite) onViewWebsite();
                if (onCloseMobile) onCloseMobile();
              }}
              className="flex items-center gap-3 overflow-hidden cursor-pointer select-none group"
              title="Aaroha Technologies - Return to Public Homepage"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  if (onViewWebsite) onViewWebsite();
                  if (onCloseMobile) onCloseMobile();
                }
              }}
            >
              <div className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 p-1 rounded-lg border border-transparent group-hover:border-slate-200 dark:group-hover:border-slate-700 transition-all flex items-center shrink-0">
                <img
                  src={aarohaLogo}
                  alt="Aaroha Technologies"
                  className="h-7 w-auto object-contain"
                />
              </div>
            </div>
          )}

          {/* Desktop Collapse Toggle */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`hidden md:flex items-center justify-center w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#0a7cb3] ${
              isCollapsed ? 'mx-auto' : ''
            }`}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>

          {/* Mobile Drawer Close Button */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
            aria-label="Close navigation drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Grouped Navigation List */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-4 thin-scrollbar">
          {NAVIGATION_GROUPS.map((group) => {
            const permittedItems = group.items.filter(item => canAccessModule(userRole, item.id));
            if (permittedItems.length === 0) return null;

            const isGroupCollapsed = !!collapsedSections[group.id];

            return (
              <div key={group.id} className="space-y-1">
                {/* Group Heading */}
                {!isCollapsed ? (
                  <button
                    type="button"
                    onClick={() => toggleSection(group.id)}
                    className="w-full flex items-center justify-between px-2.5 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-600 transition-colors cursor-pointer"
                    aria-expanded={!isGroupCollapsed}
                  >
                    <span>{group.label}</span>
                    <ChevronDown
                      size={12}
                      className={`text-slate-400 transition-transform duration-200 ${
                        isGroupCollapsed ? '-rotate-90' : ''
                      }`}
                    />
                  </button>
                ) : (
                  <div className="h-px bg-slate-100 dark:bg-slate-800 my-2 mx-1" />
                )}

                {/* Group Items */}
                {(!isGroupCollapsed || isCollapsed) && (
                  <div className="space-y-0.5">
                    {permittedItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeModule === item.id;
                      const badge = badgeCounts[item.id];

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            onSelectModule(item.id);
                            if (onCloseMobile) onCloseMobile();
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors group relative cursor-pointer focus-visible:outline-2 focus-visible:outline-[#0a7cb3] ${
                            isActive
                              ? 'bg-[#f0f8fc] dark:bg-blue-950/60 text-[#0a7cb3] dark:text-sky-300 font-semibold'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-normal'
                          }`}
                          title={isCollapsed ? item.label : undefined}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <Icon
                            size={18}
                            className={`shrink-0 transition-colors ${
                              isActive ? 'text-[#0a7cb3] dark:text-sky-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                            }`}
                          />

                          {!isCollapsed && (
                            <span className="truncate flex-1 text-left">{item.label}</span>
                          )}

                          {/* Badge Count for Operational Notifications */}
                          {badge > 0 && (
                            <span
                              className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-mono font-medium ${
                                isActive
                                  ? 'bg-[#0a7cb3] text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              } ${isCollapsed ? 'absolute top-1.5 right-1.5 text-[9px] px-1' : 'ml-auto'}`}
                            >
                              {badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Clearly Visible Back to Website Navigation Link */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1527] shrink-0">
          <button
            type="button"
            onClick={() => {
              if (onViewWebsite) onViewWebsite();
              if (onCloseMobile) onCloseMobile();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-[#0a7cb3] dark:hover:text-sky-300 hover:bg-blue-50/70 dark:hover:bg-blue-950/50 border border-slate-200/90 dark:border-slate-800 transition-all cursor-pointer shadow-2xs group focus-visible:outline-2 focus-visible:outline-[#0a7cb3] ${
              isCollapsed ? 'justify-center px-0' : ''
            }`}
            title="Return to Public Website Homepage"
            aria-label="Back to Website"
          >
            <Globe
              size={18}
              className="text-[#0a7cb3] dark:text-sky-400 shrink-0 group-hover:scale-105 transition-transform"
            />
            {!isCollapsed && (
              <span className="truncate flex-1 text-left">Back to Website</span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
