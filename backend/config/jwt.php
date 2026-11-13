<?php
// Aaroha LMS - Lightweight JWT Helper (HMAC-SHA256)
// Zero external dependencies required - 100% portable on Hostinger Shared Hosting

class JWT {
    private static $secret = 'aaroha_lms_super_secret_jwt_key_2026_change_in_production';
    private static $expiry_seconds = 604800; // 7 days

    private static function base64UrlEncode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode($data) {
        return base64_decode(strtr($data, '-_', '+/'));
    }

    private static function getSecret() {
        $candidates = [
            __DIR__ . '/env.php',
            dirname(__DIR__, 2) . '/env.php',
            dirname(__DIR__, 3) . '/env.php',
        ];
        foreach ($candidates as $candidate) {
            if (file_exists($candidate)) {
                $cfg = require $candidate;
                if (!empty($cfg['JWT_SECRET'])) return $cfg['JWT_SECRET'];
            }
        }
        return getenv('JWT_SECRET') ?: self::$secret;
    }

    public static function generate($payload) {
        $secret = self::getSecret();
        
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload['iat'] = time();
        $payload['exp'] = time() + self::$expiry_seconds;
        
        $base64UrlHeader = self::base64UrlEncode($header);
        $base64UrlPayload = self::base64UrlEncode(json_encode($payload));
        
        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $secret, true);
        $base64UrlSignature = self::base64UrlEncode($signature);
        
        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }

    public static function verify($jwt) {
        if (!$jwt) return null;
        
        $secret = self::getSecret();
        $tokenParts = explode('.', $jwt);
        
        if (count($tokenParts) !== 3) return null;
        
        list($header, $payload, $signature) = $tokenParts;
        
        $validSignature = self::base64UrlEncode(
            hash_hmac('sha256', $header . "." . $payload, $secret, true)
        );
        
        if (!hash_equals($validSignature, $signature)) {
            return null;
        }
        
        $decodedPayload = json_decode(self::base64UrlDecode($payload), true);
        if (!$decodedPayload || !isset($decodedPayload['exp'])) {
            return null;
        }
        
        if ($decodedPayload['exp'] < time()) {
            return null; // Expired
        }
        
        return $decodedPayload;
    }
}

