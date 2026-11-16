import React, { useState } from 'react';
import { 
  GraduationCap, Users, Calendar, Clock, FileCheck, AlertTriangle,
  Play, Video, ExternalLink, PlusCircle, Layers, CheckCircle2,
  ChevronRight, ArrowRight, MessageSquare, Upload, Award,
  Lock, Globe, FileText, Sparkles, Bell
} from 'lucide-react';
import { formatDateTime } from '../../adminUtils';

export default function FacultyDashboardView({
  dashboardData = {},
  onNavigateTab,
  onOpenAttendance,
  onOpenGrading,
  onOpenMaterialModal,
  onOpenAssignmentModal,
  onOpenAnnouncementModal
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'schedule' | 'batches' | 'pending' | 'content' | 'students'

  const summary = dashboardData.summary_cards || {};
  const teaching = dashboardData.teaching_schedule || {};
  const todayClasses = teaching.today_classes || [];
  const upcomingSessions = teaching.upcoming_sessions || [];
  const batches = dashboardData.batch_overview || [];
  const pending = dashboardData.pending_work || {};
  const unmarkedAttendance = pending.unmarked_attendance || [];
  const pendingSubmissions = pending.submissions_awaiting_review || [];
  const students = dashboardData.student_performance || [];

  // Content & Publishing Streams
  const publishedContent = dashboardData.published_content || [];
  const drafts = dashboardData.drafts || [];
  const publicSubmissionsInReview = dashboardData.public_submissions_in_review || [];
  const scheduledAnnouncements = dashboardData.scheduled_announcements || [];

  return (
    <div className="space-y-8">
      
      {/* 6 Core Faculty Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* Card 1: Assigned Active Batches */}
        <div 
          onClick={() => setActiveTab('batches')}
          className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs hover:border-[#0A7CB3] hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Assigned Batches</span>
            <div className="p-2 rounded-xl bg-blue-50 text-[#0A7CB3] group-hover:scale-110 transition-transform">
              <Layers size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{summary.assigned_batches ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>Active cohorts</span>
            <ChevronRight size={12} className="text-slate-300 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Card 2: Students in Assigned Batches */}
        <div 
          onClick={() => setActiveTab('students')}
          className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs hover:border-indigo-500 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Students</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
              <Users size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{summary.students_in_batches ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>Enrolled learners</span>
            <ChevronRight size={12} className="text-slate-300 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Card 3: Classes Scheduled Today */}
        <div 
          onClick={() => setActiveTab('schedule')}
          className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs hover:border-emerald-500 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Classes Today</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
              <Calendar size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{summary.classes_today ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>Live lectures</span>
            <ChevronRight size={12} className="text-slate-300 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Card 4: Sessions Awaiting Attendance */}
        <div 
          onClick={() => setActiveTab('pending')}
          className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs hover:border-amber-500 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Unmarked Attendance</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform">
              <Clock size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{summary.sessions_awaiting_attendance ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>Completed sessions</span>
            <ChevronRight size={12} className="text-slate-300 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Card 5: Submissions Awaiting Grading */}
        <div 
          onClick={() => setActiveTab('pending')}
          className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs hover:border-purple-500 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Awaiting Review</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600 group-hover:scale-110 transition-transform">
              <FileCheck size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{summary.submissions_awaiting_grading ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>Student deliverables</span>
            <ChevronRight size={12} className="text-slate-300 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Card 6: Upcoming Assessment Deadlines */}
        <div 
          onClick={() => setActiveTab('schedule')}
          className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs hover:border-cyan-500 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Milestone Deadlines</span>
            <div className="p-2 rounded-xl bg-sky-50 text-sky-600 group-hover:scale-110 transition-transform">
              <Award size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{summary.upcoming_deadlines ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>Cohort milestones</span>
            <ChevronRight size={12} className="text-slate-300 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

      </div>

      {/* Faculty Quick Action Bar */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <span>Instructional Actions:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {todayClasses.length > 0 && todayClasses[0].meeting_link && (
            <a
              href={todayClasses[0].meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0A7CB3] hover:bg-[#086491] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Video size={13} />
              Open Live Class
            </a>
          )}
          <button
            onClick={() => onOpenAttendance && onOpenAttendance()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Clock size={13} />
            Mark Attendance
          </button>
          <button
            onClick={() => onOpenMaterialModal && onOpenMaterialModal()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Upload size={13} />
            Upload Materials
          </button>
          <button
            onClick={() => onOpenAssignmentModal && onOpenAssignmentModal()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <PlusCircle size={13} />
            Create Assignment
          </button>
          <button
            onClick={() => onOpenGrading && onOpenGrading()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <FileCheck size={13} />
            Grade Submissions
          </button>
          <button
            onClick={() => onOpenAnnouncementModal && onOpenAnnouncementModal()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <MessageSquare size={13} />
            Batch Announcement
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1 text-xs font-bold text-slate-500">
        {[
          { id: 'overview', label: 'Faculty Overview' },
          { id: 'schedule', label: "Teaching Schedule (" + (todayClasses.length + upcomingSessions.length) + ")" },
          { id: 'batches', label: 'Assigned Batches (' + batches.length + ')' },
          { id: 'pending', label: 'Pending Work Queue (' + (unmarkedAttendance.length + pendingSubmissions.length) + ')' },
          { id: 'students', label: 'Student Performance' }
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

      {/* SECTION 1: TODAY'S & UPCOMING TEACHING SCHEDULE */}
      {(activeTab === 'overview' || activeTab === 'schedule') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Today's & Upcoming Teaching Schedule</h2>
              <p className="text-xs text-slate-500">Direct meeting links, classroom assignments, and session status tracking.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            
            {/* Today's Classes */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-3">
              <div className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Classes Scheduled Today
              </div>

              {todayClasses.length === 0 ? (
                <div className="text-xs text-slate-400 py-6 text-center italic bg-slate-50 rounded-2xl">
                  No live teaching sessions scheduled for today.
                </div>
              ) : (
                <div className="space-y-3">
                  {todayClasses.map(session => (
                    <div key={session.id} className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/60 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-slate-900 leading-snug">{session.topic}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{session.batch_title || session.batch_code} • {session.session_type}</div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-[#0A7CB3]">
                          {session.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                        <span className="text-slate-500">{formatDateTime(session.start_time)}</span>
                        {session.meeting_link && (
                          <a
                            href={session.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[#0A7CB3] font-bold hover:underline"
                          >
                            <Video size={13} />
                            Launch Room
                            <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Sessions */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-3">
              <div className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Calendar size={14} className="text-[#0A7CB3]" />
                Upcoming Cohort Sessions
              </div>

              {upcomingSessions.length === 0 ? (
                <div className="text-xs text-slate-400 py-6 text-center italic bg-slate-50 rounded-2xl">
                  No upcoming sessions on the roster.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {upcomingSessions.map(session => (
                    <div key={session.id} className="p-3 rounded-xl border border-slate-100 flex items-center justify-between text-xs hover:bg-slate-50">
                      <div>
                        <div className="font-bold text-slate-800">{session.topic}</div>
                        <div className="text-[10px] text-slate-400">{session.batch_code} • {formatDateTime(session.start_time)}</div>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500 capitalize">{session.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* SECTION 2: BATCH OVERVIEW */}
      {(activeTab === 'overview' || activeTab === 'batches') && (
        <div className="space-y-4">
          <div className="border-t border-slate-200 pt-6">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Assigned Cohorts & Teaching Progress</h2>
            <p className="text-xs text-slate-500">Curriculum progression, batch attendance rate, and cohort size.</p>
          </div>

          {batches.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center italic text-xs text-slate-400">
              No batches currently assigned. Teaching allocations are administered by Academic Operations.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {batches.map(batch => (
                <div key={batch.batch_id} className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-3 shadow-2xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-mono font-bold text-[#0A7CB3]">{batch.batch_code}</div>
                      <h3 className="text-base font-black text-slate-900">{batch.batch_title}</h3>
                      <div className="text-xs text-slate-500">{batch.course_title}</div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
                      {batch.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Enrolled</div>
                      <div className="text-base font-black text-slate-900">{batch.student_count}</div>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Progress</div>
                      <div className="text-base font-black text-[#0A7CB3]">
                        {batch.teaching_progress_pct !== 'Not available yet' ? (batch.teaching_progress_pct + '%') : 'N/A'}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Attendance</div>
                      <div className="text-base font-black text-emerald-600">
                        {batch.batch_attendance_pct !== 'Not available yet' ? (batch.batch_attendance_pct + '%') : 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 pt-2 flex items-center justify-between">
                    <span>Sessions: {batch.completed_sessions} of {batch.total_sessions} conducted</span>
                    <button
                      type="button"
                      onClick={() => onOpenAttendance && onOpenAttendance(batch.batch_id)}
                      className="text-[#0A7CB3] font-bold hover:underline"
                    >
                      View Attendance
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: PENDING WORK QUEUE */}
      {(activeTab === 'overview' || activeTab === 'pending') && (
        <div className="space-y-4">
          <div className="border-t border-slate-200 pt-6">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Pending Instructional Work Queue</h2>
            <p className="text-xs text-slate-500">Unmarked attendance from past sessions and submissions awaiting review.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            
            {/* Unmarked Attendance Queue */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-3">
              <div className="text-xs font-black uppercase tracking-wider text-amber-700 flex items-center justify-between">
                <span>Sessions Awaiting Attendance</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px]">
                  {unmarkedAttendance.length} Action Needed
                </span>
              </div>

              {unmarkedAttendance.length === 0 ? (
                <div className="text-xs text-emerald-600 bg-emerald-50 p-4 rounded-2xl flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>All completed sessions have attendance marked.</span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {unmarkedAttendance.map(sess => (
                    <div key={sess.id} className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/40 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-900">{sess.topic}</div>
                        <div className="text-[11px] text-slate-500">{sess.batch_code} • {sess.student_count} Students</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenAttendance && onOpenAttendance(sess.id)}
                        className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-2xs"
                      >
                        Mark Now
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submissions Awaiting Grading */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-3">
              <div className="text-xs font-black uppercase tracking-wider text-purple-700 flex items-center justify-between">
                <span>Submissions Awaiting Grading</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px]">
                  {pendingSubmissions.length} In Queue
                </span>
              </div>

              {pendingSubmissions.length === 0 ? (
                <div className="text-xs text-emerald-600 bg-emerald-50 p-4 rounded-2xl flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>Grading queue is clear. No student deliverables awaiting review.</span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {pendingSubmissions.map(sub => (
                    <div key={sub.submission_id} className="p-3.5 rounded-2xl border border-purple-200 bg-purple-50/40 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-900">{sub.task_title}</div>
                        <div className="text-[11px] text-slate-500">{sub.student_name} • {sub.course_title}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenGrading && onOpenGrading(sub.submission_id)}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-2xs"
                      >
                        Grade
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* SECTION 3.5: INSTRUCTIONAL CONTENT & PUBLISHING STREAMS */}
      {(activeTab === 'overview' || activeTab === 'content' || activeTab === 'pending') && (
        <div className="space-y-4">
          <div className="border-t border-slate-200 pt-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Content Publishing & Public Submissions</h2>
              <p className="text-xs text-slate-500">Recently published batch resources, active drafts, and public submissions awaiting admin review.</p>
            </div>
            {onOpenMaterialModal && (
              <button
                type="button"
                onClick={onOpenMaterialModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-2xs"
              >
                <PlusCircle size={14} /> Upload Material
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Column 1: Recently Published Batch Materials */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-3 shadow-2xs">
              <div className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Lock size={13} className="text-purple-600" /> Published Materials</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                  {publishedContent.length} Live
                </span>
              </div>

              {publishedContent.length === 0 ? (
                <div className="text-xs text-slate-400 italic p-3 text-center">No materials published yet.</div>
              ) : (
                <div className="space-y-2">
                  {publishedContent.map(mat => (
                    <div key={mat.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-slate-900 line-clamp-1">{mat.title}</div>
                        <div className="text-[11px] text-slate-500">{mat.course_title} {mat.batch_code ? `• ${mat.batch_code}` : ''}</div>
                        <div className="text-[10px] text-purple-700 font-semibold">{mat.recipient_count || 0} learners enrolled</div>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 shrink-0">
                        Live
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Column 2: Drafts Awaiting Completion */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-3 shadow-2xs">
              <div className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5"><FileText size={13} className="text-amber-600" /> Drafts in Progress</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                  {drafts.length} Drafts
                </span>
              </div>

              {drafts.length === 0 ? (
                <div className="text-xs text-slate-400 italic p-3 text-center">Zero pending drafts.</div>
              ) : (
                <div className="space-y-2">
                  {drafts.map(d => (
                    <div key={d.id} className="p-3 rounded-2xl bg-amber-50/40 border border-amber-200 flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-slate-900 line-clamp-1">{d.title}</div>
                        <div className="text-[11px] text-slate-500">{d.course_title}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 shrink-0">
                        Draft
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Column 3: Public Submissions Awaiting Admin Review */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-3 shadow-2xs">
              <div className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Globe size={13} className="text-blue-600" /> Public In Review</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                  {publicSubmissionsInReview.length} In Review
                </span>
              </div>

              {publicSubmissionsInReview.length === 0 ? (
                <div className="text-xs text-slate-400 italic p-3 text-center">No public submissions currently awaiting review.</div>
              ) : (
                <div className="space-y-2">
                  {publicSubmissionsInReview.map(sub => (
                    <div key={sub.id} className="p-3 rounded-2xl bg-blue-50/40 border border-blue-200 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-xs font-bold text-slate-900 line-clamp-1">{sub.title}</div>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800 shrink-0">
                          Pending Review
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 capitalize">{sub.content_type?.replace('_', ' ')}</div>
                      {sub.review_notes && (
                        <div className="text-[10px] text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200">
                          Feedback: {sub.review_notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Scheduled Announcements Bar */}
          {scheduledAnnouncements.length > 0 && (
            <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-xs text-sky-900">
                <Bell size={16} className="text-sky-600 shrink-0" />
                <div>
                  <strong>{scheduledAnnouncements.length} Scheduled Announcement(s)</strong>: Next release {formatDateTime(scheduledAnnouncements[0].scheduled_at)}
                </div>
              </div>
              <span className="text-xs text-sky-700 font-semibold">{scheduledAnnouncements[0].title}</span>
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: STUDENT ACADEMIC PERFORMANCE (STRICTLY NO FINANCIAL DATA) */}
      {(activeTab === 'overview' || activeTab === 'students') && (
        <div className="space-y-4">
          <div className="border-t border-slate-200 pt-6">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Student Academic Performance</h2>
            <p className="text-xs text-slate-500">Live attendance percentages and evaluated assessment averages for assigned cohorts.</p>
          </div>

          {students.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center italic text-xs text-slate-400">
              No students enrolled in assigned cohorts yet.
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-5 py-3.5">Student</th>
                      <th className="px-5 py-3.5">Identifier</th>
                      <th className="px-5 py-3.5">Cohort</th>
                      <th className="px-5 py-3.5">Attendance</th>
                      <th className="px-5 py-3.5">Average Score</th>
                      <th className="px-5 py-3.5">Certification Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {students.map(st => {
                      const isEligible = (Number(st.attendance_pct) >= 75 || st.attendance_pct === 100) && (Number(st.average_score) >= 70 || st.average_score === 100);

                      return (
                        <tr key={st.student_id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-3.5 font-bold text-slate-900 flex items-center gap-2.5">
                            <img 
                              src={st.student_avatar || '/avatars/3d/memo_13.png'} 
                              alt={st.student_name}
                              className="w-7 h-7 rounded-full object-cover bg-slate-100"
                            />
                            <span>{st.student_name}</span>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-slate-500">{st.student_id_code}</td>
                          <td className="px-5 py-3.5 font-semibold text-slate-600">{st.batch_code}</td>
                          <td className="px-5 py-3.5">
                            <span className={'font-bold ' + 
                              (st.attendance_pct >= 80 ? 'text-emerald-600' : st.attendance_pct !== 'Not available yet' ? 'text-amber-600' : 'text-slate-400')}
                            >
                              {st.attendance_pct !== 'Not available yet' ? (st.attendance_pct + '%') : 'Not available yet'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-bold text-[#0A7CB3]">
                            {st.average_score !== 'Not available yet' ? (st.average_score + ' pts') : 'Not available yet'}
                          </td>
                          <td className="px-5 py-3.5">
                            {isEligible ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-fit">
                                <Award size={11} className="text-emerald-700" />
                                Eligible for Certification
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 w-fit">
                                Coursework in Progress
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
