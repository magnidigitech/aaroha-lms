// Video URL parser and embed normalizer for Aaroha LMS
// Handles YouTube, Vimeo, direct media streams, and authenticated Bunny Stream embeds

export const DEFAULT_BUNNY_LIBRARY = '807954';
export const DEFAULT_BUNNY_CDN = 'video.bunnycdn.com';

export function isBunnyStreamVideo(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();

  // Match raw UUID
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    return true;
  }

  return (
    trimmed.startsWith('bunny://') ||
    trimmed.includes('player.mediadelivery.net') ||
    trimmed.includes('video.bunnycdn.com') ||
    trimmed.includes('.b-cdn.net')
  );
}

export function extractBunnyVideoId(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const match = trimmed.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return match ? match[0].toLowerCase() : null;
}

export function buildBunnyEmbedUrl({ libraryId = DEFAULT_BUNNY_LIBRARY, videoId, token, expires, autoplay = true }) {
  const libId = libraryId || DEFAULT_BUNNY_LIBRARY;
  if (!videoId || !libId) return '';
  const base = `https://player.mediadelivery.net/embed/${libId}/${videoId}`;
  const params = new URLSearchParams();
  if (token) params.set('token', token);
  if (expires) params.set('expires', String(expires));
  if (autoplay) params.set('autoplay', 'true');
  params.set('preload', 'true');

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function getEmbedVideoUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();

  // If already a Bunny Stream video GUID or URL, normalize embed base if needed
  if (isBunnyStreamVideo(trimmed)) {
    if (trimmed.includes('player.mediadelivery.net/embed')) {
      return trimmed;
    }
    const guid = extractBunnyVideoId(trimmed);
    if (guid) {
      return `https://player.mediadelivery.net/embed/${DEFAULT_BUNNY_LIBRARY}/${guid}`;
    }
  }

  // YouTube variants:
  // - https://www.youtube.com/watch?v=VIDEO_ID
  // - https://youtu.be/VIDEO_ID
  // - https://www.youtube.com/shorts/VIDEO_ID
  // - https://www.youtube.com/embed/VIDEO_ID
  // - https://m.youtube.com/watch?v=VIDEO_ID
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&rel=0&modestbranding=1`;
  }

  // Vimeo:
  // - https://vimeo.com/123456789
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
  }

  return trimmed;
}

export function isDirectVideoFile(url) {
  if (!url || typeof url !== 'string') return false;
  return /\.(mp4|webm|ogg|m4v)($|\?)/i.test(url.trim());
}

export function getVideoThumbnail(url, fallback = '') {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();

  // 1. If it's already a direct image file or data URI, return as-is
  if (/\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i.test(trimmed) || trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  // 2. YouTube thumbnails (100% public, open, reliable CDN)
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`;
  }

  // 3. For Bunny Stream or other protected video providers:
  // Direct Bunny CDN thumbnails require tokenized URL parameters or return 403/404.
  // We strictly fall back to the course thumbnail.
  return fallback;
}
