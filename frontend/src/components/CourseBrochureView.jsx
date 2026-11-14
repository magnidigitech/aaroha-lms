import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Play, Lock, ArrowRight, BookOpen, 
  ListTodo, Star, Award, Globe, Calendar, ChevronDown, ChevronUp, CheckCircle2
} from 'lucide-react';
import aarohaLogo from '../assets/aaroha_logo.webp';

export default function CourseBrochureView({ 
  course, 
  onBack, 
  onEnroll, 
  isEnrolled, 
  onOpenClassroom,
  currentUser 
}) {
  const [activeTab, setActiveTab] = useState('syllabus'); // 'about' | 'outcomes' | 'syllabus' | 'instructors'
  const [expandedModules, setExpandedModules] = useState(() => {
    // Expand the first module by default
    return { 0: true };
  });

  useEffect(() => {
    if (course?.modules && course.modules.length > 0) {
      setExpandedModules(prev => {
        if (!prev || Object.keys(prev).length === 0) {
          return { 0: true };
        }
        return prev;
      });
    }
  }, [course?.id, course?.modules?.length]);

  if (!course) return null;

  const totalLessons = course.modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0;
  const totalTasks = course.modules?.reduce((acc, m) => acc + (m.tasks?.length || 0), 0) || 0;

  const toggleModule = (index) => {
    setExpandedModules(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <div className="space-y-10 pb-32 font-sans">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 font-bold text-[#0056D2] hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Catalog</span>
          <span className="text-slate-400">/</span>
          <span>{course.category}</span>
          <span className="text-slate-400">/</span>
          <span className="text-slate-800 font-semibold truncate max-w-xs">{course.title}</span>
        </button>

        <div className="hidden sm:flex items-center gap-2">
          <span className="px-2.5 py-1 bg-blue-50 text-[#0056D2] font-bold rounded text-[11px] border border-blue-100">
            {course.partner_type || 'Specialization'}
          </span>
        </div>
      </div>

      {/* Course Landing Hero Banner */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-3xl p-8 sm:p-12 border border-slate-800 shadow-md relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          <div className="lg:col-span-8 space-y-4">
            {/* Official Partner Badge */}
            <div className="flex items-center gap-3">
              <div className="inline-flex bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-xs items-center">
                <img
                  src={aarohaLogo}
                  alt="Aaroha Technologies"
                  className="h-6 sm:h-7 w-auto object-contain"
                />
              </div>
              <span className="text-xs font-bold text-slate-300 tracking-wide pl-3 border-l border-slate-700">
                {course.institution_subtitle || 'Systems Engineering Laboratory'}
              </span>
            </div>

            {/* Course Title */}
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {course.title}
            </h1>

            {/* Description */}
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
              {course.description}
            </p>

            {/* Ratings & Learner Proof */}
            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-300 font-medium">
              <div className="flex items-center gap-1 text-amber-400 font-bold">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-white text-sm">{course.rating || '4.9'}</span>
                <span className="text-slate-400 font-normal">({course.reviews_count || '2,840'} reviews)</span>
              </div>
              <span>·</span>
              <span className="text-emerald-400 font-semibold">98% positive reviews</span>
              <span>·</span>
              <span className="text-slate-300">{course.enrolled_count ? course.enrolled_count.toLocaleString() : '14,820'} enrolled</span>
            </div>

            {/* Instructor Line */}
            {course.instructor && (
              <div className="pt-2 flex items-center gap-3">
                <img
                  src={course.instructor.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                  alt={course.instructor.name}
                  onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'; }}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500/40"
                />
                <div className="text-xs">
                  <div className="text-slate-400">Taught by</div>
                  <div className="font-bold text-white text-sm">{course.instructor.name}</div>
                </div>
              </div>
            )}
          </div>

          {/* Right Action Card (Floating Enrollment Box) */}
          <div className="lg:col-span-4 bg-white text-slate-900 rounded-2xl p-6 sm:p-7 shadow-2xl space-y-5 border border-slate-100">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {isEnrolled ? 'Enrolled Candidate' : 'Enrollment Open'}
              </span>
              <div className="text-xl font-bold text-slate-900">
                {isEnrolled ? 'Course Interface Unlocked' : 'Enroll in Program'}
              </div>
              <p className="text-xs text-slate-500">
                {isEnrolled 
                  ? 'Your learning workspace and video lectures are ready.' 
                  : 'Enroll to unlock the interactive course interface, video lectures, and accredited certification.'}
              </p>
            </div>

            {isEnrolled ? (
              <button
                type="button"
                onClick={() => onOpenClassroom(course)}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Enter Course Interface</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onEnroll(course)}
                className="w-full py-3.5 bg-[#0056D2] hover:bg-[#00419e] text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Award className="w-4 h-4" />
                <span>Enroll in Specialization</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <div className="pt-2 border-t border-slate-100 space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[#0056D2]" />
                <span className="font-semibold text-slate-800">Shareable Specialization Certificate</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-400" />
                <span>100% Online & Self-Paced Learning</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Approx. {course.duration || '8 Weeks'} at 5 hrs/week</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Course Interface Unlocked Upon Enrollment</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Sticky Sub-Navigation Tabs */}
      <div className="border-b border-slate-200 sticky top-16 bg-white/95 backdrop-blur-md z-20 py-2">
        <div className="flex items-center gap-6 text-xs font-bold text-slate-600 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('syllabus')}
            className={'pb-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ' + 
              (activeTab === 'syllabus' ? 'border-[#0056D2] text-[#0056D2]' : 'border-transparent hover:text-slate-900')}
          >
            Modules & Syllabus ({course.modules?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('outcomes')}
            className={'pb-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ' + 
              (activeTab === 'outcomes' ? 'border-[#0056D2] text-[#0056D2]' : 'border-transparent hover:text-slate-900')}
          >
            What You'll Learn
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={'pb-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ' + 
              (activeTab === 'about' ? 'border-[#0056D2] text-[#0056D2]' : 'border-transparent hover:text-slate-900')}
          >
            About & Prerequisites
          </button>
          <button
            onClick={() => setActiveTab('instructors')}
            className={'pb-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ' + 
              (activeTab === 'instructors' ? 'border-[#0056D2] text-[#0056D2]' : 'border-transparent hover:text-slate-900')}
          >
            Faculty & Instructors
          </button>
        </div>
      </div>

      {/* Tab 1: Syllabus Breakdown */}
      {activeTab === 'syllabus' && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Curriculum & Syllabus</h2>
              <p className="text-xs text-slate-500 mt-1">
                {course.modules?.length || 0} Modules · {totalLessons} Lectures · {totalTasks} Faculty-Evaluated Assignments
              </p>
            </div>

            <div className="flex items-center gap-3">
              {isEnrolled ? (
                <button
                  type="button"
                  onClick={() => onOpenClassroom(course)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Open Course Interface</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onEnroll(course)}
                  className="px-4 py-2 bg-[#0056D2] hover:bg-[#00419e] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Enroll to Unlock Classroom</span>
                </button>
              )}
            </div>
          </div>

          {/* Module Accordions */}
          <div className="space-y-4">
            {(!course.modules || course.modules.length === 0) ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center space-y-2">
                <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800">Syllabus Modules Loading</h4>
                <p className="text-xs text-slate-500">Retrieving curriculum structure, lectures, and project assignments...</p>
              </div>
            ) : (
              (course.modules || []).map((mod, modIdx) => {
              const isExpanded = !!expandedModules[modIdx];
              const lessonCount = mod.lessons?.length || 0;
              const taskCount = mod.tasks?.length || 0;

              return (
                <div
                  key={mod.id || modIdx}
                  className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden transition-all"
                >
                  {/* Module Accordion Header */}
                  <button
                    onClick={() => toggleModule(modIdx)}
                    className="w-full p-5 sm:p-6 text-left flex items-start sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#0056D2] uppercase tracking-wider">
                        <span>Module {modIdx + 1}</span>
                        <span>·</span>
                        <span className="text-slate-500 font-semibold">{mod.duration || '5 hours to complete'}</span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900">
                        {mod.title}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-1 max-w-2xl">
                        {mod.description || 'Deep dive into practical distributed architecture patterns and failure dynamics.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 flex-shrink-0">
                      <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                        {lessonCount} lectures · {taskCount} project
                      </span>
                      <div className="p-1 rounded-full bg-slate-100 text-slate-600">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </button>

                  {/* Expanded Syllabus Items */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 divide-y divide-slate-100 bg-slate-50/40">
                      {mod.lessons?.map((lesson, lIdx) => (
                        <div
                          key={lesson.id || lIdx}
                          onClick={() => {
                            if (isEnrolled || lesson.is_free_preview) {
                              onOpenClassroom(course, lesson);
                            } else {
                              onEnroll(course);
                            }
                          }}
                          className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-white transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0056D2] group-hover:bg-[#0056D2] group-hover:text-white transition-colors flex items-center justify-center flex-shrink-0">
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs sm:text-sm font-semibold text-slate-900 group-hover:text-[#0056D2] transition-colors truncate">
                                {lesson.title}
                              </h4>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                <span>Video</span>
                                <span>·</span>
                                <span>{lesson.duration || '12 min'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isEnrolled ? (
                              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                <Play className="w-3 h-3 fill-current" />
                                <span>Unlocked</span>
                              </span>
                            ) : lesson.is_free_preview ? (
                              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md flex items-center gap-1 shadow-2xs">
                                <Play className="w-3 h-3 fill-current" />
                                <span>Free Preview</span>
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                                <Lock className="w-3 h-3 text-slate-500" />
                                <span className="hidden sm:inline">Requires Enrollment</span>
                              </span>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Graded Projects */}
                      {mod.tasks?.map(task => (
                        <div
                          key={task.id}
                          onClick={() => {
                            if (isEnrolled) {
                              onOpenClassroom(course);
                            } else {
                              onEnroll(course);
                            }
                          }}
                          className="px-6 py-4 bg-blue-50/30 flex items-center justify-between gap-4 border-l-4 border-[#0056D2] hover:bg-blue-50/60 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0056D2] group-hover:bg-[#0056D2] group-hover:text-white transition-colors flex items-center justify-center flex-shrink-0">
                              <ListTodo className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#0056D2] transition-colors truncate">
                                  {task.title}
                                </h4>
                                <span className="text-[10px] bg-blue-100 text-[#0056D2] px-2 py-0.5 rounded font-bold uppercase">
                                  Evaluated Defense
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">
                                {task.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isEnrolled ? (
                              <span className="text-xs font-bold text-emerald-600">Unlocked</span>
                            ) : (
                              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                <span className="hidden sm:inline">Enrolled Only</span>
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            }))}
          </div>
        </section>
      )}

      {/* Tab 2: What You'll Learn & Outcomes */}
      {activeTab === 'outcomes' && (
        <section className="space-y-6">
          <div className="bg-blue-50/60 border border-blue-200/70 rounded-3xl p-8 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">What you will learn</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(course.what_you_will_learn || [
                'Architect fault-tolerant systems using consensus protocols and quorum invariants',
                'Deploy zero-trust service communication with mutual TLS and ephemeral identity rotation',
                'Benchmark and tune write-heavy storage engines under extreme concurrent client loads',
                'Eliminate distributed state anomalies with Change Data Capture and transactional outbox pipelines'
              ]).map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#0056D2] flex-shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Skills Pill Grid */}
          {course.skills && course.skills.length > 0 && (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 space-y-3 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900">Skills you will gain</h3>
              <div className="flex flex-wrap gap-2">
                {course.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-3.5 py-1.5 bg-slate-100 text-slate-800 text-xs font-semibold rounded-full border border-slate-200/80"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Tab 3: About & Prerequisites */}
      {activeTab === 'about' && (
        <section className="bg-white rounded-3xl border border-slate-200 p-8 space-y-6 shadow-xs">
          <div>
            <h3 className="text-lg font-bold text-slate-900">About this Specialization</h3>
            <p className="text-slate-600 text-sm leading-relaxed mt-2">
              {course.about || course.description}
            </p>
          </div>

          <div className="pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <h4 className="text-xs font-bold uppercase text-slate-400">Target Level</h4>
              <p className="text-sm font-bold text-slate-900 mt-1">{course.level || 'Principal Systems'}</p>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase text-slate-400">Duration</h4>
              <p className="text-sm font-bold text-slate-900 mt-1">{course.duration || '8 Weeks'}</p>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase text-slate-400">Prerequisites</h4>
              <p className="text-sm font-bold text-slate-900 mt-1">{course.prerequisites || 'Distributed Systems Foundations & Linux'}</p>
            </div>
          </div>
        </section>
      )}

      {/* Tab 4: Faculty & Instructors */}
      {activeTab === 'instructors' && course.instructor && (
        <section className="bg-white rounded-3xl border border-slate-200 p-8 space-y-6 shadow-xs">
          <h3 className="text-lg font-bold text-slate-900">Faculty Director & Instructors</h3>
          
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <img
              src={course.instructor.avatar || '/avatars/3d/memo_1.png'}
              alt={course.instructor.name}
              onError={(e) => { e.currentTarget.src = '/avatars/3d/memo_1.png'; }}
              className="w-20 h-20 rounded-full object-cover ring-4 ring-blue-50 flex-shrink-0"
            />

            <div className="space-y-2">
              <h4 className="text-base font-bold text-slate-900">
                {course.instructor.name}
              </h4>
              <p className="text-xs font-semibold text-[#0056D2]">{course.instructor.title}</p>
              <p className="text-xs text-slate-500">{course.instructor.department}</p>
              <p className="text-xs text-slate-600 leading-relaxed pt-2">
                Faculty Fellow at Aaroha Institute of Technology leading distributed reliability and high-throughput systems research.
              </p>
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
