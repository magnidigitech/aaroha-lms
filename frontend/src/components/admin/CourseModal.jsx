import React, { useState, useEffect, useRef } from 'react';
import { 
  X, BookOpen, AlertCircle, Loader2, Award, FileText, 
  GraduationCap, Check, User, Image as ImageIcon, Sparkles, CheckCircle2
} from 'lucide-react';

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
  availableCategories = PRESET_DOMAINS
}) {
  const isEditMode = Boolean(initialData?.id);
  const [activeTab, setActiveTab] = useState(initialTab || 'syllabus');

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    about: '',
    prerequisites: 'Distributed Systems Foundations & Linux',
    category: 'Cloud Architecture',
    level: 'Advanced Level',
    duration: '8 Weeks',
    partner_type: 'Specialization',
    badge_text: 'New',
    thumbnail_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    skills: ['Cloud Architecture', 'Distributed Systems'],
    what_you_will_learn: ['Master enterprise infrastructure architectures', 'Complete evaluated deliverable projects'],
    instructor_name: 'Dr. Aris Thorne',
    instructor_title: 'Distinguished Systems Architect',
    instructor_department: 'Aaroha Institute of Technology',
    instructor_bio: 'Experienced faculty member and systems architect delivering industry-calibrated technical education.',
    instructor_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
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
      setActiveTab(initialTab || 'syllabus');
      if (initialData) {
        const cat = initialData.category || 'Cloud Architecture';
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
          prerequisites: initialData.prerequisites || 'Distributed Systems Foundations & Linux',
          category: cat,
          level: initialData.level || 'Advanced Level',
          duration: initialData.duration || '8 Weeks',
          partner_type: initialData.partner_type || 'Specialization',
          badge_text: initialData.badge_text || '',
          thumbnail_url: initialData.thumbnail_url || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
          skills: skillsArr,
          what_you_will_learn: learnArr,
          instructor_name: initialData.instructor_name || inst.name || 'Faculty Member',
          instructor_title: initialData.instructor_title || inst.title || 'Curriculum Director',
          instructor_department: initialData.instructor_department || inst.department || 'Aaroha Institute of Technology',
          instructor_bio: initialData.instructor_bio || inst.bio || 'Experienced faculty member and systems architect delivering industry-calibrated technical education.',
          instructor_avatar: initialData.instructor_avatar || inst.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
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
          about: '',
          prerequisites: 'Distributed Systems Foundations & Linux',
          category: 'Cloud Architecture',
          level: 'Advanced Level',
          duration: '8 Weeks',
          partner_type: 'Specialization',
          badge_text: 'New',
          thumbnail_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
          skills: ['Cloud Architecture', 'Distributed Systems'],
          what_you_will_learn: ['Master enterprise infrastructure architectures', 'Complete evaluated deliverable projects'],
          instructor_name: 'Dr. Aris Thorne',
          instructor_title: 'Distinguished Systems Architect',
          instructor_department: 'Aaroha Institute of Technology',
          instructor_bio: 'Experienced faculty member and systems architect delivering industry-calibrated technical education.',
          instructor_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
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
  }, [isOpen, initialData, initialTab]);

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
      prerequisites: formData.prerequisites.trim() || 'Distributed Systems Foundations & Linux',
      instructor_name: formData.instructor_name.trim() || 'Faculty Member',
      instructor_title: formData.instructor_title.trim() || 'Curriculum Director',
      instructor_department: formData.instructor_department.trim() || 'Aaroha Institute of Technology',
      instructor_bio: formData.instructor_bio.trim() || 'Experienced faculty member and systems architect delivering industry-calibrated technical education.',
      instructor_avatar: formData.instructor_avatar.trim() || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
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
        className="relative bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col"
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
                {isEditMode ? 'Edit Program Curriculum & Details' : 'Create Executive Program'}
              </h3>
              <p className="text-[11px] text-slate-500">
                Manage syllabus specifications, learning outcomes, prerequisites, and faculty profile
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

        {/* 4 Pillars Navigation Bar */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 px-4 sm:px-6 gap-2 sm:gap-4 overflow-x-auto shrink-0">
          {MODAL_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-1.5 sm:px-2 border-b-2 font-bold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                  isActive 
                    ? 'border-[#0056D2] text-[#0056D2]' 
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#0056D2]' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {saveError && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{saveError}</span>
            </div>
          )}

          {/* TAB 1: MODULES & SYLLABUS OVERVIEW */}
          {activeTab === 'syllabus' && (
            <div className="space-y-4 animate-in fade-in duration-150">
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
                <div className="flex gap-3 items-center">
                  <input
                    type="url"
                    value={formData.thumbnail_url}
                    onChange={(e) => handleChange('thumbnail_url', e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-xs"
                  />
                  {formData.thumbnail_url && (
                    <img 
                      src={formData.thumbnail_url} 
                      alt="Thumbnail preview" 
                      className="w-12 h-10 rounded-lg object-cover border border-slate-200 shrink-0 shadow-2xs"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
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

                {currentLearnList.length > 0 && (
                  <div className="mt-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 max-h-36 overflow-y-auto">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Live Preview ({currentLearnList.length} outcomes):</span>
                    {currentLearnList.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-slate-700 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  Skills Gained (comma-separated)
                </label>
                <input
                  type="text"
                  value={skillsInput}
                  onChange={(e) => {
                    setSkillsInput(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="Cloud Architecture, Distributed Systems, High Availability, Raft Consensus"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />

                {currentSkillsList.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {currentSkillsList.map((skill, idx) => (
                      <span 
                        key={idx}
                        className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/60 rounded-md text-[11px] font-semibold"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ABOUT & PREREQUISITES */}
          {activeTab === 'about' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  Short Catalog Abstract / Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Concise overview shown in course cards and search listings..."
                  className={`w-full p-2.5 bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${
                    errors.description ? 'border-red-400 bg-red-50/20' : 'border-slate-200'
                  }`}
                />
                {errors.description && <p className="text-red-600 text-[11px] mt-1">{errors.description}</p>}
              </div>

              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  In-Depth Curriculum About Section
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
                  placeholder="e.g. Distributed Systems Foundations, Linux CLI, Go or Java"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
                <p className="text-[10px] text-slate-400 mt-1">Displayed in the metadata grid on the public brochure page.</p>
              </div>
            </div>
          )}

          {/* TAB 4: FACULTY & INSTRUCTORS */}
          {activeTab === 'faculty' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                <img 
                  src={formData.instructor_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'} 
                  alt="Faculty Avatar"
                  className="w-14 h-14 rounded-full object-cover ring-2 ring-blue-500/30 shrink-0"
                  onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'; }}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 text-xs truncate">
                    {formData.instructor_name || 'Faculty Member'}
                  </div>
                  <div className="text-[#0056D2] font-semibold text-[11px] truncate">
                    {formData.instructor_title || 'Curriculum Director'}
                  </div>
                  <div className="text-slate-500 text-[10px] truncate">
                    {formData.instructor_department || 'Aaroha Institute of Technology'}
                  </div>
                </div>
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
                    placeholder="e.g. Dr. Aris Thorne"
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
                    placeholder="e.g. Distinguished Systems Architect"
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

              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  Instructor Profile Photo URL
                </label>
                <input
                  type="url"
                  value={formData.instructor_avatar}
                  onChange={(e) => handleChange('instructor_avatar', e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-xs"
                />
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
