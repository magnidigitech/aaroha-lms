// Aaroha LMS - Production API Service Adapter
// Connects to the Hostinger PHP 8 REST API (/api/...)

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

function getAuthHeader() {
  const token = localStorage.getItem('aaroha_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function request(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    ...getAuthHeader(),
    ...options.headers
  };

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      cache: 'no-store',
      ...options,
      headers
    });

    const contentType = res.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      data = { error: text || `HTTP ${res.status} ${res.statusText}` };
    }

    if (!res.ok) {
      throw new Error(data.error || `Request failed with status ${res.status}`);
    }
    return data;
  } catch (err) {
    console.warn(`[Aaroha API Adapter] [${options.method || 'GET'}] ${endpoint}:`, err.message);
    throw err;
  }
}

export const api = {
  // Authentication
  login: async (email, password) => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (res.token) {
      localStorage.setItem('aaroha_token', res.token);
    }
    return res;
  },

  register: async (userData) => {
    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    if (res.token) {
      localStorage.setItem('aaroha_token', res.token);
    }
    return res;
  },

  logout: () => {
    localStorage.removeItem('aaroha_token');
    localStorage.removeItem('aaroha_user');
    localStorage.removeItem('aaroha_view');
  },

  getMe: () => request('/auth/me'),

  // Courses (Public & Enrolled)
  getCourses: () => request('/courses'),
  getCourseDetails: (idOrSlug) => request(`/courses/${idOrSlug}`),

  // Faculty / Admin Authoring
  createCourse: (data) => request('/courses', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  updateCourse: (courseId, data) => request(`/courses/${courseId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  deleteCourse: (courseId) => request(`/courses/${courseId}`, {
    method: 'DELETE'
  }),

  createModule: (courseId, data) => request(`/courses/${courseId}/modules`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  updateModule: (moduleId, data) => request(`/modules/${moduleId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  deleteModule: (moduleId) => request(`/modules/${moduleId}`, {
    method: 'DELETE'
  }),

  createLesson: (moduleId, data) => request(`/modules/${moduleId}/lessons`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  updateLesson: (lessonId, data) => request(`/lessons/${lessonId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  deleteLesson: (lessonId) => request(`/lessons/${lessonId}`, {
    method: 'DELETE'
  }),

  createTask: (moduleId, data) => request(`/modules/${moduleId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  updateTask: (taskId, data) => request(`/tasks/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  deleteTask: (taskId) => request(`/tasks/${taskId}`, {
    method: 'DELETE'
  }),

  // Student Actions
  enroll: (courseId) => request(`/courses/${courseId}/enroll`, {
    method: 'POST'
  }),

  getMyEnrollments: () => request('/student/enrollments'),

  // Authenticated Video Playback (Bunny Stream signed token)
  getLessonPlayback: (lessonId) => request(`/lessons/${lessonId}/playback`),

  completeLesson: (lessonId) => request(`/lessons/${lessonId}/complete`, {
    method: 'POST'
  }),

  submitTask: (taskId, data) => request(`/tasks/${taskId}/submit`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  getTaskSubmission: (taskId) => request(`/tasks/${taskId}/submission`),

  // Faculty Evaluation Queue
  getPendingSubmissions: () => request('/admin/submissions/pending'),

  gradeSubmission: (submissionId, data) => request('/admin/submissions/' + submissionId + '/grade', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Accredited Certificates
  issueCertificate: (courseId, data) => request('/courses/' + courseId + '/certificates', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  getCourseCertificates: (courseId) => request('/courses/' + courseId + '/certificates'),

  getMyCertificates: () => request('/student/certificates'),

  verifyCertificate: (code) => request('/certificates/verify/' + encodeURIComponent(code))
};

