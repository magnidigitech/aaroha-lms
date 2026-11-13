// Video URL parser and embed normalizer for Aaroha LMS
// Handles YouTube, Vimeo, direct media streams, and authenticated Bunny Stream embeds

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

export function buildBunnyEmbedUrl({ libraryId = '', videoId, token, expires, autoplay = true }) {
  if (!videoId || !libraryId) return '';
  const base = `https://player.mediadelivery.net/embed/${libraryId}/${videoId}`;
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

  if (isBunnyStreamVideo(trimmed)) {
    const guid = extractBunnyVideoId(trimmed);
    if (guid) {
      return `https://${DEFAULT_BUNNY_CDN}/${guid}/thumbnail.jpg`;
    }
  }

  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`;
  }
  return fallback;
}
