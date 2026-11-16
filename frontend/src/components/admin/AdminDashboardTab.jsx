import React, { useState, useMemo } from 'react';
import {
  Users, Layers, Calendar, Mail, Clock, AlertTriangle, ArrowRight,
  Video, PlusCircle, CheckCircle2, AlertCircle, GraduationCap,
  Briefcase, ShieldCheck, FileCheck, ExternalLink, HelpCircle
} from 'lucide-react';
import { formatDate, formatDateTime } from '../../adminUtils';

export default function AdminDashboardTab({
  stats = {},
  todayClasses = [],
  students = [],
  batches = [],
  faculty = [],
  taskSubmissions = [],
  followups = [],
  placementData = { profiles: [], jobs: [], applications: [] },
  supportData = { tickets: [], feedback: [] },
  auditLogs = [],
  currentUser,
  onNavigateTab,
  onQuickAction
}) {
  const userRole = (currentUser?.role || 'admin').toLowerCase();
  const parts = (currentUser?.full_name || '').trim().split(/\s+/);
  const userName = (parts.length > 1 && ['Dr.', 'Prof.', 'Mr.', 'Ms.', 'Mrs.'].includes(parts[0]))
    ? `${parts[0]} ${parts[1]}`
    : (parts[0] || 'Administrator');

  // Filters for the dashboard
  const [selectedBatchFilter, setSelectedBatchFilter] = useState('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState('today');

  // Filtered classes today based on batch selection
  const filteredTodayClasses = useMemo(() => {
    if (selectedBatchFilter === 'all') return todayClasses;
    return todayClasses.filter(c => String(c.batch_id) === String(selectedBatchFilter));
  }, [todayClasses, selectedBatchFilter]);

  // Students needing attention (attendance < 80% or open follow-ups)
  const studentsNeedingAttention = useMemo(() => {
    if (followups && followups.length > 0) {
      return followups.filter(f => f.status === 'open' || f.status === 'in_progress');
    }
    return [];
  }, [followups]);

  // Pending tasks
  const pendingTasks = useMemo(() => {
    const tasks = [];
    const pendingSubs = (taskSubmissions || []).filter(s => s.status === 'under_review' || s.status === 'submitted');
    if (pendingSubs.length > 0) {
      tasks.push({
        id: 'subs',
        title: `${pendingSubs.length} project submission${pendingSubs.length > 1 ? 's' : ''} awaiting review`,
        targetTab: 'assessments',
        badge: `${pendingSubs.length} pending`,
        priority: 'high'
      });
    }

    const openTickets = (supportData?.tickets || []).filter(t => t.status === 'open');
    if (openTickets.length > 0) {
      tasks.push({
        id: 'tickets',
        title: `${openTickets.length} open support ticket${openTickets.length > 1 ? 's' : ''}`,
        targetTab: 'support',
        badge: `${openTickets.length} open`,
        priority: 'medium'
      });
    }

    const pendingInvitesCount = stats.pending_invitations || students.filter(s => s.account_status === 'invited').length;
    if (pendingInvitesCount > 0) {
      tasks.push({
        id: 'invites',
        title: `${pendingInvitesCount} student invitation${pendingInvitesCount > 1 ? 's' : ''} awaiting activation`,
        targetTab: 'students',
        badge: `${pendingInvitesCount} invited`,
        priority: 'normal'
      });
    }

    return tasks;
  }, [taskSubmissions, supportData, stats, students]);

  // Recent admissions / enrolments
  const recentStudents = useMemo(() => {
    return [...students]
      .sort((a, b) => new Date(b.created_at || b.admission_date || 0) - new Date(a.created_at || a.admission_date || 0))
      .slice(0, 5);
  }, [students]);

  // RENDER ROLE-SPECIFIC VIEWS:
  // 1. Faculty Dashboard
  if (userRole === 'faculty' || userRole === 'instructor') {
    const facultyBatches = batches.filter(b => b.lead_faculty_id === currentUser?.id || b.faculty_id === currentUser?.id);
    const facultySubmissions = (taskSubmissions || []).filter(s => s.status === 'under_review');
    const facultySessionsToday = todayClasses.filter(c => c.faculty_id === currentUser?.id || !c.faculty_id);

    return (
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Faculty Dashboard</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Welcome back, {userName}. Here is your instructional schedule and student review queue for today.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateTab('schedule')}
              className="px-3.5 py-2 rounded-lg bg-[#0a7cb3] hover:bg-[#086491] text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              View Full Schedule
            </button>
          </div>
        </div>

        {/* Faculty Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Today's Classes</span>
              <Calendar size={18} className="text-[#0a7cb3]" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-slate-900">{facultySessionsToday.length}</div>
              <span className="text-xs text-slate-500">Scheduled live lectures</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Assigned Batches</span>
              <Layers size={18} className="text-[#0a7cb3]" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-slate-900">{facultyBatches.length || batches.length}</div>
              <span className="text-xs text-slate-500">Active cohorts taught</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Submissions to Grade</span>
              <FileCheck size={18} className="text-amber-600" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-slate-900">{facultySubmissions.length}</div>
              <span className="text-xs text-slate-500">Awaiting faculty review</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Follow-Up Requests</span>
              <AlertTriangle size={18} className="text-rose-600" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-slate-900">{studentsNeedingAttention.length}</div>
              <span className="text-xs text-slate-500">Attendance or project gaps</span>
            </div>
          </div>
        </div>

        {/* Main Content Area: Classes & Submissions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-xl bg-white border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar size={16} className="text-[#0a7cb3]" />
                Today's Instructional Classes
              </h2>
              <button
                type="button"
                onClick={() => onNavigateTab('schedule')}
                className="text-xs font-semibold text-[#0a7cb3] hover:underline cursor-pointer"
              >
                Calendar
              </button>
            </div>
            <div className="p-4">
              {facultySessionsToday.length === 0 ? (
                <div className="py-8 text-center text-slate-500">
                  <Calendar size={32} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">No live classes assigned for today.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {facultySessionsToday.map(s => (
                    <div key={s.id} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 text-[#0a7cb3] border border-blue-100">
                            {s.batch_code}
                          </span>
                          <span className="text-xs text-slate-500">{s.session_type || 'Lecture'}</span>
                        </div>
                        <h3 className="text-sm font-semibold text-slate-900 mt-1">{s.topic}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Time: {formatDateTime(s.start_time)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {s.meeting_link && (
                          <a
                            href={s.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          >
                            <Video size={14} /> Join
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => onNavigateTab('attendance', { sessionId: s.id })}
                          className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors cursor-pointer"
                        >
                          Mark Attendance
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-white border border-slate-200 shadow-xs p-4 flex flex-col">
            <h2 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
              <FileCheck size={16} className="text-amber-600" />
              Submissions to Grade
            </h2>
            <div className="py-3 flex-1">
              {facultySubmissions.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs">
                  <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-500" />
                  All submissions are graded.
                </div>
              ) : (
                <div className="space-y-2">
                  {facultySubmissions.slice(0, 5).map(sub => (
                    <div
                      key={sub.id}
                      onClick={() => onNavigateTab('assessments')}
                      className="p-2.5 rounded-lg border border-slate-200 hover:border-[#0a7cb3] cursor-pointer transition-colors"
                    >
                      <div className="text-xs font-semibold text-slate-900 truncate">{sub.task_title || 'Project Submission'}</div>
                      <div className="text-[11px] text-slate-500 flex justify-between mt-1">
                        <span>{sub.student_name || 'Student'}</span>
                        <span className="text-amber-600 font-medium">Under Review</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('assessments')}
              className="mt-2 w-full py-2 text-xs font-semibold text-[#0a7cb3] hover:bg-sky-50 rounded-lg text-center transition-colors cursor-pointer"
            >
              Go to Assessment Queue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Placement Officer Dashboard
  if (userRole === 'placement_officer') {
    const readyProfiles = (placementData?.profiles || []).filter(p => p.placement_status === 'ready_for_interviews' || p.placement_status === 'actively_interviewing');
    const pendingReviews = (placementData?.profiles || []).filter(p => p.resume_review_status === 'pending');
    const activeJobs = (placementData?.jobs || []).filter(j => j.status === 'active');
    const placedStudents = (placementData?.profiles || []).filter(p => p.placement_status === 'placed');

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Placement Operations</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Welcome back, {userName}. Track student career readiness, interview schedules, and hiring partner pipelines.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('placement')}
            className="px-3.5 py-2 rounded-lg bg-[#0a7cb3] hover:bg-[#086491] text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Post Job Opening
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
            <span className="text-xs font-medium text-slate-500">Interview Ready</span>
            <div className="text-2xl font-bold text-slate-900 mt-2">{readyProfiles.length}</div>
            <span className="text-xs text-slate-500">Students cleared for interviews</span>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
            <span className="text-xs font-medium text-slate-500">Resumes to Review</span>
            <div className="text-2xl font-bold text-slate-900 mt-2">{pendingReviews.length}</div>
            <span className="text-xs text-amber-600 font-medium">Pending verification</span>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
            <span className="text-xs font-medium text-slate-500">Active Job Openings</span>
            <div className="text-2xl font-bold text-slate-900 mt-2">{activeJobs.length}</div>
            <span className="text-xs text-slate-500">Partner company drives</span>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
            <span className="text-xs font-medium text-slate-500">Confirmed Offers</span>
            <div className="text-2xl font-bold text-slate-900 mt-2">{placedStudents.length}</div>
            <span className="text-xs text-emerald-600 font-medium">Placed students</span>
          </div>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Career Readiness Pipeline</h2>
            <button
              type="button"
              onClick={() => onNavigateTab('placement')}
              className="text-xs font-semibold text-[#0a7cb3] hover:underline cursor-pointer"
            >
              Open Placement Hub
            </button>
          </div>
          <div className="py-4">
            {readyProfiles.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No students currently in the interview pool.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {readyProfiles.slice(0, 5).map(p => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-900">{p.full_name || 'Candidate'}</div>
                      <div className="text-[11px] text-slate-500">{p.target_roles || 'Software Engineer'}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Ready
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. Super Admin & Admin / Coordinator Dashboard (Standard Operations)
  return (
    <div className="space-y-6">
      {/* Top Bar: Dashboard Heading, Greeting, Filters, and Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Welcome back, {userName}. Here is what is happening across Aaroha LMS today.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Batch Selector Filter */}
          <select
            value={selectedBatchFilter}
            onChange={(e) => setSelectedBatchFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-medium focus:border-[#0a7cb3] focus:outline-hidden cursor-pointer"
            aria-label="Filter dashboard by batch"
          >
            <option value="all">All Batches</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>{b.batch_code} ({b.title})</option>
            ))}
          </select>

          {/* Quick Action: Add Student */}
          <button
            type="button"
            onClick={() => onQuickAction ? onQuickAction('onboard_student') : onNavigateTab('students')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0a7cb3] hover:bg-[#086491] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <PlusCircle size={15} />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Active Students */}
        <div
          onClick={() => onNavigateTab('students', { status: 'active' })}
          className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 group-hover:text-slate-700">Active Students</span>
            <div className="p-2 rounded-lg bg-blue-50 text-[#0a7cb3]">
              <Users size={18} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900">
              {stats.active_students ?? students.filter(s => s.account_status === 'active').length}
            </div>
            <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
              <span>Enrolled & attending</span>
              <span className="text-[#0a7cb3] font-medium flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                View <ArrowRight size={12} />
              </span>
            </div>
          </div>
        </div>

        {/* 2. Active Batches */}
        <div
          onClick={() => onNavigateTab('batches')}
          className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 group-hover:text-slate-700">Active Batches</span>
            <div className="p-2 rounded-lg bg-sky-50 text-[#0284c7]">
              <Layers size={18} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900">
              {stats.active_batches ?? batches.filter(b => b.status === 'active' || b.status === 'upcoming').length}
            </div>
            <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
              <span>Running cohorts</span>
              <span className="text-[#0a7cb3] font-medium flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                View <ArrowRight size={12} />
              </span>
            </div>
          </div>
        </div>

        {/* 3. Classes Today */}
        <div
          onClick={() => onNavigateTab('schedule')}
          className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 group-hover:text-slate-700">Classes Today</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <Calendar size={18} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900">
              {filteredTodayClasses.length}
            </div>
            <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
              <span>Scheduled sessions</span>
              <span className="text-[#0a7cb3] font-medium flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                Schedule <ArrowRight size={12} />
              </span>
            </div>
          </div>
        </div>

        {/* 4. Pending Invitations */}
        <div
          onClick={() => onNavigateTab('students', { status: 'invited' })}
          className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 group-hover:text-slate-700">Pending Invitations</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <Mail size={18} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900">
              {stats.pending_invitations ?? students.filter(s => s.account_status === 'invited').length}
            </div>
            <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
              <span>Awaiting activation</span>
              <span className="text-[#0a7cb3] font-medium flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                Inspect <ArrowRight size={12} />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Area: 4 Focused Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: Today's Classes */}
        <div className="rounded-xl bg-white border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-[#0a7cb3]" />
              <h2 className="text-sm font-bold text-slate-900">Today's Classes</h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('schedule')}
              className="text-xs font-semibold text-[#0a7cb3] hover:underline cursor-pointer"
            >
              View Calendar
            </button>
          </div>

          <div className="p-4 flex-1">
            {filteredTodayClasses.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                <Calendar size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-medium">No live classes scheduled for today.</p>
                <button
                  type="button"
                  onClick={() => onQuickAction ? onQuickAction('schedule_class') : onNavigateTab('schedule')}
                  className="mt-2 text-xs font-semibold text-[#0a7cb3] hover:underline cursor-pointer"
                >
                  Schedule Class
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTodayClasses.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 text-[#0a7cb3] border border-blue-100">
                          {item.batch_code}
                        </span>
                        <span className="text-xs text-slate-500">{item.session_type || 'Lecture'}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900">{item.topic}</h3>
                      <div className="text-xs text-slate-500 flex items-center gap-3">
                        <span>Faculty: <strong className="text-slate-700">{item.faculty_name || 'Assigned Instructor'}</strong></span>
                        <span>Time: {formatDateTime(item.start_time)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.meeting_link && (
                        <a
                          href={item.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1 transition-colors"
                        >
                          <Video size={13} /> Join
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => onNavigateTab('attendance', { sessionId: item.id })}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors cursor-pointer"
                      >
                        Attendance
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Panel 2: Students Needing Attention */}
        <div className="rounded-xl bg-white border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600" />
              <h2 className="text-sm font-bold text-slate-900">Students Needing Attention</h2>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              {studentsNeedingAttention.length} Flagged
            </span>
          </div>

          <div className="p-4 flex-1">
            {studentsNeedingAttention.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500" />
                <p className="text-sm font-medium">All students are in good standing.</p>
                <p className="text-xs text-slate-400 mt-0.5">No attendance or progress interventions required.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {studentsNeedingAttention.slice(0, 4).map((f) => (
                  <div
                    key={f.id}
                    onClick={() => onNavigateTab('students', { studentId: f.user_id })}
                    className="p-3 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50/40 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900">{f.student_name || 'Enrolled Student'}</span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 capitalize">
                        {f.reason ? f.reason.replace('_', ' ') : 'Attention Needed'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-1">{f.description}</p>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                      <span>Batch: {f.batch_code || 'Cohort'}</span>
                      <span className="text-[#0a7cb3] font-medium">View Record</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Panel 3: Pending Tasks */}
        <div className="rounded-xl bg-white border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-[#0a7cb3]" />
              <h2 className="text-sm font-bold text-slate-900">Pending Operational Tasks</h2>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              {pendingTasks.length} Pending
            </span>
          </div>

          <div className="p-4 flex-1">
            {pendingTasks.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500" />
                <p className="text-sm font-medium">No pending tasks in queue.</p>
                <p className="text-xs text-slate-400 mt-0.5">All reviews, support requests, and activations are up to date.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => onNavigateTab(task.targetTab)}
                    className="p-3 rounded-lg border border-slate-200 hover:border-slate-300 bg-white cursor-pointer transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-900">{task.title}</div>
                      <span className="text-[11px] text-slate-500 capitalize">Module: {task.targetTab}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {task.badge}
                      </span>
                      <ArrowRight size={14} className="text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Panel 4: Recent Admissions or Enrolments */}
        <div className="rounded-xl bg-white border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap size={16} className="text-[#0a7cb3]" />
              <h2 className="text-sm font-bold text-slate-900">Recent Admissions</h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('students')}
              className="text-xs font-semibold text-[#0a7cb3] hover:underline cursor-pointer"
            >
              All Students
            </button>
          </div>

          <div className="p-4 flex-1">
            {recentStudents.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                <Users size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-medium">No student admissions recorded yet.</p>
                <button
                  type="button"
                  onClick={() => onQuickAction ? onQuickAction('onboard_student') : onNavigateTab('students')}
                  className="mt-2 text-xs font-semibold text-[#0a7cb3] hover:underline cursor-pointer"
                >
                  Onboard Student
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentStudents.map((s) => (
                  <div
                    key={s.user_id || s.id}
                    onClick={() => onNavigateTab('students', { studentId: s.user_id || s.id })}
                    className="py-2.5 flex items-center justify-between hover:bg-slate-50/60 px-2 rounded-lg transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {(s.full_name || 'S')[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900 truncate">{s.full_name}</div>
                        <div className="text-[11px] text-slate-500 truncate">{s.course_title || s.email}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${
                        s.account_status === 'active'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : s.account_status === 'invited'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {s.account_status || 'active'}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {formatDate(s.admission_date || s.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
