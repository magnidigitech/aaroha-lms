import React, { useState } from 'react';
import {
  ListTodo, CheckCircle2, Clock, AlertCircle, FileText,
  ExternalLink, GitBranch, Award, Check, X, Search, RotateCcw
} from 'lucide-react';
import { formatDateTime } from '../../adminUtils';

export default function AdminAssessmentsTab({
  taskSubmissions = [],
  courses = [],
  onGradeSubmission
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, under_review, passed, failed, resubmit_required

  // Grading Modal State
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [gradeScore, setGradeScore] = useState('85');
  const [gradeStatus, setGradeStatus] = useState('passed');
  const [gradeFeedback, setGradeFeedback] = useState('');

  const filteredSubmissions = taskSubmissions.filter(s => {
    const matchesSearch = !searchTerm ||
      (s.task_title && s.task_title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.student_name && s.student_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.course_title && s.course_title.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenGradeModal = (sub) => {
    setGradingSubmission(sub);
    setGradeScore(sub.score !== null && sub.score !== undefined ? String(sub.score) : '85');
    setGradeStatus(sub.status === 'under_review' ? 'passed' : sub.status);
    setGradeFeedback(sub.feedback || 'Deliverable satisfies architectural specification requirements.');
  };

  const handleCommitGrade = async () => {
    if (!gradingSubmission) return;
    await onGradeSubmission(gradingSubmission.id, {
      score: Number(gradeScore) || 0,
      status: gradeStatus,
      feedback: gradeFeedback
    });
    setGradingSubmission(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Assessments & Capstone Evaluations</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Review student architectural RFCs, GitHub repositories, and live demo links with structured rubrics.
          </p>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by student, project, or course..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs focus:outline-hidden focus:border-blue-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-hidden"
        >
          <option value="all">All Evaluation States</option>
          <option value="under_review">Under Review (Awaiting Evaluation)</option>
          <option value="passed">Passed (Threshold Met)</option>
          <option value="failed">Failed</option>
          <option value="resubmit_required">Resubmission Required</option>
        </select>
      </div>

      {/* Submissions Table */}
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold tracking-wider uppercase text-[11px]">
              <th className="py-3 px-4">Student Fellow</th>
              <th className="py-3 px-4">Project / Assignment</th>
              <th className="py-3 px-4">Artifact Submission</th>
              <th className="py-3 px-4">Evaluation Result</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filteredSubmissions.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-12 text-center text-slate-500">
                  No submissions found matching filter criteria.
                </td>
              </tr>
            ) : (
              filteredSubmissions.map(sub => (
                <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4">
                    <strong className="text-slate-900 block">{sub.student_name || 'Student Fellow'}</strong>
                    <span className="text-[11px] text-slate-500">{sub.student_email}</span>
                  </td>

                  <td className="py-3 px-4">
                    <strong className="text-slate-800 block truncate max-w-[220px]">{sub.task_title}</strong>
                    <span className="text-[11px] text-[#0A7CB3]">{sub.course_title}</span>
                  </td>

                  <td className="py-3 px-4">
                    <div className="space-y-1">
                      {sub.submission_text && (
                        <p className="text-[11px] text-slate-700 line-clamp-1 italic">
                          "{sub.submission_text}"
                        </p>
                      )}
                      {sub.attachment_url && (
                        <a
                          href={sub.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:underline"
                        >
                          <GitBranch size={12} /> Repository Artifact <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-semibold ${
                        sub.status === 'passed'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                          : sub.status === 'under_review'
                          ? 'bg-purple-100 text-purple-900 border border-purple-200 animate-pulse'
                          : 'bg-rose-100 text-rose-900 border border-rose-200'
                      }`}>
                        {sub.status.replace('_', ' ')}
                      </span>
                      {sub.score !== null && sub.score !== undefined && (
                        <span className="font-mono font-bold text-slate-900 text-xs">{sub.score} / 100</span>
                      )}
                    </div>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleOpenGradeModal(sub)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-xs"
                    >
                      {sub.status === 'under_review' ? 'Evaluate' : 'Revise Grade'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Grading Modal */}
      {gradingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Evaluate Student Deliverable</h2>
              <button onClick={() => setGradingSubmission(null)} className="text-slate-500 hover:text-slate-900">
                <X size={18} />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-slate-500 text-[11px] block">Student Fellow:</span>
              <strong className="text-slate-900 text-sm">{gradingSubmission.student_name}</strong>
              <span className="text-[#0A7CB3] block font-mono text-[11px]">{gradingSubmission.task_title}</span>
            </div>

            {gradingSubmission.attachment_url && (
              <div>
                <span className="text-slate-500 block mb-1">Attached Code / Artifact Link:</span>
                <a
                  href={gradingSubmission.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline flex items-center gap-1 font-mono break-all"
                >
                  {gradingSubmission.attachment_url} <ExternalLink size={12} />
                </a>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Score (out of 100) *</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={gradeScore}
                  onChange={e => setGradeScore(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono text-sm focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Status Verdict *</label>
                <select
                  value={gradeStatus}
                  onChange={e => setGradeStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
                >
                  <option value="passed">Passed (Meets Standard)</option>
                  <option value="resubmit_required">Resubmission Required</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Faculty Feedback & Constructive Remarks *</label>
              <textarea
                rows="3"
                required
                placeholder="Detail technical strengths, concurrency caveats, edge-case coverage..."
                value={gradeFeedback}
                onChange={e => setGradeFeedback(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
              ></textarea>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setGradingSubmission(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCommitGrade}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md"
              >
                Publish Grade & Remarks
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
