import React, { useState } from 'react';
import {
  History, Search, ShieldCheck, Clock, User, Download
} from 'lucide-react';
import { exportToCsv, formatDateTime } from '../../adminUtils';

export default function AdminAuditLogTab({
  auditLogs = []
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = auditLogs.filter(log => {
    return !searchTerm ||
      (log.action && log.action.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.user_email && log.user_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.entity_type && log.entity_type.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.details_json && log.details_json.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const handleExportAudit = () => {
    const headers = [
      { label: 'Timestamp', key: 'created_at' },
      { label: 'Actor Email', key: 'user_email' },
      { label: 'Actor Role', key: 'user_role' },
      { label: 'Action', key: 'action' },
      { label: 'Entity Type', key: 'entity_type' },
      { label: 'Entity ID', key: 'entity_id' },
      { label: 'IP Address', key: 'ip_address' },
      { label: 'Details', key: 'details_json' }
    ];
    exportToCsv('aaroha_system_audit_log', headers, filteredLogs);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Security & Operations Audit Trail</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Immutable timeline of administrative mutations, admissions, batch scheduling, grading, and role elevations.
          </p>
        </div>

        <button
          onClick={handleExportAudit}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs font-medium"
        >
          <Download size={14} /> Export Audit Log
        </button>
      </div>

      {/* Search */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search audit actions, user emails, or entity IDs..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs focus:outline-hidden focus:border-blue-500"
          />
        </div>
        <span className="text-xs text-slate-500 font-mono">
          {filteredLogs.length} Events Logged
        </span>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold tracking-wider uppercase text-[11px]">
              <th className="py-3 px-4">Timestamp (IST)</th>
              <th className="py-3 px-4">Operator</th>
              <th className="py-3 px-4">Action Event</th>
              <th className="py-3 px-4">Entity</th>
              <th className="py-3 px-4">Details</th>
              <th className="py-3 px-4 text-right">Origin IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filteredLogs.map(l => (
              <tr key={l.id} className="hover:bg-slate-50/50 transition-colors font-mono">
                <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                  {formatDateTime(l.created_at)}
                </td>
                <td className="py-3 px-4">
                  <span className="text-slate-900 block font-sans font-medium">{l.user_email || 'System Daemon'}</span>
                  <span className="text-[10px] text-[#0A7CB3] uppercase font-mono">{l.user_role || 'system'}</span>
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200 text-[10px] uppercase font-semibold">
                    {l.action}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-700">
                  {l.entity_type} #{l.entity_id}
                </td>
                <td className="py-3 px-4 text-slate-500 max-w-xs truncate text-[11px]">
                  {l.details_json}
                </td>
                <td className="py-3 px-4 text-slate-500 text-right text-[11px]">
                  {l.ip_address || '127.0.0.1'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

