import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import UserCatalogView from './components/UserCatalogView';
import CourseBrochureView from './components/CourseBrochureView';
import CourseClassroomView from './components/CourseClassroomView';
import StudentPortalView from './components/StudentPortalView';
import AdminPortalView from './components/AdminPortalView';
import AuthModal from './components/AuthModal';
import { initialUsers, initialCourses, initialEnrollments, initialLessonProgress, initialTaskSubmissions } from './mockData';
import { CheckCircle2 } from 'lucide-react';
import aarohaLogo from './assets/aaroha_logo.webp';
import { api } from './apiService';

export default function App() {
  const [users, setUsers] = useState(() => {
    try {
      const saved = localStorage.getItem('aaroha_all_users');
      return saved ? JSON.parse(saved) : initialUsers;
    } catch (e) {
      return initialUsers;
    }
  });

  // Persist authentication across page refresh with instant hydration
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('aaroha_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const isFacultyRole = (r) => r === 'admin' || r === 'faculty' || r === 'instructor';

  const [activeView, setActiveView] = useState(() => {
    try {
      const savedView = localStorage.getItem('aaroha_view');
      const savedUser = localStorage.getItem('aaroha_user');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        if (savedView && ['catalog', 'course-brochure', 'course-classroom', 'course-detail', 'student', 'admin'].includes(savedView)) {
          if (savedView === 'admin' && !isFacultyRole(user.role)) return 'student';
          if (savedView === 'course-detail') return 'course-brochure';
          return savedView;
        }
        return isFacultyRole(user.role) ? 'admin' : 'student';
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

  const [courses, setCourses] = useState(() => {
    try {
      const saved = localStorage.getItem('aaroha_courses');
      return saved ? JSON.parse(saved) : initialCourses;
    } catch (e) {
      return initialCourses;
    }
  });

  const [enrollments, setEnrollments] = useState(() => {
    try {
      const saved = localStorage.getItem('aaroha_enrollments');
      return saved ? JSON.parse(saved) : initialEnrollments;
    } catch (e) {
      return initialEnrollments;
    }
  });

  const [lessonProgress, setLessonProgress] = useState(() => {
    try {
      const saved = localStorage.getItem('aaroha_lesson_progress');
      return saved ? JSON.parse(saved) : initialLessonProgress;
    } catch (e) {
      return initialLessonProgress;
    }
  });

  const [taskSubmissions, setTaskSubmissions] = useState(() => {
    try {
      const saved = localStorage.getItem('aaroha_task_submissions');
      return saved ? JSON.parse(saved) : initialTaskSubmissions;
    } catch (e) {
      return initialTaskSubmissions;
    }
  });
  
  const [selectedCourse, setSelectedCourse] = useState(() => {
    try {
      const savedCourseId = localStorage.getItem('aaroha_selected_course_id');
      const cachedCourses = localStorage.getItem('aaroha_courses');
      const pool = cachedCourses ? JSON.parse(cachedCourses) : initialCourses;
      if (savedCourseId) {
        const found = pool.find(c => c.id === parseInt(savedCourseId));
        if (found) return found;
      }
      return pool[0] || null;
    } catch (e) {
      return initialCourses[0] || null;
    }
  });
  const [returnView, setReturnView] = useState('catalog');
  const [activeStudentCourseId, setActiveStudentCourseId] = useState(1);
  const [toastMessage, setToastMessage] = useState(null);
  const [isBackendLive, setIsBackendLive] = useState(false);

  // Global search & topic filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Persistent storage synchronizers
  useEffect(() => {
    try {
      localStorage.setItem('aaroha_all_users', JSON.stringify(users));
    } catch (e) {}
  }, [users]);

  useEffect(() => {
    try {
      localStorage.setItem('aaroha_courses', JSON.stringify(courses));
    } catch (e) {}
  }, [courses]);

  useEffect(() => {
    try {
      localStorage.setItem('aaroha_enrollments', JSON.stringify(enrollments));
    } catch (e) {}
  }, [enrollments]);

  useEffect(() => {
    try {
      localStorage.setItem('aaroha_lesson_progress', JSON.stringify(lessonProgress));
    } catch (e) {}
  }, [lessonProgress]);

  useEffect(() => {
    try {
      localStorage.setItem('aaroha_task_submissions', JSON.stringify(taskSubmissions));
    } catch (e) {}
  }, [taskSubmissions]);

  // Track active view and course in storage
  useEffect(() => {
    if (activeView) {
      localStorage.setItem('aaroha_view', activeView);
    }
  }, [activeView]);

  useEffect(() => {
    if (selectedCourse?.id) {
      localStorage.setItem('aaroha_selected_course_id', selectedCourse.id);
    }
  }, [selectedCourse]);

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
            if (isFacultyRole(verifiedUser.role)) {
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
                    setEnrollments(enrRes.enrollments.map(e => ({
                      ...e,
                      id: e.enrollment_id || e.id,
                      user_id: e.user_id || verifiedUser.id,
                      status: e.status || e.enrollment_status || 'active'
                    })));
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

    // 2. Load courses from API with persistent non-destructive merge
    api.getCourses()
      .then(res => {
        if (res && res.courses && res.courses.length > 0) {
          setCourses(prev => {
            const apiIds = new Set(res.courses.map(c => c.id));
            const locallyAuthored = (prev || []).filter(c => !apiIds.has(c.id));
            return [...res.courses, ...locallyAuthored];
          });
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
    if (activeView === 'student' || activeView === 'catalog') {
      setReturnView(activeView);
    }
    setSelectedCourse(course);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Strictly check if current user is enrolled in this course:
    const isEnrolledInCourse = currentUser 
      ? enrollments.some(e => e.course_id === course.id && e.user_id === currentUser.id && e.status === 'active')
      : false;

    // Only Enrolled Courses unlock Course Interface, otherwise only course brochure!
    if (isEnrolledInCourse) {
      setActiveView('course-classroom');
    } else {
      setActiveView('course-brochure');
    }

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

        if (isFacultyRole(loggedUser.role)) {
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
              if (enrRes && enrRes.enrollments) {
                setEnrollments(enrRes.enrollments.map(e => ({
                  ...e,
                  id: e.enrollment_id || e.id,
                  user_id: e.user_id || loggedUser.id,
                  status: e.status || e.enrollment_status || 'active'
                })));
              }
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
      if (isFacultyRole(foundUser.role)) {
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

        if (isFacultyRole(registeredUser.role)) {
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

    if (isFacultyRole(newUser.role)) {
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

    const alreadyEnrolled = enrollments.some(e => e.course_id === courseId && (e.user_id === userId || !e.user_id));
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
    const targetCourse = courses.find(c => c.id === courseId);
    if (targetCourse) setSelectedCourse(targetCourse);
    // Unlocks Course Interface upon enrollment!
    setActiveView('course-classroom');
    showToast('Enrolled successfully! Course interface unlocked.');
  };

  const handleEnroll = (courseOrId) => {
    const courseId = typeof courseOrId === 'object' ? courseOrId.id : courseOrId;
    const course = typeof courseOrId === 'object' ? courseOrId : courses.find(c => c.id === courseId);
    if (!currentUser) {
      handleOpenAuth('register', course);
      showToast('Please sign in or create an account to enroll.');
      return;
    }

    if (isFacultyRole(currentUser.role)) {
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

  const handleUpdateCourse = async (courseId, courseData) => {
    try {
      await api.updateCourse(courseId, courseData);
    } catch (err) {
      console.warn('API update course sync skipped:', err.message);
    }
    setCourses(prev => prev.map(c => {
      if (c.id === courseId) {
        const merged = { ...c, ...courseData, id: courseId, modules: c.modules || [] };
        if (selectedCourse?.id === courseId) setSelectedCourse(merged);
        return merged;
      }
      return c;
    }));
    showToast('Program specifications updated.');
  };

  const handleDeleteCourse = async (courseId) => {
    try {
      await api.deleteCourse(courseId);
    } catch (err) {
      console.warn('API delete course sync skipped:', err.message);
    }
    setCourses(prev => prev.filter(c => c.id !== courseId));
    if (selectedCourse?.id === courseId) {
      setSelectedCourse(null);
      setActiveView('catalog');
    }
    showToast('Program archived from curriculum directory.');
  };

  const handleUpdateModule = async (courseId, moduleId, moduleData) => {
    try {
      await api.updateModule(moduleId, moduleData);
    } catch (err) {
      console.warn('API update module sync skipped:', err.message);
    }
    setCourses(prev => prev.map(c => {
      if (c.id === courseId) {
        const updatedMods = (c.modules || []).map(m => m.id === moduleId ? { ...m, ...moduleData } : m);
        const updatedCourse = { ...c, modules: updatedMods };
        if (selectedCourse?.id === courseId) setSelectedCourse(updatedCourse);
        return updatedCourse;
      }
      return c;
    }));
    showToast('Module specifications updated.');
  };

  const handleDeleteModule = async (courseId, moduleId) => {
    try {
      await api.deleteModule(moduleId);
    } catch (err) {
      console.warn('API delete module sync skipped:', err.message);
    }
    setCourses(prev => prev.map(c => {
      if (c.id === courseId) {
        const updatedMods = (c.modules || []).filter(m => m.id !== moduleId);
        const updatedCourse = { ...c, modules: updatedMods };
        if (selectedCourse?.id === courseId) setSelectedCourse(updatedCourse);
        return updatedCourse;
      }
      return c;
    }));
    showToast('Module and contained lectures archived.');
  };

  const handleUpdateLesson = async (courseId, moduleId, lessonId, lessonData) => {
    try {
      await api.updateLesson(lessonId, lessonData);
    } catch (err) {
      console.warn('API update lesson sync skipped:', err.message);
    }
    setCourses(prev => prev.map(c => {
      if (c.id === courseId) {
        const updatedMods = (c.modules || []).map(m => {
          if (m.id === moduleId) {
            return {
              ...m,
              lessons: (m.lessons || []).map(l => l.id === lessonId ? { ...l, ...lessonData } : l)
            };
          }
          return m;
        });
        const updatedCourse = { ...c, modules: updatedMods };
        if (selectedCourse?.id === courseId) setSelectedCourse(updatedCourse);
        return updatedCourse;
      }
      return c;
    }));
    showToast('Lecture updated successfully.');
  };

  const handleDeleteLesson = async (courseId, moduleId, lessonId) => {
    try {
      await api.deleteLesson(lessonId);
    } catch (err) {
      console.warn('API delete lesson sync skipped:', err.message);
    }
    setCourses(prev => prev.map(c => {
      if (c.id === courseId) {
        const updatedMods = (c.modules || []).map(m => {
          if (m.id === moduleId) {
            return {
              ...m,
              lessons: (m.lessons || []).filter(l => l.id !== lessonId)
            };
          }
          return m;
        });
        const updatedCourse = { ...c, modules: updatedMods };
        if (selectedCourse?.id === courseId) setSelectedCourse(updatedCourse);
        return updatedCourse;
      }
      return c;
    }));
    showToast('Lecture archived.');
  };

  const handleUpdateTask = async (courseId, moduleId, taskId, taskData) => {
    try {
      await api.updateTask(taskId, taskData);
    } catch (err) {
      console.warn('API update task sync skipped:', err.message);
    }
    setCourses(prev => prev.map(c => {
      if (c.id === courseId) {
        const updatedMods = (c.modules || []).map(m => {
          if (m.id === moduleId) {
            return {
              ...m,
              tasks: (m.tasks || []).map(t => t.id === taskId ? { ...t, ...taskData } : t)
            };
          }
          return m;
        });
        const updatedCourse = { ...c, modules: updatedMods };
        if (selectedCourse?.id === courseId) setSelectedCourse(updatedCourse);
        return updatedCourse;
      }
      return c;
    }));
    showToast('Assignment requirements updated.');
  };

  const handleDeleteTask = async (courseId, moduleId, taskId) => {
    try {
      await api.deleteTask(taskId);
    } catch (err) {
      console.warn('API delete task sync skipped:', err.message);
    }
    setCourses(prev => prev.map(c => {
      if (c.id === courseId) {
        const updatedMods = (c.modules || []).map(m => {
          if (m.id === moduleId) {
            return {
              ...m,
              tasks: (m.tasks || []).filter(t => t.id !== taskId)
            };
          }
          return m;
        });
        const updatedCourse = { ...c, modules: updatedMods };
        if (selectedCourse?.id === courseId) setSelectedCourse(updatedCourse);
        return updatedCourse;
      }
      return c;
    }));
    showToast('Assignment archived.');
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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans overflow-x-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Main Navbar (Hidden only in focused classroom view) */}
      {activeView !== 'course-classroom' && (
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
      )}

      {/* Main Content Area */}
      <main className={`flex-1 w-full ${activeView === 'course-classroom' ? 'p-0 max-w-none' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6'}`}>
        {/* 1. Main Course Catalog */}
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

        {/* 2. My Learning Dashboard (Enrolled Programs First) */}
        {activeView === 'student' && (
          <StudentPortalView
            courses={courses}
            enrollments={currentUser ? enrollments.filter(e => e.user_id === currentUser.id) : enrollments}
            lessonProgress={lessonProgress}
            taskSubmissions={taskSubmissions}
            onOpenCourse={(course) => {
              setSelectedCourse(course);
              setReturnView('student');
              setActiveView('course-classroom');
            }}
            onExploreCatalog={() => setActiveView('catalog')}
            currentUser={currentUser}
          />
        )}

        {/* 3. Course Brochure (Shown for un-enrolled courses) */}
        {activeView === 'course-brochure' && selectedCourse && (
          <CourseBrochureView
            course={selectedCourse}
            onBack={() => setActiveView(returnView || 'catalog')}
            onEnroll={handleEnroll}
            isEnrolled={
              currentUser 
                ? enrollments.some(e => e.course_id === selectedCourse.id && e.user_id === currentUser.id && e.status === 'active')
                : false
            }
            onOpenClassroom={(course) => {
              setSelectedCourse(course);
              setActiveView('course-classroom');
            }}
            currentUser={currentUser}
          />
        )}

        {/* 4. Course Interface / Classroom (ONLY unlocked for enrolled courses) */}
        {activeView === 'course-classroom' && selectedCourse && (
          <CourseClassroomView
            course={selectedCourse}
            onBack={() => setActiveView(returnView || 'catalog')}
            onEnroll={handleEnroll}
            isEnrolled={
              currentUser 
                ? enrollments.some(e => e.course_id === selectedCourse.id && e.user_id === currentUser.id && e.status === 'active')
                : false
            }
            currentUser={currentUser}
            lessonProgress={lessonProgress}
            taskSubmissions={taskSubmissions}
            onCompleteLesson={handleCompleteLesson}
            onSubmitTask={handleSubmitTask}
            allCourses={courses}
            onSelectCourse={(c) => setSelectedCourse(c)}
          />
        )}

        {/* 5. Faculty Admin Console */}
        {activeView === 'admin' && (currentUser?.role === 'admin' || currentUser?.role === 'faculty' || currentUser?.role === 'instructor') && (
          <AdminPortalView
            courses={courses}
            taskSubmissions={taskSubmissions}
            onAddCourse={handleAddCourse}
            onUpdateCourse={handleUpdateCourse}
            onDeleteCourse={handleDeleteCourse}
            onAddModule={handleAddModule}
            onUpdateModule={handleUpdateModule}
            onDeleteModule={handleDeleteModule}
            onAddLesson={handleAddLesson}
            onUpdateLesson={handleUpdateLesson}
            onDeleteLesson={handleDeleteLesson}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
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

      {/* Coursera-Style Multi-Column Footer (Hidden only in focused classroom view) */}
      {activeView !== 'course-classroom' && (
        <footer className="bg-white border-t border-slate-200 mt-auto pt-14 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-xs text-slate-600">
            <div className="space-y-3">
              <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-xs inline-flex items-center gap-2">
                <img
                  src={aarohaLogo}
                  alt="Aaroha Technologies"
                  className="h-6 w-auto object-contain"
                />
                <span className="text-[9px] font-bold tracking-widest text-[#0056D2] uppercase pl-2 border-l border-slate-200">
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
      )}
    </div>
  );
}
