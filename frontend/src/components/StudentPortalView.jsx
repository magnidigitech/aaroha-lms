import React, { useState } from 'react';
import { Play, FileText, CheckCircle2, Clock, ListTodo, Send, AlertCircle, ArrowLeft, Award, RefreshCw, Check, ExternalLink, ChevronRight } from 'lucide-react';

export default function StudentPortalView({
  courses,
  enrollments,
  lessonProgress,
  taskSubmissions,
  onCompleteLesson,
  onSubmitTask,
  activeCourseId,
  setActiveCourseId
}) {
  const enrolledCourses = courses.filter(c => 
    enrollments.some(e => e.course_id === c.id && e.status === 'active')
  );

  const selectedCourse = courses.find(c => c.id === activeCourseId) || enrolledCourses[0] || null;

  const [activeItem, setActiveItem] = useState(() => {
    if (selectedCourse?.modules?.[0]?.lessons?.[0]) {
      return { type: 'lesson', data: selectedCourse.modules[0].lessons[0] };
    }
    return null;
  });

  const [submissionText, setSubmissionText] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (enrolledCourses.length === 0) {
    return (
      <div className="text-center py-24 bg-white rounded-3xl border border-slate-200 shadow-xs p-8 max-w-xl mx-auto space-y-4">
        <Award className="w-16 h-16 text-[#0056D2] mx-auto opacity-70" />
        <h3 className="text-xl font-bold text-slate-900">No Active Enrollments</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Browse the Course Catalog to enroll in an executive program and begin your coursework.
        </p>
      </div>
    );
  }

  const calculateCourseProgress = (course) => {
    if (!course || !course.modules) return 0;
    const allLessonIds = course.modules.flatMap(m => m.lessons?.map(l => l.id) || []);
    if (allLessonIds.length === 0) return 0;
    const completedCount = allLessonIds.filter(id => 
      lessonProgress.some(p => p.lesson_id === id && p.is_completed)
    ).length;
    return Math.round((completedCount / allLessonIds.length) * 100);
  };

  const handleTaskSubmit = (e) => {
    e.preventDefault();
    if (!submissionText.trim() && !attachmentUrl.trim()) return;

    setIsSubmitting(true);
    onSubmitTask({
      taskId: activeItem.data.id,
      submissionText: submissionText,
      attachmentUrl: attachmentUrl
    });

    setSubmissionText('');
    setAttachmentUrl('');
    setIsSubmitting(false);
  };

  const getTaskSubmission = (taskId) => {
    return taskSubmissions.find(s => s.task_id === taskId);
  };

  const isLessonCompleted = (lessonId) => {
    return lessonProgress.some(p => p.lesson_id === lessonId && p.is_completed);
  };

  const progressPct = calculateCourseProgress(selectedCourse);

  return (
    <div className="space-y-6 pb-24">
      {/* Coursera Classroom Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
            <span className="text-[#0056D2] font-bold">My Learning</span>
            <span>/</span>
            <span className="text-slate-800">{selectedCourse?.category}</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">
            {selectedCourse?.title}
          </h1>
          <p className="text-xs text-slate-500">
            {selectedCourse?.institution || 'Aaroha Institute of Technology'} · {selectedCourse?.instructor?.name}
          </p>
        </div>

        {/* Course Switcher & Coursera Progress Bar */}
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 w-full md:w-auto">
          {enrolledCourses.length > 1 && (
            <select
              value={selectedCourse?.id || ''}
              onChange={(e) => {
                const cId = parseInt(e.target.value);
                setActiveCourseId(cId);
                const found = courses.find(c => c.id === cId);
                if (found?.modules?.[0]?.lessons?.[0]) {
                  setActiveItem({ type: 'lesson', data: found.modules[0].lessons[0] });
                }
              }}
              className="px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0056D2]"
            >
              {enrolledCourses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          )}

          <div className="text-right whitespace-nowrap w-full sm:w-auto">
            <div className="text-xs font-bold text-slate-800 flex items-center justify-between sm:justify-end gap-2">
              <span>Course Progress</span>
              <span className="text-[#0056D2]">{progressPct}%</span>
            </div>
            <div className="w-full sm:w-36 bg-slate-100 rounded-full h-2 mt-1.5 overflow-hidden">
              <div
                className="bg-[#0056D2] h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Learning Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Coursera Syllabus Sidebar */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Course Content</span>
              <h3 className="text-xs font-bold text-slate-100 line-clamp-1">{selectedCourse?.title}</h3>
            </div>
            <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
              {selectedCourse?.modules?.length || 0} Modules
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[720px] overflow-y-auto">
            {selectedCourse?.modules?.map((mod, modIdx) => (
              <div key={mod.id} className="p-3 bg-slate-50/40">
                <div className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-[#0056D2] text-white text-[10px] flex items-center justify-center font-bold">
                    {modIdx + 1}
                  </span>
                  <span className="line-clamp-1">{mod.title.replace(/^Module \d+:\s*/, '')}</span>
                </div>

                <div className="space-y-1">
                  {/* Lectures */}
                  {mod.lessons?.map(lesson => {
                    const completed = isLessonCompleted(lesson.id);
                    const isSelected = activeItem?.type === 'lesson' && activeItem.data.id === lesson.id;

                    return (
                      <button
                        key={lesson.id}
                        onClick={() => setActiveItem({ type: 'lesson', data: lesson })}
                        className={'w-full p-2.5 rounded-lg text-left text-xs transition-all flex items-center justify-between ' +
                          (isSelected
                            ? 'bg-blue-50 text-[#0056D2] font-bold border border-blue-200 shadow-2xs'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-100')}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          {lesson.content_type === 'video' ? (
                            <Play className={'w-3.5 h-3.5 flex-shrink-0 ' + (isSelected ? 'text-[#0056D2]' : 'text-slate-400')} />
                          ) : (
                            <FileText className={'w-3.5 h-3.5 flex-shrink-0 ' + (isSelected ? 'text-[#0056D2]' : 'text-slate-400')} />
                          )}
                          <span className="truncate">{lesson.title}</span>
                        </div>

                        {completed && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 ml-1.5" />
                        )}
                      </button>
                    );
                  })}

                  {/* Tasks */}
                  {mod.tasks?.map(task => {
                    const submission = getTaskSubmission(task.id);
                    const isSelected = activeItem?.type === 'task' && activeItem.data.id === task.id;

                    let badgeColor = 'bg-slate-100 text-slate-700';
                    let statusLabel = 'Pending';

                    if (submission) {
                      if (submission.status === 'passed') {
                        badgeColor = 'bg-emerald-100 text-emerald-800';
                        statusLabel = `Passed (${submission.score} pts)`;
                      } else if (submission.status === 'under_review') {
                        badgeColor = 'bg-amber-100 text-amber-800';
                        statusLabel = 'Under Review';
                      } else if (submission.status === 'resubmit_required') {
                        badgeColor = 'bg-rose-100 text-rose-800';
                        statusLabel = 'Revision Required';
                      }
                    }

                    return (
                      <button
                        key={task.id}
                        onClick={() => setActiveItem({ type: 'task', data: task })}
                        className={'w-full p-2.5 rounded-lg text-left text-xs transition-all flex items-center justify-between border ' +
                          (isSelected
                            ? 'bg-[#0056D2] text-white font-bold border-[#0056D2] shadow-xs'
                            : 'bg-blue-50/50 hover:bg-blue-50 text-blue-950 border-blue-200/80')}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <ListTodo className={'w-3.5 h-3.5 flex-shrink-0 ' + (isSelected ? 'text-white' : 'text-[#0056D2]')} />
                          <span className="truncate">{task.title}</span>
                        </div>

                        <span className={'text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap ml-1.5 ' + 
                          (isSelected ? 'bg-blue-800 text-white' : badgeColor)}>
                          {statusLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Active Panel (Coursera Classroom Main View) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 sm:p-8 space-y-6">
          {activeItem?.type === 'lesson' ? (
            /* Lecture View */
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-bold text-[#0056D2] uppercase tracking-wider">
                    {activeItem.data.content_type === 'video' ? 'Video Lecture' : 'Reading Material'} · {activeItem.data.duration}
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
                    {activeItem.data.title}
                  </h2>
                </div>

                {isLessonCompleted(activeItem.data.id) ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-md border border-emerald-200 self-start sm:self-auto">
                    <Check className="w-4 h-4 text-emerald-600" />
                    Completed
                  </span>
                ) : (
                  <button
                    onClick={() => onCompleteLesson(activeItem.data.id)}
                    className="px-4 py-2 bg-[#0056D2] hover:bg-[#00419e] text-white text-xs font-bold rounded-md shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Mark as Completed
                  </button>
                )}
              </div>

              {/* Video Player */}
              {activeItem.data.content_type === 'video' && activeItem.data.media_url ? (
                <div className="relative pt-[56.25%] rounded-2xl overflow-hidden bg-black shadow-md">
                  <iframe
                    src={activeItem.data.media_url}
                    title={activeItem.data.title}
                    className="absolute inset-0 w-full h-full border-0"
                    allowFullScreen
                  />
                </div>
              ) : null}

              {/* Lecture Notes & Study Guide */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-sm font-bold text-slate-900">Lecture Summary & Technical Notes</h4>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  {activeItem.data.content_body}
                </p>
              </div>
            </div>
          ) : activeItem?.type === 'task' ? (
            /* Evaluated Task Workspace */
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-blue-50 text-[#0056D2] text-[10px] font-bold rounded uppercase">
                      Graded Assignment
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">
                      Threshold: {activeItem.data.passing_score}/{activeItem.data.max_score} pts
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
                    {activeItem.data.title}
                  </h2>
                </div>

                {(() => {
                  const sub = getTaskSubmission(activeItem.data.id);
                  if (!sub) return null;
                  if (sub.status === 'passed') {
                    return (
                      <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-md border border-emerald-200 flex items-center gap-1.5 self-start sm:self-auto">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Passed with {sub.score} / {activeItem.data.max_score} pts
                      </span>
                    );
                  }
                  if (sub.status === 'under_review') {
                    return (
                      <span className="px-3 py-1.5 bg-amber-50 text-amber-800 text-xs font-bold rounded-md border border-amber-200 flex items-center gap-1.5 self-start sm:self-auto">
                        <RefreshCw className="w-4 h-4 text-amber-600 animate-spin" />
                        Under Faculty Review
                      </span>
                    );
                  }
                  if (sub.status === 'resubmit_required') {
                    return (
                      <span className="px-3 py-1.5 bg-rose-50 text-rose-800 text-xs font-bold rounded-md border border-rose-200 flex items-center gap-1.5 self-start sm:self-auto">
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        Revision Required ({sub.score} pts)
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Rubric */}
              <div className="p-4 bg-blue-50/50 border border-blue-200/80 rounded-2xl space-y-2">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <ListTodo className="w-4 h-4 text-[#0056D2]" />
                  Deliverable Instructions & Evaluation Rubric
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {activeItem.data.instructions}
                </p>
              </div>

              {/* Recorded Submission */}
              {(() => {
                const sub = getTaskSubmission(activeItem.data.id);
                if (!sub) return null;

                return (
                  <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-2xs">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Your Submitted Deliverable
                    </h4>
                    <p className="text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200 whitespace-pre-wrap leading-relaxed">
                      {sub.submission_text || 'No written response provided.'}
                    </p>
                    {sub.attachment_url && (
                      <div className="text-xs flex items-center gap-1.5 text-[#0056D2] font-semibold">
                        <ExternalLink className="w-3.5 h-3.5" />
                        <a href={sub.attachment_url} target="_blank" rel="noreferrer" className="underline">
                          View Technical Artifact / Repository Link
                        </a>
                      </div>
                    )}

                    {sub.feedback && (
                      <div className="p-4 bg-slate-900 text-white rounded-xl space-y-1 mt-2">
                        <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">
                          Faculty Evaluation Remarks:
                        </span>
                        <p className="text-xs text-slate-200 italic">
                          "{sub.feedback}"
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Submission Form */}
              {(() => {
                const sub = getTaskSubmission(activeItem.data.id);
                const canSubmit = !sub || sub.status === 'resubmit_required';

                if (!canSubmit) {
                  return (
                    <div className="text-xs text-slate-500 italic p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      Submission is locked pending faculty review or has achieved a passing grade.
                    </div>
                  );
                }

                return (
                  <form onSubmit={handleTaskSubmit} className="space-y-4 pt-2">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Submit Your Work for Faculty Grading
                    </h4>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Technical Response / Architectural RFC:
                      </label>
                      <textarea
                        rows={6}
                        required
                        value={submissionText}
                        onChange={(e) => setSubmissionText(e.target.value)}
                        placeholder="Detail your engineering decisions, system configurations, and benchmark analysis..."
                        className="w-full p-3.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0056D2] focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Artifact / Repository Link (Optional):
                      </label>
                      <input
                        type="url"
                        value={attachmentUrl}
                        onChange={(e) => setAttachmentUrl(e.target.value)}
                        placeholder="https://github.com/org/repo or https://aaroha-inc.com/artifacts/rfc.pdf"
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0056D2] focus:bg-white"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 bg-[#0056D2] hover:bg-[#00419e] text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>{sub ? 'Resubmit Revised Deliverable' : 'Submit for Faculty Grading'}</span>
                    </button>
                  </form>
                );
              })()}
            </div>
          ) : (
            <div className="text-center py-24 text-slate-400 text-xs">
              Select a lecture or deliverable from the syllabus on the left to begin.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
