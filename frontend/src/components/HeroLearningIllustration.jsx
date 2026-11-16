import React from 'react';
import { Terminal, Code2, CheckCircle2, BookOpen } from 'lucide-react';

export default function HeroLearningIllustration() {
  return (
    <div className="w-full min-w-0 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-6 space-y-4">
      {/* Workspace Window Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
            <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
            <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 pl-1">
            <Terminal className="w-3.5 h-3.5 text-[#0A7CB3]" />
            <span>Guided Learning Lab</span>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-md bg-sky-50 text-[#0A7CB3] text-[11px] font-medium border border-sky-100">
          Interactive Workspace
        </span>
      </div>

      {/* Code Editor Panel */}
      <div className="bg-slate-900 rounded-xl p-3.5 sm:p-4 font-mono text-xs leading-relaxed text-slate-300 shadow-inner overflow-hidden">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <Code2 className="w-3.5 h-3.5 text-sky-400" />
            <span>workspace.py</span>
          </span>
          <span className="text-slate-500">Python 3.11</span>
        </div>

        <div className="space-y-1 text-[11px] sm:text-xs overflow-x-auto scrollbar-none pb-0.5">
          <div className="flex">
            <span className="w-5 text-slate-600 select-none shrink-0">1</span>
            <span className="whitespace-nowrap">
              <span className="text-sky-400">def</span>{' '}
              <span className="text-blue-300">build_pipeline</span>(data_source):
            </span>
          </div>
          <div className="flex">
            <span className="w-5 text-slate-600 select-none shrink-0">2</span>
            <span className="pl-3 text-slate-400 whitespace-nowrap"># Guided project milestone</span>
          </div>
          <div className="flex">
            <span className="w-5 text-slate-600 select-none shrink-0">3</span>
            <span className="pl-3 whitespace-nowrap">
              pipeline = <span className="text-sky-400">initialize_stream</span>(data_source)
            </span>
          </div>
          <div className="flex">
            <span className="w-5 text-slate-600 select-none shrink-0">4</span>
            <span className="pl-3 whitespace-nowrap">pipeline.validate_transformations()</span>
          </div>
          <div className="flex">
            <span className="w-5 text-slate-600 select-none shrink-0">5</span>
            <span className="pl-3 whitespace-nowrap">
              <span className="text-sky-400">return</span> pipeline.export_results()
            </span>
          </div>
        </div>

        {/* Milestone Verification Terminal */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap text-[11px]">
          <span className="text-slate-400 flex items-center gap-1.5">
            <span className="text-[#0A7CB3]">&gt;</span> project verification
          </span>
          <span className="text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Milestone verified</span>
          </span>
        </div>
      </div>

      {/* Guided Learning Value Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-0.5">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-800">Guided Projects</div>
            <div className="text-[11px] text-slate-500">Hands-on practical labs</div>
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-sky-100 text-[#0A7CB3] flex items-center justify-center shrink-0 mt-0.5">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-800">Faculty Support</div>
            <div className="text-[11px] text-slate-500">Structured mentor review</div>
          </div>
        </div>
      </div>
    </div>
  );
}
