import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import UserCatalogView from './components/UserCatalogView';
import CourseDetailPage from './components/CourseDetailPage';
import StudentPortalView from './components/StudentPortalView';
import AdminPortalView from './components/AdminPortalView';
import AuthModal from './components/AuthModal';
import { initialUsers, initialCourses, initialEnrollments, initialLessonProgress, initialTaskSubmissions } from './mockData';
import { CheckCircle2 } from 'lucide-react';
import aarohaLogo from './assets/aaroha_logo.webp';
import { api } from './apiService';

export default function App() {
  const [users, setUsers] = useState(initialUsers);
  // Persist authentication across page refresh with instant hydration
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('aaroha_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [activeView, setActiveView] = useState(() => {
    try {
      const savedView = localStorage.getItem('aaroha_view');
      const savedUser = localStorage.getItem('aaroha_user');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        if (savedView && ['catalog', 'course-detail', 'student', 'admin'].includes(savedView)) {
          if (savedView === 'admin' && user.role !== 'admin') return 'student';
          return savedView;
        }
        return user.role === 'admin' ? 'admin' : 'student';
      }
      return 'catalog';
    } catch (e) {
      return 'catalog';
    }
  });
  
  const [authModal, setAuthModal] = useState({
    isOpen: false,
    tab: 'login',
    intendedCourse: null
  });

  const [courses, setCourses] = useState(initialCourses);
  const [enrollments, setEnrollments] = useState(initialEnrollments);
  const [lessonProgress, setLessonProgress] = useState(initialLessonProgress);
  const [taskSubmissions, setTaskSubmissions] = useState(initialTaskSubmissions);
  
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [activeStudentCourseId, setActiveStudentCourseId] = useState(1);
  const [toastMessage, setToastMessage] = useState(null);
  const [isBackendLive, setIsBackendLive] = useState(false);

  // Global search & topic filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Track active view in storage
  useEffect(() => {
    if (activeView) {
      localStorage.setItem('aaroha_view', activeView);
    }
  }, [activeView]);

  // Initial load: verify token session and fetch live course catalog
  useEffect(() => {
    // 1. Session check via JWT token
    const token = localStorage.getItem('aaroha_token');
    if (token) {
      api.getMe()
        .then(res => {
          if (res && res.user) {
            const verifiedUser = {
              ...res.user,
              avatar: res.user.avatar || (res.user.role === 'admin'
                ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
                : 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80')
            };
            setCurrentUser(verifiedUser);
            localStorage.setItem('aaroha_user', JSON.stringify(verifiedUser));
            setIsBackendLive(true);
            if (verifiedUser.role === 'admin') {
              api.getPendingSubmissions()
                .then(subRes => {
                  if (subRes && subRes.submissions && subRes.submissions.length > 0) {
                    setTaskSubmissions(subRes.submissions);
                  }
                })
                .catch(() => {});
            } else {
              api.getMyEnrollments()
                .then(enrRes => {
                  if (enrRes && enrRes.enrollments && enrRes.enrollments.length > 0) {
                    setEnrollments(enrRes.enrollments);
                  }
                })
                .catch(() => {});
            }
          }
        })
        .catch(err => {
          console.warn('Session check fallback:', err.message);
          // Only clear credentials if the server explicitly rejected the token as unauthorized
          if (err.message && (err.message.includes('401') || err.message.includes('expired') || err.message.includes('Invalid'))) {
            localStorage.removeItem('aaroha_token');
            localStorage.removeItem('aaroha_user');
            localStorage.removeItem('aaroha_view');
            setCurrentUser(null);
            setActiveView('catalog');
          }
        });
    }

    // 2. Load courses from API
    api.getCourses()
      .then(res => {
        if (res && res.courses && res.courses.length > 0) {
          setCourses(res.courses);
          setIsBackendLive(true);
        }
      })
      .catch(err => {
        console.warn('API unreachable, using local curriculum store:', err.message);
      });
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenAuth = (tab = 'login', intendedCourse = null) => {
    setAuthModal({
      isOpen: true,
      tab: tab,
      intendedCourse: intendedCourse
    });
  };

  const handleOpenCourseDetails = async (course) => {
    setSelectedCourse(course);
    setActiveView('course-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const res = await api.getCourseDetails(course.id || course.slug);
      if (res && res.course) {
        setSelectedCourse(res.course);
      }
    } catch (err) {
      // Retain existing selected course
    }
  };

  const handleLogin = async (email, password) => {
    try {
      const res = await api.login(email, password);
      if (res && res.user) {
        const loggedUser = {
          ...res.user,
          avatar: res.user.avatar || (res.user.role === 'admin'
            ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
            : 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80')
        };
        setCurrentUser(loggedUser);
        localStorage.setItem('aaroha_user', JSON.stringify(loggedUser));
        setIsBackendLive(true);

        if (loggedUser.role === 'admin') {
          setActiveView('admin');
          localStorage.setItem('aaroha_view', 'admin');
          showToast('Signed in as Faculty Director: ' + loggedUser.full_name);
          api.getPendingSubmissions()
            .then(subRes => {
              if (subRes && subRes.submissions) setTaskSubmissions(subRes.submissions);
            })
            .catch(() => {});
        } else {
          if (authModal.intendedCourse) {
            executeEnrollment(loggedUser.id, authModal.intendedCourse.id);
          } else {
            setActiveView('student');
            localStorage.setItem('aaroha_view', 'student');
          }
          showToast('Welcome back, ' + loggedUser.full_name);
          api.getMyEnrollments()
            .then(enrRes => {
              if (enrRes && enrRes.enrollments) setEnrollments(enrRes.enrollments);
            })
            .catch(() => {});
        }
        return true;
      }
    } catch (apiErr) {
      console.warn('API login skipped, evaluating local demo credentials:', apiErr.message);
    }

    // Resilient offline / demo fallback
    const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (foundUser && foundUser.password === password) {
      setCurrentUser(foundUser);
      localStorage.setItem('aaroha_user', JSON.stringify(foundUser));
      if (foundUser.role === 'admin') {
        setActiveView('admin');
        localStorage.setItem('aaroha_view', 'admin');
        showToast('Signed in as Faculty Director: ' + foundUser.full_name);
      } else {
        if (authModal.intendedCourse) {
          executeEnrollment(foundUser.id, authModal.intendedCourse.id);
        } else {
          setActiveView('student');
          localStorage.setItem('aaroha_view', 'student');
        }
        showToast('Welcome back, ' + foundUser.full_name);
      }
      return true;
    }
    showToast('Invalid email or password.');
    return false;
  };

  const handleRegister = async (userData) => {
    try {
      const res = await api.register(userData);
      if (res && res.user) {
        const registeredUser = {
          ...res.user,
          avatar: res.user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'
        };
        setCurrentUser(registeredUser);
        localStorage.setItem('aaroha_user', JSON.stringify(registeredUser));
        setIsBackendLive(true);

        if (registeredUser.role === 'admin') {
          setActiveView('admin');
          localStorage.setItem('aaroha_view', 'admin');
          showToast('Faculty account activated: ' + registeredUser.full_name);
        } else {
          if (authModal.intendedCourse) {
            executeEnrollment(registeredUser.id, authModal.intendedCourse.id);
          } else {
            setActiveView('student');
            localStorage.setItem('aaroha_view', 'student');
          }
          showToast('Account registered successfully. Welcome, ' + registeredUser.full_name);
        }
        return;
      }
    } catch (apiErr) {
      console.warn('API registration skipped, creating local account:', apiErr.message);
    }

    // Local fallback
    const newUser = {
      id: Date.now(),
      full_name: userData.full_name,
      email: userData.email,
      password: userData.password,
      role: userData.role,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'
    };

    setUsers([...users, newUser]);
    setCurrentUser(newUser);
    localStorage.setItem('aaroha_user', JSON.stringify(newUser));

    if (newUser.role === 'admin') {
      setActiveView('admin');
      localStorage.setItem('aaroha_view', 'admin');
      showToast('Faculty account activated: ' + newUser.full_name);
    } else {
      if (authModal.intendedCourse) {
        executeEnrollment(newUser.id, authModal.intendedCourse.id);
      } else {
        setActiveView('student');
        localStorage.setItem('aaroha_view', 'student');
      }
      showToast('Account registered successfully. Welcome, ' + newUser.full_name);
    }
  };

  const handleLogout = () => {
    api.logout();
    localStorage.removeItem('aaroha_user');
    localStorage.removeItem('aaroha_view');
    setCurrentUser(null);
    setActiveView('catalog');
    showToast('Signed out of workspace.');
  };

  const executeEnrollment = async (userId, courseId) => {
    try {
      await api.enroll(courseId);
    } catch (err) {
      console.warn('API enrollment sync skipped (or offline):', err.message);
    }

    const alreadyEnrolled = enrollments.some(e => (e.course_id === courseId || e.id === courseId) && (e.user_id === userId || !e.user_id));
    if (!alreadyEnrolled) {
      const newEnrollment = {
        id: Date.now(),
        user_id: userId,
        course_id: courseId,
        status: 'active',
        enrolled_at: new Date().toISOString(),
        completed_at: null
      };
      setEnrollments(prev => [...prev, newEnrollment]);
    }
    setActiveStudentCourseId(courseId);
    setActiveView('student');
    showToast('Enrolled successfully! Program added to your workspace.');
  };

  const handleEnroll = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    if (!currentUser) {
      handleOpenAuth('register', course);
      showToast('Please sign in or create an account to enroll.');
      return;
    }

    if (currentUser.role === 'admin') {
      showToast('Faculty accounts administer programs from the Faculty Console.');
      return;
    }

    executeEnrollment(currentUser.id, courseId);
  };

  const handleCompleteLesson = async (lessonId) => {
    if (!currentUser) return;
    try {
      await api.completeLesson(lessonId);
    } catch (err) {
      console.warn('API lesson completion sync skipped:', err.message);
    }

    const existing = lessonProgress.find(p => p.lesson_id === lessonId);
    if (!existing) {
      const newProgress = {
        id: Date.now(),
        enrollment_id: 501,
        lesson_id: lessonId,
        is_completed: true,
        completed_at: new Date().toISOString()
      };
      setLessonProgress(prev => [...prev, newProgress]);
    }
    showToast('Lecture marked as completed.');
  };

  const handleSubmitTask = async ({ taskId, submissionText, attachmentUrl }) => {
    if (!currentUser) return;
    try {
      await api.submitTask(taskId, {
        submission_text: submissionText,
        attachment_url: attachmentUrl
      });
    } catch (err) {
      console.warn('API task submission sync skipped:', err.message);
    }

    const existingIndex = taskSubmissions.findIndex(s => s.task_id === taskId);
    const newSubmission = {
      id: existingIndex >= 0 ? taskSubmissions[existingIndex].id : Date.now(),
      task_id: taskId,
      enrollment_id: 501,
      student_name: currentUser.full_name,
      submission_text: submissionText,
      attachment_url: attachmentUrl,
      status: 'under_review',
      score: null,
      feedback: null,
      graded_by: null,
      submitted_at: new Date().toISOString(),
      graded_at: null
    };

    if (existingIndex >= 0) {
      const updated = [...taskSubmissions];
      updated[existingIndex] = newSubmission;
      setTaskSubmissions(updated);
    } else {
      setTaskSubmissions(prev => [...prev, newSubmission]);
    }
    showToast('Deliverable submitted for faculty evaluation.');
  };

  const handleAddCourse = async (newCourseData) => {
    let createdCourse = null;
    try {
      const res = await api.createCourse(newCourseData);
      if (res && res.course) {
        createdCourse = res.course;
      }
    } catch (err) {
      console.warn('API create course sync skipped:', err.message);
    }

    const newCourse = createdCourse || {
      ...newCourseData,
      id: Date.now(),
      created_by: currentUser?.id || 1,
      modules: []
    };
    setCourses(prev => [newCourse, ...prev]);
    showToast('Program published to curriculum directory.');
  };

  const handleAddModule = async (courseId, title) => {
    try {
      await api.createModule(courseId, { title });
    } catch (err) {
      console.warn('API create module sync skipped:', err.message);
    }

    const updated = courses.map(c => {
      if (c.id === courseId) {
        const newMod = {
          id: Date.now(),
          course_id: courseId,
          title: title,
          sequence_order: (c.modules?.length || 0) + 1,
          lessons: [],
          tasks: []
        };
        return { ...c, modules: [...(c.modules || []), newMod] };
      }
      return c;
    });
    setCourses(updated);
    showToast('Module appended to syllabus.');
  };

  const handleAddLesson = async (courseId, moduleId, lessonData) => {
    try {
      await api.createLesson(moduleId, lessonData);
    } catch (err) {
      console.warn('API create lesson sync skipped:', err.message);
    }

    const updated = courses.map(c => {
      if (c.id === courseId) {
        const updatedModules = c.modules?.map(m => {
          if (m.id === moduleId) {
            const newLesson = {
              ...lessonData,
              id: Date.now(),
              module_id: moduleId,
              sequence_order: (m.lessons?.length || 0) + 1
            };
            return { ...m, lessons: [...(m.lessons || []), newLesson] };
          }
          return m;
        });
        return { ...c, modules: updatedModules };
      }
      return c;
    });
    setCourses(updated);
    showToast('Lecture saved to module.');
  };

  const handleAddTask = async (courseId, moduleId, taskData) => {
    try {
      await api.createTask(moduleId, taskData);
    } catch (err) {
      console.warn('API create task sync skipped:', err.message);
    }

    const updated = courses.map(c => {
      if (c.id === courseId) {
        const updatedModules = c.modules?.map(m => {
          if (m.id === moduleId) {
            const newTask = {
              ...taskData,
              id: Date.now(),
              module_id: moduleId,
              is_mandatory: true
            };
            return { ...m, tasks: [...(m.tasks || []), newTask] };
          }
          return m;
        });
        return { ...c, modules: updatedModules };
      }
      return c;
    });
    setCourses(updated);
    showToast('Project deliverable added to syllabus.');
  };

  const handleGradeSubmission = async ({ submissionId, score, status, feedback }) => {
    try {
      await api.gradeSubmission(submissionId, { score, status, feedback });
    } catch (err) {
      console.warn('API grade submission sync skipped:', err.message);
    }

    const updated = taskSubmissions.map(s => {
      if (s.id === submissionId) {
        return {
          ...s,
          score: score,
          status: status,
          feedback: feedback,
          graded_by: currentUser?.id || 1,
          graded_at: new Date().toISOString()
        };
      }
      return s;
    });
    setTaskSubmissions(updated);
    showToast('Faculty evaluation recorded.');
  };

  const pendingCount = taskSubmissions.filter(s => s.status === 'under_review').length;
  const enrolledCount = currentUser 
    ? enrollments.filter(e => e.user_id === currentUser.id && e.status === 'active').length 
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Main Navbar */}
      <Navbar
        currentUser={currentUser}
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenAuth={(tab) => handleOpenAuth(tab, null)}
        onLogout={handleLogout}
        stats={{
          enrolledCount: enrolledCount,
          pendingReviews: pendingCount
        }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSelectCategory={(cat) => setSelectedCategory(cat)}
        courses={courses}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeView === 'catalog' && (
          <UserCatalogView
            courses={courses}
            onEnroll={handleEnroll}
            onOpenCourseDetails={handleOpenCourseDetails}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
          />
        )}

        {activeView === 'course-detail' && selectedCourse && (
          <CourseDetailPage
            course={selectedCourse}
            onBack={() => setActiveView('catalog')}
            onEnroll={handleEnroll}
            isEnrolled={currentUser ? enrollments.some(e => e.course_id === selectedCourse.id && e.user_id === currentUser.id) : false}
            onStartLearning={(cId) => {
              setActiveStudentCourseId(cId);
              setActiveView('student');
            }}
          />
        )}

        {activeView === 'student' && currentUser?.role === 'student' && (
          <StudentPortalView
            courses={courses}
            enrollments={enrollments.filter(e => e.user_id === currentUser.id)}
            lessonProgress={lessonProgress}
            taskSubmissions={taskSubmissions}
            onCompleteLesson={handleCompleteLesson}
            onSubmitTask={handleSubmitTask}
            activeCourseId={activeStudentCourseId}
            setActiveCourseId={setActiveStudentCourseId}
          />
        )}

        {activeView === 'admin' && currentUser?.role === 'admin' && (
          <AdminPortalView
            courses={courses}
            taskSubmissions={taskSubmissions}
            onAddCourse={handleAddCourse}
            onAddModule={handleAddModule}
            onAddLesson={handleAddLesson}
            onAddTask={handleAddTask}
            onGradeSubmission={handleGradeSubmission}
          />
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModal.isOpen}
        onClose={() => setAuthModal({ isOpen: false, tab: 'login', intendedCourse: null })}
        onLogin={handleLogin}
        onRegister={handleRegister}
        initialTab={authModal.tab}
        intendedCourseTitle={authModal.intendedCourse?.title}
      />

      {/* Coursera-Style Multi-Column Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto pt-14 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-xs text-slate-600">
            <div className="space-y-3">
              <div className="bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 inline-flex items-center gap-2">
                <img
                  src={aarohaLogo}
                  alt="Aaroha Technologies"
                  className="h-6 w-auto object-contain"
                />
                <span className="text-[9px] font-bold tracking-widest text-[#00A3FF] uppercase pl-2 border-l border-slate-800">
                  Academy
                </span>
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Empowering principal engineers and technology leaders with production-calibrated curricula and accredited certifications.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Curricula & Degrees</h4>
              <ul className="space-y-1.5 text-[11px]">
                <li className="hover:text-[#0056D2] cursor-pointer">Cloud Architecture</li>
                <li className="hover:text-[#0056D2] cursor-pointer">Applied AI & Model Serving</li>
                <li className="hover:text-[#0056D2] cursor-pointer">Enterprise Cyber Defense</li>
                <li className="hover:text-[#0056D2] cursor-pointer">Distributed Consensus Systems</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Community & Research</h4>
              <ul className="space-y-1.5 text-[11px]">
                <li className="hover:text-[#0056D2] cursor-pointer">Aaroha Systems Lab</li>
                <li className="hover:text-[#0056D2] cursor-pointer">Faculty Directorate</li>
                <li className="hover:text-[#0056D2] cursor-pointer">RFC Technical Artifacts</li>
                <li className="hover:text-[#0056D2] cursor-pointer">Verified Digital Credentials</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Enterprise & Campus</h4>
              <ul className="space-y-1.5 text-[11px]">
                <li className="hover:text-[#0056D2] cursor-pointer">Aaroha for Enterprise</li>
                <li className="hover:text-[#0056D2] cursor-pointer">Institutional Accreditation</li>
                <li className="hover:text-[#0056D2] cursor-pointer">Hostinger LAMP Architecture</li>
                <li className="hover:text-[#0056D2] cursor-pointer">Aaroha Inc. Corporate</li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <div>
              © 2026 Aaroha Inc. All rights reserved.
            </div>
            <div className="flex items-center gap-6 font-medium">
              <span className="hover:text-slate-900 cursor-pointer">Privacy Policy</span>
              <span className="hover:text-slate-900 cursor-pointer">Terms of Service</span>
              <span className="hover:text-slate-900 cursor-pointer">Security & Compliance</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
