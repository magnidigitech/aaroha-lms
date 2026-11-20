<?php
// Aaroha LMS - CORS & Security Headers Middleware

function handleCORS() {
    $allowed_origins = [
        'https://lms.aaroha-inc.com',
        'https://www.aaroha-inc.com',
        'https://aaroha-inc.com',
        'https://aaroha-academy.vercel.app',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
        'http://127.0.0.1:3000'
    ];

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $is_allowed = false;

    // Header indicating the response depends on incoming Origin header
    header("Vary: Origin, Accept-Encoding");

    if (!empty($origin)) {
        $clean_origin = rtrim($origin, '/');
        if (in_array($clean_origin, $allowed_origins, true)) {
            $is_allowed = true;
            header("Access-Control-Allow-Origin: " . $origin);
            header("Access-Control-Allow-Credentials: true");
            header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
            header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept");
            header("Access-Control-Max-Age: 86400");
        }
    }

    // Default API headers
    header("Content-Type: application/json; charset=UTF-8");
    header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
    header("Pragma: no-cache");
    header("Expires: 0");
    header("X-Accel-Buffering: no");
    header("X-Content-Type-Options: nosniff");
    header("X-Frame-Options: SAMEORIGIN");
    header("X-XSS-Protection: 1; mode=block");
    header("Referrer-Policy: strict-origin-when-cross-origin");
    header("Strict-Transport-Security: max-age=31536000; includeSubDomains; preload");

    // Handle preflight OPTIONS request
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        if (!empty($origin) && !$is_allowed) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'error' => 'CORS Origin not allowed.'
            ]);
            exit;
        }
        http_response_code(204);
        exit;
    }
}
