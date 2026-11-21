import React, { useState, useEffect, useMemo } from 'react';
import {
  Award, CheckCircle2, AlertTriangle, ExternalLink, Download,
  RotateCcw, ShieldCheck, Search, PlusCircle, X, RefreshCw,
  FileText, Check, Copy, ChevronRight, User, BookOpen, Layers,
  Clock, AlertCircle, Eye, Sparkles, Filter
} from 'lucide-react';
import { formatDate } from '../../adminUtils';
import api from '../../apiService';
import CertificateDocument from '../CertificateDocument';
import { getRouteParam, setRouteParam, removeRouteParam } from '../../routes';

export default function AdminCertificatesTab({
  certificates = [],
  students = [],
  courses = [],
  batches = [],
  onIssueCertificate,
  onRevokeCertificate,
  onViewCertificate,
  onRefreshCertificates
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Inspection / Document Viewer Modal State
  const [inspectModalCert, setInspectModalCert] = useState(() => {
    try {
      const saved = sessionStorage.getItem('aaroha_admin_inspect_cert');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (inspectModalCert) {
        sessionStorage.setItem('aaroha_admin_inspect_cert', JSON.stringify(inspectModalCert));
        setRouteParam('cert', inspectModalCert.id || inspectModalCert.certificate_code);
      } else {
        sessionStorage.removeItem('aaroha_admin_inspect_cert');
        removeRouteParam('cert');
      }
    } catch (e) {}
  }, [inspectModalCert]);

  // Revocation Modal State
  const [revokeModalCert, setRevokeModalCert] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [isSubmittingRevoke, setIsSubmittingRevoke] = useState(false);

  // Reissue Modal State
  const [reissueModalCert, setReissueModalCert] = useState(null);
  const [reissueData, setReissueData] = useState({
    recipient_name: '',
    grade: '',
    reissue_reason: ''
  });
  const [isSubmittingReissue, setIsSubmittingReissue] = useState(false);

  // 7-Stage Issue Certificate Modal State
  const [issueModal, setIssueModal] = useState({
    isOpen: false,
    step: 1, // 1: Select Cohort & Student + Eligibility Check, 2: Styling & Signatories, 3: Mandatory Personalised Preview
    course_id: '',
    batch_id: '',
    user_id: '',
    recipient_name: '',
    recipient_email: '',
    grade: 'Highest Executive Distinction',
    template_id: 'classic-distinction',
    training_hours: '120 Hours Intensive Practicum',
    signatory_faculty_name: 'Dr. Sarah Chen',
    signatory_faculty_title: 'Head of Distributed Systems',
    signatory_dean_name: 'Dr. Marcus Vance',
    signatory_dean_title: 'Dean of Curriculum & Review',
    override_eligibility: false,
    override_reason: '',

    // Dynamic cohort students
    batchStudents: [],
    isBatchStudentsLoading: false,

    // Real-time Eligibility Verification
    isCheckingEligibility: false,
    eligibility: null,
    eligibilityError: '',

    // Mandatory Preview State
    isGeneratingPreview: false,
    previewToken: null,
    previewCert: null,
    previewError: '',

    // Final Issuance State
    isIssuing: false,
    issueError: '',
    issuedCert: null
  });

  const [copiedCode, setCopiedCode] = useState(null);

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Filtered certificates list
  const filteredCerts = certificates.filter(c => {
    const matchesSearch = !searchTerm ||
      (c.certificate_code && c.certificate_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.recipient_name && c.recipient_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.course_title && c.course_title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.previous_certificate_code && c.previous_certificate_code.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCourse = courseFilter === 'all' || String(c.course_id) === String(courseFilter);
    const matchesStatus = statusFilter === 'all' || (c.status || 'valid') === statusFilter;

    return matchesSearch && matchesCourse && matchesStatus;
  });

  // Available batches for selected course in modal
  const availableBatchesForModal = useMemo(() => {
    if (!issueModal.course_id) return [];
    return batches.filter(b => String(b.course_id) === String(issueModal.course_id));
  }, [batches, issueModal.course_id]);

  // Load students when batch is selected in modal
  const handleSelectBatch = async (batchId) => {
    setIssueModal(prev => ({
      ...prev,
      batch_id: batchId,
      user_id: '',
      recipient_name: '',
      recipient_email: '',
      eligibility: null,
      eligibilityError: '',
      previewToken: null,
      previewCert: null,
      isBatchStudentsLoading: true
    }));

    if (!batchId) {
      setIssueModal(prev => ({ ...prev, batchStudents: [], isBatchStudentsLoading: false }));
      return;
    }

    try {
      const res = await api.adminGetBatchStudents(batchId);
      const list = res && res.students ? res.students : [];
      setIssueModal(prev => ({
        ...prev,
        batchStudents: list,
        isBatchStudentsLoading: false
      }));
    } catch (err) {
      console.warn('Failed to load batch students:', err);
      // Fallback: match students with this batch_id
      const fallbackList = students.filter(s => String(s.batch_id) === String(batchId));
      setIssueModal(prev => ({
        ...prev,
        batchStudents: fallbackList,
        isBatchStudentsLoading: false
      }));
    }
  };

  // Select student and evaluate real-time eligibility
  const handleSelectStudent = async (userId) => {
    if (!userId) {
      setIssueModal(prev => ({
        ...prev,
        user_id: '',
        recipient_name: '',
        recipient_email: '',
        eligibility: null,
        eligibilityError: '',
        previewToken: null,
        previewCert: null
      }));
      return;
    }

    const st = issueModal.batchStudents.find(s => String(s.user_id) === String(userId)) ||
      students.find(s => String(s.user_id) === String(userId) || String(s.id) === String(userId));

    const recipientName = st ? (st.full_name || st.name || '') : '';
    const recipientEmail = st ? (st.email || '') : '';

    setIssueModal(prev => ({
      ...prev,
      user_id: userId,
      recipient_name: recipientName,
      recipient_email: recipientEmail,
      isCheckingEligibility: true,
      eligibility: null,
      eligibilityError: '',
      previewToken: null,
      previewCert: null
    }));

    try {
      const res = await api.adminGetCertificateEligibility(issueModal.course_id, userId, issueModal.batch_id);
      setIssueModal(prev => ({
        ...prev,
        isCheckingEligibility: false,
        eligibility: res
      }));
    } catch (err) {
      setIssueModal(prev => ({
        ...prev,
        isCheckingEligibility: false,
        eligibilityError: err.message || 'Failed to evaluate cohort eligibility standards.'
      }));
    }
  };

  // Generate Mandatory Personalised Preview
  const handleGeneratePreview = async () => {
    setIssueModal(prev => ({ ...prev, isGeneratingPreview: true, previewError: '' }));

    const payload = {
      course_id: issueModal.course_id,
      batch_id: issueModal.batch_id,
      user_id: issueModal.user_id,
      recipient_name: issueModal.recipient_name,
      grade: issueModal.grade,
      template_id: issueModal.template_id,
      training_hours: issueModal.training_hours,
      signatory_faculty_name: issueModal.signatory_faculty_name,
      signatory_faculty_title: issueModal.signatory_faculty_title,
      signatory_dean_name: issueModal.signatory_dean_name,
      signatory_dean_title: issueModal.signatory_dean_title
    };

    try {
      const res = await api.adminPreviewCertificate(payload);
      if (res && res.success && res.certificate) {
        setIssueModal(prev => ({
          ...prev,
          isGeneratingPreview: false,
          previewToken: res.preview_token,
          previewCert: res.certificate,
          step: 3
        }));
      } else {
        throw new Error(res?.error || 'Failed to render certificate preview.');
      }
    } catch (err) {
      setIssueModal(prev => ({
        ...prev,
        isGeneratingPreview: false,
        previewError: err.message || 'Error generating preview certificate.'
      }));
    }
  };

  // Confirm and Formally Issue Certificate
  const handleConfirmIssue = async () => {
    if (!issueModal.previewToken) {
      setIssueModal(prev => ({ ...prev, issueError: 'Mandatory preview must be validated before issuance.' }));
      return;
    }

    setIssueModal(prev => ({ ...prev, isIssuing: true, issueError: '' }));

    const payload = {
      preview_token: issueModal.previewToken,
      course_id: issueModal.course_id,
      batch_id: issueModal.batch_id,
      user_id: issueModal.user_id,
      recipient_name: issueModal.recipient_name,
      grade: issueModal.grade,
      template_id: issueModal.template_id,
      training_hours: issueModal.training_hours,
      signatory_faculty_name: issueModal.signatory_faculty_name,
      signatory_faculty_title: issueModal.signatory_faculty_title,
      signatory_dean_name: issueModal.signatory_dean_name,
      signatory_dean_title: issueModal.signatory_dean_title,
      override_eligibility: issueModal.override_eligibility,
      override_reason: issueModal.override_reason
    };

    try {
      const res = await api.adminIssueCertificate(payload);
      if (res && res.success && res.certificate) {
        setIssueModal(prev => ({
          ...prev,
          isIssuing: false,
          issuedCert: res.certificate
        }));
        if (onRefreshCertificates) await onRefreshCertificates();
      } else {
        throw new Error(res?.error || 'Server rejected certificate issuance.');
      }
    } catch (err) {
      setIssueModal(prev => ({
        ...prev,
        isIssuing: false,
        issueError: err.message || 'Issuance failed. Please check student eligibility or existing credentials.'
      }));
    }
  };

  // Reset Issue Modal
  const handleCloseIssueModal = () => {
    setIssueModal({
      isOpen: false,
      step: 1,
      course_id: '',
      batch_id: '',
      user_id: '',
      recipient_name: '',
      recipient_email: '',
      grade: 'Highest Executive Distinction',
      template_id: 'classic-distinction',
      training_hours: '120 Hours Intensive Practicum',
      signatory_faculty_name: 'Dr. Sarah Chen',
      signatory_faculty_title: 'Head of Distributed Systems',
      signatory_dean_name: 'Dr. Marcus Vance',
      signatory_dean_title: 'Dean of Curriculum & Review',
      override_eligibility: false,
      override_reason: '',
      batchStudents: [],
      isBatchStudentsLoading: false,
      isCheckingEligibility: false,
      eligibility: null,
      eligibilityError: '',
      isGeneratingPreview: false,
      previewToken: null,
      previewCert: null,
      previewError: '',
      isIssuing: false,
      issueError: '',
      issuedCert: null
    });
  };

  // Commit Revocation
  const handleCommitRevocation = async () => {
    if (!revokeModalCert || !revokeReason.trim()) return;
    setIsSubmittingRevoke(true);
    try {
      await api.adminRevokeCertificate(revokeModalCert.certificate_code || revokeModalCert.id, { reason: revokeReason });
      setRevokeModalCert(null);
      setRevokeReason('');
      if (onRefreshCertificates) await onRefreshCertificates();
    } catch (err) {
      alert('Failed to revoke certificate: ' + (err.message || 'Server error'));
    } finally {
      setIsSubmittingRevoke(false);
    }
  };

  // Commit Reissue
  const handleCommitReissue = async (e) => {
    e.preventDefault();
    if (!reissueModalCert || !reissueData.reissue_reason.trim()) return;
    setIsSubmittingReissue(true);
    try {
      await api.adminReissueCertificate(reissueModalCert.id, reissueData);
      setReissueModalCert(null);
      if (onRefreshCertificates) await onRefreshCertificates();
    } catch (err) {
      alert('Failed to reissue certificate: ' + (err.message || 'Server error'));
    } finally {
      setIsSubmittingReissue(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Accredited Digital Certificates</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Audit cohort completion eligibility, generate mandatory tamper-proof previews, and issue cryptographically verifiable credentials.
          </p>
        </div>

        <button
          onClick={() => setIssueModal(prev => ({ ...prev, isOpen: true }))}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0a7cb3] hover:bg-[#086491] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <PlusCircle size={15} /> Issue Certificate
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by credential code, student, or program..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 placeholder-slate-400 text-xs focus:outline-hidden focus:border-[#0a7cb3] focus:ring-1 focus:ring-[#0a7cb3]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Course Filter */}
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs focus:outline-hidden focus:border-[#0a7cb3] cursor-pointer"
          >
            <option value="all">All Courses</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs focus:outline-hidden focus:border-[#0a7cb3] cursor-pointer"
          >
            <option value="all">All Credential Statuses</option>
            <option value="valid">Valid / Issued</option>
            <option value="revoked">Revoked</option>
            <option value="reissued">Reissued</option>
          </select>
        </div>
      </div>

      {/* Certificates Registry Table */}
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
              <th className="py-3 px-4">Credential Code</th>
              <th className="py-3 px-4">Graduate Student</th>
              <th className="py-3 px-4">Program & Cohort</th>
              <th className="py-3 px-4">Conferred Distinction</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Date Conferred</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filteredCerts.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-12 text-center text-slate-500">
                  <Award size={28} className="mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-700">No accredited certificates found</p>
                  <p className="text-xs text-slate-400 mt-1">Use the "Issue Certificate" button above to evaluate eligibility and confer a new credential.</p>
                </td>
              </tr>
            ) : (
              filteredCerts.map(cert => {
                const isRevoked = cert.status === 'revoked';
                const isReissued = !!cert.reissued_at || cert.status === 'reissued';

                return (
                  <tr key={cert.id || cert.certificate_code} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-[#0A7CB3] block">
                        {cert.certificate_code}
                      </span>
                      {cert.previous_certificate_code && (
                        <span className="text-[10px] font-mono text-slate-500 block">
                          Prev: {cert.previous_certificate_code}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <strong className="text-slate-900 block">{cert.recipient_name}</strong>
                      <span className="text-[11px] text-slate-500">{cert.recipient_email}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-800">
                      <div className="font-medium text-slate-900">{cert.course_title}</div>
                      {cert.batch_code && (
                        <span className="font-mono text-[10px] text-slate-500">Cohort: {cert.batch_code}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-200 font-mono text-[10px]">
                        {cert.grade || 'Verified Completion'}
                      </span>
                      {cert.training_hours && (
                        <span className="block text-[10px] text-slate-500 mt-0.5">{cert.training_hours}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {isRevoked ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1 w-fit">
                          <X size={10} /> Revoked
                        </span>
                      ) : isReissued ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 w-fit">
                          <RefreshCw size={10} /> Reissued
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-fit">
                          <CheckCircle2 size={10} /> Valid
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      <div>{formatDate(cert.issued_at || cert.created_at)}</div>
                      {cert.reissued_at && (
                        <span className="text-[10px] text-amber-700 font-medium">Reissued: {formatDate(cert.reissued_at)}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Inspect Certificate */}
                        <button
                          type="button"
                          onClick={() => setInspectModalCert(cert)}
                          className="px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs flex items-center gap-1 cursor-pointer font-medium"
                          title="Inspect Official Credential"
                        >
                          <Eye size={12} /> Inspect
                        </button>

                        {/* Copy Public Verification Code */}
                        <button
                          type="button"
                          onClick={() => handleCopyCode(cert.certificate_code)}
                          className="p-1.5 rounded text-slate-500 hover:text-[#0a7cb3] hover:bg-sky-50 transition-colors cursor-pointer"
                          title="Copy Credential Verification ID"
                        >
                          {copiedCode === cert.certificate_code ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        </button>

                        {!isRevoked && (
                          <>
                            {/* Reissue Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setReissueModalCert(cert);
                                setReissueData({
                                  recipient_name: cert.recipient_name || '',
                                  grade: cert.grade || 'Highest Executive Distinction',
                                  reissue_reason: 'Legal recipient name or distinction amendment'
                                });
                              }}
                              className="px-2 py-1 rounded bg-sky-50 hover:bg-sky-100 text-[#0a7cb3] border border-sky-200 text-xs flex items-center gap-1 cursor-pointer font-medium"
                              title="Reissue Credential with New Tracking Code"
                            >
                              <RefreshCw size={12} /> Reissue
                            </button>

                            {/* Revoke Button */}
                            <button
                              type="button"
                              onClick={() => setRevokeModalCert(cert)}
                              className="p-1.5 rounded text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Revoke Credential"
                            >
                              <RotateCcw size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 7-STAGE ISSUE CERTIFICATE MODAL                               */}
      {/* ------------------------------------------------------------- */}
      {issueModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-xs">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 text-[#0a7cb3] flex items-center justify-center">
                  <Award size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Issue Digital Certificate</h2>
                  <p className="text-[11px] text-slate-500">
                    Step {issueModal.step} of 3: {issueModal.step === 1 ? 'Cohort Selection & Eligibility Audit' : issueModal.step === 2 ? 'Template Styling & Signatories' : 'Mandatory Personalised Preview'}
                  </p>
                </div>
              </div>
              <button onClick={handleCloseIssueModal} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4 custom-scrollbar">
              {issueModal.issueSuccess ? (
                /* Success View */
                <div className="p-6 text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                    <CheckCircle2 size={32} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-slate-900">Certificate Conferred Successfully!</h3>
                    <p className="text-slate-600 max-w-md mx-auto">
                      Official credential has been generated, signed, cryptographically logged, and made available directly in the student portal.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 max-w-md mx-auto space-y-2 text-left">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Recipient:</span>
                      <strong className="text-slate-900">{issueModal.issuedCert?.recipient_name}</strong>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Official Code:</span>
                      <span className="font-mono font-bold text-[#0a7cb3]">{issueModal.issuedCert?.certificate_code}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Conferred Grade:</span>
                      <span className="text-slate-800 font-medium">{issueModal.issuedCert?.grade}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const cert = issueModal.issuedCert;
                        handleCloseIssueModal();
                        if (cert) setInspectModalCert(cert);
                      }}
                      className="px-4 py-2 rounded-lg bg-[#0a7cb3] hover:bg-[#086491] text-white font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye size={14} /> Inspect Official Credential
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(issueModal.issuedCert?.certificate_code)}
                      className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Copy size={14} /> Copy Verification ID
                    </button>
                  </div>
                </div>
              ) : issueModal.step === 1 ? (
                /* STEP 1: Select Course, Batch, Student & Audit Eligibility */
                <div className="space-y-4">
                  {/* Select Course */}
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Select Program / Course *</label>
                    <select
                      value={issueModal.course_id}
                      onChange={e => {
                        const cId = e.target.value;
                        setIssueModal(prev => ({
                          ...prev,
                          course_id: cId,
                          batch_id: '',
                          user_id: '',
                          batchStudents: [],
                          eligibility: null
                        }));
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#0a7cb3]"
                    >
                      <option value="">-- Choose Accredited Course --</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>

                  {/* Select Cohort Batch */}
                  {issueModal.course_id && (
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Select Cohort Batch *</label>
                      <select
                        value={issueModal.batch_id}
                        onChange={e => handleSelectBatch(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#0a7cb3]"
                      >
                        <option value="">-- Choose Cohort Batch --</option>
                        {availableBatchesForModal.map(b => (
                          <option key={b.id} value={b.id}>
                            [{b.batch_code}] {b.title} ({b.delivery_mode})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Select Student */}
                  {issueModal.batch_id && (
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Select Candidate Student *</label>
                      {issueModal.isBatchStudentsLoading ? (
                        <div className="py-2 text-slate-500">Loading enrolled cohort members...</div>
                      ) : (
                        <select
                          value={issueModal.user_id}
                          onChange={e => handleSelectStudent(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#0a7cb3]"
                        >
                          <option value="">-- Choose Enrolled Learner --</option>
                          {issueModal.batchStudents.map(s => (
                            <option key={s.user_id} value={s.user_id}>
                              {s.full_name} ({s.email}) - {s.student_id_code}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {/* Real-time 5-Criterion Eligibility Assessment */}
                  {issueModal.user_id && (
                    <div className="pt-2 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 text-xs">Real-Time Academic Eligibility Assessment:</span>
                        {issueModal.isCheckingEligibility && (
                          <span className="text-[11px] text-slate-500 animate-pulse">Evaluating student records...</span>
                        )}
                      </div>

                      {issueModal.eligibility && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 gap-2">
                            {/* 1. Course Completion */}
                            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {issueModal.eligibility.criteria?.course_completion?.met ? (
                                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                                ) : (
                                  <AlertCircle size={16} className="text-rose-600 shrink-0" />
                                )}
                                <div>
                                  <strong className="text-slate-900 block text-xs">Course Curriculum Completion</strong>
                                  <span className="text-[11px] text-slate-500">
                                    {issueModal.eligibility.criteria?.course_completion?.completed_lessons || 0} / {issueModal.eligibility.criteria?.course_completion?.total_lessons || 0} lessons completed ({issueModal.eligibility.criteria?.course_completion?.percent || 0}%)
                                  </span>
                                </div>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                issueModal.eligibility.criteria?.course_completion?.met ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {issueModal.eligibility.criteria?.course_completion?.met ? 'Met' : 'Incomplete'}
                              </span>
                            </div>

                            {/* 2. Attendance Threshold */}
                            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {issueModal.eligibility.criteria?.attendance_threshold?.met ? (
                                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                                ) : (
                                  <AlertCircle size={16} className="text-rose-600 shrink-0" />
                                )}
                                <div>
                                  <strong className="text-slate-900 block text-xs">Cohort Attendance Threshold (&gt;= 75%)</strong>
                                  <span className="text-[11px] text-slate-500">
                                    {issueModal.eligibility.criteria?.attendance_threshold?.percent || 0}% attendance ({issueModal.eligibility.criteria?.attendance_threshold?.attended_sessions || 0}/{issueModal.eligibility.criteria?.attendance_threshold?.total_sessions || 0} sessions)
                                  </span>
                                </div>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                issueModal.eligibility.criteria?.attendance_threshold?.met ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {issueModal.eligibility.criteria?.attendance_threshold?.met ? 'Met' : 'Below 75%'}
                              </span>
                            </div>

                            {/* 3. Assessments */}
                            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {issueModal.eligibility.criteria?.assessments_passed?.met ? (
                                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                                ) : (
                                  <AlertCircle size={16} className="text-rose-600 shrink-0" />
                                )}
                                <div>
                                  <strong className="text-slate-900 block text-xs">Technical Assessments & Quizzes</strong>
                                  <span className="text-[11px] text-slate-500">
                                    {issueModal.eligibility.criteria?.assessments_passed?.passed_tasks || 0} / {issueModal.eligibility.criteria?.assessments_passed?.total_tasks || 0} graded tasks passed
                                  </span>
                                </div>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                issueModal.eligibility.criteria?.assessments_passed?.met ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {issueModal.eligibility.criteria?.assessments_passed?.met ? 'Met' : 'Pending'}
                              </span>
                            </div>

                            {/* 4. Project Completion */}
                            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {issueModal.eligibility.criteria?.project_completion?.met ? (
                                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                                ) : (
                                  <AlertCircle size={16} className="text-rose-600 shrink-0" />
                                )}
                                <div>
                                  <strong className="text-slate-900 block text-xs">Capstone Project Deliverable</strong>
                                  <span className="text-[11px] text-slate-500">
                                    {issueModal.eligibility.criteria?.project_completion?.approved_projects || 0} approved deliverable
                                  </span>
                                </div>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                issueModal.eligibility.criteria?.project_completion?.met ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {issueModal.eligibility.criteria?.project_completion?.met ? 'Met' : 'Pending'}
                              </span>
                            </div>

                            {/* 5. Academic Review Sign-off */}
                            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                                <div>
                                  <strong className="text-slate-900 block text-xs">Faculty & Dean Authorization</strong>
                                  <span className="text-[11px] text-slate-500">Authorized curriculum board verification</span>
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                Confirmed
                              </span>
                            </div>
                          </div>

                          {/* Overall Evaluation Banner */}
                          {issueModal.eligibility.eligible ? (
                            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                              <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
                              <div>
                                <span className="font-semibold block">All Academic Completion Standards Satisfied</span>
                                <span className="text-[11px] text-emerald-800">The learner meets all curriculum, attendance, and assessment benchmarks for accredited certification.</span>
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                              <div className="flex items-center gap-1.5 font-semibold text-amber-800">
                                <AlertTriangle size={15} />
                                <span>Academic Completion Criteria Incomplete</span>
                              </div>
                              <p className="text-[11px] text-amber-800">
                                One or more completion criteria have not been fully satisfied. You may record an official administrative override to proceed if approved by academic authority.
                              </p>

                              {/* Admin Override Controls */}
                              <div className="pt-2 border-t border-amber-200/80 space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer font-medium text-amber-900">
                                  <input
                                    type="checkbox"
                                    checked={issueModal.override_eligibility}
                                    onChange={e => setIssueModal(prev => ({ ...prev, override_eligibility: e.target.checked }))}
                                    className="rounded border-amber-400 text-[#0a7cb3] focus:ring-[#0a7cb3]"
                                  />
                                  <span>Grant Administrative Eligibility Override (Recorded in Audit Trail)</span>
                                </label>

                                {issueModal.override_eligibility && (
                                  <div>
                                    <label className="block text-slate-700 font-medium text-[11px] mb-1">
                                      Official Reason for Administrative Override *
                                    </label>
                                    <textarea
                                      required
                                      rows="2"
                                      placeholder="State reason (e.g. Industry practicum credit transfer approved by Curriculum Committee)"
                                      value={issueModal.override_reason}
                                      onChange={e => setIssueModal(prev => ({ ...prev, override_reason: e.target.value }))}
                                      className="w-full p-2 rounded-lg bg-white border border-amber-300 text-slate-900 text-xs focus:outline-hidden focus:border-amber-500"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : issueModal.step === 2 ? (
                /* STEP 2: Template Styling & Signatories */
                <div className="space-y-4">
                  {/* Template Selection */}
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Academic Certificate Template *</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setIssueModal(prev => ({ ...prev, template_id: 'classic-distinction' }))}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                          issueModal.template_id === 'classic-distinction'
                            ? 'border-[#0a7cb3] bg-sky-50/60 ring-1 ring-[#0a7cb3]'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <strong className="block text-slate-900 text-xs font-semibold">Classic Distinction</strong>
                        <span className="text-[10px] text-slate-500">Double filigree, traditional gold seal, formal serif font</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIssueModal(prev => ({ ...prev, template_id: 'modern-minimal' }))}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                          issueModal.template_id === 'modern-minimal'
                            ? 'border-[#0a7cb3] bg-sky-50/60 ring-1 ring-[#0a7cb3]'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <strong className="block text-slate-900 text-xs font-semibold">Modern Technical</strong>
                        <span className="text-[10px] text-slate-500">Contemporary typography with cyan accents and engineering seal</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIssueModal(prev => ({ ...prev, template_id: 'executive-credential' }))}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                          issueModal.template_id === 'executive-credential'
                            ? 'border-[#0a7cb3] bg-sky-50/60 ring-1 ring-[#0a7cb3]'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <strong className="block text-slate-900 text-xs font-semibold">Executive Fellow</strong>
                        <span className="text-[10px] text-slate-500">Deep navy seal & platinum accents for leadership practicum</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Legal Recipient Name *</label>
                      <input
                        type="text"
                        required
                        value={issueModal.recipient_name}
                        onChange={e => setIssueModal(prev => ({ ...prev, recipient_name: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#0a7cb3]"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Conferred Distinction / Grade *</label>
                      <input
                        type="text"
                        required
                        value={issueModal.grade}
                        onChange={e => setIssueModal(prev => ({ ...prev, grade: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#0a7cb3]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Training Hours / Practicum Duration</label>
                    <input
                      type="text"
                      placeholder="e.g. 120 Hours Intensive Practicum"
                      value={issueModal.training_hours}
                      onChange={e => setIssueModal(prev => ({ ...prev, training_hours: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#0a7cb3]"
                    />
                  </div>

                  {/* Signatories Configuration */}
                  <div className="pt-2 border-t border-slate-100 space-y-3">
                    <span className="font-semibold text-slate-900 block text-xs">Accredited Signatories:</span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-600 font-medium text-[11px] mb-1">Lead Faculty Signatory Name</label>
                        <input
                          type="text"
                          value={issueModal.signatory_faculty_name}
                          onChange={e => setIssueModal(prev => ({ ...prev, signatory_faculty_name: e.target.value }))}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-hidden focus:border-[#0a7cb3]"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-medium text-[11px] mb-1">Lead Faculty Title</label>
                        <input
                          type="text"
                          value={issueModal.signatory_faculty_title}
                          onChange={e => setIssueModal(prev => ({ ...prev, signatory_faculty_title: e.target.value }))}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-hidden focus:border-[#0a7cb3]"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-medium text-[11px] mb-1">Academic Dean Signatory Name</label>
                        <input
                          type="text"
                          value={issueModal.signatory_dean_name}
                          onChange={e => setIssueModal(prev => ({ ...prev, signatory_dean_name: e.target.value }))}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-hidden focus:border-[#0a7cb3]"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-medium text-[11px] mb-1">Academic Dean Title</label>
                        <input
                          type="text"
                          value={issueModal.signatory_dean_title}
                          onChange={e => setIssueModal(prev => ({ ...prev, signatory_dean_title: e.target.value }))}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-hidden focus:border-[#0a7cb3]"
                        />
                      </div>
                    </div>
                  </div>

                  {issueModal.previewError && (
                    <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                      {issueModal.previewError}
                    </div>
                  )}
                </div>
              ) : (
                /* STEP 3: Mandatory Personalised Preview */
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <ShieldCheck size={16} className="text-amber-700" />
                      <span>MANDATORY PERSONALISED PREVIEW VERIFIED</span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      The document below displays actual recipient data with watermark <strong className="font-mono text-rose-700">[PREVIEW — NOT ISSUED]</strong> and placeholder tracking code <strong className="font-mono">[PENDING ISSUANCE]</strong>.
                      Previewing does NOT create an active certificate record. Review carefully before confirming formal issuance.
                    </p>
                  </div>

                  {/* Render High-Fidelity Certificate Preview */}
                  <div className="border border-slate-200 rounded-2xl p-4 bg-slate-100/50 shadow-inner overflow-x-auto">
                    <CertificateDocument certificate={issueModal.previewCert} />
                  </div>

                  {issueModal.issueError && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                      <AlertCircle size={16} className="shrink-0 mt-0.5" />
                      <div>
                        <strong className="block">Issuance Error:</strong>
                        <span>{issueModal.issueError}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            {!issueModal.issueSuccess && (
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  {issueModal.step > 1 && (
                    <button
                      type="button"
                      onClick={() => setIssueModal(prev => ({ ...prev, step: prev.step - 1, issueError: '', previewError: '' }))}
                      className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold cursor-pointer hover:bg-slate-50"
                    >
                      Back
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCloseIssueModal}
                    className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>

                  {issueModal.step === 1 && (
                    <button
                      type="button"
                      disabled={
                        !issueModal.user_id ||
                        (!issueModal.eligibility?.eligible && (!issueModal.override_eligibility || !issueModal.override_reason.trim()))
                      }
                      onClick={() => setIssueModal(prev => ({ ...prev, step: 2 }))}
                      className="px-4 py-2 rounded-lg bg-[#0a7cb3] hover:bg-[#086491] disabled:opacity-40 text-white font-semibold cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Configure Styling</span>
                      <ChevronRight size={14} />
                    </button>
                  )}

                  {issueModal.step === 2 && (
                    <button
                      type="button"
                      disabled={issueModal.isGeneratingPreview || !issueModal.recipient_name.trim()}
                      onClick={handleGeneratePreview}
                      className="px-4 py-2 rounded-lg bg-[#0a7cb3] hover:bg-[#086491] disabled:opacity-40 text-white font-semibold cursor-pointer flex items-center gap-1.5"
                    >
                      <span>{issueModal.isGeneratingPreview ? 'Rendering Preview...' : 'Generate Personalised Preview'}</span>
                      <Eye size={14} />
                    </button>
                  )}

                  {issueModal.step === 3 && (
                    <button
                      type="button"
                      disabled={issueModal.isIssuing || !issueModal.previewToken}
                      onClick={handleConfirmIssue}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-semibold cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <CheckCircle2 size={15} />
                      <span>{issueModal.isIssuing ? 'Conferring Credential...' : 'Confirm & Formally Issue'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* INSPECT OFFICIAL CERTIFICATE MODAL                            */}
      {/* ------------------------------------------------------------- */}
      {inspectModalCert && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl shadow-2xl p-6 space-y-4 max-h-[95vh] overflow-y-auto text-xs custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Award size={20} className="text-[#0a7cb3]" />
                <h2 className="text-base font-bold text-slate-900">
                  Accredited Digital Certificate Document
                </h2>
              </div>
              <button onClick={() => setInspectModalCert(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <CertificateDocument certificate={inspectModalCert} />

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setInspectModalCert(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold cursor-pointer"
              >
                Close Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* REISSUE CREDENTIAL MODAL                                      */}
      {/* ------------------------------------------------------------- */}
      {reissueModalCert && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <RefreshCw size={18} className="text-[#0a7cb3]" />
                <h2 className="text-base font-bold text-slate-900">Reissue Digital Credential</h2>
              </div>
              <button onClick={() => setReissueModalCert(null)} className="text-slate-500 hover:text-slate-900 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <p className="text-slate-600 leading-relaxed">
              Reissuing will assign a newly generated accredited tracking code while preserving previous credential code <strong className="font-mono text-slate-900">{reissueModalCert.certificate_code}</strong> in the tamper-proof audit trail.
            </p>

            <form onSubmit={handleCommitReissue} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Legal Recipient Name *</label>
                <input
                  type="text"
                  required
                  value={reissueData.recipient_name}
                  onChange={e => setReissueData({ ...reissueData, recipient_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#0a7cb3]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Distinction / Conferred Grade</label>
                <input
                  type="text"
                  value={reissueData.grade}
                  onChange={e => setReissueData({ ...reissueData, grade: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#0a7cb3]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Reissue Audit Reason *</label>
                <textarea
                  required
                  rows="2"
                  placeholder="e.g. Legal name amendment, grade correction, replacement credential"
                  value={reissueData.reissue_reason}
                  onChange={e => setReissueData({ ...reissueData, reissue_reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#0a7cb3]"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReissueModalCert(null)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReissue || !reissueData.reissue_reason.trim()}
                  className="px-4 py-1.5 rounded-lg bg-[#0a7cb3] hover:bg-[#086491] disabled:opacity-40 text-white font-semibold shadow-xs cursor-pointer"
                >
                  {isSubmittingReissue ? 'Reissuing...' : 'Confirm Reissue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* REVOKE CREDENTIAL MODAL                                       */}
      {/* ------------------------------------------------------------- */}
      {revokeModalCert && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
              <AlertTriangle className="text-rose-700" size={20} />
              <h2 className="text-base font-bold text-slate-900">Revoke Accredited Credential</h2>
            </div>

            <p className="text-slate-700 text-sm">
              Are you certain you want to revoke credential <strong className="font-mono text-slate-900">{revokeModalCert.certificate_code}</strong> issued to <strong className="text-slate-900">{revokeModalCert.recipient_name}</strong>?
            </p>

            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
              <strong>Public Verification Impact:</strong>
              <p className="text-[11px]">
                Upon revocation, public verification searches for this credential hash will report as Formally Revoked with your recorded explanation.
              </p>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Administrative Reason for Revocation *</label>
              <textarea
                rows="2"
                required
                placeholder="State reason (e.g. Incomplete project deliverable, academic integrity flag)"
                value={revokeReason}
                onChange={e => setRevokeReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-rose-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRevokeModalCert(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!revokeReason.trim() || isSubmittingRevoke}
                onClick={handleCommitRevocation}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-semibold cursor-pointer"
              >
                {isSubmittingRevoke ? 'Revoking...' : 'Confirm Revocation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
