import React, { useState, useEffect, useRef } from 'react';
import { 
  X, BookOpen, AlertCircle, Loader2, Award, FileText, 
  GraduationCap, Check, User, Image as ImageIcon, Sparkles, 
  CheckCircle2, Upload, Trash2, Globe, Camera
} from 'lucide-react';
import { AVATAR_PRESETS } from '../../avatarPresets';

const PRESET_DOMAINS = [
  'Cloud Architecture',
  'Applied AI',
  'Cybersecurity',
  'Distributed Systems',
  'Data Engineering',
  'DevOps & SRE'
];

const MODAL_TABS = [
  { id: 'syllabus', label: 'Modules & Syllabus', icon: BookOpen },
  { id: 'outcomes', label: "What You'll Learn", icon: Award },
  { id: 'about', label: 'About & Prerequisites', icon: FileText },
  { id: 'faculty', label: 'Faculty & Instructors', icon: GraduationCap }
];

/**
 * Reusable Accessible Course Modal (Create & Edit)
 * Covers all 4 brochure pillars:
 * 1. Modules & Syllabus (program title, domain, metadata, publish)
 * 2. What You'll Learn (learning outcomes, skills acquired)
 * 3. About & Prerequisites (detailed abstract, prerequisites)
 * 4. Faculty & Instructors (director name, title, department, bio, avatar)
 */
export default function CourseModal({
  isOpen,
  onClose,
  onSave,
  initialData = null, // null for create mode, or existing course object for edit mode
  initialTab = 'syllabus',
  availableCategories = PRESET_DOMAINS,
  currentUser = null
}) {
  const isEditMode = Boolean(initialData?.id);
  const [activeTab, setActiveTab] = useState(initialTab || 'syllabus');

  // Sub-tabs for image uploads
  const [avatarUploadTab, setAvatarUploadTab] = useState('upload'); // 'upload' | 'presets' | 'url'
  const [thumbnailUploadTab, setThumbnailUploadTab] = useState('upload'); // 'upload' | 'url'
  const [uploadError, setUploadError] = useState('');

  const instructorFileInputRef = useRef(null);
  const thumbnailFileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    about: '',
    prerequisites: '',
    category: availableCategories[0] || 'Cloud Architecture',
    level: 'Advanced Level',
    duration: '',
    partner_type: 'Specialization',
    badge_text: '',
    thumbnail_url: '',
    skills: [],
    what_you_will_learn: [],
    instructor_name: '',
    instructor_title: '',
    instructor_department: 'Aaroha Institute of Technology',
    instructor_bio: '',
    instructor_avatar: '',
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

  // Client-side image processor using HTML5 canvas
  const processImageFile = (file, isSquare = true) => {
    return new Promise((resolve, reject) => {
      if (!file) return reject('No file selected.');
      if (!file.type.startsWith('image/')) return reject('Please select an image file (PNG, JPG, WEBP, or SVG).');
      if (file.size > 8 * 1024 * 1024) return reject('Image size exceeds 8MB.');

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            if (isSquare) {
              const size = 320;
              canvas.width = size;
              canvas.height = size;
              const ctx = canvas.getContext('2d');
              const minDim = Math.min(img.width, img.height);
              const sx = (img.width - minDim) / 2;
              const sy = (img.height - minDim) / 2;
              ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
              resolve(canvas.toDataURL('image/jpeg', 0.88));
            } else {
              const targetWidth = Math.min(img.width, 1200);
              const targetHeight = Math.round(targetWidth * (9 / 16));
              canvas.width = targetWidth;
              canvas.height = targetHeight;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
              resolve(canvas.toDataURL('image/jpeg', 0.88));
            }
          } catch (err) {
            resolve(e.target.result);
          }
        };
        img.onerror = () => reject('Failed to decode image file.');
        img.src = e.target.result;
      };
      reader.onerror = () => reject('Failed to read file from storage.');
      reader.readAsDataURL(file);
    });
  };

  useEffect(() => {
    if (isOpen) {
      triggerElementRef.current = document.activeElement;
      setActiveTab(initialTab || 'syllabus');
      setUploadError('');

      if (initialData) {
        const cat = initialData.category || availableCategories[0] || 'Cloud Architecture';
        const isCustom = !PRESET_DOMAINS.includes(cat);
        setIsCustomCategory(isCustom);
        setCustomCategoryVal(isCustom ? cat : '');

        const skillsArr = Array.isArray(initialData.skills) ? initialData.skills : [];
        const learnArr = Array.isArray(initialData.what_you_will_learn) ? initialData.what_you_will_learn : [];
        const inst = initialData.instructor || {};

        setFormData({
          title: initialData.title || '',
          slug: initialData.slug || '',
          description: initialData.description || '',
          about: initialData.about || initialData.description || '',
          prerequisites: initialData.prerequisites || '',
          category: cat,
          level: initialData.level || 'Advanced Level',
          duration: initialData.duration || '',
          partner_type: initialData.partner_type || 'Specialization',
          badge_text: initialData.badge_text || '',
          thumbnail_url: initialData.thumbnail_url || '',
          skills: skillsArr,
          what_you_will_learn: learnArr,
          instructor_name: initialData.instructor_name || inst.name || currentUser?.full_name || '',
          instructor_title: initialData.instructor_title || inst.title || currentUser?.title || '',
          instructor_department: initialData.instructor_department || inst.department || currentUser?.department || 'Aaroha Institute of Technology',
          instructor_bio: initialData.instructor_bio || inst.bio || currentUser?.bio || '',
          instructor_avatar: initialData.instructor_avatar || inst.avatar || currentUser?.avatar || '',
          is_published: initialData.is_published !== undefined ? Boolean(initialData.is_published) : true
        });

        setSkillsInput(skillsArr.join(', '));
        setLearnInput(learnArr.join('\n'));
      } else {
        // Dynamic fresh creation: defaults directly to active logged-in instructor
        setIsCustomCategory(false);
        setCustomCategoryVal('');
        setFormData({
          title: '',
          slug: '',
          description: '',
          about: '',
          prerequisites: '',
          category: availableCategories[0] || 'Cloud Architecture',
          level: 'Advanced Level',
          duration: '',
          partner_type: 'Specialization',
          badge_text: '',
          thumbnail_url: '',
          skills: [],
          what_you_will_learn: [],
          instructor_name: currentUser?.full_name || '',
          instructor_title: currentUser?.title || '',
          instructor_department: currentUser?.department || 'Aaroha Institute of Technology',
          instructor_bio: currentUser?.bio || '',
          instructor_avatar: currentUser?.avatar || '',
          is_published: true
        });
        setSkillsInput('');
        setLearnInput('');
      }
      setErrors({});
      setSaveError(null);
      setIsDirty(false);
      setIsSaving(false);
      setTimeout(() => titleInputRef.current?.focus(), 60);
    }
  }, [isOpen, initialData, initialTab, currentUser]);

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
      about: formData.about.trim() || formData.description.trim(),
      prerequisites: formData.prerequisites.trim(),
      instructor_name: formData.instructor_name.trim() || currentUser?.full_name || 'Faculty',
      instructor_title: formData.instructor_title.trim() || currentUser?.title || '',
      instructor_department: formData.instructor_department.trim() || currentUser?.department || 'Aaroha Institute of Technology',
      instructor_bio: formData.instructor_bio.trim() || currentUser?.bio || '',
      instructor_avatar: formData.instructor_avatar.trim() || currentUser?.avatar || '',
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

  const currentSkillsList = skillsInput.split(',').map(s => s.trim()).filter(Boolean);
  const currentLearnList = learnInput.split('\n').map(s => s.trim()).filter(Boolean);

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="course-modal-title"
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0056D2] flex items-center justify-center border border-blue-200/80 shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 id="course-modal-title" className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                {isEditMode ? 'Edit Program Curriculum & Details' : 'Author New Technical Program'}
              </h2>
              <p className="text-xs text-slate-500">
                Manage syllabus specifications, learning outcomes, prerequisites, and faculty profile
              </p>
            </div>
          </div>
          <button
            onClick={handleAttemptClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pillar Navigation Tabs */}
        <div className="border-b border-slate-200 bg-white px-4 sm:px-6 flex gap-1 sm:gap-2 overflow-x-auto scrollbar-none">
          {MODAL_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={
                  'py-3.5 px-3 sm:px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ' +
                  (isActive 
                    ? 'border-[#0056D2] text-[#0056D2] bg-blue-50/40' 
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50')
                }
              >
                <Icon className={'w-4 h-4 ' + (isActive ? 'text-[#0056D2]' : 'text-slate-400')} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {saveError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          {uploadError && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* TAB 1: MODULES & SYLLABUS */}
          {activeTab === 'syllabus' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  Program Title <span className="text-rose-500">*</span>
                </label>
                <input
                  ref={titleInputRef}
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="e.g. Distributed Cloud Architecture & High-Throughput Systems"
                  className={
                    'w-full p-2.5 bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ' +
                    (errors.title ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200')
                  }
                />
                {errors.title && <p className="text-rose-600 text-[11px] mt-1">{errors.title}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">URL Slug</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => handleChange('slug', e.target.value)}
                    placeholder="e.g. distributed-cloud-architecture"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Leave empty to auto-generate from title.</p>
                </div>

                <div>
                  <label className="font-semibold text-slate-800 block mb-1">Credential Badge / Category</label>
                  <select
                    value={formData.partner_type}
                    onChange={(e) => handleChange('partner_type', e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  >
                    <option value="Specialization">Specialization</option>
                    <option value="Degree Track">Degree Track</option>
                    <option value="Master's Program">Master's Program</option>
                    <option value="Executive Certificate">Executive Certificate</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">Curriculum Domain</label>
                  {isCustomCategory ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customCategoryVal}
                        onChange={(e) => {
                          setCustomCategoryVal(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="e.g. Quantum Infrastructure"
                        className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
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

              {/* Cover Thumbnail with Custom Upload Option */}
              <div className="space-y-2">
                <label className="font-semibold text-slate-800 block text-xs">
                  Program Cover Thumbnail
                </label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setThumbnailUploadTab('upload')}
                      className={
                        'flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ' +
                        (thumbnailUploadTab === 'upload' ? 'bg-white text-[#0056D2] shadow-xs' : 'text-slate-600 hover:text-slate-900')
                      }
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Image</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setThumbnailUploadTab('url')}
                      className={
                        'flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ' +
                        (thumbnailUploadTab === 'url' ? 'bg-white text-[#0056D2] shadow-xs' : 'text-slate-600 hover:text-slate-900')
                      }
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Web URL</span>
                    </button>
                  </div>

                  {thumbnailUploadTab === 'upload' ? (
                    <div className="space-y-2">
                      <input
                        type="file"
                        ref={thumbnailFileInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              setUploadError('');
                              const dataUri = await processImageFile(file, false);
                              handleChange('thumbnail_url', dataUri);
                            } catch (err) {
                              setUploadError(String(err));
                            }
                          }
                        }}
                      />
                      <div
                        onClick={() => thumbnailFileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const file = e.dataTransfer.files?.[0];
                          if (file) {
                            try {
                              setUploadError('');
                              const dataUri = await processImageFile(file, false);
                              handleChange('thumbnail_url', dataUri);
                            } catch (err) {
                              setUploadError(String(err));
                            }
                          }
                        }}
                        className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white hover:bg-blue-50/40 rounded-xl p-4 text-center cursor-pointer transition-colors space-y-1.5 group"
                      >
                        <div className="w-9 h-9 rounded-full bg-blue-50 group-hover:bg-blue-100 text-[#0056D2] mx-auto flex items-center justify-center transition-colors">
                          <Upload className="w-4 h-4" />
                        </div>
                        <div className="text-xs font-bold text-slate-800">
                          Click to upload 16:9 cover image, or drag & drop
                        </div>
                        <p className="text-[11px] text-slate-500">
                          PNG, JPG, WEBP (Up to 8MB · Scaled for responsive display)
                        </p>
                      </div>
                    </div>
                  ) : (
                    <input
                      type="url"
                      value={formData.thumbnail_url}
                      onChange={(e) => handleChange('thumbnail_url', e.target.value)}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-xs"
                    />
                  )}

                  {formData.thumbnail_url && (
                    <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-900 group">
                      <img
                        src={formData.thumbnail_url}
                        alt="Thumbnail preview"
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <button
                        type="button"
                        onClick={() => handleChange('thumbnail_url', '')}
                        className="absolute top-2 right-2 bg-slate-900/80 hover:bg-rose-600 text-white p-1.5 rounded-lg backdrop-blur-sm transition-colors cursor-pointer"
                        title="Remove cover image"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
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
            </div>
          )}

          {/* TAB 2: WHAT YOU'LL LEARN */}
          {activeTab === 'outcomes' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3 bg-blue-50/70 border border-blue-200/70 rounded-xl">
                <div className="flex items-center gap-2 text-blue-900 font-bold mb-1">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Public Outcomes & Acquired Competencies</span>
                </div>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  These learning outcomes and skill tags appear directly under the "What You'll Learn" tab on the course brochure.
                </p>
              </div>

              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  Learning Outcomes (one per line)
                </label>
                <textarea
                  rows={4}
                  value={learnInput}
                  onChange={(e) => {
                    setLearnInput(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="Architect fault-tolerant systems using consensus protocols&#10;Deploy zero-trust service communication with mTLS&#10;Benchmark and tune storage engines under extreme concurrent load"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-mono text-[11px]"
                />
                <p className="text-[10px] text-slate-400 mt-1">Each line is formatted as an executive outcome with a checkmark.</p>
              </div>

              {currentLearnList.length > 0 && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Preview ({currentLearnList.length} outcomes):
                  </span>
                  {currentLearnList.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  Skills & Core Invariants (comma-separated)
                </label>
                <input
                  type="text"
                  value={skillsInput}
                  onChange={(e) => {
                    setSkillsInput(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="e.g. Distributed Consensus, Raft Protocol, Zero-Trust Architecture, mTLS"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              {currentSkillsList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {currentSkillsList.map((skill, idx) => (
                    <span 
                      key={idx}
                      className="px-2.5 py-1 bg-blue-50 text-[#0056D2] font-semibold text-[11px] rounded-md border border-blue-200/70"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ABOUT & PREREQUISITES */}
          {activeTab === 'about' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  Course Short Summary / Brochure Pitch <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Concise 1-2 sentence overview shown on catalog cards and brochure headers..."
                  className={
                    'w-full p-2.5 bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ' +
                    (errors.description ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200')
                  }
                />
                {errors.description && <p className="text-rose-600 text-[11px] mt-1">{errors.description}</p>}
              </div>

              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  Full Abstract & Technical Scope
                </label>
                <textarea
                  rows={4}
                  value={formData.about}
                  onChange={(e) => handleChange('about', e.target.value)}
                  placeholder="Detailed background, industry context, methodology, and scope of this executive specialization..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
                <p className="text-[10px] text-slate-400 mt-1">If empty, defaults automatically to the short description.</p>
              </div>

              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  Prerequisites & Recommended Background
                </label>
                <input
                  type="text"
                  value={formData.prerequisites}
                  onChange={(e) => handleChange('prerequisites', e.target.value)}
                  placeholder="e.g. Distributed Systems Foundations, Linux CLI, Go or Python"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
                <p className="text-[10px] text-slate-400 mt-1">Displayed in the metadata grid on the public brochure page.</p>
              </div>
            </div>
          )}

          {/* TAB 4: FACULTY & INSTRUCTORS */}
          {activeTab === 'faculty' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Dynamic Live Faculty Preview Card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3.5">
                <div className="relative shrink-0">
                  {formData.instructor_avatar ? (
                    <img 
                      src={formData.instructor_avatar} 
                      alt="Faculty Avatar"
                      className="w-14 h-14 rounded-full object-cover ring-2 ring-blue-500/30"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-blue-100 text-[#0056D2] flex items-center justify-center font-bold text-lg border border-blue-200">
                      {(formData.instructor_name || currentUser?.full_name || 'F').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                    {formData.instructor_name || currentUser?.full_name || 'Faculty'}
                  </div>
                  {(formData.instructor_title || currentUser?.title) ? (
                    <div className="text-[#0056D2] font-semibold text-[11px] truncate mt-0.5">
                      {formData.instructor_title || currentUser?.title}
                    </div>
                  ) : null}
                  <div className="text-slate-500 text-[10px] truncate">
                    {formData.instructor_department || currentUser?.department || 'Aaroha Institute of Technology'}
                  </div>
                </div>

                {currentUser && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        instructor_name: currentUser.full_name || '',
                        instructor_title: currentUser.title || '',
                        instructor_department: currentUser.department || 'Aaroha Institute of Technology',
                        instructor_avatar: currentUser.avatar || '',
                        instructor_bio: currentUser.bio || ''
                      }));
                      setIsDirty(true);
                    }}
                    className="shrink-0 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#0056D2] rounded-xl text-[11px] font-bold border border-blue-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Fill all faculty fields with your logged-in profile"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Apply My Profile</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">
                    Faculty / Instructor Name
                  </label>
                  <input
                    type="text"
                    value={formData.instructor_name}
                    onChange={(e) => handleChange('instructor_name', e.target.value)}
                    placeholder={currentUser?.full_name || 'e.g. Dr. Jane Smith'}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-800 block mb-1">
                    Academic / Professional Title
                  </label>
                  <input
                    type="text"
                    value={formData.instructor_title}
                    onChange={(e) => handleChange('instructor_title', e.target.value)}
                    placeholder={currentUser?.title || 'e.g. Principal Systems Architect'}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  Department / Institution
                </label>
                <input
                  type="text"
                  value={formData.instructor_department}
                  onChange={(e) => handleChange('instructor_department', e.target.value)}
                  placeholder="e.g. Aaroha Institute of Technology & Systems Research"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              {/* Custom Image Upload Option for Instructor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-800 text-xs">
                    Instructor Profile Photo
                  </label>
                  {currentUser?.avatar && formData.instructor_avatar !== currentUser.avatar && (
                    <button
                      type="button"
                      onClick={() => handleChange('instructor_avatar', currentUser.avatar)}
                      className="text-[11px] font-bold text-[#0056D2] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <User className="w-3 h-3" />
                      <span>Use My Profile Photo</span>
                    </button>
                  )}
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  {/* Mode selector buttons */}
                  <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setAvatarUploadTab('upload')}
                      className={
                        'flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ' +
                        (avatarUploadTab === 'upload' ? 'bg-white text-[#0056D2] shadow-xs' : 'text-slate-600 hover:text-slate-900')
                      }
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload from Device</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvatarUploadTab('presets')}
                      className={
                        'flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ' +
                        (avatarUploadTab === 'presets' ? 'bg-white text-[#0056D2] shadow-xs' : 'text-slate-600 hover:text-slate-900')
                      }
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>3D Animated Avatars</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvatarUploadTab('url')}
                      className={
                        'flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ' +
                        (avatarUploadTab === 'url' ? 'bg-white text-[#0056D2] shadow-xs' : 'text-slate-600 hover:text-slate-900')
                      }
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Web URL</span>
                    </button>
                  </div>

                  {/* Mode 1: Device File Upload */}
                  {avatarUploadTab === 'upload' && (
                    <div className="space-y-2">
                      <input
                        type="file"
                        ref={instructorFileInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              setUploadError('');
                              const dataUri = await processImageFile(file, true);
                              handleChange('instructor_avatar', dataUri);
                            } catch (err) {
                              setUploadError(String(err));
                            }
                          }
                        }}
                      />
                      <div
                        onClick={() => instructorFileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const file = e.dataTransfer.files?.[0];
                          if (file) {
                            try {
                              setUploadError('');
                              const dataUri = await processImageFile(file, true);
                              handleChange('instructor_avatar', dataUri);
                            } catch (err) {
                              setUploadError(String(err));
                            }
                          }
                        }}
                        className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white hover:bg-blue-50/40 rounded-xl p-4 text-center cursor-pointer transition-colors space-y-1.5 group"
                      >
                        <div className="w-9 h-9 rounded-full bg-blue-50 group-hover:bg-blue-100 text-[#0056D2] mx-auto flex items-center justify-center transition-colors">
                          <Upload className="w-4 h-4" />
                        </div>
                        <div className="text-xs font-bold text-slate-800">
                          Click to upload or drag & drop photo
                        </div>
                        <p className="text-[11px] text-slate-500">
                          PNG, JPG, WEBP, or SVG (Up to 8MB · Automatically cropped to square)
                        </p>
                      </div>

                      {formData.instructor_avatar && (
                        <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={formData.instructor_avatar}
                              alt="Current avatar"
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                            <span className="text-xs font-medium text-slate-700 truncate">
                              Photo applied to instructor profile
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleChange('instructor_avatar', '')}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                            title="Remove photo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mode 2: 3D Animated Avatars */}
                  {avatarUploadTab === 'presets' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-48 overflow-y-auto p-1.5 bg-white rounded-xl border border-slate-200">
                        {AVATAR_PRESETS.map((preset) => {
                          const isSelected = formData.instructor_avatar === preset.url || formData.instructor_avatar === preset.fallbackUrl;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => handleChange('instructor_avatar', preset.url)}
                              className={
                                'relative rounded-xl p-1 transition-all cursor-pointer group flex flex-col items-center ' +
                                (isSelected 
                                  ? 'ring-2 ring-[#0056D2] bg-blue-50 shadow-xs' 
                                  : 'hover:bg-slate-100 hover:scale-105')
                              }
                              title={preset.name}
                            >
                              <img
                                src={preset.url}
                                alt={preset.name}
                                onError={(e) => { e.currentTarget.src = preset.fallbackUrl; }}
                                className="w-10 h-10 object-contain rounded-lg"
                              />
                              <span className="text-[9px] font-bold text-slate-600 truncate mt-0.5">
                                {preset.name}
                              </span>
                              {isSelected && (
                                <div className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-[#0056D2] text-white rounded-full flex items-center justify-center">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Mode 3: Direct Web URL */}
                  {avatarUploadTab === 'url' && (
                    <div className="space-y-1">
                      <input
                        type="url"
                        value={formData.instructor_avatar}
                        onChange={(e) => handleChange('instructor_avatar', e.target.value)}
                        placeholder="https://images.unsplash.com/photo-..."
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-xs"
                      />
                      <p className="text-[10px] text-slate-400">
                        Direct public HTTPS link to instructor profile photograph or avatar.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  Faculty Biography & Credentials
                </label>
                <textarea
                  rows={3}
                  value={formData.instructor_bio}
                  onChange={(e) => handleChange('instructor_bio', e.target.value)}
                  placeholder="Academic tenure, research background, industrial engineering leadership..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
              <span className="font-medium">Active Section:</span>
              <span className="font-bold text-slate-800">
                {MODAL_TABS.find(t => t.id === activeTab)?.label}
              </span>
            </div>

            <div className="flex items-center gap-2 justify-end">
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
                    <span>Saving Specifications...</span>
                  </>
                ) : (
                  <span>{isEditMode ? 'Save Specifications' : 'Create Program'}</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
