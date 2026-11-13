<?php
// Aaroha LMS - Dedicated Bunny Stream Video Service Module
// Encapsulates official Bunny Stream token signing, video playback session generation, and API interactions.
//
// Cryptographic Specification Note:
// Official Bunny Stream Embed View Token Authentication uses standard SHA-256 (hash('sha256', ...)),
// NOT HMAC (hash_hmac). While Bunny CDN URL Token Authentication for pull zone files uses HMAC-SHA256,
// the embedded player iframe (player.mediadelivery.net) strictly expects:
//   token = hash('sha256', token_key . videoId . expires)
//
// Security: Credentials are read exclusively on the backend and NEVER returned to the client.

class BunnyStreamService {
    private static ?array $config = null;

    /**
     * Load Bunny Stream configuration from env.php or environment variables
     */
    public static function getConfig(): array {
        if (self::$config === null) {
            $envConfig = [];
            $candidates = [
                __DIR__ . '/../config/env.php',
                dirname(__DIR__, 2) . '/env.php',
                dirname(__DIR__, 3) . '/env.php',
            ];
            foreach ($candidates as $candidate) {
                if (file_exists($candidate)) {
                    $envConfig = require $candidate;
                    break;
                }
            }

            self::$config = [
                'library_id' => (string)($envConfig['BUNNY_STREAM_LIBRARY_ID'] ?? getenv('BUNNY_STREAM_LIBRARY_ID') ?: ''),
                'cdn_hostname' => (string)($envConfig['BUNNY_STREAM_CDN_HOSTNAME'] ?? getenv('BUNNY_STREAM_CDN_HOSTNAME') ?: ''),
                'api_key' => (string)($envConfig['BUNNY_STREAM_API_KEY'] ?? getenv('BUNNY_STREAM_API_KEY') ?: ''),
                'token_key' => (string)($envConfig['BUNNY_STREAM_TOKEN_KEY'] ?? getenv('BUNNY_STREAM_TOKEN_KEY') ?: ''),
            ];
        }
        return self::$config;
    }

    /**
     * Determine if a given media URL or identifier refers to Bunny Stream
     */
    public static function isBunnyStream(?string $mediaUrlOrId): bool {
        if (!$mediaUrlOrId) return false;
        $val = trim($mediaUrlOrId);

        // Raw UUID (e.g., 0de41d3a-4d1d-498b-b731-bcc31a59ffc2)
        if (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $val)) {
            return true;
        }

        // Custom URI or embed host patterns
        if (str_starts_with($val, 'bunny://') ||
            str_contains($val, 'player.mediadelivery.net') ||
            str_contains($val, 'video.bunnycdn.com') ||
            str_contains($val, '.b-cdn.net')) {
            return true;
        }

        return false;
    }

    /**
     * Extract clean video UUID from a URL, embed string, or raw ID
     */
    public static function extractVideoId(?string $mediaUrlOrId): ?string {
        if (!$mediaUrlOrId) return null;
        $val = trim($mediaUrlOrId);

        // 1. Direct UUID
        if (preg_match('/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i', $val, $matches)) {
            return strtolower($matches[0]);
        }

        return null;
    }

    /**
     * Generate an expiring Bunny Stream embed token using official SHA-256 specification:
     * token = hash('sha256', token_key + video_id + expires)
     *
     * @param string $videoId Video GUID
     * @param int $expires Absolute Unix timestamp when token expires
     * @param string|null $tokenKey Optional override, defaults to configured token_key
     * @return string SHA-256 hexadecimal token
     */
    public static function generateEmbedToken(string $videoId, int $expires, ?string $tokenKey = null): string {
        $key = $tokenKey ?? self::getConfig()['token_key'];
        if (empty($key)) {
            throw new RuntimeException('Bunny Stream Token Key is not configured on the server.');
        }

        $hashableString = $key . $videoId . $expires;
        return hash('sha256', $hashableString);
    }

    /**
     * Create an authorized, signed playback session for a video.
     * Note: NEVER includes token_key or api_key in the returned structure.
     *
     * @param string $videoId Video GUID
     * @param int $ttl Time to live in seconds (default: 3600 seconds = 1 hour)
     * @return array Safe payload for client consumption
     */
    public static function generatePlaybackSession(string $videoId, int $ttl = 3600): array {
        $config = self::getConfig();
        $libraryId = !empty($config['library_id']) ? $config['library_id'] : '807954';
        $cdnHostname = !empty($config['cdn_hostname']) ? $config['cdn_hostname'] : 'video.bunnycdn.com';

        $expires = time() + max(60, $ttl);
        $token = null;

        if (!empty($config['token_key'])) {
            try {
                $token = self::generateEmbedToken($videoId, $expires, $config['token_key']);
            } catch (Exception $e) {
                $token = null;
            }
        }

        $tokenQuery = $token ? "&token={$token}&expires={$expires}" : "";
        $embedUrl = "https://player.mediadelivery.net/embed/{$libraryId}/{$videoId}?autoplay=true{$tokenQuery}";
        $directStreamUrl = "https://{$cdnHostname}/{$videoId}/playlist.m3u8" . ($token ? "?token={$token}&expires={$expires}" : "");
        $thumbnailUrl = "https://{$cdnHostname}/{$videoId}/thumbnail.jpg";

        return [
            'provider' => 'bunny_stream',
            'library_id' => $libraryId,
            'video_id' => $videoId,
            'embed_url' => $embedUrl,
            'direct_stream_url' => $directStreamUrl,
            'thumbnail_url' => $thumbnailUrl,
            'token' => $token,
            'expires' => $expires,
            'expires_in_seconds' => $ttl,
        ];
    }

    /**
     * Fetch video metadata from Bunny Stream API (optional backend verification)
     */
    public static function fetchVideoDetails(string $videoId): ?array {
        $config = self::getConfig();
        $libraryId = $config['library_id'];
        $apiKey = $config['api_key'];

        if (empty($apiKey) || empty($libraryId)) {
            return null;
        }

        $url = "https://video.bunnycdn.com/library/{$libraryId}/videos/{$videoId}";
        $opts = [
            'http' => [
                'method' => 'GET',
                'header' => [
                    "AccessKey: {$apiKey}",
                    "Accept: application/json"
                ],
                'timeout' => 5
            ]
        ];

        $context = stream_context_create($opts);
        $result = @file_get_contents($url, false, $context);
        if ($result === false) {
            return null;
        }

        return json_decode($result, true) ?: null;
    }
}

