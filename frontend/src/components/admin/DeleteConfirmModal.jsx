import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, X, ShieldAlert, Loader2 } from 'lucide-react';

/**
 * Reusable Accessible Deletion & Archiving Confirmation Dialog
 * Adheres to WCAG alertdialog accessibility guidelines (focus management, Escape to close).
 */
export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Archive Content',
  itemName = '',
  itemType = 'Item',
  affectedChildren = '',
  studentImpact = '',
  confirmButtonText = 'Confirm Archive'
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);
  const cancelButtonRef = useRef(null);
  const triggerElementRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      triggerElementRef.current = document.activeElement;
      setError(null);
      setIsDeleting(false);
      // Accessibility: Focus cancel button upon opening
      setTimeout(() => cancelButtonRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape' && !isDeleting) {
        onClose();
        setTimeout(() => triggerElementRef.current?.focus?.(), 50);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen) return null;

  const handleConfirmClick = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm();
      setIsDeleting(false);
      onClose();
      setTimeout(() => triggerElementRef.current?.focus?.(), 50);
    } catch (err) {
      setIsDeleting(false);
      setError(err.message || 'Failed to archive item. Please try again.');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-desc"
    >
      <div 
        className="relative bg-white rounded-2xl max-w-md w-full shadow-2xl border border-red-200/80 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-red-50/90 border-b border-red-100 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="delete-dialog-title" className="text-sm sm:text-base font-bold text-slate-900 truncate">
              {title}
            </h3>
            <p className="text-xs text-red-700 font-medium mt-0.5">
              Safe Archival Action
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3.5 text-xs text-slate-600" id="delete-dialog-desc">
          <p>
            Are you sure you want to archive this {itemType.toLowerCase()}?
          </p>

          {/* Item Name Callout */}
          <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 font-semibold text-slate-900 break-words">
            "{itemName}"
          </div>

          {/* Affected Children */}
          {affectedChildren && (
            <div className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{affectedChildren}</span>
            </div>
          )}

          {/* Student Historical Preservation Notice */}
          <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-relaxed">
            <strong className="text-slate-700 block font-semibold mb-0.5">Historical Record Protection:</strong>
            {studentImpact || 'Historical student enrollments, completion records, and evaluations are strictly preserved. The item will be excluded from normal listings and active student playback.'}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 font-medium">
              {error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmClick}
            disabled={isDeleting}
            className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-98 cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Archiving...</span>
              </>
            ) : (
              <span>{confirmButtonText}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

