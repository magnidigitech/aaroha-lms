<?php
// Aaroha LMS - REST API Entrypoint Router
// Optimized for Hostinger Shared LAMP stack (Native PHP 8.x + MySQL)

require_once __DIR__ . '/middleware/cors.php';
require_once __DIR__ . '/middleware/auth.php';
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/CourseController.php';
require_once __DIR__ . '/controllers/EnrollmentController.php';
require_once __DIR__ . '/controllers/TaskController.php';

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
    // FACULTY / ADMIN CURRICULUM MANAGEMENT
    // -------------------------------------------------------------
    elseif ($requestMethod === 'POST' && $path === '/courses') {
        $admin = AuthMiddleware::requireAdmin();
        $response = CourseController::createCourse($inputData, (int)$admin['id']);
    }
    elseif ($requestMethod === 'POST' && preg_match('#^/courses/(\d+)/modules$#', $path, $matches)) {
        AuthMiddleware::requireAdmin();
        $response = CourseController::createModule((int)$matches[1], $inputData);
    }
    elseif ($requestMethod === 'POST' && preg_match('#^/modules/(\d+)/lessons$#', $path, $matches)) {
        AuthMiddleware::requireAdmin();
        $response = CourseController::createLesson((int)$matches[1], $inputData);
    }
    elseif ($requestMethod === 'POST' && preg_match('#^/modules/(\d+)/tasks$#', $path, $matches)) {
        AuthMiddleware::requireAdmin();
        $response = CourseController::createTask((int)$matches[1], $inputData);
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

