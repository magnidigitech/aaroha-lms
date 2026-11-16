import React, { useState } from 'react';
import {
  Briefcase, CheckCircle2, Clock, ExternalLink, GitBranch,
  Globe, Award, PlusCircle, Search, Building, UserCheck, X
} from 'lucide-react';
import { formatDate } from '../../adminUtils';

export default function AdminPlacementTab({
  placementData = { profiles: [], jobs: [], applications: [] },
  students = [],
  onUpdatePlacementProfile,
  onCreateJobOpening
}) {
  const [activeSubTab, setActiveSubTab] = useState('profiles'); // 'profiles' | 'jobs' | 'applications'
  const [searchTerm, setSearchTerm] = useState('');
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);

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
      (p.target_roles && p.target_roles.toLowerCase().includes(searchTerm.toLowerCase()));
  });

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
            Audit candidate mock interview scorecards, manage corporate hiring pipelines, and track job offers.
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

      {/* Search */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
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
      </div>

      {/* View 1: Candidate Readiness Profiles */}
      {activeSubTab === 'profiles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProfiles.map(p => (
            <div
              key={p.user_id}
              className="p-5 rounded-xl bg-white border border-slate-200 flex flex-col justify-between space-y-4 hover:border-slate-200 transition-colors shadow-xs"
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
                      : 'bg-amber-100 text-amber-900 border border-amber-200'
                  }`}>
                    {p.placement_status.replace('_', ' ')}
                  </span>
                </div>

                {/* Readiness Score Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Readiness Index:</span>
                    <span className="font-mono font-bold text-slate-900">{p.readiness_score || 0}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-50 overflow-hidden border border-slate-200">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${p.readiness_score || 0}%` }}
                    />
                  </div>
                </div>

                <div className="text-xs text-slate-700 space-y-1">
                  <div>Target Roles: <strong className="text-slate-900">{p.target_roles || 'Cloud Systems Engineer'}</strong></div>
                  <div>Skills: <span className="text-slate-500 text-[11px]">{p.skills || 'Go, Linux, Kubernetes, Raft'}</span></div>
                </div>

                {/* Placed Status banner if placed */}
                {p.placement_status === 'placed' && (
                  <div className="p-2.5 rounded-lg bg-emerald-100/40 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
                    <span>Company: <strong>{p.placed_company}</strong></span>
                    <span className="font-mono font-bold">{p.package_offered}</span>
                  </div>
                )}
              </div>

              {/* Links */}
              <div className="pt-3 border-t border-slate-200 flex items-center gap-3 text-xs text-slate-500">
                {p.resume_url && (
                  <a href={p.resume_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline flex items-center gap-1">
                    Resume <ExternalLink size={11} />
                  </a>
                )}
                {p.github_url && (
                  <a href={p.github_url} target="_blank" rel="noopener noreferrer" className="text-slate-700 hover:text-slate-900 flex items-center gap-1">
                    <GitBranch size={12} /> GitHub
                  </a>
                )}
                {p.portfolio_url && (
                  <a href={p.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-[#0A7CB3] hover:underline flex items-center gap-1">
                    Portfolio
                  </a>
                )}
              </div>
            </div>
          ))}
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
                  <td className="py-3 px-4 font-medium text-slate-900">{app.student_name}</td>
                  <td className="py-3 px-4">
                    <strong className="text-slate-800 block">{app.job_title}</strong>
                    <span className="text-[11px] text-[#0A7CB3]">{app.company_name}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">{formatDate(app.application_date)}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-semibold ${
                      app.status === 'offered'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        : app.status === 'technical_round'
                        ? 'bg-blue-100 text-blue-900 border border-blue-200'
                        : 'bg-slate-50 text-slate-700'
                    }`}>
                      {app.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                    {app.feedback || app.notes || 'Interview scheduled.'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Post Job Modal */}
      {isJobModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Post Corporate Job Opening</h2>
              <button onClick={() => setIsJobModalOpen(false)} className="text-slate-500 hover:text-slate-900">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateJobSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Company Partner *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Razorpay, Swiggy, Nutanix"
                    value={newJob.company_name}
                    onChange={e => setNewJob({ ...newJob, company_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Job Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cloud Infrastructure Engineer"
                    value={newJob.job_title}
                    onChange={e => setNewJob({ ...newJob, job_title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Package CTC Range</label>
                <input
                  type="text"
                  placeholder="e.g. 20 - 28 LPA"
                  value={newJob.package_range}
                  onChange={e => setNewJob({ ...newJob, package_range: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Role Description & Hiring Requirements</label>
                <textarea
                  rows="3"
                  placeholder="Detail responsibilities, core tech stack, and evaluation criteria..."
                  value={newJob.job_description}
                  onChange={e => setNewJob({ ...newJob, job_description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsJobModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md"
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
