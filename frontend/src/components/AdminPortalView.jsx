import React, { useState } from 'react';
import { Shield, Plus, BookOpen, Layers, ListTodo, CheckCircle2, Clock, Eye, AlertCircle, Edit3, ArrowRight } from 'lucide-react';

export default function AdminPortalView({
  courses,
  taskSubmissions,
  onAddCourse,
  onAddModule,
  onAddLesson,
  onAddTask,
  onGradeSubmission
}) {
  const [activeTab, setActiveTab] = useState('courses'); // 'courses' | 'grading'

  // Modal states
  const [isNewCourseOpen, setIsNewCourseOpen] = useState(false);
  const [isNewModuleOpen, setIsNewModuleOpen] = useState(false);
  const [isNewLessonOpen, setIsNewLessonOpen] = useState(false);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [selectedCourseForModule, setSelectedCourseForModule] = useState(null);
  const [selectedModuleForContent, setSelectedModuleForContent] = useState(null);

  // Grading modal
  const [gradingModalSubmission, setGradingModalSubmission] = useState(null);
  const [gradeScore, setGradeScore] = useState('');
  const [gradeStatus, setGradeStatus] = useState('passed');
  const [gradeFeedback, setGradeFeedback] = useState('');

  // Domain & Duration custom toggles
  const [isCustomDomain, setIsCustomDomain] = useState(false);
  const [isCustomDuration, setIsCustomDuration] = useState(false);

  const availableDomains = Array.from(new Set([
    'Cloud Architecture',
    'Applied AI',
    'Cybersecurity',
    'Distributed Systems',
    'Data Engineering',
    'DevOps & SRE',
    ...courses.map(c => c.category).filter(Boolean)
  ]));

  // Forms
  const [courseForm, setCourseForm] = useState({
    title: '',
    slug: '',
    description: '',
    category: 'Cloud Architecture',
    level: 'Advanced Level',
    duration: '8 Weeks',
    thumbnail_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    is_published: true
  });

  const [moduleTitle, setModuleTitle] = useState('');

  const [lessonForm, setLessonForm] = useState({
    title: '',
    content_type: 'video',
    media_url: '',
    content_body: '',
    duration: '20 min',
    is_free_preview: false
  });

  const [taskForm, setTaskForm] = useState({
    title: '',
    instructions: '',
    task_type: 'text_response',
    max_score: 100,
    passing_score: 75
  });

  const pendingSubmissions = taskSubmissions.filter(s => s.status === 'under_review');
  const gradedSubmissions = taskSubmissions.filter(s => s.status !== 'under_review');

  const handleCreateCourse = (e) => {
    e.preventDefault();
    if (!courseForm.title.trim()) return;

    onAddCourse({
      ...courseForm,
      category: courseForm.category.trim() || 'General Engineering',
      duration: courseForm.duration.trim() || '8 Weeks',
      level: courseForm.level || 'Advanced Level',
      slug: courseForm.slug || courseForm.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    });

    setCourseForm({
      title: '',
      slug: '',
      description: '',
      category: 'Cloud Architecture',
      level: 'Advanced Level',
      duration: '8 Weeks',
      thumbnail_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
      is_published: true
    });
    setIsCustomDomain(false);
    setIsCustomDuration(false);
    setIsNewCourseOpen(false);
  };

  const handleCreateModule = (e) => {
    e.preventDefault();
    if (!moduleTitle.trim() || !selectedCourseForModule) return;

    onAddModule(selectedCourseForModule.id, moduleTitle);
    setModuleTitle('');
    setIsNewModuleOpen(false);
  };

  const handleCreateLesson = (e) => {
    e.preventDefault();
    if (!lessonForm.title.trim() || !selectedModuleForContent) return;

    onAddLesson(selectedModuleForContent.course_id, selectedModuleForContent.id, lessonForm);
    setLessonForm({
      title: '',
      content_type: 'video',
      media_url: '',
      content_body: '',
      duration: '20 min',
      is_free_preview: false
    });
    setIsNewLessonOpen(false);
  };

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!taskForm.title.trim() || !selectedModuleForContent) return;

    onAddTask(selectedModuleForContent.course_id, selectedModuleForContent.id, taskForm);
    setTaskForm({
      title: '',
      instructions: '',
      task_type: 'text_response',
      max_score: 100,
      passing_score: 75
    });
    setIsNewTaskOpen(false);
  };

  const handleSaveGrade = (e) => {
    e.preventDefault();
    if (!gradingModalSubmission) return;

    onGradeSubmission({
      submissionId: gradingModalSubmission.id,
      score: parseInt(gradeScore) || 0,
      status: gradeStatus,
      feedback: gradeFeedback
    });

    setGradingModalSubmission(null);
    setGradeScore('');
    setGradeFeedback('');
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Faculty Console Header */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xs border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <Shield className="w-4 h-4 text-indigo-400" />
            <span>Faculty & Curriculum Directorate</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-1 text-white">Curriculum Management & Evaluation</h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
            Publish executive engineering programs, structure lectures and project deliverables, and review student technical defenses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-800 px-5 py-3 rounded-2xl border border-slate-700 text-center">
            <span className="text-2xl font-black text-white">{courses.length}</span>
            <p className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">Active Programs</p>
          </div>
          <div className="bg-amber-500/20 px-5 py-3 rounded-2xl border border-amber-500/30 text-center">
            <span className="text-2xl font-black text-amber-400">{pendingSubmissions.length}</span>
            <p className="text-[10px] uppercase font-bold text-amber-300 mt-0.5">Pending Review</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('courses')}
          className={'px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ' +
            (activeTab === 'courses' ? 'bg-[#0056D2] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100')}
        >
          <BookOpen className="w-4 h-4" />
          <span>Curriculum Directory</span>
        </button>

        <button
          onClick={() => setActiveTab('grading')}
          className={'px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ' +
            (activeTab === 'grading' ? 'bg-[#0056D2] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100')}
        >
          <ListTodo className="w-4 h-4" />
          <span>Evaluation Queue</span>
          {pendingSubmissions.length > 0 && (
            <span className="bg-amber-400 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
              {pendingSubmissions.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: CURRICULUM DIRECTORY */}
      {activeTab === 'courses' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Program Catalog</h2>
              <p className="text-xs text-slate-500">Configure modules, lectures, and project rubrics</p>
            </div>
            <button
              onClick={() => setIsNewCourseOpen(true)}
              className="px-4 py-2 bg-[#0056D2] hover:bg-[#00419e] text-white text-xs font-bold rounded-md shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Program</span>
            </button>
          </div>

          <div className="space-y-4">
            {courses.map(course => (
              <div
                key={course.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
              >
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center gap-4">
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-xs"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{course.title}</h3>
                        <span className={'text-[10px] font-bold px-2 py-0.5 rounded-md ' +
                          (course.is_published ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700')}>
                          {course.is_published ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{course.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedCourseForModule(course);
                        setIsNewModuleOpen(true);
                      }}
                      className="px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Module
                    </button>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {course.modules?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No modules created yet. Click "Add Module" to start structuring curriculum.</p>
                  ) : (
                    course.modules?.map((mod, modIdx) => (
                      <div key={mod.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                        <div className="px-4 py-2.5 bg-slate-100/70 flex items-center justify-between text-xs font-bold text-slate-800 border-b border-slate-200">
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded bg-slate-900 text-white text-[9px] flex items-center justify-center font-bold">
                              {modIdx + 1}
                            </span>
                            <span>{mod.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedModuleForContent({ course_id: course.id, id: mod.id });
                                setIsNewLessonOpen(true);
                              }}
                              className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-[11px] font-semibold rounded-md flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3 text-indigo-600" />
                              Add Lecture
                            </button>
                            <button
                              onClick={() => {
                                setSelectedModuleForContent({ course_id: course.id, id: mod.id });
                                setIsNewTaskOpen(true);
                              }}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 text-[11px] font-semibold rounded-md flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3 text-indigo-600" />
                              Add Project
                            </button>
                          </div>
                        </div>

                        <div className="p-3 divide-y divide-slate-100 space-y-2">
                          {mod.lessons?.map(l => (
                            <div key={l.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs text-slate-700">
                              <div className="flex items-center gap-2">
                                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                                <span className="font-medium text-slate-800">{l.title}</span>
                                <span className="text-[10px] text-slate-400">({l.content_type} • {l.duration})</span>
                              </div>
                              {l.is_free_preview && (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded border border-emerald-200">
                                  Free Preview
                                </span>
                              )}
                            </div>
                          ))}

                          {mod.tasks?.map(t => (
                            <div key={t.id} className="pt-2 flex items-center justify-between text-xs text-indigo-950 bg-indigo-50/40 p-2 rounded-lg">
                              <div className="flex items-center gap-2">
                                <ListTodo className="w-3.5 h-3.5 text-indigo-600" />
                                <span className="font-bold">{t.title}</span>
                              </div>
                              <span className="text-[11px] font-semibold text-indigo-800">
                                Threshold: {t.passing_score}/{t.max_score} pts
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: EVALUATION QUEUE */}
      {activeTab === 'grading' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Student Deliverable Evaluation</h2>
            <p className="text-xs text-slate-500">Review submitted technical defenses, grade artifacts, and issue faculty remarks</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Awaiting Evaluation ({pendingSubmissions.length})
              </span>
              <span className="text-xs text-slate-400">Action Required</span>
            </div>

            {pendingSubmissions.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-500">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                All student project deliverables have been reviewed and evaluated.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingSubmissions.map(sub => (
                  <div key={sub.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{sub.student_name}</span>
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">
                          Under Faculty Review
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium">Assignment #{sub.task_id}</p>
                      <p className="text-xs text-slate-500 line-clamp-2 max-w-xl italic">
                        "{sub.submission_text}"
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setGradingModalSubmission(sub);
                        setGradeScore(90);
                        setGradeStatus('passed');
                        setGradeFeedback('Rigorous implementation meeting enterprise production standards.');
                      }}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-center"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Evaluate Deliverable
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Completed Evaluations ({gradedSubmissions.length})
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {gradedSubmissions.map(sub => (
                <div key={sub.id} className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{sub.student_name}</span>
                    <p className="text-[11px] text-slate-500 italic mt-0.5">Faculty Remarks: "{sub.feedback}"</p>
                  </div>
                  <div className="text-right">
                    <span className={'px-2.5 py-1 rounded text-[11px] font-bold ' +
                      (sub.status === 'passed' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800')}>
                      {sub.status.toUpperCase()} ({sub.score} / 100 PTS)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Create Program */}
      {isNewCourseOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Create New Executive Program</h3>
            <form onSubmit={handleCreateCourse} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Program Title:</label>
                <input
                  type="text"
                  required
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  placeholder="Enter program title"
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700">Domain / Category:</label>
                  {!isCustomDomain ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomDomain(true);
                        setCourseForm({ ...courseForm, category: '' });
                      }}
                      className="text-[11px] font-bold text-[#0056D2] hover:underline"
                    >
                      + Add New Domain
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomDomain(false);
                        setCourseForm({ ...courseForm, category: availableDomains[0] || 'Cloud Architecture' });
                      }}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                    >
                      Choose Existing
                    </button>
                  )}
                </div>

                {!isCustomDomain ? (
                  <select
                    value={courseForm.category}
                    onChange={(e) => {
                      if (e.target.value === '__add_new__') {
                        setIsCustomDomain(true);
                        setCourseForm({ ...courseForm, category: '' });
                      } else {
                        setCourseForm({ ...courseForm, category: e.target.value });
                      }
                    }}
                    className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0056D2] focus:bg-white"
                  >
                    {availableDomains.map(domain => (
                      <option key={domain} value={domain}>{domain}</option>
                    ))}
                    <option value="__add_new__">+ Add New Domain / Category...</option>
                  </select>
                ) : (
                  <div className="mt-1 flex gap-2">
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="Enter new domain (e.g. Data Engineering, DevOps, Blockchain...)"
                      value={courseForm.category}
                      onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}
                      className="flex-1 p-2.5 bg-white border border-[#0056D2] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0056D2]"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="font-semibold text-slate-700">Executive Summary:</label>
                <textarea
                  rows={3}
                  required
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  placeholder="Enter program description, syllabus outcomes, and prerequisites..."
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0056D2] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Target Level:</label>
                  <select
                    value={courseForm.level}
                    onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value })}
                    className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0056D2] focus:bg-white"
                  >
                    <option value="Beginner Level">Beginner Level</option>
                    <option value="Intermediate Level">Intermediate Level</option>
                    <option value="Advanced Level">Advanced Level</option>
                    <option value="Comprehensive (All Levels)">Comprehensive (All Levels)</option>
                    <option value="Executive Level">Executive Level</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-700">Duration:</label>
                    {isCustomDuration && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomDuration(false);
                          setCourseForm({ ...courseForm, duration: '8 Weeks' });
                        }}
                        className="text-[10px] text-slate-500 hover:text-slate-800"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  {!isCustomDuration ? (
                    <select
                      value={courseForm.duration}
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          setIsCustomDuration(true);
                          setCourseForm({ ...courseForm, duration: '' });
                        } else {
                          setCourseForm({ ...courseForm, duration: e.target.value });
                        }
                      }}
                      className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0056D2] focus:bg-white"
                    >
                      <option value="4 Weeks">4 Weeks</option>
                      <option value="6 Weeks">6 Weeks</option>
                      <option value="8 Weeks">8 Weeks</option>
                      <option value="10 Weeks">10 Weeks</option>
                      <option value="12 Weeks">12 Weeks</option>
                      <option value="16 Weeks">16 Weeks</option>
                      <option value="Self-Paced (1–3 Months)">Self-Paced (1–3 Months)</option>
                      <option value="Self-Paced (3–6 Months)">Self-Paced (3–6 Months)</option>
                      <option value="__custom__">Custom Duration...</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="e.g. 5 Weeks, 6 Months"
                      value={courseForm.duration}
                      onChange={(e) => setCourseForm({ ...courseForm, duration: e.target.value })}
                      className="w-full mt-1 p-2.5 bg-white border border-[#0056D2] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0056D2]"
                    />
                  )}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewCourseOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#0056D2] hover:bg-[#00419e] text-white font-bold rounded-xl shadow-xs transition-colors"
                >
                  Publish Program
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Module */}
      {isNewModuleOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Add Module: {selectedCourseForModule?.title}
            </h3>
            <form onSubmit={handleCreateModule} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Module Title:</label>
                <input
                  type="text"
                  required
                  value={moduleTitle}
                  onChange={(e) => setModuleTitle(e.target.value)}
                  placeholder="Enter module title"
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewModuleOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl"
                >
                  Save Module
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Add Lesson */}
      {isNewLessonOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Add Curriculum Lecture</h3>
            <form onSubmit={handleCreateLesson} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Lecture Title:</label>
                <input
                  type="text"
                  required
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                  placeholder="Enter lecture title"
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Format:</label>
                  <select
                    value={lessonForm.content_type}
                    onChange={(e) => setLessonForm({ ...lessonForm, content_type: e.target.value })}
                    className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="video">Video Lecture</option>
                    <option value="article">Technical Reading</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Duration:</label>
                  <input
                    type="text"
                    value={lessonForm.duration}
                    onChange={(e) => setLessonForm({ ...lessonForm, duration: e.target.value })}
                    placeholder="Duration (e.g. 25 min)"
                    className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {lessonForm.content_type === 'video' && (
                <div>
                  <label className="font-semibold text-slate-700">Video URL (HLS / MP4 Stream):</label>
                  <input
                    type="url"
                    value={lessonForm.media_url}
                    onChange={(e) => setLessonForm({ ...lessonForm, media_url: e.target.value })}
                    placeholder="https://video.aaroha-inc.com/lectures/stream-id"
                    className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700">Technical Foundation Notes:</label>
                <textarea
                  rows={4}
                  required
                  value={lessonForm.content_body}
                  onChange={(e) => setLessonForm({ ...lessonForm, content_body: e.target.value })}
                  placeholder="Enter technical lecture notes, reference architecture, and documentation..."
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="preview"
                  checked={lessonForm.is_free_preview}
                  onChange={(e) => setLessonForm({ ...lessonForm, is_free_preview: e.target.checked })}
                  className="rounded text-slate-900"
                />
                <label htmlFor="preview" className="font-semibold text-slate-700">
                  Enable Free Preview Access for prospective applicants
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewLessonOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl"
                >
                  Save Lecture
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Add Task */}
      {isNewTaskOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Add Evaluated Project Deliverable</h3>
            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Project Title:</label>
                <input
                  type="text"
                  required
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="Enter deliverable title"
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Passing Score (out of 100):</label>
                  <input
                    type="number"
                    value={taskForm.passing_score}
                    onChange={(e) => setTaskForm({ ...taskForm, passing_score: parseInt(e.target.value) || 75 })}
                    className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Deliverable Format:</label>
                  <select
                    value={taskForm.task_type}
                    onChange={(e) => setTaskForm({ ...taskForm, task_type: e.target.value })}
                    className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="text_response">Technical Defense Document</option>
                    <option value="file_upload">Repository / Benchmark Artifact</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Rubric & Instructions:</label>
                <textarea
                  rows={4}
                  required
                  value={taskForm.instructions}
                  onChange={(e) => setTaskForm({ ...taskForm, instructions: e.target.value })}
                  placeholder="Specify evaluation criteria, expected benchmarks, and submission requirements..."
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewTaskOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl"
                >
                  Save Deliverable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Grade Submission */}
      {gradingModalSubmission && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Evaluate Deliverable: {gradingModalSubmission.student_name}
            </h3>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
              <span className="font-bold text-slate-900">Student Technical Submission:</span>
              <p className="whitespace-pre-wrap text-slate-700 leading-relaxed">{gradingModalSubmission.submission_text}</p>
              {gradingModalSubmission.attachment_url && (
                <p className="text-indigo-600 font-semibold pt-1">
                  Artifact: <a href={gradingModalSubmission.attachment_url} target="_blank" rel="noreferrer" className="underline">{gradingModalSubmission.attachment_url}</a>
                </p>
              )}
            </div>

            <form onSubmit={handleSaveGrade} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Score Awarded (out of 100):</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={gradeScore}
                    onChange={(e) => setGradeScore(e.target.value)}
                    className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Evaluation Outcome:</label>
                  <select
                    value={gradeStatus}
                    onChange={(e) => setGradeStatus(e.target.value)}
                    className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="passed">Passed (Satisfies Enterprise Criteria)</option>
                    <option value="resubmit_required">Revision Required (Gaps Identified)</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Faculty Feedback & Remarks:</label>
                <textarea
                  rows={3}
                  required
                  value={gradeFeedback}
                  onChange={(e) => setGradeFeedback(e.target.value)}
                  placeholder="Enter faculty evaluation feedback and remarks..."
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setGradingModalSubmission(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl"
                >
                  Record Faculty Evaluation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
