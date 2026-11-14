import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Play, FileText, CheckCircle2, Lock, ArrowRight, BookOpen, Clock, 
  ThumbsUp, Eye, Flag, ChevronDown, ChevronUp, ChevronRight, Award, Check, 
  Share2, ExternalLink, Send, AlertCircle, RefreshCw, User, GraduationCap
} from 'lucide-react';
import aarohaLogo from '../assets/aaroha_logo.webp';
import { getEmbedVideoUrl, isDirectVideoFile, getVideoThumbnail, isBunnyStreamVideo, extractBunnyVideoId } from '../videoUtils';
import BunnyStreamPlayer from './BunnyStreamPlayer';
import { api } from '../apiService';

/**
 * Resilient Lesson Thumbnail Component
 * Prioritizes explicit lesson thumbnail, falls back to course thumbnail or YouTube,
 * and gracefully renders an executive cinema play badge on any image error.
 */
function LessonThumbnailItem({ lesson, courseThumbnail }) {
  const [imgFailed, setImgFailed] = useState(false);
  const lessonMedia = lesson?.media_url || lesson?.video_url || lesson?.bunny_video_id || '';
  const initialThumb = lesson?.thumbnail_url || getVideoThumbnail(lessonMedia, courseThumbnail);

  if (!initialThumb || imgFailed) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0F223A] via-[#132d4e] to-[#0A1829] text-blue-400">
        <div className="w-6 h-6 rounded-full bg-blue-600/30 flex items-center justify-center border border-blue-400/40 shadow-xs">
          <Play className="w-2.5 h-2.5 text-white fill-current ml-0.5" />
        </div>
      </div>
    );
  }

  return (
    <img
      src={initialThumb}
      alt=""
      onError={() => setImgFailed(true)}
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
      loading="lazy"
    />
  );
}

export default function CourseClassroomView({ 
  course, 
  onBack, 
  onCourseComplete,
  onEnroll, 
  isEnrolled, 
  currentUser,
  lessonProgress = [],
  taskSubmissions = [],
  onCompleteLesson,
  onSubmitTask,
  allCourses = [],
  onSelectCourse,
  onOpenProfile
}) {
  // Flatten all lessons with their parent module info
  const allLessons = (course?.modules || []).flatMap((mod, modIdx) => 
    (mod.lessons || []).map((lesson) => {
      const normalizedMedia = lesson.media_url || lesson.video_url || lesson.bunny_video_id || '';
      return {
        ...lesson,
        media_url: normalizedMedia,
        video_url: normalizedMedia,
        moduleIndex: modIdx,
        moduleTitle: mod.title,
        overallIndex: 0
      };
    })
  ).map((lesson, idx) => ({ ...lesson, overallIndex: idx }));

  // Pick initial lesson: first incomplete if enrolled, or first free preview
  const [activeLesson, setActiveLesson] = useState(() => {
    if (allLessons.length === 0) return null;
    if (isEnrolled && lessonProgress.length > 0) {
      const firstIncomplete = allLessons.find(l => 
        !lessonProgress.some(p => p.lesson_id === l.id && p.is_completed)
      );
      if (firstIncomplete) return firstIncomplete;
    }
    const firstPreview = allLessons.find(l => l.is_free_preview);
    return firstPreview || allLessons[0] || null;
  });

  // Track expanded state of module accordion
  const [expandedModules, setExpandedModules] = useState(() => {
    const initial = {};
    (course?.modules || []).forEach((_, idx) => {
      initial[idx] = true;
    });
    return initial;
  });

  // Quick actions state
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(() => 142 + ((course?.id || 0) * 17) % 500);
  const [activeTab, setActiveTab] = useState('notes'); // 'notes' | 'tasks' | 'instructor'

  // Task submission state
  const [submissionText, setSubmissionText] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Authenticated Video Playback Session State
  const [playbackSession, setPlaybackSession] = useState(null);
  const [playbackLoading, setPlaybackLoading] = useState(false);
  const [playbackError, setPlaybackError] = useState(null);

  // When active lesson changes, ensure its module is expanded
  useEffect(() => {
    if (activeLesson) {
      setExpandedModules(prev => ({
        ...prev,
        [activeLesson.moduleIndex]: true
      }));
    }
  }, [activeLesson]);

  // Fetch expiring Bunny Stream playback token from authenticated backend endpoint
  useEffect(() => {
    if (!activeLesson?.id) {
      setPlaybackSession(null);
      setPlaybackError(null);
      return;
    }

    const currentMedia = activeLesson.video_url || activeLesson.media_url || activeLesson.bunny_video_id || '';
    const isBunny = isBunnyStreamVideo(currentMedia);

    if (isBunny || isEnrolled || activeLesson.is_free_preview) {
      setPlaybackLoading(true);
      setPlaybackError(null);
      api.getLessonPlayback(activeLesson.id)
        .then(res => {
          if (res?.playback) {
            setPlaybackSession(res.playback);
            setPlaybackError(null);
          } else {
            setPlaybackSession(null);
            setPlaybackError(res?.error || 'Unable to establish playback session');
          }
        })
        .catch(err => {
          setPlaybackSession(null);
          setPlaybackError(err.message || 'Playback authorization required');
        })
        .finally(() => {
          setPlaybackLoading(false);
        });
    } else {
      setPlaybackSession(null);
      setPlaybackError(null);
    }
  }, [activeLesson?.id, activeLesson?.video_url, activeLesson?.media_url, activeLesson?.bunny_video_id, activeLesson?.is_free_preview, isEnrolled]);

  if (!course) return null;

  // Calculate course progress percentage
  const totalLessonsCount = allLessons.length;
  const completedLessonIds = new Set(
    lessonProgress.filter(p => p.is_completed).map(p => p.lesson_id)
  );
  const completedCount = allLessons.filter(l => completedLessonIds.has(l.id)).length;
  const progressPct = totalLessonsCount > 0 
    ? Math.round((completedCount / totalLessonsCount) * 100) 
    : 0;

  const toggleModule = (index) => {
    setExpandedModules(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const isLessonCompleted = (lessonId) => completedLessonIds.has(lessonId);

  const canPlayLesson = (lesson) => {
    if (!lesson) return false;
    if (isEnrolled) return true;
    return !!lesson.is_free_preview;
  };

  // Find next and previous lessons
  const currentLessonIndex = allLessons.findIndex(l => l.id === activeLesson?.id);
  const hasNextLesson = currentLessonIndex >= 0 && currentLessonIndex < allLessons.length - 1;
  const hasPrevLesson = currentLessonIndex > 0;

  const handleNextLesson = () => {
    if (hasNextLesson) {
      setActiveLesson(allLessons[currentLessonIndex + 1]);
    }
  };

  const handlePrevLesson = () => {
    if (hasPrevLesson) {
      setActiveLesson(allLessons[currentLessonIndex - 1]);
    }
  };

  const handleToggleComplete = (lessonId) => {
    if (!isEnrolled || !onCompleteLesson) {
      onEnroll(course);
      return;
    }
    const wasCompleted = isLessonCompleted(lessonId);
    onCompleteLesson(lessonId);

    if (!wasCompleted) {
      // Check if all lessons across all modules in this course are now completed
      const willBeCourseCompleted = totalLessonsCount > 0 && (completedCount + 1) >= totalLessonsCount;

      if (willBeCourseCompleted) {
        // Course is now 100% completed across all modules!
        // Automatically close the course and redirect to dashboard
        setTimeout(() => {
          if (onCourseComplete) {
            onCourseComplete(course);
          } else if (onBack) {
            onBack();
          }
        }, 800);
        return;
      }

      if (hasNextLesson) {
        setTimeout(() => {
          handleNextLesson();
        }, 300);
      }
    }
  };

  const handleLike = () => {
    setIsLiked(prev => {
      setLikeCount(count => prev ? count - 1 : count + 1);
      return !prev;
    });
  };

  // Find tasks in the current module
  const currentModule = course.modules?.[activeLesson?.moduleIndex] || course.modules?.[0];
  const currentModuleTasks = currentModule?.tasks || [];

  const handleTaskSubmit = (e, taskId) => {
    e.preventDefault();
    if (!submissionText.trim() && !attachmentUrl.trim()) return;
    if (!onSubmitTask) return;

    setIsSubmitting(true);
    onSubmitTask({
      taskId: taskId,
      submissionText: submissionText,
      attachmentUrl: attachmentUrl
    });

    setSubmissionText('');
    setAttachmentUrl('');
    setIsSubmitting(false);
    setSubmitSuccess(true);
    setTimeout(() => setSubmitSuccess(false), 4000);
  };

  const currentMedia = activeLesson?.media_url || activeLesson?.video_url || activeLesson?.bunny_video_id || '';

  return (
    <div className="min-h-screen bg-[#071322] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header Bar */}
      <header className="bg-[#0B192C] border-b border-[#1b3d63] px-4 sm:px-6 py-2.5 flex items-center justify-between sticky top-0 z-40 shadow-lg">
        {/* Left: Back to Dashboard Button */}
        <button
          onClick={onBack}
          className="bg-[#132A4A] hover:bg-[#1A3860] text-slate-200 hover:text-white text-xs font-semibold px-3.5 py-2 rounded-xl border border-[#23456F] flex items-center gap-2 transition-all shadow-xs cursor-pointer active:scale-97"
        >
          <ArrowLeft className="w-4 h-4 text-slate-300" />
          <span>Back to Dashboard</span>
        </button>

        {/* Center: Official Aaroha Logo on Clean White Badge */}
        <div 
          onClick={onBack}
          className="cursor-pointer select-none group"
          title="Return to Catalog"
        >
          <div className="bg-white hover:bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200 flex items-center gap-2.5 shadow-xs transition-all group-hover:border-slate-300">
            <img
              src={aarohaLogo}
              alt="Aaroha Technologies"
              className="h-6 sm:h-7 w-auto object-contain"
            />
            <span className="text-[10px] font-black tracking-widest text-[#0056D2] uppercase pl-2 border-l border-slate-200 hidden sm:inline">
              Academy
            </span>
          </div>
        </div>

        {/* Right: Enrollment CTA or Learner Account Badge */}
        <div className="flex items-center gap-3">
          {isEnrolled ? (
            <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-700 px-3 py-1.5 rounded-xl text-xs text-emerald-300 font-semibold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="hidden sm:inline">
                {completedCount >= totalLessonsCount && totalLessonsCount > 0 
                  ? 'Completed • Unlimited Rewatch' 
                  : 'Enrolled Candidate'}
              </span>
            </div>
          ) : (
            <button
              onClick={() => onEnroll(course)}
              className="bg-[#0056D2] hover:bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-sm active:scale-97 cursor-pointer"
            >
              <Award className="w-4 h-4" />
              <span>Enroll in Program</span>
            </button>
          )}

          {currentUser ? (
            <button
              type="button"
              onClick={onOpenProfile}
              title="Click to view & edit your profile and avatar"
              className="flex items-center gap-2 pl-2 border-l border-[#1b3d63] hover:opacity-90 transition-all cursor-pointer group text-left"
            >
              <img
                src={currentUser.avatar || '/avatars/3d/memo_13.png'}
                alt={currentUser.full_name}
                onError={(e) => { e.currentTarget.src = '/avatars/3d/memo_13.png'; }}
                className="w-7 h-7 rounded-full object-cover ring-2 ring-blue-500/50 group-hover:ring-blue-400 group-hover:scale-105 transition-all shrink-0 bg-slate-100"
              />
              <span className="text-xs font-semibold text-slate-200 group-hover:text-white hidden md:inline">
                {currentUser.full_name.split(' ')[0]}
              </span>
            </button>
          ) : (
            <button
              onClick={() => onEnroll(course)}
              className="text-xs text-slate-300 hover:text-white font-semibold px-2 py-1 transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Classroom Workspace - 2 Column Layout */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* LEFT COLUMN: Breadcrumb, Main Video Player, Action Bar & Lesson Notes (lg:col-span-8) */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Breadcrumb Navigation: Course Name > Lesson Title */}
            <div className="flex items-center gap-2 text-xs font-medium flex-wrap">
              <span 
                onClick={onBack}
                className="text-emerald-400 font-bold hover:underline cursor-pointer transition-colors"
              >
                {course.title}
              </span>
              <span className="text-slate-500 font-normal">›</span>
              <span className="text-white font-semibold truncate max-w-xl">
                {activeLesson?.title || 'Program Foundations'}
              </span>
            </div>

            {/* Main Video Player Container (16:9 Cinema Box) */}
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-[#1b3d63] shadow-2xl">
              {canPlayLesson(activeLesson) ? (
                playbackSession?.provider === 'bunny_stream' && playbackSession?.token ? (
                  <BunnyStreamPlayer
                    libraryId={playbackSession.library_id}
                    videoId={playbackSession.video_id}
                    token={playbackSession.token}
                    expires={playbackSession.expires}
                    embedUrl={playbackSession.embed_url}
                    title={activeLesson.title}
                    onExpire={() => {
                      if (activeLesson?.id) {
                        api.getLessonPlayback(activeLesson.id)
                          .then(res => res?.playback && setPlaybackSession(res.playback))
                          .catch(() => {});
                      }
                    }}
                  />
                ) : isBunnyStreamVideo(currentMedia) ? (
                  playbackLoading ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                      <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-3" />
                      <p className="text-xs font-medium text-slate-400">Authorizing secure stream session...</p>
                    </div>
                  ) : playbackError ? (
                    <div className="w-full h-full bg-[#081526] flex flex-col items-center justify-center p-8 text-center text-slate-300">
                      <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-lg">
                        <AlertCircle className="w-7 h-7" />
                      </div>
                      <h4 className="text-base font-bold text-white">Playback Authorization Notice</h4>
                      <p className="text-xs text-slate-300 mt-2 max-w-md leading-relaxed">
                        {playbackError}
                      </p>
                      <div className="flex items-center gap-3 mt-4">
                        {!currentUser && (
                          <button
                            onClick={() => onEnroll(course)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition cursor-pointer"
                          >
                            <User className="w-4 h-4" />
                            <span>Sign In to Access Stream</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (activeLesson?.id) {
                              setPlaybackLoading(true);
                              setPlaybackError(null);
                              api.getLessonPlayback(activeLesson.id)
                                .then(res => {
                                  if (res?.playback) setPlaybackSession(res.playback);
                                  else setPlaybackError(res?.error || 'Unable to authorize playback');
                                })
                                .catch(err => setPlaybackError(err.message || 'Unable to authorize playback'))
                                .finally(() => setPlaybackLoading(false));
                            }
                          }}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Retry Authorization</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-[#081526] flex flex-col items-center justify-center p-8 text-center text-slate-300">
                      <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3 shadow-lg">
                        <RefreshCw className="w-7 h-7" />
                      </div>
                      <h4 className="text-base font-bold text-white">Secure Video Stream</h4>
                      <p className="text-xs text-slate-300 mt-2 max-w-md leading-relaxed">
                        Establishing encrypted token session for Bunny Stream...
                      </p>
                      <button
                        onClick={() => {
                          if (activeLesson?.id) {
                            setPlaybackLoading(true);
                            setPlaybackError(null);
                            api.getLessonPlayback(activeLesson.id)
                              .then(res => {
                                if (res?.playback) setPlaybackSession(res.playback);
                                else setPlaybackError(res?.error || 'Unable to authorize playback');
                              })
                              .catch(err => setPlaybackError(err.message || 'Unable to authorize playback'))
                              .finally(() => setPlaybackLoading(false));
                          }
                        }}
                        className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Authorize Playback</span>
                      </button>
                    </div>
                  )
                ) : isDirectVideoFile(currentMedia) ? (
                  <video
                    src={currentMedia}
                    controls
                    autoPlay
                    className="w-full h-full object-cover"
                  />
                ) : currentMedia ? (
                  <iframe
                    key={activeLesson?.id}
                    src={getEmbedVideoUrl(currentMedia)}
                    title={activeLesson.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : (
                  <div className="w-full h-full bg-[#081526] flex flex-col items-center justify-center p-8 text-center text-slate-300">
                    <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3 shadow-lg">
                      <BookOpen className="w-7 h-7" />
                    </div>
                    <h4 className="text-base font-bold text-white">Lecture Notes & Interactive Material</h4>
                    <p className="text-xs text-slate-400 mt-2 max-w-md leading-relaxed">
                      This lecture is structured for deep reading, system architecture study, and task defense. Explore the technical documentation and complete the assignment below.
                    </p>
                  </div>
                )
              ) : (
                /* Locked Lesson Screen with Sleek CTA */
                <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-blue-500/40 flex items-center justify-center text-amber-400 shadow-xl">
                    <Lock className="w-8 h-8" />
                  </div>
                  <div className="space-y-1.5 max-w-md">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-950/80 px-2.5 py-1 rounded-full border border-amber-800">
                      Enrolled Only Lecture
                    </span>
                    <h3 className="text-xl font-bold text-white pt-1">{activeLesson?.title}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      This lecture and its practical code evaluations are reserved for enrolled students of Aaroha Institute.
                    </p>
                  </div>
                  <button
                    onClick={() => onEnroll(course)}
                    className="bg-[#0056D2] hover:bg-blue-600 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-97 cursor-pointer"
                  >
                    <Award className="w-4 h-4" />
                    <span>Enroll Now to Unlock All Lectures & Defense Labs</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Actions Bar (Below Video Player) */}
            <div className="flex flex-wrap items-center justify-between gap-3 py-2 border-b border-[#1b3d63] text-xs text-slate-300">
              {/* Left Buttons: Like, Views, Report, Duration */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Like Button */}
                <button
                  onClick={handleLike}
                  className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer text-xs font-semibold ${
                    isLiked
                      ? 'bg-blue-600/30 border-blue-400 text-[#38bdf8]'
                      : 'bg-[#0F223A] hover:bg-[#163356] border-[#1b3d63] text-slate-300'
                  }`}
                  title="Like this lecture"
                >
                  <ThumbsUp className={`w-3.5 h-3.5 ${isLiked ? 'fill-current text-[#38bdf8]' : 'text-slate-400'}`} />
                  <span>{likeCount}</span>
                </button>

                {/* View Count */}
                <div className="bg-[#0F223A] border border-[#1b3d63] px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  <span>{course.enrolled_count ? (course.enrolled_count * 2 + 180).toLocaleString() : '604'}</span>
                </div>

                {/* Report Button */}
                <button
                  onClick={() => alert('Issue reported to curriculum faculty.')}
                  className="bg-[#0F223A] hover:bg-[#163356] border border-[#1b3d63] px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer text-xs text-slate-300 font-medium"
                >
                  <Flag className="w-3.5 h-3.5 text-slate-400" />
                  <span>Report</span>
                </button>

                {/* Duration Pill */}
                <div className="bg-[#0F223A] border border-[#1b3d63] px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{activeLesson?.duration || '15 min'}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </div>
              </div>

              {/* Right Controls: Mark Complete & Next Lesson */}
              <div className="flex items-center gap-2">
                {isEnrolled && activeLesson && (
                  <button
                    onClick={() => handleToggleComplete(activeLesson.id)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                      isLessonCompleted(activeLesson.id)
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isLessonCompleted(activeLesson.id) ? 'Completed' : 'Mark Complete'}</span>
                  </button>
                )}

                {completedCount >= totalLessonsCount && totalLessonsCount > 0 && (
                  <button
                    onClick={() => (onCourseComplete ? onCourseComplete(course) : onBack())}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    title="All modules completed. Return to student dashboard."
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span className="hidden sm:inline">Return to Dashboard</span>
                    <span className="sm:hidden">Dashboard</span>
                  </button>
                )}

                {hasPrevLesson && (
                  <button
                    onClick={handlePrevLesson}
                    className="bg-[#0F223A] hover:bg-[#163356] border border-[#1b3d63] px-3 py-1.5 rounded-lg text-xs font-bold text-slate-200 transition-colors cursor-pointer"
                    title="Previous Lesson"
                  >
                    Previous
                  </button>
                )}

                {hasNextLesson && (
                  <button
                    onClick={handleNextLesson}
                    className="bg-[#0056D2] hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    title="Next Lesson"
                  >
                    <span>Next Lesson</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Big Prominent Lesson Heading */}
            <div className="pt-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-snug">
                {activeLesson?.title || course.title}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Part of <span className="text-slate-200 font-semibold">{course.title}</span> · Accredited by Aaroha Institute
              </p>
            </div>

            {/* Lesson Content / Tabs Section */}
            <div className="bg-[#0B1A2F] rounded-2xl border border-[#1b3d63] overflow-hidden shadow-lg mt-4">
              {/* Tab Navigation */}
              <div className="flex items-center gap-2 px-4 pt-3 border-b border-[#1b3d63] bg-[#081526]/80 text-xs font-bold overflow-x-auto scrollbar-none">
                <button
                  onClick={() => setActiveTab('notes')}
                  className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                    activeTab === 'notes'
                      ? 'border-[#0056D2] text-[#38bdf8]'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Lecture Notes & Foundations</span>
                </button>

                {currentModuleTasks.length > 0 && (
                  <button
                    onClick={() => setActiveTab('tasks')}
                    className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                      activeTab === 'tasks'
                        ? 'border-[#0056D2] text-[#38bdf8]'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Hands-On Assignments ({currentModuleTasks.length})</span>
                  </button>
                )}

                <button
                  onClick={() => setActiveTab('instructor')}
                  className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                    activeTab === 'instructor'
                      ? 'border-[#0056D2] text-[#38bdf8]'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Faculty & Program Info</span>
                </button>
              </div>

              {/* Tab 1: Notes & Overview */}
              {activeTab === 'notes' && (
                <div className="p-5 space-y-4 text-xs text-slate-300 leading-relaxed">
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-white">Summary & Learning Objectives</h4>
                    <p className="text-slate-300">
                      {activeLesson?.content_body || activeLesson?.summary || course.description}
                    </p>
                  </div>

                  <div className="bg-[#0e213b] p-4 rounded-xl border border-[#1b3d63] space-y-2">
                    <h5 className="font-bold text-white text-xs flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#38bdf8]" />
                      <span>Production Takeaways & Applied Systems Architecture</span>
                    </h5>
                    <ul className="list-disc list-inside space-y-1 text-slate-300">
                      <li>Understand key design trade-offs and edge failure modes covered in this lecture.</li>
                      <li>Review benchmark implementations aligned with production distributed engineering standards.</li>
                      <li>Verify zero-trust security postures and telemetry observability patterns.</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Tab 2: Assignments & Hands-on Submissions */}
              {activeTab === 'tasks' && currentModuleTasks.length > 0 && (
                <div className="p-5 space-y-5 text-xs">
                  {currentModuleTasks.map(task => {
                    const submission = (taskSubmissions || []).find(s => s.task_id === task.id);
                    return (
                      <div key={task.id} className="bg-[#0e213b] p-4 rounded-xl border border-[#1b3d63] space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800">
                              Module Evaluated Defense
                            </span>
                            <h4 className="text-sm font-bold text-white mt-1">{task.title}</h4>
                            <p className="text-slate-300 text-xs mt-1 leading-relaxed">{task.description}</p>
                          </div>
                          {submission && (
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border flex-shrink-0 ${
                              submission.status === 'graded' 
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800' 
                                : 'bg-amber-950/80 text-amber-300 border-amber-800'
                            }`}>
                              {submission.status === 'graded' ? 'Accredited / Passed' : 'Pending Review'}
                            </span>
                          )}
                        </div>

                        {/* Submission Form (Enrolled Students Only) */}
                        {isEnrolled ? (
                          <form onSubmit={(e) => handleTaskSubmit(e, task.id)} className="space-y-3 pt-2 border-t border-[#1b3d63]">
                            <div>
                              <label className="font-semibold text-slate-300 block mb-1">Defense Solution Notes / Implementation Rationale:</label>
                              <textarea
                                rows={3}
                                required
                                value={submissionText}
                                onChange={(e) => setSubmissionText(e.target.value)}
                                placeholder="Detail your architecture choices, benchmarks, and edge failover handling..."
                                className="w-full p-2.5 bg-[#081526] border border-[#1b3d63] rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#0056D2] focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="font-semibold text-slate-300 block mb-1">Artifact / Repository Link:</label>
                              <input
                                type="url"
                                value={attachmentUrl}
                                onChange={(e) => setAttachmentUrl(e.target.value)}
                                placeholder="https://github.com/org/repo or https://aaroha-inc.com/artifacts/rfc.pdf"
                                className="w-full p-2.5 bg-[#081526] border border-[#1b3d63] rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#0056D2] focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <div className="flex items-center justify-between pt-1">
                              {submitSuccess && (
                                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                                  <Check className="w-4 h-4 text-emerald-400" /> Solution submitted for faculty review.
                                </span>
                              )}
                              <button
                                type="submit"
                                disabled={isSubmitting}
                                className="ml-auto bg-[#0056D2] hover:bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>{isSubmitting ? 'Submitting...' : 'Submit Assignment'}</span>
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="p-3 bg-blue-950/40 rounded-lg border border-blue-900 flex items-center justify-between text-xs">
                            <span className="text-slate-300">Enroll to submit coursework and receive verified faculty evaluations.</span>
                            <button
                              onClick={() => onEnroll(course)}
                              className="text-[#38bdf8] font-bold hover:underline ml-3 flex-shrink-0"
                            >
                              Enroll Now
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tab 3: Instructor & Program Details */}
              {activeTab === 'instructor' && (
                <div className="p-5 space-y-4 text-xs">
                  {course.instructor && (
                    <div className="flex items-start gap-4 bg-[#0e213b] p-4 rounded-xl border border-[#1b3d63]">
                      <img
                        src={course.instructor.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                        alt={course.instructor.name}
                        onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'; }}
                        className="w-14 h-14 rounded-full object-cover ring-2 ring-blue-500/50 flex-shrink-0"
                      />
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white">{course.instructor.name}</h4>
                        <p className="text-[#38bdf8] font-semibold">{course.instructor.title}</p>
                        <p className="text-slate-300">{course.instructor.department}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-3 bg-[#0e213b] rounded-xl border border-[#1b3d63]">
                      <div className="text-slate-400 text-[10px] uppercase font-bold">Target Level</div>
                      <div className="text-white font-bold text-xs mt-1">{course.level || 'Principal Systems'}</div>
                    </div>
                    <div className="p-3 bg-[#0e213b] rounded-xl border border-[#1b3d63]">
                      <div className="text-slate-400 text-[10px] uppercase font-bold">Duration</div>
                      <div className="text-white font-bold text-xs mt-1">{course.duration || '8 Weeks'}</div>
                    </div>
                    <div className="p-3 bg-[#0e213b] rounded-xl border border-[#1b3d63]">
                      <div className="text-slate-400 text-[10px] uppercase font-bold">Total Lessons</div>
                      <div className="text-white font-bold text-xs mt-1">{totalLessonsCount} Lectures</div>
                    </div>
                    <div className="p-3 bg-[#0e213b] rounded-xl border border-[#1b3d63]">
                      <div className="text-slate-400 text-[10px] uppercase font-bold">Accreditation</div>
                      <div className="text-emerald-400 font-bold text-xs mt-1">Verified Certificate</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: Course Title, Progress Bar & Module Timeline Playlist (lg:col-span-4) */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Course Title */}
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight leading-tight">
                {course.title}
              </h2>
            </div>

            {/* Course Progress Section */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span>Course Progress</span>
                <span className="font-bold text-emerald-400">{progressPct}% Completed</span>
              </div>
              {/* Progress Bar Track & Vibrant Green Fill */}
              <div className="w-full h-2 rounded-full bg-[#071322] border border-[#1b3d63] overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${Math.max(progressPct, isEnrolled ? 4 : 0)}%` }}
                />
              </div>
            </div>

            {/* Module Accordion Playlist Card */}
            <div className="rounded-2xl bg-[#0B1A2F] border border-[#1b3d63] p-4 shadow-xl space-y-4">
              {(course.modules || []).map((mod, modIdx) => {
                const isOpen = !!expandedModules[modIdx];
                const modLessons = mod.lessons || [];
                const modLessonsCount = modLessons.length;

                return (
                  <div key={mod.id || modIdx} className="space-y-2">
                    {/* Module Accordion Header */}
                    <button
                      onClick={() => toggleModule(modIdx)}
                      className="w-full flex items-center justify-between text-left p-2.5 rounded-xl hover:bg-[#132d4e] transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Blue Module Circle Icon */}
                        <div className="w-6 h-6 rounded-full bg-[#0056D2] text-white flex items-center justify-center text-xs font-bold shadow-xs flex-shrink-0">
                          {modIdx + 1}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                            {mod.title.startsWith('Module') ? mod.title : `Module ${modIdx + 1}: ${mod.title}`}
                          </h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {modLessonsCount} Lessons · {mod.duration || '2 hr 15 min'}
                          </p>
                        </div>
                      </div>

                      <div className="text-slate-400 group-hover:text-slate-200 transition-colors pl-2 flex-shrink-0">
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>

                    {/* Lesson Timeline (When Expanded) */}
                    {isOpen && (
                      <div className="relative pl-6 space-y-2.5 before:absolute before:left-[17px] before:top-2 before:bottom-3 before:w-0.5 before:bg-[#1b3d63]">
                        {modLessons.map((lesson) => {
                          const isCurrent = activeLesson?.id === lesson.id;
                          const completed = isLessonCompleted(lesson.id);
                          const locked = !canPlayLesson(lesson);
                          const lessonMedia = lesson.media_url || lesson.video_url || lesson.bunny_video_id || '';

                          return (
                            <div
                              key={lesson.id}
                              onClick={() => {
                                const full = allLessons.find(l => l.id === lesson.id) || {
                                  ...lesson,
                                  video_url: lessonMedia,
                                  media_url: lessonMedia
                                };
                                setActiveLesson(full);
                              }}
                              className={`relative group rounded-xl p-2 flex items-center gap-3 transition-all cursor-pointer select-none ${
                                isCurrent
                                  ? 'bg-[#132d4e] border-2 border-[#0056D2] shadow-md'
                                  : 'bg-[#0F223A]/80 hover:bg-[#153154] border border-[#1b3d63]'
                              }`}
                            >
                              {/* Timeline Node on the Left Vertical Line */}
                              <div className="absolute -left-[19px] flex items-center justify-center">
                                {completed ? (
                                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                                    <Check className="w-3 h-3 stroke-[3]" />
                                  </div>
                                ) : isCurrent ? (
                                  <div className="w-5 h-5 rounded-full bg-blue-600 ring-4 ring-blue-900/60 flex items-center justify-center shadow-xs">
                                    <Play className="w-2.5 h-2.5 text-white fill-current" />
                                  </div>
                                ) : (
                                  <div className="w-4 h-4 rounded-full bg-[#0B1A2F] border-2 border-slate-600"></div>
                                )}
                              </div>

                              {/* 16:9 Thumbnail Preview */}
                              <div className="relative w-16 h-10 sm:w-20 sm:h-11 rounded-lg overflow-hidden bg-slate-900 border border-[#1b3d63] flex-shrink-0">
                                <LessonThumbnailItem
                                  lesson={lesson}
                                  courseThumbnail={course?.thumbnail_url || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80'}
                                />
                                
                                {locked && (
                                  <div className="absolute inset-0 bg-slate-950/75 flex items-center justify-center text-amber-300">
                                    <Lock className="w-3.5 h-3.5" />
                                  </div>
                                )}

                                {/* Duration Badge in Thumbnail */}
                                <div className="absolute bottom-0.5 right-0.5 bg-black/80 text-[9px] font-bold px-1 py-0.2 rounded text-white">
                                  {lesson.duration || '5m'}
                                </div>
                              </div>

                              {/* Lesson Title & Status */}
                              <div className="flex-1 min-w-0 space-y-0.5">
                                <h4 className={`text-xs font-bold line-clamp-2 leading-snug transition-colors ${
                                  isCurrent ? 'text-[#38bdf8]' : 'text-slate-200 group-hover:text-white'
                                }`}>
                                  {lesson.title}
                                </h4>

                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {Boolean(lesson.is_free_preview) ? (
                                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-800">
                                      Free Preview
                                    </span>
                                  ) : null}

                                  {locked && (
                                    <span className="text-[9px] font-medium text-slate-400 flex items-center gap-1">
                                      <Lock className="w-2.5 h-2.5 text-slate-400" /> Enrolled Only
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
