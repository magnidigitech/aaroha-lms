import React, { useState, useEffect, useRef } from 'react';
import { X, BookOpen, AlertCircle, Loader2 } from 'lucide-react';

const PRESET_DOMAINS = [
  'Cloud Architecture',
  'Applied AI',
  'Cybersecurity',
  'Distributed Systems',
  'Data Engineering',
  'DevOps & SRE'
];

/**
 * Reusable Accessible Course Modal (Create & Edit)
 */
export default function CourseModal({
  isOpen,
  onClose,
  onSave,
  initialData = null, // null for create mode, or existing course object for edit mode
  availableCategories = PRESET_DOMAINS
}) {
  const isEditMode = Boolean(initialData?.id);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    category: 'Cloud Architecture',
    level: 'Advanced Level',
    duration: '8 Weeks',
    partner_type: 'Specialization',
    badge_text: 'New',
    thumbnail_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    skills: ['Cloud Architecture', 'Distributed Systems'],
    what_you_will_learn: ['Master enterprise infrastructure architectures', 'Complete evaluated deliverable projects'],
    is_published: true
  });

  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryVal, setCustomCategoryVal] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [learnInput, setLearnInput] = useState('');

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
        const cat = initialData.category || 'Cloud Architecture';
        const isCustom = !PRESET_DOMAINS.includes(cat);
        setIsCustomCategory(isCustom);
        setCustomCategoryVal(isCustom ? cat : '');

        const skillsArr = Array.isArray(initialData.skills) ? initialData.skills : [];
        const learnArr = Array.isArray(initialData.what_you_will_learn) ? initialData.what_you_will_learn : [];

        setFormData({
          title: initialData.title || '',
          slug: initialData.slug || '',
          description: initialData.description || '',
          category: cat,
          level: initialData.level || 'Advanced Level',
          duration: initialData.duration || '8 Weeks',
          partner_type: initialData.partner_type || 'Specialization',
          badge_text: initialData.badge_text || '',
          thumbnail_url: initialData.thumbnail_url || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
          skills: skillsArr,
          what_you_will_learn: learnArr,
          is_published: initialData.is_published !== undefined ? Boolean(initialData.is_published) : true
        });

        setSkillsInput(skillsArr.join(', '));
        setLearnInput(learnArr.join('\n'));
      } else {
        setIsCustomCategory(false);
        setCustomCategoryVal('');
        setFormData({
          title: '',
          slug: '',
          description: '',
          category: 'Cloud Architecture',
          level: 'Advanced Level',
          duration: '8 Weeks',
          partner_type: 'Specialization',
          badge_text: 'New',
          thumbnail_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
          skills: ['Cloud Architecture', 'Distributed Systems'],
          what_you_will_learn: ['Master enterprise infrastructure architectures', 'Complete evaluated deliverable projects'],
          is_published: true
        });
        setSkillsInput('Cloud Architecture, Distributed Systems');
        setLearnInput('Master enterprise infrastructure architectures\nComplete evaluated deliverable projects');
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
      newErrors.title = 'Program title is required';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Program description is required';
    }
    if (isCustomCategory && !customCategoryVal.trim()) {
      newErrors.category = 'Category name is required';
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

    const finalCategory = isCustomCategory 
      ? customCategoryVal.trim() 
      : formData.category;

    const parsedSkills = skillsInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const parsedLearn = learnInput
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    const payload = {
      ...formData,
      category: finalCategory || 'Cloud Architecture',
      slug: formData.slug.trim() || formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      skills: parsedSkills,
      what_you_will_learn: parsedLearn,
      is_published: formData.is_published ? 1 : 0
    };

    try {
      await onSave(payload);
      setIsSaving(false);
      setIsDirty(false);
      onClose();
      setTimeout(() => triggerElementRef.current?.focus?.(), 50);
    } catch (err) {
      setIsSaving(false);
      setSaveError(err.message || 'Failed to save course. Please retry.');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="course-modal-title"
    >
      <div 
        className="relative bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200/60 shadow-2xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 id="course-modal-title" className="text-sm sm:text-base font-bold text-slate-900">
                {isEditMode ? 'Edit Executive Program' : 'Create Executive Program'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isEditMode ? 'Update course specifications and metadata' : 'Author a new specialization program'}
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
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {saveError && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{saveError}</span>
            </div>
          )}

          <div>
            <label className="font-semibold text-slate-800 block mb-1">
              Program Title <span className="text-red-500">*</span>
            </label>
            <input
              ref={titleInputRef}
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="e.g. Distributed Cloud Architecture & High-Throughput Systems"
              className={`w-full p-2.5 bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${
                errors.title ? 'border-red-400 bg-red-50/20' : 'border-slate-200'
              }`}
            />
            {errors.title && <p className="text-red-600 text-[11px] mt-1">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-800 block mb-1">Technical Domain</label>
              {isCustomCategory ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={customCategoryVal}
                    onChange={(e) => {
                      setCustomCategoryVal(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="Custom domain..."
                    className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setIsCustomCategory(false)}
                    className="px-2.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[11px] font-semibold"
                  >
                    Preset
                  </button>
                </div>
              ) : (
                <select
                  value={formData.category}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setIsCustomCategory(true);
                      setCustomCategoryVal('');
                    } else {
                      handleChange('category', e.target.value);
                    }
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                >
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="__custom__">+ Custom Domain...</option>
                </select>
              )}
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">Target Seniority / Level</label>
              <select
                value={formData.level}
                onChange={(e) => handleChange('level', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              >
                <option value="Advanced Level">Advanced Level</option>
                <option value="Intermediate Level">Intermediate Level</option>
                <option value="Executive Specialization">Executive Specialization</option>
                <option value="Foundational Level">Foundational Level</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-800 block mb-1">Duration</label>
              <input
                type="text"
                value={formData.duration}
                onChange={(e) => handleChange('duration', e.target.value)}
                placeholder="e.g. 8 Weeks"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-800 block mb-1">Badge Text</label>
              <input
                type="text"
                value={formData.badge_text}
                onChange={(e) => handleChange('badge_text', e.target.value)}
                placeholder="e.g. Specialization, New, Accredited"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">Cover Image / Thumbnail URL</label>
            <input
              type="url"
              value={formData.thumbnail_url}
              onChange={(e) => handleChange('thumbnail_url', e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-xs"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">
              Program Description & Abstract <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Comprehensive architectural overview of the program..."
              className={`w-full p-2.5 bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${
                errors.description ? 'border-red-400 bg-red-50/20' : 'border-slate-200'
              }`}
            />
            {errors.description && <p className="text-red-600 text-[11px] mt-1">{errors.description}</p>}
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">Skills Gained (comma-separated)</label>
            <input
              type="text"
              value={skillsInput}
              onChange={(e) => {
                setSkillsInput(e.target.value);
                setIsDirty(true);
              }}
              placeholder="Cloud Architecture, Distributed Systems, High Availability"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">Learning Outcomes (one per line)</label>
            <textarea
              rows={3}
              value={learnInput}
              onChange={(e) => {
                setLearnInput(e.target.value);
                setIsDirty(true);
              }}
              placeholder="Master multi-region active-active distributed data stores&#10;Implement zero-trust mTLS service mesh routing"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.is_published}
                onChange={(e) => handleChange('is_published', e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
              />
              <span className="font-medium text-slate-700">
                Publish Program to Public Catalog (Visible to students)
              </span>
            </label>
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
              className="px-5 py-2 bg-slate-900 hover:bg-blue-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-98 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <span>{isEditMode ? 'Save Changes' : 'Create Program'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

