import React, { useState } from 'react';
import {
  Award, CheckCircle2, AlertTriangle, ExternalLink, Download,
  RotateCcw, ShieldCheck, Search, PlusCircle, X, RefreshCw
} from 'lucide-react';
import { formatDate } from '../../adminUtils';
import api from '../../apiService';

export default function AdminCertificatesTab({
  certificates = [],
  students = [],
  courses = [],
  onIssueCertificate,
  onRevokeCertificate,
  onViewCertificate,
  onRefreshCertificates
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [revokeModalCert, setRevokeModalCert] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');

  // Reissue modal state
  const [reissueModalCert, setReissueModalCert] = useState(null);
  const [reissueData, setReissueData] = useState({
    recipient_name: '',
    grade: '',
    reissue_reason: ''
  });
  const [isSubmittingReissue, setIsSubmittingReissue] = useState(false);

  const [newCert, setNewCert] = useState({
    course_id: '',
    user_id: '',
    recipient_name: '',
    recipient_email: '',
    grade: 'Executive Verified Distinction'
  });

  const filteredCerts = certificates.filter(c => {
    return !searchTerm ||
      (c.certificate_code && c.certificate_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.recipient_name && c.recipient_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.course_title && c.course_title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.previous_certificate_code && c.previous_certificate_code.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    if (!newCert.course_id || !newCert.recipient_name) return;

    await onIssueCertificate(newCert.course_id, newCert);
    setIsIssueModalOpen(false);
    setNewCert({
      course_id: '',
      user_id: '',
      recipient_name: '',
      recipient_email: '',
      grade: 'Executive Verified Distinction'
    });
    if (onRefreshCertificates) onRefreshCertificates();
  };

  const handleCommitRevocation = async () => {
    if (!revokeModalCert || !revokeReason) return;
    if (onRevokeCertificate) {
      await onRevokeCertificate(revokeModalCert.certificate_code, { reason: revokeReason });
    }
    setRevokeModalCert(null);
    setRevokeReason('');
    if (onRefreshCertificates) onRefreshCertificates();
  };

  const handleOpenReissue = (cert) => {
    setReissueModalCert(cert);
    setReissueData({
      recipient_name: cert.recipient_name || '',
      grade: cert.grade || 'Executive Verified Distinction',
      reissue_reason: 'Legal recipient name or distinction correction'
    });
  };

  const handleCommitReissue = async (e) => {
    e.preventDefault();
    if (!reissueModalCert || !reissueData.reissue_reason) return;
    setIsSubmittingReissue(true);
    try {
      await api.adminReissueCertificate(reissueModalCert.id, reissueData);
      setReissueModalCert(null);
      if (onRefreshCertificates) onRefreshCertificates();
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Accredited Digital Certificates</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Issue cryptographically verified credentials, inspect public verification hashes, and manage reissuances.
          </p>
        </div>

        <button
          onClick={() => setIsIssueModalOpen(true)}
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
            placeholder="Search by certificate code, recipient, or program..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 placeholder-slate-400 text-xs focus:outline-hidden focus:border-blue-500"
          />
        </div>
      </div>

      {/* Certificates Table */}
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
              <th className="py-3 px-4">Credential Code</th>
              <th className="py-3 px-4">Recipient Graduate</th>
              <th className="py-3 px-4">Program</th>
              <th className="py-3 px-4">Conferred Grade</th>
              <th className="py-3 px-4">Date Conferred</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filteredCerts.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-12 text-center text-slate-500">
                  No digital certificates found matching search.
                </td>
              </tr>
            ) : (
              filteredCerts.map(cert => (
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
                  <td className="py-3 px-4 text-slate-800 font-medium">
                    {cert.course_title}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-200 font-mono text-[10px]">
                      {cert.grade || 'Verified Completion'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    <div>{formatDate(cert.issued_at || cert.created_at)}</div>
                    {cert.reissued_at && (
                      <span className="text-[10px] text-amber-700 font-medium">Reissued</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onViewCertificate && onViewCertificate(cert)}
                        className="px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs flex items-center gap-1 cursor-pointer"
                        title="Inspect Certificate"
                      >
                        <ExternalLink size={12} /> Inspect
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenReissue(cert)}
                        className="px-2 py-1 rounded bg-sky-50 hover:bg-sky-100 text-[#0a7cb3] border border-sky-200 text-xs flex items-center gap-1 cursor-pointer font-medium"
                        title="Reissue Credential with New Tracking Code"
                      >
                        <RefreshCw size={12} /> Reissue
                      </button>
                      <button
                        type="button"
                        onClick={() => setRevokeModalCert(cert)}
                        className="p-1.5 rounded text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Revoke Credential"
                      >
                        <RotateCcw size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Issue Modal */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Issue Digital Certificate</h2>
              <button onClick={() => setIsIssueModalOpen(false)} className="text-slate-500 hover:text-slate-900 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleIssueSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Accredited Program *</label>
                <select
                  required
                  value={newCert.course_id}
                  onChange={e => setNewCert({ ...newCert, course_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
                >
                  <option value="">-- Choose Program --</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Recipient Student Fellow *</label>
                <select
                  value={newCert.user_id}
                  onChange={e => {
                    const stu = students.find(s => String(s.user_id) === String(e.target.value));
                    setNewCert({
                      ...newCert,
                      user_id: e.target.value,
                      recipient_name: stu ? stu.full_name : '',
                      recipient_email: stu ? stu.email : ''
                    });
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
                >
                  <option value="">-- Select Enrolled Fellow --</option>
                  {students.map(s => (
                    <option key={s.user_id} value={s.user_id}>{s.full_name} ({s.student_id_code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Legal Recipient Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Full name as printed on certificate"
                  value={newCert.recipient_name}
                  onChange={e => setNewCert({ ...newCert, recipient_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Conferred Distinction / Grade</label>
                <input
                  type="text"
                  value={newCert.grade}
                  onChange={e => setNewCert({ ...newCert, grade: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsIssueModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md cursor-pointer"
                >
                  Issue Digital Certificate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reissue Modal */}
      {reissueModalCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
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
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Distinction / Conferred Grade</label>
                <input
                  type="text"
                  value={reissueData.grade}
                  onChange={e => setReissueData({ ...reissueData, grade: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
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
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
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
                  className="px-4 py-1.5 rounded-lg bg-[#0a7cb3] hover:bg-[#086491] disabled:opacity-40 text-white font-semibold shadow-md cursor-pointer"
                >
                  {isSubmittingReissue ? 'Reissuing...' : 'Confirm Reissue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revocation Warning Modal */}
      {revokeModalCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
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
                Upon revocation, public verification searches for this credential hash will report as Invalid / Revoked.
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
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-rose-500"
              ></textarea>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setRevokeModalCert(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={!revokeReason}
                onClick={handleCommitRevocation}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-semibold cursor-pointer"
              >
                Confirm Revocation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
