import React, { useState, useEffect, useRef } from 'react';
import { X, ListTodo, AlertCircle, Loader2 } from 'lucide-react';

/**
 * Reusable Accessible Assignment/Project Modal (Create & Edit)
 */
export default function AssignmentModal({
  isOpen,
  onClose,
  onSave,
  initialData = null, // null for create mode, or existing task object for edit mode
  moduleId,
  courseId
}) {
  const isEditMode = Boolean(initialData?.id);

  const [formData, setFormData] = useState({
    title: '',
    instructions: '',
    task_type: 'text_response',
    max_score: 100,
    passing_score: 75
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
          instructions: initialData.instructions || '',
          task_type: initialData.task_type || 'text_response',
          max_score: initialData.max_score || 100,
          passing_score: initialData.passing_score || 75
        });
      } else {
        setFormData({
          title: '',
          instructions: '',
          task_type: 'text_response',
          max_score: 100,
          passing_score: 75
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
      newErrors.title = 'Project title is required';
    }
    if (!formData.instructions.trim()) {
      newErrors.instructions = 'Project instructions and defense criteria required';
    }
    if (Number(formData.passing_score) > Number(formData.max_score)) {
      newErrors.passing_score = 'Passing score cannot exceed maximum score';
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
        instructions: formData.instructions.trim(),
        max_score: Number(formData.max_score) || 100,
        passing_score: Number(formData.passing_score) || 75
      });
      setIsSaving(false);
      setIsDirty(false);
      onClose();
      setTimeout(() => triggerElementRef.current?.focus?.(), 50);
    } catch (err) {
      setIsSaving(false);
      setSaveError(err.message || 'Failed to save assignment. Please retry.');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assignment-modal-title"
    >
      <div 
        className="relative bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200/60 shadow-2xs">
              <ListTodo className="w-4 h-4" />
            </div>
            <div>
              <h3 id="assignment-modal-title" className="text-sm sm:text-base font-bold text-slate-900">
                {isEditMode ? 'Edit Project Deliverable' : 'Add Project Deliverable'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isEditMode ? 'Update assignment instructions and grading rubric' : 'Add evaluated hands-on task to module'}
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
              Project Title <span className="text-red-500">*</span>
            </label>
            <input
              ref={titleInputRef}
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="e.g. Assignment 1: Ingress Gateway Resiliency & Failover Specification"
              className={`w-full p-2.5 bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all ${
                errors.title ? 'border-red-400 bg-red-50/20' : 'border-slate-200'
              }`}
            />
            {errors.title && <p className="text-red-600 text-[11px] mt-1">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-800 block mb-1">Submission Mode</label>
              <select
                value={formData.task_type}
                onChange={(e) => handleChange('task_type', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              >
                <option value="text_response">Technical Writeup</option>
                <option value="file_upload">Repository / File Link</option>
                <option value="quiz">Interactive Quiz</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-800 block mb-1">Max Score (pts)</label>
              <input
                type="number"
                min="1"
                max="1000"
                value={formData.max_score}
                onChange={(e) => handleChange('max_score', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-800 block mb-1">Passing Mark (pts)</label>
              <input
                type="number"
                min="1"
                max="1000"
                value={formData.passing_score}
                onChange={(e) => handleChange('passing_score', e.target.value)}
                className={`w-full p-2.5 bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all ${
                  errors.passing_score ? 'border-red-400 bg-red-50/20' : 'border-slate-200'
                }`}
              />
              {errors.passing_score && <p className="text-red-600 text-[10px] mt-1">{errors.passing_score}</p>}
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">
              Instructions & Evaluation Rubric <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={formData.instructions}
              onChange={(e) => handleChange('instructions', e.target.value)}
              placeholder="Provide comprehensive requirements, architectural specifications, and evaluation criteria..."
              className={`w-full p-2.5 bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all ${
                errors.instructions ? 'border-red-400 bg-red-50/20' : 'border-slate-200'
              }`}
            />
            {errors.instructions && <p className="text-red-600 text-[11px] mt-1">{errors.instructions}</p>}
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
                <span>{isEditMode ? 'Save Changes' : 'Create Assignment'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

