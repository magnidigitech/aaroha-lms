import React, { useState } from 'react';
import { 
  Shield, Plus, BookOpen, Layers, ListTodo, CheckCircle2, Clock, 
  Eye, AlertCircle, Edit3, Trash2, ArrowRight, RotateCcw, X, 
  GraduationCap, Award, FileText, Video, Sparkles
} from 'lucide-react';
import CourseModal from './admin/CourseModal';
import ModuleModal from './admin/ModuleModal';
import LectureModal from './admin/LectureModal';
import AssignmentModal from './admin/AssignmentModal';
import DeleteConfirmModal from './admin/DeleteConfirmModal';
import IssueCertificateModal from './admin/IssueCertificateModal';

export default function AdminPortalView({
  courses = [],
  taskSubmissions = [],
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
  onGradeSubmission,
  onIssueCertificate,
  onOpenProfile,
  currentUser,
  enrolledStudents = []
}) {
  const [activeTab, setActiveTab] = useState('courses'); // 'courses' | 'grading'

  // Modal dialog states
  const [courseModal, setCourseModal] = useState({ isOpen: false, initialData: null, initialTab: 'syllabus' });
  const [moduleModal, setModuleModal] = useState({ isOpen: false, courseId: null, initialData: null });
  const [lectureModal, setLectureModal] = useState({ isOpen: false, courseId: null, moduleId: null, initialData: null });
  const [assignmentModal, setAssignmentModal] = useState({ isOpen: false, courseId: null, moduleId: null, initialData: null });
  const [issueCertificateModal, setIssueCertificateModal] = useState({ isOpen: false, course: null });

  // Per-course card active pillar tab state ('syllabus' | 'outcomes' | 'about' | 'faculty')
  const [courseCardTabs, setCourseCardTabs] = useState({});
  const setCourseCardTab = (courseId, tab) => {
    setCourseCardTabs(prev => ({ ...prev, [courseId]: tab }));
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

  // Grading modal state
  const [gradingModalSubmission, setGradingModalSubmission] = useState(null);
  const [gradeScore, setGradeScore] = useState('');
  const [gradeStatus, setGradeStatus] = useState('passed');
  const [gradeFeedback, setGradeFeedback] = useState('');

  const pendingSubmissions = taskSubmissions.filter(s => s.status === 'under_review');
  const gradedSubmissions = taskSubmissions.filter(s => s.status !== 'under_review');

  // Deletion Triggers with explicit impact explanations
  const triggerDeleteCourse = (course) => {
    const modCount = course.modules?.length || 0;
    const lessonCount = (course.modules || []).reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
    const taskCount = (course.modules || []).reduce((acc, m) => acc + (m.tasks?.length || 0), 0);

    setDeleteModal({
      isOpen: true,
      title: 'Archive Executive Program',
      itemName: course.title,
      itemType: 'Program',
      affectedChildren: `This will archive ${modCount} module(s), ${lessonCount} lecture(s), and ${taskCount} assignment(s).`,
      studentImpact: 'The course will be removed from public student listings and new playback authorization. All existing student enrollments, completion records, and evaluations are strictly preserved.',
      confirmButtonText: 'Archive Program',
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

  const handleOpenGradeModal = (submission) => {
    setGradingModalSubmission(submission);
    setGradeScore(submission.score !== null ? String(submission.score) : '85');
    setGradeStatus(submission.status === 'under_review' ? 'passed' : submission.status);
    setGradeFeedback(submission.feedback || 'Exemplary architectural defense meeting enterprise specifications.');
  };

  const handleSaveGrade = (e) => {
    e.preventDefault();
    if (!gradingModalSubmission || !onGradeSubmission) return;

    onGradeSubmission({
      submissionId: gradingModalSubmission.id,
      score: parseInt(gradeScore, 10) || 0,
      status: gradeStatus,
      feedback: gradeFeedback
    });
    setGradingModalSubmission(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-4">
          {currentUser && (
            <button
              type="button"
              onClick={onOpenProfile}
              title="Click to customize faculty director profile and avatar"
              className="relative group cursor-pointer shrink-0 focus:outline-none"
            >
              <img
                src={currentUser.avatar || '/avatars/3d/memo_1.png'}
                alt={currentUser.full_name}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover ring-2 ring-blue-500/30 group-hover:ring-blue-600 shadow-md group-hover:scale-105 transition-all bg-slate-100"
              />
              <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white p-1 rounded-xl shadow-xs group-hover:bg-blue-700 transition-colors">
                <Edit3 className="w-3 h-3" />
              </div>
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 text-xs font-bold uppercase tracking-wider">
                Faculty Administration
              </span>
              <span className="text-xs text-slate-400 font-medium hidden sm:inline">•</span>
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">Systems Accreditation Portal</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
              {currentUser?.full_name ? `${currentUser.full_name}'s Directorate` : 'Curriculum Authoring & Faculty Console'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {currentUser?.title || 'Manage programs, structure modules, configure Bunny Stream lectures, and grade technical deliverables'}
            </p>
          </div>
        </div>

        {/* Action Buttons: Edit Profile & Create Program */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0 flex-wrap">
          {onOpenProfile && (
            <button
              onClick={onOpenProfile}
              className="bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-300 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Edit3 className="w-3.5 h-3.5 text-blue-600" />
              <span>Edit Profile</span>
            </button>
          )}
          <button
            onClick={() => setCourseModal({ isOpen: true, initialData: null, initialTab: 'syllabus' })}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-97 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Author Program</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('courses')}
          className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'courses'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Curriculum Directory ({courses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('grading')}
          className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'grading'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Student Deliverable Queue</span>
          {pendingSubmissions.length > 0 && (
            <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-black rounded-full">
              {pendingSubmissions.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: CURRICULUM MANAGEMENT */}
      {activeTab === 'courses' && (
        <div className="space-y-6">
          {courses.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No programs in curriculum directory</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                Begin structuring executive education by authoring your first technical program.
              </p>
              <button
                onClick={() => setCourseModal({ isOpen: true, initialData: null, initialTab: 'syllabus' })}
                className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-blue-700"
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
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{course.description}</p>
                      </div>
                    </div>

                    {/* Course Controls: Issue Certificate, Add Module, Edit Course, Delete Course */}
                    <div className="flex items-center gap-2 self-end md:self-auto shrink-0 flex-wrap">
                      <button
                        onClick={() => setIssueCertificateModal({ isOpen: true, course })}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 hover:border-amber-300 text-amber-900 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title={'Issue Official Accredited Certificate for ' + course.title}
                        aria-label={'Issue Certificate: ' + course.title}
                      >
                        <Award className="w-3.5 h-3.5 text-amber-600" />
                        <span>Issue Certificate</span>
                      </button>

                      <button
                        onClick={() => setModuleModal({ isOpen: true, courseId: course.id, initialData: null })}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5 text-blue-600" />
                        <span>Add Module</span>
                      </button>

                      <button
                        onClick={() => setCourseModal({ isOpen: true, initialData: course, initialTab: courseCardTabs[course.id] || 'syllabus' })}
                        className="px-3 py-1.5 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="Edit Course specifications"
                        aria-label={`Edit Course: ${course.title}`}
                      >
                        <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Edit Course</span>
                      </button>

                      <button
                        onClick={() => triggerDeleteCourse(course)}
                        className="px-2.5 py-1.5 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-300 text-slate-600 hover:text-red-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                        title="Archive Course"
                        aria-label={`Archive Course: ${course.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        <span className="hidden sm:inline">Archive</span>
                      </button>
                    </div>
                  </div>

                  {/* Course Card 4-Pillar Tabs Navigation (Matches Brochure UI) */}
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
                                ? 'border-[#0056D2] text-[#0056D2]'
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
                                ? 'border-[#0056D2] text-[#0056D2]'
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
                                ? 'border-[#0056D2] text-[#0056D2]'
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
                                ? 'border-[#0056D2] text-[#0056D2]'
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

                                    {/* Module Controls: Add Lecture, Add Project, Edit Module, Delete Module */}
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
                                    {/* Lectures */}
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
                                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                          <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                          <span className="font-semibold text-slate-900 truncate">{l.title}</span>
                                          <span className="text-[10px] text-slate-400 shrink-0">
                                            ({l.content_type} • {l.duration})
                                          </span>

                                          {/* Explicit Boolean Condition to prevent rendering stray "0" */}
                                          {Boolean(l.is_free_preview) ? (
                                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded border border-emerald-200 shrink-0">
                                              Free Preview
                                            </span>
                                          ) : null}

                                          {l.video_provider === 'bunny_stream' && (
                                            <span 
                                              className="px-2 py-0.5 bg-amber-50 text-amber-800 text-[10px] font-bold rounded border border-amber-200 shrink-0"
                                              title="Signed Bunny Stream authenticated delivery"
                                            >
                                              Bunny Stream
                                            </span>
                                          )}

                                          {!Boolean(l.is_published) ? (
                                            <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 text-[9px] font-bold rounded shrink-0">
                                              Draft
                                            </span>
                                          ) : null}
                                        </div>

                                        {/* Lecture Controls: Edit Lecture, Delete Lecture */}
                                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                                          <button
                                            onClick={() => setLectureModal({ isOpen: true, courseId: course.id, moduleId: mod.id, initialData: l })}
                                            className="px-2 py-1 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-[11px] font-medium rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                                            title="Edit Lecture"
                                            aria-label={`Edit Lecture: ${l.title}`}
                                          >
                                            <Edit3 className="w-3 h-3 text-blue-600" />
                                            <span>Edit</span>
                                          </button>

                                          <button
                                            onClick={() => triggerDeleteLecture(course.id, mod.id, l)}
                                            className="px-1.5 py-1 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-300 text-red-600 text-[11px] font-medium rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                                            title="Archive Lecture"
                                            aria-label={`Archive Lecture: ${l.title}`}
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}

                                    {/* Tasks / Projects */}
                                    {mod.tasks?.map((t) => (
                                      <div 
                                        key={t.id} 
                                        className="p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-indigo-950"
                                      >
                                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                          <ListTodo className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                          <span className="font-bold text-slate-900 truncate">{t.title}</span>
                                          <span className="text-[11px] font-semibold text-indigo-700 shrink-0">
                                            Pass: {t.passing_score}/{t.max_score} pts
                                          </span>
                                          <span className="text-[10px] text-slate-400 capitalize shrink-0">
                                            ({t.task_type.replace('_', ' ')})
                                          </span>
                                        </div>

                                        {/* Task Controls: Edit Project, Delete Project */}
                                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                                          <button
                                            onClick={() => setAssignmentModal({ isOpen: true, courseId: course.id, moduleId: mod.id, initialData: t })}
                                            className="px-2 py-1 bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-900 text-[11px] font-medium rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                                            title="Edit Assignment"
                                            aria-label={`Edit Assignment: ${t.title}`}
                                          >
                                            <Edit3 className="w-3 h-3 text-indigo-600" />
                                            <span>Edit</span>
                                          </button>

                                          <button
                                            onClick={() => triggerDeleteTask(course.id, mod.id, t)}
                                            className="px-1.5 py-1 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-300 text-red-600 text-[11px] font-medium rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                                            title="Archive Assignment"
                                            aria-label={`Archive Assignment: ${t.title}`}
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
                                <h4 className="text-xs sm:text-sm font-bold text-slate-800">Faculty Director & Instructional Team</h4>
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
                                src={instructor.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'} 
                                alt={instructor.name}
                                className="w-20 h-20 rounded-full object-cover ring-4 ring-blue-50 shrink-0 border border-slate-200 shadow-2xs"
                                onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'; }}
                              />
                              <div className="min-w-0 flex-1 space-y-2">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-base font-bold text-slate-900">{instructor.name}</h4>
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/60 rounded text-[10px] font-bold">
                                      Faculty Director
                                    </span>
                                  </div>
                                  <p className="text-xs font-semibold text-[#0056D2]">{instructor.title}</p>
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
            </div>

            {pendingSubmissions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No deliverables currently pending faculty review.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingSubmissions.map((sub) => (
                  <div key={sub.id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">{sub.student_name}</span>
                        <span className="text-[10px] text-slate-400">• {new Date(sub.submitted_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2">{sub.submission_text}</p>
                      {sub.attachment_url && (
                        <a 
                          href={sub.attachment_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[11px] text-blue-600 hover:underline font-semibold block pt-0.5 truncate"
                        >
                          {sub.attachment_url}
                        </a>
                      )}
                    </div>

                    <button
                      onClick={() => handleOpenGradeModal(sub)}
                      className="px-4 py-2 bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition-all self-end md:self-auto cursor-pointer"
                    >
                      Evaluate Deliverable
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Course Modal (Create & Edit) */}
      <CourseModal
        isOpen={courseModal.isOpen}
        onClose={() => setCourseModal({ isOpen: false, initialData: null, initialTab: 'syllabus' })}
        initialData={courseModal.initialData}
        initialTab={courseModal.initialTab}
        onSave={async (data) => {
          if (courseModal.initialData?.id) {
            if (onUpdateCourse) await onUpdateCourse(courseModal.initialData.id, data);
          } else {
            if (onAddCourse) await onAddCourse(data);
          }
        }}
      />

      {/* MODAL 2: Module Modal (Create & Edit) */}
      <ModuleModal
        isOpen={moduleModal.isOpen}
        onClose={() => setModuleModal({ isOpen: false, courseId: null, initialData: null })}
        courseId={moduleModal.courseId}
        initialData={moduleModal.initialData}
        onSave={async (data) => {
          if (moduleModal.initialData?.id) {
            if (onUpdateModule) await onUpdateModule(moduleModal.courseId, moduleModal.initialData.id, data);
          } else {
            if (onAddModule) await onAddModule(moduleModal.courseId, data.title);
          }
        }}
      />

      {/* MODAL 3: Lecture Modal (Create & Edit with Bunny Stream Video ID validation) */}
      <LectureModal
        isOpen={lectureModal.isOpen}
        onClose={() => setLectureModal({ isOpen: false, courseId: null, moduleId: null, initialData: null })}
        courseId={lectureModal.courseId}
        moduleId={lectureModal.moduleId}
        initialData={lectureModal.initialData}
        onSave={async (data) => {
          if (lectureModal.initialData?.id) {
            if (onUpdateLesson) await onUpdateLesson(lectureModal.courseId, lectureModal.moduleId, lectureModal.initialData.id, data);
          } else {
            if (onAddLesson) await onAddLesson(lectureModal.courseId, lectureModal.moduleId, data);
          }
        }}
      />

      {/* MODAL 4: Assignment Modal (Create & Edit) */}
      <AssignmentModal
        isOpen={assignmentModal.isOpen}
        onClose={() => setAssignmentModal({ isOpen: false, courseId: null, moduleId: null, initialData: null })}
        courseId={assignmentModal.courseId}
        moduleId={assignmentModal.moduleId}
        initialData={assignmentModal.initialData}
        onSave={async (data) => {
          if (assignmentModal.initialData?.id) {
            if (onUpdateTask) await onUpdateTask(assignmentModal.courseId, assignmentModal.moduleId, assignmentModal.initialData.id, data);
          } else {
            if (onAddTask) await onAddTask(assignmentModal.courseId, assignmentModal.moduleId, data);
          }
        }}
      />

      {/* MODAL 5: Safe Deletion & Archiving Confirmation Dialog */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={deleteModal.onConfirm}
        title={deleteModal.title}
        itemName={deleteModal.itemName}
        itemType={deleteModal.itemType}
        affectedChildren={deleteModal.affectedChildren}
        studentImpact={deleteModal.studentImpact}
        confirmButtonText={deleteModal.confirmButtonText}
      />

      {/* MODAL 6: Issue Official Certificate Dialog */}
      <IssueCertificateModal
        isOpen={issueCertificateModal.isOpen}
        onClose={() => setIssueCertificateModal({ isOpen: false, course: null })}
        course={issueCertificateModal.course}
        onIssue={onIssueCertificate}
        currentUser={currentUser}
        enrolledStudents={enrolledStudents}
      />

      {/* MODAL 6: Grade Submission Modal */}
      {gradingModalSubmission && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-auto">
            <h3 className="text-base font-bold text-slate-900">
              Evaluate Deliverable: {gradingModalSubmission.student_name}
            </h3>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <span className="font-bold text-slate-900">Student Technical Submission:</span>
              <p className="whitespace-pre-wrap text-slate-700 leading-relaxed">{gradingModalSubmission.submission_text}</p>
              {gradingModalSubmission.attachment_url && (
                <p className="text-blue-600 font-semibold pt-1 truncate">
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
