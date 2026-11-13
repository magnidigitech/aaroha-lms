import React, { useState } from 'react';
import { 
  GraduationCap, BookOpen, CheckCircle2, Play, Clock, Award, 
  ArrowRight, Search, ChevronRight, TrendingUp, Layers, Sparkles
} from 'lucide-react';

export default function StudentPortalView({
  courses = [],
  enrollments = [],
  lessonProgress = [],
  taskSubmissions = [],
  onOpenCourse,
  onExploreCatalog,
  currentUser
}) {
  const [filter, setFilter] = useState('all'); // 'all' | 'in_progress' | 'completed'
  const [searchQuery, setSearchQuery] = useState('');

  // Helper to determine if an enrollment is within its 6-month validity period
  const isEnrollmentWithinSixMonths = (enrollment) => {
    if (!enrollment) return false;
    if (enrollment.status === 'dropped') return false;

    const enrolledTime = enrollment.enrolled_at ? new Date(enrollment.enrolled_at).getTime() : Date.now();
    // 6 calendar months (approx 183 days)
    const sixMonthsMs = 183 * 24 * 60 * 60 * 1000;
    const expiresTime = enrollment.expires_at 
      ? new Date(enrollment.expires_at).getTime() 
      : enrolledTime + sixMonthsMs;

    return Date.now() <= expiresTime;
  };

  // 1. Filter courses where the user has an active or completed enrollment within 6 months.
  // Courses stay on the dashboard for 6 months from enrollment even if completed.
  // The ONLY condition that removes a course within 6 months is if the faculty deletes/removes the course.
  const enrolledCourses = courses.filter(course => {
    // If faculty removed the course, exclude it
    if (course.is_deleted) return false;

    return enrollments.some(e => 
      e.course_id === course.id && 
      (e.status === 'active' || e.status === 'completed') && 
      (currentUser ? e.user_id === currentUser.id : true) &&
      isEnrollmentWithinSixMonths(e)
    );
  });

  // 2. Helper to compute progress, access window, and next lecture for a course
  const getCourseAnalytics = (course) => {
    const allLessons = (course.modules || []).flatMap(m => m.lessons || []);
    const totalLessons = allLessons.length;
    const completedLessonIds = new Set(
      lessonProgress.filter(p => p.is_completed).map(p => p.lesson_id)
    );
    const completedLessons = allLessons.filter(l => completedLessonIds.has(l.id));
    const completedCount = completedLessons.length;
    const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
    
    // Find next uncompleted lesson
    const nextLesson = allLessons.find(l => !completedLessonIds.has(l.id)) || allLessons[0] || null;

    const userEnrollment = enrollments.find(e => 
      e.course_id === course.id && 
      (currentUser ? e.user_id === currentUser.id : true)
    );

    const isEnrCompleted = userEnrollment && userEnrollment.status === 'completed';
    const isCompleted = isEnrCompleted || (totalLessons > 0 && (completedCount >= totalLessons || progressPct >= 100));

    // Calculate remaining days within the 6-month period
    const enrolledTime = userEnrollment?.enrolled_at ? new Date(userEnrollment.enrolled_at).getTime() : Date.now();
    const sixMonthsMs = 183 * 24 * 60 * 60 * 1000;
    const expiresTime = userEnrollment?.expires_at 
      ? new Date(userEnrollment.expires_at).getTime() 
      : enrolledTime + sixMonthsMs;
    const daysRemaining = Math.max(0, Math.ceil((expiresTime - Date.now()) / (24 * 60 * 60 * 1000)));

    return {
      totalLessons,
      completedCount: isCompleted && totalLessons > 0 ? totalLessons : completedCount,
      progressPct: isCompleted ? 100 : progressPct,
      isCompleted,
      nextLesson,
      daysRemaining,
      enrolledAt: userEnrollment?.enrolled_at
    };
  };

  // 3. Filtered list based on tab and search
  const filteredCourses = enrolledCourses.filter(course => {
    const analytics = getCourseAnalytics(course);
    
    // Tab filter
    if (filter === 'in_progress' && analytics.isCompleted) return false;
    if (filter === 'completed' && !analytics.isCompleted) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (course.title || '').toLowerCase().includes(q);
      const matchCat = (course.category || '').toLowerCase().includes(q);
      const matchInst = (course.institution || '').toLowerCase().includes(q);
      return matchTitle || matchCat || matchInst;
    }

    return true;
  });

  // Calculate overall learner stats
  const totalEnrolled = enrolledCourses.length;
  const completedProgramsCount = enrolledCourses.filter(c => getCourseAnalytics(c).isCompleted).length;
  const inProgressProgramsCount = totalEnrolled - completedProgramsCount;
  const totalCompletedLessons = enrolledCourses.reduce((acc, c) => acc + getCourseAnalytics(c).completedCount, 0);

  return (
    <div className="space-y-8 pb-16">
      
      {/* Dashboard Welcome & Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-[#0056D2] px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Learner Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              My Learning
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
              Track your enrolled curricula, monitor completion progress, and resume coursework where you left off.
            </p>
          </div>

          <button
            onClick={onExploreCatalog}
            className="self-start md:self-auto bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-300 flex items-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <BookOpen className="w-4 h-4 text-[#0056D2]" />
            <span>Browse Full Catalog</span>
          </button>
        </div>

        {/* Learner Performance KPI Metric Tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-100">
          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Enrolled Programs</span>
            <div className="text-2xl font-black text-slate-900">{totalEnrolled}</div>
            <span className="text-[11px] text-slate-500">Active Specializations</span>
          </div>

          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">In Progress</span>
            <div className="text-2xl font-black text-[#0056D2]">{inProgressProgramsCount}</div>
            <span className="text-[11px] text-slate-500">Actively Studying</span>
          </div>

          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Completed Lectures</span>
            <div className="text-2xl font-black text-emerald-600">{totalCompletedLessons}</div>
            <span className="text-[11px] text-slate-500">Verified Units Done</span>
          </div>

          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Accreditations</span>
            <div className="text-2xl font-black text-amber-600">{completedProgramsCount}</div>
            <span className="text-[11px] text-slate-500">Certificates Issued</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold self-start">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-white text-[#0056D2] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Programs ({totalEnrolled})
          </button>
          <button
            onClick={() => setFilter('in_progress')}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
              filter === 'in_progress'
                ? 'bg-white text-[#0056D2] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            In Progress ({inProgressProgramsCount})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
              filter === 'completed'
                ? 'bg-white text-[#0056D2] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Completed ({completedProgramsCount})
          </button>
        </div>

        {/* Search Filter */}
        {totalEnrolled > 0 && (
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your courses..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#0056D2] shadow-2xs"
            />
          </div>
        )}
      </div>

      {/* Course Cards Grid */}
      {filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map(course => {
            const analytics = getCourseAnalytics(course);

            return (
              <div
                key={course.id}
                onClick={() => onOpenCourse(course)}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-lg hover:border-slate-300 transition-all duration-200 flex flex-col overflow-hidden group cursor-pointer"
              >
                {/* Course Thumbnail with Category Badge */}
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100 flex-shrink-0">
                  <img
                    src={course.thumbnail_url}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-md border border-slate-700/60 shadow-xs">
                      {course.category || 'Systems Engineering'}
                    </span>
                  </div>
                  {analytics.isCompleted && (
                    <div className="absolute top-3 right-3">
                      <span className="bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1 shadow-md">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Completed</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Course Details & Progress */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold text-slate-500">
                      {course.institution || 'Aaroha Institute of Technology'}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 group-hover:text-[#0056D2] transition-colors leading-snug line-clamp-2">
                      {course.title}
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>
                  </div>

                  {/* Progress Bar & Next Lesson */}
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-600">Progress</span>
                        <span className={`font-bold ${analytics.isCompleted ? 'text-emerald-600' : 'text-[#0056D2]'}`}>
                          {analytics.progressPct}% ({analytics.completedCount}/{analytics.totalLessons})
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            analytics.isCompleted ? 'bg-emerald-600' : 'bg-[#0056D2]'
                          }`}
                          style={{ width: `${analytics.progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* 6-Month Enrollment Access Status */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>6-Month Access</span>
                      </span>
                      <span className="font-semibold text-slate-600">
                        {analytics.daysRemaining > 0 
                          ? `${analytics.daysRemaining} days remaining` 
                          : 'Active'}
                      </span>
                    </div>

                    {/* Next Lesson Box */}
                    {analytics.nextLesson && !analytics.isCompleted && (
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex items-center gap-2.5 text-xs text-slate-700">
                        <div className="w-6 h-6 rounded-lg bg-blue-100 text-[#0056D2] flex items-center justify-center flex-shrink-0">
                          <Play className="w-3 h-3 fill-current" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Next Lesson</div>
                          <div className="font-semibold text-slate-900 truncate text-[11px]">
                            {analytics.nextLesson.title}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenCourse(course);
                      }}
                      className={`w-full text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-98 ${
                        analytics.isCompleted
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-[#0056D2] hover:bg-[#00419e] text-white'
                      }`}
                    >
                      {analytics.isCompleted ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Course Completed</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{analytics.progressPct > 0 ? 'Resume Course' : 'Start Course'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-8 max-w-xl mx-auto space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#0056D2] flex items-center justify-center mx-auto">
            <GraduationCap className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">
              {totalEnrolled === 0 
                ? 'No Enrolled Programs Yet' 
                : 'No Programs Match Your Filter'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
              {totalEnrolled === 0
                ? 'Browse the official Aaroha Academy catalog to enroll in rigorous distributed systems programs and start learning.'
                : 'Try adjusting your search query or switching to another filter tab above.'}
            </p>
          </div>

          <button
            onClick={onExploreCatalog}
            className="inline-flex items-center gap-2 bg-[#0056D2] hover:bg-[#00419e] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span>Explore Course Catalog</span>
          </button>
        </div>
      )}

    </div>
  );
}
