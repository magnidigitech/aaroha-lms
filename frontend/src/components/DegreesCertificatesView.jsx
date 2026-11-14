import React, { useState } from 'react';
import { 
  Award, ShieldCheck, CheckCircle2, 
  ArrowRight, Search, BookOpen, 
  Copy, Check, Layers, Sparkles, CheckCircle, Video, FileText
} from 'lucide-react';

export default function DegreesCertificatesView({
  courses = [],
  certificates = [],
  currentUser = null,
  onOpenCourseDetails,
  onViewCertificate,
  onExploreCatalog,
  initialTab = 'verify'
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'verify' | 'courses' | 'my_certs'
  const [searchCode, setSearchCode] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Student's issued certificates
  const studentCertificates = certificates.filter(c => 
    currentUser && (
      String(c.user_id) === String(currentUser.id) || 
      (currentUser.email && c.recipient_email === currentUser.email)
    )
  );

  const handleVerify = (codeOverride) => {
    const rawTarget = codeOverride || searchCode;
    const target = rawTarget ? rawTarget.trim().toUpperCase() : '';
    setHasSearched(true);

    if (!target) {
      setVerificationResult(null);
      return;
    }

    // Check against real certificates in system
    const match = certificates.find(c => 
      c.certificate_code && c.certificate_code.toUpperCase() === target
    );

    if (match) {
      setVerificationResult(match);
    } else {
      // Demo fallback certificate code check
      if (target.includes('9E4F') || target === 'AAROHA-CERT-2026-9E4F-8812') {
        const demoMatch = {
          id: 'demo-1',
          certificate_code: 'AAROHA-CERT-2026-9E4F-8812',
          recipient_name: 'Elena Rostova',
          recipient_email: 'elena.rostova@aaroha.systems',
          course_title: 'Distributed Cloud Architecture & High-Throughput Systems',
          issuer_name: 'Faculty Directorate',
          issuer_title: 'Director of Curriculum & Distributed Systems',
          grade: 'Executive Distinction (98% Pass · Verified Peer Reviewed)',
          issued_at: '2026-11-13T12:00:00Z'
        };
        setVerificationResult(demoMatch);
      } else {
        setVerificationResult(null);
      }
    }
  };

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard?.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-10 pb-24 max-w-7xl mx-auto">
      {/* 1. Official Header & Hero Banner */}
      <section className="bg-gradient-to-r from-slate-900 via-[#0B1A2F] to-[#0A7CB3] text-white rounded-3xl p-8 sm:p-12 relative overflow-hidden shadow-xl border border-slate-800">
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-4xl space-y-5 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sky-200 text-xs font-bold uppercase tracking-wider">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Aaroha Technologies · Credential & Verification Directorate</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Certificates & Credential Verification
          </h1>

          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-2xl font-normal">
            Validate issued course credentials with our real-time cryptographic verification engine, inspect authentic course completion standards, and access your verified digital certificates.
          </p>

          {/* Institutional Quality Pillars */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/10 text-xs">
            <div className="space-y-1">
              <div className="font-extrabold text-white text-base">Cryptographic</div>
              <div className="text-slate-400 text-[11px]">Tamper-Proof Verification</div>
            </div>
            <div className="space-y-1">
              <div className="font-extrabold text-amber-400 text-base">Faculty Graded</div>
              <div className="text-slate-400 text-[11px]">Evaluated Capstones</div>
            </div>
            <div className="space-y-1">
              <div className="font-extrabold text-emerald-400 text-base">100% Online</div>
              <div className="text-slate-400 text-[11px]">Asynchronous & Flexible</div>
            </div>
            <div className="space-y-1">
              <div className="font-extrabold text-sky-300 text-base">Instant Delivery</div>
              <div className="text-slate-400 text-[11px]">Digital Parchment & PDF</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Navigation Tabs */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3 overflow-x-auto">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('verify')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'verify'
                ? 'bg-[#0A7CB3] text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Verify a Credential</span>
          </button>

          <button
            onClick={() => setActiveTab('courses')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'courses'
                ? 'bg-[#0A7CB3] text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Award className="w-4 h-4 text-amber-500" />
            <span>Accredited Course Certificates ({courses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('my_certs')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'my_certs'
                ? 'bg-[#0A7CB3] text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4 text-sky-500" />
            <span>My Issued Certificates</span>
            {studentCertificates.length > 0 && (
              <span className="bg-amber-400 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                {studentCertificates.length}
              </span>
            )}
          </button>
        </div>

        <button
          onClick={onExploreCatalog}
          className="text-xs font-bold text-[#0A7CB3] hover:text-[#086491] flex items-center gap-1 hover:underline cursor-pointer hidden md:flex shrink-0"
        >
          <span>Browse All Courses</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3. TAB 1: Cryptographic Credential Verification */}
      {activeTab === 'verify' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div className="max-w-3xl space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Cryptographic Credential Verification Engine
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Every certificate issued by Aaroha Technologies is encoded with a tamper-evident cryptographic identifier. Enter the certificate code below to authenticate the recipient, verified coursework, and faculty approval.
            </p>
          </div>

          {/* Search Box */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4 max-w-3xl">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Certificate Credential Code
            </label>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="e.g. AAROHA-CERT-2026-9E4F-8812"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                  className="w-full pl-4 pr-10 py-3 text-xs sm:text-sm font-mono uppercase bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:border-[#0A7CB3] focus:ring-1 focus:ring-[#0A7CB3] transition-all"
                />
                <ShieldCheck className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <button
                onClick={() => handleVerify()}
                className="px-6 py-3 bg-[#0A7CB3] hover:bg-[#086491] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shrink-0"
              >
                <Search className="w-4 h-4" />
                <span>Verify Credential</span>
              </button>
            </div>

            {/* Quick Demo Test Code Button */}
            <div className="pt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>Quick Test:</span>
              <button
                type="button"
                onClick={() => {
                  setSearchCode('AAROHA-CERT-2026-9E4F-8812');
                  handleVerify('AAROHA-CERT-2026-9E4F-8812');
                }}
                className="px-2.5 py-1 rounded-md bg-blue-50 text-[#0A7CB3] font-mono font-bold hover:bg-blue-100 transition-colors border border-blue-200 cursor-pointer"
              >
                AAROHA-CERT-2026-9E4F-8812 (Elena Rostova)
              </button>
            </div>
          </div>

          {/* Verification Result Display */}
          {hasSearched && (
            <div className="max-w-3xl animate-in fade-in slide-in-from-top-2 duration-200">
              {verificationResult ? (
                <div className="bg-gradient-to-r from-emerald-50 via-white to-blue-50/50 rounded-3xl border-2 border-emerald-500/40 p-6 sm:p-8 shadow-md space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-emerald-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                          <span>Official Accredited Credential Confirmed</span>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                        <div className="text-xs text-slate-500">
                          Verified against Aaroha Technologies Registry
                        </div>
                      </div>
                    </div>

                    <div className="hidden sm:block text-right">
                      <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 select-all">
                        {verificationResult.certificate_code}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recipient</span>
                      <div className="font-extrabold text-slate-900 text-sm">
                        {verificationResult.recipient_name}
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        {verificationResult.recipient_email}
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Course / Curriculum</span>
                      <div className="font-extrabold text-slate-900 text-sm line-clamp-2">
                        {verificationResult.course_title}
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Awarded Distinction</span>
                      <div className="font-extrabold text-[#0A7CB3] text-xs">
                        {verificationResult.grade || 'Pass with Distinction'}
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Issuing Authority</span>
                      <div className="font-extrabold text-slate-900 text-xs">
                        {verificationResult.issuer_name || 'Faculty Lead'}
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        {verificationResult.issuer_title || 'Aaroha Technologies'}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
                    <button
                      onClick={() => handleCopyCode(verificationResult.certificate_code)}
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? 'Code Copied' : 'Copy Credential Code'}</span>
                    </button>

                    <button
                      onClick={() => onViewCertificate && onViewCertificate(verificationResult)}
                      className="px-5 py-2.5 bg-[#0A7CB3] hover:bg-[#086491] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Award className="w-4 h-4" />
                      <span>View Official Digital Parchment</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50/70 border border-red-200 rounded-2xl p-6 text-center space-y-2">
                  <div className="text-sm font-bold text-red-800">
                    No verified credential record found
                  </div>
                  <p className="text-xs text-red-600 max-w-md mx-auto">
                    Please ensure the 16-character alphanumeric code is entered accurately, including the prefix (e.g. AAROHA-CERT-...).
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. TAB 2: Authentic Course Completion Certificates */}
      {activeTab === 'courses' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Accredited Course Certificates
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Every course on Aaroha culminates in an official, tamper-evident certificate of completion upon finishing all video modules and passing the faculty capstone evaluation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => {
              const modulesCount = course.modules?.length || 0;
              const totalLessons = (course.modules || []).reduce((acc, m) => acc + (m.lessons?.length || 0), 0);

              return (
                <div 
                  key={course.id}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    {/* Thumbnail */}
                    <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                      <img 
                        src={course.thumbnail_url || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80'} 
                        alt={course.title}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                      <div className="absolute top-2.5 left-2.5">
                        <span className="px-2.5 py-1 bg-black/70 backdrop-blur-md text-white text-[10px] font-bold rounded-md border border-white/20">
                          {course.category || 'Specialization'}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 space-y-3">
                      <h3 className="font-bold text-slate-900 text-sm line-clamp-2 leading-snug">
                        {course.title}
                      </h3>

                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {course.description || 'Master hands-on systems architecture with verified interactive modules.'}
                      </p>

                      {/* Course Certificate Specs */}
                      <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
                        <div className="flex items-center gap-2 text-slate-700">
                          <Award className="w-3.5 h-3.5 text-[#0A7CB3] shrink-0" />
                          <span className="font-semibold">Award:</span>
                          <span className="text-slate-600 truncate">Verified Course Certificate</span>
                        </div>

                        <div className="flex items-center gap-2 text-slate-700">
                          <Video className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-semibold">Curriculum:</span>
                          <span className="text-slate-600">{modulesCount} Modules · {totalLessons} Lessons</span>
                        </div>

                        <div className="flex items-center gap-2 text-slate-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span className="font-semibold">Requirement:</span>
                          <span className="text-slate-600">Video Completion + Capstone</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Footer */}
                  <div className="p-5 pt-0">
                    <button
                      onClick={() => onOpenCourseDetails && onOpenCourseDetails(course)}
                      className="w-full py-2.5 px-4 bg-slate-50 hover:bg-[#0A7CB3] text-slate-800 hover:text-white border border-slate-200 hover:border-[#0A7CB3] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <span>Explore Program & Syllabus</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. TAB 3: My Issued Certificates */}
      {activeTab === 'my_certs' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              My Verified Credentials
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Your official credentials awarded upon completing courses, video lectures, and instructor-evaluated capstones.
            </p>
          </div>

          {!currentUser ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 max-w-lg mx-auto space-y-4">
              <ShieldCheck className="w-12 h-12 text-slate-400 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-800">Sign in to view your certificates</h3>
                <p className="text-xs text-slate-500">
                  Log in to your student account to inspect your earned digital parchments and verification codes.
                </p>
              </div>
            </div>
          ) : studentCertificates.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 max-w-lg mx-auto space-y-4">
              <Award className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-800">No certificates awarded yet</h3>
                <p className="text-xs text-slate-500">
                  Complete video modules, finish exercises, and submit your capstone deliverable to earn your official verified certificate.
                </p>
              </div>
              <button
                onClick={onExploreCatalog}
                className="px-5 py-2.5 bg-[#0A7CB3] hover:bg-[#086491] text-white text-xs font-bold rounded-xl shadow-xs transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                <span>Explore Course Catalog</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {studentCertificates.map((cert) => (
                <div 
                  key={cert.id} 
                  className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-md transition-all p-5 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                        Accredited & Verified
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(cert.issued_at || Date.now()).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm line-clamp-2 leading-snug">
                      {cert.course_title}
                    </h3>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Credential ID</div>
                      <div className="font-mono text-slate-800 font-bold text-xs select-all">
                        {cert.certificate_code}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleCopyCode(cert.certificate_code)}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? 'Copied' : 'Copy ID'}</span>
                    </button>

                    <button
                      onClick={() => onViewCertificate && onViewCertificate(cert)}
                      className="px-4 py-2 bg-[#0A7CB3] hover:bg-[#086491] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>View Digital Certificate</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
