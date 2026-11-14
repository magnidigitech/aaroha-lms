import React, { useState, useEffect, useRef } from 'react';
import { 
  X, GraduationCap, Award, BookOpen, AlertCircle, 
  Check, Save, Upload, Trash2, Globe, Sparkles, User,
  Layers, CheckCircle2, FileText
} from 'lucide-react';
import { AVATAR_PRESETS, DEFAULT_AVATAR } from '../../avatarPresets';

const DEGREE_TYPE_OPTIONS = [
  'Master of Science (M.S. Equivalent)',
  'Master of Engineering (M.Eng. Equivalent)',
  'Post-Graduate Diploma (P.G. Dip)',
  'Executive Master of Technology (M.Tech)',
  'Professional Systems Fellowship'
];

const LEVEL_OPTIONS = [
  'Graduate / Principal Level',
  'Graduate / Staff ML Engineer',
  'Advanced Specialist',
  'Executive Directorate Level',
  'Senior Fellow Benchmark'
];

export default function DegreeModal({
  isOpen,
  onClose,
  initialData = null,
  courses = [],
  currentUser = null,
  onSave
}) {
  const isEditMode = Boolean(initialData?.id);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [degreeType, setDegreeType] = useState(DEGREE_TYPE_OPTIONS[0]);
  const [customDegreeType, setCustomDegreeType] = useState('');
  const [duration, setDuration] = useState('12 Months · 36 ECTS Credits');
  const [level, setLevel] = useState(LEVEL_OPTIONS[0]);
  const [accreditation, setAccreditation] = useState('Aaroha Institute of Technology & Systems Directorate');
  const [courseId, setCourseId] = useState('');
  
  const [facultyName, setFacultyName] = useState('');
  const [facultyTitle, setFacultyTitle] = useState('');
  const [facultyAvatar, setFacultyAvatar] = useState('/avatars/3d/memo_1.png');
  const [avatarUploadTab, setAvatarUploadTab] = useState('presets'); // 'presets' | 'upload' | 'url'
  const [avatarFilter, setAvatarFilter] = useState('all');

  const [description, setDescription] = useState('');
  const [modulesCount, setModulesCount] = useState('3 In-Depth Specialization Semesters');
  const [evaluatedProjectsCount, setEvaluatedProjectsCount] = useState('3 Production RFC Architectural Defenses');
  const [credentialAwarded, setCredentialAwarded] = useState('Official Master of Science Degree & Accredited Parchment');
  const [skillsInput, setSkillsInput] = useState('');
  const [highlightsInput, setHighlightsInput] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setIsSaving(false);

      if (initialData) {
        setTitle(initialData.title || '');
        setSlug(initialData.slug || '');
        const dType = initialData.degreeType || initialData.degree_type || DEGREE_TYPE_OPTIONS[0];
        if (DEGREE_TYPE_OPTIONS.includes(dType)) {
          setDegreeType(dType);
          setCustomDegreeType('');
        } else {
          setDegreeType('Other');
          setCustomDegreeType(dType);
        }
        setDuration(initialData.duration || '12 Months · 36 ECTS Credits');
        setLevel(initialData.level || LEVEL_OPTIONS[0]);
        setAccreditation(initialData.accreditation || 'Aaroha Institute of Technology & Systems Directorate');
        setCourseId(initialData.courseId || initialData.course_id || (courses[0]?.id || ''));

        const fac = initialData.faculty || {};
        setFacultyName(initialData.faculty_name || fac.name || currentUser?.full_name || 'Faculty Member');
        setFacultyTitle(initialData.faculty_title || fac.title || currentUser?.title || 'Academic Faculty');
        setFacultyAvatar(initialData.faculty_avatar || fac.avatar || currentUser?.avatar || '/avatars/3d/memo_1.png');

        setDescription(initialData.description || '');
        setModulesCount(initialData.modulesCount || initialData.modules_count || '3 Semesters');
        setEvaluatedProjectsCount(initialData.evaluatedProjectsCount || initialData.evaluated_projects_count || '3 Capstone Defenses');
        setCredentialAwarded(initialData.credentialAwarded || initialData.credential_awarded || 'Official Master of Science Degree');

        const skillsArr = Array.isArray(initialData.skills) ? initialData.skills : [];
        setSkillsInput(skillsArr.join(', '));

        const highArr = Array.isArray(initialData.highlights) ? initialData.highlights : [];
        setHighlightsInput(highArr.join('\n'));
        setIsPublished(initialData.is_published !== undefined ? Boolean(initialData.is_published) : true);
      } else {
        // Fresh degree creation
        setTitle('');
        setSlug('');
        setDegreeType(DEGREE_TYPE_OPTIONS[0]);
        setCustomDegreeType('');
        setDuration('12 Months · 36 ECTS Credits');
        setLevel(LEVEL_OPTIONS[0]);
        setAccreditation('Aaroha Institute of Technology & Systems Directorate');
        setCourseId(courses[0]?.id || '');

        setFacultyName(currentUser?.full_name || 'Faculty Member');
        setFacultyTitle(currentUser?.title || 'Academic Faculty');
        setFacultyAvatar(currentUser?.avatar || '/avatars/3d/memo_1.png');

        setDescription('');
        setModulesCount('3 In-Depth Specialization Semesters');
        setEvaluatedProjectsCount('3 Production RFC Architectural Defenses');
        setCredentialAwarded('Official Master of Science Degree & Accredited Parchment');
        setSkillsInput('Raft Consensus, Multi-Region Ingress, LSM Storage, Zero-Trust mTLS');
        setHighlightsInput('100% online with asynchronous benchmarks\nEvaluated capstone defense by systems faculty\nVerifiable cryptographic parchment');
        setIsPublished(true);
      }
    }
  }, [isOpen, initialData, currentUser, courses]);

  if (!isOpen) return null;

  // Process uploaded image with HTML5 canvas
  const processImageFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, WEBP, or SVG).');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('Image size exceeds 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const size = 256;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
          setFacultyAvatar(canvas.toDataURL('image/jpeg', 0.88));
        } catch (err) {
          setFacultyAvatar(e.target.result);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Program Title is required.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    const resolvedDegreeType = degreeType === 'Other' ? (customDegreeType.trim() || 'Accredited Degree') : degreeType;

    const parsedSkills = skillsInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const parsedHighlights = highlightsInput
      .split('\n')
      .map(h => h.trim())
      .filter(Boolean);

    const payload = {
      title: title.trim(),
      slug: slug.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      degree_type: resolvedDegreeType,
      degreeType: resolvedDegreeType,
      duration: duration.trim(),
      level: level.trim(),
      accreditation: accreditation.trim(),
      course_id: courseId ? parseInt(courseId, 10) : null,
      courseId: courseId ? parseInt(courseId, 10) : null,
      faculty_name: facultyName.trim(),
      faculty_title: facultyTitle.trim(),
      faculty_avatar: facultyAvatar.trim(),
      faculty: {
        name: facultyName.trim(),
        title: facultyTitle.trim(),
        avatar: facultyAvatar.trim()
      },
      description: description.trim(),
      modules_count: modulesCount.trim(),
      modulesCount: modulesCount.trim(),
      evaluated_projects_count: evaluatedProjectsCount.trim(),
      evaluatedProjectsCount: evaluatedProjectsCount.trim(),
      credential_awarded: credentialAwarded.trim(),
      credentialAwarded: credentialAwarded.trim(),
      skills: parsedSkills,
      highlights: parsedHighlights,
      is_published: isPublished ? 1 : 0
    };

    try {
      if (onSave) {
        await onSave(payload);
      }
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save degree program.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredPresets = AVATAR_PRESETS.filter(p => {
    if (avatarFilter === 'all') return true;
    return p.category === avatarFilter || p.gender === avatarFilter;
  });

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="degree-modal-title"
    >
      <div className="relative bg-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-200 my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-[#0B192C] text-white p-5 sm:p-6 border-b border-[#1b3d63] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                <span>Faculty Academic Authority</span>
                <span className="w-1 h-1 rounded-full bg-blue-400" />
                <span>Accredited Programs</span>
              </div>
              <h2 id="degree-modal-title" className="text-lg sm:text-xl font-black text-white tracking-tight">
                {isEditMode ? 'Edit Accredited Degree Program' : 'Author New Accredited Degree Program'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Close Dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[78dvh] overflow-y-auto text-xs thin-scrollbar">
          
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Program Title & Degree Classification */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5 pb-1 border-b border-slate-100">
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              <span>Program Classification & Academic Title</span>
            </h4>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Program Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Master of Science in Distributed Cloud Architecture"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Degree Classification Type
                </label>
                <select
                  value={degreeType}
                  onChange={(e) => setDegreeType(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium"
                >
                  {DEGREE_TYPE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                  <option value="Other">Other / Custom Designation</option>
                </select>
                {degreeType === 'Other' && (
                  <input
                    type="text"
                    required
                    value={customDegreeType}
                    onChange={(e) => setCustomDegreeType(e.target.value)}
                    placeholder="Enter custom degree type"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl mt-1.5 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium"
                  />
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Target Academic Level
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium"
                >
                  {LEVEL_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Duration & ECTS Credits
                </label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g. 12 Months · 36 ECTS Credits"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Accrediting Directorate / Body
                </label>
                <input
                  type="text"
                  value={accreditation}
                  onChange={(e) => setAccreditation(e.target.value)}
                  placeholder="e.g. Aaroha Institute of Technology & Systems Directorate"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium"
                />
              </div>
            </div>

            {/* Linked LMS Course */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Linked Curricular Program (LMS Course)
              </label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium"
              >
                <option value="">-- No Direct Course Link --</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    Course #{c.id}: {c.title} ({c.category || 'General'})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Connecting a course allows students to seamlessly transition from degree catalog to coursework.
              </p>
            </div>
          </div>

          {/* Section 2: Faculty Lead */}
          <div className="space-y-3.5 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>Program Faculty Director & Chair</span>
              </h4>

              {currentUser && (
                <button
                  type="button"
                  onClick={() => {
                    setFacultyName(currentUser.full_name || '');
                    setFacultyTitle(currentUser.title || 'Academic Faculty');
                    setFacultyAvatar(currentUser.avatar || '/avatars/3d/memo_1.png');
                  }}
                  className="text-[11px] font-bold text-[#0A7CB3] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <User className="w-3 h-3" />
                  <span>Apply My Profile</span>
                </button>
              )}
            </div>

            {/* Live Faculty Preview Mini-card */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
              <img
                src={facultyAvatar || '/avatars/3d/memo_1.png'}
                alt={facultyName}
                onError={(e) => { e.target.src = '/avatars/3d/memo_1.png'; }}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-500/30 shrink-0 bg-white"
              />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-900 truncate">
                  {facultyName || 'Faculty Member'}
                </div>
                <div className="text-[11px] text-blue-600 font-semibold truncate">
                  {facultyTitle || 'Academic Faculty'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Faculty Lead Name
                </label>
                <input
                  type="text"
                  value={facultyName}
                  onChange={(e) => setFacultyName(e.target.value)}
                  placeholder="e.g. Dr. Maya Lin"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Academic / Professional Title
                </label>
                <input
                  type="text"
                  value={facultyTitle}
                  onChange={(e) => setFacultyTitle(e.target.value)}
                  placeholder="e.g. Chair of Distributed Systems"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium"
                />
              </div>
            </div>

            {/* Avatar Selector for Faculty Lead */}
            <div className="space-y-2">
              <label className="block font-bold text-slate-700">
                Faculty Avatar
              </label>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl font-semibold">
                  <button
                    type="button"
                    onClick={() => setAvatarUploadTab('presets')}
                    className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      avatarUploadTab === 'presets' ? 'bg-white text-[#0A7CB3] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>3D Character Presets</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvatarUploadTab('upload')}
                    className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      avatarUploadTab === 'upload' ? 'bg-white text-[#0A7CB3] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload Image</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvatarUploadTab('url')}
                    className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      avatarUploadTab === 'url' ? 'bg-white text-[#0A7CB3] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Globe className="w-3 h-3" />
                    <span>Web URL</span>
                  </button>
                </div>

                {avatarUploadTab === 'presets' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">Pick character avatar:</span>
                      <div className="inline-flex bg-slate-200/60 p-0.5 rounded-lg text-[10px]">
                        <button
                          type="button"
                          onClick={() => setAvatarFilter('all')}
                          className={`px-1.5 py-0.5 rounded font-semibold cursor-pointer ${avatarFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
                        >
                          All ({AVATAR_PRESETS.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setAvatarFilter('male')}
                          className={`px-1.5 py-0.5 rounded font-semibold cursor-pointer ${avatarFilter === 'male' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500'}`}
                        >
                          Male (12)
                        </button>
                        <button
                          type="button"
                          onClick={() => setAvatarFilter('female')}
                          className={`px-1.5 py-0.5 rounded font-semibold cursor-pointer ${avatarFilter === 'female' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-500'}`}
                        >
                          Female (18)
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-40 overflow-y-auto p-1.5 bg-white rounded-xl border border-slate-200">
                      {filteredPresets.map((preset) => {
                        const isSelected = facultyAvatar === preset.url || facultyAvatar === preset.fallbackUrl;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setFacultyAvatar(preset.url)}
                            className={`relative rounded-xl p-1 flex flex-col items-center transition-all cursor-pointer ${
                              isSelected ? 'ring-2 ring-[#0A7CB3] bg-blue-50 shadow-2xs' : 'hover:bg-slate-100 hover:scale-105'
                            }`}
                            title={`${preset.name} (${preset.gender})`}
                          >
                            <img
                              src={preset.url}
                              alt={preset.name}
                              onError={(e) => { e.currentTarget.src = preset.fallbackUrl; }}
                              className="w-9 h-9 object-contain"
                            />
                            <span className="text-[9px] font-bold text-slate-700 truncate mt-0.5">
                              {preset.name}
                            </span>
                            {isSelected && (
                              <div className="absolute top-0.5 right-0.5 w-3 h-3 bg-[#0A7CB3] text-white rounded-full flex items-center justify-center shadow-xs">
                                <Check className="w-2 h-2 stroke-[3]" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {avatarUploadTab === 'upload' && (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) processImageFile(file);
                      }}
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white rounded-xl p-3 text-center cursor-pointer space-y-1"
                    >
                      <Upload className="w-4 h-4 text-blue-600 mx-auto" />
                      <div className="font-bold text-slate-800 text-[11px]">
                        Click to upload photo from your device
                      </div>
                      <p className="text-[10px] text-slate-400">
                        PNG, JPG, WEBP, or SVG up to 8MB
                      </p>
                    </div>
                  </div>
                )}

                {avatarUploadTab === 'url' && (
                  <div>
                    <input
                      type="url"
                      value={facultyAvatar}
                      onChange={(e) => setFacultyAvatar(e.target.value)}
                      placeholder="https://example.com/faculty-photo.jpg"
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Curriculum Abstract & Deliverables */}
          <div className="space-y-3.5 pt-3 border-t border-slate-200">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5 pb-1 border-b border-slate-100">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Program Syllabus, Metrics & Benchmarks</span>
            </h4>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Curriculum Abstract & Description *
              </label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Comprehensive technical overview of the degree program curriculum..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Semesters / Curricular Modules
                </label>
                <input
                  type="text"
                  value={modulesCount}
                  onChange={(e) => setModulesCount(e.target.value)}
                  placeholder="e.g. 3 In-Depth Specialization Semesters"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Evaluated Capstone Deliverables
                </label>
                <input
                  type="text"
                  value={evaluatedProjectsCount}
                  onChange={(e) => setEvaluatedProjectsCount(e.target.value)}
                  placeholder="e.g. 3 Production RFC Architectural Defenses"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Credential Awarded Upon Completion
              </label>
              <input
                type="text"
                value={credentialAwarded}
                onChange={(e) => setCredentialAwarded(e.target.value)}
                placeholder="e.g. Official Master of Science Degree & Accredited Parchment"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Core Competencies & Technologies (Comma-separated)
              </label>
              <input
                type="text"
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                placeholder="Raft Consensus Protocol, BGP Anycast, LSM Storage, Zero-Trust"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Accreditation Highlights (One per line)
              </label>
              <textarea
                rows={3}
                value={highlightsInput}
                onChange={(e) => setHighlightsInput(e.target.value)}
                placeholder="100% online with asynchronous benchmarks&#10;Evaluated capstone defense by systems faculty&#10;Cryptographic permanent credential verification"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium font-mono text-[11px]"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="degree-publish-check"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="degree-publish-check" className="font-bold text-slate-800 cursor-pointer">
                Publish Degree Program to Public Catalog & Student Directory
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-[#0A7CB3] hover:bg-[#086491] disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-98"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving Program...' : (isEditMode ? 'Save Specifications' : 'Publish Degree Track')}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
