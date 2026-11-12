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
    ...getAuthHeader(),
    ...options.headers
  };

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
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

  createModule: (courseId, data) => request(`/courses/${courseId}/modules`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  createLesson: (moduleId, data) => request(`/modules/${moduleId}/lessons`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  createTask: (moduleId, data) => request(`/modules/${moduleId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Student Actions
  enroll: (courseId) => request(`/courses/${courseId}/enroll`, {
    method: 'POST'
  }),

  getMyEnrollments: () => request('/student/enrollments'),

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

  gradeSubmission: (submissionId, data) => request(`/admin/submissions/${submissionId}/grade`, {
    method: 'POST',
    body: JSON.stringify(data)
  })
};

