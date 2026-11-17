import React, { useState, useMemo } from 'react';
import { 
  BookOpen, CheckCircle2, Clock, Calendar, Award, 
  Briefcase, Video, FileText, ChevronRight, AlertCircle, AlertTriangle, Lock, ArrowRight,
  ExternalLink, Download, Search, Filter, HelpCircle, UserCheck, Play
} from 'lucide-react';
import { formatDateTime, formatDate } from '../../adminUtils';

export default function StudentDashboardView({
  dashboardData = {},
  onOpenCourse,
  onContinueLearning,
  onOpenClassroom,
  onOpenProfile,
  onOpenTicketModal,
  onExploreCatalog
}) {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'courses' | 'schedule' | 'performance' | 'certificates' | 'placement'
  const [courseFilter, setCourseFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const summary = dashboardData.summary_cards || {};
  const myCourses = dashboardData.my_courses || [];
  const expiredCourses = dashboardData.expired_courses || [];
  const todayUpcoming = dashboardData.today_and_upcoming || {};
  const nextClass = todayUpcoming.next_live_class;
  const upcomingClasses = todayUpcoming.upcoming_classes || [];
  const upcomingDeadlines = todayUpcoming.upcoming_deadlines || [];
  const recentMaterials = todayUpcoming.recent_materials || [];
  const performance = dashboardData.performance || {};
  const attSummary = performance.attendance_summary || {};
  const publishedScores = performance.published_scores || [];
  const creds = dashboardData.certificates_and_credentials || dashboardData.fees_and_certificates || {};
  const certificates = creds.certificates || [];
  const placement = dashboardData.placement_readiness || {};
  const placementProfile = placement.profile;
  const jobApplications = placement.job_applications || [];
  const notifications = dashboardData.recent_notifications || [];

  // Filtered courses
  const filteredCourses = useMemo(() => {
    return myCourses.filter(c => {
      if (courseFilter === 'in_progress' && c.progress_percentage >= 100) return false;
      if (courseFilter === 'completed' && c.progress_percentage < 100) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (c.course_title || '').toLowerCase().includes(q) || (c.batch_code || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [myCourses, courseFilter, searchQuery]);

  return (
    <div className="space-y-8">

      {/* 6 Core Student Summary Cards (Clickable Drill-downs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* Card 1: Active Enrolled Courses */}
        <div 
          onClick={() => setActiveTab('courses')}
          className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs hover:border-[#0A7CB3] hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Enrolled Courses</span>
            <div className="p-2 rounded-xl bg-blue-50 text-[#0A7CB3] group-hover:scale-110 transition-transform">
              <BookOpen size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{summary.active_courses ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>Active learning programs</span>
            <ChevronRight size={12} className="text-slate-300 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Card 2: Course Completion % */}
        <div 
          onClick={() => setActiveTab('performance')}
          className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs hover:border-emerald-500 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Completion</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {summary.course_completion_pct !== 'Not available yet' && summary.course_completion_pct !== null && summary.course_completion_pct !== undefined
              ? (summary.course_completion_pct + '%')
              : 'Not available yet'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>Overall curriculum items</span>
            <ChevronRight size={12} className="text-slate-300 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Card 3: Attendance % */}
        <div 
          onClick={() => setActiveTab('performance')}
          className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs hover:border-indigo-500 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Attendance</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
              <UserCheck size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {summary.attendance_pct !== 'Not available yet' && summary.attendance_pct !== null && summary.attendance_pct !== undefined
              ? (summary.attendance_pct + '%')
              : 'Not available yet'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>Live sessions record</span>
            <ChevronRight size={12} className="text-slate-300 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Card 4: Assignments Awaiting Submission */}
        <div 
          onClick={() => setActiveTab('performance')}
          className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs hover:border-amber-500 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Due Tasks</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform">
              <Clock size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{summary.assignments_awaiting_submission ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>Awaiting submission</span>
            <ChevronRight size={12} className="text-slate-300 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Card 5: Upcoming Assessments */}
        <div 
          onClick={() => setActiveTab('schedule')}
          className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs hover:border-purple-500 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Assessments</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600 group-hover:scale-110 transition-transform">
              <Award size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{summary.upcoming_assessments ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>Scheduled milestones</span>
            <ChevronRight size={12} className="text-slate-300 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Card 6: Certificates & Verified Credentials */}
        <div 
          onClick={() => setActiveTab('certificates')}
          className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs hover:border-purple-500 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Certificates</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600 group-hover:scale-110 transition-transform">
              <Award size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {summary.earned_certificates ?? certificates.length ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>Issued credentials</span>
            <ChevronRight size={12} className="text-slate-300 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

      </div>

      {/* Student Quick Action Bar */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <span>Quick Launch:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {myCourses.length > 0 && (
            <button
              onClick={() => onOpenCourse && onOpenCourse(myCourses[0].course_id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0A7CB3] hover:bg-[#086491] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Play size={13} />
              Continue Learning
            </button>
          )}
          <button
            onClick={() => setActiveTab('schedule')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Calendar size={13} />
            View Schedule
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <FileText size={13} />
            Submit Assignment
          </button>
          <button
            onClick={() => setActiveTab('certificates')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Award size={13} />
            View Certificates
          </button>
          <button
            onClick={() => onOpenTicketModal && onOpenTicketModal()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <HelpCircle size={13} />
            Raise Support Ticket
          </button>
        </div>
      </div>

      {/* Live Class Alert Banner (When Meeting Available) */}
      {nextClass && (
        <div className="bg-gradient-to-r from-blue-900 to-[#0A7CB3] rounded-3xl p-5 sm:p-7 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-white/20 text-white backdrop-blur-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {nextClass.is_live_now ? 'Live Class In Progress' : 'Upcoming Live Session'}
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                {nextClass.topic}
              </h2>
              <p className="text-xs text-blue-100 flex flex-wrap items-center gap-3">
                <span>Cohort: {nextClass.batch_title || nextClass.batch_code}</span>
                <span>•</span>
                <span>Faculty: {nextClass.faculty_name}</span>
                <span>•</span>
                <span>Time: {formatDateTime(nextClass.start_time)}</span>
              </p>
            </div>

            {nextClass.meeting_link ? (
              <a
                href={nextClass.meeting_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white hover:bg-blue-50 text-[#0A7CB3] font-bold text-xs sm:text-sm shadow-md transition-all self-start md:self-auto cursor-pointer"
              >
                <Video size={16} />
                Join Class Session
                <ExternalLink size={14} />
              </a>
            ) : (
              <span className="text-xs text-blue-200 italic self-start md:self-auto">
                Classroom venue / link will activate prior to session
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1 text-xs font-bold text-slate-500">
        {[
          { id: 'all', label: 'Dashboard Overview' },
          { id: 'courses', label: 'My Enrolled Courses (' + myCourses.length + ')' },
          { id: 'schedule', label: 'Schedule & Live Classes' },
          { id: 'performance', label: 'Academic Performance' },
          { id: 'certificates', label: 'Digital Certificates (' + certificates.length + ')' },
          { id: 'placement', label: 'Placement Readiness' },
          { id: 'expired', label: 'Expired Courses (' + expiredCourses.length + ')' }
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

      {/* SECTION 1: MY COURSES */}
      {(activeTab === 'all' || activeTab === 'courses') && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">My Courses & Cohorts</h2>
              <p className="text-xs text-slate-500">Active institutional enrollments and learning progressions.</p>
            </div>

            {/* Filter and Search */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter courses..."
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#0A7CB3]/30"
                />
              </div>
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none"
              >
                <option value="all">All Enrolled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {filteredCourses.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-3">
              <BookOpen size={36} className="mx-auto text-slate-300" />
              <div className="text-sm font-bold text-slate-800">No enrolled programs found</div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                You do not have any active course enrollments matching this filter. Explore accredited specializations in our catalog.
              </p>
              {onExploreCatalog && (
                <button
                  type="button"
                  onClick={onExploreCatalog}
                  className="px-4 py-2 rounded-xl bg-[#0A7CB3] text-white text-xs font-bold hover:bg-[#086491] transition-colors cursor-pointer"
                >
                  Explore Course Catalog
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredCourses.map(course => (
                <div 
                  key={course.course_id}
                  className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs hover:shadow-xs transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 mb-1">
                          Cohort: {course.batch_code}
                        </div>
                        <h3 className="text-base font-black text-slate-900 tracking-tight leading-snug">
                          {course.course_title}
                        </h3>
                      </div>
                      {course.thumbnail_url && (
                        <img 
                          src={course.thumbnail_url} 
                          alt={course.course_title}
                          className="w-16 h-12 object-cover rounded-xl shrink-0 border border-slate-200"
                        />
                      )}
                    </div>

                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                      <span>Faculty: <strong className="text-slate-700">{course.faculty_name}</strong></span>
                      <span>•</span>
                      <span>Dates: {course.start_date} to {course.expected_end_date}</span>
                    </div>

                    {/* Progress Bar & Next Lesson */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                        <span>Progress: {course.completed_lessons} of {course.total_lessons} lessons</span>
                        <span className="font-bold text-[#0A7CB3]">{course.progress_percentage}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-[#0A7CB3] h-2 rounded-full transition-all duration-500" 
                          style={{ width: (course.progress_percentage + '%') }}
                        />
                      </div>
                    </div>

                    {/* Course Access Window Indicator */}
                    {course.expires_at && (
                      <div className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 flex-wrap ${
                        course.is_expiring_soon
                          ? 'bg-amber-50 border-amber-200 text-amber-900'
                          : 'bg-slate-50 border-slate-100 text-slate-700'
                      }`}>
                        <div className="flex items-center gap-1.5">
                          {course.is_expiring_soon ? (
                            <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                          ) : (
                            <Clock size={14} className="text-slate-400 shrink-0" />
                          )}
                          <span className="text-[11px]">
                            Access Duration: <strong>{course.access_duration_applied || 'Standard'}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 ml-auto">
                          {course.is_expiring_soon ? (
                            <span className="font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md text-[10.5px] uppercase tracking-wide flex items-center gap-1">
                              Expiring Soon • {course.remaining_days}d left
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500">
                              Expires: <strong>{course.expires_at_formatted || formatDate(course.expires_at)}</strong> ({course.remaining_days}d left)
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="text-xs bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between">
                      <div className="truncate mr-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Up Next</span>
                        <span className="font-semibold text-slate-700 text-xs truncate block">{course.next_lesson_title}</span>
                      </div>
                      <span className="shrink-0 text-[11px] text-[#0A7CB3] font-bold">Resume</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Status: <strong className="capitalize text-slate-700">{course.status}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenCourse && onOpenCourse(course.course_id)}
                      className="px-4 py-2 rounded-xl bg-[#0A7CB3] hover:bg-[#086491] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                      <span>Continue Learning</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION: EXPIRED COURSES (READ-ONLY HISTORY) */}
      {(activeTab === 'all' || activeTab === 'expired') && expiredCourses.length > 0 && (
        <div className="space-y-4">
          <div className="border-t border-slate-200 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200">
                  <Lock size={15} />
                </div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">Expired Courses (Read-Only History)</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Programs where your access duration has ended. Protected playback and submissions are locked, but your learning records, grades, and certificates remain intact.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 self-start sm:self-auto">
              {expiredCourses.length} Archived {expiredCourses.length === 1 ? 'Program' : 'Programs'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {expiredCourses.map(course => (
              <div
                key={course.course_id}
                className="bg-white rounded-3xl border border-rose-200/80 p-5 sm:p-6 shadow-2xs space-y-4 flex flex-col justify-between opacity-95"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 mb-1">
                        <Lock size={10} /> Access Expired • {course.batch_code || 'Cohort'}
                      </div>
                      <h3 className="text-base font-black text-slate-900 tracking-tight leading-snug">
                        {course.course_title}
                      </h3>
                    </div>
                    {course.thumbnail_url && (
                      <img
                        src={course.thumbnail_url}
                        alt={course.course_title}
                        className="w-16 h-12 object-cover rounded-xl shrink-0 border border-slate-200 grayscale-30"
                      />
                    )}
                  </div>

                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                    <span>Enrolled: <strong>{formatDate(course.enrolled_at)}</strong></span>
                    <span>•</span>
                    <span>Expired On: <strong className="text-rose-700">{course.expires_at_formatted || formatDate(course.expires_at)}</strong></span>
                  </div>

                  {/* Final Progress & Status */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                      <span>Final Progress: {course.completed_lessons_count || 0} of {course.total_lessons_count || 0} lessons</span>
                      <span className="font-bold text-slate-700">{course.progress_percentage || 0}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-slate-400 h-2 rounded-full"
                        style={{ width: `${course.progress_percentage || 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                    <div className="font-semibold text-slate-800 flex items-center gap-1">
                      <CheckCircle2 size={13} className="text-emerald-600" />
                      <span>Permanent Academic Record Preserved</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Evaluated defense solutions, attendance logs, and earned completion credentials are preserved in your portfolio.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-rose-600 flex items-center gap-1">
                    <Lock size={12} /> Playback Locked
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenCourse && onOpenCourse(course.course_id)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>View Record Summary</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: SCHEDULE & UPCOMING */}
      {(activeTab === 'all' || activeTab === 'schedule') && (
        <div className="space-y-4">
          <div className="border-t border-slate-200 pt-6">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Today and Upcoming Schedule</h2>
            <p className="text-xs text-slate-500">Live lecture meetings, assignment submissions, and newly published learning materials.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            
            {/* Upcoming Sessions List */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-3">
              <div className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-2">
                <Calendar size={14} className="text-[#0A7CB3]" />
                Scheduled Live Sessions
              </div>

              {upcomingClasses.length === 0 ? (
                <div className="text-xs text-slate-500 py-6 text-center italic bg-slate-50 rounded-2xl">
                  No upcoming live classes scheduled at this time.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {upcomingClasses.map((s, idx) => (
                    <div 
                      key={s.id || idx}
                      className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-slate-900 leading-snug">{s.topic}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2">
                          <span>{s.batch_code}</span>
                          <span>•</span>
                          <span>{formatDateTime(s.start_time)}</span>
                        </div>
                      </div>
                      {s.meeting_link ? (
                        <a 
                          href={s.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-blue-50 text-[#0A7CB3] border border-blue-200 text-xs font-bold flex items-center gap-1 shrink-0"
                        >
                          <Video size={12} />
                          Join
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Scheduled</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Deadlines & Recent Materials */}
            <div className="space-y-5">
              
              {/* Deliverable Deadlines */}
              <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-3">
                <div className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Clock size={14} className="text-amber-500" />
                  Upcoming Assessment & Project Deadlines
                </div>

                {upcomingDeadlines.length === 0 ? (
                  <div className="text-xs text-slate-500 py-4 text-center italic bg-slate-50 rounded-2xl">
                    All currently assigned deliverables are submitted.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {upcomingDeadlines.map((d, idx) => (
                      <div key={d.task_id || idx} className="p-3 rounded-2xl bg-amber-50/50 border border-amber-200/60 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-slate-900">{d.task_title}</div>
                          <div className="text-[11px] text-slate-500">{d.course_title} • Max Score: {d.max_score}</div>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                          Pending
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Newly Published Materials */}
              <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-3">
                <div className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <FileText size={14} className="text-emerald-500" />
                  Recent Study Resources & Recordings
                </div>

                {recentMaterials.length === 0 ? (
                  <div className="text-xs text-slate-500 py-4 text-center italic bg-slate-50 rounded-2xl">
                    No new learning materials published in the last 7 days.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentMaterials.map((m, idx) => (
                      <div key={m.id || idx} className="p-2.5 rounded-xl border border-slate-100 flex items-center justify-between hover:bg-slate-50">
                        <div className="truncate mr-2">
                          <div className="text-xs font-bold text-slate-800 truncate">{m.title}</div>
                          <div className="text-[10px] text-slate-400">{m.course_title}</div>
                        </div>
                        {m.file_url && (
                          <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-400 hover:text-[#0A7CB3]">
                            <Download size={14} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* SECTION 3: PERFORMANCE & ATTENDANCE */}
      {(activeTab === 'all' || activeTab === 'performance') && (
        <div className="space-y-4">
          <div className="border-t border-slate-200 pt-6">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Academic Performance & Deliverables</h2>
            <p className="text-xs text-slate-500">Live attendance verification and faculty assessment feedback.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            
            {/* Attendance Summary */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-3">
              <div className="text-xs font-black uppercase tracking-wider text-slate-400">Attendance Breakdown</div>
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Total Live Sessions:</span>
                  <span className="font-bold text-slate-900">{attSummary.total_marked ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Present:</span>
                  <span className="font-bold text-emerald-600">{attSummary.present_count ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Late:</span>
                  <span className="font-bold text-amber-600">{attSummary.late_count ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Absent:</span>
                  <span className="font-bold text-rose-600">{attSummary.absent_count ?? 0}</span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-800">Overall Attendance Rate:</span>
                  <span className="text-[#0A7CB3]">{attSummary.attendance_pct !== 'Not available yet' ? (attSummary.attendance_pct + '%') : 'Not available yet'}</span>
                </div>
              </div>
            </div>

            {/* Published Assessment Results */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-3">
              <div className="text-xs font-black uppercase tracking-wider text-slate-400">Published Assessment Scores & Feedback</div>
              
              {publishedScores.length === 0 ? (
                <div className="text-xs text-slate-500 py-8 text-center italic bg-slate-50 rounded-2xl">
                  No published assessment scores available yet. Scores will appear once faculty grades your submissions.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {publishedScores.map((scoreItem, idx) => (
                    <div key={scoreItem.task_id || idx} className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/70 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-slate-900">{scoreItem.task_title}</div>
                        <span className="text-xs font-black text-emerald-600">
                          {scoreItem.score} / {scoreItem.max_score}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center justify-between">
                        <span>{scoreItem.course_title}</span>
                        <span className="capitalize text-slate-600 font-semibold">{scoreItem.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* SECTION 4: DIGITAL CERTIFICATES & CREDENTIALS */}
      {(activeTab === 'all' || activeTab === 'certificates') && (
        <div className="space-y-4">
          <div className="border-t border-slate-200 pt-6">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Accredited Digital Certificates & Credentials</h2>
            <p className="text-xs text-slate-500">Official institutional certifications and performance-verified credentials.</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Award size={16} className="text-purple-600" />
                Issued Credentials Vault
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {certificates.length + ' credential' + (certificates.length === 1 ? '' : 's') + ' awarded'}
              </span>
            </div>

            {certificates.length === 0 ? (
              <div className="bg-slate-50 rounded-2xl p-8 text-center space-y-3">
                <Award size={36} className="mx-auto text-slate-300" />
                <div className="text-sm font-bold text-slate-700">No Certificates Issued Yet</div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Certificates are officially conferred by institutional administration upon completing coursework requirements and submitting evaluated academic deliverables.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {certificates.map((cert, idx) => (
                  <div key={cert.certificate_code || idx} className="p-5 rounded-2xl border border-purple-200 bg-purple-50/40 space-y-3 shadow-2xs hover:shadow-xs transition-shadow">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-purple-900">{cert.course_title}</div>
                        <div className="text-[11px] font-mono text-purple-700 mt-0.5">Credential Code: {cert.certificate_code}</div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-200 text-purple-900 shrink-0">
                        {cert.grade || 'Verified'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 flex items-center justify-between pt-2 border-t border-purple-100/80">
                      <span>Conferred by: <strong className="text-slate-700">{cert.issuer_name || 'Academic Administration'}</strong></span>
                      <span>{formatDate(cert.issued_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 5: PLACEMENT READINESS */}
      {(activeTab === 'all' || activeTab === 'placement') && placementProfile && (
        <div className="space-y-4">
          <div className="border-t border-slate-200 pt-6">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Placement & Career Readiness</h2>
            <p className="text-xs text-slate-500">Resume review status, mock interview evaluations, and corporate job applications.</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Readiness Score</span>
                <div className="text-3xl font-black text-slate-900 mt-0.5">
                  {placementProfile.readiness_score || 0} / 100
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ' + 
                  (placementProfile.resume_review_status === 'approved' 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-amber-50 text-amber-700 border border-amber-200')}
                >
                  Resume: {placementProfile.resume_review_status || 'Pending Review'}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-[#0A7CB3] border border-blue-200">
                  Status: {placementProfile.placement_status || 'Training'}
                </span>
              </div>
            </div>

            {/* Job Applications */}
            <div className="space-y-3">
              <div className="text-xs font-black uppercase tracking-wider text-slate-400">Corporate Job Applications</div>
              {jobApplications.length === 0 ? (
                <div className="text-xs text-slate-500 italic py-4 bg-slate-50 rounded-xl text-center">
                  No active job applications submitted. Job opportunities will appear once resume review is approved.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {jobApplications.map((app, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/60 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-slate-900">{app.job_title}</div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white border border-slate-200 text-slate-700">
                          {app.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">{app.company_name} • {app.location}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
