<?php
// Aaroha LMS - CORS & Security Headers Middleware

function handleCORS() {
    $allowed_origins = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'https://lms.aaroha-inc.com',
        'https://www.aaroha-inc.com',
        'https://aaroha-academy.vercel.app'
    ];

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    
    if (in_array($origin, $allowed_origins) || empty($origin)) {
        header("Access-Control-Allow-Origin: " . ($origin ?: '*'));
    } else {
        header("Access-Control-Allow-Origin: *");
    }

    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Content-Type: application/json; charset=UTF-8");

    // Handle preflight OPTIONS request
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

