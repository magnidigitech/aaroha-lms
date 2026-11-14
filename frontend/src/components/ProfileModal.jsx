import React, { useState, useEffect } from 'react';
import { 
  X, Check, User, Mail, Shield, GraduationCap, Sparkles, 
  Camera, CheckCircle2, AlertCircle, Edit3, Save, Bot
} from 'lucide-react';
import { AVATAR_PRESETS, DEFAULT_AVATAR } from '../avatarPresets';

export default function ProfileModal({
  isOpen,
  onClose,
  currentUser,
  onSaveProfile,
  onLogout
}) {
  const [selectedAvatar, setSelectedAvatar] = useState(currentUser?.avatar || DEFAULT_AVATAR);
  const [fullName, setFullName] = useState(currentUser?.full_name || '');
  const [title, setTitle] = useState(currentUser?.title || '');
  const [userRole, setUserRole] = useState(currentUser?.role || 'student'); // 'student' | 'admin'
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'male' | 'female' | 'robot'
  const [useCustomUrl, setUseCustomUrl] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Sync state when modal opens or user changes
  useEffect(() => {
    if (currentUser) {
      setSelectedAvatar(currentUser.avatar || DEFAULT_AVATAR);
      setFullName(currentUser.full_name || '');
      setTitle(currentUser.title || '');
      setUserRole(currentUser.role || 'student');
      setCustomAvatarUrl('');
      setUseCustomUrl(false);
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

  const isFaculty = userRole === 'admin' || userRole === 'faculty' || userRole === 'instructor';

  const filteredPresets = AVATAR_PRESETS.filter(p => {
    if (categoryFilter === 'all') return true;
    return p.category === categoryFilter || p.gender === categoryFilter;
  });

  const activeAvatarUrl = useCustomUrl && customAvatarUrl.trim() ? customAvatarUrl.trim() : selectedAvatar;

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
          avatar: activeAvatarUrl,
          role: userRole
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
              <img
                src={activeAvatarUrl || DEFAULT_AVATAR}
                alt={fullName || currentUser.full_name}
                className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl object-cover ring-4 ring-blue-500/40 shadow-xl bg-slate-800"
                onError={(e) => {
                  e.target.src = DEFAULT_AVATAR;
                }}
              />
              <div 
                className="absolute -bottom-1.5 -right-1.5 bg-blue-600 text-white p-1 rounded-lg shadow-md border-2 border-[#0B192C]"
                title="Active Animated Avatar"
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
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Profile, role and animated avatar saved successfully!</span>
            </div>
          )}

          {/* Section 1: User Decides Their Role (Platform Access) */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-900 tracking-tight uppercase flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#0056D2]" />
                <span>Select Your Role & Access Level</span>
              </span>
              <span className="text-[10px] text-slate-500 font-normal">Choose your account authority</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Student Role Option */}
              <button
                type="button"
                onClick={() => setUserRole('student')}
                className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-start gap-3 ${
                  userRole === 'student'
                    ? 'border-[#0056D2] bg-blue-50/60 ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className={`p-2 rounded-xl mt-0.5 ${
                  userRole === 'student' ? 'bg-[#0056D2] text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Learner / Fellow</span>
                    {userRole === 'student' && <Check className="w-3.5 h-3.5 text-[#0056D2]" />}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                    Access coursework, lectures, assignment submissions & accredited certificates.
                  </p>
                </div>
              </button>

              {/* Faculty Director Role Option */}
              <button
                type="button"
                onClick={() => setUserRole('admin')}
                className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-start gap-3 ${
                  userRole === 'admin' || userRole === 'faculty' || userRole === 'instructor'
                    ? 'border-[#0056D2] bg-blue-50/60 ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className={`p-2 rounded-xl mt-0.5 ${
                  userRole === 'admin' || userRole === 'faculty' || userRole === 'instructor' 
                    ? 'bg-[#0056D2] text-white' 
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  <Shield className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Faculty Director</span>
                    {(userRole === 'admin' || userRole === 'faculty' || userRole === 'instructor') && (
                      <Check className="w-3.5 h-3.5 text-[#0056D2]" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                    Author curricula, configure Bunny Stream videos & grade student deliverables.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Section 2: Animated Avatars Gallery */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-black text-slate-900 tracking-tight uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Choose Animated Avatar</span>
                <span className="text-[10px] text-slate-400 normal-case font-medium">({filteredPresets.length} available)</span>
              </label>

              {/* Character Style / Gender Filter Tabs */}
              <div className="inline-flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-[11px] self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setCategoryFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    categoryFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  All ({AVATAR_PRESETS.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('male')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    categoryFilter === 'male' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Male
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('female')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    categoryFilter === 'female' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Female
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('robot')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                    categoryFilter === 'robot' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Bot className="w-3 h-3" />
                  <span>Bots</span>
                </button>
              </div>
            </div>

            {/* Avatar Grid (Responsive 4-col on mobile, 6-col on sm, 8-col on md) */}
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2.5 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl max-h-56 overflow-y-auto">
              {filteredPresets.map((preset) => {
                const isSelected = !useCustomUrl && selectedAvatar === preset.url;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSelectedAvatar(preset.url);
                      setUseCustomUrl(false);
                    }}
                    className={`group relative flex flex-col items-center p-1.5 rounded-xl transition-all cursor-pointer border text-center ${
                      isSelected 
                        ? 'bg-blue-50/90 border-[#0056D2] ring-2 ring-[#0056D2]/30 shadow-xs' 
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-100/60'
                    }`}
                    title={`${preset.name} (${preset.style})`}
                  >
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-2xs bg-slate-100">
                      <img
                        src={preset.url}
                        alt={preset.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                        onError={(e) => {
                          e.target.src = preset.localUrl;
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
                      {preset.category === 'robot' ? 'Bot' : preset.gender}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Custom Avatar URL Toggle (Optional) */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <span>Or Enter Custom Image URL</span>
              </label>
              <button
                type="button"
                onClick={() => setUseCustomUrl(!useCustomUrl)}
                className="text-[11px] font-bold text-[#0056D2] hover:underline cursor-pointer"
              >
                {useCustomUrl ? 'Use Animated Preset' : 'Enter URL Manually'}
              </button>
            </div>

            {useCustomUrl && (
              <input
                type="url"
                placeholder="https://example.com/animated-avatar.svg"
                value={customAvatarUrl}
                onChange={(e) => setCustomAvatarUrl(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            )}
          </div>

          {/* Section 4: Display Name & Department Title */}
          <div className="pt-3 border-t border-slate-100 space-y-3.5">
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
                placeholder="e.g. Elena Rostova or Dr. Nathan Vance"
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
                <span>{isSaving ? 'Saving Changes...' : 'Save Profile & Role'}</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
