import React, { useState } from 'react';
import { 
  Briefcase, Users, FileCheck, Calendar, Award, CheckCircle2,
  ExternalLink, PlusCircle, Search, Clock, ArrowRight, UserCheck
} from 'lucide-react';
import { formatDate, formatDateTime } from '../../adminUtils';

export default function PlacementDashboardView({
  dashboardData = {},
  onOpenReviewResume,
  onOpenScheduleMock,
  onOpenAddJob,
  onOpenUpdateApplication,
  onOpenRecordOffer
}) {
  const [activeTab, setActiveTab] = useState('checklist'); // 'checklist' | 'resumes' | 'jobs' | 'applications'
  const [searchQuery, setSearchQuery] = useState('');

  const summary = dashboardData.summary_cards || {};
  const checklist = dashboardData.checklist_by_student || [];
  const jobs = dashboardData.job_openings || [];
  const applications = dashboardData.applications_by_stage || [];

  const resumesQueue = checklist.filter(s => s.resume_review_status === 'pending' || s.resume_review_status === 'needs_revision');

  return (
    <div className="space-y-8">
      
      {/* 6 Core Placement Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* Card 1: Eligible Students */}
        <div 
          onClick={() => setActiveTab('checklist')}
          className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs hover:border-[#0A7CB3] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Eligible Cohort</span>
            <div className="p-2 rounded-xl bg-blue-50 text-[#0A7CB3]">
              <Users size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{summary.students_eligible ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">Placement track learners</div>
        </div>

        {/* Card 2: Ready Students */}
        <div 
          onClick={() => setActiveTab('checklist')}
          className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs hover:border-emerald-500 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Market-Ready</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700">{summary.students_ready ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">Readiness score &ge; 80</div>
        </div>

        {/* Card 3: Resumes Awaiting Review */}
        <div 
          onClick={() => setActiveTab('resumes')}
          className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs hover:border-amber-500 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Review Queue</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <FileCheck size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700">{summary.resumes_awaiting_review ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">Resumes in queue</div>
        </div>

        {/* Card 4: Upcoming Mock Interviews */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Mock Interviews</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Calendar size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{summary.upcoming_mock_interviews ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">Scheduled preparation</div>
        </div>

        {/* Card 5: Upcoming Employer Interviews */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Company Interviews</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Clock size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{summary.upcoming_employer_interviews ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">Live hiring rounds</div>
        </div>

        {/* Card 6: Confirmed Placements & Offers */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Placed / Offers</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Award size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">{summary.offers_and_placements ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">Confirmed offers</div>
        </div>

      </div>

      {/* Placement Quick Action Bar */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <span>Corporate Relations Actions:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onOpenReviewResume && onOpenReviewResume()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0A7CB3] hover:bg-[#086491] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <FileCheck size={13} />
            Review Resume
          </button>
          <button
            onClick={() => onOpenScheduleMock && onOpenScheduleMock()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Calendar size={13} />
            Schedule Mock Interview
          </button>
          <button
            onClick={() => onOpenAddJob && onOpenAddJob()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <PlusCircle size={13} />
            Add Job Opportunity
          </button>
          <button
            onClick={() => onOpenRecordOffer && onOpenRecordOffer()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Award size={13} />
            Record Offer / Placement
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1 text-xs font-bold text-slate-500">
        {[
          { id: 'checklist', label: 'Readiness Checklist by Student (' + checklist.length + ')' },
          { id: 'resumes', label: 'Resume Review Queue (' + resumesQueue.length + ')' },
          { id: 'jobs', label: 'Corporate Job Openings (' + jobs.length + ')' },
          { id: 'applications', label: 'Applications by Stage (' + applications.length + ')' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={'px-3.5 py-2.5 rounded-t-xl transition-all whitespace-nowrap cursor-pointer ' + 
              (activeTab === tab.id 
                ? 'text-[#0A7CB3] border-b-2 border-[#0A7CB3] bg-blue-50/40' 
                : 'hover:text-slate-800 hover:bg-slate-50')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: READINESS CHECKLIST */}
      {activeTab === 'checklist' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs p-5 sm:p-6 space-y-3">
          <div className="pb-2 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-900">Student Placement-Readiness Matrix</h3>
            <p className="text-xs text-slate-500">Individual score benchmarking, resume verification, and corporate status.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Identifier</th>
                  <th className="px-4 py-3">Cohort</th>
                  <th className="px-4 py-3">Readiness Score</th>
                  <th className="px-4 py-3">Resume Status</th>
                  <th className="px-4 py-3">Placement Status</th>
                  <th className="px-4 py-3 text-right">Portfolio Links</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {checklist.map(st => (
                  <tr key={st.user_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900">{st.student_name}</td>
                    <td className="px-4 py-3 font-mono text-slate-500">{st.student_id_code}</td>
                    <td className="px-4 py-3 text-slate-600">{st.batch_code || 'General'}</td>
                    <td className="px-4 py-3">
                      <span className={'font-black px-2 py-0.5 rounded-md text-[11px] ' + 
                        (st.readiness_score >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700')}
                      >
                        {st.readiness_score} / 100
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ' + 
                        (st.resume_review_status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}
                      >
                        {st.resume_review_status || 'pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold capitalize text-slate-800">
                      {st.placed_company ? (st.placed_company + ' (' + st.package_offered + ')') : st.placement_status}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {st.resume_url && (
                        <a href={st.resume_url} target="_blank" rel="noopener noreferrer" className="text-[#0A7CB3] hover:underline font-semibold">
                          CV
                        </a>
                      )}
                      {st.github_url && (
                        <a href={st.github_url} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-800 font-semibold">
                          GitHub
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: RESUME REVIEW QUEUE */}
      {activeTab === 'resumes' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-2xs">
          <div className="pb-2 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-900">Resume & Portfolio Review Queue</h3>
            <p className="text-xs text-slate-500">Student resumes requiring professional corporate vetting and feedback.</p>
          </div>

          {resumesQueue.length === 0 ? (
            <div className="text-xs text-emerald-600 bg-emerald-50 p-6 rounded-2xl flex items-center justify-center gap-2">
              <CheckCircle2 size={16} />
              <span>Resume review queue is clear. All submitted profiles have been verified.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {resumesQueue.map(st => (
                <div key={st.user_id} className="p-4 rounded-2xl border border-amber-200 bg-amber-50/40 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900">{st.student_name} ({st.student_id_code})</div>
                    <div className="text-[11px] text-slate-500">{st.education || 'Computer Engineering'} • Status: {st.resume_review_status}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {st.resume_url && (
                      <a 
                        href={st.resume_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-[#0A7CB3]"
                      >
                        Open CV
                      </a>
                    )}
                    <button
                      onClick={() => onOpenReviewResume && onOpenReviewResume(st)}
                      className="px-3 py-1.5 rounded-xl bg-[#0A7CB3] text-white text-xs font-bold"
                    >
                      Verify / Feedback
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CORPORATE JOB OPENINGS */}
      {activeTab === 'jobs' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-900">Active Corporate Hiring Openings</h3>
              <p className="text-xs text-slate-500">Industry partner requisitions mapped to Aaroha certified alumni.</p>
            </div>
            <button
              onClick={() => onOpenAddJob && onOpenAddJob()}
              className="px-3.5 py-1.5 rounded-xl bg-[#0A7CB3] text-white text-xs font-bold flex items-center gap-1"
            >
              <PlusCircle size={13} />
              Add Opening
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map(job => (
              <div key={job.id} className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/60 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-black text-slate-900">{job.job_title}</div>
                    <div className="text-[11px] text-slate-600 font-bold">{job.company_name}</div>
                  </div>
                  <span className="text-[10px] font-bold uppercase bg-blue-100 text-[#0A7CB3] px-2 py-0.5 rounded-full">
                    {job.employment_type}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Location: {job.location} • CTC: {job.package_range || 'Competitive'}
                </div>
                <div className="text-xs text-slate-600 font-semibold pt-1 border-t border-slate-100 flex items-center justify-between">
                  <span>Applicants: {job.applicants_count ?? 0}</span>
                  <span className="text-[#0A7CB3] font-bold">Active</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: APPLICATIONS BY STAGE */}
      {activeTab === 'applications' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs p-5 sm:p-6 space-y-3">
          <div className="pb-2 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-900">Hiring Pipeline & Application Stages</h3>
            <p className="text-xs text-slate-500">Track candidates across technical evaluations, HR rounds, and offer rollouts.</p>
          </div>

          {applications.length === 0 ? (
            <div className="text-xs text-slate-400 py-6 text-center italic">No corporate applications currently in pipeline.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Company & Role</th>
                    <th className="px-4 py-3">Stage / Status</th>
                    <th className="px-4 py-3">Interview Date</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {applications.map(app => (
                    <tr key={app.application_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900">{app.student_name}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{app.company_name}</div>
                        <div className="text-[10px] text-slate-400">{app.job_title}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                          {app.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {app.interview_scheduled_at ? formatDateTime(app.interview_scheduled_at) : 'Not scheduled'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => onOpenUpdateApplication && onOpenUpdateApplication(app)}
                          className="text-xs font-bold text-[#0A7CB3] hover:underline"
                        >
                          Update Stage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
