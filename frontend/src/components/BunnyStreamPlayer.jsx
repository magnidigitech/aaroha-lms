import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { buildBunnyEmbedUrl } from '../videoUtils';

const BUNNY_PLAYER_ORIGIN = 'https://player.mediadelivery.net';

/**
 * Reusable Bunny Stream Embedded Video Player Component
 * Renders the official Bunny player iframe using signed token authentication.
 *
 * Navigation & Token Renewal Lifecycle:
 * When token renewal alters iframe.src, it triggers an iframe navigation.
 * The component captures the last known playback position and restores it using
 * Bunny's supported Player.js postMessage API ('ready' -> 'setCurrentTime' -> 'play').
 *
 * Security:
 * Strictly validates every incoming postMessage:
 * - event.origin === 'https://player.mediadelivery.net'
 * - event.source === iframeRef.current.contentWindow
 */
export default function BunnyStreamPlayer({
  libraryId = '807954',
  videoId,
  token,
  expires,
  embedUrl,
  title = 'Aaroha Video Lecture',
  autoplay = true,
  onExpire,
  className = ''
}) {
  const safeLibraryId = libraryId || '807954';
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const iframeRef = useRef(null);

  // Playback state tracking
  const currentTimeRef = useRef(0);
  const pendingSeekTimeRef = useRef(0);
  const isPlayerReadyRef = useRef(false);
  const isPausedRef = useRef(false);

  // Compute current embed URL
  const currentSrc = embedUrl || buildBunnyEmbedUrl({
    libraryId: safeLibraryId,
    videoId,
    token,
    expires,
    autoplay
  });

  const previousSrcRef = useRef(currentSrc);
  const previousVideoIdRef = useRef(videoId);

  // Detect when videoId or src changes (navigation / token renewal)
  useEffect(() => {
    // If switching to a completely different lesson/video, reset playback position to 0
    if (videoId && previousVideoIdRef.current !== videoId) {
      previousVideoIdRef.current = videoId;
      previousSrcRef.current = currentSrc;
      currentTimeRef.current = 0;
      pendingSeekTimeRef.current = 0;
      isPlayerReadyRef.current = false;
      setIsLoading(true);
      return;
    }

    // If same video, but src changed (e.g. token renewal with new token & expires timestamp)
    if (currentSrc && previousSrcRef.current !== currentSrc) {
      // Treat as iframe navigation: preserve current playhead position
      if (currentTimeRef.current > 0) {
        pendingSeekTimeRef.current = currentTimeRef.current;
      }
      previousSrcRef.current = currentSrc;
      isPlayerReadyRef.current = false;
      setIsLoading(true);
    }
  }, [currentSrc, videoId]);

  // Player.js postMessage event listener with strict origin and window source verification
  useEffect(() => {
    const handleMessage = (event) => {
      // 1. Validate expected origin
      if (event.origin !== BUNNY_PLAYER_ORIGIN) {
        return;
      }

      // 2. Validate expected event source window
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) {
        return;
      }

      // 3. Parse and handle payload
      let data = event.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }

      if (!data || typeof data !== 'object') return;

      const eventType = data.event || data.method;

      // Handle Player Readiness: subscribe to events & restore position after navigation/token renewal
      if (eventType === 'ready') {
        isPlayerReadyRef.current = true;
        setIsLoading(false);

        // Subscribe to Player.js events
        try {
          if (iframeRef.current && iframeRef.current.contentWindow) {
            iframeRef.current.contentWindow.postMessage(
              JSON.stringify({ method: 'addEventListener', value: 'timeupdate' }),
              BUNNY_PLAYER_ORIGIN
            );
            iframeRef.current.contentWindow.postMessage(
              JSON.stringify({ method: 'addEventListener', value: 'play' }),
              BUNNY_PLAYER_ORIGIN
            );
            iframeRef.current.contentWindow.postMessage(
              JSON.stringify({ method: 'addEventListener', value: 'pause' }),
              BUNNY_PLAYER_ORIGIN
            );
          }
        } catch {
          // Ignore
        }

        // Restore position if pending seek from token renewal navigation
        if (pendingSeekTimeRef.current > 0) {
          const seekTo = pendingSeekTimeRef.current;
          pendingSeekTimeRef.current = 0;

          try {
            // Seek to previous position
            iframeRef.current.contentWindow.postMessage(
              JSON.stringify({
                method: 'setCurrentTime',
                value: seekTo
              }),
              BUNNY_PLAYER_ORIGIN
            );

            // Resume playback ONLY if user was playing before token renewal
            if (!isPausedRef.current) {
              iframeRef.current.contentWindow.postMessage(
                JSON.stringify({
                  method: 'play'
                }),
                BUNNY_PLAYER_ORIGIN
              );
            }
          } catch {
            // Fallback
          }
        }
      }

      // Track play/pause state
      if (eventType === 'play') {
        isPausedRef.current = false;
      }
      if (eventType === 'pause') {
        isPausedRef.current = true;
      }

      // Handle Continuous Playback Tracking
      if (eventType === 'timeupdate' && data.value) {
        const sec = typeof data.value === 'object' ? data.value.seconds : data.value;
        if (typeof sec === 'number' && !isNaN(sec) && sec >= 0) {
          currentTimeRef.current = sec;
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Proactive token renewal: check expiration and request renewal before token lapses
  useEffect(() => {
    if (!expires) return;

    const checkExpiration = () => {
      const now = Math.floor(Date.now() / 1000);
      const remainingSeconds = expires - now;

      // Renew 60 seconds before expiration
      if (remainingSeconds <= 60 && remainingSeconds > 0 && onExpire) {
        onExpire();
      }
      if (remainingSeconds <= 0) {
        setHasError(true);
      }
    };

    checkExpiration();
    const interval = setInterval(checkExpiration, 15000);
    return () => clearInterval(interval);
  }, [expires, onExpire]);

  // Timeout guard: if Bunny stream fails to report ready within 7 seconds, dismiss loading
  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => {
      if (!isPlayerReadyRef.current) {
        setIsLoading(false);
      }
    }, 7000);
    return () => clearTimeout(timer);
  }, [isLoading, videoId]);

  const handleIframeLoad = () => {
    // Iframe DOM loaded; player readiness will confirm via Player.js 'ready' message
    setIsLoading(false);
  };

  if (!videoId && !embedUrl) {
    return (
      <div 
        className={`w-full h-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-400 ${className}`}
        role="region"
        aria-label="Video Player Missing"
      >
        <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
        <p className="text-sm font-medium">No video source specified for this lecture.</p>
      </div>
    );
  }

  const isMisconfigured = !currentSrc || currentSrc.includes('YOUR_') || currentSrc.includes('/embed//');

  if (isMisconfigured) {
    return (
      <div 
        className={`w-full h-full bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-slate-200 ${className}`}
        role="alert"
      >
        <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-3 shadow-md">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-white">Bunny Stream Configuration Required</h4>
        <p className="text-xs text-slate-300 mt-1.5 max-w-md leading-relaxed">
          Please enter your Bunny Stream credentials (Library ID: <span className="font-mono text-amber-300">807954</span> and Token Key) in <span className="font-mono text-slate-200 bg-slate-800 px-1.5 py-0.5 rounded">backend/config/env.php</span> to enable video playback.
        </p>
      </div>
    );
  }

  if (hasError) {
    return (
      <div 
        className={`w-full h-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-300 ${className}`}
        role="alert"
      >
        <div className="w-12 h-12 rounded-xl bg-red-950/80 border border-red-800 flex items-center justify-center text-red-400 mb-3 shadow-lg">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-white">Playback Session Expired</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          The secure playback token for this video has expired. Please refresh your lecture session.
        </p>
        {onExpire && (
          <button
            onClick={() => {
              setHasError(false);
              setIsLoading(true);
              onExpire();
            }}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Renew Secure Token</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div 
      className={`relative w-full h-full bg-black overflow-hidden ${className}`}
      role="region"
      aria-label={`Video Player: ${title}`}
    >
      {/* Loading Overlay */}
      {isLoading && (
        <div 
          className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center text-white z-10 transition-opacity"
          aria-live="polite"
        >
          <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-3" />
          <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Loading stream...</span>
          </div>
        </div>
      )}

      {/*
        Official Bunny Stream Embedded Player Iframe
      */}
      <iframe
        ref={iframeRef}
        key={videoId || 'bunny-player'}
        src={currentSrc}
        title={title}
        className="w-full h-full border-0"
        loading="lazy"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
        allowFullScreen
        onLoad={handleIframeLoad}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />

      {/* Security Accreditation Badge */}
      <div 
        className="absolute top-2 right-2 pointer-events-none z-20 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] text-slate-300 font-medium opacity-75 hover:opacity-100 transition-opacity"
        title="Authenticated via Bunny Stream Token Authentication"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>Token-Authenticated Stream</span>
      </div>
    </div>
  );
}
