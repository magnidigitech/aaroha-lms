import React from 'react';
import { X, Award } from 'lucide-react';
import CertificateDocument from './CertificateDocument';

/**
 * Certificate Viewer Modal for Students & Faculty
 */
export default function CertificateModal({
  isOpen,
  onClose,
  certificate
}) {
  if (!isOpen || !certificate) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
      <div 
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="certificate-modal-title"
      >
        {/* Header Bar */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-[#0B1A2F] text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 id="certificate-modal-title" className="text-base sm:text-lg font-bold text-white leading-tight">
                Official Accredited Certificate
              </h2>
              <p className="text-xs text-slate-300 line-clamp-1">
                {certificate.course_title}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Close certificate dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 max-h-[85dvh] overflow-y-auto thin-scrollbar">
          <CertificateDocument
            certificate={certificate}
            onClose={onClose}
          />

          <div className="flex items-center justify-end pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-md"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
