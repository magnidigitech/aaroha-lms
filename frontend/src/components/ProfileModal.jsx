import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Check, Mail, Shield, GraduationCap, Sparkles, 
  Camera, CheckCircle2, AlertCircle, Edit3, Save, 
  Upload, Image as ImageIcon, Trash2, ArrowUpCircle
} from 'lucide-react';
import { AVATAR_PRESETS, DEFAULT_AVATAR } from '../avatarPresets';

export default function ProfileModal({
  isOpen,
  onClose,
  currentUser,
  onSaveProfile,
  onLogout
}) {
  const [activeTab, setActiveTab] = useState('presets'); // 'presets' | 'upload'
  const [selectedAvatar, setSelectedAvatar] = useState(currentUser?.avatar || DEFAULT_AVATAR);
  const [fullName, setFullName] = useState(currentUser?.full_name || '');
  const [title, setTitle] = useState(currentUser?.title || '');
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'male' | 'female'
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [uploadFileName, setUploadFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef(null);

  // Sync state when modal opens or user changes
  useEffect(() => {
    if (currentUser) {
      const initialAvatar = currentUser.avatar || DEFAULT_AVATAR;
      setSelectedAvatar(initialAvatar);
      setFullName(currentUser.full_name || '');
      setTitle(currentUser.title || '');
      setCustomAvatarUrl('');
      setUploadFileName('');
      setActiveTab('presets');
      setCategoryFilter('all');
      setSaveSuccess(false);
      setErrorMsg('');
    }
  }, [currentUser, isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !currentUser) return null;

  const isFaculty = currentUser.role === 'admin' || currentUser.role === 'faculty' || currentUser.role === 'instructor';

  const filteredPresets = AVATAR_PRESETS.filter(p => {
    if (categoryFilter === 'all') return true;
    return p.category === categoryFilter || p.gender === categoryFilter;
  });

  const activeAvatarUrl = selectedAvatar;

  // Process uploaded image with HTML5 canvas (crops and compresses to crisp 256x256 square)
  const processImageFile = (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please upload a valid image file (PNG, JPG, WEBP, or SVG).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('Image size exceeds 8MB. Please select a smaller photo.');
      return;
    }

    setErrorMsg('');
    setUploadFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target.result;

      // Center-crop and scale to 256x256 square
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
          const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.88);

          setSelectedAvatar(optimizedDataUrl);
          setCustomAvatarUrl(optimizedDataUrl);
        } catch (canvasErr) {
          // Fallback to raw data url if canvas security or memory issues
          setSelectedAvatar(rawDataUrl);
          setCustomAvatarUrl(rawDataUrl);
        }
      };
      img.onerror = () => {
        setErrorMsg('Failed to process image file.');
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg('Full name cannot be empty.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      if (onSaveProfile) {
        await onSaveProfile({
          full_name: fullName.trim(),
          title: title.trim(),
          avatar: activeAvatarUrl
        });
      }
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 700);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div className="relative bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header Bar */}
        <div className="bg-[#0B192C] text-white p-5 sm:p-6 relative border-b border-[#1b3d63]">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Close Profile Dialog"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            {/* Live Preview Avatar */}
            <div className="relative shrink-0 group">
              <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl ring-4 ring-blue-500/40 shadow-xl bg-gradient-to-b from-slate-800 to-slate-900 flex items-center justify-center overflow-hidden">
                <img
                  src={activeAvatarUrl || DEFAULT_AVATAR}
                  alt={fullName || currentUser.full_name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = DEFAULT_AVATAR;
                  }}
                />
              </div>
              <div 
                className="absolute -bottom-1.5 -right-1.5 bg-[#0056D2] text-white p-1 rounded-lg shadow-md border-2 border-[#0B192C]"
                title="Active Profile Avatar"
              >
                <Camera className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Profile Meta Overview */}
            <div className="text-center sm:text-left min-w-0 flex-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1.5 border shadow-2xs bg-blue-950/80 text-blue-300 border-blue-800">
                {isFaculty ? (
                  <>
                    <Shield className="w-3 h-3 text-blue-400" />
                    <span>Faculty Director</span>
                  </>
                ) : (
                  <>
                    <GraduationCap className="w-3 h-3 text-emerald-400" />
                    <span>Learner / Engineering Fellow</span>
                  </>
                )}
              </div>

              <h2 id="profile-modal-title" className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                {fullName || currentUser.full_name}
              </h2>

              <p className="text-xs text-slate-300 flex items-center justify-center sm:justify-start gap-1.5 mt-0.5">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{currentUser.email}</span>
              </p>

              <p className="text-[11px] text-blue-300 font-medium mt-1 truncate">
                {title || (isFaculty ? 'Distributed Systems Faculty Chair' : 'Candidate & Systems Fellow')}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Profile and avatar updated successfully!</span>
            </div>
          )}

          {/* Avatar Source Tabs: 3D Preset Characters vs Custom Upload */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('presets')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'presets'
                      ? 'bg-[#0056D2] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>3D Animated Avatars</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'upload'
                      ? 'bg-[#0056D2] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Custom Photo</span>
                </button>
              </div>

              {activeTab === 'presets' && (
                <div className="hidden sm:inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('all')}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                      categoryFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    All ({AVATAR_PRESETS.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('male')}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                      categoryFilter === 'male' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Male
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('female')}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                      categoryFilter === 'female' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Female
                  </button>
                </div>
              )}
            </div>

            {/* TAB 1: 3D ANIMATED PRESET GALLERY */}
            {activeTab === 'presets' && (
              <div className="space-y-2">
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2.5 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl max-h-56 overflow-y-auto">
                  {filteredPresets.map((preset) => {
                    const isSelected = selectedAvatar === preset.url || selectedAvatar === preset.fallbackUrl;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setSelectedAvatar(preset.url);
                          setCustomAvatarUrl('');
                          setUploadFileName('');
                        }}
                        className={`group relative flex flex-col items-center p-1.5 rounded-xl transition-all cursor-pointer border text-center ${
                          isSelected 
                            ? 'bg-blue-50/90 border-[#0056D2] ring-2 ring-[#0056D2]/30 shadow-xs' 
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-100/60'
                        }`}
                        title={`${preset.name} (${preset.style})`}
                      >
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-2xs bg-gradient-to-b from-slate-100 to-slate-200/80 flex items-center justify-center">
                          <img
                            src={preset.url}
                            alt={preset.name}
                            className="w-10 h-10 object-contain group-hover:scale-108 transition-transform duration-200"
                            loading="lazy"
                            onError={(e) => {
                              if (e.target.src !== preset.fallbackUrl) {
                                e.target.src = preset.fallbackUrl;
                              }
                            }}
                          />
                          {/* Active Checkmark Badge */}
                          {isSelected && (
                            <div className="absolute inset-0 bg-[#0056D2]/40 backdrop-blur-[1px] flex items-center justify-center text-white">
                              <Check className="w-5 h-5 stroke-[3]" />
                            </div>
                          )}
                        </div>

                        <span className="text-[10px] font-bold text-slate-800 mt-1 truncate max-w-full leading-tight">
                          {preset.name}
                        </span>
                        <span className="text-[9px] text-slate-500 capitalize truncate max-w-full font-medium">
                          {preset.gender}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: CUSTOM UPLOAD OPTION */}
            {activeTab === 'upload' && (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* Drag & Drop Zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-[#0056D2] bg-blue-50/80 ring-4 ring-blue-500/20'
                      : 'border-slate-300 hover:border-[#0056D2] hover:bg-slate-50 bg-slate-50/50'
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-[#0056D2] mx-auto flex items-center justify-center mb-3 shadow-xs">
                    <ArrowUpCircle className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-bold text-slate-900 mb-1">
                    Click to browse or drag and drop your photo here
                  </div>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Supports PNG, JPG, WEBP, or SVG up to 8MB. Images are automatically centered, cropped, and optimized for your profile.
                  </p>
                </div>

                {/* Uploaded File Status & Manual URL Entry */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <ImageIcon className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="text-xs font-medium text-slate-700 truncate">
                      {uploadFileName ? `Loaded: ${uploadFileName}` : 'Or paste a direct image URL below'}
                    </span>
                  </div>
                  {uploadFileName && (
                    <button
                      type="button"
                      onClick={() => {
                        setUploadFileName('');
                        setSelectedAvatar(DEFAULT_AVATAR);
                        setCustomAvatarUrl('');
                      }}
                      className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                <div>
                  <input
                    type="url"
                    placeholder="https://example.com/my-profile-picture.jpg"
                    value={customAvatarUrl.startsWith('data:') ? '' : customAvatarUrl}
                    onChange={(e) => {
                      const url = e.target.value.trim();
                      setCustomAvatarUrl(url);
                      if (url) {
                        setSelectedAvatar(url);
                        setUploadFileName('Custom Web URL');
                      }
                    }}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section: Display Name & Department Title */}
          <div className="pt-3 border-t border-slate-200 space-y-3.5">
            <h4 className="text-xs font-black text-slate-900 tracking-tight uppercase flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-slate-500" />
              <span>Identity & Department Information</span>
            </h4>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Display Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Elena Rostova or Dr. Aris Thorne"
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Professional Title / Specialization
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={isFaculty ? 'e.g. Chair of Cloud & Kernel Architecture' : 'e.g. Senior Distributed Systems Fellow'}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Registered Email (Managed by Identity Provider)
              </label>
              <input
                type="email"
                disabled
                value={currentUser.email}
                className="w-full p-2.5 text-xs bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed select-none font-mono"
              />
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            {onLogout ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
              >
                Sign Out
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 bg-[#0056D2] hover:bg-[#00419e] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-98"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving Changes...' : 'Save Profile & Avatar'}</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
