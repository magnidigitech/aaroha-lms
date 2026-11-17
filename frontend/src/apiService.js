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

  adminDeleteFaculty: (facultyId) => request(`/admin/faculty/${facultyId}`, {
    method: 'DELETE'
  }),

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

  // Course Restore & Task Closure
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

  // Class Session Deletion
  adminDeleteSession: (sessionId) => request(`/admin/schedule/${sessionId}`, {
    method: 'DELETE'
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
      xhr.open('POST', `${API_BASE_URL}/uploads`);
      
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

  uploadChunk: (chunkData) => request('/uploads/chunk', {
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

