import React, { useState } from 'react';
import { 
  Users, GraduationCap, Layers, Calendar, Mail, Clock, 
  AlertTriangle, CheckCircle2, ArrowRight, UserPlus, 
  PlusCircle, MessageSquare, ShieldAlert, ChevronRight, Filter
} from 'lucide-react';
import { formatDateTime, formatDate } from '../../adminUtils';

export default function CoordinatorDashboardView({
  dashboardData = {},
  onNavigateTab,
  onQuickAction
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'attention' | 'batches' | 'academic'

  const summary = dashboardData.summary_cards || {};
  const operational = dashboardData.operational_overview || {};
  const todaySchedule = operational.today_schedule || [];
  const batches = operational.batches || [];
  const attentionList = dashboardData.student_attention_list || [];
  const academic = dashboardData.academic_monitoring || {};

  return (
    <div className="space-y-8">
      
      {/* 6 Core Operational Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* Card 1: Active Students & Faculty */}
        <div 
          onClick={() => onNavigateTab && onNavigateTab('students')}
          className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs hover:border-[#0A7CB3] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Students & Faculty</span>
            <div className="p-2 rounded-xl bg-blue-50 text-[#0A7CB3]">
              <Users size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {(summary.active_students ?? 0) + ' / ' + (summary.active_faculty ?? 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Active learners vs faculty</div>
        </div>

        {/* Card 2: Active & Upcoming Batches */}
        <div 
          onClick={() => onNavigateTab && onNavigateTab('batches')}
          className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs hover:border-cyan-500 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Batches</span>
            <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
              <Layers size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {(summary.active_batches ?? 0) + ' / ' + (summary.upcoming_batches ?? 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Active vs upcoming cohorts</div>
        </div>

        {/* Card 3: New Admissions */}
        <div 
          onClick={() => onNavigateTab && onNavigateTab('students')}
          className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs hover:border-emerald-500 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">New Admissions</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <UserPlus size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700">{summary.new_admissions ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">Last 30 days intake</div>
        </div>

        {/* Card 4: Pending Account Invitations */}
        <div 
          onClick={() => onNavigateTab && onNavigateTab('students')}
          className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs hover:border-amber-500 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pending Invites</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Mail size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700">{summary.pending_invitations ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">Awaiting activation</div>
        </div>

        {/* Card 5: Students Awaiting Batch */}
        <div 
          onClick={() => onNavigateTab && onNavigateTab('batches')}
          className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs hover:border-purple-500 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Unassigned</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Clock size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-700">{summary.students_awaiting_batch ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">Awaiting cohort allocation</div>
        </div>

        {/* Card 6: Classes Scheduled Today */}
        <div 
          onClick={() => onNavigateTab && onNavigateTab('schedule')}
          className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs hover:border-emerald-500 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Classes Today</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Calendar size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{summary.classes_today ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">Live classroom sessions</div>
        </div>

      </div>

      {/* Admin Quick Action Bar */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <span>Admissions & Operations:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onQuickAction && onQuickAction('onboard_student')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0A7CB3] hover:bg-[#086491] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus size={13} />
            Add Student
          </button>
          <button
            onClick={() => onQuickAction && onQuickAction('create_batch')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Layers size={13} />
            Create Batch
          </button>
          <button
            onClick={() => onQuickAction && onQuickAction('schedule_session')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Calendar size={13} />
            Schedule Class
          </button>
          <button
            onClick={() => onNavigateTab && onNavigateTab('announcements')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <MessageSquare size={13} />
            Send Announcement
          </button>
          <button
            onClick={() => onNavigateTab && onNavigateTab('followups')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <AlertTriangle size={13} />
            Assign Follow-Up
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1 text-xs font-bold text-slate-500">
        {[
          { id: 'overview', label: 'Operational Overview' },
          { id: 'attention', label: 'Student Attention List (' + attentionList.length + ')' },
          { id: 'batches', label: 'Cohort Capacity & Rosters' },
          { id: 'academic', label: 'Academic Monitoring' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={'px-3.5 py-2.5 rounded-t-xl transition-all whitespace-nowrap cursor-pointer ' + 
              (activeTab === tab.id 
                ? 'text-[#0A7CB3] border-b-2 border-[#0A7CB3] bg-blue-50/40' 
                : 'hover:text-slate-800 hover:bg-slate-50')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SECTION 1: OPERATIONAL OVERVIEW */}
      {(activeTab === 'overview' || activeTab === 'schedule') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          
          {/* Today's Schedule */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Today's Class Schedule</h3>
              <span className="text-xs font-bold text-[#0A7CB3]">{todaySchedule.length} Sessions</span>
            </div>

            {todaySchedule.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center italic bg-slate-50 rounded-2xl">
                No classes scheduled today across any cohort.
              </div>
            ) : (
              <div className="space-y-2.5">
                {todaySchedule.map(s => (
                  <div key={s.id} className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/60 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{s.topic}</div>
                      <div className="text-[11px] text-slate-500">{s.batch_code} • Faculty: {s.faculty_name}</div>
                    </div>
                    <span className="text-xs font-mono font-semibold text-slate-600">
                      {formatDateTime(s.start_time).split(',')[1] || s.start_time}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Batches Overview */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Cohort Enrollment & Capacity</h3>
              <span className="text-xs font-bold text-slate-600">{batches.length} Cohorts</span>
            </div>

            <div className="space-y-2.5">
              {batches.slice(0, 5).map(b => {
                const isNearCapacity = b.capacity > 0 && (b.enrolled_count / b.capacity) >= 0.8;
                return (
                  <div key={b.id} className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/60 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{b.title} ({b.batch_code})</div>
                      <div className="text-[11px] text-slate-500">Starts: {b.start_date} • Mode: {b.delivery_mode}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-slate-800">{b.enrolled_count} / {b.capacity}</div>
                      {isNearCapacity && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded-full">
                          Near Capacity
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* SECTION 2: STUDENT ATTENTION LIST */}
      {(activeTab === 'overview' || activeTab === 'attention') && (
        <div className="space-y-4">
          <div className="border-t border-slate-200 pt-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Student Success & Attention List</h2>
              <p className="text-xs text-slate-500">Active follow-ups for low attendance, missing submissions, and incomplete onboarding.</p>
            </div>
            <button
              onClick={() => onNavigateTab && onNavigateTab('followups')}
              className="text-xs font-bold text-[#0A7CB3] hover:underline"
            >
              View Full Follow-Up Board
            </button>
          </div>

          {attentionList.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center italic text-xs text-emerald-600">
              No critical student follow-ups open at this time.
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-5 py-3.5">Student</th>
                      <th className="px-5 py-3.5">Reason</th>
                      <th className="px-5 py-3.5">Assigned Staff</th>
                      <th className="px-5 py-3.5">Priority</th>
                      <th className="px-5 py-3.5">Next Follow-Up</th>
                      <th className="px-5 py-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {attentionList.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-slate-900">{item.student_name}</td>
                        <td className="px-5 py-3.5 font-semibold text-slate-700 capitalize">
                          {item.reason ? item.reason.replace(/_/g, ' ') : 'Academic Alert'}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">{item.assigned_staff_name || 'Unassigned'}</td>
                        <td className="px-5 py-3.5">
                          <span className={'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ' + 
                            (item.priority === 'urgent' || item.priority === 'high' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700')}
                          >
                            {item.priority}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500">{formatDate(item.next_followup_date)}</td>
                        <td className="px-5 py-3.5 font-bold capitalize text-slate-800">{item.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: ACADEMIC MONITORING */}
      {(activeTab === 'academic') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-2">
            <h3 className="text-sm font-black text-slate-900">Assessments Awaiting Grading</h3>
            <div className="text-3xl font-black text-purple-700">{academic.assessments_awaiting_grading ?? 0}</div>
            <p className="text-xs text-slate-500">Student submissions awaiting faculty review across all courses.</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-2">
            <h3 className="text-sm font-black text-slate-900">Sessions with Missing Attendance</h3>
            <div className="text-3xl font-black text-amber-600">{academic.sessions_missing_attendance ?? 0}</div>
            <p className="text-xs text-slate-500">Conducted class sessions awaiting faculty attendance mark.</p>
          </div>
        </div>
      )}

    </div>
  );
}
