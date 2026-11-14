import React, { useState } from 'react';
import { X, Lock, Mail, User, Shield, GraduationCap, ArrowRight, CheckCircle2, Eye, EyeOff, Sparkles, Check } from 'lucide-react';
import aarohaLogo from '../assets/aaroha_logo.webp';
import { AVATAR_PRESETS } from '../avatarPresets';

export default function AuthModal({ isOpen, onClose, onLogin, onRegister, initialTab = 'login', intendedCourseTitle }) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'login' | 'register'
  
  // Login Form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  
  // Register Form
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [registerRole, setRegisterRole] = useState('student'); // 'student' | 'admin'
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_PRESETS[12].url); // Elena 3D (/avatars/3d/memo_13.png)

  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    const success = onLogin(loginEmail, loginPassword);
    if (!success) {
      setErrorMsg('Invalid email or password. Please verify your credentials.');
    } else {
      onClose();
    }
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!registerName.trim() || !registerEmail.trim() || !registerPassword.trim()) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    onRegister({
      full_name: registerName.trim(),
      email: registerEmail.trim(),
      password: registerPassword,
      role: registerRole,
      avatar: selectedAvatar,
      title: ''
    });
    onClose();
  };

  const handleAutofill = (email, password) => {
    setLoginEmail(email);
    setLoginPassword(password);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-2xl sm:rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92dvh] sm:max-h-[90dvh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="shrink-0 bg-slate-900 px-5 py-3.5 sm:px-6 sm:py-4 text-white text-center relative border-b border-slate-800">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-3.5 sm:right-3.5 p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="mb-1.5 flex justify-center">
            <div className="inline-flex bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-xs items-center">
              <img
                src={aarohaLogo}
                alt="Aaroha Technologies"
                className="h-5.5 sm:h-6 w-auto object-contain"
              />
            </div>
          </div>

          <h2 className="text-lg sm:text-xl font-extrabold text-white">
            {activeTab === 'login' ? 'Sign In to Your Workspace' : 'Create an Account'}
          </h2>

          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 line-clamp-1 max-w-xs mx-auto">
            {intendedCourseTitle 
              ? 'Sign in or register to complete your enrollment for ' + intendedCourseTitle
              : 'Access your coursework, lecture modules, and evaluated projects.'}
          </p>

          {/* Tab Selector */}
          <div className="mt-2.5 sm:mt-3 grid grid-cols-2 p-1 bg-slate-800 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => { setActiveTab('login'); setErrorMsg(''); }}
              className={'py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ' +
                (activeTab === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-400 hover:text-white')}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('register'); setErrorMsg(''); }}
              className={'py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ' +
                (activeTab === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-400 hover:text-white')}
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Form Container with Guaranteed dvh Bounding & Pinned Actions */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {activeTab === 'login' ? (
            /* SIGN IN FORM */
            <form onSubmit={handleLoginSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3 text-xs thin-scrollbar">
                {errorMsg && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                    {errorMsg}
                  </div>
                )}

                <div>
                  <label className="font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="Enter your registered email address"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full px-3 py-2 pr-10 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1"
                      aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Sample Credentials Autofill */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Quick Fill:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleAutofill('admin@aaroha-inc.com', 'password123')}
                      className="hover:text-slate-800 underline cursor-pointer"
                    >
                      Faculty
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => handleAutofill('elena.rostova@enterprise.io', 'password123')}
                      className="hover:text-slate-800 underline cursor-pointer"
                    >
                      Student
                    </button>
                  </div>
                </div>
              </div>

              {/* Pinned Action Button */}
              <div className="shrink-0 p-3.5 sm:p-4 bg-white border-t border-slate-100 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
                <button
                  type="submit"
                  className="w-full py-2.5 sm:py-3 bg-[#0A7CB3] hover:bg-[#086491] text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Access Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            /* REGISTRATION FORM */
            <form onSubmit={handleRegisterSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-2.5 text-xs thin-scrollbar">
                {errorMsg && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                    {errorMsg}
                  </div>
                )}

                <div>
                  <label className="font-semibold text-slate-700 flex items-center gap-1.5 mb-0.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your legal full name"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    className="w-full px-3 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 flex items-center gap-1.5 mb-0.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    Corporate / Official Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="Enter your official email address"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    className="w-full px-3 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 flex items-center gap-1.5 mb-0.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    Set Password
                  </label>
                  <div className="relative">
                    <input
                      type={showRegisterPassword ? 'text' : 'password'}
                      required
                      placeholder="Create a password (minimum 8 characters)"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      className="w-full px-3 py-1.5 sm:py-2 pr-10 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1"
                      aria-label={showRegisterPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Designation / Role:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRegisterRole('student')}
                      className={'py-1.5 px-2 rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ' +
                        (registerRole === 'student'
                          ? 'bg-[#0A7CB3] text-white font-bold border-[#0A7CB3] shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100')}
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span className="font-semibold">Student / Fellow</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRegisterRole('admin')}
                      className={'py-1.5 px-2 rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ' +
                        (registerRole === 'admin'
                          ? 'bg-[#0A7CB3] text-white font-bold border-[#0A7CB3] shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100')}
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span className="font-semibold">Faculty</span>
                    </button>
                  </div>
                </div>

                {/* 3D Animated Preset Avatar Selection */}
                <div>
                  <label className="font-semibold text-slate-700 flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>Choose 3D Character Avatar</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">Male & Female 3D Characters</span>
                  </label>
                  <div className="grid grid-cols-8 gap-1 p-1.5 bg-slate-50 rounded-xl border border-slate-200 max-h-24 sm:max-h-28 overflow-y-auto thin-scrollbar">
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

              {/* Pinned Action Button - NEVER CROPPED */}
              <div className="shrink-0 p-3.5 sm:p-4 bg-white border-t border-slate-100 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
                <button
                  type="submit"
                  className="w-full py-2.5 sm:py-3 bg-[#0A7CB3] hover:bg-[#086491] text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Create Account</span>
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
