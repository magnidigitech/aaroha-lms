import React, { useEffect, useRef, useState } from 'react';

/**
 * HeroTechBackground
 * Restricted technology-inspired background animation layer for the Aaroha homepage hero.
 * 
 * Strict boundary rules:
 * - Completely excluded from the photograph, people, faces, and laptops (x > 55%)
 * - Completely excluded from heading, description, search, topic chips, and buttons (x < 42%)
 * - Confined strictly to the empty pale background transition zone (x: 42% to 55%)
 * - Hidden on mobile viewports (< 768px) where empty background space is insufficient
 * - Non-interactive (pointer-events: none) and hidden from screen readers (aria-hidden: true)
 * - Motion-safe: disables all animations under prefers-reduced-motion: reduce
 * - Energy-efficient: pauses execution when scrolled off-screen via IntersectionObserver
 */
export default function HeroTechBackground({ className = '' }) {
  const containerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(true);

  // Pause animation when hero is off-screen to conserve GPU and battery
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );

    const currentRef = containerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      role="presentation"
      className={`absolute inset-0 pointer-events-none select-none overflow-hidden hidden md:block ${
        !isVisible ? 'tech-bg-paused' : ''
      } ${className}`}
    >
      <style>{`
        @keyframes tech-drift-slow-a {
          0%, 100% { transform: translate(0px, 0px); }
          50% { transform: translate(-3px, 4px); }
        }
        @keyframes tech-drift-slow-b {
          0%, 100% { transform: translate(0px, 0px); }
          50% { transform: translate(3px, -4px); }
        }
        @keyframes tech-pulse-gentle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(1.25); }
        }
        .tech-drift-a {
          animation: tech-drift-slow-a 24s ease-in-out infinite;
          transform-origin: center;
        }
        .tech-drift-b {
          animation: tech-drift-slow-b 28s ease-in-out infinite;
          transform-origin: center;
        }
        .tech-pulse {
          animation: tech-pulse-gentle 8s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        .tech-bg-paused * {
          animation-play-state: paused !important;
        }
        @media (prefers-reduced-motion: reduce) {
          .tech-drift-a,
          .tech-drift-b,
          .tech-pulse {
            animation: none !important;
          }
        }
      `}</style>

      {/* SVG Canvas with responsive clipping mask to confine particles strictly to the empty corridor */}
      <svg
        viewBox="0 0 1000 500"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* 
            Responsive clipping mask:
            - 0% to 41%: 0% opacity (completely shields text, heading, search, topic chips)
            - 42% to 48%: smooth ramp up to 100%
            - 48% to 51%: full visibility in the empty background space
            - 51% to 55%: smooth ramp down to 0%
            - 55% to 100%: 0% opacity (completely shields photograph, people, faces, and laptops)
          */}
          <linearGradient id="empty-space-boundary-mask" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="41%" stopColor="white" stopOpacity="0" />
            <stop offset="45%" stopColor="white" stopOpacity="0.7" />
            <stop offset="48%" stopColor="white" stopOpacity="1" />
            <stop offset="51%" stopColor="white" stopOpacity="0.7" />
            <stop offset="55%" stopColor="white" stopOpacity="0" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>

          <mask id="empty-space-mask">
            <rect x="0" y="0" width="1000" height="500" fill="url(#empty-space-boundary-mask)" />
          </mask>

          <linearGradient id="line-gradient-edge" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0A7CB3" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#0284C7" stopOpacity="0.12" />
          </linearGradient>
        </defs>

        {/* Masked group: guarantees no particle ever exceeds the empty space boundary */}
        <g mask="url(#empty-space-mask)">
          {/* Upper empty corridor cluster (x: 450 - 510, y: 70 - 140) */}
          <g className="tech-drift-a">
            <line x1="470" y1="75" x2="505" y2="105" stroke="url(#line-gradient-edge)" strokeWidth="0.8" />
            <line x1="470" y1="75" x2="455" y2="135" stroke="url(#line-gradient-edge)" strokeWidth="0.8" strokeDasharray="2 2" />
            
            <circle cx="470" cy="75" r="2" fill="#0A7CB3" fillOpacity="0.28" />
            <circle cx="505" cy="105" r="2.2" fill="#0284C7" fillOpacity="0.32" />
            <circle cx="455" cy="135" r="1.8" fill="#0A7CB3" fillOpacity="0.22" />
            
            {/* Single subtle pulse node in upper empty band */}
            <circle cx="505" cy="105" r="5" fill="#38BDF8" fillOpacity="0.12" className="tech-pulse" />
          </g>

          {/* Lower empty corridor cluster (x: 460 - 515, y: 390 - 450) */}
          <g className="tech-drift-b">
            <line x1="480" y1="395" x2="515" y2="425" stroke="url(#line-gradient-edge)" strokeWidth="0.8" />
            <line x1="480" y1="395" x2="460" y2="445" stroke="url(#line-gradient-edge)" strokeWidth="0.8" strokeDasharray="2 2" />
            
            <circle cx="480" cy="395" r="2" fill="#0A7CB3" fillOpacity="0.26" />
            <circle cx="515" cy="425" r="2" fill="#0284C7" fillOpacity="0.3" />
            <circle cx="460" cy="445" r="1.8" fill="#0A7CB3" fillOpacity="0.2" />
          </g>
        </g>
      </svg>
    </div>
  );
}
