import React from 'react';
import { Trophy, Star, ChevronLeft } from 'lucide-react';

export default function LeaderboardToggle({ onToggle, isOpen }) {
  if (isOpen) return null;

  return (
    <button
      type="button"
      onClick={onToggle}
      title="Open Student Ranking Leaderboard"
      aria-label="Open Student Ranking Leaderboard"
      className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-[#0B1A2F]/95 hover:bg-[#0A7CB3] border-l-2 border-y border-[#0A7CB3] hover:border-[#38bdf8] text-white shadow-2xl shadow-blue-950/60 rounded-l-2xl py-3 px-2 sm:px-2.5 flex flex-col items-center gap-2 cursor-pointer transition-all duration-300 group hover:-translate-x-1 focus:outline-none select-none backdrop-blur-md"
    >
      {/* Icon with glowing pulse */}
      <div className="w-7 h-7 rounded-xl bg-amber-400/20 group-hover:bg-white/20 border border-amber-400/40 group-hover:border-white/40 flex items-center justify-center transition-colors shadow-xs">
        <Trophy className="w-3.5 h-3.5 text-amber-400 group-hover:text-amber-300 transition-transform group-hover:scale-110" />
      </div>

      {/* Vertical Rotated Text */}
      <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-extrabold tracking-widest text-slate-200 group-hover:text-white uppercase transition-colors py-0.5">
        Leaderboard
      </span>

      {/* Indicator Pill */}
      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ring-2 ring-emerald-950" />
    </button>
  );
}
