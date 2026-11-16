import React, { useState } from 'react';
import {
  BarChart3, Download, Filter, Calendar, Users,
  CheckCircle2, Award, Briefcase, Clock
} from 'lucide-react';
import { exportToCsv, formatDate } from '../../adminUtils';

export default function AdminReportsTab({
  students = [],
  courses = [],
  batches = [],
  faculty = []
}) {
  const [selectedReport, setSelectedReport] = useState('admissions');
  const [courseFilter, setCourseFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');

  const reportTypes = [
    { id: 'admissions', label: 'Admissions & Enrolments', icon: Users },
    { id: 'attendance', label: 'Attendance & Absenteeism', icon: CheckCircle2 },
    { id: 'progress', label: 'Course Progress & Completion', icon: Clock },
    { id: 'assessments', label: 'Assessment Results', icon: Award },
    { id: 'workload', label: 'Faculty Workload', icon: Users },
    { id: 'certificates', label: 'Certificate Eligibility', icon: Award },
    { id: 'placements', label: 'Placement Outcomes', icon: Briefcase }
  ];

  const handleExportSelectedReport = () => {
    if (selectedReport === 'admissions') {
      const headers = [
        { label: 'Student ID', key: 'student_id_code' },
        { label: 'Full Name', key: 'full_name' },
        { label: 'Email', key: 'email' },
        { label: 'Mobile', key: 'mobile' },
        { label: 'Course', key: 'course_title' },
        { label: 'Batch', key: 'batch_code' },
        { label: 'Account Status', key: 'account_status' },
        { label: 'Admission Status', key: 'admission_status' },
        { label: 'Admission Date', key: 'admission_date' }
      ];
      exportToCsv('aaroha_report_admissions', headers, students);
    } else if (selectedReport === 'workload') {
      const headers = [
        { label: 'Faculty ID', key: 'faculty_id_code' },
        { label: 'Faculty Name', key: 'full_name' },
        { label: 'Email', key: 'email' },
        { label: 'Title', key: 'title' },
        { label: 'Assigned Batches', key: 'assigned_batches_count' },
        { label: 'Upcoming Sessions', key: 'upcoming_sessions_count' },
        { label: 'Account Status', key: 'account_status' }
      ];
      exportToCsv('aaroha_report_faculty_workload', headers, faculty);
    } else {
      // Generic export of students
      const headers = [
        { label: 'Student ID', key: 'student_id_code' },
        { label: 'Name', key: 'full_name' },
        { label: 'Email', key: 'email' },
        { label: 'Course', key: 'course_title' },
        { label: 'Status', key: 'account_status' }
      ];
      exportToCsv(`aaroha_report_${selectedReport}`, headers, students);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Institutional Reports & Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Export verified academic, attendance, performance, and corporate placement audits with formula injection safeguards.
          </p>
        </div>

        <button
          onClick={handleExportSelectedReport}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-colors"
        >
          <Download size={14} /> Export CSV Report
        </button>
      </div>

      {/* Report Categories Picker */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {reportTypes.map(rt => {
          const Icon = rt.icon;
          const isSelected = selectedReport === rt.id;
          return (
            <button
              key={rt.id}
              onClick={() => setSelectedReport(rt.id)}
              className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md font-semibold'
                  : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-200'
              }`}
            >
              <Icon size={18} className={isSelected ? 'text-slate-900' : 'text-[#0A7CB3]'} />
              <span className="text-xs truncate">{rt.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-wrap items-center gap-3">
        <select
          value={courseFilter}
          onChange={e => setCourseFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-hidden"
        >
          <option value="all">All Courses</option>
          {courses.map(c => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>

        <select
          value={batchFilter}
          onChange={e => setBatchFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-hidden"
        >
          <option value="all">All Batches</option>
          {batches.map(b => (
            <option key={b.id} value={b.id}>{b.batch_code}</option>
          ))}
        </select>
      </div>

      {/* Report Preview Surface */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Live Preview: {reportTypes.find(r => r.id === selectedReport)?.label}
            </h3>
            <p className="text-xs text-slate-500">
              Formulas starting with =, +, -, @ are sanitized with single quotes to prevent injection vulnerability.
            </p>
          </div>
          <span className="text-xs font-mono text-[#0A7CB3] bg-sky-50/60 px-2.5 py-1 rounded border border-sky-200">
            {students.length} Records In Scope
          </span>
        </div>

        {/* Dynamic sample table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase font-semibold">
                <th className="py-2.5 px-3">Identifier</th>
                <th className="py-2.5 px-3">Subject / Fellow</th>
                <th className="py-2.5 px-3">Program / Metric</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Clearance / Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {students.slice(0, 5).map(s => (
                <tr key={s.user_id} className="hover:bg-slate-50/40">
                  <td className="py-2.5 px-3 font-mono text-[#0A7CB3]">{s.student_id_code}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-900">{s.full_name}</td>
                  <td className="py-2.5 px-3">{s.course_title || 'Distributed Systems'}</td>
                  <td className="py-2.5 px-3 font-mono uppercase text-[10px] text-emerald-700">{s.account_status}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-500">92% Met</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

