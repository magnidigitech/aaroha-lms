// Video URL parser and embed normalizer for Aaroha LMS
// Handles YouTube (watch, shorts, embed, youtu.be), Vimeo, and direct media streams

export function getEmbedVideoUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();

  // YouTube variants:
  // - https://www.youtube.com/watch?v=VIDEO_ID
  // - https://youtu.be/VIDEO_ID
  // - https://www.youtube.com/shorts/VIDEO_ID
  // - https://www.youtube.com/embed/VIDEO_ID
  // - https://m.youtube.com/watch?v=VIDEO_ID
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&rel=0&modestbranding=1`;
  }

  // Vimeo:
  // - https://vimeo.com/123456789
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
  }

  return trimmed;
}

export function isDirectVideoFile(url) {
  if (!url || typeof url !== 'string') return false;
  return /\.(mp4|webm|ogg|m4v)($|\?)/i.test(url.trim());
}

