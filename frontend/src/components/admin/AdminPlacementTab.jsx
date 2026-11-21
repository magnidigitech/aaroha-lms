import React, { useState } from 'react';
import {
  Briefcase, CheckCircle2, Clock, ExternalLink, GitBranch,
  Globe, Award, PlusCircle, Search, Building, UserCheck, X,
  Edit3, RefreshCw, Sliders, Sparkles, Check, AlertCircle, FileText
} from 'lucide-react';
import { formatDate } from '../../adminUtils';
import { api } from '../../apiService';

export default function AdminPlacementTab({
  placementData = { profiles: [], jobs: [], applications: [] },
  students = [],
  courses = [],
  batches = [],
  onUpdatePlacementProfile,
  onSyncPlacementReadiness,
  onCreateJobOpening
}) {
  const [activeSubTab, setActiveSubTab] = useState('profiles'); // 'profiles' | 'jobs' | 'applications'
  const [searchTerm, setSearchTerm] = useState('');
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [syncingUserId, setSyncingUserId] = useState(null);
  const [calculatingBreakdown, setCalculatingBreakdown] = useState(false);
  const [readinessBreakdown, setReadinessBreakdown] = useState(null);

  // Edit Placement Form State
  const [editForm, setEditForm] = useState({
    user_id: null,
    student_name: '',
    student_id_code: '',
    target_roles: '',
    skills: '',
    readiness_score: 0,
    placement_status: 'training',
    placed_company: '',
    package_offered: '',
    resume_url: '',
    github_url: '',
    portfolio_url: '',
    resume_review_status: 'pending'
  });

  const [newJob, setNewJob] = useState({
    company_name: '',
    job_title: '',
    job_description: '',
    location: 'Bangalore / Hybrid',
    employment_type: 'Full-time',
    experience_required: '1-3 Years',
    package_range: '18 - 26 LPA',
    deadline: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0]
  });

  const profiles = placementData.profiles || [];
  const jobs = placementData.jobs || [];
  const applications = placementData.applications || [];

  const filteredProfiles = profiles.filter(p => {
    return !searchTerm ||
      (p.student_name && p.student_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.student_id_code && p.student_id_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.target_roles && p.target_roles.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.skills && p.skills.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const handleOpenEditModal = (p) => {
    setEditForm({
      user_id: p.user_id,
      student_name: p.student_name || 'Student Fellow',
      student_id_code: p.student_id_code || '',
      target_roles: p.target_roles || 'Cloud Systems Engineer',
      skills: p.skills || 'Linux, Python, Cloud, Distributed Systems',
      readiness_score: p.readiness_score !== undefined ? Number(p.readiness_score) : 0,
      placement_status: p.placement_status || 'training',
      placed_company: p.placed_company || '',
      package_offered: p.package_offered || '',
      resume_url: p.resume_url || '',
      github_url: p.github_url || '',
      portfolio_url: p.portfolio_url || '',
      resume_review_status: p.resume_review_status || 'pending'
    });
    setReadinessBreakdown(null);
    setIsEditModalOpen(true);
  };

  const handleCalculateBreakdown = async () => {
    if (!editForm.user_id) return;
    setCalculatingBreakdown(true);
    try {
      const res = await api.adminCalculatePlacementReadiness(editForm.user_id);
      if (res?.success) {
        setReadinessBreakdown(res);
      }
    } catch (err) {
      console.error('Failed to calculate dynamic score:', err);
    } finally {
      setCalculatingBreakdown(false);
    }
  };

  const handleApplyCalculatedScore = () => {
    if (!readinessBreakdown) return;
    setEditForm(prev => ({
      ...prev,
      readiness_score: readinessBreakdown.composite_score,
      placement_status: prev.placement_status === 'training' && readinessBreakdown.suggested_status
        ? readinessBreakdown.suggested_status
        : prev.placement_status
    }));
  };

  const handleSaveEditProfile = async (e) => {
    e.preventDefault();
    if (!editForm.user_id) return;

    if (onUpdatePlacementProfile) {
      await onUpdatePlacementProfile(editForm.user_id, {
        target_roles: editForm.target_roles,
        skills: editForm.skills,
        readiness_score: Number(editForm.readiness_score),
        placement_status: editForm.placement_status,
        placed_company: editForm.placed_company,
        package_offered: editForm.package_offered,
        resume_url: editForm.resume_url,
        github_url: editForm.github_url,
        portfolio_url: editForm.portfolio_url,
        resume_review_status: editForm.resume_review_status
      });
    }
    setIsEditModalOpen(false);
  };

  const handleQuickSync = async (userId) => {
    setSyncingUserId(userId);
    try {
      if (onSyncPlacementReadiness) {
        await onSyncPlacementReadiness(userId);
      } else {
        await api.adminSyncPlacementReadiness(userId);
        if (onUpdatePlacementProfile) {
          await onUpdatePlacementProfile(userId, { auto_calculate: true });
        }
      }
    } catch (err) {
      console.error('Failed to quick sync readiness:', err);
    } finally {
      setSyncingUserId(null);
    }
  };

  const handleCreateJobSubmit = async (e) => {
    e.preventDefault();
    if (!newJob.company_name || !newJob.job_title) return;

    if (onCreateJobOpening) {
      await onCreateJobOpening(newJob);
    }
    setIsJobModalOpen(false);
    setNewJob({
      company_name: '',
      job_title: '',
      job_description: '',
      location: 'Bangalore / Hybrid',
      employment_type: 'Full-time',
      experience_required: '1-3 Years',
      package_range: '18 - 26 LPA',
      deadline: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0]
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Corporate Placements & Career Readiness</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Audit candidate mock interview scorecards, manage corporate hiring pipelines, and sync multi-factor readiness scores.
          </p>
        </div>

        <button
          onClick={() => setIsJobModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-colors"
        >
          <PlusCircle size={15} /> Post Job Opening
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveSubTab('profiles')}
          className={`pb-2.5 border-b-2 transition-all ${
            activeSubTab === 'profiles' ? 'border-blue-500 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Candidate Readiness Profiles ({profiles.length})
        </button>
        <button
          onClick={() => setActiveSubTab('jobs')}
          className={`pb-2.5 border-b-2 transition-all ${
            activeSubTab === 'jobs' ? 'border-blue-500 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Corporate Job Openings ({jobs.length})
        </button>
        <button
          onClick={() => setActiveSubTab('applications')}
          className={`pb-2.5 border-b-2 transition-all ${
            activeSubTab === 'applications' ? 'border-blue-500 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Active Applications & Interviews ({applications.length})
        </button>
      </div>

      {/* Search & Actions Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search candidate profiles, skills, or target roles..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs focus:outline-hidden focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 font-mono text-[11px]">
            <CheckCircle2 size={13} className="text-emerald-600" />
            {profiles.filter(p => (p.readiness_score || 0) >= 75).length} Interview Ready
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 font-mono text-[11px]">
            <Briefcase size={13} className="text-blue-600" />
            {profiles.filter(p => p.placement_status === 'placed').length} Placed
          </span>
        </div>
      </div>

      {/* View 1: Candidate Readiness Profiles */}
      {activeSubTab === 'profiles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProfiles.map(p => {
            const score = p.readiness_score || 0;
            const isSyncing = syncingUserId === p.user_id;

            return (
              <div
                key={p.user_id}
                className="p-5 rounded-xl bg-white border border-slate-200 flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors shadow-xs"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{p.student_name}</h3>
                      <span className="text-[11px] font-mono text-[#0A7CB3]">{p.student_id_code}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-semibold ${
                      p.placement_status === 'placed'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        : p.placement_status === 'ready_for_interviews'
                        ? 'bg-blue-100 text-blue-900 border border-blue-200'
                        : p.placement_status === 'actively_interviewing'
                        ? 'bg-purple-100 text-purple-900 border border-purple-200'
                        : 'bg-amber-100 text-amber-900 border border-amber-200'
                    }`}>
                      {p.placement_status ? p.placement_status.replace(/_/g, ' ') : 'training'}
                    </span>
                  </div>

                  {/* Readiness Score Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Readiness Index:</span>
                      <span className="font-mono font-bold text-slate-900">{score}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          score >= 75 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-slate-400'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(2, score))}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-xs text-slate-700 space-y-1 bg-slate-50/60 p-2.5 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-400 font-medium">Target Roles: </span>
                      <strong className="text-slate-900">{p.target_roles || 'Cloud & Systems Fellow'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Skills: </span>
                      <span className="text-slate-600 text-[11px]">{p.skills || 'Go, Linux, Kubernetes, Systems'}</span>
                    </div>
                  </div>

                  {/* Placed Status banner if placed */}
                  {p.placement_status === 'placed' && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
                      <span>Company: <strong>{p.placed_company || 'Corporate Partner'}</strong></span>
                      <span className="font-mono font-bold">{p.package_offered || 'Confidential'}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-200">
                  {/* Links */}
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    {p.resume_url ? (
                      <a href={p.resume_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 font-medium">
                        Resume <ExternalLink size={11} />
                      </a>
                    ) : (
                      <span className="text-slate-400 text-[11px]">No Resume</span>
                    )}

                    {p.github_url && (
                      <a href={p.github_url} target="_blank" rel="noopener noreferrer" className="text-slate-700 hover:text-slate-900 flex items-center gap-1 font-medium">
                        <GitBranch size={12} /> GitHub
                      </a>
                    )}

                    {p.portfolio_url && (
                      <a href={p.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-[#0A7CB3] hover:underline flex items-center gap-1 font-medium">
                        Portfolio
                      </a>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleOpenEditModal(p)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
                    >
                      <Edit3 size={13} /> Edit Profile
                    </button>
                    <button
                      onClick={() => handleQuickSync(p.user_id)}
                      disabled={isSyncing}
                      title="Auto-calculate readiness score from real course progress, tasks, and attendance"
                      className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-[#0A7CB3] border border-sky-200 text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                      <span className="hidden sm:inline">Sync</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View 2: Corporate Job Openings */}
      {activeSubTab === 'jobs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map(j => (
            <div
              key={j.id}
              className="p-5 rounded-xl bg-white border border-slate-200 flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#0A7CB3] flex items-center gap-1">
                    <Building size={14} /> {j.company_name}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-50 text-slate-700 uppercase">
                    {j.employment_type}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-sm">{j.job_title}</h3>
                <p className="text-xs text-slate-500 line-clamp-2">{j.job_description}</p>

                <div className="text-xs text-slate-500 space-y-1 pt-2 border-t border-slate-200">
                  <div>Package: <strong className="text-emerald-700 font-mono">{j.package_range}</strong></div>
                  <div>Location: {j.location}</div>
                  <div>Experience: {j.experience_required}</div>
                  <div>Deadline: {formatDate(j.deadline)}</div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-mono">{j.applicants_count || 0} Applicants</span>
                <span className="text-emerald-700 font-medium">Active Drive</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View 3: Active Applications & Interviews */}
      {activeSubTab === 'applications' && (
        <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold tracking-wider uppercase text-[11px]">
                <th className="py-3 px-4">Candidate Fellow</th>
                <th className="py-3 px-4">Corporate Opening</th>
                <th className="py-3 px-4">Application Date</th>
                <th className="py-3 px-4">Pipeline Stage</th>
                <th className="py-3 px-4">Feedback Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {applications.map(app => (
                <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900">{app.student_name}</div>
                    <div className="text-[11px] font-mono text-slate-500">{app.student_email}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900">{app.job_title}</div>
                    <div className="text-[11px] text-[#0A7CB3]">{app.company_name}</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500">{formatDate(app.application_date)}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-blue-100 text-blue-900 font-medium">
                      {app.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 italic max-w-xs truncate">
                    {app.feedback || 'Awaiting preliminary review'}
                  </td>
                </tr>
              ))}
              {applications.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No active job applications found. Post jobs to start receiving student applications.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Placement Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Edit Placement & Career Profile</h3>
                <p className="text-xs text-slate-500">
                  {editForm.student_name} ({editForm.student_id_code})
                </p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditProfile} className="space-y-4 text-xs">
              {/* Dynamic Readiness Engine Preview */}
              <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-[#0A7CB3]" /> Multi-Factor Readiness Calculator
                  </span>
                  <button
                    type="button"
                    onClick={handleCalculateBreakdown}
                    disabled={calculatingBreakdown}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#0A7CB3] hover:bg-sky-600 text-white font-medium text-[11px] shadow-xs"
                  >
                    <RefreshCw size={11} className={calculatingBreakdown ? 'animate-spin' : ''} />
                    {calculatingBreakdown ? 'Evaluating...' : 'Evaluate Progress'}
                  </button>
                </div>

                {readinessBreakdown ? (
                  <div className="space-y-2 pt-1 border-t border-sky-200/60">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                      <div className="bg-white p-2 rounded-lg border border-sky-100">
                        <span className="text-slate-500 block text-[10px]">Academic (30%)</span>
                        <strong className="text-slate-900 font-mono">
                          {readinessBreakdown.breakdown.academic_points} pts ({readinessBreakdown.breakdown.course_progress_pct}%)
                        </strong>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-sky-100">
                        <span className="text-slate-500 block text-[10px]">Assessments (25%)</span>
                        <strong className="text-slate-900 font-mono">
                          {readinessBreakdown.breakdown.assessment_points} pts ({readinessBreakdown.breakdown.assessment_avg_score}%)
                        </strong>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-sky-100">
                        <span className="text-slate-500 block text-[10px]">Attendance (20%)</span>
                        <strong className="text-slate-900 font-mono">
                          {readinessBreakdown.breakdown.attendance_points} pts ({readinessBreakdown.breakdown.attendance_pct}%)
                        </strong>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-sky-100">
                        <span className="text-slate-500 block text-[10px]">Portfolio (15%)</span>
                        <strong className="text-slate-900 font-mono">
                          {readinessBreakdown.breakdown.portfolio_points} pts
                        </strong>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-sky-100">
                        <span className="text-slate-500 block text-[10px]">Mock Interview (10%)</span>
                        <strong className="text-slate-900 font-mono">
                          {readinessBreakdown.breakdown.interview_points} pts
                        </strong>
                      </div>
                      <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                        <span className="text-emerald-700 block text-[10px] font-semibold">Suggested Total</span>
                        <strong className="text-emerald-900 font-mono text-xs">
                          {readinessBreakdown.composite_score}% ({readinessBreakdown.suggested_status})
                        </strong>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleApplyCalculatedScore}
                        className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] shadow-xs flex items-center gap-1"
                      >
                        <Check size={12} /> Apply Evaluated Score ({readinessBreakdown.composite_score}%)
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-600">
                    Click Evaluate to audit actual student progress: Course Completion (30%), Assessment Submissions (25%), Batch Attendance (20%), Portfolio (15%), and Mock Interviews (10%).
                  </p>
                )}
              </div>

              {/* Readiness Score & Placement Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-slate-800">Readiness Index (%)</label>
                    <span className="font-mono font-bold text-[#0A7CB3]">{editForm.readiness_score}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={editForm.readiness_score}
                    onChange={e => setEditForm({ ...editForm, readiness_score: Number(e.target.value) })}
                    className="w-full accent-blue-600"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-800 block mb-1">Placement Pipeline Status</label>
                  <select
                    value={editForm.placement_status}
                    onChange={e => setEditForm({ ...editForm, placement_status: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="training">Training / In Prep</option>
                    <option value="ready_for_interviews">Ready for Interviews (Score &ge; 75%)</option>
                    <option value="actively_interviewing">Actively Interviewing</option>
                    <option value="placed">Placed / Hired</option>
                    <option value="opted_out">Opted Out / Higher Studies</option>
                  </select>
                </div>
              </div>

              {/* Target Roles & Skills */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">Target Roles</label>
                  <input
                    type="text"
                    value={editForm.target_roles}
                    onChange={e => setEditForm({ ...editForm, target_roles: e.target.value })}
                    placeholder="e.g. Cloud & Systems Fellow"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">Technical Skills</label>
                  <input
                    type="text"
                    value={editForm.skills}
                    onChange={e => setEditForm({ ...editForm, skills: e.target.value })}
                    placeholder="e.g. Go, Kubernetes, Raft, Linux"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Corporate Placement Details (if placed) */}
              {(editForm.placement_status === 'placed' || editForm.placement_status === 'actively_interviewing') && (
                <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-emerald-950 block mb-1">Hiring Organization / Company</label>
                    <input
                      type="text"
                      value={editForm.placed_company}
                      onChange={e => setEditForm({ ...editForm, placed_company: e.target.value })}
                      placeholder="e.g. Google, Microsoft, Razorpay"
                      className="w-full px-3 py-2 rounded-lg bg-white border border-emerald-300 text-slate-900 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-emerald-950 block mb-1">Compensation / Package Offered</label>
                    <input
                      type="text"
                      value={editForm.package_offered}
                      onChange={e => setEditForm({ ...editForm, package_offered: e.target.value })}
                      placeholder="e.g. 24 LPA"
                      className="w-full px-3 py-2 rounded-lg bg-white border border-emerald-300 text-slate-900 focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              {/* Portfolio & Profiles */}
              <div className="space-y-3">
                <label className="font-semibold text-slate-800 block">Candidate Verification Assets</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-500 block mb-1">Resume Document URL</span>
                    <input
                      type="text"
                      value={editForm.resume_url}
                      onChange={e => setEditForm({ ...editForm, resume_url: e.target.value })}
                      placeholder="https://drive.google.com/..."
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-[11px]"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">GitHub Profile URL</span>
                    <input
                      type="text"
                      value={editForm.github_url}
                      onChange={e => setEditForm({ ...editForm, github_url: e.target.value })}
                      placeholder="https://github.com/..."
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-[11px]"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">Portfolio / LinkedIn</span>
                    <input
                      type="text"
                      value={editForm.portfolio_url}
                      onChange={e => setEditForm({ ...editForm, portfolio_url: e.target.value })}
                      placeholder="https://portfolio.dev..."
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-[11px]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Post Job Modal */}
      {isJobModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">Post Corporate Job Opening</h3>
              <button onClick={() => setIsJobModalOpen(false)} className="text-slate-500 hover:text-slate-900">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateJobSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-800 block mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Google Cloud, Zerodha, Atlassian"
                  value={newJob.company_name}
                  onChange={e => setNewJob({ ...newJob, company_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-800 block mb-1">Job Title / Role *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Systems Software Engineer"
                  value={newJob.job_title}
                  onChange={e => setNewJob({ ...newJob, job_title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">Package Range</label>
                  <input
                    type="text"
                    placeholder="e.g. 18 - 24 LPA"
                    value={newJob.package_range}
                    onChange={e => setNewJob({ ...newJob, package_range: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Bangalore / Hybrid"
                    value={newJob.location}
                    onChange={e => setNewJob({ ...newJob, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-800 block mb-1">Job Description & Requirements</label>
                <textarea
                  rows={3}
                  placeholder="Responsibilities, required core skills (Go, Linux, Raft, Distributed Systems), interview stages..."
                  value={newJob.job_description}
                  onChange={e => setNewJob({ ...newJob, job_description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsJobModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md"
                >
                  Publish Job Opening
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
