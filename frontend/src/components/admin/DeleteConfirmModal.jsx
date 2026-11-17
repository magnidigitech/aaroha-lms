import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, X, ShieldAlert, Loader2, Archive, Trash2 } from 'lucide-react';

/**
 * Reusable Accessible Deletion & Archiving Confirmation Dialog
 * Clearly differentiates Safe Archival from Permanent Deletion.
 * Adheres to WCAG alertdialog accessibility guidelines (focus management, Escape to close).
 */
export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  actionType = 'archive',
  title,
  itemName = '',
  itemType = 'Item',
  affectedChildren = '',
  studentImpact = '',
  confirmButtonText
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const cancelButtonRef = useRef(null);
  const triggerElementRef = useRef(null);

  const isDelete = actionType === 'delete' || (title && title.toLowerCase().includes('delete'));
  const modalTitle = title || (isDelete ? `Permanently Delete ${itemType}` : `Archive ${itemType}`);
  const defaultButtonText = isDelete ? `Delete ${itemType}` : `Archive ${itemType}`;
  const actionLabel = confirmButtonText || defaultButtonText;

  useEffect(() => {
    if (isOpen) {
      triggerElementRef.current = document.activeElement;
      setError(null);
      setIsSubmitting(false);
      // Accessibility: Focus cancel button upon opening
      setTimeout(() => cancelButtonRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
        setTimeout(() => triggerElementRef.current?.focus?.(), 50);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleConfirmClick = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm();
      setIsSubmitting(false);
      onClose();
      setTimeout(() => triggerElementRef.current?.focus?.(), 50);
    } catch (err) {
      setIsSubmitting(false);
      setError(err.message || (isDelete ? 'Failed to delete item.' : 'Failed to archive item.'));
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
        className={`relative bg-white rounded-2xl max-w-md w-full shadow-2xl border overflow-hidden my-auto ${
          isDelete ? 'border-red-200/90' : 'border-amber-200/90'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-5 py-4 border-b flex items-start gap-3 ${
          isDelete ? 'bg-red-50/90 border-red-100' : 'bg-amber-50/90 border-amber-100'
        }`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${
            isDelete ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'
          }`}>
            {isDelete ? <Trash2 className="w-5 h-5" /> : <Archive className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="delete-dialog-title" className="text-sm sm:text-base font-bold text-slate-900 truncate">
              {modalTitle}
            </h3>
            <p className={`text-xs font-semibold mt-0.5 ${
              isDelete ? 'text-red-700' : 'text-amber-800'
            }`}>
              {isDelete ? 'Permanent Deletion (Irreversible)' : 'Safe Archival Action'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3.5 text-xs text-slate-600" id="delete-dialog-desc">
          <p>
            {isDelete
              ? `Are you sure you want to permanently remove this ${itemType.toLowerCase()}? This operation cannot be undone.`
              : `Are you sure you want to archive this ${itemType.toLowerCase()}? It will be safely hidden from public discovery while preserving all records.`
            }
          </p>

          {/* Item Name Callout */}
          <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 font-semibold text-slate-900 break-words">
            "{itemName}"
          </div>

          {/* Affected Children */}
          {affectedChildren && (
            <div className={`text-[11px] p-2.5 rounded-lg border flex items-start gap-2 ${
              isDelete ? 'text-red-800 bg-red-50 border-red-200' : 'text-amber-800 bg-amber-50 border-amber-200'
            }`}>
              <ShieldAlert className={`w-4 h-4 shrink-0 mt-0.5 ${isDelete ? 'text-red-600' : 'text-amber-600'}`} />
              <span>{affectedChildren}</span>
            </div>
          )}

          {/* Historical Record Protection Notice */}
          <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-relaxed">
            <strong className="text-slate-700 block font-semibold mb-0.5">
              {isDelete ? 'Eligibility Notice:' : 'Historical Record Protection:'}
            </strong>
            {studentImpact || (isDelete
              ? 'This course has zero active or historical dependencies and can be safely purged from the system.'
              : 'Historical student enrollments, completion records, and evaluations are strictly preserved. The item will be excluded from public listings while enrolled learners retain their access.'
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 font-medium break-words break-all max-w-full overflow-hidden leading-relaxed">
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
            disabled={isSubmitting}
            className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmClick}
            disabled={isSubmitting}
            className={`w-full sm:w-auto px-4 py-2 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-98 cursor-pointer disabled:opacity-50 ${
              isDelete ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{isDelete ? 'Deleting...' : 'Archiving...'}</span>
              </>
            ) : (
              <span>{actionLabel}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

