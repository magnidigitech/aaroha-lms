import React, { useState } from 'react';
import { X, Lock, Mail, User, Shield, GraduationCap, ArrowRight, ShieldCheck, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import aarohaLogo from '../assets/aaroha_logo.webp';

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
      full_name: registerName,
      email: registerEmail,
      password: registerPassword,
      role: registerRole
    });
    onClose();
  };

  const handleAutofill = (email, password) => {
    setLoginEmail(email);
    setLoginPassword(password);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 p-6 text-white text-center relative border-b border-slate-800">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="mb-3 flex justify-center">
            <div className="inline-flex bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs items-center">
              <img
                src={aarohaLogo}
                alt="Aaroha Technologies"
                className="h-7 w-auto object-contain"
              />
            </div>
          </div>

          <h2 className="text-xl font-extrabold text-white">
            {activeTab === 'login' ? 'Sign In to Your Workspace' : 'Create an Account'}
          </h2>

          <p className="text-xs text-slate-400 mt-1">
            {intendedCourseTitle 
              ? 'Sign in or register to complete your enrollment for ' + intendedCourseTitle
              : 'Access your coursework, lecture modules, and evaluated projects.'}
          </p>

          {/* Tab Selector */}
          <div className="mt-5 grid grid-cols-2 p-1 bg-slate-800 rounded-xl border border-slate-700">
            <button
              onClick={() => { setActiveTab('login'); setErrorMsg(''); }}
              className={'py-2 text-xs font-bold rounded-lg transition-colors ' +
                (activeTab === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-400 hover:text-white')}
            >
              Sign In
            </button>
            <button
              onClick={() => { setActiveTab('register'); setErrorMsg(''); }}
              className={'py-2 text-xs font-bold rounded-lg transition-colors ' +
                (activeTab === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-400 hover:text-white')}
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {activeTab === 'login' ? (
            /* SIGN IN FORM */
            <form onSubmit={handleLoginSubmit} className="space-y-3.5 text-xs">
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
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
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
                    className="w-full p-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
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

              <button
                type="submit"
                className="w-full py-3 bg-[#0056D2] hover:bg-[#00419e] text-white font-bold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 mt-2"
              >
                <span>Access Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Sample Credentials Autofill */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Quick Fill:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleAutofill('admin@aaroha-inc.com', 'password123')}
                    className="hover:text-slate-800 underline"
                  >
                    Faculty
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => handleAutofill('elena.rostova@enterprise.io', 'password123')}
                    className="hover:text-slate-800 underline"
                  >
                    Student
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* REGISTRATION FORM */
            <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter your legal full name"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  Corporate / Official Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="Enter your official email address"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
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
                    className="w-full p-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
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
                    className={'p-2 rounded-xl border text-center transition-all ' +
                      (registerRole === 'student'
                        ? 'bg-[#0056D2] text-white font-bold border-[#0056D2]'
                        : 'bg-slate-50 border-slate-200 text-slate-600')}
                  >
                    <GraduationCap className="w-4 h-4 mx-auto mb-0.5" />
                    <span>Student / Fellow</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegisterRole('admin')}
                    className={'p-2 rounded-xl border text-center transition-all ' +
                      (registerRole === 'admin'
                        ? 'bg-[#0056D2] text-white font-bold border-[#0056D2]'
                        : 'bg-slate-50 border-slate-200 text-slate-600')}
                  >
                    <Shield className="w-4 h-4 mx-auto mb-0.5" />
                    <span>Faculty Director</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#0056D2] hover:bg-[#00419e] text-white font-bold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 mt-3"
              >
                <span>Create Account</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
