import React, { useState, useEffect } from 'react';
import { X, Lock, Eye, EyeOff, ShieldCheck, AlertCircle, ArrowRight, CheckCircle2, UserCheck } from 'lucide-react';
import aarohaLogo from '../assets/aaroha_logo.webp';
import { api } from '../apiService';

export default function AccountActivationModal({ isOpen, token, onClose, onSuccess }) {
  const [loading, setLoading] = useState(true);
  const [tokenUser, setTokenUser] = useState(null);
  const [verificationError, setVerificationError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (!isOpen || !token) return;

    setLoading(true);
    setVerificationError('');
    setActionError('');

    api.verifyInvitation(token)
      .then(res => {
        if (res && res.success && res.user) {
          setTokenUser(res.user);
        } else {
          setVerificationError(res?.error || 'Invalid or revoked invitation token.');
        }
      })
      .catch(err => {
        setVerificationError(err.message || 'Unable to verify invitation link. It may have expired or been revoked.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, token]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionError('');

    if (password.length < 8) {
      setActionError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setActionError('Passwords do not match. Please re-enter.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.activateAccount({ token, password });
      if (res && res.success) {
        onSuccess(res.user, res.token);
        onClose();
      } else {
        setActionError(res?.error || 'Failed to activate account.');
      }
    } catch (err) {
      setActionError(err.message || 'Error occurred during account activation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-2xl sm:rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92dvh] animate-in fade-in zoom-in-95 duration-150">
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
              <img src={aarohaLogo} alt="Aaroha Technologies" className="h-6 w-auto object-contain" />
            </div>
          </div>

          <h2 className="text-lg sm:text-xl font-extrabold text-white">
            Activate Your Institutional Account
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
            Set your secure password to complete onboarding and access your workspace.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {loading ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <div className="w-7 h-7 border-2 border-slate-300 border-t-[#0A7CB3] rounded-full animate-spin mx-auto"></div>
              <p className="font-medium">Validating cryptographic invitation token...</p>
            </div>
          ) : verificationError ? (
            <div className="space-y-4 py-4 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 text-sm">Invitation Unavailable</h3>
                <p className="text-slate-600 text-xs leading-relaxed max-w-sm mx-auto">
                  {verificationError}
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors cursor-pointer"
                >
                  Return to Home
                </button>
              </div>
            </div>
          ) : tokenUser ? (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Recipient Identity Banner */}
              <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 space-y-1.5 text-slate-700">
                <div className="flex items-center gap-1.5 font-bold text-sky-900 text-xs">
                  <UserCheck className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>Verified Recipient Roster Entry</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-sky-100">
                  <div>
                    <span className="text-slate-400 block">Name:</span>
                    <span className="font-semibold text-slate-900">{tokenUser.full_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">ID Code:</span>
                    <span className="font-mono font-semibold text-[#0A7CB3]">{tokenUser.id_code}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block">Authorized Email:</span>
                    <span className="font-mono text-slate-800">{tokenUser.email}</span>
                  </div>
                </div>
              </div>

              {actionError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                  {actionError}
                </div>
              )}

              {/* Password Fields */}
              <div>
                <label className="font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  Create Password (Min 8 Characters) *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="Enter your new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A7CB3] focus:bg-white text-xs text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  Confirm Password *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A7CB3] focus:bg-white text-xs text-slate-900"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 bg-[#0A7CB3] hover:bg-[#086491] disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <span>Activating Account...</span>
                  ) : (
                    <>
                      <span>Activate Account & Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
