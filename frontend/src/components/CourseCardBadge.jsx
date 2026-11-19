import React from 'react';

/**
 * Coordinated Color Presets for Aaroha LMS Course Card Badges
 * Each preset defines matching background, text, and border styling with high contrast.
 */
export const BADGE_COLOR_PRESETS = [
  {
    key: 'neutral',
    label: 'Neutral',
    aliases: ['slate', 'gray', 'grey'],
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200/80',
    swatchDot: 'bg-slate-500',
    swatchRing: 'ring-slate-400',
    swatchBg: 'bg-slate-50',
    swatchBorder: 'border-slate-300'
  },
  {
    key: 'blue',
    label: 'Aaroha Blue',
    aliases: ['aaroha_blue', 'aaroha blue', 'sky'],
    badgeClass: 'bg-sky-50 text-[#0A7CB3] border-sky-200/80',
    swatchDot: 'bg-[#0A7CB3]',
    swatchRing: 'ring-[#0A7CB3]',
    swatchBg: 'bg-sky-50/70',
    swatchBorder: 'border-sky-300'
  },
  {
    key: 'green',
    label: 'Green',
    aliases: ['emerald', 'teal'],
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    swatchDot: 'bg-emerald-600',
    swatchRing: 'ring-emerald-500',
    swatchBg: 'bg-emerald-50/70',
    swatchBorder: 'border-emerald-300'
  },
  {
    key: 'purple',
    label: 'Purple',
    aliases: ['violet', 'indigo'],
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200/80',
    swatchDot: 'bg-purple-600',
    swatchRing: 'ring-purple-500',
    swatchBg: 'bg-purple-50/70',
    swatchBorder: 'border-purple-300'
  },
  {
    key: 'amber',
    label: 'Amber',
    aliases: ['orange', 'yellow'],
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
    swatchDot: 'bg-amber-600',
    swatchRing: 'ring-amber-500',
    swatchBg: 'bg-amber-50/70',
    swatchBorder: 'border-amber-300'
  }
];

/**
 * Resolves a color key or alias to its canonical preset.
 * @param {string|null} colorKey
 * @returns {object|null}
 */
export function resolveBadgePreset(colorKey) {
  if (!colorKey) return null;
  const normalized = String(colorKey).toLowerCase().trim();
  return (
    BADGE_COLOR_PRESETS.find(
      p => p.key === normalized || (p.aliases && p.aliases.includes(normalized))
    ) || null
  );
}

/**
 * Preserves the legacy heuristic badge appearance for existing courses
 * where an explicit badge_color has not yet been selected by an editor.
 * @param {string} badgeText
 * @param {object} course
 * @returns {string} Tailwind CSS class string
 */
export function getLegacyBadgeStyle(badgeText, course = {}) {
  const text = (badgeText || '').toLowerCase();
  if (text.includes('updated')) {
    return 'bg-emerald-50 text-emerald-800 border-emerald-200/60';
  }
  if (text.includes('ai') || text.includes('top')) {
    return 'bg-purple-50 text-purple-700 border-purple-200/60';
  }
  if (text.includes('preview')) {
    return 'bg-blue-50 text-[#0A7CB3] border-blue-200/60';
  }
  if (course.id === 1) {
    return 'bg-emerald-50 text-emerald-800 border-emerald-200/60';
  }
  if (course.id === 2 || course.category === 'Applied AI' || (course.title || '').toLowerCase().includes('nlp')) {
    return 'bg-purple-50 text-purple-700 border-purple-200/60';
  }
  return 'bg-slate-100 text-slate-700 border-slate-200/80';
}

/**
 * Unified Course Card Badge Component
 * Used across the public catalog card and the live preview inside Create/Edit Course modal.
 *
 * @param {object} props
 * @param {string} props.text - The badge label
 * @param {string} [props.color] - Explicit preset key ('neutral' | 'blue' | 'green' | 'purple' | 'amber')
 * @param {object} [props.course] - Optional course object for legacy fallback resolution
 * @param {string} [props.className] - Additional CSS class names
 */
export default function CourseCardBadge({ text, color, course = {}, className = '' }) {
  if (!text || !text.trim()) return null;

  let styleClass = '';
  if (color && color.trim()) {
    const preset = resolveBadgePreset(color);
    styleClass = preset ? preset.badgeClass : BADGE_COLOR_PRESETS[0].badgeClass;
  } else {
    // Preserve legacy appearance of existing badges until an editor explicitly chooses a colour
    styleClass = getLegacyBadgeStyle(text, course);
  }

  return (
    <span
      className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border shadow-2xs ${styleClass} ${className}`.trim()}
    >
      {text.trim()}
    </span>
  );
}
