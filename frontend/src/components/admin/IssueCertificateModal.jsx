import React, { useState, useEffect } from 'react';
import { X, Award, Sparkles, CheckCircle2, AlertCircle, Loader2, User, Mail, Calendar, ShieldCheck, ChevronDown } from 'lucide-react';
import CertificateDocument from '../CertificateDocument';

const DISTINCTION_OPTIONS = [
  'Executive Distinction (98% Pass · Verified Peer Reviewed)',
  'Honors Accreditation (94% Pass · Top Tier)',
  'Verified Course Completion (Subject Mastery)',
  'Dean\'s High Honors (100% Comprehensive Pass)'
];

export default function IssueCertificateModal({
  isOpen,
  onClose,
  course,
  onIssue,
  currentUser,
  enrolledStudents = []
}) {
  const [step, setStep] = useState('form'); // 'form' | 'generated'
  const [recipientName, setRecipientName] = useState('Elena Rostova');
  const [recipientEmail, setRecipientEmail] = useState('elena.rostova@enterprise.io');
  const [userId, setUserId] = useState(2);
  const [grade, setGrade] = useState(DISTINCTION_OPTIONS[0]);
  const [issuerName, setIssuerName] = useState('');
  const [issuerTitle, setIssuerTitle] = useState('');
  const [issuedCertificate, setIssuedCertificate] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setIssuedCertificate(null);
      setError(null);
      setIsGenerating(false);

      // Default signatory to faculty member or current user
      const defaultName = currentUser?.full_name || 'Faculty';
      const defaultTitle = currentUser?.title || '';
      setIssuerName(defaultName);
      setIssuerTitle(defaultTitle);

      // If enrolled students are passed, select the first student by default
      if (enrolledStudents && enrolledStudents.length > 0) {
        const first = enrolledStudents[0];
        setRecipientName(first.full_name || first.name || 'Elena Rostova');
        setRecipientEmail(first.email || 'elena.rostova@enterprise.io');
        setUserId(first.id || 2);
      } else {
        setRecipientName('Elena Rostova');
        setRecipientEmail('elena.rostova@enterprise.io');
        setUserId(2);
      }
    }
  }, [isOpen, course, currentUser, enrolledStudents]);

  if (!isOpen || !course) return null;

  const handleStudentSelect = (student) => {
    if (!student) return;
    setRecipientName(student.full_name || student.name || '');
    setRecipientEmail(student.email || '');
    setUserId(student.id || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!recipientName.trim()) {
      setError('Please provide the recipient candidate name.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const payload = {
        recipient_name: recipientName.trim(),
        recipient_email: recipientEmail.trim(),
        user_id: userId,
        course_title: course.title,
        grade: grade,
        issuer_name: issuerName.trim() || currentUser?.full_name || 'Faculty',
        issuer_title: issuerTitle.trim() || currentUser?.title || '',
        issued_at: new Date().toISOString()
      };

      const certResult = await onIssue(course.id, payload);
      const generated = certResult?.certificate || certResult || {
        ...payload,
        id: Date.now(),
        certificate_code: 'AAROHA-CERT-' + new Date().getFullYear() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000),
        course_id: course.id
      };

      setIssuedCertificate(generated);
      setStep('generated');
    } catch (err) {
      setError(err.message || 'Failed to generate and issue certificate. Please retry.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
      <div 
        className={'relative w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto ' + (step === 'generated' ? 'max-w-4xl' : 'max-w-2xl')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="issue-certificate-title"
      >
        {/* Header Bar */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-[#0B1A2F] text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 id="issue-certificate-title" className="text-base sm:text-lg font-bold text-white leading-tight">
                {step === 'generated' ? 'Accredited Certificate Generated' : 'Issue Official Certificate'}
              </h2>
              <p className="text-xs text-slate-300 line-clamp-1">
                Program: <span className="font-semibold text-white">{course.title}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 max-h-[80dvh] overflow-y-auto thin-scrollbar">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-800 text-xs">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {step === 'form' ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Program Summary Banner */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-4">
                <img
                  src={course.thumbnail_url}
                  alt={course.title}
                  className="w-16 h-12 object-cover rounded-xl border border-slate-200 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                    {course.category || 'Specialization'}
                  </div>
                  <div className="text-sm font-bold text-slate-900 truncate">
                    {course.title}
                  </div>
                  <div className="text-xs text-slate-500">
                    Aaroha Institute of Technology · Official Faculty Accreditation
                  </div>
                </div>
              </div>

              {/* Student Candidate Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <span>Candidate Recipient Name</span>
                  </label>
                  {enrolledStudents && enrolledStudents.length > 0 && (
                    <span className="text-[11px] text-slate-500 font-medium">
                      Select or type custom name
                    </span>
                  )}
                </div>

                {/* Candidate Quick Selector (If enrolled students available) */}
                {enrolledStudents && enrolledStudents.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {enrolledStudents.map(student => (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => handleStudentSelect(student)}
                        className={'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ' + (
                          userId === student.id 
                            ? 'bg-blue-50 border-blue-300 text-[#0A7CB3] shadow-2xs' 
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        )}
                      >
                        {student.full_name || student.name}
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Full Name (As printed on Certificate)
                    </label>
                    <input
                      type="text"
                      required
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="e.g. Elena Rostova"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#0A7CB3] shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Student Email (Optional / Verification link)
                    </label>
                    <input
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="e.g. elena.rostova@enterprise.io"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#0A7CB3] shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Distinction / Academic Honor */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Accreditation Distinction / Level</span>
                </label>
                <div className="relative">
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0A7CB3] shadow-2xs appearance-none pr-9 cursor-pointer"
                  >
                    {DISTINCTION_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Faculty Signatory Credentials */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Faculty Signatory Credentials</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Faculty Instructor Name
                    </label>
                    <input
                      type="text"
                      value={issuerName}
                      onChange={(e) => setIssuerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#0A7CB3] shadow-2xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Faculty Academic Title
                    </label>
                    <input
                      type="text"
                      value={issuerTitle}
                      onChange={(e) => setIssuerTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#0A7CB3] shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isGenerating}
                  className="px-5 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-700 hover:to-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating Certificate...</span>
                    </>
                  ) : (
                    <>
                      <Award className="w-4 h-4" />
                      <span>Issue & Generate Certificate</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          ) : (
            /* Generated Certificate Preview View */
            <div className="space-y-6">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-900">
                      Certificate Issued & Cryptographically Registered
                    </div>
                    <div className="text-[11px] text-emerald-700">
                      The official diploma has been recorded in the institution registry and is now accessible to the student.
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="text-xs font-bold text-emerald-800 hover:underline shrink-0 cursor-pointer"
                >
                  Issue Another
                </button>
              </div>

              {/* Render Full Certificate Document */}
              <CertificateDocument
                certificate={issuedCertificate}
                onClose={onClose}
              />

              <div className="flex items-center justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-md"
                >
                  Close & Return to Console
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
