import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Check, Mail, Shield, GraduationCap, Sparkles, 
  Camera, CheckCircle2, AlertCircle, Edit3, Save, 
  Upload, Image as ImageIcon, Trash2, Key, Bell, User,
  Globe, Clock, Layers, Briefcase, ExternalLink, LogOut, Lock,
  RefreshCw, BookOpen, Users
} from 'lucide-react';
import { AVATAR_PRESETS, DEFAULT_AVATAR } from '../../avatarPresets';
import { api } from '../../apiService';
import { formatDate } from '../../adminUtils';

function safeFormatDate(isoString) {
  if (!isoString) return '—';
  try {
    return formatDate(isoString);
  } catch (e) {
    return String(isoString).split('T')[0] || '—';
  }
}

const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST - UTC+5:30)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT - UTC-5)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT - UTC-8)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST - UTC+0)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT - UTC+8)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST - UTC+4)' }
];

const LANGUAGES = [
  { value: 'en', label: 'English (Institutional Standard)' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
  { value: 'kn', label: 'Kannada' },
  { value: 'de', label: 'German' },
  { value: 'es', label: 'Spanish' }
];

export default function ProfileSettingsModal({
  isOpen,
  onClose,
  currentUser,
  onSaveSuccess,
  onLogout
}) {
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' | 'security' | 'notifications' | 'account' | 'role_specific'
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Personal Fields
  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [language, setLanguage] = useState('en');
  const [selectedAvatar, setSelectedAvatar] = useState(DEFAULT_AVATAR);
  const [avatarTab, setAvatarTab] = useState('presets'); // 'presets' | 'custom'
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Security Fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');

  // Notification Preferences
  const [notifPrefs, setNotifPrefs] = useState({
    in_app: true,
    email: true,
    class_reminders: true,
    assignment_reminders: true,
    published_results: true,
    announcements: true,
    fee_reminders: true,
    placement_updates: true
  });

  // Role Profile Details
  const [roleProfile, setRoleProfile] = useState({});
  const [accountInfo, setAccountInfo] = useState({});
  const [formState, setFormState] = useState('loading'); // 'loading' | 'loaded' | 'saving' | 'error'
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [loadError, setLoadError] = useState('');

  const fileInputRef = useRef(null);

  // Load complete profile from backend with retry capability
  const loadProfileData = async () => {
    setFormState('loading');
    setIsLoadingProfile(true);
    setLoadError('');
    setErrorMsg('');
    setSaveSuccessMsg('');

    try {
      const token = localStorage.getItem('aaroha_token');
      if (!token) {
        setFormState('error');
        setLoadError('Session expired or authentication token missing. Please sign in to access institutional records.');
        return;
      }
      const res = await api.getUserProfile();
      if (res?.success && res.profile) {
        const p = res.profile;
        setFullName(p.full_name || '');
        setDisplayName(p.display_name || p.full_name || '');
        setTitle(p.title || '');
        setPhone(p.phone || '');
        setTimezone(p.timezone || 'Asia/Kolkata');
        setLanguage(p.preferred_language || 'en');
        setSelectedAvatar(p.avatar || DEFAULT_AVATAR);
        setNotifPrefs(p.notification_preferences || {});
        setAccountInfo(p.account_info || {});
        setRoleProfile(p.role_profile || {});
        if (p.security?.active_sessions) {
          setSessions(p.security.active_sessions);
        }
        setFormState('loaded');
      } else {
        throw new Error(res?.error || 'Unable to retrieve institutional profile.');
      }
    } catch (err) {
      setFormState('error');
      if (err.isUnauthorized || (err.message && err.message.toLowerCase().includes('token'))) {
        setLoadError('Session expired or authentication token required. Please sign in.');
      } else {
        setLoadError(err.message || 'HTTP 500: Server error loading institutional profile.');
      }
      // Form protection: do not populate empty fallback defaults that could overwrite data on save
    } finally {
      setIsLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (isOpen && currentUser) {
      setErrorMsg('');
      setSaveSuccessMsg('');
      setPasswordSuccessMsg('');
      loadProfileData();
    }
  }, [isOpen, currentUser]);

  if (!isOpen || !currentUser) return null;

  const userRole = (currentUser.role || 'student').toLowerCase();

  // Save personal details and preferences
  const handleSaveProfile = async (e) => {
    e && e.preventDefault();
    setErrorMsg('');
    setSaveSuccessMsg('');

    // Form protection: cannot save while loading or in error state
    if (formState !== 'loaded') {
      setErrorMsg('Cannot save profile while institutional records are not loaded.');
      return;
    }

    const token = localStorage.getItem('aaroha_token');
    if (!token) {
      setErrorMsg('Authentication session required. Please sign in to save profile.');
      if (typeof window !== 'undefined' && window.__aaroha_open_auth) {
        window.__aaroha_open_auth('login');
      }
      return;
    }

    // Field-level input validation
    if (!fullName.trim()) {
      setErrorMsg('Full name cannot be blank. Please enter your valid institutional name.');
      return;
    }

    if (phone.trim() && phone.trim().length > 30) {
      setErrorMsg('Mobile phone number cannot exceed 30 characters.');
      return;
    }

    // URL validation for role_profile
    if (roleProfile && typeof roleProfile === 'object') {
      const linkChecks = [
        { key: 'resume_url', label: 'Resume URL' },
        { key: 'portfolio_url', label: 'Portfolio URL' },
        { key: 'github_url', label: 'GitHub URL' },
        { key: 'website_url', label: 'Website URL' },
        { key: 'linkedin_url', label: 'LinkedIn URL' }
      ];
      for (const item of linkChecks) {
        const val = roleProfile[item.key];
        if (val && typeof val === 'string' && val.trim()) {
          const trimmed = val.trim();
          if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
            setErrorMsg('Invalid URL for ' + item.label + '. Web links must begin with http:// or https://');
            return;
          }
        }
      }
    }

    setIsSaving(true);
    setFormState('saving');

    try {
      const payload = {
        full_name: fullName.trim(),
        display_name: displayName.trim(),
        title: title.trim(),
        phone: phone.trim(),
        timezone: timezone,
        preferred_language: language,
        avatar: selectedAvatar,
        notification_preferences: notifPrefs,
        role_profile: roleProfile
      };

      const res = await api.updateUserProfile(payload);
      if (res?.success) {
        setSaveSuccessMsg('Profile and preferences updated successfully.');
        setFormState('loaded');
        // Update local storage user session
        const updatedUser = {
          ...currentUser,
          full_name: fullName.trim(),
          display_name: displayName.trim(),
          title: title.trim(),
          avatar: selectedAvatar,
          timezone: timezone,
          _alreadySaved: true
        };
        localStorage.setItem('aaroha_user', JSON.stringify(updatedUser));
        if (onSaveSuccess) onSaveSuccess(updatedUser);
      } else {
        throw new Error(res?.error || 'Failed to update profile settings.');
      }
    } catch (err) {
      // Preserve user edits in form and stay in 'loaded' state so they can fix and retry
      setFormState('loaded');
      if (err.isUnauthorized || (err.message && err.message.toLowerCase().includes('token'))) {
        setErrorMsg('Authentication session expired. Please sign in to save profile.');
        if (typeof window !== 'undefined' && window.__aaroha_open_auth) {
          window.__aaroha_open_auth('login');
        }
      } else {
        setErrorMsg(err.message || 'Failed to update profile settings.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Change password
  const handleChangePassword = async (e) => {
    e && e.preventDefault();
    if (!currentPassword || !newPassword) {
      setErrorMsg('Please enter both your current password and a new password.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('New password confirmation does not match.');
      return;
    }

    try {
      const res = await api.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword
      });
      if (res?.success) {
        setPasswordSuccessMsg('Password updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Password update failed.');
    }
  };

  // Sign out other sessions
  const handleLogoutOthers = async () => {
    try {
      await api.logoutOtherSessions();
      setSessions(prev => prev.filter(s => s.is_current));
      setSaveSuccessMsg('All other active web and mobile sessions terminated.');
    } catch (err) {
      setErrorMsg('Failed to terminate other sessions.');
    }
  };

  // Process custom image file with HTML5 canvas
  const processImageFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please upload a valid image file (PNG, JPG, or WEBP).');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('Image size exceeds 8MB. Please select a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target.result;
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
          const optimized = canvas.toDataURL('image/jpeg', 0.88);
          setSelectedAvatar(optimized);
        } catch (e) {
          setSelectedAvatar(rawDataUrl);
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-settings-title"
      >
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 text-[#0A7CB3] border border-blue-100">
              <User size={20} />
            </div>
            <div>
              <h2 id="profile-settings-title" className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Profile & Institutional Settings
              </h2>
              <p className="text-xs text-slate-500">
                Personal identity, multi-factor security, notifications, and role profile details.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <X size={20} />
          </button>
        </div>

        {/* Alerts & Feedback */}
        {saveSuccessMsg && (
          <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="px-6 py-2.5 bg-rose-50 border-b border-rose-100 text-rose-800 text-xs font-semibold flex items-center gap-2 max-w-full overflow-hidden">
            <AlertCircle size={15} className="text-rose-600 shrink-0" />
            <span className="break-words break-all max-w-full overflow-hidden">{errorMsg}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-5 border-b border-slate-200 overflow-x-auto text-xs font-bold text-slate-500 shrink-0 bg-white">
          {[
            { id: 'personal', label: 'Personal Details' },
            { id: 'security', label: 'Security' },
            { id: 'notifications', label: 'Notifications' },
            { 
              id: 'role_specific', 
              label: userRole === 'student' ? 'Student Information' : 'Professional Information' 
            }
          ].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={'px-3.5 py-3 border-b-2 transition-all whitespace-nowrap cursor-pointer ' + 
                (activeTab === t.id 
                  ? 'border-[#0A7CB3] text-[#0A7CB3] font-bold' 
                  : 'border-transparent hover:text-slate-900')}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6 flex-1">
          
          {/* TAB 1: PERSONAL DETAILS */}
          {activeTab === 'personal' && (
            <div className="space-y-6">
              
              {/* Profile Photo & Avatar Preset Selector */}
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                  Profile Photo & Avatar
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                  <img
                    src={selectedAvatar}
                    alt="Selected Avatar"
                    className="w-20 h-20 rounded-2xl object-cover ring-4 ring-[#0A7CB3]/30 shadow-md bg-white shrink-0"
                  />
                  <div className="space-y-2 flex-1 text-center sm:text-left">
                    <div className="text-xs font-bold text-slate-900">Customize Your Institutional Image</div>
                    <p className="text-[11px] text-slate-500">
                      Choose from curated high-fidelity 3D avatars or upload an authentic photo (PNG, JPG, max 8MB).
                    </p>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => processImageFile(e.target.files[0])}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current && fileInputRef.current.click()}
                        className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 shadow-2xs"
                      >
                        <Upload size={13} />
                        Upload Custom Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedAvatar(DEFAULT_AVATAR)}
                        className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-100"
                      >
                        Reset Default
                      </button>
                    </div>
                  </div>
                </div>

                {/* Preset Avatars Carousel */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Quick Preset Avatars</div>
                  <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2 max-h-32 overflow-y-auto p-1">
                    {AVATAR_PRESETS.slice(0, 24).map(p => {
                      const avatarSrc = p.url || p.src || DEFAULT_AVATAR;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedAvatar(avatarSrc)}
                          className={'p-1 rounded-xl border-2 transition-all cursor-pointer ' + 
                            (selectedAvatar === avatarSrc ? 'border-[#0A7CB3] scale-105 bg-blue-50' : 'border-transparent hover:border-slate-200')}
                        >
                          <img src={avatarSrc} alt={p.name} className="w-9 h-9 rounded-lg object-cover" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Personal Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A7CB3]/30"
                    placeholder="Legal name"
                  />
                  <span className="text-[10px] text-slate-400">Legal name used on accredited credentials.</span>
                </div>

                {/* Preferred Display Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Preferred Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A7CB3]/30"
                    placeholder="e.g. Aris or Dr. Thorne"
                  />
                  <span className="text-[10px] text-slate-400">Displayed on leaderboards and class rosters.</span>
                </div>

                {/* Email Address (Identity Locked) */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Authentication Email</span>
                    <span className="text-[10px] text-slate-400 font-mono">Protected Identity</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={currentUser.email}
                      disabled
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100/80 text-xs text-slate-500 cursor-not-allowed"
                    />
                    <Lock size={13} className="absolute right-3 top-3 text-slate-400" />
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Changing login identity email requires security verification through institutional administration.
                  </span>
                </div>

                {/* Mobile Number */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Mobile Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A7CB3]/30"
                    placeholder="+91 98450 11223"
                  />
                  <span className="text-[10px] text-slate-400">Used for critical SMS reminders & batch alerts.</span>
                </div>

                {/* Timezone Selector */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Globe size={13} className="text-[#0A7CB3]" />
                    <span>Timezone Preference</span>
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A7CB3]/30"
                  >
                    {TIMEZONES.map(tz => (
                      <option key={tz.value} value={tz.value}>{tz.label}</option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-400">Default: Asia/Kolkata (IST). All class schedules adapt.</span>
                </div>

                {/* Preferred Language */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Interface Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A7CB3]/30"
                  >
                    {LANGUAGES.map(lang => (
                      <option key={lang.value} value={lang.value}>{lang.label}</option>
                    ))}
                  </select>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: SECURITY & AUTHENTICATION */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              
              {/* Change Password Form */}
              <div className="p-5 rounded-3xl border border-slate-200 bg-slate-50/50 space-y-4">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700">
                  <Key size={16} className="text-[#0A7CB3]" />
                  <span>Change Password</span>
                </div>

                {passwordSuccessMsg && (
                  <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                    {passwordSuccessMsg}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="password"
                    placeholder="Current Password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none"
                  />
                  <input
                    type="password"
                    placeholder="New Password (min 6 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none"
                  />
                  <input
                    type="password"
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">Passwords are cryptographically hashed using Bcrypt (cost 12).</span>
                  <button
                    type="button"
                    onClick={handleChangePassword}
                    className="px-4 py-2 rounded-xl bg-[#0A7CB3] hover:bg-[#086491] text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Update Password
                  </button>
                </div>
              </div>

              {/* Multi-Factor Authentication (MFA) */}
              <div className="p-5 rounded-3xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-900">Two-Factor Authentication (TOTP / Authenticator)</div>
                    <div className="text-[11px] text-slate-500">
                      Add an additional verification layer using Google Authenticator, Authy, or Duo.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMfaEnabled(!mfaEnabled)}
                    className={'px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ' + 
                      (mfaEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600')}
                  >
                    {mfaEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>

              {/* Active Sessions Viewer */}
              <div className="p-5 rounded-3xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Active Login Sessions
                  </div>
                  {sessions.length > 1 && (
                    <button
                      type="button"
                      onClick={handleLogoutOthers}
                      className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      Sign Out of Other Sessions
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {sessions.map(sess => (
                    <div key={sess.session_id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{sess.device}</span>
                          {sess.is_current && (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">IP: {sess.ip_address} • {sess.last_active}</div>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">Verified</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: NOTIFICATION PREFERENCES */}
          {activeTab === 'notifications' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 text-xs text-[#0A7CB3]">
                <strong>Channel Protocol:</strong> Essential account security notices and admission legal confirmations cannot be disabled. Optional alerts can be toggled below.
              </div>

              <div className="space-y-3 divide-y divide-slate-100">
                {[
                  { key: 'in_app', label: 'In-App Notification Center', desc: 'Real-time badges, class start toasts, and deliverable reviews in the LMS top bar.' },
                  { key: 'email', label: 'Institutional Email Dispatch', desc: 'Digest of syllabus milestones, meeting transcripts, and accredited certificates.' },
                  { key: 'class_reminders', label: 'Live Class Reminders (15m prior)', desc: 'Automated notification with direct meeting room link before each session.' },
                  { key: 'assignment_reminders', label: 'Assignment & Milestone Due Reminders', desc: 'Notice 48 hours and 12 hours prior to deliverable submission deadlines.' },
                  { key: 'published_results', label: 'Published Assessment Scores & Feedback', desc: 'Alert immediately when faculty completes grading and posts evaluation.' },
                  { key: 'announcements', label: 'Cohort & Academy Announcements', desc: 'Important notices from institutional deans, faculty, and coordinators.' },
                  { key: 'placement_updates', label: 'Corporate Placement & Interview Updates', desc: 'Hiring company shortlist notifications and scheduled interview rounds.' }
                ].map(item => (
                  <div key={item.key} className="pt-3 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{item.label}</div>
                      <div className="text-[11px] text-slate-500">{item.desc}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifPrefs(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                      className={'w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ' + 
                        (notifPrefs[item.key] ? 'bg-[#0A7CB3] justify-end' : 'bg-slate-200 justify-start')}
                    >
                      <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: ROLE-SPECIFIC PROFESSIONAL / STUDENT INFORMATION & READ-ONLY IDS */}
          {activeTab === 'role_specific' && (
            <div className="space-y-6">
              {formState === 'loading' ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-500">
                  <Sparkles className="animate-spin text-[#0A7CB3]" size={28} />
                  <div className="text-xs font-semibold">Loading institutional profile records...</div>
                </div>
              ) : formState === 'error' ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between gap-3 max-w-full overflow-hidden">
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="font-bold">Unable to load institutional profile</div>
                      <div className="text-[11px] text-amber-700 break-words break-all max-w-full overflow-hidden leading-relaxed max-h-20 overflow-y-auto">{loadError}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(loadError.toLowerCase().includes('sign in') || loadError.toLowerCase().includes('session') || loadError.toLowerCase().includes('token') || loadError.toLowerCase().includes('auth')) && (
                        <button
                          type="button"
                          onClick={() => { if (typeof window !== 'undefined' && window.__aaroha_open_auth) window.__aaroha_open_auth('login'); }}
                          className="px-3.5 py-1.5 rounded-xl bg-[#0a7cb3] hover:bg-[#08638f] text-white font-bold cursor-pointer transition-colors shadow-xs"
                        >
                          Sign In
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={loadProfileData}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                    Institutional profile records could not be retrieved from the server. Form controls and save actions are disabled to prevent accidental data loss. Please click <strong>Retry</strong> above or verify network/server status.
                  </div>
                </div>
              ) : (
                <>

                  {/* Read-Only Institutional Identity Record */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                    <div className="text-xs font-black uppercase tracking-wider text-slate-400">Institutional Identity Record (Read-Only)</div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 block">Identifier Code:</span>
                        <strong className="text-slate-900 font-mono text-sm">{accountInfo.identifier || (currentUser?.id ? ('USR-' + String(currentUser.id).padStart(4, '0')) : 'N/A')}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Account Status:</span>
                        <strong className="text-emerald-700 font-bold">{accountInfo.account_status || 'Active & Verified'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Assigned Institutional Role:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-[#0a7cb3] border border-blue-200">
                            {userRole}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Member Since:</span>
                        <strong className="text-slate-800">{safeFormatDate(accountInfo.created_at || currentUser?.created_at || new Date().toISOString())}</strong>
                      </div>
                    </div>

                    {/* Read-Only Course and Batch Associations */}
                    {accountInfo.associations && Array.isArray(accountInfo.associations) && accountInfo.associations.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-200/60">
                        <span className="text-slate-400 block text-[11px] font-bold uppercase tracking-wider">
                          {userRole === 'student' ? 'Academic Enrolments & Cohort Batches (Read-Only)' : 'Assigned Teaching Cohorts & Courses (Read-Only)'}
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {accountInfo.associations.map((item, idx) => (
                            <div key={idx} className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between">
                              <div className="truncate mr-2">
                                <div className="font-bold text-slate-900 truncate">{item.course_title || item.title || 'Course'}</div>
                                <div className="text-[11px] text-slate-500 truncate">{item.batch_code ? (item.batch_code + ' (' + (item.batch_title || 'Cohort') + ')') : 'Enrolled Program'}</div>
                              </div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                {item.enrollment_status || 'Active'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
                      Roles, identifier codes, and enrolled program allocations are legally governed by the academic registry and cannot be self-modified.
                    </div>
                  </div>
                  
                  {/* STUDENT PROFILE */}
                  {userRole === 'student' && (
                    <div className="space-y-4">
                      <div className="text-xs font-black uppercase tracking-wider text-slate-400">Student Education & Portfolio</div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Education & University</label>
                          <input
                            type="text"
                            value={roleProfile.education || ''}
                            onChange={(e) => setRoleProfile(prev => ({ ...prev, education: e.target.value }))}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A7CB3]"
                            placeholder="e.g. B.Tech Computer Science, NIT Karnataka"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Experience Years</label>
                          <input
                            type="text"
                            value={roleProfile.experience_years || ''}
                            onChange={(e) => setRoleProfile(prev => ({ ...prev, experience_years: e.target.value }))}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A7CB3]"
                            placeholder="e.g. 2 Years"
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <label className="text-xs font-bold text-slate-700">Core Technical Skills</label>
                          <input
                            type="text"
                            value={roleProfile.skills || ''}
                            onChange={(e) => setRoleProfile(prev => ({ ...prev, skills: e.target.value }))}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A7CB3]"
                            placeholder="e.g. Distributed Systems, Go, Kubernetes, AWS, Raft"
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <label className="text-xs font-bold text-slate-700">Career Interests & Target Roles</label>
                          <input
                            type="text"
                            value={roleProfile.career_interests || ''}
                            onChange={(e) => setRoleProfile(prev => ({ ...prev, career_interests: e.target.value }))}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A7CB3]"
                            placeholder="e.g. Cloud Infrastructure Engineer, Site Reliability Engineer"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Resume Document URL</label>
                          <input
                            type="url"
                            value={roleProfile.resume_url || ''}
                            onChange={(e) => setRoleProfile(prev => ({ ...prev, resume_url: e.target.value }))}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A7CB3]"
                            placeholder="https://drive.google.com/... or https://yourdomain.com/resume.pdf"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">GitHub Profile URL</label>
                          <input
                            type="url"
                            value={roleProfile.github_url || ''}
                            onChange={(e) => setRoleProfile(prev => ({ ...prev, github_url: e.target.value }))}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A7CB3]"
                            placeholder="https://github.com/username"
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <label className="text-xs font-bold text-slate-700">Portfolio Website URL</label>
                          <input
                            type="url"
                            value={roleProfile.portfolio_url || ''}
                            onChange={(e) => setRoleProfile(prev => ({ ...prev, portfolio_url: e.target.value }))}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A7CB3]"
                            placeholder="https://yourname.dev"
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <label className="text-xs font-bold text-slate-700">Work Experience & Projects Summary</label>
                          <textarea
                            rows={3}
                            value={roleProfile.work_experience || ''}
                            onChange={(e) => setRoleProfile(prev => ({ ...prev, work_experience: e.target.value }))}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A7CB3]"
                            placeholder="Brief summary of professional experience or internships..."
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* FACULTY PROFILE */}
                  {userRole === 'faculty' && (
                    <div className="space-y-4">
                      <div className="text-xs font-black uppercase tracking-wider text-slate-400">Faculty Credentials, Links & Availability</div>
                      
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Academic & Professional Bio</label>
                          <textarea
                            rows={3}
                            value={roleProfile.bio || ''}
                            onChange={(e) => setRoleProfile(prev => ({ ...prev, bio: e.target.value }))}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A7CB3]"
                            placeholder="Faculty biography and instructional philosophy..."
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700">Qualifications & Degrees</label>
                            <input
                              type="text"
                              value={roleProfile.qualifications || ''}
                              onChange={(e) => setRoleProfile(prev => ({ ...prev, qualifications: e.target.value }))}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A7CB3]"
                              placeholder="e.g. Ph.D. in Computer Systems, M.S. in Distributed Networks"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700">Years of Experience</label>
                            <input
                              type="text"
                              value={roleProfile.experience_years || ''}
                              onChange={(e) => setRoleProfile(prev => ({ ...prev, experience_years: e.target.value }))}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A7CB3]"
                              placeholder="e.g. 10+ Years in Systems Research & Industry"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Areas of Expertise</label>
                          <input
                            type="text"
                            value={roleProfile.expertise || ''}
                            onChange={(e) => setRoleProfile(prev => ({ ...prev, expertise: e.target.value }))}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A7CB3]"
                            placeholder="e.g. Distributed Consensus, Linux Kernel Networking, Go, High-Throughput Pipelines"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700">Portfolio / Website URL</label>
                            <input
                              type="url"
                              value={roleProfile.website_url || roleProfile.portfolio_url || ''}
                              onChange={(e) => setRoleProfile(prev => ({ ...prev, website_url: e.target.value, portfolio_url: e.target.value }))}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A7CB3]"
                              placeholder="https://facultypage.edu"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700">LinkedIn Profile URL</label>
                            <input
                              type="url"
                              value={roleProfile.linkedin_url || ''}
                              onChange={(e) => setRoleProfile(prev => ({ ...prev, linkedin_url: e.target.value }))}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A7CB3]"
                              placeholder="https://linkedin.com/in/username"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700">GitHub / Scholar URL</label>
                            <input
                              type="url"
                              value={roleProfile.github_url || ''}
                              onChange={(e) => setRoleProfile(prev => ({ ...prev, github_url: e.target.value }))}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A7CB3]"
                              placeholder="https://github.com/username"
                            />
                          </div>
                        </div>

                        {/* Availability Preferences */}
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                          <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Availability & Scheduling Preferences</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="font-semibold text-slate-600 block">Preferred Teaching Days</label>
                              <input
                                type="text"
                                value={Array.isArray(roleProfile.availability?.preferred_days) ? roleProfile.availability.preferred_days.join(', ') : (roleProfile.availability?.preferred_days || '')}
                                onChange={(e) => {
                                  const val = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                  setRoleProfile(prev => ({
                                    ...prev,
                                    availability: { ...(prev.availability || {}), preferred_days: val }
                                  }));
                                }}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A7CB3]"
                                placeholder="Monday, Wednesday, Friday"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="font-semibold text-slate-600 block">Max Weekly Instructional Hours</label>
                              <input
                                type="number"
                                value={roleProfile.availability?.max_hours_per_week || ''}
                                onChange={(e) => {
                                  const val = Number(e.target.value) || 0;
                                  setRoleProfile(prev => ({
                                    ...prev,
                                    availability: { ...(prev.availability || {}), max_hours_per_week: val }
                                  }));
                                }}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A7CB3]"
                                placeholder="16"
                              />
                            </div>
                          </div>
                          <div className="text-[11px] text-slate-500 italic">
                            Availability preferences serve as operational guidelines for coordinator assignment. Existing assigned teaching sessions remain locked until rescheduled by Academic Operations.
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* STAFF PROFILES */}
                  {['super_admin', 'admin', 'coordinator', 'placement_officer', 'accounts'].includes(userRole) && (
                    <div className="space-y-4">
                      <div className="text-xs font-black uppercase tracking-wider text-slate-400">Staff Operational Assignment & Department</div>
                      <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="font-bold text-slate-700">Assigned Department</label>
                            <input
                              type="text"
                              value={roleProfile.department || accountInfo.department || 'Operations Management'}
                              onChange={(e) => setRoleProfile(prev => ({ ...prev, department: e.target.value }))}
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A7CB3]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-bold text-slate-700">Institutional Job Title</label>
                            <input
                              type="text"
                              value={roleProfile.job_title || title || 'Operations Officer'}
                              onChange={(e) => {
                                const val = e.target.value;
                                setTitle(val);
                                setRoleProfile(prev => ({ ...prev, job_title: val }));
                              }}
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A7CB3]"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-700">Professional Notes & Scope</label>
                          <textarea
                            rows={2}
                            value={roleProfile.professional_details || ''}
                            onChange={(e) => setRoleProfile(prev => ({ ...prev, professional_details: e.target.value }))}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A7CB3]"
                            placeholder="Operational purview, departmental duties, and governance scope..."
                          />
                        </div>
                        <div><strong>Assigned Institutional Role:</strong> <span className="uppercase font-bold text-[#0A7CB3] ml-1">{userRole}</span></div>
                        <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                          Administrative privileges and system authority are allocated based on institutional executive clearance.
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

            </div>
          )}

        </div>

        {/* Modal Footer with Clear Tab-Specific Save Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {activeTab !== 'security' ? (
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={isSaving || formState !== 'loaded'}
                title={formState !== 'loaded' ? 'Profile records must be successfully loaded before saving changes' : ''}
                className="px-5 py-2.5 rounded-xl bg-[#0A7CB3] hover:bg-[#086491] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? <Sparkles size={14} className="animate-spin" /> : <Save size={14} />}
                <span>
                  {activeTab === 'personal' && 'Save Personal Details'}
                  {activeTab === 'notifications' && 'Save Notification Preferences'}
                  {activeTab === 'role_specific' && (userRole === 'student' ? 'Save Student Information' : 'Save Professional Information')}
                </span>
              </button>
            ) : (
              <div className="text-xs text-slate-500 font-medium italic">
                Security credentials are saved via dedicated controls above.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
