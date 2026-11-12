import React, { useState, useRef } from 'react';
import { 
  ArrowLeft, Play, FileText, CheckCircle2, Lock, ArrowRight, BookOpen, Clock, 
  ListTodo, Star, Award, Check, Users, Globe, Calendar, ChevronDown, ChevronUp, Share2, ExternalLink
} from 'lucide-react';
import aarohaLogo from '../assets/aaroha_logo.webp';
import { getEmbedVideoUrl, isDirectVideoFile } from '../videoUtils';

export default function CourseDetailPage({ course, onBack, onEnroll, isEnrolled, onStartLearning }) {
  const [activeTab, setActiveTab] = useState('syllabus'); // 'about' | 'outcomes' | 'syllabus' | 'instructors'
  const previewPlayerRef = useRef(null);
  const [expandedModules, setExpandedModules] = useState(() => {
    // Expand the first module by default
    return { 0: true };
  });

  const [activePreviewLesson, setActivePreviewLesson] = useState(() => {
    const firstPreview = course?.modules
      ?.flatMap(m => m.lessons || [])
      ?.find(l => l.is_free_preview);
    return firstPreview || null;
  });

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
    <div className="space-y-10 pb-32">
      {/* Coursera Breadcrumb Navigation */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 font-bold text-[#0056D2] hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Home</span>
          <span className="text-slate-400">/</span>
          <span>{course.category}</span>
          <span className="text-slate-400">/</span>
          <span className="text-slate-800 font-semibold truncate max-w-xs">{course.title}</span>
        </button>

        <div className="hidden sm:flex items-center gap-2">
          <span className="px-2.5 py-1 bg-blue-50 text-[#0056D2] font-bold rounded text-[11px]">
            {course.partner_type || 'Specialization'}
          </span>
        </div>
      </div>

      {/* Coursera Course Landing Hero Banner */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-3xl p-8 sm:p-12 border border-slate-800 shadow-md relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          <div className="lg:col-span-8 space-y-4">
            {/* Official Partner Badge */}
            <div className="flex items-center gap-3">
              <img
                src={aarohaLogo}
                alt="Aaroha Technologies"
                className="h-7 sm:h-8 w-auto object-contain"
              />
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

            {/* Coursera Ratings & Learner Proof */}
            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-300 font-medium">
              <div className="flex items-center gap-1 text-amber-400 font-bold">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-white text-sm">{course.rating || '4.9'}</span>
                <span className="text-slate-400 font-normal">({course.reviews_count || '2,840'} reviews)</span>
              </div>
              <span>·</span>
              <span className="text-emerald-400 font-semibold">98% positive reviews</span>
              <span>·</span>
              <span className="text-slate-300">{course.enrolled_count ? course.enrolled_count.toLocaleString() : '14,820'} already enrolled</span>
            </div>

            {/* Instructor Line */}
            {course.instructor && (
              <div className="pt-2 flex items-center gap-3">
                <img
                  src={course.instructor.avatar}
                  alt={course.instructor.name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500/40"
                />
                <div className="text-xs">
                  <div className="text-slate-400">Taught by</div>
                  <div className="font-bold text-white text-sm">{course.instructor.name}</div>
                </div>
              </div>
            )}
          </div>

          {/* Right Action Card (Coursera Floating Enrollment Box) */}
          <div className="lg:col-span-4 bg-white text-slate-900 rounded-2xl p-6 sm:p-7 shadow-2xl space-y-5 border border-slate-100">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {isEnrolled ? 'Enrolled Student' : 'Enrollment Open'}
              </span>
              <div className="text-xl font-bold text-slate-900">
                {isEnrolled ? 'Active Learning Seat' : 'Enroll for Free'}
              </div>
              <p className="text-xs text-slate-500">
                {isEnrolled ? 'Coursework is ready in your workspace.' : 'Starts today · Self-paced · Financial aid available'}
              </p>
            </div>

            {isEnrolled ? (
              <button
                onClick={() => onStartLearning(course.id)}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <span>Go to Coursework</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => onEnroll(course.id)}
                className="w-full py-3.5 bg-[#0056D2] hover:bg-[#00419e] text-white text-sm font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <span>Enroll for Free</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <div className="pt-2 border-t border-slate-100 space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#0056D2] flex-shrink-0" />
                <span>Stream full sequential lectures & code</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#0056D2] flex-shrink-0" />
                <span>Submit evaluated projects for faculty review</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#0056D2] flex-shrink-0" />
                <span>Earn verifiable digital certificate</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Coursera 4-Box Key Highlights Ribbon */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-start gap-3">
          <Award className="w-5 h-5 text-[#0056D2] flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-slate-900">Shareable Certificate</h4>
            <p className="text-[11px] text-slate-500">Add to your LinkedIn profile upon graduation</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Globe className="w-5 h-5 text-[#0056D2] flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-slate-900">100% Online</h4>
            <p className="text-[11px] text-slate-500">Start instantly and learn on your schedule</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Calendar className="w-5 h-5 text-[#0056D2] flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-slate-900">Flexible Schedule</h4>
            <p className="text-[11px] text-slate-500">{course.duration} ({course.commitment || '4-6 hrs/week'})</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-[#0056D2] flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-slate-900">{course.level || 'Advanced'}</h4>
            <p className="text-[11px] text-slate-500">{totalLessons} Lectures · {totalTasks} Evaluated Projects</p>
          </div>
        </div>
      </section>

      {/* Coursera Sticky Sub-Navigation Tabs */}
      <div className="border-b border-slate-200 sticky top-16 bg-white/95 backdrop-blur-md z-20 py-2">
        <div className="flex items-center gap-6 text-xs font-bold text-slate-600 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('about')}
            className={'pb-2 border-b-2 transition-colors whitespace-nowrap ' + 
              (activeTab === 'about' ? 'border-[#0056D2] text-[#0056D2]' : 'border-transparent hover:text-slate-900')}
          >
            About
          </button>
          <button
            onClick={() => setActiveTab('outcomes')}
            className={'pb-2 border-b-2 transition-colors whitespace-nowrap ' + 
              (activeTab === 'outcomes' ? 'border-[#0056D2] text-[#0056D2]' : 'border-transparent hover:text-slate-900')}
          >
            What You'll Learn
          </button>
          <button
            onClick={() => setActiveTab('syllabus')}
            className={'pb-2 border-b-2 transition-colors whitespace-nowrap ' + 
              (activeTab === 'syllabus' ? 'border-[#0056D2] text-[#0056D2]' : 'border-transparent hover:text-slate-900')}
          >
            Modules & Syllabus
          </button>
          <button
            onClick={() => setActiveTab('instructors')}
            className={'pb-2 border-b-2 transition-colors whitespace-nowrap ' + 
              (activeTab === 'instructors' ? 'border-[#0056D2] text-[#0056D2]' : 'border-transparent hover:text-slate-900')}
          >
            Instructors
          </button>
        </div>
      </div>

      {/* What You Will Learn (Coursera Signature 2-Column Box) */}
      <section className="bg-blue-50/60 border border-blue-200/70 rounded-2xl p-6 sm:p-8 space-y-4">
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
      </section>

      {/* Skills You'll Gain (Coursera Pill Grid) */}
      {course.skills && course.skills.length > 0 && (
        <section className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3">
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
        </section>
      )}

      {/* Interactive Free Preview Lecture Player */}
      {activePreviewLesson && (
        <section ref={previewPlayerRef} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase rounded">
                  Free Lecture Preview
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {activePreviewLesson.duration}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {activePreviewLesson.title}
              </h3>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-center">
              {activePreviewLesson.media_url && (
                <a
                  href={activePreviewLesson.media_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#0056D2] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                  title="Open video in external player or YouTube tab"
                >
                  <span>Open Video Tab</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                onClick={() => setActivePreviewLesson(null)}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-2 py-1"
              >
                Hide Player
              </button>
            </div>
          </div>

          {activePreviewLesson.content_type === 'video' && activePreviewLesson.media_url ? (
            <div className="relative pt-[56.25%] rounded-2xl overflow-hidden bg-black shadow-md">
              {isDirectVideoFile(activePreviewLesson.media_url) ? (
                <video
                  src={activePreviewLesson.media_url}
                  controls
                  autoPlay
                  className="absolute inset-0 w-full h-full"
                />
              ) : (
                <iframe
                  src={getEmbedVideoUrl(activePreviewLesson.media_url)}
                  title={activePreviewLesson.title}
                  className="absolute inset-0 w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              )}
            </div>
          ) : null}

          {activePreviewLesson.content_body && (
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2">
              <h4 className="font-bold text-slate-900 text-sm">Lecture Notes & Foundations:</h4>
              <p>{activePreviewLesson.content_body}</p>
            </div>
          )}
        </section>
      )}

      {/* Coursera Expandable Syllabus Accordion */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Syllabus - What you will learn from this course
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              There are {course.modules?.length || 0} modules in this course. Each module concludes with an evaluated engineering deliverable.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-md self-start sm:self-auto">
            {totalLessons} Videos & Readings · {totalTasks} Graded Projects
          </span>
        </div>

        <div className="space-y-4">
          {course.modules?.map((mod, modIdx) => {
            const isExpanded = !!expandedModules[modIdx];
            return (
              <div
                key={mod.id}
                className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs"
              >
                {/* Accordion Header */}
                <div 
                  onClick={() => toggleModule(modIdx)}
                  className="px-6 py-5 bg-white hover:bg-slate-50/80 cursor-pointer flex items-center justify-between gap-4 transition-colors select-none"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#0056D2] uppercase tracking-wider">
                        Module {modIdx + 1}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs text-slate-500 font-medium">
                        {mod.estimated_time || '5 hours to complete'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">
                      {mod.title.replace(/^Module \d+:\s*/, '')}
                    </h3>
                    {mod.description && (
                      <p className="text-xs text-slate-500 line-clamp-1 pt-0.5">
                        {mod.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="hidden sm:inline-block text-xs font-semibold text-slate-500">
                      {(mod.lessons?.length || 0)} items · {(mod.tasks?.length || 0)} project
                    </span>
                    <button className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Accordion Content */}
                {isExpanded && (
                  <div className="divide-y divide-slate-100 border-t border-slate-100 bg-slate-50/40">
                    {/* Lessons */}
                    {mod.lessons?.map(lesson => {
                      const isFree = Boolean(lesson.is_free_preview);
                      return (
                        <div
                          key={lesson.id}
                          onClick={() => {
                            if (isFree) {
                              setActivePreviewLesson(lesson);
                              previewPlayerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            } else if (isEnrolled) {
                              onStartLearning(course.id);
                            } else {
                              onEnroll(course);
                            }
                          }}
                          className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-3.5">
                            {lesson.content_type === 'video' ? (
                              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0056D2] group-hover:bg-[#0056D2] group-hover:text-white transition-colors flex items-center justify-center flex-shrink-0">
                                <Play className="w-4 h-4 fill-current" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 group-hover:bg-slate-200 flex items-center justify-center flex-shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                            )}
                            <div>
                              <h4 className="text-xs sm:text-sm font-semibold text-slate-900 group-hover:text-[#0056D2] transition-colors">
                                {lesson.title}
                              </h4>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                <span>{lesson.content_type === 'video' ? 'Video Lecture' : 'Reading'}</span>
                                <span>·</span>
                                <span>{lesson.duration}</span>
                              </div>
                            </div>
                          </div>

                          <div onClick={(e) => e.stopPropagation()}>
                            {isFree ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setActivePreviewLesson(lesson);
                                  previewPlayerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }}
                                className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-300 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-xs"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Free Preview</span>
                              </button>
                            ) : isEnrolled ? (
                              <button
                                type="button"
                                onClick={() => onStartLearning(course.id)}
                                className="px-3.5 py-1.5 bg-[#0056D2] hover:bg-[#00419e] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Start Lesson</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onEnroll(course)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-[#0056D2] hover:text-white text-slate-600 hover:border-[#0056D2] border border-slate-200 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-xs"
                                title="Click to enroll and unlock this lecture"
                              >
                                <Lock className="w-3.5 h-3.5" />
                                <span>Unlock Lesson</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Graded Projects */}
                    {mod.tasks?.map(task => (
                      <div
                        key={task.id}
                        onClick={() => {
                          if (isEnrolled) {
                            onStartLearning(course.id);
                          } else {
                            onEnroll(course);
                          }
                        }}
                        className="px-6 py-4 bg-blue-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-l-4 border-[#0056D2] hover:bg-blue-50/60 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0056D2] group-hover:bg-[#0056D2] group-hover:text-white transition-colors flex items-center justify-center flex-shrink-0">
                            <ListTodo className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#0056D2] transition-colors">
                                {task.title}
                              </h4>
                              <span className="text-[10px] bg-blue-100 text-[#0056D2] px-2 py-0.5 rounded font-bold uppercase">
                                Graded Assignment
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">
                              {task.instructions}
                            </p>
                          </div>
                        </div>

                        <div onClick={(e) => e.stopPropagation()} className="text-right text-xs text-slate-700 font-semibold whitespace-nowrap pl-4">
                          {isEnrolled ? (
                            <button
                              type="button"
                              onClick={() => onStartLearning(course.id)}
                              className="px-3 py-1.5 bg-[#0056D2] hover:bg-[#00419e] text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                            >
                              Go to Project
                            </button>
                          ) : (
                            <span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                              <Lock className="w-3.5 h-3.5 text-slate-400" />
                              <span>Enrolled Only</span>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Coursera Instructor Profile Section */}
      {course.instructor && (
        <section className="bg-white rounded-2xl border border-slate-200 p-8 space-y-6">
          <h3 className="text-lg font-bold text-slate-900">Instructor</h3>
          
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <img
              src={course.instructor.avatar}
              alt={course.instructor.name}
              className="w-24 h-24 rounded-full object-cover ring-4 ring-blue-50 flex-shrink-0"
            />

            <div className="space-y-3 flex-1">
              <div>
                <h4 className="text-base font-bold text-[#0056D2] hover:underline cursor-pointer">
                  {course.instructor.name}
                </h4>
                <p className="text-xs font-semibold text-slate-700">{course.instructor.title}</p>
                <p className="text-xs text-slate-500">{course.instructor.department}</p>
              </div>

              <div className="flex items-center gap-6 text-xs text-slate-600 font-medium">
                <span className="flex items-center gap-1 font-bold text-slate-900">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>{course.instructor.rating} Instructor Rating</span>
                </span>
                <span>·</span>
                <span>{course.instructor.students} Learners</span>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {course.instructor.bio}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Sticky Bottom Ribbon (Coursera Fixed Enrollment Bar) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="hidden sm:block">
            <div className="text-xs font-bold text-slate-900">{course.title}</div>
            <div className="text-[11px] text-slate-500 flex items-center gap-2">
              <span className="text-amber-500 font-bold">★ {course.rating || '4.9'}</span>
              <span>·</span>
              <span>{course.duration}</span>
              <span>·</span>
              <span>{totalLessons} Lectures</span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {isEnrolled ? (
              <button
                onClick={() => onStartLearning(course.id)}
                className="w-full sm:w-auto px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <span>Continue Coursework</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => onEnroll(course.id)}
                className="w-full sm:w-auto px-8 py-2.5 bg-[#0056D2] hover:bg-[#00419e] text-white text-xs font-bold rounded-md shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <span>Enroll for Free</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
