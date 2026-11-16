import React, { useState } from 'react';
import { X, Lock, Mail, ArrowRight, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import aarohaLogo from '../assets/aaroha_logo.webp';

export default function AuthModal({ isOpen, onClose, onLogin, intendedCourseTitle }) {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    const success = onLogin(loginEmail, loginPassword);
    if (!success) {
      setErrorMsg('Invalid email or password. Please verify your institutional credentials.');
    } else {
      onClose();
    }
  };

  const handleAutofill = (email, password) => {
    setLoginEmail(email);
    setLoginPassword(password);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-2xl sm:rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92dvh] sm:max-h-[90dvh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="shrink-0 bg-slate-900 px-5 py-4 sm:px-6 sm:py-5 text-white text-center relative border-b border-slate-800">
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="mb-2 flex justify-center">
            <div className="inline-flex bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-xs items-center">
              <img
                src={aarohaLogo}
                alt="Aaroha Technologies"
                className="h-5.5 sm:h-6 w-auto object-contain"
              />
            </div>
          </div>

          <h2 className="text-lg sm:text-xl font-extrabold text-white">
            Sign In to Your Workspace
          </h2>

          <p className="text-[11px] sm:text-xs text-slate-400 mt-1 line-clamp-2 max-w-xs mx-auto">
            {intendedCourseTitle 
              ? 'Sign in with your authorized credentials to access ' + intendedCourseTitle
              : 'Access your coursework, lecture modules, and evaluated projects.'}
          </p>
        </div>

        {/* Institutional Onboarding Notice */}
        <div className="bg-sky-50/70 border-b border-sky-100 px-4 py-2.5 flex items-start gap-2.5 text-[11px] text-sky-800">
          <ShieldAlert className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <span className="font-bold">Institutional Access:</span> Public self-registration is disabled. All student and faculty accounts are provisioned exclusively by the platform administrator.
          </p>
        </div>

        {/* Form Container */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <form onSubmit={handleLoginSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3.5 text-xs thin-scrollbar">
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
                  placeholder="Enter your registered institutional email"
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

              {/* Sample Credentials Quick Autofill */}
              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-medium">Demo Access:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleAutofill('admin@aaroha-inc.com', 'password123')}
                    className="text-[#0A7CB3] hover:text-[#086491] font-semibold underline cursor-pointer"
                  >
                    Faculty
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => handleAutofill('elena.rostova@enterprise.io', 'password123')}
                    className="text-[#0A7CB3] hover:text-[#086491] font-semibold underline cursor-pointer"
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
        </div>
      </div>
    </div>
  );
}
