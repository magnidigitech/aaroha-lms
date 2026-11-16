import React, { useState } from 'react';
import { 
  X, User, Mail, Lock, Shield, GraduationCap, Sparkles, 
  Check, UserCheck, KeyRound, RefreshCw, Eye, EyeOff, Briefcase 
} from 'lucide-react';
import { AVATAR_PRESETS } from '../../avatarPresets';

export default function OnboardUserModal({ isOpen, onClose, onOnboardUser }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Welcome2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('student'); // 'student' | 'faculty' | 'admin'
  const [title, setTitle] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_PRESETS[12].url);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = 'Aaroha!';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setErrorMsg('Full name, corporate email, and password are required.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onOnboardUser({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password: password,
        role: role,
        title: title.trim() || (role === 'faculty' ? 'Faculty Instructor' : 'Student Fellow'),
        avatar: selectedAvatar
      });
      // Reset form and close
      setFullName('');
      setEmail('');
      setPassword('Welcome2026!');
      setTitle('');
      setSelectedAvatar(AVATAR_PRESETS[12].url);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to onboard user. Please check the provided information.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92dvh] sm:max-h-[90dvh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="shrink-0 bg-slate-900 px-5 py-4 sm:px-6 sm:py-5 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-md">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Institutional User Onboarding
              </h2>
              <p className="text-[11px] text-slate-400">
                Provision institutional student or faculty accounts directly into Aaroha LMS.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 text-xs thin-scrollbar">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            {/* Role Selection */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1.5">
                Account Authority / Role:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={'py-2 px-3 rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer ' +
                    (role === 'student'
                      ? 'bg-[#0A7CB3] text-white font-bold border-[#0A7CB3] shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100')}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Student / Fellow</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('faculty')}
                  className={'py-2 px-3 rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer ' +
                    (role === 'faculty'
                      ? 'bg-slate-900 text-white font-bold border-slate-900 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100')}
                >
                  <Shield className="w-4 h-4" />
                  <span>Faculty / Instructor</span>
                </button>
              </div>
            </div>

            {/* Full Name & Title */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Legal Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Jane Cooper"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A7CB3] focus:bg-white text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  Academic Title / Role Tag
                </label>
                <input
                  type="text"
                  placeholder={role === 'faculty' ? 'e.g. AI Research Lead' : 'e.g. Cloud Fellow - 2026'}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A7CB3] focus:bg-white text-xs"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                Institutional / Corporate Email *
              </label>
              <input
                type="email"
                required
                placeholder="e.g. user@aaroha-inc.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A7CB3] focus:bg-white text-xs"
              />
            </div>

            {/* Temporary Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  Temporary Password *
                </label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-[11px] font-semibold text-[#0A7CB3] hover:text-[#086491] flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Generate Password</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A7CB3] focus:bg-white text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Provide this temporary password to the user. They can update their password and profile after sign-in.
              </p>
            </div>

            {/* 3D Animated Preset Avatar Selection */}
            <div>
              <label className="font-semibold text-slate-700 flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Assign 3D Character Avatar</span>
                </span>
                <span className="text-[10px] text-slate-500 font-normal">Click avatar to select</span>
              </label>
              <div className="grid grid-cols-8 gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200 max-h-28 overflow-y-auto thin-scrollbar">
                {AVATAR_PRESETS.map((preset) => {
                  const isSelected = selectedAvatar === preset.url || selectedAvatar === preset.fallbackUrl;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedAvatar(preset.url)}
                      title={`${preset.name} (${preset.gender})`}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all cursor-pointer bg-slate-100 flex items-center justify-center p-0.5 ${
                        isSelected ? 'border-[#0A7CB3] ring-2 ring-blue-500/30 scale-105 shadow-xs' : 'border-transparent hover:opacity-80'
                      }`}
                    >
                      <img 
                        src={preset.url} 
                        alt={preset.name} 
                        className="w-full h-full object-contain" 
                        onError={(e) => { 
                          if (e.target.src !== preset.fallbackUrl) {
                            e.target.src = preset.fallbackUrl;
                          }
                        }}
                      />
                      {isSelected && (
                        <div className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-[#0A7CB3] text-white rounded-full flex items-center justify-center shadow-xs">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Modal Footer / Action Buttons */}
          <div className="shrink-0 p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'Provisioning...' : 'Provision & Activate Account'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
