<?php
// Aaroha LMS - Lightweight JWT Helper (HMAC-SHA256)
// Zero external dependencies required - 100% portable on Hostinger Shared Hosting

class JWT {
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
            __DIR__ . '/../config/env.php',
            dirname(__DIR__, 2) . '/env.php',
            dirname(__DIR__, 3) . '/env.php',
            dirname(__DIR__, 4) . '/env.php',
        ];
        foreach ($candidates as $candidate) {
            if (file_exists($candidate)) {
                $cfg = require $candidate;
                if (!empty($cfg['JWT_SECRET'])) {
                    return (string)$cfg['JWT_SECRET'];
                }
            }
        }

        $envSecret = getenv('JWT_SECRET');
        if (!empty($envSecret)) {
            return (string)$envSecret;
        }

        // Fail-safe: No hardcoded fallback is permitted.
        error_log("CRITICAL SECURITY: JWT signing secret is unconfigured in environment or env.php.");
        return null;
    }

    public static function generate($payload) {
        $secret = self::getSecret();
        if (!$secret) {
            error_log("CRITICAL SECURITY: Attempted to generate JWT without a configured JWT_SECRET.");
            throw new RuntimeException("JWT signing secret is unconfigured.");
        }
        
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
        if (!$secret) {
            // Fail closed: Token cannot be verified safely without configured secret
            error_log("CRITICAL SECURITY: JWT token verification rejected because JWT_SECRET is unconfigured.");
            return null;
        }

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
