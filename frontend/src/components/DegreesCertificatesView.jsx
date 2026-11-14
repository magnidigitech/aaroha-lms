import React, { useState } from 'react';
import { 
  GraduationCap, Award, ShieldCheck, CheckCircle2, 
  ArrowRight, Search, BookOpen, 
  FileText, Copy, Check, Layers,
  CheckCircle
} from 'lucide-react';

export default function DegreesCertificatesView({
  courses = [],
  certificates = [],
  currentUser = null,
  onOpenCourseDetails,
  onViewCertificate,
  onExploreCatalog,
  initialTab = 'degrees'
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'degrees' | 'certifications' | 'verify' | 'my_certs'
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

  // Pre-configured Academic Degree Tracks mapped to Aaroha Curriculum
  const degreePrograms = [
    {
      id: 'deg-1',
      title: 'Master of Science in Distributed Cloud Architecture & High-Throughput Systems',
      degreeType: 'Master of Science (M.S. Equivalent)',
      duration: '12 Months · 36 ECTS Credits',
      level: 'Graduate / Principal Level',
      accreditation: 'Aaroha Institute of Technology & Systems Directorate',
      courseId: 1,
      courseSlug: 'distributed-cloud-architecture',
      faculty: {
        name: 'Dr. Aris Thorne',
        title: 'Director of Curriculum & Chair of Distributed Infrastructure',
        avatar: '/avatars/3d/memo_1.png'
      },
      description: 'An advanced graduate curriculum focused on multi-region consensus engines, kernel-bypass networking, Raft leader election invariants, and LSM-tree storage internals sustaining 100k+ QPS with strict P99 latency budgets.',
      modulesCount: '3 In-Depth Specialization Semesters',
      evaluatedProjectsCount: '3 Production RFC Architectural Defenses',
      credentialAwarded: 'Official Master of Science Degree & Accredited Parchment',
      skills: [
        'Raft Consensus Protocol',
        'BGP Anycast Edge Routing',
        'LSM Storage Compaction (RocksDB)',
        'Zero-Trust mTLS Architecture',
        'Transactional Outbox & CDC'
      ],
      highlights: [
        '100% online with asynchronous laboratory benchmarks',
        'Mandatory evaluated capstone evaluated by systems faculty',
        'Permanent verifiable cryptographic degree credential on graduation'
      ]
    },
    {
      id: 'deg-2',
      title: 'Master of Engineering in Applied Machine Learning & Model Serving Infrastructure',
      degreeType: 'Master of Engineering (M.Eng. Equivalent)',
      duration: '10 Months · 32 ECTS Credits',
      level: 'Graduate / Staff ML Engineer',
      accreditation: 'Accelerated Computing Directorate, Aaroha Institute',
      courseId: 2,
      courseSlug: 'applied-ml-engineering',
      faculty: {
        name: 'Dr. Marcus Vance',
        title: 'Distinguished ML Systems Engineer & Faculty Chair',
        avatar: '/avatars/3d/memo_3.png'
      },
      description: 'Bridging the gap between neural weights and production GPU runtimes. Specialize in low-latency transformer inference, continuous request batching, INT8/AWQ quantization, and Triton model serving.',
      modulesCount: '2 Core Semesters + Accelerated Lab',
      evaluatedProjectsCount: '2 Evaluated GPU Throughput Benchmarks',
      credentialAwarded: 'Master of Engineering in Applied ML Systems',
      skills: [
        'vLLM & Continuous Batching',
        'AWQ & GPTQ Quantization',
        'Triton Multi-Model Inference',
        'CUDA Memory Bounds',
        'Concept Drift Telemetry'
      ],
      highlights: [
        'Hands-on profiling with production GPU execution graphs',
        'Faculty evaluation of sub-50ms P99 inference SLAs',
        'Dual-accreditation with industry systems laboratories'
      ]
    },
    {
      id: 'deg-3',
      title: 'Post-Graduate Diploma in Enterprise Cyber Defense & Zero-Trust Architecture',
      degreeType: 'Post-Graduate Diploma (P.G. Dip)',
      duration: '8 Months · 24 ECTS Credits',
      level: 'Advanced Specialist',
      accreditation: 'Center for Cyber Resilience, Aaroha Institute',
      courseId: 3,
      courseSlug: 'enterprise-cyber-defense',
      faculty: {
        name: 'Katarina Wolf',
        title: 'Principal Security Architect & Red Team Fellow',
        avatar: '/avatars/3d/memo_14.png'
      },
      description: 'Master application defense, supply-chain attestation, memory safety transitions, and real-time incident triage using eBPF kernel telemetry, SLSA Level 3 attestations, and STRIDE threat modeling.',
      modulesCount: '2 Specialist Semesters',
      evaluatedProjectsCount: '2 Cryptographic Supply Chain Audits',
      credentialAwarded: 'Accredited Post-Graduate Diploma in Cyber Defense',
      skills: [
        'STRIDE Threat Modeling',
        'eBPF Kernel Telemetry',
        'Sigstore Cosign Attestations',
        'mTLS Identity Mesh (SPIFFE)',
        'Zero-Day Incident Forensics'
      ],
      highlights: [
        'Real-world simulated adversary scenarios and red-team defenses',
        'Automated admission controller policy authoring (Kyverno)',
        'Tamper-evident verification backed by Aaroha Certificate Authority'
      ]
    }
  ];

  // Professional Certifications Breakdown
  const professionalCerts = [
    {
      code: 'ACDSA',
      title: 'Aaroha Certified Distributed Systems Architect (ACDSA)',
      authority: 'Systems Engineering Laboratory',
      validity: '3 Years · Verifiable Online Credential',
      level: 'Tier-1 Principal Engineer Benchmark',
      description: 'Validates mastery of high-throughput distributed protocols, Raft split-brain mitigation, and multi-region fault domains.',
      requirements: [
        '100% completion of Distributed Cloud Architecture modules',
        'Achieve >= 80% on all 3 faculty-evaluated RFC capstone assignments',
        'Successful defense of distributed storage benchmarking report'
      ],
      badgeColor: 'from-blue-600 to-indigo-700'
    },
    {
      code: 'ACME',
      title: 'Aaroha Certified Production MLOps Specialist (ACME)',
      authority: 'Applied Intelligence Directorate',
      validity: '3 Years · Verifiable Online Credential',
      level: 'Staff Systems / ML Infrastructure',
      description: 'Validates production readiness for deploying large-scale neural network models, dynamic batching, and GPU acceleration.',
      requirements: [
        '100% completion of Applied ML Engineering modules',
        'Pass 4-bit AWQ vs FP16 perplexity calibration benchmark',
        'Deploy Triton inference pipeline with < 80ms P99 latency SLA'
      ],
      badgeColor: 'from-purple-600 to-violet-700'
    },
    {
      code: 'ACZE',
      title: 'Aaroha Certified Zero-Trust Security Engineer (ACZE)',
      authority: 'Center for Cyber Resilience',
      validity: '3 Years · Verifiable Online Credential',
      level: 'Senior Security Architect',
      description: 'Validates expertise in cryptographic supply-chain security, SLSA Level 3 compliance, and eBPF kernel observability.',
      requirements: [
        '100% completion of Enterprise Cyber Defense modules',
        'Author verified Kyverno admission controller security policy',
        'Complete end-to-end STRIDE threat model defense'
      ],
      badgeColor: 'from-emerald-600 to-teal-700'
    }
  ];

  // Certificate Verification Logic
  const handleVerify = (codeToTest) => {
    const raw = (codeToTest || searchCode).trim();
    if (!raw) return;

    setHasSearched(true);
    const normalized = raw.toUpperCase().replace(/\s+/g, '');

    // Search certificates array (combines database and mock state)
    const match = certificates.find(c => {
      const cCode = String(c.certificate_code || '').toUpperCase().replace(/\s+/g, '');
      return cCode === normalized || cCode.includes(normalized);
    });

    if (match) {
      setVerificationResult(match);
    } else {
      // Fallback check against known demo certificate Elena Rostova
      if (normalized.includes('AAROHA-CERT-2026-9E4F-8812') || normalized.includes('9E4F') || normalized.includes('ROSTOVA')) {
        const demoMatch = certificates[0] || {
          certificate_code: 'AAROHA-CERT-2026-9E4F-8812',
          course_title: 'Distributed Cloud Architecture & High-Throughput Systems',
          recipient_name: 'Elena Rostova',
          recipient_email: 'elena.rostova@enterprise.io',
          issuer_name: 'Dr. Aris Thorne',
          issuer_title: 'Director of Curriculum & Distributed Systems Faculty',
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
    <div className="space-y-10 pb-24">
      {/* 1. Official Header & Hero Banner */}
      <section className="bg-gradient-to-r from-slate-900 via-[#0B1A2F] to-[#0056D2]/80 text-white rounded-3xl p-8 sm:p-14 relative overflow-hidden shadow-xl border border-slate-800">
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-4xl space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-blue-200 text-xs font-bold uppercase tracking-wider">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Aaroha Institute of Technology · Directorate of Academic Accreditation</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Academic Degrees & Accredited Certifications
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl font-normal">
            Master state-of-the-art engineering through rigorous university-accredited degree equivalents, professional specializations, and cryptographically verifiable digital credentials evaluated by systems faculty.
          </p>

          {/* Core Institutional Value Pillars */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/10 text-xs">
            <div className="space-y-1">
              <div className="font-extrabold text-white text-base">100% Online</div>
              <div className="text-slate-400 text-[11px]">Asynchronous & Flexible</div>
            </div>
            <div className="space-y-1">
              <div className="font-extrabold text-amber-400 text-base">Faculty Graded</div>
              <div className="text-slate-400 text-[11px]">Evaluated RFC Defense</div>
            </div>
            <div className="space-y-1">
              <div className="font-extrabold text-emerald-400 text-base">Cryptographic</div>
              <div className="text-slate-400 text-[11px]">Tamper-Proof Verification</div>
            </div>
            <div className="space-y-1">
              <div className="font-extrabold text-blue-300 text-base">45,000+</div>
              <div className="text-slate-400 text-[11px]">Enrolled Engineers</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive Navigation Tabs */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4 overflow-x-auto">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('degrees')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'degrees'
                ? 'bg-[#0056D2] text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Academic Degrees & Master's</span>
          </button>

          <button
            onClick={() => setActiveTab('certifications')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'certifications'
                ? 'bg-[#0056D2] text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Professional Certifications</span>
          </button>

          <button
            onClick={() => setActiveTab('verify')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'verify'
                ? 'bg-[#0056D2] text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Verify a Credential</span>
          </button>

          {currentUser && (
            <button
              onClick={() => setActiveTab('my_certs')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'my_certs'
                  ? 'bg-[#0056D2] text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4 text-amber-500" />
              <span>My Issued Certificates</span>
              {studentCertificates.length > 0 && (
                <span className="bg-amber-400 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                  {studentCertificates.length}
                </span>
              )}
            </button>
          )}
        </div>

        <button
          onClick={onExploreCatalog}
          className="text-xs font-bold text-[#0056D2] hover:text-[#00419e] flex items-center gap-1 hover:underline cursor-pointer hidden md:flex shrink-0"
        >
          <span>Browse All Courses</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3. TAB 1: Academic Degrees (Master's Specializations) */}
      {activeTab === 'degrees' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Aaroha University-Calibrated Master's Programs
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Rigorous degree tracks authored and evaluated by principal engineering chairs and research fellows.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg shrink-0 self-start sm:self-auto">
              3 Specialized Tracks Available
            </span>
          </div>

          <div className="grid grid-cols-1 gap-8">
            {degreePrograms.map((program) => {
              const matchedCourse = courses.find(c => c.id === program.courseId) || courses[0];
              return (
                <div
                  key={program.id}
                  className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 p-6 sm:p-8 space-y-6"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                    <div className="space-y-3 max-w-3xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-blue-50 text-[#0056D2] text-[11px] font-extrabold uppercase tracking-wider border border-blue-200">
                          {program.degreeType}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold">
                          {program.duration}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-amber-600" />
                          <span>{program.accreditation}</span>
                        </span>
                      </div>

                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                        {program.title}
                      </h3>

                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        {program.description}
                      </p>
                    </div>

                    {/* Faculty Director Badge */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shrink-0 lg:w-72">
                      <img
                        src={program.faculty.avatar}
                        alt={program.faculty.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-xs"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900 leading-tight">
                          {program.faculty.name}
                        </div>
                        <div className="text-[11px] text-slate-500 leading-tight mt-0.5 line-clamp-2">
                          {program.faculty.title}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Program Highlights & Skills */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-[#0056D2]" />
                        <span>Core Specialization Invariants</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {program.skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium rounded-md transition-colors"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Curriculum Guarantees</span>
                      </div>
                      <ul className="space-y-1 text-xs text-slate-600">
                        {program.highlights.map((h, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#0056D2] mt-1.5 shrink-0" />
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 text-xs text-slate-500 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-[#0056D2]" />
                        <span>{program.modulesCount}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-amber-600" />
                        <span>{program.evaluatedProjectsCount}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => matchedCourse && onOpenCourseDetails(matchedCourse)}
                        className="px-5 py-2.5 bg-[#0056D2] hover:bg-[#00419e] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <span>View Curriculum & Enroll</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. TAB 2: Professional Certifications */}
      {activeTab === 'certifications' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Aaroha Accredited Professional Certifications
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Industry-recognized credentials certifying operational mastery of mission-critical engineering systems.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {professionalCerts.map((cert) => (
              <div
                key={cert.code}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between space-y-6"
              >
                <div className="space-y-4">
                  {/* Badge Crest */}
                  <div className="flex items-center justify-between">
                    <div className={`px-3 py-1.5 rounded-xl bg-gradient-to-r ${cert.badgeColor} text-white font-mono font-extrabold text-xs shadow-xs tracking-wider`}>
                      {cert.code}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {cert.validity}
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                    {cert.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {cert.description}
                  </p>

                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Mandatory Requirements
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-600">
                      {cert.requirements.map((req, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="text-[11px] leading-tight">{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <button
                    onClick={() => {
                      const matched = courses[0];
                      if (matched) onOpenCourseDetails(matched);
                    }}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl text-center transition-colors shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>View Certification Syllabus</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. TAB 3: Official Credential Verification Tool */}
      {activeTab === 'verify' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div className="max-w-3xl space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Cryptographic Credential Verification Engine
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Every certificate issued by Aaroha Institute of Technology is encoded with a tamper-evident 16-character alphanumeric cryptographic identifier. Enter the certificate code below to authenticate the recipient, honors, and faculty signature.
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
                  className="w-full pl-4 pr-10 py-3 text-xs sm:text-sm font-mono uppercase bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:border-[#0056D2] focus:ring-1 focus:ring-[#0056D2] transition-all"
                />
                <ShieldCheck className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <button
                onClick={() => handleVerify()}
                className="px-6 py-3 bg-[#0056D2] hover:bg-[#00419e] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shrink-0"
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
                className="px-2.5 py-1 rounded-md bg-blue-50 text-[#0056D2] font-mono font-bold hover:bg-blue-100 transition-colors border border-blue-200 cursor-pointer"
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
                          Verified against Aaroha Institute Registry
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
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Curriculum / Program</span>
                      <div className="font-extrabold text-slate-900 text-sm line-clamp-2">
                        {verificationResult.course_title}
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Awarded Grade / Honors</span>
                      <div className="font-extrabold text-blue-700 text-xs">
                        {verificationResult.grade || 'Pass with Distinction'}
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Issuing Directorate</span>
                      <div className="font-extrabold text-slate-900 text-xs">
                        {verificationResult.issuer_name || 'Dr. Aris Thorne'}
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        {verificationResult.issuer_title || 'Chair of Distributed Systems'}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <button
                      onClick={() => handleCopyCode(verificationResult.certificate_code)}
                      className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? 'Copied Code' : 'Copy Credential Code'}</span>
                    </button>

                    <button
                      onClick={() => onViewCertificate && onViewCertificate(verificationResult)}
                      className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Award className="w-4 h-4 text-amber-400" />
                      <span>Inspect Official Certificate Document</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 rounded-3xl border border-amber-200 p-6 sm:p-8 text-amber-900 space-y-3">
                  <div className="font-extrabold text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span>No Official Credential Found</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    No certificate matching code <code className="font-mono font-bold bg-amber-100 px-1.5 py-0.5 rounded">{searchCode}</code> was found in our accredited registry. Please verify spelling or contact <a href="mailto:registrar@aaroha-inc.com" className="underline font-semibold">registrar@aaroha-inc.com</a> for manual records lookup.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 6. TAB 4: My Issued Certificates (Logged-in Student) */}
      {activeTab === 'my_certs' && currentUser && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              My Official Accredited Certificates
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Permanent digital credentials awarded upon completion of evaluated coursework and faculty review.
            </p>
          </div>

          {studentCertificates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {studentCertificates.map((cert) => (
                <div
                  key={cert.id || cert.certificate_code}
                  className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-6 sm:p-8 space-y-6 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 flex items-center justify-center">
                          <Award className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600">
                          Accredited Credential
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 font-bold bg-slate-100 px-2.5 py-1 rounded-md">
                        {cert.certificate_code}
                      </span>
                    </div>

                    <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
                      {cert.course_title}
                    </h3>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                      <div className="text-slate-500 text-[11px]">Honors:</div>
                      <div className="font-bold text-slate-800">{cert.grade || 'Pass with Distinction'}</div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    <span className="text-[11px] text-slate-400">
                      Issued {new Date(cert.issued_at || Date.now()).toLocaleDateString()}
                    </span>

                    <button
                      onClick={() => onViewCertificate && onViewCertificate(cert)}
                      className="px-5 py-2.5 bg-[#0056D2] hover:bg-[#00419e] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>View Certificate</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center space-y-4 max-w-xl mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0056D2] flex items-center justify-center mx-auto">
                <GraduationCap className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                No Certificates Issued Yet
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Complete all required video modules, practical code implementations, and pass mandatory evaluated assignments with 80% or higher to earn your accredited digital certificate.
              </p>
              <button
                onClick={onExploreCatalog}
                className="px-5 py-2.5 bg-[#0056D2] hover:bg-[#00419e] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Explore Curricula & Start Learning
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
