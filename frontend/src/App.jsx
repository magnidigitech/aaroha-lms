import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import UserCatalogView from './components/UserCatalogView';
import CourseBrochureView from './components/CourseBrochureView';
import CourseClassroomView from './components/CourseClassroomView';
import StudentPortalView from './components/StudentPortalView';
import AdminPortalView from './components/AdminPortalView';
import AuthModal from './components/AuthModal';
import ProfileModal from './components/ProfileModal';
import { initialUsers, initialCourses, initialEnrollments, initialLessonProgress, initialTaskSubmissions, initialCertificates } from './mockData';
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

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [deletedCourseIds, setDeletedCourseIds] = useState(() => {
    try {
      const saved = localStorage.getItem('aaroha_deleted_course_ids');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [courses, setCourses] = useState(() => {
    try {
      const rawDeleted = JSON.parse(localStorage.getItem('aaroha_deleted_course_ids') || '[]');
      const deletedSet = new Set(rawDeleted.map(id => String(id)));
      const isDeleted = (id) => deletedSet.has(String(id));
      const saved = localStorage.getItem('aaroha_courses');
      const pool = saved ? JSON.parse(saved) : initialCourses;
      return pool.filter(c => !isDeleted(c.id) && !c.is_deleted);
    } catch (e) {
      return initialCourses.filter(c => !c.is_deleted);
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

  const [certificates, setCertificates] = useState(() => {
    try {
      const saved = localStorage.getItem('aaroha_certificates');
      return saved ? JSON.parse(saved) : initialCertificates;
    } catch (e) {
      return initialCertificates;
    }
  });
  
  const [selectedCourse, setSelectedCourse] = useState(() => {
    try {
      const savedCourseId = localStorage.getItem('aaroha_selected_course_id');
      const cachedCourses = localStorage.getItem('aaroha_courses');
      const pool = cachedCourses ? JSON.parse(cachedCourses) : initialCourses.filter(c => !c.is_deleted);
      if (savedCourseId) {
        const found = pool.find(c => c.id === parseInt(savedCourseId));
        if (found) return found;
      }
      return pool.find(c => !c.is_deleted) || pool[0] || null;
    } catch (e) {
      return initialCourses.find(c => !c.is_deleted) || null;
    }
  });
  const [returnView, setReturnView] = useState('catalog');
  const [activeStudentCourseId, setActiveStudentCourseId] = useState(2);
  const [toastMessage, setToastMessage] = useState(null);
  const [isBackendLive, setIsBackendLive] = useState(false);

  // Helper: Course stays valid for 6 months from enrollment start date
  const isEnrollmentWithinSixMonths = (enrollment) => {
    if (!enrollment) return false;
    if (enrollment.status === 'dropped') return false;

    const enrolledStr = String(enrollment.enrolled_at || '').replace(' ', 'T');
    const parsedEnrolled = enrolledStr ? new Date(enrolledStr).getTime() : NaN;
    const enrolledTime = !isNaN(parsedEnrolled) ? parsedEnrolled : Date.now();

    const sixMonthsMs = 183 * 24 * 60 * 60 * 1000;
    const expiresStr = enrollment.expires_at ? String(enrollment.expires_at).replace(' ', 'T') : '';
    const parsedExpires = expiresStr ? new Date(expiresStr).getTime() : NaN;
    const expiresTime = !isNaN(parsedExpires) ? parsedExpires : enrolledTime + sixMonthsMs;

    return Date.now() <= expiresTime;
  };

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

  useEffect(() => {
    try {
      localStorage.setItem('aaroha_certificates', JSON.stringify(certificates));
    } catch (e) {}
  }, [certificates]);

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

              api.getMyCertificates()
                .then(certRes => {
                  if (certRes && certRes.certificates && certRes.certificates.length > 0) {
                    setCertificates(prev => {
                      const codeMap = new Map();
                      prev.forEach(c => codeMap.set(c.certificate_code, c));
                      certRes.certificates.forEach(c => codeMap.set(c.certificate_code, c));
                      return Array.from(codeMap.values());
                    });
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

    // 2. Load courses from API with persistent non-destructive merge & delete preservation
    api.getCourses()
      .then(res => {
        if (res && res.courses && res.courses.length > 0) {
          setCourses(prev => {
            const rawDeleted = JSON.parse(localStorage.getItem('aaroha_deleted_course_ids') || '[]');
            const deletedSet = new Set(rawDeleted.map(id => String(id)));
            const isDeleted = (id) => deletedSet.has(String(id));
            const activeServerCourses = res.courses.filter(c => !isDeleted(c.id));
            const serverIdSet = new Set(activeServerCourses.map(c => String(c.id)));

            // Non-destructive merge: NEVER remove any course from prev unless it was explicitly deleted by faculty!
            // Retains newly created courses, local additions, and server updates seamlessly.
            const localCoursesToKeep = (prev || []).filter(c => 
              !serverIdSet.has(String(c.id)) && !isDeleted(c.id) && !c.is_deleted
            );
            const merged = [...activeServerCourses, ...localCoursesToKeep];
            try {
              localStorage.setItem('aaroha_courses', JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });

          setSelectedCourse(prevSel => {
            if (!prevSel) return prevSel;
            const rawDeleted = JSON.parse(localStorage.getItem('aaroha_deleted_course_ids') || '[]');
            const deletedSet = new Set(rawDeleted.map(id => String(id)));
            const activeServerCourses = res.courses.filter(c => !deletedSet.has(String(c.id)));
            const serverUpdated = activeServerCourses.find(c => String(c.id) === String(prevSel.id));
            return serverUpdated || prevSel;
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

    // Strictly check if current user is enrolled in this course (active or completed within 6-month validity period):
    const isEnrolledInCourse = currentUser 
      ? enrollments.some(e => 
          e.course_id === course.id && 
          e.user_id === currentUser.id && 
          (e.status === 'active' || e.status === 'completed') &&
          isEnrollmentWithinSixMonths(e)
        )
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
          avatar: res.user.avatar || userData.avatar || (isFacultyRole(res.user.role) ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&h=256&q=80' : 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&h=256&q=80'),
          title: res.user.title || userData.title || (isFacultyRole(res.user.role) ? 'Faculty Director' : 'Learner / Systems Fellow')
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
      avatar: userData.avatar || (isFacultyRole(userData.role) ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&h=256&q=80' : 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&h=256&q=80'),
      title: userData.title || (isFacultyRole(userData.role) ? 'Faculty Director' : 'Learner / Systems Fellow')
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

  const handleUpdateProfile = async (profileData) => {
    try {
      const res = await api.updateProfile(profileData);
      const updatedUser = (res && res.user) ? res.user : {
        ...currentUser,
        ...profileData
      };
      setCurrentUser(updatedUser);
      localStorage.setItem('aaroha_user', JSON.stringify(updatedUser));
      
      // Update in cached users list
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u));
      try {
        const savedUsers = JSON.parse(localStorage.getItem('aaroha_all_users') || '[]');
        const updatedUsers = savedUsers.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u);
        localStorage.setItem('aaroha_all_users', JSON.stringify(updatedUsers));
      } catch (e) {}

      showToast('Profile and avatar updated successfully!');
      return updatedUser;
    } catch (err) {
      console.warn('Backend profile update failed or offline, updating locally:', err.message);
      const updatedUser = {
        ...currentUser,
        ...profileData
      };
      setCurrentUser(updatedUser);
      localStorage.setItem('aaroha_user', JSON.stringify(updatedUser));
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u));
      showToast('Profile and avatar saved locally.');
      return updatedUser;
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
      const enrolledDate = new Date();
      const expiresDate = new Date();
      expiresDate.setMonth(expiresDate.getMonth() + 6);

      const newEnrollment = {
        id: Date.now(),
        user_id: userId,
        course_id: courseId,
        status: 'active',
        enrolled_at: enrolledDate.toISOString(),
        expires_at: expiresDate.toISOString(),
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

    setLessonProgress(prev => {
      const idx = prev.findIndex(p => p.lesson_id === lessonId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], is_completed: true, completed_at: new Date().toISOString() };
        return copy;
      }
      return [
        ...prev,
        {
          id: Date.now(),
          enrollment_id: 501,
          lesson_id: lessonId,
          is_completed: true,
          completed_at: new Date().toISOString()
        }
      ];
    });

    if (selectedCourse) {
      const allLessons = (selectedCourse.modules || []).flatMap(m => m.lessons || []);
      const completedIds = new Set(
        lessonProgress.filter(p => p.is_completed).map(p => p.lesson_id)
      );
      completedIds.add(lessonId);
      const isAllDone = allLessons.length > 0 && allLessons.every(l => completedIds.has(l.id));
      if (isAllDone) {
        setEnrollments(prev => prev.map(e => 
          e.course_id === selectedCourse.id && (!currentUser || e.user_id === currentUser.id)
            ? { ...e, status: 'completed', completed_at: new Date().toISOString() }
            : e
        ));
      }
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
    let apiError = null;
    try {
      const res = await api.createCourse(newCourseData);
      if (res && res.course) {
        createdCourse = res.course;
      }
    } catch (err) {
      apiError = err;
      console.warn('API create course sync notice:', err.message);
    }

    const newCourse = createdCourse || {
      ...newCourseData,
      id: Date.now(),
      created_by: currentUser?.id || 1,
      is_local_draft: true,
      modules: []
    };

    if (newCourse.id) {
      const idStr = String(newCourse.id);
      setDeletedCourseIds(prev => {
        const filtered = prev.filter(id => String(id) !== idStr);
        try {
          localStorage.setItem('aaroha_deleted_course_ids', JSON.stringify(filtered));
        } catch (e) {}
        return filtered;
      });
    }

    setCourses(prev => {
      const updated = [newCourse, ...prev];
      try {
        localStorage.setItem('aaroha_courses', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    if (createdCourse) {
      showToast('Program successfully published and saved to database.');
    } else {
      showToast('Program saved locally (' + (apiError?.message || 'Offline mode') + ')');
    }
  };

  const handleAddModule = async (courseId, title) => {
    let createdModule = null;
    try {
      const res = await api.createModule(courseId, { title });
      if (res && (res.module || res.module_id)) {
        createdModule = res.module || {
          id: res.module_id,
          course_id: courseId,
          title,
          sequence_order: 1,
          lessons: [],
          tasks: []
        };
      }
    } catch (err) {
      console.warn('API create module sync skipped:', err.message);
    }

    setCourses(prev => {
      const updated = prev.map(c => {
        if (String(c.id) === String(courseId)) {
          const newMod = createdModule || {
            id: Date.now(),
            course_id: courseId,
            title: title,
            sequence_order: (c.modules?.length || 0) + 1,
            lessons: [],
            tasks: []
          };
          const updatedMods = [...(c.modules || []), newMod];
          return { ...c, modules: updatedMods };
        }
        return c;
      });
      try {
        localStorage.setItem('aaroha_courses', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    setSelectedCourse(prevSel => {
      if (!prevSel || String(prevSel.id) !== String(courseId)) return prevSel;
      const newMod = createdModule || {
        id: Date.now(),
        course_id: courseId,
        title: title,
        sequence_order: (prevSel.modules?.length || 0) + 1,
        lessons: [],
        tasks: []
      };
      return { ...prevSel, modules: [...(prevSel.modules || []), newMod] };
    });

    showToast('Module appended to syllabus.');
  };

  const handleAddLesson = async (courseId, moduleId, lessonData) => {
    let createdLesson = null;
    try {
      const res = await api.createLesson(moduleId, lessonData);
      if (res && (res.lesson || res.lesson_id)) {
        createdLesson = res.lesson || {
          ...lessonData,
          id: res.lesson_id,
          module_id: moduleId
        };
      }
    } catch (err) {
      console.warn('API create lesson sync skipped:', err.message);
    }

    const lessonToInsert = createdLesson || {
      ...lessonData,
      id: Date.now(),
      module_id: moduleId
    };

    setCourses(prev => {
      const updated = prev.map(c => {
        if (String(c.id) === String(courseId)) {
          const updatedModules = (c.modules || []).map(m => {
            if (String(m.id) === String(moduleId)) {
              const fullLesson = {
                ...lessonToInsert,
                sequence_order: (m.lessons?.length || 0) + 1
              };
              return { ...m, lessons: [...(m.lessons || []), fullLesson] };
            }
            return m;
          });
          return { ...c, modules: updatedModules };
        }
        return c;
      });
      try {
        localStorage.setItem('aaroha_courses', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    setSelectedCourse(prevSel => {
      if (!prevSel || String(prevSel.id) !== String(courseId)) return prevSel;
      const updatedModules = (prevSel.modules || []).map(m => {
        if (String(m.id) === String(moduleId)) {
          const fullLesson = {
            ...lessonToInsert,
            sequence_order: (m.lessons?.length || 0) + 1
          };
          return { ...m, lessons: [...(m.lessons || []), fullLesson] };
        }
        return m;
      });
      return { ...prevSel, modules: updatedModules };
    });

    showToast('Lecture saved to module.');
  };

  const handleAddTask = async (courseId, moduleId, taskData) => {
    let createdTask = null;
    try {
      const res = await api.createTask(moduleId, taskData);
      if (res && (res.task || res.task_id)) {
        createdTask = res.task || {
          ...taskData,
          id: res.task_id,
          module_id: moduleId,
          is_mandatory: true
        };
      }
    } catch (err) {
      console.warn('API create task sync skipped:', err.message);
    }

    const taskToInsert = createdTask || {
      ...taskData,
      id: Date.now(),
      module_id: moduleId,
      is_mandatory: true
    };

    setCourses(prev => {
      const updated = prev.map(c => {
        if (String(c.id) === String(courseId)) {
          const updatedModules = (c.modules || []).map(m => {
            if (String(m.id) === String(moduleId)) {
              return { ...m, tasks: [...(m.tasks || []), taskToInsert] };
            }
            return m;
          });
          return { ...c, modules: updatedModules };
        }
        return c;
      });
      try {
        localStorage.setItem('aaroha_courses', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    setSelectedCourse(prevSel => {
      if (!prevSel || String(prevSel.id) !== String(courseId)) return prevSel;
      const updatedModules = (prevSel.modules || []).map(m => {
        if (String(m.id) === String(moduleId)) {
          return { ...m, tasks: [...(m.tasks || []), taskToInsert] };
        }
        return m;
      });
      return { ...prevSel, modules: updatedModules };
    });

    showToast('Project deliverable added to syllabus.');
  };

  const handleUpdateCourse = async (courseId, courseData) => {
    try {
      await api.updateCourse(courseId, courseData);
    } catch (err) {
      console.warn('API update course sync skipped:', err.message);
    }
    setCourses(prev => {
      const updated = prev.map(c => {
        if (String(c.id) === String(courseId)) {
          const merged = { ...c, ...courseData, id: courseId, modules: c.modules || [] };
          return merged;
        }
        return c;
      });
      try {
        localStorage.setItem('aaroha_courses', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    setSelectedCourse(prevSel => {
      if (!prevSel || String(prevSel.id) !== String(courseId)) return prevSel;
      return { ...prevSel, ...courseData, id: courseId, modules: prevSel.modules || [] };
    });

    showToast('Program specifications updated.');
  };

  const handleDeleteCourse = async (courseId) => {
    const idStr = String(courseId);
    const idNum = Number(courseId);

    // 1. Immediately record in deleted courses set with dual type normalization
    const updatedDeleted = Array.from(new Set([...deletedCourseIds, idStr, idNum]));
    setDeletedCourseIds(updatedDeleted);
    try {
      localStorage.setItem('aaroha_deleted_course_ids', JSON.stringify(updatedDeleted));
    } catch (e) {}

    // 2. Remove from courses state and localStorage immediately
    setCourses(prev => {
      const updated = prev.filter(c => String(c.id) !== idStr);
      try {
        localStorage.setItem('aaroha_courses', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    if (selectedCourse && String(selectedCourse.id) === idStr) {
      setSelectedCourse(null);
      setActiveView('catalog');
    }

    // 3. Sync to API backend with admin/faculty override
    try {
      await api.deleteCourse(courseId);
      showToast('Program archived from curriculum directory.');
    } catch (err) {
      console.warn('API delete course sync notice:', err.message);
      showToast('Notice: Archive sync - ' + (err.message || 'Updated locally'));
    }
  };

  const handleUpdateModule = async (courseId, moduleId, moduleData) => {
    try {
      await api.updateModule(moduleId, moduleData);
    } catch (err) {
      console.warn('API update module sync skipped:', err.message);
    }
    setCourses(prev => {
      const updated = prev.map(c => {
        if (String(c.id) === String(courseId)) {
          const updatedMods = (c.modules || []).map(m => String(m.id) === String(moduleId) ? { ...m, ...moduleData } : m);
          return { ...c, modules: updatedMods };
        }
        return c;
      });
      try {
        localStorage.setItem('aaroha_courses', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    setSelectedCourse(prevSel => {
      if (!prevSel || String(prevSel.id) !== String(courseId)) return prevSel;
      const updatedMods = (prevSel.modules || []).map(m => String(m.id) === String(moduleId) ? { ...m, ...moduleData } : m);
      return { ...prevSel, modules: updatedMods };
    });

    showToast('Module specifications updated.');
  };

  const handleDeleteModule = async (courseId, moduleId) => {
    try {
      await api.deleteModule(moduleId);
    } catch (err) {
      console.warn('API delete module sync skipped:', err.message);
    }
    setCourses(prev => {
      const updated = prev.map(c => {
        if (String(c.id) === String(courseId)) {
          const updatedMods = (c.modules || []).filter(m => String(m.id) !== String(moduleId));
          return { ...c, modules: updatedMods };
        }
        return c;
      });
      try {
        localStorage.setItem('aaroha_courses', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    setSelectedCourse(prevSel => {
      if (!prevSel || String(prevSel.id) !== String(courseId)) return prevSel;
      const updatedMods = (prevSel.modules || []).filter(m => String(m.id) !== String(moduleId));
      return { ...prevSel, modules: updatedMods };
    });

    showToast('Module and contained lectures archived.');
  };

  const handleUpdateLesson = async (courseId, moduleId, lessonId, lessonData) => {
    try {
      await api.updateLesson(lessonId, lessonData);
    } catch (err) {
      console.warn('API update lesson sync skipped:', err.message);
    }
    setCourses(prev => {
      const updated = prev.map(c => {
        if (String(c.id) === String(courseId)) {
          const updatedMods = (c.modules || []).map(m => {
            if (String(m.id) === String(moduleId)) {
              return {
                ...m,
                lessons: (m.lessons || []).map(l => String(l.id) === String(lessonId) ? { ...l, ...lessonData } : l)
              };
            }
            return m;
          });
          return { ...c, modules: updatedMods };
        }
        return c;
      });
      try {
        localStorage.setItem('aaroha_courses', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    setSelectedCourse(prevSel => {
      if (!prevSel || String(prevSel.id) !== String(courseId)) return prevSel;
      const updatedMods = (prevSel.modules || []).map(m => {
        if (String(m.id) === String(moduleId)) {
          return {
            ...m,
            lessons: (m.lessons || []).map(l => String(l.id) === String(lessonId) ? { ...l, ...lessonData } : l)
          };
        }
        return m;
      });
      return { ...prevSel, modules: updatedMods };
    });

    showToast('Lecture updated successfully.');
  };

  const handleDeleteLesson = async (courseId, moduleId, lessonId) => {
    try {
      await api.deleteLesson(lessonId);
    } catch (err) {
      console.warn('API delete lesson sync skipped:', err.message);
    }
    setCourses(prev => {
      const updated = prev.map(c => {
        if (String(c.id) === String(courseId)) {
          const updatedMods = (c.modules || []).map(m => {
            if (String(m.id) === String(moduleId)) {
              return {
                ...m,
                lessons: (m.lessons || []).filter(l => String(l.id) !== String(lessonId))
              };
            }
            return m;
          });
          return { ...c, modules: updatedMods };
        }
        return c;
      });
      try {
        localStorage.setItem('aaroha_courses', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    setSelectedCourse(prevSel => {
      if (!prevSel || String(prevSel.id) !== String(courseId)) return prevSel;
      const updatedMods = (prevSel.modules || []).map(m => {
        if (String(m.id) === String(moduleId)) {
          return {
            ...m,
            lessons: (m.lessons || []).filter(l => String(l.id) !== String(lessonId))
          };
        }
        return m;
      });
      return { ...prevSel, modules: updatedMods };
    });

    showToast('Lecture archived.');
  };

  const handleUpdateTask = async (courseId, moduleId, taskId, taskData) => {
    try {
      await api.updateTask(taskId, taskData);
    } catch (err) {
      console.warn('API update task sync skipped:', err.message);
    }
    setCourses(prev => {
      const updated = prev.map(c => {
        if (String(c.id) === String(courseId)) {
          const updatedMods = (c.modules || []).map(m => {
            if (String(m.id) === String(moduleId)) {
              return {
                ...m,
                tasks: (m.tasks || []).map(t => String(t.id) === String(taskId) ? { ...t, ...taskData } : t)
              };
            }
            return m;
          });
          return { ...c, modules: updatedMods };
        }
        return c;
      });
      try {
        localStorage.setItem('aaroha_courses', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    setSelectedCourse(prevSel => {
      if (!prevSel || String(prevSel.id) !== String(courseId)) return prevSel;
      const updatedMods = (prevSel.modules || []).map(m => {
        if (String(m.id) === String(moduleId)) {
          return {
            ...m,
            tasks: (m.tasks || []).map(t => String(t.id) === String(taskId) ? { ...t, ...taskData } : t)
          };
        }
        return m;
      });
      return { ...prevSel, modules: updatedMods };
    });

    showToast('Assignment requirements updated.');
  };

  const handleDeleteTask = async (courseId, moduleId, taskId) => {
    try {
      await api.deleteTask(taskId);
    } catch (err) {
      console.warn('API delete task sync skipped:', err.message);
    }
    setCourses(prev => {
      const updated = prev.map(c => {
        if (String(c.id) === String(courseId)) {
          const updatedMods = (c.modules || []).map(m => {
            if (String(m.id) === String(moduleId)) {
              return {
                ...m,
                tasks: (m.tasks || []).filter(t => String(t.id) !== String(taskId))
              };
            }
            return m;
          });
          return { ...c, modules: updatedMods };
        }
        return c;
      });
      try {
        localStorage.setItem('aaroha_courses', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    setSelectedCourse(prevSel => {
      if (!prevSel || String(prevSel.id) !== String(courseId)) return prevSel;
      const updatedMods = (prevSel.modules || []).map(m => {
        if (String(m.id) === String(moduleId)) {
          return {
            ...m,
            tasks: (m.tasks || []).filter(t => String(t.id) !== String(taskId))
          };
        }
        return m;
      });
      return { ...prevSel, modules: updatedMods };
    });

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

  const handleIssueCertificate = async (courseId, certData) => {
    let issued = null;
    try {
      const res = await api.issueCertificate(courseId, certData);
      if (res && res.certificate) {
        issued = res.certificate;
      }
    } catch (err) {
      console.warn('Backend API certificate issuance fallback:', err.message);
    }

    if (!issued) {
      const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      issued = {
        id: Date.now(),
        certificate_code: 'AAROHA-CERT-' + new Date().getFullYear() + '-' + randomHex + '-' + randomDigits,
        course_id: courseId,
        course_title: certData.course_title,
        user_id: certData.user_id,
        recipient_name: certData.recipient_name,
        recipient_email: certData.recipient_email,
        issuer_id: currentUser?.id || 1,
        issuer_name: certData.issuer_name || currentUser?.full_name || 'Dr. Aris Thorne',
        issuer_title: certData.issuer_title || currentUser?.title || 'Director of Curriculum & Distributed Systems Faculty',
        grade: certData.grade || 'Executive Distinction (Verified Peer Reviewed)',
        issued_at: certData.issued_at || new Date().toISOString()
      };
    }

    setCertificates(prev => [issued, ...prev.filter(c => c.certificate_code !== issued.certificate_code)]);

    // If recipient is an enrolled student, mark enrollment as completed
    if (issued.user_id) {
      setEnrollments(prev => prev.map(e => 
        String(e.course_id) === String(courseId) && String(e.user_id) === String(issued.user_id)
          ? { ...e, status: 'completed', completed_at: issued.issued_at || new Date().toISOString() }
          : e
      ));
    }

    showToast('Official Certificate generated and issued successfully!');
    return issued;
  };

  const pendingCount = taskSubmissions.filter(s => s.status === 'under_review').length;
  const enrolledCount = currentUser 
    ? enrollments.filter(e => 
        e.user_id === currentUser.id && 
        (e.status === 'active' || e.status === 'completed') &&
        isEnrollmentWithinSixMonths(e)
      ).length 
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
          onOpenProfile={() => setIsProfileModalOpen(true)}
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
            certificates={certificates}
            onOpenCourse={(course) => {
              setSelectedCourse(course);
              setReturnView('student');
              setActiveView('course-classroom');
            }}
            onExploreCatalog={() => setActiveView('catalog')}
            onOpenProfile={() => setIsProfileModalOpen(true)}
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
                ? enrollments.some(e => 
                    e.course_id === selectedCourse.id && 
                    e.user_id === currentUser.id && 
                    (e.status === 'active' || e.status === 'completed') &&
                    isEnrollmentWithinSixMonths(e)
                  )
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
            onBack={() => setActiveView(returnView || 'student')}
            onCourseComplete={(completedCourse) => {
              setEnrollments(prev => prev.map(e => 
                e.course_id === completedCourse.id && (!currentUser || e.user_id === currentUser.id)
                  ? { ...e, status: 'completed', completed_at: new Date().toISOString() }
                  : e
              ));
              setActiveView('student');
              showToast(`Congratulations! You completed all modules in ${completedCourse?.title || 'the program'}.`);
            }}
            onEnroll={handleEnroll}
            isEnrolled={
              currentUser 
                ? enrollments.some(e => 
                    e.course_id === selectedCourse.id && 
                    e.user_id === currentUser.id && 
                    (e.status === 'active' || e.status === 'completed') &&
                    isEnrollmentWithinSixMonths(e)
                  )
                : false
            }
            currentUser={currentUser}
            lessonProgress={lessonProgress}
            taskSubmissions={taskSubmissions}
            onCompleteLesson={handleCompleteLesson}
            onSubmitTask={handleSubmitTask}
            allCourses={courses}
            onSelectCourse={(c) => setSelectedCourse(c)}
            onOpenProfile={() => setIsProfileModalOpen(true)}
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
            onIssueCertificate={handleIssueCertificate}
            onOpenProfile={() => setIsProfileModalOpen(true)}
            currentUser={currentUser}
            enrolledStudents={users.filter(u => u.role === 'student')}
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

      {/* User Profile & Avatar Customization Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        onSaveProfile={handleUpdateProfile}
        onLogout={handleLogout}
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
