import React, { useState, useEffect, Suspense } from 'react';
import Navbar from './components/Navbar';
import UserCatalogView from './components/UserCatalogView';
import AuthModal from './components/AuthModal';
import ProfileModal from './components/ProfileModal';
import LeaderboardToggle from './components/LeaderboardToggle';
import LeaderboardDrawer from './components/LeaderboardDrawer';
import ErrorBoundary from './components/ErrorBoundary';

// Code-split heavy routes and role-based views for optimized initial load
const CourseBrochureView = React.lazy(() => import('./components/CourseBrochureView'));
const CourseClassroomView = React.lazy(() => import('./components/CourseClassroomView'));
const StudentPortalView = React.lazy(() => import('./components/StudentPortalView'));
const AdminPortalView = React.lazy(() => import('./components/AdminPortalView'));
const DegreesCertificatesView = React.lazy(() => import('./components/DegreesCertificatesView'));
const CertificateModal = React.lazy(() => import('./components/CertificateModal'));
const AccountActivationModal = React.lazy(() => import('./components/AccountActivationModal'));
import { initialUsers, initialCourses, initialEnrollments, initialLessonProgress, initialTaskSubmissions, initialCertificates, initialDegrees } from './mockData';
import { CheckCircle2 } from 'lucide-react';
import aarohaLogo from './assets/aaroha_logo.webp';
import { api } from './apiService';
import {
  ROUTES,
  HOMEPAGE_ROUTE,
  getAuthorizedDashboardView,
  isFacultyRole,
  getViewFromUrl,
  updateViewUrl
} from './routes';

function ViewLoadingFallback() {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <div className="w-8 h-8 border-3 border-[#0A7CB3] border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-semibold text-slate-600">Loading module...</span>
      </div>
    </div>
  );
}

export default function App() {
  const [users, setUsers] = useState([]);

  // Persist authentication across page refresh with instant hydration
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('aaroha_user');
      const token = localStorage.getItem('aaroha_token');
      if (saved && token) {
        return JSON.parse(saved);
      }
      if (saved && !token) {
        const u = JSON.parse(saved);
        localStorage.setItem('aaroha_token', 'aaroha_session_' + (u.id || 'usr') + '_' + Date.now());
        return u;
      }
      return null;
    } catch (e) {
      return null;
    }
  });

  const [activeView, setActiveView] = useState(() => {
    try {
      const urlView = getViewFromUrl();
      const savedUser = localStorage.getItem('aaroha_user');
      const user = savedUser ? JSON.parse(savedUser) : null;

      // Clean up legacy localStorage
      localStorage.removeItem('aaroha_view');
      localStorage.removeItem('aaroha_selected_course_id');

      // 1. If explicit view is requested in URL search:
      if (urlView) {
        if (urlView === ROUTES.ADMIN) {
          if (user && !isFacultyRole(user.role)) return ROUTES.STUDENT;
          if (!user && !localStorage.getItem('aaroha_token')) return HOMEPAGE_ROUTE;
        }
        if (urlView === ROUTES.STUDENT && !user && !localStorage.getItem('aaroha_token')) {
          return HOMEPAGE_ROUTE;
        }
        return urlView;
      }

      // Check session storage to maintain view persistence across refresh for authenticated users
      const sessionView = sessionStorage.getItem('aaroha_view');
      if (sessionView && user) {
        if (sessionView === ROUTES.ADMIN && isFacultyRole(user.role)) return ROUTES.ADMIN;
        if (sessionView === ROUTES.STUDENT) return ROUTES.STUDENT;
        if (sessionView === ROUTES.DEGREES) return ROUTES.DEGREES;
        if (sessionView === ROUTES.CATALOG) return ROUTES.CATALOG;
      }

      // If user is authenticated as admin or faculty, restore admin console on refresh
      if (user && isFacultyRole(user.role)) {
        return ROUTES.ADMIN;
      }

      // If user is authenticated as student, restore student dashboard on refresh
      if (user && (user.role || '').toLowerCase() === 'student') {
        return ROUTES.STUDENT;
      }

      // 2. Direct navigation to root '/' or no view query: always open configured public homepage
      return HOMEPAGE_ROUTE;
    } catch (e) {
      return HOMEPAGE_ROUTE;
    }
  });

  // Exclude single-use setup tokens and reset URLs from search indexing and crawler previews
  useEffect(() => {
    let robotsMeta = document.querySelector('meta[name="robots"]');
    const isSensitive = activeView === 'activate' || activeView === 'reset-password' || (typeof window !== 'undefined' && window.location.search.includes('token='));
    if (isSensitive) {
      if (!robotsMeta) {
        robotsMeta = document.createElement('meta');
        robotsMeta.name = 'robots';
        document.head.appendChild(robotsMeta);
      }
      robotsMeta.content = 'noindex, nofollow, noarchive';
    } else if (robotsMeta) {
      robotsMeta.content = 'index, follow';
    }
  }, [activeView]);

  const [viewingCertificate, setViewingCertificate] = useState(null);
  
  const [authModal, setAuthModal] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const pathname = window.location.pathname || '';
      const isReset = pathname.includes('reset') || params.has('reset_token') || params.get('mode') === 'reset';
      const rToken = params.get('reset_token') || (isReset ? params.get('token') : '') || '';
      if (isReset && rToken) {
        return {
          isOpen: true,
          mode: 'reset',
          initialResetToken: rToken,
          intendedCourse: null
        };
      }
    } catch (e) {}
    return {
      isOpen: false,
      mode: 'login',
      initialResetToken: '',
      intendedCourse: null
    };
  });

  const [activationToken, setActivationToken] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const pathname = window.location.pathname || '';
      if (pathname.includes('reset') || params.has('reset_token') || params.get('mode') === 'reset') {
        return '';
      }
      return params.get('token') || params.get('activation_token') || '';
    } catch (e) {
      return '';
    }
  });

  const [isActivationModalOpen, setIsActivationModalOpen] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const pathname = window.location.pathname || '';
      if (pathname.includes('reset') || params.has('reset_token') || params.get('mode') === 'reset') {
        return false;
      }
      return !!(params.get('token') || params.get('activation_token'));
    } catch (e) {
      return false;
    }
  });

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('modal') === 'profile';
    } catch (e) {
      return false;
    }
  });
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);

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

  const [enrollments, setEnrollments] = useState([]);
  const [lessonProgress, setLessonProgress] = useState([]);
  const [taskSubmissions, setTaskSubmissions] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [degrees, setDegrees] = useState([]);
  
  const [selectedCourse, setSelectedCourse] = useState(() => {
    try {
      const savedCourseId = sessionStorage.getItem('aaroha_selected_course_id');
      const cachedCourses = localStorage.getItem('aaroha_courses');
      const pool = cachedCourses ? JSON.parse(cachedCourses) : [];
      if (savedCourseId) {
        const found = pool.find(c => c.id === parseInt(savedCourseId));
        if (found) {
          return found;
        }
      }
      return pool.find(c => !c.is_deleted) || pool[0] || null;
    } catch (e) {
      return null;
    }
  });
  const [targetClassroomLessonId, setTargetClassroomLessonId] = useState(null);
  const [returnView, setReturnView] = useState('catalog');
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

  // Purge any legacy cached mock users immediately on app mount
  useEffect(() => {
    try {
      localStorage.removeItem('aaroha_all_users');
    } catch (e) {}
  }, []);

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

  useEffect(() => {
    try {
      localStorage.setItem('aaroha_degrees', JSON.stringify(degrees));
    } catch (e) {}
  }, [degrees]);

  // Track active view in tab-scoped sessionStorage and synchronize browser URL
  useEffect(() => {
    if (activeView) {
      try {
        sessionStorage.setItem('aaroha_view', activeView);
        updateViewUrl(activeView);
      } catch (e) {}
    }
  }, [activeView]);

  // Support browser Back and Forward navigation buttons
  useEffect(() => {
    const handlePopState = () => {
      const urlView = getViewFromUrl() || HOMEPAGE_ROUTE;
      setActiveView(urlView);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Ensure unauthenticated users attempting to access protected dashboards are prompted to sign in
  useEffect(() => {
    if (!currentUser && (activeView === ROUTES.ADMIN || activeView === ROUTES.STUDENT)) {
      setActiveView(HOMEPAGE_ROUTE);
      handleOpenAuth('login');
    }
  }, [currentUser, activeView]);

  // Centralized session unauthorized listener
  useEffect(() => {
    const unsubscribe = api.onUnauthorized((details) => {
      console.warn('[Aaroha App] Session unauthorized on endpoint:', details?.endpoint);
      if (localStorage.getItem('aaroha_token') || currentUser) {
        localStorage.removeItem('aaroha_token');
        localStorage.removeItem('aaroha_user');
        setCurrentUser(null);
        showToast('Session expired or authentication required. Please sign in.', 'error');
        handleOpenAuth('login');
      }
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Expose global auth opener for modal dialogues and forms
  useEffect(() => {
    window.__aaroha_open_auth = (tab = 'login', course = null) => handleOpenAuth(tab, course);
    return () => {
      delete window.__aaroha_open_auth;
    };
  }, []);

  // Auto-acquire session for demo role queries (?role=admin, ?role=faculty, ?role=student)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlRole = params.get('role');
      const token = localStorage.getItem('aaroha_token');
      if (urlRole && !token) {
        const demoEmail = urlRole === 'student' ? 'student@aaroha-inc.com' : 'admin@aaroha-inc.com';
        api.login(demoEmail, 'password123')
          .then(res => {
            if (res && res.user && res.token) {
              const verifiedUser = {
                ...res.user,
                avatar: res.user.avatar || '/avatars/3d/memo_13.png'
              };
              setCurrentUser(verifiedUser);
              localStorage.setItem('aaroha_user', JSON.stringify(verifiedUser));
              localStorage.setItem('aaroha_token', res.token);
              setIsBackendLive(true);
              showToast('Authenticated as ' + verifiedUser.full_name);
            }
          })
          .catch(() => {
            handleOpenAuth('login');
          });
      }
    } catch (e) {}
  }, []);

  // Ensure students without faculty clearance are redirected to their student dashboard
  useEffect(() => {
    if (currentUser && !isFacultyRole(currentUser.role) && activeView === ROUTES.ADMIN) {
      setActiveView(ROUTES.STUDENT);
      showToast('Faculty clearance required. Redirected to Student Dashboard.');
    }
  }, [currentUser, activeView]);

  useEffect(() => {
    if (selectedCourse?.id) {
      try {
        sessionStorage.setItem('aaroha_selected_course_id', String(selectedCourse.id));
      } catch (e) {}
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
              api.adminGetUsers()
                .then(usersRes => {
                  if (usersRes && Array.isArray(usersRes.users)) {
                    setUsers(usersRes.users);
                  }
                })
                .catch(() => {});
            } else {
              api.getMyEnrollments()
                .then(enrRes => {
                  if (enrRes && Array.isArray(enrRes.enrollments)) {
                    setEnrollments(enrRes.enrollments.map(e => ({
                      ...e,
                      id: e.enrollment_id || e.id,
                      user_id: e.user_id || verifiedUser.id,
                      status: e.status || e.enrollment_status || 'active'
                    })));
                  } else {
                    setEnrollments([]);
                  }
                })
                .catch(() => {
                  setEnrollments([]);
                });

              api.getMyCertificates()
                .then(certRes => {
                  if (certRes && Array.isArray(certRes.certificates)) {
                    setCertificates(certRes.certificates);
                  } else {
                    setCertificates([]);
                  }
                })
                .catch(() => {
                  setCertificates([]);
                });
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
            localStorage.removeItem('aaroha_selected_course_id');
            try {
              sessionStorage.removeItem('aaroha_view');
              sessionStorage.removeItem('aaroha_selected_course_id');
            } catch (e) {}
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

            const merged = activeServerCourses;
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

    // 3. Load accredited degree programs from API with fallback
    api.getDegrees()
      .then(res => {
        if (res && res.degrees && res.degrees.length > 0) {
          setDegrees(res.degrees);
        }
      })
      .catch(() => {});
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenAuth = (mode = 'login', intendedCourse = null) => {
    setAuthModal({
      isOpen: true,
      mode: mode,
      initialResetToken: '',
      intendedCourse: intendedCourse
    });
  };

  const handleOpenCourseDetails = async (courseOrId, targetLessonId = null) => {
    if (activeView === 'student' || activeView === 'catalog' || activeView === 'degrees' || activeView === 'admin') {
      setReturnView(activeView);
    }
    const courseId = (typeof courseOrId === 'object' && courseOrId !== null)
      ? (courseOrId.id || courseOrId.course_id)
      : courseOrId;
    const found = courses.find(c => String(c.id) === String(courseId) || String(c.course_id) === String(courseId));
    const course = (typeof courseOrId === 'object' && courseOrId !== null)
      ? { ...(found || {}), ...courseOrId, id: courseId }
      : (found || { id: courseId, title: 'Program Curriculum', modules: [] });

    const fallback = initialCourses.find(c => String(c.id) === String(courseId));
    const enriched = {
      ...course,
      id: courseId,
      modules: (course?.modules && course.modules.length > 0) ? course.modules : (fallback?.modules || [])
    };
    setSelectedCourse(enriched);
    try {
      if (courseId) sessionStorage.setItem('aaroha_selected_course_id', String(courseId));
    } catch (e) {}

    if (targetLessonId) {
      setTargetClassroomLessonId(targetLessonId);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Faculty and Admins can view courses anytime without getting enrolled!
    const isFacultyOrAdmin = Boolean(currentUser && isFacultyRole(currentUser.role));
    const isEnrolledInCourse = isFacultyOrAdmin || (currentUser 
      ? enrollments.some(e => 
          String(e.course_id) === String(courseId) && 
          e.user_id === currentUser.id && 
          (e.status === 'active' || e.status === 'completed') &&
          isEnrollmentWithinSixMonths(e)
        )
      : false);

    // Faculty, Admins, and Enrolled Students unlock Course Classroom directly!
    if (isEnrolledInCourse) {
      setActiveView('course-classroom');
    } else {
      setActiveView('course-brochure');
    }

    try {
      const res = await api.getCourseDetails(courseId || course.slug);
      if (res && res.course) {
        const serverCourse = res.course;
        const fb = initialCourses.find(c => String(c.id) === String(serverCourse.id));
        setSelectedCourse(prev => ({
          ...(prev || {}),
          ...serverCourse,
          modules: (serverCourse.modules && serverCourse.modules.length > 0) ? serverCourse.modules : (fb?.modules || prev?.modules || [])
        }));
        if (serverCourse.enrollment_id && Array.isArray(serverCourse.completed_lesson_ids)) {
          setLessonProgress(prev => {
            const filtered = prev.filter(p => p.enrollment_id !== serverCourse.enrollment_id);
            const current = serverCourse.completed_lesson_ids.map(lesId => ({
              enrollment_id: serverCourse.enrollment_id,
              lesson_id: lesId,
              is_completed: true,
              completed_at: new Date().toISOString()
            }));
            return [...filtered, ...current];
          });
        }
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
          avatar: res.user.avatar || '/avatars/3d/memo_13.png'
        };
        setCurrentUser(loggedUser);
        localStorage.setItem('aaroha_user', JSON.stringify(loggedUser));
        setIsBackendLive(true);

        if (isFacultyRole(loggedUser.role)) {
          setActiveView('admin');
          showToast('Signed in as Faculty: ' + loggedUser.full_name);
          api.getPendingSubmissions()
            .then(subRes => {
              if (subRes && subRes.submissions) setTaskSubmissions(subRes.submissions);
            })
            .catch(() => {});
          api.adminGetUsers()
            .then(usersRes => {
              if (usersRes && Array.isArray(usersRes.users)) {
                setUsers(usersRes.users);
              }
            })
            .catch(() => {});
        } else {
          if (authModal.intendedCourse) {
            executeEnrollment(loggedUser.id, authModal.intendedCourse.id);
          } else {
            setActiveView('student');
          }
          showToast('Welcome back, ' + loggedUser.full_name);
          api.getMyEnrollments()
            .then(enrRes => {
              if (enrRes && Array.isArray(enrRes.enrollments)) {
                setEnrollments(enrRes.enrollments.map(e => ({
                  ...e,
                  id: e.enrollment_id || e.id,
                  user_id: e.user_id || loggedUser.id,
                  status: e.status || e.enrollment_status || 'active'
                })));
              } else {
                setEnrollments([]);
              }
            })
            .catch(() => {
              setEnrollments([]);
            });
        }
        return true;
      }
    } catch (apiErr) {
      console.warn('API login error:', apiErr.message);
      if (apiErr.message && (apiErr.message.includes('deactivated') || apiErr.message.includes('pending activation') || apiErr.message.includes('revoked'))) {
        throw apiErr;
      }
    }

    showToast('Invalid email or password.');
    return false;
  };

  const handleActivationSuccess = (activatedUser, token) => {
    const verifiedUser = {
      ...activatedUser,
      avatar: activatedUser.avatar || '/avatars/3d/memo_13.png'
    };
    setCurrentUser(verifiedUser);
    localStorage.setItem('aaroha_user', JSON.stringify(verifiedUser));
    localStorage.setItem('aaroha_token', token);
    setIsBackendLive(true);
    const targetView = isFacultyRole(verifiedUser.role) ? 'admin' : 'student';
    setActiveView(targetView);
    showToast('Account activated! Welcome to your workspace, ' + (verifiedUser.full_name || ''));
    setIsActivationModalOpen(false);
    setActivationToken('');
    try {
      window.history.replaceState({}, document.title, '/?view=' + targetView);
    } catch (e) {}
  };

  const handleAdminOnboardUser = async (userData) => {
    try {
      const res = await api.adminCreateUser(userData);
      if (res && res.user) {
        const onboardedUser = {
          ...res.user,
          avatar: res.user.avatar || userData.avatar || '/avatars/3d/memo_13.png',
          title: res.user.title || userData.title || ''
        };
        setUsers(prev => [onboardedUser, ...prev.filter(u => u.email.toLowerCase() !== onboardedUser.email.toLowerCase())]);
        showToast('Institutional account onboarded for ' + onboardedUser.full_name);
        return onboardedUser;
      }
    } catch (apiErr) {
      console.warn('API user onboarding failed, provisioning local account:', apiErr.message);
    }

    // Local fallback
    const fallbackUser = {
      id: Date.now(),
      full_name: userData.full_name,
      email: userData.email,
      password: userData.password,
      role: userData.role || 'student',
      avatar: userData.avatar || '/avatars/3d/memo_13.png',
      title: userData.title || (userData.role === 'faculty' ? 'Faculty Instructor' : 'Student Fellow'),
      created_at: new Date().toISOString()
    };

    setUsers(prev => [fallbackUser, ...prev.filter(u => u.email.toLowerCase() !== fallbackUser.email.toLowerCase())]);
    showToast('Account provisioned for ' + fallbackUser.full_name);
    return fallbackUser;
  };

  const handleUpdateProfile = async (profileData) => {
    try {
      let updatedUser;
      if (profileData && profileData._alreadySaved) {
        // Already persisted to backend via ProfileSettingsModal
        updatedUser = {
          ...currentUser,
          ...profileData
        };
      } else {
        const res = await api.updateProfile(profileData);
        updatedUser = (res && res.user) ? res.user : {
          ...currentUser,
          ...profileData
        };
      }
      setCurrentUser(updatedUser);
      localStorage.setItem('aaroha_user', JSON.stringify(updatedUser));
      
      // Update in cached users list
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u));
      try {
        const savedUsers = JSON.parse(localStorage.getItem('aaroha_all_users') || '[]');
        const updatedUsers = savedUsers.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u);
        localStorage.setItem('aaroha_all_users', JSON.stringify(updatedUsers));
      } catch (e) {}

      // If user switched authority/role, adjust view
      if (isFacultyRole(updatedUser.role) && activeView === 'student') {
        setActiveView('admin');
      } else if (!isFacultyRole(updatedUser.role) && activeView === 'admin') {
        setActiveView('student');
      }

      showToast('Profile and preferences updated successfully!');
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

      if (isFacultyRole(updatedUser.role) && activeView === 'student') {
        setActiveView('admin');
      } else if (!isFacultyRole(updatedUser.role) && activeView === 'admin') {
        setActiveView('student');
      }

      showToast('Profile and avatar saved locally.');
      return updatedUser;
    }
  };

  const handleLogout = () => {
    api.logout();
    localStorage.removeItem('aaroha_user');
    localStorage.removeItem('aaroha_token');
    localStorage.removeItem('aaroha_view');
    localStorage.removeItem('aaroha_all_users');
    localStorage.removeItem('aaroha_selected_course_id');
    localStorage.removeItem('aaroha_enrollments');
    localStorage.removeItem('aaroha_lesson_progress');
    localStorage.removeItem('aaroha_task_submissions');
    localStorage.removeItem('aaroha_certificates');
    localStorage.removeItem('aaroha_degrees');
    try {
      sessionStorage.removeItem('aaroha_view');
      sessionStorage.removeItem('aaroha_selected_course_id');
      sessionStorage.removeItem('aaroha_active_dashboard_role');
    } catch (e) {}
    setCurrentUser(null);
    setUsers([]);
    setEnrollments([]);
    setLessonProgress([]);
    setTaskSubmissions([]);
    setCertificates([]);
    setSelectedCourse(null);
    setActiveView('catalog');
    showToast('Signed out of workspace.');
  };

  const executeEnrollment = async (userId, courseId) => {
    let enrollmentId = null;
    try {
      const res = await api.enroll(courseId);
      if (res && res.enrollment_id) {
        enrollmentId = res.enrollment_id;
      }
    } catch (err) {
      console.warn('API enrollment sync skipped (or offline):', err.message);
    }

    const alreadyEnrolled = enrollments.some(e => e.course_id === courseId && (e.user_id === userId || !e.user_id));
    if (!alreadyEnrolled) {
      const enrolledDate = new Date();
      const expiresDate = new Date();
      expiresDate.setMonth(expiresDate.getMonth() + 6);

      const newEnrollment = {
        id: enrollmentId || Date.now(),
        enrollment_id: enrollmentId || Date.now(),
        user_id: userId,
        course_id: courseId,
        status: 'active',
        enrolled_at: enrolledDate.toISOString(),
        expires_at: expiresDate.toISOString(),
        completed_at: null
      };
      setEnrollments(prev => [...prev, newEnrollment]);
    }
    handleOpenCourseDetails({ id: courseId });
    showToast('Enrolled successfully! Course interface unlocked.');
  };

  const handleEnroll = (courseOrId) => {
    const courseId = typeof courseOrId === 'object' ? courseOrId.id : courseOrId;
    const course = typeof courseOrId === 'object' ? courseOrId : courses.find(c => c.id === courseId);
    if (!currentUser) {
      handleOpenAuth('login', course);
      showToast('Please sign in with your institutional credentials to enroll.');
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
      const res = await api.completeLesson(lessonId);
      if (res && res.success) {
        const enrollmentId = res.enrollment_id || selectedCourse?.enrollment_id;
        setLessonProgress(prev => {
          const exists = prev.some(p => p.lesson_id === lessonId && p.enrollment_id === enrollmentId);
          if (exists) return prev;
          return [
            ...prev,
            {
              id: Date.now(),
              enrollment_id: enrollmentId,
              lesson_id: lessonId,
              is_completed: true,
              completed_at: new Date().toISOString()
            }
          ];
        });

        if (selectedCourse) {
          const updatedCompletedIds = res.completed_lesson_ids || [
            ...((selectedCourse.completed_lesson_ids) || []),
            lessonId
          ];
          setSelectedCourse(prev => ({
            ...prev,
            completed_lesson_ids: updatedCompletedIds,
            completed_lessons_count: res.completed_lessons_count ?? (prev?.completed_lessons_count ? prev.completed_lessons_count + 1 : 1),
            progress_percentage: res.progress_percentage ?? prev?.progress_percentage ?? 0
          }));

          if (res.course_completed) {
            setEnrollments(prev => prev.map(e => 
              e.course_id === selectedCourse.id && e.user_id === currentUser.id
                ? { ...e, status: 'completed', completed_at: new Date().toISOString() }
                : e
            ));
          }
        }
        showToast('Lecture marked as completed.');
      } else {
        showToast(res?.error || 'Could not mark lesson completed.');
      }
    } catch (err) {
      console.warn('API lesson completion error:', err.message);
      showToast(err.message || 'Failed to complete lesson.');
    }
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

    try {
      await api.deleteCourse(courseId);

      const updatedDeleted = Array.from(new Set([...deletedCourseIds, idStr, idNum]));
      setDeletedCourseIds(updatedDeleted);
      try {
        localStorage.setItem('aaroha_deleted_course_ids', JSON.stringify(updatedDeleted));
      } catch (e) {}

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

      showToast('Course successfully deleted.');
    } catch (err) {
      console.warn('API delete course error:', err.message);
      showToast('Cannot delete course: ' + (err.message || 'Server rejected deletion request.'));
      throw err;
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

  const handleGradeSubmission = async (submissionIdOrPayload, maybePayload) => {
    let submissionId, score, status, feedback;
    if (typeof submissionIdOrPayload === 'object' && submissionIdOrPayload !== null) {
      submissionId = submissionIdOrPayload.submissionId;
      score = submissionIdOrPayload.score;
      status = submissionIdOrPayload.status;
      feedback = submissionIdOrPayload.feedback;
    } else {
      submissionId = submissionIdOrPayload;
      score = maybePayload?.score;
      status = maybePayload?.status;
      feedback = maybePayload?.feedback;
    }

    try {
      await api.gradeSubmission(submissionId, { score, status, feedback });
    } catch (err) {
      console.warn('API grade submission sync skipped:', err.message);
    }

    const updated = taskSubmissions.map(s => {
      if (String(s.id) === String(submissionId)) {
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
        issuer_name: certData.issuer_name || currentUser?.full_name || 'Faculty',
        issuer_title: certData.issuer_title || currentUser?.title || '',
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

  const handleAddDegree = async (degreeData) => {
    let created = null;
    try {
      const res = await api.createDegree(degreeData);
      if (res && res.degree) {
        created = res.degree;
      }
    } catch (err) {
      console.warn('Backend API degree creation notice:', err.message);
    }

    const newDeg = created || {
      ...degreeData,
      id: Date.now()
    };

    setDegrees(prev => [newDeg, ...prev]);
    showToast('Accredited degree track authored successfully!');
    return newDeg;
  };

  const handleUpdateDegree = async (degreeId, degreeData) => {
    let updated = null;
    try {
      const res = await api.updateDegree(degreeId, degreeData);
      if (res && res.degree) {
        updated = res.degree;
      }
    } catch (err) {
      console.warn('Backend API degree update notice:', err.message);
    }

    const resolved = updated || { ...degreeData, id: degreeId };
    setDegrees(prev => prev.map(d => d.id === degreeId ? { ...d, ...resolved } : d));
    showToast('Accredited degree specifications updated!');
    return resolved;
  };

  const handleDeleteDegree = async (degreeId) => {
    try {
      await api.deleteDegree(degreeId);
    } catch (err) {
      console.warn('Backend API degree deletion notice:', err.message);
    }

    setDegrees(prev => prev.filter(d => d.id !== degreeId));
    showToast('Accredited degree track archived.');
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
    <div className="min-h-screen bg-slate-50 dark:bg-[#070e1b] text-slate-900 dark:text-slate-100 flex flex-col font-sans overflow-x-hidden transition-colors duration-200">
      {/* Skip to Main Content Link for Keyboard and Screen-Reader Users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-100 focus:px-4 focus:py-2.5 focus:bg-[#0A7CB3] focus:text-white focus:text-sm focus:font-bold focus:rounded-xl focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-white transition-all"
      >
        Skip to main content
      </a>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Main Navbar (Hidden in focused classroom view and administrative workspace shell) */}
      {activeView !== 'course-classroom' && activeView !== 'admin' && (
        <Navbar
          currentUser={currentUser}
          activeView={activeView}
          setActiveView={setActiveView}
          onOpenAuth={() => handleOpenAuth('login', null)}
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
      <main id="main-content" tabIndex={-1} className={`flex-1 w-full focus:outline-none ${activeView === 'course-classroom' || activeView === 'admin' || activeView === 'catalog' ? 'p-0 max-w-none' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6'}`}>
        <ErrorBoundary>
          <Suspense fallback={<ViewLoadingFallback />}>
        {/* 1. Main Course Catalog */}
        {activeView === 'catalog' && (
          <UserCatalogView
            courses={courses}
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
            showToast={showToast}
            onOpenCourse={(course) => handleOpenCourseDetails(course)}
            onExploreCatalog={() => {
              setActiveView(HOMEPAGE_ROUTE);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onViewWebsite={() => {
              setActiveView(HOMEPAGE_ROUTE);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenProfile={() => setIsProfileModalOpen(true)}
            currentUser={currentUser}
          />
        )}

        {/* 3. Certificates & Credential Verification Portal */}
        {activeView === 'degrees' && (
          <DegreesCertificatesView
            courses={courses}
            certificates={certificates}
            currentUser={currentUser}
            onOpenCourseDetails={handleOpenCourseDetails}
            onViewCertificate={(cert) => setViewingCertificate(cert)}
            onExploreCatalog={() => setActiveView('catalog')}
            initialTab="verify"
          />
        )}

        {/* 3. Course Brochure (Shown for un-enrolled courses) */}
        {activeView === 'course-brochure' && selectedCourse && (
          <CourseBrochureView
            course={selectedCourse}
            onBack={() => setActiveView(returnView || 'catalog')}
            onEnroll={handleEnroll}
            isEnrolled={
              Boolean(
                (currentUser && isFacultyRole(currentUser.role)) ||
                (currentUser 
                  ? enrollments.some(e => 
                      e.course_id === selectedCourse.id && 
                      e.user_id === currentUser.id && 
                      (e.status === 'active' || e.status === 'completed') &&
                      isEnrollmentWithinSixMonths(e)
                    )
                  : false)
              )
            }
            onOpenClassroom={(course, lesson) => {
              handleOpenCourseDetails(course, lesson?.id);
            }}
            currentUser={currentUser}
          />
        )}

        {/* 4. Course Interface / Classroom (Unlocked for Enrolled Students, Faculty, and Admins) */}
        {activeView === 'course-classroom' && selectedCourse && (
          <CourseClassroomView
            course={selectedCourse}
            initialLessonId={targetClassroomLessonId}
            onBack={() => setActiveView(returnView || (currentUser && isFacultyRole(currentUser.role) ? 'admin' : 'student'))}
            onCourseComplete={(completedCourse) => {
              setEnrollments(prev => prev.map(e => 
                e.course_id === completedCourse.id && (!currentUser || e.user_id === currentUser.id)
                  ? { ...e, status: 'completed', completed_at: new Date().toISOString() }
                  : e
              ));
              setActiveView(currentUser && isFacultyRole(currentUser.role) ? 'admin' : 'student');
              showToast(`Congratulations! You completed all modules in ${completedCourse?.title || 'the program'}.`);
            }}
            onEnroll={handleEnroll}
            isEnrolled={
              Boolean(
                (currentUser && isFacultyRole(currentUser.role)) ||
                (currentUser 
                  ? enrollments.some(e => 
                      e.course_id === selectedCourse.id && 
                      e.user_id === currentUser.id && 
                      (e.status === 'active' || e.status === 'completed') &&
                      isEnrollmentWithinSixMonths(e)
                    )
                  : false)
              )
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

        {/* 5. Enterprise Admin & Faculty Console */}
        {activeView === 'admin' && currentUser && isFacultyRole(currentUser.role) && (
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
            onViewCourse={(c, lessonId) => handleOpenCourseDetails(c, lessonId)}
            currentUser={currentUser}
            enrolledStudents={users.filter(u => u.role === 'student')}
            users={users}
            onOnboardUser={handleAdminOnboardUser}
            onViewWebsite={() => {
              setActiveView('catalog');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onLogout={handleLogout}
          />
        )}
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModal.isOpen}
        onClose={() => setAuthModal({ isOpen: false, mode: 'login', initialResetToken: '', intendedCourse: null })}
        onLogin={handleLogin}
        intendedCourseTitle={authModal.intendedCourse?.title}
        initialMode={authModal.mode || 'login'}
        initialResetToken={authModal.initialResetToken || ''}
      />

      {/* Suspended Modal Layer for Lazy Loaded Modals */}
      <Suspense fallback={null}>
        {/* Account Activation Modal */}
        {isActivationModalOpen && (
          <AccountActivationModal
            isOpen={isActivationModalOpen}
            token={activationToken}
            onClose={() => {
              setIsActivationModalOpen(false);
              setActivationToken('');
              try {
                const cleanPath = window.location.pathname.replace(/\/activate\/?$/, '/');
                const params = new URLSearchParams(window.location.search);
                params.delete('token');
                params.delete('activation_token');
                if (!params.has('view') && currentUser) {
                  const dashView = isFacultyRole(currentUser.role) ? 'admin' : 'student';
                  params.set('view', dashView);
                }
                const q = params.toString();
                window.history.replaceState({}, document.title, (cleanPath || '/') + (q ? ('?' + q) : ''));
              } catch (e) {}
            }}
            onSuccess={handleActivationSuccess}
            onOpenLogin={() => handleOpenAuth('login')}
          />
        )}

        {/* Official Accredited Digital Certificate Viewer Modal */}
        {viewingCertificate && (
          <CertificateModal
            isOpen={!!viewingCertificate}
            onClose={() => setViewingCertificate(null)}
            certificate={viewingCertificate}
          />
        )}
      </Suspense>

      {/* User Profile & Avatar Customization Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        onSaveProfile={handleUpdateProfile}
        onLogout={handleLogout}
      />

      {/* Student Ranking Leaderboard Toggle on Right Edge (Student Workspace Only) */}
      {activeView === 'student' && (
        <>
          <LeaderboardToggle 
            isOpen={isLeaderboardOpen} 
            onToggle={() => setIsLeaderboardOpen(prev => !prev)} 
          />

          <LeaderboardDrawer
            isOpen={isLeaderboardOpen}
            onClose={() => setIsLeaderboardOpen(false)}
            currentUser={currentUser}
            courses={courses}
            showToast={showToast}
          />
        </>
      )}

      {/* Multi-Column Footer (Hidden in focused classroom view and administrative workspace shell) */}
      {activeView !== 'course-classroom' && activeView !== 'admin' && (
        <footer className="bg-white dark:bg-[#0a101f] border-t border-slate-200 dark:border-slate-800 mt-auto pt-14 pb-10 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-xs text-slate-600 dark:text-slate-400">
            <div className="space-y-3">
              <div 
                className="bg-white dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs inline-flex items-center cursor-pointer hover:border-slate-300 dark:hover:border-slate-600"
                onClick={() => {
                  setActiveView('catalog');
                  setSelectedCategory('All');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <img
                  src={aarohaLogo}
                  alt="Aaroha Technologies"
                  className="h-6 w-auto object-contain"
                />
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                Empowering principal engineers and technology leaders with production-calibrated curricula and accredited certifications.
              </p>
            </div>

            <div className="space-y-2">
              <h4 
                onClick={() => {
                  setActiveView('degrees');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider hover:text-[#0A7CB3] dark:hover:text-sky-400 cursor-pointer"
              >
                Certificates & Verification
              </h4>
              <ul className="space-y-1.5 text-[11px]">
                <li onClick={() => { setActiveView('degrees'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-[#0A7CB3] dark:hover:text-sky-400 cursor-pointer">Verify Credential by ID</li>
                <li onClick={() => { setActiveView('degrees'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-[#0A7CB3] dark:hover:text-sky-400 cursor-pointer">Accredited Course Certificates</li>
                <li onClick={() => { setActiveView('degrees'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-[#0A7CB3] dark:hover:text-sky-400 cursor-pointer">Student Issued Credentials</li>
                <li onClick={() => { setActiveView('catalog'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-[#0A7CB3] dark:hover:text-sky-400 cursor-pointer">Browse All Curricula</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider">Community & Research</h4>
              <ul className="space-y-1.5 text-[11px]">
                <li className="hover:text-[#0A7CB3] dark:hover:text-sky-400 cursor-pointer">Aaroha Systems Lab</li>
                <li className="hover:text-[#0A7CB3] dark:hover:text-sky-400 cursor-pointer">Faculty Portal</li>
                <li className="hover:text-[#0A7CB3] dark:hover:text-sky-400 cursor-pointer">RFC Technical Artifacts</li>
                <li 
                  onClick={() => {
                    setActiveView('degrees');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-[#0A7CB3] dark:hover:text-sky-400 cursor-pointer font-semibold text-[#0A7CB3] dark:text-sky-400"
                >
                  Verified Digital Credentials
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider">Enterprise & Campus</h4>
              <ul className="space-y-1.5 text-[11px]">
                <li className="hover:text-[#0A7CB3] dark:hover:text-sky-400 cursor-pointer">Aaroha for Enterprise</li>
                <li className="hover:text-[#0A7CB3] dark:hover:text-sky-400 cursor-pointer">Institutional Accreditation</li>
                <li className="hover:text-[#0A7CB3] dark:hover:text-sky-400 cursor-pointer">Hostinger LAMP Architecture</li>
                <li className="hover:text-[#0A7CB3] dark:hover:text-sky-400 cursor-pointer">Aaroha Inc. Corporate</li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500 dark:text-slate-400">
            <div>
              © 2026 Aaroha Inc. All rights reserved.
            </div>
            <div className="flex items-center gap-6 font-medium">
              <span className="hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer">Privacy Policy</span>
              <span className="hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer">Terms of Service</span>
              <span className="hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer">Security & Compliance</span>
            </div>
          </div>
        </div>
      </footer>
      )}
    </div>
  );
}
