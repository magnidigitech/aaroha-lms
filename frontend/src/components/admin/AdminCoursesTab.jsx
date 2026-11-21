import React, { useState } from 'react';
import {
  BookOpen, Plus, Edit3, Trash2, Award, FileText, GraduationCap,
  Sparkles, CheckCircle2, Video, Check, Layers, ListTodo, AlertCircle,
  Eye, EyeOff, Archive, X, Lock, Unlock, RotateCcw, Play
} from 'lucide-react';
import api from '../../apiService';
import CourseCardBadge from '../CourseCardBadge';
import CourseModal from './CourseModal';
import ModuleModal from './ModuleModal';
import LectureModal from './LectureModal';
import AssignmentModal from './AssignmentModal';
import DeleteConfirmModal from './DeleteConfirmModal';

export default function AdminCoursesTab({
  courses = [],
  faculty = [],
  onAddCourse,
  onUpdateCourse,
  onDeleteCourse,
  onAddModule,
  onUpdateModule,
  onDeleteModule,
  onAddLesson,
  onUpdateLesson,
  onDeleteLesson,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onViewCourse,
  currentUser
}) {
  // Modal dialog states
  const [courseModal, setCourseModal] = useState({ isOpen: false, initialData: null, initialTab: 'syllabus' });
  const [moduleModal, setModuleModal] = useState({ isOpen: false, courseId: null, initialData: null });
  const [lectureModal, setLectureModal] = useState({ isOpen: false, courseId: null, moduleId: null, initialData: null });
  const [assignmentModal, setAssignmentModal] = useState({ isOpen: false, courseId: null, moduleId: null, initialData: null });
  const [blockedDeleteCourse, setBlockedDeleteCourse] = useState(null);

  // Per-course card active pillar tab state ('syllabus' | 'outcomes' | 'about' | 'faculty')
  const [courseCardTabs, setCourseCardTabs] = useState({});
  const setCourseCardTab = (courseId, tab) => {
    setCourseCardTabs(prev => ({ ...prev, [courseId]: tab }));
  };

  // Publish / Unpublish Toggle
  const handleTogglePublish = async (course) => {
    if (onUpdateCourse) {
      await onUpdateCourse(course.id, { is_published: !course.is_published });
    }
  };

  // Archive Course (Safe Archival preserving history)
  const handleArchiveCourse = async (course) => {
    try {
      await api.adminArchiveCourse(course.id);
      if (onUpdateCourse) await onUpdateCourse(course.id, { is_published: false });
    } catch (err) {
      alert('Failed to archive course: ' + err.message);
    }
  };

  const triggerArchiveCourse = (course) => {
    setDeleteModal({
      isOpen: true,
      actionType: 'archive',
      title: 'Archive Course',
      itemName: course.title,
      itemType: 'Course',
      affectedChildren: 'This will hide the course from the public directory and new student enrollment selectors.',
      studentImpact: 'Existing student enrollments and cohort batches remain active and valid. Enrolled learners retain full access to their materials and credentials.',
      confirmButtonText: 'Archive Course',
      onConfirm: async () => {
        await handleArchiveCourse(course);
      }
    });
  };

  // Delete confirmation modal state
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    title: '',
    itemName: '',
    itemType: '',
    affectedChildren: '',
    studentImpact: '',
    confirmButtonText: 'Confirm Archive',
    onConfirm: async () => {}
  });

  // Close Task Modal
  const [closeTaskModal, setCloseTaskModal] = useState({
    isOpen: false,
    task: null,
    reason: 'Submission deadline reached',
    isSubmitting: false
  });

  const handleToggleTaskSubmissionStatus = async (task, targetStatus) => {
    if (targetStatus === 'closed') {
      setCloseTaskModal({
        isOpen: true,
        task,
        reason: 'Submission deadline reached',
        isSubmitting: false
      });
    } else {
      try {
        await api.adminToggleTaskStatus(task.id, { status: 'published' });
        if (onUpdateCourse) await onUpdateCourse();
      } catch (err) {
        alert('Failed to reopen task submissions: ' + err.message);
      }
    }
  };

  const handleConfirmCloseTask = async () => {
    if (!closeTaskModal.task) return;
    try {
      setCloseTaskModal(prev => ({ ...prev, isSubmitting: true }));
      await api.adminToggleTaskStatus(closeTaskModal.task.id, {
        status: 'closed',
        reason: closeTaskModal.reason || 'Closed by course administrator'
      });
      setCloseTaskModal({ isOpen: false, task: null, reason: 'Submission deadline reached', isSubmitting: false });
      if (onUpdateCourse) await onUpdateCourse();
    } catch (err) {
      alert('Failed to close submissions: ' + err.message);
      setCloseTaskModal(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleRestoreCourse = async (courseId) => {
    try {
      await api.adminRestoreCourse(courseId);
      if (onUpdateCourse) await onUpdateCourse(courseId, { is_published: true });
    } catch (err) {
      alert('Failed to restore program: ' + err.message);
    }
  };

  // Deletion Triggers with explicit impact explanations and dependency checks
  const triggerDeleteCourse = (course) => {
    const batchesCount = Number(course.batches_count) || 0;
    const enrollmentsCount = Number(course.enrollments_count) || 0;

    // Check dependent records: Block delete if any active batches or student enrollments exist
    if (batchesCount > 0 || enrollmentsCount > 0) {
      setBlockedDeleteCourse({
        course,
        batchesCount,
        enrollmentsCount
      });
      return;
    }

    const modCount = course.modules?.length || 0;
    const lessonCount = (course.modules || []).reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
    const taskCount = (course.modules || []).reduce((acc, m) => acc + (m.tasks?.length || 0), 0);

    setDeleteModal({
      isOpen: true,
      actionType: 'delete',
      title: 'Permanently Delete Course',
      itemName: course.title,
      itemType: 'Course',
      affectedChildren: `This will permanently remove the course and its ${modCount} module(s), ${lessonCount} lecture(s), and ${taskCount} assignment(s).`,
      studentImpact: 'Zero dependencies verified: No cohort batches, student enrollments, or certificates depend on this course. The record will be permanently deleted.',
      confirmButtonText: 'Permanently Delete',
      onConfirm: async () => {
        if (onDeleteCourse) await onDeleteCourse(course.id);
      }
    });
  };

  const triggerDeleteModule = (courseId, module) => {
    const lessonCount = module.lessons?.length || 0;
    const taskCount = module.tasks?.length || 0;

    setDeleteModal({
      isOpen: true,
      title: 'Archive Syllabus Module',
      itemName: module.title,
      itemType: 'Module',
      affectedChildren: `This will archive ${lessonCount} lecture(s) and ${taskCount} assignment(s) within this module.`,
      studentImpact: 'Contained lectures and projects will be hidden from student syllabus views and future playback requests. Historical student completion progress is preserved.',
      confirmButtonText: 'Archive Module',
      onConfirm: async () => {
        if (onDeleteModule) await onDeleteModule(courseId, module.id);
      }
    });
  };

  const triggerDeleteLecture = (courseId, moduleId, lesson) => {
    const isBunny = lesson.video_provider === 'bunny_stream';

    setDeleteModal({
      isOpen: true,
      title: 'Archive Lecture',
      itemName: lesson.title,
      itemType: 'Lecture',
      affectedChildren: isBunny ? 'The underlying video on Bunny Stream will NOT be deleted.' : '',
      studentImpact: 'New student playback requests will be rejected. Historical completion records for students who finished this lecture remain preserved.',
      confirmButtonText: 'Archive Lecture',
      onConfirm: async () => {
        if (onDeleteLesson) await onDeleteLesson(courseId, moduleId, lesson.id);
      }
    });
  };

  const triggerDeleteTask = (courseId, moduleId, task) => {
    setDeleteModal({
      isOpen: true,
      title: 'Archive Assignment',
      itemName: task.title,
      itemType: 'Project/Assignment',
      affectedChildren: '',
      studentImpact: 'The project deliverable will be removed from future syllabus requirements. Existing student submissions, awarded scores, and faculty feedback are preserved.',
      confirmButtonText: 'Archive Assignment',
      onConfirm: async () => {
        if (onDeleteTask) await onDeleteTask(courseId, moduleId, task.id);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Courses</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage course curriculum, syllabus modules, video lectures, and technical assignments.
          </p>
        </div>

        <button
          onClick={() => setCourseModal({ isOpen: true, initialData: null, initialTab: 'syllabus' })}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0a7cb3] hover:bg-[#086491] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Course</span>
        </button>
      </div>

      {courses.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No programs in curriculum directory</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
            Begin structuring executive education by authoring your first technical program.
          </p>
          <button
            onClick={() => setCourseModal({ isOpen: true, initialData: null, initialTab: 'syllabus' })}
            className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-blue-700"
          >
            Create Program
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {courses.map((course) => (
            <div key={course.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all hover:border-slate-300">
              {/* Course Header Banner */}
              <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/80 border-b border-slate-200">
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <img
                    src={course.thumbnail_url || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=200&q=80'}
                    alt={course.title}
                    onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=200&q=80'; }}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                        {course.title}
                      </h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                        course.is_published ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {course.is_published ? 'Published' : 'Draft'}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-md shrink-0">
                        {course.category}
                      </span>
                      {course.badge_text && course.badge_text.trim() && (
                        <CourseCardBadge
                          text={course.badge_text}
                          color={course.badge_color}
                          course={course}
                        />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{course.description}</p>
                  </div>
                </div>

                {/* Course Controls */}
                <div className="flex items-center gap-2 self-end md:self-auto shrink-0 flex-wrap">
                  {/* Publish / Unpublish Toggle */}
                  <button
                    type="button"
                    onClick={() => handleTogglePublish(course)}
                    className={`px-2.5 py-1.5 border text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                      course.is_published
                        ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                        : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800'
                    }`}
                    title={course.is_published ? 'Unpublish course from student directory' : 'Publish course to directory'}
                  >
                    {course.is_published ? <EyeOff className="w-3.5 h-3.5 text-slate-500" /> : <Eye className="w-3.5 h-3.5 text-emerald-600" />}
                    <span>{course.is_published ? 'Unpublish' : 'Publish'}</span>
                  </button>

                  {/* Archive / Restore Course */}
                  {course.is_published ? (
                    <button
                      type="button"
                      onClick={() => triggerArchiveCourse(course)}
                      className="px-2.5 py-1.5 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-700 hover:text-amber-800 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Archive Course (hides from active listings while preserving all historical records)"
                    >
                      <Archive className="w-3.5 h-3.5 text-amber-600" />
                      <span className="hidden sm:inline">Archive</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRestoreCourse(course.id)}
                      className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Restore Program (re-enables curriculum visibility)"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                      <span className="hidden sm:inline">Restore</span>
                    </button>
                  )}

                  {/* View Course (Open Course Interface without Enrollment) */}
                  {onViewCourse && (
                    <button
                      type="button"
                      onClick={() => onViewCourse(course)}
                      className="px-3 py-1.5 bg-[#0A7CB3] hover:bg-[#086491] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="View Course & Video Lectures in Course Interface"
                      aria-label={`View Course: ${course.title}`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>View Course</span>
                    </button>
                  )}

                  {/* Edit Course */}
                  <button
                    type="button"
                    onClick={() => setCourseModal({ isOpen: true, initialData: course, initialTab: courseCardTabs[course.id] || 'syllabus' })}
                    className="px-3 py-1.5 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Edit Course specifications"
                    aria-label={`Edit Course: ${course.title}`}
                  >
                    <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Edit</span>
                  </button>

                  {/* Add Module */}
                  <button
                    type="button"
                    onClick={() => setModuleModal({ isOpen: true, courseId: course.id, initialData: null })}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-blue-600" />
                    <span>Module</span>
                  </button>

                  {/* Delete Course (Only if no dependent batches or enrollments) */}
                  <button
                    type="button"
                    onClick={() => triggerDeleteCourse(course)}
                    className="px-2.5 py-1.5 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-300 text-slate-600 hover:text-red-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                    title="Delete Course (Permitted only when no dependent batches or students exist)"
                    aria-label={`Delete Course: ${course.title}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                </div>
              </div>

              {/* Course Card 4-Pillar Tabs Navigation */}
              {(() => {
                const activeCardTab = courseCardTabs[course.id] || 'syllabus';
                const modCount = course.modules?.length || 0;
                const outcomes = Array.isArray(course.what_you_will_learn) && course.what_you_will_learn.length > 0
                  ? course.what_you_will_learn
                  : [
                      'Master enterprise infrastructure architectures and distributed system invariants',
                      'Complete faculty-evaluated deliverable projects and real-time defense benchmarks'
                    ];
                const skills = Array.isArray(course.skills) && course.skills.length > 0
                  ? course.skills
                  : ['Cloud Architecture', 'Distributed Systems'];
                const aboutText = course.about || course.description || 'Comprehensive curriculum calibrated for principal architects and high-throughput systems engineers.';
                const prerequisitesText = course.prerequisites || 'Distributed Systems Foundations & Linux Systems Programming';
                const instructor = course.instructor || {
                  name: course.instructor_name || 'Faculty Member',
                  title: course.instructor_title || 'Curriculum Director',
                  department: course.instructor_department || 'Aaroha Institute of Technology',
                  avatar: course.instructor_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
                  bio: course.instructor_bio || 'Experienced faculty member and systems architect delivering industry-calibrated technical education.',
                  rating: 4.94,
                  students: '25,000+'
                };

                return (
                  <div>
                    {/* 4 Tabs Bar */}
                    <div className="flex border-b border-slate-200 bg-slate-50/70 px-4 sm:px-6 gap-3 sm:gap-6 overflow-x-auto text-xs sm:text-sm font-semibold">
                      <button
                        type="button"
                        onClick={() => setCourseCardTab(course.id, 'syllabus')}
                        className={`py-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                          activeCardTab === 'syllabus'
                            ? 'border-[#0A7CB3] text-[#0A7CB3]'
                            : 'border-transparent text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Modules & Syllabus ({modCount})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCourseCardTab(course.id, 'outcomes')}
                        className={`py-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                          activeCardTab === 'outcomes'
                            ? 'border-[#0A7CB3] text-[#0A7CB3]'
                            : 'border-transparent text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>What You'll Learn</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCourseCardTab(course.id, 'about')}
                        className={`py-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                          activeCardTab === 'about'
                            ? 'border-[#0A7CB3] text-[#0A7CB3]'
                            : 'border-transparent text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>About & Prerequisites</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCourseCardTab(course.id, 'faculty')}
                        className={`py-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                          activeCardTab === 'faculty'
                            ? 'border-[#0A7CB3] text-[#0A7CB3]'
                            : 'border-transparent text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <GraduationCap className="w-3.5 h-3.5" />
                        <span>Faculty & Instructors</span>
                      </button>
                    </div>

                    {/* TAB 1: MODULES & SYLLABUS */}
                    {activeCardTab === 'syllabus' && (
                      <div className="p-4 sm:p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
                          <div>
                            <h4 className="text-xs font-bold text-slate-800">Curriculum & Syllabus Structure</h4>
                            <p className="text-[11px] text-slate-500">
                              Organize learning progression into modules, video lectures, and project evaluations.
                            </p>
                          </div>
                          <button
                            onClick={() => setModuleModal({ isOpen: true, courseId: course.id, initialData: null })}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5 text-blue-600" />
                            <span>Add Module</span>
                          </button>
                        </div>

                        {!course.modules || course.modules.length === 0 ? (
                          <div className="p-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 space-y-2">
                            <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
                            <p className="text-xs text-slate-600 font-medium">No modules created yet for this curriculum.</p>
                            <p className="text-[11px] text-slate-400">Add modules and attach lectures or deliverables to populate the syllabus.</p>
                            <button
                              onClick={() => setModuleModal({ isOpen: true, courseId: course.id, initialData: null })}
                              className="mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Create First Module</span>
                            </button>
                          </div>
                        ) : (
                          course.modules.map((mod, modIdx) => (
                            <div key={mod.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                              {/* Module Header */}
                              <div className="px-3.5 sm:px-4 py-2.5 bg-slate-100/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-bold text-slate-800 border-b border-slate-200">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-5 h-5 rounded-md bg-slate-900 text-white text-[10px] flex items-center justify-center font-bold shrink-0">
                                    {modIdx + 1}
                                  </span>
                                  <span className="truncate">{mod.title}</span>
                                  {mod.estimated_time && (
                                    <span className="text-[10px] font-normal text-slate-500 shrink-0 hidden sm:inline">
                                      ({mod.estimated_time})
                                    </span>
                                  )}
                                </div>

                                {/* Module Controls */}
                                <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0 flex-wrap">
                                  <button
                                    onClick={() => setLectureModal({ isOpen: true, courseId: course.id, moduleId: mod.id, initialData: null })}
                                    className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-[11px] font-semibold rounded-md flex items-center gap-1 cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3 text-blue-600" />
                                    <span>Add Lecture</span>
                                  </button>

                                  <button
                                    onClick={() => setAssignmentModal({ isOpen: true, courseId: course.id, moduleId: mod.id, initialData: null })}
                                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 text-[11px] font-semibold rounded-md flex items-center gap-1 cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3 text-indigo-600" />
                                    <span>Add Project</span>
                                  </button>

                                  <button
                                    onClick={() => setModuleModal({ isOpen: true, courseId: course.id, initialData: mod })}
                                    className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold rounded-md flex items-center gap-1 cursor-pointer"
                                    title="Edit Module"
                                    aria-label={`Edit Module: ${mod.title}`}
                                  >
                                    <Edit3 className="w-3 h-3 text-slate-600" />
                                    <span className="hidden sm:inline">Edit</span>
                                  </button>

                                  <button
                                    onClick={() => triggerDeleteModule(course.id, mod)}
                                    className="px-1.5 py-1 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-300 text-red-600 text-[11px] font-semibold rounded-md flex items-center gap-1 cursor-pointer"
                                    title="Archive Module"
                                    aria-label={`Archive Module: ${mod.title}`}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              {/* Lectures & Tasks List */}
                              <div className="p-3 sm:p-4 space-y-2">
                                {(!mod.lessons || mod.lessons.length === 0) && (!mod.tasks || mod.tasks.length === 0) && (
                                  <p className="text-[11px] text-slate-400 italic py-1">
                                    No lectures or assignments added yet.
                                  </p>
                                )}

                                {mod.lessons?.map((l) => (
                                  <div 
                                    key={l.id} 
                                    className="py-2 px-2.5 rounded-lg hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-700 border-b border-slate-100 last:border-b-0"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <Video className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                      <span className="font-semibold text-slate-900 truncate">{l.title}</span>
                                      {l.video_provider === 'bunny_stream' && (
                                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                                          Bunny Stream
                                        </span>
                                      )}
                                      {l.is_preview ? (
                                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                          Free Preview
                                        </span>
                                      ) : null}
                                      {l.duration_minutes ? (
                                        <span className="text-[10px] text-slate-400 shrink-0">
                                          • {l.duration_minutes} min
                                        </span>
                                      ) : null}
                                    </div>

                                    <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                                      {onViewCourse && (
                                        <button
                                          type="button"
                                          onClick={() => onViewCourse(course, l.id)}
                                          className="p-1 hover:bg-blue-50 text-[#0A7CB3] rounded transition-colors cursor-pointer"
                                          title="Play Lecture in Course Interface"
                                          aria-label={`Play Lecture: ${l.title}`}
                                        >
                                          <Play className="w-3 h-3 fill-current" />
                                        </button>
                                      )}
                                      <button
                                        onClick={() => setLectureModal({ isOpen: true, courseId: course.id, moduleId: mod.id, initialData: l })}
                                        className="p-1 hover:bg-slate-200/70 rounded text-slate-600 transition-colors cursor-pointer"
                                        title="Edit Lecture"
                                        aria-label={`Edit Lecture: ${l.title}`}
                                      >
                                        <Edit3 className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => triggerDeleteLecture(course.id, mod.id, l)}
                                        className="p-1 hover:bg-red-50 text-red-600 rounded transition-colors cursor-pointer"
                                        title="Archive Lecture"
                                        aria-label={`Archive Lecture: ${l.title}`}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}

                                {mod.tasks?.map((t) => (
                                  <div 
                                    key={t.id} 
                                    className="py-2 px-2.5 rounded-lg bg-indigo-50/40 hover:bg-indigo-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-indigo-950 border border-indigo-100/60"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <ListTodo className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                      <span className="font-bold text-slate-900 truncate">{t.title}</span>
                                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-indigo-100 text-indigo-800 shrink-0">
                                        Pass: {t.passing_score || 70}/100
                                      </span>
                                      {t.status === 'closed' ? (
                                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-100 text-rose-800 shrink-0">
                                          Closed
                                        </span>
                                      ) : (
                                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                                          Open
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                                      {t.status === 'closed' ? (
                                        <button
                                          type="button"
                                          onClick={() => handleToggleTaskSubmissionStatus(t, 'published')}
                                          className="p-1 hover:bg-emerald-100 text-emerald-700 rounded transition-colors cursor-pointer"
                                          title="Reopen Submissions"
                                          aria-label={`Reopen Submissions for: ${t.title}`}
                                        >
                                          <Unlock className="w-3 h-3" />
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => handleToggleTaskSubmissionStatus(t, 'closed')}
                                          className="p-1 hover:bg-amber-100 text-amber-700 rounded transition-colors cursor-pointer"
                                          title="Close Submissions"
                                          aria-label={`Close Submissions for: ${t.title}`}
                                        >
                                          <Lock className="w-3 h-3" />
                                        </button>
                                      )}
                                      <button
                                        onClick={() => setAssignmentModal({ isOpen: true, courseId: course.id, moduleId: mod.id, initialData: t })}
                                        className="p-1 hover:bg-indigo-100 text-indigo-700 rounded transition-colors cursor-pointer"
                                        title="Edit Project"
                                        aria-label={`Edit Project: ${t.title}`}
                                      >
                                        <Edit3 className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => triggerDeleteTask(course.id, mod.id, t)}
                                        className="p-1 hover:bg-red-50 text-red-600 rounded transition-colors cursor-pointer"
                                        title="Archive Project"
                                        aria-label={`Archive Project: ${t.title}`}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* TAB 2: WHAT YOU'LL LEARN */}
                    {activeCardTab === 'outcomes' && (
                      <div className="p-4 sm:p-6 space-y-5 animate-in fade-in duration-150">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-800">What You'll Learn & Acquired Competencies</h4>
                            <p className="text-[11px] text-slate-500">
                              Presented on the public brochure and syllabus to outline executive learning milestones.
                            </p>
                          </div>
                          <button
                            onClick={() => setCourseModal({ isOpen: true, initialData: course, initialTab: 'outcomes' })}
                            className="px-3 py-1.5 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs self-start sm:self-auto shrink-0"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                            <span>Edit Outcomes & Skills</span>
                          </button>
                        </div>

                        <div className="bg-blue-50/50 border border-blue-200/70 rounded-2xl p-4 sm:p-5 space-y-3">
                          <h5 className="text-xs font-bold text-blue-950 uppercase tracking-wide flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                            <span>Executive Learning Outcomes ({outcomes.length})</span>
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {outcomes.map((item, idx) => (
                              <div key={idx} className="flex items-start gap-2.5 p-2.5 bg-white rounded-xl border border-blue-100 shadow-2xs">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <span className="text-xs text-slate-700 leading-relaxed font-medium">{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h5 className="text-xs font-bold text-slate-800">Skills Gained ({skills.length}):</h5>
                          <div className="flex flex-wrap gap-2">
                            {skills.map((skill, idx) => (
                              <span 
                                key={idx}
                                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 3: ABOUT & PREREQUISITES */}
                    {activeCardTab === 'about' && (
                      <div className="p-4 sm:p-6 space-y-5 animate-in fade-in duration-150">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-800">Program Overview & Entry Prerequisites</h4>
                            <p className="text-[11px] text-slate-500">
                              Comprehensive architectural abstract, target seniority, and prerequisite baseline for applicants.
                            </p>
                          </div>
                          <button
                            onClick={() => setCourseModal({ isOpen: true, initialData: course, initialTab: 'about' })}
                            className="px-3 py-1.5 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs self-start sm:self-auto shrink-0"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                            <span>Edit About & Prerequisites</span>
                          </button>
                        </div>

                        <div className="p-5 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Program Abstract</span>
                          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                            {aboutText}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Prerequisites</span>
                            <p className="text-xs font-bold text-slate-900">{prerequisitesText}</p>
                          </div>
                          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Seniority</span>
                            <p className="text-xs font-bold text-slate-900">{course.level || 'Advanced Level'}</p>
                          </div>
                          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estimated Duration</span>
                            <p className="text-xs font-bold text-slate-900">{course.duration || '8 Weeks'}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 4: FACULTY & INSTRUCTORS */}
                    {activeCardTab === 'faculty' && (
                      <div className="p-4 sm:p-6 space-y-5 animate-in fade-in duration-150">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-800">Faculty & Instructional Team</h4>
                            <p className="text-[11px] text-slate-500">
                              Curriculum leadership and instructor credentials presented to enrolled candidates.
                            </p>
                          </div>
                          <button
                            onClick={() => setCourseModal({ isOpen: true, initialData: course, initialTab: 'faculty' })}
                            className="px-3 py-1.5 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs self-start sm:self-auto shrink-0"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                            <span>Edit Faculty Details</span>
                          </button>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row items-start gap-5">
                          <img 
                            src={instructor.avatar || '/avatars/3d/memo_1.png'} 
                            alt={instructor.name}
                            className="w-20 h-20 rounded-full object-cover ring-4 ring-blue-50 shrink-0 border border-slate-200 shadow-2xs"
                            onError={(e) => { e.target.src = '/avatars/3d/memo_1.png'; }}
                          />
                          <div className="min-w-0 flex-1 space-y-2">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-base font-bold text-slate-900">{instructor.name}</h4>
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/60 rounded text-[10px] font-bold">
                                  Faculty
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-[#0A7CB3]">{instructor.title}</p>
                              <p className="text-xs text-slate-500">{instructor.department}</p>
                            </div>

                            <p className="text-xs text-slate-600 leading-relaxed">
                              {instructor.bio}
                            </p>

                            <div className="pt-2 flex items-center gap-4 text-xs text-slate-500">
                              <span className="flex items-center gap-1 font-semibold text-slate-700">
                                <span className="text-amber-500">★</span> {instructor.rating || 4.94} Faculty Rating
                              </span>
                              <span>•</span>
                              <span className="font-semibold text-slate-700">
                                {instructor.students || '25,000+'} Learners Mentored
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: Course Authoring & Spec Modal */}
      <CourseModal
        isOpen={courseModal.isOpen}
        initialData={courseModal.initialData}
        initialTab={courseModal.initialTab}
        faculty={faculty}
        currentUser={currentUser}
        onClose={() => setCourseModal({ isOpen: false, initialData: null, initialTab: 'syllabus' })}
        onSave={async (formData) => {
          if (courseModal.initialData) {
            if (onUpdateCourse) await onUpdateCourse(courseModal.initialData.id, formData);
          } else {
            if (onAddCourse) await onAddCourse(formData);
          }
          setCourseModal({ isOpen: false, initialData: null, initialTab: 'syllabus' });
        }}
      />

      {/* MODAL 2: Module Modal */}
      <ModuleModal
        isOpen={moduleModal.isOpen}
        courseId={moduleModal.courseId}
        initialData={moduleModal.initialData}
        onClose={() => setModuleModal({ isOpen: false, courseId: null, initialData: null })}
        onSave={async (arg1, arg2) => {
          let targetCourseId = moduleModal.courseId;
          let payload = arg1;

          if (arg2 !== undefined) {
            if (typeof arg1 === 'object' && arg1 !== null) {
              payload = arg1;
              targetCourseId = arg2 || moduleModal.courseId;
            } else {
              targetCourseId = arg1 || moduleModal.courseId;
              payload = arg2;
            }
          }

          if (moduleModal.initialData) {
            if (onUpdateModule) await onUpdateModule(targetCourseId, moduleModal.initialData.id, payload);
          } else {
            if (onAddModule) await onAddModule(targetCourseId, payload);
          }
          setModuleModal({ isOpen: false, courseId: null, initialData: null });
        }}
      />

      {/* MODAL 3: Lecture Modal (With Bunny Stream Direct Integration) */}
      <LectureModal
        isOpen={lectureModal.isOpen}
        courseId={lectureModal.courseId}
        moduleId={lectureModal.moduleId}
        initialData={lectureModal.initialData}
        onClose={() => setLectureModal({ isOpen: false, courseId: null, moduleId: null, initialData: null })}
        onSave={async (arg1, arg2, arg3) => {
          let targetCourseId = lectureModal.courseId;
          let targetModuleId = lectureModal.moduleId;
          let payload = arg1;

          if (arg3 !== undefined) {
            targetCourseId = arg1 || lectureModal.courseId;
            targetModuleId = arg2 || lectureModal.moduleId;
            payload = arg3;
          } else if (arg2 !== undefined) {
            if (typeof arg1 === 'object' && arg1 !== null) {
              payload = arg1;
              targetModuleId = arg2 || lectureModal.moduleId;
            } else {
              targetModuleId = arg1 || lectureModal.moduleId;
              payload = arg2;
            }
          }

          if (lectureModal.initialData) {
            if (onUpdateLesson) await onUpdateLesson(targetCourseId, targetModuleId, lectureModal.initialData.id, payload);
          } else {
            if (onAddLesson) await onAddLesson(targetCourseId, targetModuleId, payload);
          }
          setLectureModal({ isOpen: false, courseId: null, moduleId: null, initialData: null });
        }}
      />

      {/* MODAL 4: Assignment & Project Modal */}
      <AssignmentModal
        isOpen={assignmentModal.isOpen}
        courseId={assignmentModal.courseId}
        moduleId={assignmentModal.moduleId}
        initialData={assignmentModal.initialData}
        onClose={() => setAssignmentModal({ isOpen: false, courseId: null, moduleId: null, initialData: null })}
        onSave={async (arg1, arg2, arg3) => {
          let targetCourseId = assignmentModal.courseId;
          let targetModuleId = assignmentModal.moduleId;
          let payload = arg1;

          if (arg3 !== undefined) {
            targetCourseId = arg1 || assignmentModal.courseId;
            targetModuleId = arg2 || assignmentModal.moduleId;
            payload = arg3;
          } else if (arg2 !== undefined) {
            if (typeof arg1 === 'object' && arg1 !== null) {
              payload = arg1;
              targetModuleId = arg2 || assignmentModal.moduleId;
            } else {
              targetModuleId = arg1 || assignmentModal.moduleId;
              payload = arg2;
            }
          }

          if (assignmentModal.initialData) {
            if (onUpdateTask) await onUpdateTask(targetCourseId, targetModuleId, assignmentModal.initialData.id, payload);
          } else {
            if (onAddTask) await onAddTask(targetCourseId, targetModuleId, payload);
          }
          setAssignmentModal({ isOpen: false, courseId: null, moduleId: null, initialData: null });
        }}
      />

      {/* MODAL 5: Delete/Archive Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        actionType={deleteModal.actionType || 'archive'}
        title={deleteModal.title}
        itemName={deleteModal.itemName}
        itemType={deleteModal.itemType}
        affectedChildren={deleteModal.affectedChildren}
        studentImpact={deleteModal.studentImpact}
        confirmButtonText={deleteModal.confirmButtonText}
        onClose={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={async () => {
          await deleteModal.onConfirm();
          setDeleteModal(prev => ({ ...prev, isOpen: false }));
        }}
      />

      {/* MODAL 7: Blocked Course Deletion Dialog (Dependent Batches / Students Exist) */}
      {blockedDeleteCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Course Deletion Blocked</h3>
                <p className="text-slate-600 leading-relaxed">
                  Cannot delete <strong className="text-slate-900">"{blockedDeleteCourse.course.title}"</strong> because dependent records exist:
                </p>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1 font-medium text-slate-700 mt-2">
                  <div>• <strong className="text-slate-900">{blockedDeleteCourse.batchesCount}</strong> active cohort batch(es)</div>
                  <div>• <strong className="text-slate-900">{blockedDeleteCourse.enrollmentsCount}</strong> student enrollment(s)</div>
                </div>
                <p className="text-slate-500 mt-2">
                  Academic integrity rules prevent deleting courses with existing cohort batches or student enrollment history. Please unpublish or archive the course instead.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBlockedDeleteCourse(null)}
                className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={async () => {
                  const c = blockedDeleteCourse.course;
                  setBlockedDeleteCourse(null);
                  await handleArchiveCourse(c);
                }}
                className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Archive Course Instead</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CLOSE ASSIGNMENT SUBMISSIONS                           */}
      {/* ------------------------------------------------------------- */}
      {closeTaskModal.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Close Deliverable Submissions</h3>
                <p className="text-slate-600 leading-relaxed">
                  Deliverable: <strong className="text-slate-900">{closeTaskModal.task?.title}</strong>
                </p>
                <p className="text-slate-500 text-[11px] mt-1">
                  Closing prevent new submissions from students. Past submissions, evaluated grades, and faculty feedback remain preserved and viewable.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-slate-700 font-medium">Closure Reason *</label>
              <textarea
                rows="2"
                required
                value={closeTaskModal.reason}
                onChange={e => setCloseTaskModal(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="State reason for closure (e.g. Assessment deadline passed, grading finalized)..."
                className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={closeTaskModal.isSubmitting}
                onClick={() => setCloseTaskModal({ isOpen: false, task: null, reason: '', isSubmitting: false })}
                className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={closeTaskModal.isSubmitting || !closeTaskModal.reason.trim()}
                onClick={handleConfirmCloseTask}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-semibold cursor-pointer"
              >
                {closeTaskModal.isSubmitting ? 'Closing...' : 'Close Submissions'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

