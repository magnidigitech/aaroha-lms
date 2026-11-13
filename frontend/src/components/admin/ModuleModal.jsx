import React, { useState, useEffect, useRef } from 'react';
import { X, Layers, AlertCircle, Loader2 } from 'lucide-react';

/**
 * Reusable Accessible Module Modal (Create & Edit)
 */
export default function ModuleModal({
  isOpen,
  onClose,
  onSave,
  initialData = null, // null for create mode, or existing module object for edit mode
  courseId
}) {
  const isEditMode = Boolean(initialData?.id);

  const [formData, setFormData] = useState({
    title: '',
    estimated_time: '5 hours to complete',
    description: ''
  });

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const titleInputRef = useRef(null);
  const triggerElementRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      triggerElementRef.current = document.activeElement;
      if (initialData) {
        setFormData({
          title: initialData.title || '',
          estimated_time: initialData.estimated_time || '5 hours to complete',
          description: initialData.description || ''
        });
      } else {
        setFormData({
          title: '',
          estimated_time: '5 hours to complete',
          description: ''
        });
      }
      setErrors({});
      setSaveError(null);
      setIsDirty(false);
      setIsSaving(false);
      setTimeout(() => titleInputRef.current?.focus(), 60);
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape' && !isSaving) {
        handleAttemptClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSaving, isDirty]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Module title is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAttemptClose = () => {
    if (isDirty && !window.confirm('You have unsaved changes. Discard changes?')) {
      return;
    }
    onClose();
    setTimeout(() => triggerElementRef.current?.focus?.(), 50);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || isSaving) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      await onSave({
        ...formData,
        title: formData.title.trim(),
        estimated_time: formData.estimated_time.trim(),
        description: formData.description.trim()
      });
      setIsSaving(false);
      setIsDirty(false);
      onClose();
      setTimeout(() => triggerElementRef.current?.focus?.(), 50);
    } catch (err) {
      setIsSaving(false);
      setSaveError(err.message || 'Failed to save module. Please retry.');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="module-modal-title"
    >
      <div 
        className="relative bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200/60 shadow-2xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 id="module-modal-title" className="text-sm sm:text-base font-bold text-slate-900">
                {isEditMode ? 'Edit Syllabus Module' : 'Add Syllabus Module'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isEditMode ? 'Update module title and pacing' : 'Structure a new curriculum section'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAttemptClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
          {saveError && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{saveError}</span>
            </div>
          )}

          <div>
            <label className="font-semibold text-slate-800 block mb-1">
              Module Title <span className="text-red-500">*</span>
            </label>
            <input
              ref={titleInputRef}
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="e.g. Module 1: Global Edge Routing & Zero-Trust Boundaries"
              className={`w-full p-2.5 bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all ${
                errors.title ? 'border-red-400 bg-red-50/20' : 'border-slate-200'
              }`}
            />
            {errors.title && <p className="text-red-600 text-[11px] mt-1">{errors.title}</p>}
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">
              Estimated Completion Pacing
            </label>
            <input
              type="text"
              value={formData.estimated_time}
              onChange={(e) => handleChange('estimated_time', e.target.value)}
              placeholder="e.g. 5 hours to complete"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">
              Module Scope & Objectives
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Brief overview of module architecture themes and defense goals..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleAttemptClose}
              disabled={isSaving}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50 text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-slate-900 hover:bg-indigo-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-98 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditMode ? 'Save Changes' : 'Create Module'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

