// Aaroha LMS - Production API Service Adapter
// Connects to the Hostinger PHP 8 REST API (/api/...)

const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '/api';

export class ApiError extends Error {
  constructor(message, status = 0, details = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.field = details.field || null;
    this.validation_errors = details.validation_errors || details.fields || null;
    this.code = details.code || null;
    this.isHtmlResponse = details.isHtmlResponse || false;
    this.endpoint = details.endpoint || '';
    this.rawResponse = details.rawResponse || null;
    this.already_activated = details.already_activated || false;
  }

  get isUnauthorized() { return this.status === 401; }
  get isForbidden() { return this.status === 403; }
  get isNotFound() { return this.status === 404; }
  get isValidation() { return this.status === 400 || this.status === 422; }
  get isConflict() { return this.status === 409; }
  get isServer() { return this.status >= 500; }
}

let unauthorizedListeners = [];

export function onUnauthorized(callback) {
  if (typeof callback === 'function') {
    unauthorizedListeners.push(callback);
  }
  return () => {
    unauthorizedListeners = unauthorizedListeners.filter(cb => cb !== callback);
  };
}

function notifyUnauthorized(details) {
  unauthorizedListeners.forEach(cb => {
    try {
      cb(details);
    } catch (e) {
      console.warn('[Aaroha API Adapter] Error in unauthorized listener:', e);
    }
  });
}

function getAuthHeader() {
  const token = localStorage.getItem('aaroha_token');
  if (!token) return {};
  return {
    'Authorization': `Bearer ${token}`,
    'X-Authorization': `Bearer ${token}`,
    'X-Auth-Token': token
  };
}

async function request(endpoint, options = {}) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    ...getAuthHeader(),
    ...options.headers
  };

  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const res = await fetch(url, {
      cache: 'no-store',
      ...options,
      headers
    });

    // 1. Handle HTTP 204 No Content
    if (res.status === 204) {
      return { success: true, status: 204 };
    }

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    let data;

    // 2. Parse JSON responses
    if (contentType.includes('application/json')) {
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new ApiError('Failed to parse server JSON response.', res.status, {
          endpoint: cleanEndpoint,
          rawResponse: jsonErr.message
        });
      }

      if (!res.ok) {
        const errorMsg = data?.error || data?.message || `Request failed with status ${res.status}`;
        if (
          res.status === 401 &&
          !cleanEndpoint.startsWith('/auth/login') &&
          !cleanEndpoint.startsWith('/auth/register') &&
          !cleanEndpoint.startsWith('/auth/forgot-password') &&
          !cleanEndpoint.startsWith('/auth/reset-password') &&
          !cleanEndpoint.startsWith('/auth/verify-invitation')
        ) {
          notifyUnauthorized({ endpoint: cleanEndpoint, error: errorMsg, status: 401 });
        }
        throw new ApiError(errorMsg, res.status, {
          field: data?.field,
          validation_errors: data?.validation_errors || data?.fields,
          code: data?.code,
          endpoint: cleanEndpoint,
          rawResponse: data,
          already_activated: !!data?.already_activated
        });
      }

      return data;
    }

    // 3. Handle Non-JSON / HTML responses safely (prevent raw HTML leakage)
    const rawText = await res.text();
    const isHtml = /<html|<!doctype|<body|<head/i.test(rawText);

    let friendlyMessage;
    if (isHtml) {
      if (res.status === 404) {
        if (cleanEndpoint.includes('verify-invitation') || cleanEndpoint.includes('activate')) {
          friendlyMessage = 'This invitation setup link could not be found, has expired, or was already used. Please sign in or ask your administrator for a new setup link.';
        } else {
          friendlyMessage = 'The requested service endpoint was not found or is temporarily updating (HTTP 404). Please try again.';
        }
      } else if (res.status === 401) {
        friendlyMessage = 'Your session has expired. Please sign in again (HTTP 401).';
      } else if (res.status === 403) {
        friendlyMessage = 'You do not have permission to access this resource (HTTP 403).';
      } else if (res.status === 409) {
        friendlyMessage = 'The requested action conflicts with an existing record (HTTP 409).';
      } else if (res.status === 500) {
        friendlyMessage = 'An unexpected server error occurred (HTTP 500). Please try again.';
      } else if (res.status === 502 || res.status === 503 || res.status === 504) {
        friendlyMessage = `The server is temporarily unavailable or undergoing maintenance (HTTP ${res.status}).`;
      } else {
        friendlyMessage = `Server communication error (HTTP ${res.status}). Please check network connection.`;
      }
    } else {
      // Clean plain text: if short (< 200 chars) use it, else generic message
      friendlyMessage = (rawText && rawText.length < 200 && !rawText.includes('\n'))
        ? rawText.trim()
        : `Request returned non-JSON response (HTTP ${res.status}).`;
    }

    if (!res.ok) {
      if (res.status === 401) {
        notifyUnauthorized({ endpoint: cleanEndpoint, error: friendlyMessage, status: 401 });
      }
      throw new ApiError(friendlyMessage, res.status, {
        isHtmlResponse: isHtml,
        endpoint: cleanEndpoint,
        rawResponse: rawText.slice(0, 300)
      });
    }

    return { success: true, text: rawText };
  } catch (err) {
    if (err instanceof ApiError) {
      console.warn(`[Aaroha API Adapter] [${options.method || 'GET'}] ${cleanEndpoint} failed (${err.status}): ${err.message}`);
      throw err;
    }
    console.warn(`[Aaroha API Adapter] [${options.method || 'GET'}] ${cleanEndpoint} error:`, err.message);
    throw new ApiError(err.message || 'Network request failed', 0, { endpoint: cleanEndpoint });
  }
}

export const api = {
  // Blob and Binary Downloads
  downloadBlob: (endpoint, options = {}) => {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${API_BASE_URL}${cleanEndpoint}`;
    return fetch(url, {
      ...options,
      headers: {
        ...getAuthHeader(),
        ...options.headers
      }
    }).then(async (res) => {
      if (!res.ok) {
        throw new ApiError(`Download failed with status ${res.status}`, res.status, { endpoint: cleanEndpoint });
      }
      return await res.blob();
    });
  },

  // Authentication & Session
  getToken: () => localStorage.getItem('aaroha_token'),
  isAuthenticated: () => Boolean(localStorage.getItem('aaroha_token')),
  onUnauthorized,

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

  // Account Activation & Recovery
  verifyInvitation: (token) => request('/auth/verify-invitation?token=' + encodeURIComponent(token)),

  activateAccount: async (data) => {
    const res = await request('/auth/activate', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (res.token) {
      localStorage.setItem('aaroha_token', res.token);
    }
    return res;
  },

  forgotPassword: (email) => request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email })
  }),

  resetPassword: (data) => request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Administrator User Directory & Onboarding
  adminGetUsers: () => request('/admin/users'),
  adminCreateUser: (userData) => request('/admin/users', {
    method: 'POST',
    body: JSON.stringify(userData)
  }),
  adminResendInvitation: (userId) => request('/admin/invitations/resend', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId })
  }),
  adminGenerateSetupLink: (userId) => request('/admin/invitations/resend', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId })
  }),
  adminGenerateResetLink: (userId) => request('/admin/users/generate-reset-link', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId })
  }),
  adminRevokeInvitation: (userId) => request('/admin/invitations/revoke', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId })
  }),
  adminToggleFacultyStatus: (userId, data) => request('/admin/faculty/' + userId + '/toggle-status', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  logout: () => {
    localStorage.removeItem('aaroha_token');
    localStorage.removeItem('aaroha_user');
    localStorage.removeItem('aaroha_view');
    localStorage.removeItem('aaroha_selected_course_id');
    try {
      sessionStorage.removeItem('aaroha_view');
      sessionStorage.removeItem('aaroha_selected_course_id');
    } catch (e) {}
  },

  getMe: () => request('/auth/me'),

  updateProfile: async (profileData) => {
    const res = await request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
    if (res && res.token) {
      localStorage.setItem('aaroha_token', res.token);
    }
    return res;
  },

  // Courses (Public & Enrolled)
  getCourses: () => request('/courses'),
  adminGetCourses: () => request('/admin/courses'),
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

  verifyCertificate: (code) => request('/certificates/verify/' + encodeURIComponent(code)),

  // Student Ranking & Academic Leaderboard
  getLeaderboard: (courseId = null) => {
    const query = courseId ? `?course_id=${encodeURIComponent(courseId)}` : '';
    return request(`/leaderboard${query}`);
  },

  updateLeaderboardRanking: (rankingId, data) => request(`/leaderboard/${rankingId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  createLeaderboardRanking: (data) => request('/leaderboard', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  deleteLeaderboardRanking: (rankingId) => request(`/leaderboard/${rankingId}`, {
    method: 'DELETE'
  }),

  // Accredited Degree Programs (Faculty Authority)
  getDegrees: () => request('/degrees'),

  createDegree: (data) => request('/degrees', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  updateDegree: (degreeId, data) => request(`/degrees/${degreeId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  deleteDegree: (degreeId) => request(`/degrees/${degreeId}`, {
    method: 'DELETE'
  }),

  // Enterprise Admin Portal Endpoints
  adminGetDashboardStats: () => request('/admin/dashboard/stats'),

  // --- Student Lifecycle & Actions ---
  adminGetStudents: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/admin/students${q ? '?' + q : ''}`);
  },

  adminCreateStudent: (data) => request('/admin/students', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  adminGetStudentDetail: (userId) => request(`/admin/students/${userId}`),

  adminUpdateStudentProfile: (userId, data) => request(`/admin/students/${userId}/update`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  adminTransferStudentBatch: (userId, data) => request(`/admin/students/${userId}/transfer-batch`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  adminEnrollStudent: (userId, data) => request(`/admin/students/${userId}/enroll`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  adminWithdrawStudentEnrollment: (userId, data) => request(`/admin/students/${userId}/withdraw-enrollment`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  adminToggleStudentStatus: (userId, data) => request(`/admin/students/${userId}/toggle-status`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  adminDeactivateStudent: (userId, data = {}) => request(`/admin/students/${userId}/deactivate`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  adminReactivateStudent: (userId) => request(`/admin/students/${userId}/reactivate`, {
    method: 'POST'
  }),

  adminArchiveStudent: (userId, data = {}) => request(`/admin/students/${userId}/archive`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  adminRestoreStudent: (userId) => request(`/admin/students/${userId}/restore`, {
    method: 'POST'
  }),

  adminCheckStudentDeletion: (userId) => request(`/admin/students/${userId}/deletion-eligibility`),

  adminArchiveStudent: (userId) => request(`/admin/students/${userId}/archive`, {
    method: 'POST'
  }),

  adminRestoreStudent: (userId) => request(`/admin/students/${userId}/restore`, {
    method: 'POST'
  }),

  adminDeleteStudent: (userId) => request(`/admin/students/${userId}`, {
    method: 'DELETE'
  }),

  // --- Faculty Lifecycle & Workload ---
  adminGetFaculty: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/admin/faculty${q ? '?' + q : ''}`);
  },

  adminCreateFaculty: (data) => request('/admin/faculty', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  adminGetFacultyDetail: (facultyId) => request(`/admin/faculty/${facultyId}/detail`),

  adminUpdateFacultyProfile: (facultyId, data) => request(`/admin/faculty/${facultyId}/update`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  adminGetFacultyWorkload: (facultyId) => request(`/admin/faculty/${facultyId}/workload`),

  adminGetFacultyAssignments: (facultyId) => request(`/admin/faculty/${facultyId}/assignments`),

  adminAssignFacultyBatch: (facultyId, data) => request(`/admin/faculty/${facultyId}/assignments`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  adminRemoveFacultyAssignment: (facultyId, batchId) => request(`/admin/faculty/${facultyId}/assignments/${batchId}/remove`, {
    method: 'POST'
  }),

  adminDeactivateFaculty: (facultyId, data = {}) => request(`/admin/faculty/${facultyId}/deactivate`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  adminReactivateFaculty: (facultyId) => request(`/admin/faculty/${facultyId}/reactivate`, {
    method: 'POST'
  }),

  adminArchiveFaculty: (facultyId, data = {}) => request(`/admin/faculty/${facultyId}/archive`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  adminRestoreFaculty: (facultyId) => request(`/admin/faculty/${facultyId}/restore`, {
    method: 'POST'
  }),

  adminCheckFacultyDeletion: (facultyId) => request(`/admin/faculty/${facultyId}/deletion-eligibility`),

  adminDeleteFaculty: (facultyId, options = {}) => {
    const q = options?.force ? '?force=1' : '';
    return request(`/admin/faculty/${facultyId}${q}`, {
      method: 'DELETE'
    });
  },

  // --- Batches Management ---
  adminGetBatches: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/admin/batches${q ? '?' + q : ''}`);
  },

  adminCreateBatch: (data) => request('/admin/batches', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  adminUpdateBatch: (batchId, data) => request(`/admin/batches/${batchId}/update`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  adminGetBatchStudents: (batchId) => request(`/admin/batches/${batchId}/students`),

  adminEnrollBatchStudent: (batchId, data) => request(`/admin/batches/${batchId}/students`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  adminWithdrawBatchStudent: (batchId, studentId, data = {}) => request(`/admin/batches/${batchId}/students/${studentId}/withdraw`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  adminAssignBatchFaculty: (batchId, data) => request(`/admin/batches/${batchId}/assign-faculty`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  adminCheckBatchDeletion: (batchId) => request(`/admin/batches/${batchId}/deletion-eligibility`),

  adminArchiveBatch: (batchId) => request(`/admin/batches/${batchId}/archive`, {
    method: 'POST'
  }),

  adminRestoreBatch: (batchId) => request(`/admin/batches/${batchId}/restore`, {
    method: 'POST'
  }),

  adminDeleteBatch: (batchId, params = {}) => request(`/admin/batches/${batchId}${params.permanent ? '?permanent=true' : ''}`, {
    method: 'DELETE'
  }),

  adminCleanupTestBatches: () => request('/admin/batches/cleanup-test-batches', {
    method: 'POST'
  }),

  adminManageAccountStatus: (userId, data) => request(`/admin/users/${userId}/status`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  adminGetSchedule: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/admin/schedule${q ? '?' + q : ''}`);
  },

  adminCreateSession: (data) => request('/admin/schedule', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  adminRescheduleSession: (sessionId, data) => request(`/admin/schedule/${sessionId}/reschedule`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  adminCancelSession: (sessionId, data) => request(`/admin/schedule/${sessionId}/cancel`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  adminGetSessionAttendance: (sessionId) => request(`/admin/attendance/session/${sessionId}`),

  adminSaveSessionAttendance: (sessionId, data) => request(`/admin/attendance/session/${sessionId}/bulk`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  adminCorrectAttendance: (recordId, data) => request(`/admin/attendance/${recordId}/correct`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  adminGetMaterials: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/admin/materials${q ? '?' + q : ''}`);
  },

  adminGetAnnouncements: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/admin/announcements${q ? '?' + q : ''}`);
  },

  adminGetFollowups: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/admin/followups${q ? '?' + q : ''}`);
  },

  adminCreateFollowup: (data) => request('/admin/followups', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  adminUpdateFollowup: (id, data) => request(`/admin/followups/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  adminGetPlacementData: () => request('/admin/placement'),

  adminGetSupportData: () => request('/admin/support'),

  // Support Tickets Thread & Actions
  adminGetTicketThread: (ticketId) => request(`/admin/support/tickets/${ticketId}/thread`),
  adminReplySupportTicket: (ticketId, data) => request(`/admin/support/tickets/${ticketId}/reply`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  adminUpdateTicketStatus: (ticketId, data) => request(`/admin/support/tickets/${ticketId}/status`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  adminAssignSupportTicket: (ticketId, data) => request(`/admin/support/tickets/${ticketId}/assign`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Student Support Tickets & Inquiries
  studentCreateSupportTicket: (data) => request('/student/support/tickets', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  studentGetMySupportTickets: () => request('/student/support/tickets'),

  // Course Archive & Restore
  adminArchiveCourse: (courseId) => request(`/admin/courses/${courseId}/archive`, {
    method: 'POST'
  }),
  adminRestoreCourse: (courseId) => request(`/admin/courses/${courseId}/restore`, {
    method: 'POST'
  }),
  adminToggleTaskStatus: (taskId, data) => request(`/admin/tasks/${taskId}/status`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Certificate Reissue
  adminReissueCertificate: (certId, data) => request(`/admin/certificates/${certId}/reissue`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Class Session Deletion (aliases for compatibility)
  adminDeleteSession: (sessionId) => request(`/admin/schedule/${sessionId}`, {
    method: 'DELETE'
  }),
  adminDeleteScheduleSession: (sessionId) => request(`/admin/schedule/${sessionId}`, {
    method: 'DELETE'
  }),

  // Batch Status Update
  adminUpdateBatchStatus: (batchId, status) => request(`/admin/batches/${batchId}/status`, {
    method: 'POST',
    body: JSON.stringify({ status })
  }),

  // Faculty Assignment Role Update
  adminUpdateFacultyAssignment: (facultyId, assignmentId, data) => request(`/admin/faculty/${facultyId}/assignments/${assignmentId}/update`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),


  adminGetSettings: () => request('/admin/settings'),

  adminUpdateSettings: (data) => request('/admin/settings', {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  adminCreateMaterial: (data) => request('/admin/materials', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  adminUpdateMaterial: (id, data) => request(`/admin/materials/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  adminPublishMaterial: (id, data = {}) => request(`/admin/materials/${id}/publish`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  adminUnpublishMaterial: (id) => request(`/admin/materials/${id}/unpublish`, {
    method: 'POST'
  }),

  adminDeleteMaterial: (id) => request(`/admin/materials/${id}`, {
    method: 'DELETE'
  }),

  adminGetAudienceCount: (audience_type, audience_id) => request('/admin/audience-count', {
    method: 'POST',
    body: JSON.stringify({ audience_type, audience_id })
  }),

  adminGetPublishingQueues: () => request('/admin/publishing/queues'),

  adminReviewPublicContent: (data) => request('/admin/publishing/review', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  facultyGetPublicSubmissions: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/faculty/public-submissions${q ? '?' + q : ''}`);
  },

  facultyCreatePublicSubmission: (data) => request('/faculty/public-submissions', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  publicGetContent: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/public/content${q ? '?' + q : ''}`);
  },

  publicGetCourses: () => request('/public/courses'),

  publicGetContentItem: (slug) => request(`/public/content/${slug}`),

  adminCreateAnnouncement: (data) => request('/admin/announcements', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  adminDeleteAnnouncement: (id) => request(`/admin/announcements/${id}`, {
    method: 'DELETE'
  }),

  adminUpdateUserRole: (userId, data) => request(`/admin/users/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  adminUpdatePlacementProfile: (userId, data) => request(`/admin/placement/profiles/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  adminCreateJobOpening: (data) => request('/admin/placement/jobs', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  adminGetCertificates: () => request('/admin/certificates'),

  adminGetCertificateEligibility: (courseId, userId, batchId) =>
    request(`/admin/certificates/eligibility?course_id=${courseId}&user_id=${userId}${batchId ? '&batch_id=' + batchId : ''}`),

  adminPreviewCertificate: (data) => request('/admin/certificates/preview', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  adminIssueCertificate: (data) => request('/admin/certificates/issue', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  adminRevokeCertificate: (id, data) => request(`/certificates/${id}/revoke`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  adminGetAuditLogs: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('/admin/audit-logs' + (q ? '?' + q : ''));
  },

  // Role-Based Dashboards
  getStudentDashboard: () => request('/student/dashboard'),
  getFacultyDashboard: () => request('/faculty/dashboard'),
  getPlacementDashboard: () => request('/placement/dashboard'),
  getCoordinatorDashboard: () => request('/coordinator/dashboard'),
  getSuperAdminDashboard: () => request('/super-admin/dashboard'),

  // Personal Profile & Settings
  getUserProfile: () => request('/user/profile'),
  updateUserProfile: (data) => request('/user/profile', {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  changePassword: (data) => request('/user/change-password', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  logoutOtherSessions: () => request('/user/sessions/logout-other', {
    method: 'POST'
  }),

  // Course Access Duration & Extensions
  adminExtendAccess: (enrollmentId, data) => request(`/admin/enrollments/${enrollmentId}/extend`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Direct File Upload Support & Storage
  uploadFile: (file, category = 'material_document', onProgress = null, signal = null) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/upload`);
      
      const token = localStorage.getItem('aaroha_token');
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      
      if (signal) {
        signal.addEventListener('abort', () => {
          xhr.abort();
          reject(new DOMException('Upload aborted by user', 'AbortError'));
        });
      }

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent, e.loaded, e.total);
        }
      };

      xhr.onload = () => {
        try {
          const res = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && res.success) {
            resolve(res);
          } else {
            reject(new Error(res.error || `Upload failed with status ${xhr.status}`));
          }
        } catch (e) {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during file upload.'));
      xhr.ontimeout = () => reject(new Error('Upload timed out.'));

      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      xhr.send(formData);
    });
  },

  uploadChunk: (chunkData) => request('/upload/chunk', {
    method: 'POST',
    body: JSON.stringify(chunkData)
  }),

  uploadLargeFileChunked: async (file, category = 'lesson_video', onProgress = null, signal = null) => {
    const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunk slice
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const uploadId = 'up_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    
    for (let i = 0; i < totalChunks; i++) {
      if (signal && signal.aborted) throw new DOMException('Upload aborted', 'AbortError');
      const start = i * CHUNK_SIZE;
      const end = Math.min(file.size, start + CHUNK_SIZE);
      const chunkBlob = file.slice(start, end);
      
      const chunkBase64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => {
          const resultStr = reader.result;
          const commaIdx = resultStr.indexOf(',');
          res(commaIdx !== -1 ? resultStr.substring(commaIdx + 1) : resultStr);
        };
        reader.onerror = rej;
        reader.readAsDataURL(chunkBlob);
      });

      const res = await api.uploadChunk({
        upload_id: uploadId,
        chunk_index: i,
        total_chunks: totalChunks,
        chunk_data: chunkBase64,
        filename: file.name,
        mime_type: file.type || 'application/octet-stream',
        file_size: file.size,
        category
      });

      if (onProgress) {
        onProgress(Math.round(((i + 1) / totalChunks) * 100), end, file.size);
      }

      if (i === totalChunks - 1) {
        return res;
      }
    }
  }
};

export default api;

