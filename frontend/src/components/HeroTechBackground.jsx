import React, { useEffect, useRef, useState } from 'react';

/**
 * HeroTechBackground
 * Subtle technology-inspired background animation for the Aaroha homepage hero.
 * Features a sparse network of small connection points and thin connecting lines
 * in Aaroha blue and cyan at low opacity, concentrated on the right and outer edges.
 *
 * Designed with:
 * - pointer-events: none (cannot intercept clicks)
 * - aria-hidden: true (hidden from assistive technology)
 * - prefers-reduced-motion: reduce fallback (motion disabled)
 * - IntersectionObserver: pauses animation when off-screen to conserve resources
 * - Mobile optimization: hides complex lines and renders minimal points on small viewports
 */
export default function HeroTechBackground() {
  const containerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(true);

  // Pause animation when off-screen to conserve GPU and battery
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
      className={`absolute inset-0 pointer-events-none select-none overflow-hidden z-0 ${
        !isVisible ? 'tech-bg-paused' : ''
      }`}
    >
      <style>{`
        @keyframes tech-drift-1 {
          0%, 100% { transform: translate(0px, 0px); }
          33% { transform: translate(-8px, 10px); }
          66% { transform: translate(6px, -7px); }
        }
        @keyframes tech-drift-2 {
          0%, 100% { transform: translate(0px, 0px); }
          40% { transform: translate(8px, -9px); }
          75% { transform: translate(-6px, 6px); }
        }
        @keyframes tech-pulse-soft {
          0%, 100% { opacity: 0.28; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.35); }
        }
        @keyframes tech-line-drift {
          0%, 100% { opacity: 0.14; }
          50% { opacity: 0.28; }
        }
        .tech-drift-group-1 {
          animation: tech-drift-1 18s ease-in-out infinite;
          transform-origin: center;
        }
        .tech-drift-group-2 {
          animation: tech-drift-2 22s ease-in-out infinite;
          transform-origin: center;
        }
        .tech-pulse-node {
          animation: tech-pulse-soft 6s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        .tech-line-anim {
          animation: tech-line-drift 10s ease-in-out infinite;
        }
        .tech-bg-paused * {
          animation-play-state: paused !important;
        }
        @media (prefers-reduced-motion: reduce) {
          .tech-drift-group-1,
          .tech-drift-group-2,
          .tech-pulse-node,
          .tech-line-anim {
            animation: none !important;
          }
        }
      `}</style>

      {/* SVG Canvas for Network Graph */}
      <svg
        viewBox="0 0 1000 500"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradient mask: Keeps heading and search area (0% to 50%) visually quiet */}
          <linearGradient id="tech-quiet-zone-mask" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="48%" stopColor="white" stopOpacity="0" />
            <stop offset="62%" stopColor="white" stopOpacity="0.5" />
            <stop offset="78%" stopColor="white" stopOpacity="1" />
          </linearGradient>

          <mask id="tech-network-mask">
            <rect x="0" y="0" width="1000" height="500" fill="url(#tech-quiet-zone-mask)" />
          </mask>

          {/* Line gradients using Aaroha Blue (#0A7CB3) and Cyan (#0284C7 / #38BDF8) */}
          <linearGradient id="line-gradient-blue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0A7CB3" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#0284C7" stopOpacity="0.16" />
          </linearGradient>

          <linearGradient id="line-gradient-cyan" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0284C7" stopOpacity="0.26" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.12" />
          </linearGradient>
        </defs>

        {/* Network Layer (Masked to preserve the quiet reading zone on the left) */}
        <g mask="url(#tech-network-mask)">
          {/* Group 1: Primary slow-drifting lines and connected nodes */}
          <g className="tech-drift-group-1">
            {/* Desktop connection lines (hidden on mobile for performance and simplicity) */}
            <g className="hidden sm:inline tech-line-anim" stroke="url(#line-gradient-blue)" strokeWidth="1.2">
              <line x1="620" y1="130" x2="740" y2="80" />
              <line x1="740" y1="80" x2="880" y2="120" />
              <line x1="880" y1="120" x2="960" y2="90" />
              <line x1="620" y1="130" x2="680" y2="250" />
              <line x1="740" y1="80" x2="810" y2="210" />
              <line x1="880" y1="120" x2="810" y2="210" />
              <line x1="880" y1="120" x2="940" y2="240" />
              <line x1="680" y1="250" x2="810" y2="210" />
              <line x1="810" y1="210" x2="940" y2="240" />
              <line x1="680" y1="250" x2="630" y2="380" />
              <line x1="680" y1="250" x2="770" y2="370" />
              <line x1="810" y1="210" x2="770" y2="370" />
              <line x1="810" y1="210" x2="900" y2="390" />
              <line x1="940" y1="240" x2="900" y2="390" />
              <line x1="630" y1="380" x2="770" y2="370" />
              <line x1="770" y1="370" x2="900" y2="390" />
            </g>

            {/* Nodes in Group 1 */}
            <circle cx="620" cy="130" r="3" fill="#0A7CB3" fillOpacity="0.4" />
            <circle cx="880" cy="120" r="3.5" fill="#0A7CB3" fillOpacity="0.45" />
            <circle cx="810" cy="210" r="4" fill="#0284C7" fillOpacity="0.5" />
            <circle cx="630" cy="380" r="2.5" fill="#0A7CB3" fillOpacity="0.35" />
            <circle cx="900" cy="390" r="3.5" fill="#0284C7" fillOpacity="0.45" />

            {/* Occasional gentle pulse node */}
            <circle cx="810" cy="210" r="8" fill="#38BDF8" fillOpacity="0.18" className="tech-pulse-node" />
            <circle cx="880" cy="120" r="7" fill="#0A7CB3" fillOpacity="0.15" className="tech-pulse-node" style={{ animationDelay: '-3s' }} />
          </g>

          {/* Group 2: Complementary secondary drifting nodes & lines */}
          <g className="tech-drift-group-2">
            <g className="hidden sm:inline tech-line-anim" stroke="url(#line-gradient-cyan)" strokeWidth="1" strokeDasharray="3 3">
              <line x1="740" y1="80" x2="680" y2="250" />
              <line x1="960" y1="90" x2="940" y2="240" />
              <line x1="770" y1="370" x2="840" y2="450" />
              <line x1="900" y1="390" x2="840" y2="450" />
            </g>

            {/* Nodes in Group 2 */}
            <circle cx="740" cy="80" r="3" fill="#0284C7" fillOpacity="0.4" />
            <circle cx="960" cy="90" r="2.5" fill="#0A7CB3" fillOpacity="0.35" />
            <circle cx="680" cy="250" r="3.5" fill="#0A7CB3" fillOpacity="0.4" />
            <circle cx="940" cy="240" r="3" fill="#0284C7" fillOpacity="0.4" />
            <circle cx="770" cy="370" r="3" fill="#0A7CB3" fillOpacity="0.4" />
            <circle cx="840" cy="450" r="2.5" fill="#38BDF8" fillOpacity="0.35" />

            {/* Soft pulse on node 680,250 */}
            <circle cx="680" cy="250" r="7" fill="#0284C7" fillOpacity="0.16" className="tech-pulse-node" style={{ animationDelay: '-1.5s' }} />
          </g>
        </g>
      </svg>
    </div>
  );
}

