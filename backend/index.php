<?php
// Aaroha LMS - REST API Entrypoint Router
// Optimized for Hostinger Shared LAMP stack (Native PHP 8.x + MySQL)

require_once __DIR__ . '/middleware/cors.php';
require_once __DIR__ . '/middleware/auth.php';
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/CourseController.php';
require_once __DIR__ . '/controllers/EnrollmentController.php';
require_once __DIR__ . '/controllers/TaskController.php';
require_once __DIR__ . '/controllers/PlaybackController.php';
require_once __DIR__ . '/controllers/CertificateController.php';
require_once __DIR__ . '/controllers/LeaderboardController.php';

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
    // AUTHENTICATION ROUTES
    // -------------------------------------------------------------
    if ($requestMethod === 'POST' && $path === '/auth/register') {
        $response = AuthController::register($inputData);
    }
    elseif ($requestMethod === 'POST' && $path === '/auth/login') {
        $response = AuthController::login($inputData);
    }
    elseif ($requestMethod === 'GET' && $path === '/auth/me') {
        $user = AuthMiddleware::requireAuth();
        $response = AuthController::me($user);
    }
    elseif ($requestMethod === 'PUT' && $path === '/auth/profile') {
        $user = AuthMiddleware::requireAuth();
        $response = AuthController::updateProfile((int)$user['id'], $inputData);
    }

    // -------------------------------------------------------------
    // COURSE CATALOG & DETAILS (PUBLIC & GUEST)
    // -------------------------------------------------------------
    elseif ($requestMethod === 'GET' && $path === '/courses') {
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
    elseif ($requestMethod === 'DELETE' && preg_match('#^/courses/(\d+)$#', $path, $matches)) {
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
    elseif ($requestMethod === 'POST' && preg_match('#^/courses/(\d+)/certificates$#', $path, $matches)) {
        $admin = AuthMiddleware::requireAdmin();
        $response = CertificateController::issueCertificate((int)$matches[1], $inputData, $admin);
    }
    elseif ($requestMethod === 'GET' && preg_match('#^/courses/(\d+)/certificates$#', $path, $matches)) {
        $admin = AuthMiddleware::requireAdmin();
        $response = CertificateController::getCourseCertificates((int)$matches[1]);
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
} catch (Exception $e) {
    http_response_code(500);
    $response = [
        'success' => false,
        'error' => 'Internal Server Error: ' . $e->getMessage()
    ];
}

// 4. Output JSON Response
echo json_encode($response, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
exit;

