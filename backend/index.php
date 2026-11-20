<?php
// Aaroha LMS - REST API Entrypoint Router
// Optimized for Hostinger Shared LAMP stack (Native PHP 8.x + MySQL)

// Request ID generation for traceability across logs and client reports
$reqId = 'req_' . bin2hex(random_bytes(8));
if (!defined('APP_REQUEST_ID')) {
    define('APP_REQUEST_ID', $reqId);
}

// Global Exception & Fatal Error Trap to Guarantee JSON Response on Production
set_exception_handler(function(Throwable $e) {
    $reqId = defined('APP_REQUEST_ID') ? APP_REQUEST_ID : ('req_' . bin2hex(random_bytes(6)));
    
    // Always log internal details securely to server log with Request ID
    error_log(sprintf(
        "[%s] Internal Server Error: %s in %s:%d\nStack trace:\n%s",
        $reqId,
        $e->getMessage(),
        $e->getFile(),
        $e->getLine(),
        $e->getTraceAsString()
    ));

    $code = http_response_code();
    if ($code < 400) {
        $code = 500;
        http_response_code(500);
    }

    header('Content-Type: application/json; charset=UTF-8');
    
    // Check if error is a client-facing domain/validation error
    $isClientSafe = ($e instanceof InvalidArgumentException) || ($code >= 400 && $code < 500);
    $errorMessage = $isClientSafe 
        ? $e->getMessage() 
        : 'An unexpected internal server error occurred. Please quote Request ID: ' . $reqId;

    echo json_encode([
        'success' => false,
        'error' => $errorMessage,
        'request_id' => $reqId
    ], JSON_UNESCAPED_SLASHES);
    exit;
});

register_shutdown_function(function() {
    $err = error_get_last();
    if ($err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        $reqId = defined('APP_REQUEST_ID') ? APP_REQUEST_ID : ('req_' . bin2hex(random_bytes(6)));
        error_log(sprintf(
            "[%s] Fatal Server Error: %s in %s:%d",
            $reqId,
            $err['message'],
            $err['file'],
            $err['line']
        ));
        http_response_code(500);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode([
            'success' => false,
            'error' => 'A fatal server error occurred. Please quote Request ID: ' . $reqId,
            'request_id' => $reqId
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }
});

require_once __DIR__ . '/middleware/cors.php';
require_once __DIR__ . '/middleware/auth.php';
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/CourseController.php';
require_once __DIR__ . '/controllers/EnrollmentController.php';
require_once __DIR__ . '/controllers/TaskController.php';
require_once __DIR__ . '/controllers/PlaybackController.php';
require_once __DIR__ . '/controllers/CertificateController.php';
require_once __DIR__ . '/controllers/LeaderboardController.php';
require_once __DIR__ . '/controllers/DegreeController.php';
require_once __DIR__ . '/controllers/AdminPortalController.php';
require_once __DIR__ . '/controllers/DashboardController.php';
require_once __DIR__ . '/controllers/ProfileController.php';
require_once __DIR__ . '/controllers/PublishingController.php';
require_once __DIR__ . '/controllers/UploadController.php';

// 1. Handle CORS Preflight and Headers
handleCORS();

// 2. Parse Request URL and Method
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$requestMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Strip query string and base directory prefix
$path = parse_url($requestUri, PHP_URL_PATH);

// Normalize path by stripping /api or subdomain directory prefix
$path = preg_replace('#^.*?/api#', '', $path);
$path = '/' . trim($path, '/');

// 2.1 Security Gateway: Block direct HTTP access to secrets, database files, tests, backups
if (preg_match('#(^\.|\/\.|\.env|env\.php|database\.php|jwt\.php|\.(sql|sqlite|sqlite3|db|mdf|bak|backup|old|swp|zip|tar|gz)$|^(config|database|tests|services)(/|$)|Test\.php)#i', $path)) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'error' => 'Access denied: Access to internal configuration, database files, tests, or backups is forbidden.',
        'code' => 'ACCESS_FORBIDDEN'
    ]);
    exit;
}

// 3. Parse JSON Body
$rawInput = file_get_contents('php://input');
$inputData = json_decode($rawInput, true) ?: [];

// Router Dispatch Table
$response = null;

try {
    // -------------------------------------------------------------
    // API HEALTH & STATUS CHECK
    // -------------------------------------------------------------
    if ($requestMethod === 'GET' && in_array($path, ['', '/', '/health', '/api', '/index.php'])) {
        $response = [
            'success' => true,
            'status' => 'healthy',
            'service' => 'aaroha-lms-api',
            'environment' => 'production',
            'timestamp' => date('c'),
            'version' => '1.0.0'
        ];
    }

    // -------------------------------------------------------------
    // AUTHENTICATION ROUTES
    // -------------------------------------------------------------
    elseif ($requestMethod === 'POST' && $path === '/auth/register') {
        $response = AuthController::register($inputData);
    }
    // Single-Use Cryptographic Invitation Verification
    elseif ($requestMethod === 'GET' && in_array($path, ['/auth/verify-invitation', '/verify-invitation', '/invitation/verify'])) {
        $response = AuthController::verifyInvitation($_GET['token'] ?? '');
    }
    elseif ($requestMethod === 'POST' && in_array($path, ['/auth/activate', '/activate', '/account/activate', '/auth/activate-account'])) {
        $response = AuthController::activateAccount($inputData);
    }
    elseif ($requestMethod === 'POST' && in_array($path, ['/auth/login', '/login'])) {
        $response = AuthController::login($inputData);
    }
    elseif ($requestMethod === 'POST' && in_array($path, ['/auth/forgot-password', '/forgot-password'])) {
        $response = AuthController::forgotPassword($inputData);
    }
    elseif ($requestMethod === 'POST' && in_array($path, ['/auth/reset-password', '/reset-password'])) {
        $response = AuthController::resetPassword($inputData);
    }
    elseif ($requestMethod === 'POST' && $path === '/admin/invitations/resend') {
        $actor = AuthMiddleware::requireCoordinator();
        $response = AdminPortalController::resendInvitation($inputData, $actor);
    }
    elseif ($requestMethod === 'POST' && $path === '/admin/invitations/revoke') {
        $actor = AuthMiddleware::requireCoordinator();
        $response = AdminPortalController::revokeInvitation($inputData, $actor);
    }
    elseif ($requestMethod === 'POST' && ($path === '/admin/users/generate-reset-link' || $path === '/admin/invitations/generate-reset-link' || preg_match('#^/admin/users/(\\d+)/generate-reset-link$#', $path, $matches))) {
        $actor = AuthMiddleware::requireCoordinator();
        if (!empty($matches[1])) {
            $inputData['user_id'] = (int)$matches[1];
        }
        $response = AdminPortalController::adminGenerateResetLink($inputData, $actor);
    }
    elseif ($requestMethod === 'POST' && preg_match('#^/admin/faculty/(\\d+)/toggle-status$#', $path, $matches)) {
        $actor = AuthMiddleware::requireCoordinator();
        $response = AdminPortalController::toggleFacultyStatus((int)$matches[1], $inputData, $actor);
    }
    elseif ($requestMethod === 'POST' && $path === '/auth/login') {
        $response = AuthController::login($inputData);
    }
    elseif ($requestMethod === 'GET' && $path === '/auth/me') {
        $user = AuthMiddleware::requireAuth();
        $response = AuthController::me($user);
    }
    elseif (($requestMethod === 'PUT' || $requestMethod === 'POST') && $path === '/auth/profile') {
        $user = AuthMiddleware::requireAuth();
        $response = AuthController::updateProfile((int)$user['id'], $inputData);
    }
    elseif ($requestMethod === 'GET' && $path === '/admin/users') {
        $admin = AuthMiddleware::requireAdmin();
        $response = AuthController::adminGetUsers();
    }
    elseif ($requestMethod === 'POST' && $path === '/admin/users') {
        $admin = AuthMiddleware::requireAdmin();
        $response = AuthController::adminCreateUser($inputData, $admin);
    }
    elseif ($requestMethod === 'PUT' && preg_match('#^/admin/users/(\d+)/role$#', $path, $matches)) {
        $admin = AuthMiddleware::requireAdmin();
        $response = AdminPortalController::updateUserRole((int)$matches[1], $inputData, $admin);
    }

    // -------------------------------------------------------------
    // COURSE CATALOG & DETAILS (PUBLIC & GUEST)
    // -------------------------------------------------------------
    elseif ($requestMethod === 'GET' && ($path === '/courses' || $path === '/admin/courses')) {
        $response = CourseController::listPublished();
    }
    elseif ($requestMethod === 'GET' && preg_match('#^/courses/([^/]+)$#', $path, $matches)) {
        $auth = AuthMiddleware::getOptionalAuth();
        $userId = $auth ? (int)$auth['id'] : null;
        $response = CourseController::getDetails($matches[1], $userId);
    }

    // -------------------------------------------------------------
    // FACULTY / ADMIN CURRICULUM MANAGEMENT (CRUD & OWNERSHIP RESTRICTED)
    // -------------------------------------------------------------
    // Courses CRUD
    elseif ($requestMethod === 'POST' && $path === '/courses') {
        $admin = AuthMiddleware::requireAdmin();
        $response = CourseController::createCourse($inputData, (int)$admin['id'], (string)$admin['role']);
    }
    elseif ($requestMethod === 'PUT' && preg_match('#^/courses/(\d+)$#', $path, $matches)) {
        $admin = AuthMiddleware::requireAdmin();
        $response = CourseController::updateCourse((int)$matches[1], $inputData, (int)$admin['id'], (string)$admin['role']);
    }
    elseif ($requestMethod === 'DELETE' && preg_match('#^/(?:admin/)?courses/(\d+)$#', $path, $matches)) {
        $admin = AuthMiddleware::requireAdmin();
        $response = CourseController::deleteCourse((int)$matches[1], (int)$admin['id'], (string)$admin['role']);
    }

    // Modules CRUD
    elseif ($requestMethod === 'POST' && preg_match('#^/courses/(\d+)/modules$#', $path, $matches)) {
        $admin = AuthMiddleware::requireAdmin();
        $response = CourseController::createModule((int)$matches[1], $inputData, (int)$admin['id'], (string)$admin['role']);
    }
    elseif ($requestMethod === 'PUT' && preg_match('#^/modules/(\d+)$#', $path, $matches)) {
        $admin = AuthMiddleware::requireAdmin();
        $response = CourseController::updateModule((int)$matches[1], $inputData, (int)$admin['id'], (string)$admin['role']);
    }
    elseif ($requestMethod === 'DELETE' && preg_match('#^/modules/(\d+)$#', $path, $matches)) {
        $admin = AuthMiddleware::requireAdmin();
        $response = CourseController::deleteModule((int)$matches[1], (int)$admin['id'], (string)$admin['role']);
    }

    // Lessons CRUD
    elseif ($requestMethod === 'POST' && preg_match('#^/modules/(\d+)/lessons$#', $path, $matches)) {
        $admin = AuthMiddleware::requireAdmin();
        $response = CourseController::createLesson((int)$matches[1], $inputData, (int)$admin['id'], (string)$admin['role']);
    }
    elseif ($requestMethod === 'PUT' && preg_match('#^/lessons/(\d+)$#', $path, $matches)) {
        $admin = AuthMiddleware::requireAdmin();
        $response = CourseController::updateLesson((int)$matches[1], $inputData, (int)$admin['id'], (string)$admin['role']);
    }
    elseif ($requestMethod === 'DELETE' && preg_match('#^/lessons/(\d+)$#', $path, $matches)) {
        $admin = AuthMiddleware::requireAdmin();
        $response = CourseController::deleteLesson((int)$matches[1], (int)$admin['id'], (string)$admin['role']);
    }

    // Tasks CRUD
    elseif ($requestMethod === 'POST' && preg_match('#^/modules/(\d+)/tasks$#', $path, $matches)) {
        $admin = AuthMiddleware::requireAdmin();
        $response = CourseController::createTask((int)$matches[1], $inputData, (int)$admin['id'], (string)$admin['role']);
    }
    elseif ($requestMethod === 'PUT' && preg_match('#^/tasks/(\d+)$#', $path, $matches)) {
        $admin = AuthMiddleware::requireAdmin();
        $response = CourseController::updateTask((int)$matches[1], $inputData, (int)$admin['id'], (string)$admin['role']);
    }
    elseif ($requestMethod === 'DELETE' && preg_match('#^/tasks/(\d+)$#', $path, $matches)) {
        $admin = AuthMiddleware::requireAdmin();
        $response = CourseController::deleteTask((int)$matches[1], (int)$admin['id'], (string)$admin['role']);
    }
    elseif (($requestMethod === 'POST' || $requestMethod === 'PUT') && preg_match('#^/(?:admin/)?courses/(\d+)/archive$#', $path, $matches)) {
        $admin = AuthMiddleware::requireAdmin();
        $response = CourseController::archiveCourse((int)$matches[1], (int)$admin['id'], (string)$admin['role']);
    }
    elseif (($requestMethod === 'POST' || $requestMethod === 'PUT') && preg_match('#^/(?:admin/)?courses/(\d+)/restore$#', $path, $matches)) {
        $admin = AuthMiddleware::requireAdmin();
        $response = CourseController::restoreCourse((int)$matches[1], (int)$admin['id'], (string)$admin['role']);
    }
    elseif (($requestMethod === 'POST' || $requestMethod === 'PUT') && preg_match('#^/(?:admin/tasks|courses/\d+/tasks|tasks)/(\d+)/status$#', $path, $matches)) {
        $admin = AuthMiddleware::requireAdmin();
        $response = CourseController::toggleTaskStatus((int)$matches[1], $inputData, (int)$admin['id'], (string)$admin['role']);
    }

    // -------------------------------------------------------------
    // STUDENT ENROLLMENTS & PROGRESS
    // -------------------------------------------------------------
    elseif ($requestMethod === 'POST' && preg_match('#^/courses/(\d+)/enroll$#', $path, $matches)) {
        $user = AuthMiddleware::requireAuth();
        $response = EnrollmentController::enroll((int)$matches[1], (int)$user['id']);
    }
    elseif ($requestMethod === 'GET' && $path === '/student/enrollments') {
        $user = AuthMiddleware::requireAuth();
        $response = EnrollmentController::myEnrollments((int)$user['id']);
    }
    elseif ($requestMethod === 'POST' && preg_match('#^/lessons/(\d+)/complete$#', $path, $matches)) {
        $user = AuthMiddleware::requireAuth();
        $response = EnrollmentController::completeLesson((int)$matches[1], (int)$user['id']);
    }

    // -------------------------------------------------------------
    // DIRECT UPLOADS & SECURE MEDIA DELIVERY
    // -------------------------------------------------------------
    elseif ($requestMethod === 'POST' && ($path === '/uploads' || $path === '/upload')) {
        $user = AuthMiddleware::getOptionalAuth();
        $response = UploadController::upload($inputData, $user);
    }
    elseif ($requestMethod === 'POST' && ($path === '/uploads/chunk' || $path === '/upload/chunk')) {
        $user = AuthMiddleware::getOptionalAuth();
        $response = UploadController::uploadChunk($inputData, $user);
    }
    elseif ($requestMethod === 'GET' && preg_match('#^/(?:uploads|upload)/public/([a-zA-Z0-9_-]+)$#', $path, $matches)) {
        UploadController::servePublic($matches[1]);
    }
    elseif ($requestMethod === 'GET' && preg_match('#^/(?:uploads|upload)/stream/([a-zA-Z0-9_-]+)$#', $path, $matches)) {
        $user = AuthMiddleware::getOptionalAuth();
        UploadController::serveStream($matches[1], $user);
    }
    // Admin Enrolment Access Duration Extension
    elseif ($requestMethod === 'POST' && preg_match('#^/admin/enrollments/(\d+)/extend$#', $path, $matches)) {
        $actor = AuthMiddleware::requireCoordinator();
        $response = EnrollmentController::extendAccess((int)$matches[1], $inputData, $actor);
    }

    // -------------------------------------------------------------
    // AUTHENTICATED LESSON PLAYBACK & STREAMING (BUNNY STREAM)
    // -------------------------------------------------------------
    elseif ($requestMethod === 'GET' && preg_match('#^/lessons/(\d+)/playback$#', $path, $matches)) {
        $user = AuthMiddleware::getOptionalAuth() ?? ['id' => 0, 'role' => 'student'];
        $response = PlaybackController::getPlaybackSession((int)$matches[1], $user);
    }

    // -------------------------------------------------------------
    // DELIVERABLE SUBMISSIONS & FACULTY GRADING
    // -------------------------------------------------------------
    elseif ($requestMethod === 'POST' && preg_match('#^/tasks/(\d+)/submit$#', $path, $matches)) {
        $user = AuthMiddleware::requireAuth();
        $response = TaskController::submitTask((int)$matches[1], (int)$user['id'], $inputData);
    }
    elseif ($requestMethod === 'GET' && preg_match('#^/tasks/(\d+)/submission$#', $path, $matches)) {
        $user = AuthMiddleware::requireAuth();
        $response = TaskController::getSubmission((int)$matches[1], (int)$user['id']);
    }
    elseif ($requestMethod === 'GET' && $path === '/admin/submissions/pending') {
        AuthMiddleware::requireAdmin();
        $response = TaskController::getPendingSubmissions();
    }
    elseif ($requestMethod === 'POST' && preg_match('#^/admin/submissions/(\d+)/grade$#', $path, $matches)) {
        $admin = AuthMiddleware::requireAdmin();
        $response = TaskController::gradeSubmission((int)$matches[1], (int)$admin['id'], $inputData);
    }

    // -------------------------------------------------------------
    // ACCREDITED CERTIFICATES (FACULTY ISSUANCE & VERIFICATION)
    // -------------------------------------------------------------
    elseif ($requestMethod === 'GET' && ($path === '/admin/certificates' || $path === '/certificates')) {
        $admin = AuthMiddleware::requireAdmin();
        $response = CertificateController::adminListAllCertificates();
    }
    elseif ($requestMethod === 'GET' && $path === '/admin/certificates/eligibility') {
        $admin = AuthMiddleware::requireAdmin();
        $response = CertificateController::adminGetEligibility($_GET);
    }
    elseif ($requestMethod === 'POST' && $path === '/admin/certificates/preview') {
        $admin = AuthMiddleware::requireAdmin();
        $response = CertificateController::adminPreviewCertificate($inputData, $admin);
    }
    elseif ($requestMethod === 'POST' && ($path === '/admin/certificates/issue' || preg_match('#^/courses/(\d+)/certificates$#', $path, $matches))) {
        $admin = AuthMiddleware::requireAdmin();
        $cid = !empty($matches[1]) ? (int)$matches[1] : (int)($inputData['course_id'] ?? 0);
        $response = CertificateController::issueCertificate($cid, $inputData, $admin);
    }
    elseif ($requestMethod === 'GET' && preg_match('#^/courses/(\d+)/certificates$#', $path, $matches)) {
        $admin = AuthMiddleware::requireAdmin();
        $response = CertificateController::getCourseCertificates((int)$matches[1]);
    }
    elseif ($requestMethod === 'POST' && preg_match('#^/(?:admin/)?certificates/(\d+)/revoke$#', $path, $matches)) {
        $admin = AuthMiddleware::requireAdmin();
        $response = CertificateController::adminRevokeCertificate((int)$matches[1], $inputData, $admin);
    }
    elseif ($requestMethod === 'POST' && preg_match('#^/(?:admin/)?certificates/(\d+)/reissue$#', $path, $matches)) {
        $admin = AuthMiddleware::requireAdmin();
        $response = CertificateController::reissueCertificate((int)$matches[1], $inputData, $admin);
    }
    elseif ($requestMethod === 'GET' && $path === '/student/certificates') {
        $user = AuthMiddleware::requireAuth();
        $response = CertificateController::getMyCertificates((int)$user['id']);
    }
    elseif ($requestMethod === 'GET' && preg_match('#^/certificates/verify/([^/]+)$#', $path, $matches)) {
        $response = CertificateController::verifyCertificate($matches[1]);
    }

    // -------------------------------------------------------------
    // STUDENT RANKING & ACADEMIC LEADERBOARD
    // -------------------------------------------------------------
    elseif ($requestMethod === 'GET' && $path === '/leaderboard') {
        $user = AuthMiddleware::getOptionalAuth();
        $courseId = isset($_GET['course_id']) ? (int)$_GET['course_id'] : null;
        $response = LeaderboardController::getLeaderboard($courseId, $user);
    }
    elseif ($requestMethod === 'POST' && $path === '/leaderboard') {
        $admin = AuthMiddleware::requireAdmin();
        $response = LeaderboardController::createRanking($inputData, $admin);
    }
    elseif ($requestMethod === 'PUT' && preg_match('#^/leaderboard/(\d+)$#', $path, $matches)) {
        $admin = AuthMiddleware::requireAdmin();
        $response = LeaderboardController::updateRanking((int)$matches[1], $inputData, $admin);
    }
    elseif ($requestMethod === 'DELETE' && preg_match('#^/leaderboard/(\d+)$#', $path, $matches)) {
        $admin = AuthMiddleware::requireAdmin();
        $response = LeaderboardController::deleteRanking((int)$matches[1], $admin);
    }

    // -------------------------------------------------------------
    // ACCREDITED DEGREE PROGRAMS (FACULTY GOVERNANCE)
    // -------------------------------------------------------------
    elseif ($requestMethod === 'GET' && $path === '/degrees') {
        $response = DegreeController::getDegrees();
    }
    elseif ($requestMethod === 'POST' && $path === '/degrees') {
        $admin = AuthMiddleware::requireAdmin();
        $response = DegreeController::createDegree($inputData, $admin);
    }
    elseif ($requestMethod === 'PUT' && preg_match('#^/degrees/(\d+)$#', $path, $matches)) {
        $admin = AuthMiddleware::requireAdmin();
        $response = DegreeController::updateDegree((int)$matches[1], $inputData, $admin);
    }
    elseif ($requestMethod === 'DELETE' && preg_match('#^/degrees/(\d+)$#', $path, $matches)) {
        $admin = AuthMiddleware::requireAdmin();
        $response = DegreeController::deleteDegree((int)$matches[1], $admin);
    }

    // -------------------------------------------------------------
    // ROLE-BASED DASHBOARDS (STUDENT, FACULTY, COORDINATOR, SUPER ADMIN, PLACEMENT)
    // -------------------------------------------------------------
    elseif ($requestMethod === 'GET' && $path === '/student/dashboard') {
        $actor = AuthMiddleware::requireAuth();
        $response = DashboardController::getStudentDashboard($actor);
    }
    elseif ($requestMethod === 'GET' && $path === '/faculty/dashboard') {
        $actor = AuthMiddleware::requireRole(['super_admin', 'admin', 'coordinator', 'faculty', 'instructor']);
        $response = DashboardController::getFacultyDashboard($actor);
    }
    elseif ($requestMethod === 'GET' && $path === '/placement/dashboard') {
        $actor = AuthMiddleware::requirePlacement();
        $response = DashboardController::getPlacementDashboard($actor);
    }
    elseif ($requestMethod === 'GET' && $path === '/coordinator/dashboard') {
        $actor = AuthMiddleware::requireCoordinator();
        $response = DashboardController::getCoordinatorDashboard($actor);
    }
    elseif ($requestMethod === 'GET' && $path === '/super-admin/dashboard') {
        $actor = AuthMiddleware::requireSuperAdmin();
        $response = DashboardController::getSuperAdminDashboard($actor);
    }

    // -------------------------------------------------------------
    // PERSONAL PROFILE & ACCOUNT SETTINGS (ALL ROLES)
    // -------------------------------------------------------------
    elseif ($requestMethod === 'GET' && $path === '/user/profile') {
        $actor = AuthMiddleware::requireAuth();
        $response = ProfileController::getProfile($actor);
    }
    elseif (($requestMethod === 'PUT' || $requestMethod === 'POST') && $path === '/user/profile') {
        $actor = AuthMiddleware::requireAuth();
        $response = ProfileController::updateProfile($actor, $inputData);
    }
    elseif ($requestMethod === 'POST' && $path === '/user/change-password') {
        $actor = AuthMiddleware::requireAuth();
        $response = ProfileController::changePassword($actor, $inputData);
    }
    elseif ($requestMethod === 'POST' && $path === '/user/sessions/logout-other') {
        $actor = AuthMiddleware::requireAuth();
        $response = ProfileController::logoutOtherSessions($actor);
    }

    // -------------------------------------------------------------
    // ENTERPRISE ADMIN PORTAL (STUDENTS, FACULTY, BATCHES, SCHEDULE, ATTENDANCE, PLACEMENT)
    // -------------------------------------------------------------
    elseif ($requestMethod === 'GET' && $path === '/admin/dashboard/stats') {
        $actor = AuthMiddleware::requireRole(['super_admin', 'admin', 'coordinator', 'placement_officer', 'faculty']);
        $response = AdminPortalController::getDashboardStats($actor);
    }
    // Students
    elseif ($requestMethod === 'GET' && $path === '/admin/students') {
        $actor = AuthMiddleware::requireRole(['super_admin', 'admin', 'coordinator', 'placement_officer', 'faculty']);
        $response = AdminPortalController::getStudents($_GET);
    }
    elseif ($requestMethod === 'POST' && $path === '/admin/students') {
        $actor = AuthMiddleware::requireCoordinator();
        $response = AdminPortalController::createStudent($inputData, $actor);
    }
    elseif ($requestMethod === 'GET' && preg_match('#^/admin/students/(\d+)$#', $path, $matches)) {
        $actor = AuthMiddleware::requireRole(['super_admin', 'admin', 'coordinator', 'placement_officer', 'faculty']);
        $response = AdminPortalController::getStudentDetail((int)$matches[1]);
    }
    elseif ($requestMethod === 'POST' && preg_match('#^/admin/students/(\d+)/transfer-batch$#', $path, $matches)) {
        $actor = AuthMiddleware::requireCoordinator();
        $response = AdminPortalController::transferStudentBatch((int)$matches[1], $inputData, $actor);
    }
    elseif ($requestMethod === 'POST' && preg_match('#^/admin/students/(\d+)/toggle-status$#', $path, $matches)) {
        $actor = AuthMiddleware::requireCoordinator();
        $response = AdminPortalController::toggleStudentStatus((int)$matches[1], $inputData, $actor);
    }
    elseif (($requestMethod === 'PUT' || $requestMethod === 'POST') && preg_match('#^/admin/students/(\d+)(?:/update)?$#', $path, $matches)) {
        $actor = AuthMiddleware::requireCoordinator();
        $response = AdminPortalController::updateStudentProfile((int)$matches[1], $inputData, $actor);
    }
    elseif ($requestMethod === 'POST' && preg_match('#^/admin/students/(\d+)/enroll$#', $path, $matches)) {
        $actor = AuthMiddleware::requireCoordinator();
        $response = AdminPortalController::enrollStudentCourse((int)$matches[1], $inputData, $actor);
    }
    elseif ($requestMethod === 'POST' && preg_match('#^/admin/students/(\d+)/withdraw-enrollment$#', $path, $matches)) {
        $actor = AuthMiddleware::requireCoordinator();
        $response = AdminPortalController::withdrawStudentEnrollment((int)$matches[1], $inputData, $actor);
    }
    elseif ($requestMethod === 'POST' && preg_match('#^/admin/students/(\d+)/deactivate$#', $path, $matches)) {
        $actor = AuthMiddleware::requireCoordinator();
        $response = AdminPortalController::deactivateStudentAccount((int)$matches[1], $inputData, $actor);
    }
    elseif ($requestMethod === 'POST' && preg_match('#^/admin/students/(\d+)/reactivate$#', $path, $matches)) {
        $actor = AuthMiddleware::requireCoordinator();
        $response = AdminPortalController::reactivateStudentAccount((int)$matches[1], $actor);
    }
    elseif ($requestMethod === 'POST' && preg_match('#^/admin/students/(\d+)/archive$#', $path, $matches)) {
        $actor = AuthMiddleware::requireCoordinator();
        $response = AdminPortalController::archiveStudent((int)$matches[1], $inputData, $actor);
    }
    elseif ($requestMethod === 'POST' && preg_match('#^/admin/students/(\d+)/restore$#', $path, $matches)) {
        $actor = AuthMiddleware::requireCoordinator();
        $response = AdminPortalController::restoreStudent((int)$matches[1], $actor);
    }
    elseif ($requestMethod === 'GET' && preg_match('#^/admin/students/(\d+)/deletion-eligibility$#', $path, $matches)) {
        $actor = AuthMiddleware::requireCoordinator();
        $response = AdminPortalController::checkStudentDeletionEligibility((int)$matches[1]);
    }
    elseif ($requestMethod === 'DELETE' && preg_match('#^/admin/students/(\d+)$#', $path, $matches)) {
        $actor = AuthMiddleware::requireAdmin();
        $response = AdminPortalController::deleteStudent((int)$matches[1], $actor);
    }
    // Faculty
    elseif ($requestMethod === 'GET' && $path === '/admin/faculty') {
        $actor = AuthMiddleware::requireRole(['super_admin', 'admin', 'coordinator', 'faculty']);
        $response = AdminPortalController::getFaculty($_GET);
    }
    elseif ($requestMethod === 'POST' && $path === '/admin/faculty') {
        $actor = AuthMiddleware::requireCoordinator();
        $response = AdminPortalController::createFaculty($inputData, $actor);
    }
    elseif ($requestMethod === 'GET' && preg_match('#^/admin/faculty/(\d+)/detail$#', $path, $matches)) {
        $actor = AuthMiddleware::requireRole(['super_admin', 'admin', 'coordinator', 'faculty']);
        $response = AdminPortalController::getFacultyDetail((int)$matches[1]);
    }
    elseif (($requestMethod === 'PUT' || $requestMethod === 'POST') && preg_match('#^/admin/faculty/(\d+)(?:/update)?$#', $path, $matches)) {
        $actor = AuthMiddleware::requireCoordinator();
        $response = AdminPortalController::updateFacultyProfile((int)$matches[1], $inputData, $actor);
    }
    elseif ($requestMethod === 'GET' && preg_match('#^/admin/faculty/(\d+)/workload$#', $path, $matches)) {
        $actor = AuthMiddleware::requireRole(['super_admin', 'admin', 'coordinator']);
        $response = AdminPortalController::getFacultyWorkload((int)$matches[1]);
    }
    elseif ($requestMethod === 'GET' && preg_match('#^/admin/faculty/(\d+)/assignments$#', $path, $matches)) {
        $actor = AuthMiddleware::requireRole(['super_admin', 'admin', 'coordinator', 'faculty']);
        $response = AdminPortalController::getFacultyAssignments((int)$matches[1]);
    }
    elseif ($requestMethod === 'POST' && preg_match('#^/admin/faculty/(\d+)/assignments$#', $path, $matches)) {
        $actor = AuthMiddleware::requireCoordinator();
        $response = AdminPortalController::assignFacultyBatch((int)$matches[1], $inputData, $actor);
    }
    elseif (($requestMethod === 'DELETE' || $requestMethod === 'POST') && preg_match('#^/admin/faculty/(\d+)/assignments/(\d+)(?:/remove)?$#', $path, $matches)) {
        $actor = AuthMiddleware::requireCoordinator();
        $response = AdminPortalController::removeFacultyAssignment((int)$matches[1], (int)$matches[2], $actor);
    }
    elseif (($requestMethod === 'PUT' || $requestMethod === 'POST') && preg_match('#^/admin/faculty/(\d+)/assignments/(\d+)(?:/update)?$#', $path, $matches)) {
        $actor = AuthMiddleware::requireCoordinator();
        $response = AdminPortalController::updateFacultyAssignment((int)$matches[1], (int)$matches[2], $inputData, $actor);
    }
    elseif ($requestMethod === 'POST' && preg_match('#^/admin/faculty/(\d+)/deactivate$#', $path, $matches)) {
        $actor = AuthMiddleware::requireCoordinator();
        $response = AdminPortalController::deactivateFacultyAccount((int)$matches[1], $inputData, $actor);
    }
    elseif ($requestMethod === 'POST' && preg_match('#^/admin/faculty/(\d+)/reactivate$#', $path, $matches)) {
        $actor = AuthMiddleware::requireCoordinator();
        $response = AdminPortalController::reactivateFacultyAccount((int)$matches[1], $actor);
    }
    elseif ($requestMethod === 'POST' && preg_match('#^/admin/faculty/(\d+)/archive$#', $path, $matches)) {
        $actor = AuthMiddleware::requireCoordinator();
        $response = AdminPortalController::archiveFaculty((int)$matches[1], $inputData, $actor);
    }
    elseif ($requestMethod === 'POST' && preg_match('#^/admin/faculty/(\d+)/restore$#', $path, $matches)) {
        $actor = AuthMiddleware::requireCoordinator();
        $response = AdminPortalController::restoreFaculty((int)$matches[1], $actor);
    }
    elseif ($requestMethod === 'GET' && preg_match('#^/admin/faculty/(\d+)/deletion-eligibility$#', $path, $matches)) {
        $actor = AuthMiddleware::requireCoordinator();
        $response = AdminPortalController::checkFacultyDeletionEligibility((int)$matches[1]);
    }
    elseif ($requestMethod === 'DELETE' && preg_match('#^/admin/faculty/(\d+)$#', $path, $matches)) {
        $actor = AuthMiddleware::requireAdmin();
        $response = AdminPortalController::deleteFaculty((int)$matches[1], $actor);
    }
    // Batches
    elseif ($requestMethod === 'GET' && $path === '/admin/batches') {
        $actor = AuthMiddleware::requireRole(['super_admin', 'admin', 'coordinator', 'faculty', 'placement_officer']);
        $response = AdminPortalController::getBatches($_GET);
    }
    elseif ($requestMethod === 'POST' && $path === '/admin/batches') {
        $actor = AuthMiddleware::requireCoordinator();
        $response = AdminPortalController::createBatch($inputData, $actor);
    }
    elseif (($requestMethod === 'PUT' || $requestMethod === 'POST') && preg_match('#^/admin/batches/(\d+)(?:/update)?$#', $path, $matches)) {
        $actor = AuthMiddleware::requireCoordinator();
        $response = AdminPortalController::updateBatch((int)$matches[1], $inputData, $actor);
    }
    elseif ($requestMethod === 'GET' && preg_match('#^/admin/batches/(\d+)/students$#', $path, $matches)) {
        $actor = AuthMiddleware::requireRole(['super_admin', 'admin', 'coordinator', 'faculty']);
        $response = AdminPortalController::getBatchStudents((int)$matches[1]);
    }
    elseif ($requestMethod === 'POST' && preg_match('#^/admin/batches/(\d+)/students$#', $path, $matches)) {
        $actor = AuthMiddleware::requireCoordinator();
        $response = AdminPortalController::addBatchStudent((int)$matches[1], $inputData, $actor);
    }
    elseif (($requestMethod === 'DELETE' || $requestMethod === 'POST') && preg_match('#^/admin/batches/(\d+)/students/(\d+)(?:/withdraw)?$#', $path, $matches)) {
        $actor = AuthMiddleware::requireCoordinator();
        $response = AdminPortalController::withdrawBatchStudent((int)$matches[1], (int)$matches[2], $inputData, $actor);
    }
    elseif ($requestMethod === 'POST' && preg_match('#^/admin/batches/(\d+)/assign-faculty$#', $path, $matches)) {
        $actor = AuthMiddleware::requireCoordinator();
        $response = AdminPortalController::assignBatchFaculty((int)$matches[1], $inputData, $actor);
    }
    elseif ($requestMethod === 'GET' && preg_match('#^/admin/batches/(\d+)/deletion-eligibility$#', $path, $matches)) {
        $actor = AuthMiddleware::requireCoordinator();
        $response = AdminPortalController::checkBatchDeletionEligibility((int)$matches[1]);
    }
    elseif ($requestMethod === 'POST' && preg_match('#^/admin/batches/(\d+)/archive$#', $path, $matches)) {
        $actor = AuthMiddleware::requireCoordinator();
        $response = AdminPortalController::archiveBatch((int)$matches[1], $actor);
    }
    elseif ($requestMethod === 'POST' && preg_match('#^/admin/batches/(\d+)/restore$#', $path, $matches)) {
        $actor = AuthMiddleware::requireCoordinator();
        $response = AdminPortalController::restoreBatch((int)$matches[1], $actor);
    }
    elseif ($requestMethod === 'POST' && preg_match('#^/admin/batches/(\d+)/status$#', $path, $matches)) {
        $actor = AuthMiddleware::requireCoordinator();
        $response = AdminPortalController::updateBatchStatus((int)$matches[1], $inputData, $actor);
    }
    elseif (($requestMethod === 'DELETE' || $requestMethod === 'POST') && preg_match('#^/admin/batches/(\d+)(?:/delete)?$#', $path, $matches)) {
        $actor = AuthMiddleware::requireAdmin();
        $response = AdminPortalController::deleteBatch((int)$matches[1], $actor, $inputData);
    }
    elseif ($requestMethod === 'POST' && $path === '/admin/batches/cleanup-test-batches') {
        $actor = AuthMiddleware::requireAdmin();
        $response = AdminPortalController::cleanupTestBatches($actor);
    }
    elseif ($requestMethod === 'POST' && $path === '/admin/cleanup-dummy-data') {
        $actor = AuthMiddleware::requireAdmin();
        $response = AdminPortalController::cleanupDummyData($actor);
    }
    // Schedule
    elseif ($requestMethod === 'GET' && $path === '/admin/schedule') {
        $actor = AuthMiddleware::requireRole(['super_admin', 'admin', 'coordinator', 'faculty', 'student']);
        $response = AdminPortalController::getSchedule($_GET);
    }
    elseif ($requestMethod === 'POST' && $path === '/admin/schedule') {
        $actor = AuthMiddleware::requireCoordinator();
        $response = AdminPortalController::createSession($inputData, $actor);
    }
    elseif ($requestMethod === 'PUT' && preg_match('#^/admin/schedule/(\d+)/reschedule$#', $path, $matches)) {
        $actor = AuthMiddleware::requireCoordinator();
        $response = AdminPortalController::rescheduleSession((int)$matches[1], $inputData, $actor);
    }
    elseif ($requestMethod === 'POST' && preg_match('#^/admin/schedule/(\d+)/cancel$#', $path, $matches)) {
        $actor = AuthMiddleware::requireCoordinator();
        $response = AdminPortalController::cancelSession((int)$matches[1], $inputData, $actor);
    }
    elseif ($requestMethod === 'DELETE' && preg_match('#^/admin/schedule/(\d+)$#', $path, $matches)) {
        $actor = AuthMiddleware::requireCoordinator();
        $response = AdminPortalController::deleteSession((int)$matches[1], $actor);
    }
    // Attendance
    elseif ($requestMethod === 'GET' && preg_match('#^/admin/attendance/session/(\d+)$#', $path, $matches)) {
        $actor = AuthMiddleware::requireRole(['super_admin', 'admin', 'coordinator', 'faculty']);
        $response = AdminPortalController::getSessionAttendance((int)$matches[1]);
    }
    elseif ($requestMethod === 'POST' && preg_match('#^/admin/attendance/session/(\d+)/bulk$#', $path, $matches)) {
        $actor = AuthMiddleware::requireRole(['super_admin', 'admin', 'coordinator', 'faculty']);
        $response = AdminPortalController::saveSessionAttendance((int)$matches[1], $inputData, $actor);
    }
    elseif ($requestMethod === 'PUT' && preg_match('#^/admin/attendance/(\d+)/correct$#', $path, $matches)) {
        $actor = AuthMiddleware::requireCoordinator();
        $response = AdminPortalController::correctAttendance((int)$matches[1], $inputData, $actor);
    }
    // Fees & Payments (Offline Scope Safeguard - Super Admin only for non-destructive auditing)
    elseif ($requestMethod === 'GET' && $path === '/admin/fees/plans') {
        $actor = AuthMiddleware::requireSuperAdmin();
        $response = AdminPortalController::getFeePlans($_GET);
    }
    elseif ($requestMethod === 'POST' && $path === '/admin/fees/payments') {
        $actor = AuthMiddleware::requireSuperAdmin();
        $response = AdminPortalController::recordPayment($inputData, $actor);
    }
    elseif ($requestMethod === 'POST' && $path === '/admin/fees/refunds') {
        $actor = AuthMiddleware::requireSuperAdmin();
        $response = AdminPortalController::recordRefund($inputData, $actor);
    }
    // Follow-ups
    elseif ($requestMethod === 'GET' && $path === '/admin/followups') {
        $actor = AuthMiddleware::requireRole(['super_admin', 'admin', 'coordinator']);
        $response = AdminPortalController::getFollowups($_GET);
    }
    elseif ($requestMethod === 'POST' && $path === '/admin/followups') {
        $actor = AuthMiddleware::requireRole(['super_admin', 'admin', 'coordinator']);
        $response = AdminPortalController::createFollowup($inputData, $actor);
    }
    elseif ($requestMethod === 'PUT' && preg_match('#^/admin/followups/(\d+)$#', $path, $matches)) {
        $actor = AuthMiddleware::requireRole(['super_admin', 'admin', 'coordinator']);
        $response = AdminPortalController::updateFollowup((int)$matches[1], $inputData, $actor);
    }
    // Placement
    elseif ($requestMethod === 'GET' && $path === '/admin/placement') {
        $actor = AuthMiddleware::requirePlacement();
        $response = AdminPortalController::getPlacementData();
    }
    elseif ($requestMethod === 'PUT' && preg_match('#^/admin/placement/profiles/(\d+)$#', $path, $matches)) {
        $actor = AuthMiddleware::requirePlacement();
        $response = AdminPortalController::updatePlacementProfile((int)$matches[1], $inputData, $actor);
    }
    elseif ($requestMethod === 'POST' && $path === '/admin/placement/jobs') {
        $actor = AuthMiddleware::requirePlacement();
        $response = AdminPortalController::createJobOpening($inputData, $actor);
    }
    // Support & Feedback
    elseif ($requestMethod === 'GET' && $path === '/admin/support') {
        $actor = AuthMiddleware::requireRole(['super_admin', 'admin', 'coordinator', 'faculty']);
        $response = AdminPortalController::getSupportTickets();
    }
    elseif ($requestMethod === 'GET' && preg_match('#^/admin/support/tickets/(\d+)/thread$#', $path, $matches)) {
        $actor = AuthMiddleware::requireRole(['super_admin', 'admin', 'coordinator', 'faculty']);
        $response = AdminPortalController::getTicketThread((int)$matches[1]);
    }
    elseif ($requestMethod === 'POST' && preg_match('#^/admin/support/tickets/(\d+)/reply$#', $path, $matches)) {
        $actor = AuthMiddleware::requireRole(['super_admin', 'admin', 'coordinator', 'faculty']);
        $response = AdminPortalController::replySupportTicket((int)$matches[1], $inputData, $actor);
    }
    elseif (($requestMethod === 'PUT' || $requestMethod === 'POST') && preg_match('#^/admin/support/tickets/(\d+)/status$#', $path, $matches)) {
        $actor = AuthMiddleware::requireRole(['super_admin', 'admin', 'coordinator']);
        $response = AdminPortalController::updateTicketStatus((int)$matches[1], $inputData, $actor);
    }
    elseif (($requestMethod === 'PUT' || $requestMethod === 'POST') && preg_match('#^/admin/support/tickets/(\d+)/assign$#', $path, $matches)) {
        $actor = AuthMiddleware::requireRole(['super_admin', 'admin', 'coordinator']);
        $response = AdminPortalController::assignSupportTicket((int)$matches[1], $inputData, $actor);
    }
    // Settings & Audit Logs
    elseif ($requestMethod === 'GET' && $path === '/admin/settings') {
        $actor = AuthMiddleware::requireRole(['super_admin', 'admin', 'coordinator']);
        $response = AdminPortalController::getSettings();
    }
    elseif ($requestMethod === 'PUT' && $path === '/admin/settings') {
        $actor = AuthMiddleware::requireSuperAdmin();
        $response = AdminPortalController::updateSettings($inputData, $actor);
    }
    elseif ($requestMethod === 'GET' && $path === '/admin/audit-logs') {
        $actor = AuthMiddleware::requireSuperAdmin();
        $response = AdminPortalController::getAuditLogs($_GET);
    }

    // -------------------------------------------------------------
    // CONTENT PUBLISHING, PERMISSIONS & AUDIENCE TARGETING
    // -------------------------------------------------------------
    // Public Website Content (Unauthenticated / Public Access)
    elseif ($requestMethod === 'GET' && $path === '/public/content') {
        $response = PublishingController::getPublicWebsiteContent('all');
    }
    elseif ($requestMethod === 'GET' && preg_match('#^/public/content/([a-zA-Z0-9_-]+)$#', $path, $matches)) {
        $response = PublishingController::getPublicWebsiteContent('single', $matches[1]);
    }
    elseif ($requestMethod === 'GET' && $path === '/public/courses') {
        $response = PublishingController::getPublicWebsiteContent('courses');
    }
    // Secure Material Download / File Access
    elseif ($requestMethod === 'GET' && preg_match('#^/content/material/(\d+)/download$#', $path, $matches)) {
        $actor = AuthMiddleware::getOptionalAuth() ?: ['role' => 'guest'];
        $response = PublishingController::secureDownloadMaterial((int)$matches[1], $actor);
    }
    // Live Audience Count Calculation
    elseif ($requestMethod === 'POST' && $path === '/admin/audience-count') {
        $actor = AuthMiddleware::requireRole(['super_admin', 'admin', 'coordinator', 'faculty']);
        $response = PublishingController::getAudienceCount(
            $inputData['audience_type'] ?? '',
            $inputData['audience_id'] ?? null,
            $actor
        );
    }
    // Learning Materials Management
    elseif ($requestMethod === 'GET' && $path === '/admin/materials') {
        $actor = AuthMiddleware::requireAuth();
        $response = PublishingController::getMaterials($actor, $_GET);
    }
    elseif ($requestMethod === 'POST' && $path === '/admin/materials') {
        $actor = AuthMiddleware::requireRole(['super_admin', 'admin', 'coordinator', 'faculty']);
        $response = PublishingController::createMaterial($inputData, $actor);
    }
    elseif ($requestMethod === 'PUT' && preg_match('#^/admin/materials/(\d+)$#', $path, $matches)) {
        $actor = AuthMiddleware::requireRole(['super_admin', 'admin', 'coordinator', 'faculty']);
        $response = PublishingController::updateMaterial((int)$matches[1], $inputData, $actor);
    }
    elseif ($requestMethod === 'POST' && preg_match('#^/admin/materials/(\d+)/publish$#', $path, $matches)) {
        $actor = AuthMiddleware::requireRole(['super_admin', 'admin', 'coordinator', 'faculty']);
        $response = PublishingController::publishMaterial((int)$matches[1], $inputData, $actor);
    }
    elseif ($requestMethod === 'POST' && preg_match('#^/admin/materials/(\d+)/unpublish$#', $path, $matches)) {
        $actor = AuthMiddleware::requireRole(['super_admin', 'admin', 'coordinator', 'faculty']);
        $response = PublishingController::unpublishMaterial((int)$matches[1], $actor);
    }
    elseif ($requestMethod === 'DELETE' && preg_match('#^/admin/materials/(\d+)$#', $path, $matches)) {
        $actor = AuthMiddleware::requireRole(['super_admin', 'admin', 'coordinator', 'faculty']);
        $response = PublishingController::deleteMaterial((int)$matches[1], $actor);
    }
    // Announcements Management
    elseif ($requestMethod === 'GET' && $path === '/admin/announcements') {
        $actor = AuthMiddleware::requireAuth();
        $response = PublishingController::getAnnouncements($actor, $_GET);
    }
    elseif ($requestMethod === 'POST' && $path === '/admin/announcements') {
        $actor = AuthMiddleware::requireRole(['super_admin', 'admin', 'coordinator', 'faculty']);
        $response = PublishingController::createAnnouncement($inputData, $actor);
    }
    // Admin Publishing Queues & Public Content Review
    elseif ($requestMethod === 'GET' && $path === '/admin/publishing/queues') {
        $actor = AuthMiddleware::requireRole(['super_admin', 'admin', 'coordinator']);
        $response = PublishingController::getAdminPublishingQueues($actor);
    }
    elseif ($requestMethod === 'POST' && $path === '/admin/publishing/review') {
        $actor = AuthMiddleware::requireRole(['super_admin', 'admin', 'coordinator']);
        $response = PublishingController::adminReviewPublicContent(
            $inputData['content_type'] ?? 'public_website_content',
            (int)($inputData['id'] ?? 0),
            $inputData['action'] ?? '',
            $inputData['review_notes'] ?? '',
            $actor
        );
    }
    // Faculty Public Submissions (Articles & Showcases)
    elseif ($requestMethod === 'GET' && $path === '/faculty/public-submissions') {
        $actor = AuthMiddleware::requireRole(['super_admin', 'admin', 'coordinator', 'faculty']);
        $response = PublishingController::getPublicShowcases($actor, $_GET);
    }
    elseif ($requestMethod === 'POST' && $path === '/faculty/public-submissions') {
        $actor = AuthMiddleware::requireRole(['super_admin', 'admin', 'coordinator', 'faculty']);
        $response = PublishingController::createPublicSubmission($inputData, $actor);
    }

    // -------------------------------------------------------------
    // 404 NOT FOUND
    // -------------------------------------------------------------
    else {
        http_response_code(404);
        $response = [
            'success' => false,
            'error' => 'API endpoint not found',
            'requested_path' => $path,
            'method' => $requestMethod
        ];
    }
} catch (Throwable $e) {
    http_response_code(500);
    $response = [
        'success' => false,
        'error' => 'Internal Server Error: ' . $e->getMessage()
    ];
}

// 4. Output JSON Response
echo json_encode($response, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
exit;

