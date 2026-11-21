import React, { useState } from 'react';
import { 
  Shield, Users, TrendingUp, Award, Activity, 
  Settings, Key, AlertTriangle, CheckCircle2, ArrowRight,
  Server, RefreshCw, Layers, ExternalLink, FileText, Database
} from 'lucide-react';
import CoordinatorDashboardView from './CoordinatorDashboardView';
import { formatDateTime } from '../../adminUtils';

export default function SuperAdminDashboardView({
  dashboardData = {},
  onNavigateTab,
  onQuickAction
}) {
  const [viewMode, setViewMode] = useState('governance'); // 'governance' | 'operations'

  const operationalData = (dashboardData.operational && typeof dashboardData.operational === 'object') ? dashboardData.operational : {};
  const governance = (dashboardData.governance && typeof dashboardData.governance === 'object') ? dashboardData.governance : {};
  const usersByRole = (governance.users_by_role && typeof governance.users_by_role === 'object' && !Array.isArray(governance.users_by_role)) ? governance.users_by_role : {};
  const placement = (governance.placement_overview && typeof governance.placement_overview === 'object') ? governance.placement_overview : {};
  const integrations = Array.isArray(governance.integration_health) ? governance.integration_health : [];
  const auditLogs = Array.isArray(governance.recent_audit_logs) ? governance.recent_audit_logs : [];

  return (
    <div className="space-y-8">
      
      {/* Perspective Toggle: Institutional Governance vs Daily Operations */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Shield className="text-[#0A7CB3]" size={22} />
            Institutional Governance & Enterprise Operations
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Holistic oversight across user roles, system integrations, audit trails, and institutional operations.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => setViewMode('governance')}
            className={'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ' + 
              (viewMode === 'governance' 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900')}
          >
            Governance & Audit
          </button>
          <button
            type="button"
            onClick={() => setViewMode('operations')}
            className={'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ' + 
              (viewMode === 'operations' 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900')}
          >
            Daily Operations
          </button>
        </div>
      </div>

      {/* Super Admin Quick Actions */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <Key size={14} className="text-[#0A7CB3]" />
          <span>Privileged Executive Actions:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigateTab && onNavigateTab('users')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0A7CB3] hover:bg-[#086491] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Users size={13} />
            Manage Users & Roles
          </button>
          <button
            onClick={() => onNavigateTab && onNavigateTab('settings')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Settings size={13} />
            Configure Settings
          </button>
          <button
            onClick={() => onNavigateTab && onNavigateTab('audit')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Shield size={13} />
            Review Audit Log
          </button>
          <button
            onClick={() => onNavigateTab && onNavigateTab('reports')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <FileText size={13} />
            Organisation Reports
          </button>
        </div>
      </div>

      {viewMode === 'operations' ? (
        <CoordinatorDashboardView
          dashboardData={operationalData}
          onNavigateTab={onNavigateTab}
          onQuickAction={onQuickAction}
        />
      ) : (
        <div className="space-y-6">
          
          {/* Executive KPI Overview (Users, Batches, Placement, Audit) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KPI 1: User Accounts Directory */}
            <div 
              onClick={() => onNavigateTab && onNavigateTab('users')}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:border-indigo-500 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Account Directory</span>
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Users size={16} />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {Object.values(usersByRole).reduce((a, b) => (Number(a) || 0) + (Number(b) || 0), 0)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {(usersByRole.student ?? 0) + ' Students • ' + (usersByRole.faculty ?? 0) + ' Faculty'}
              </div>
            </div>

            {/* KPI 2: Active Academic Batches */}
            <div 
              onClick={() => onNavigateTab && onNavigateTab('batches')}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:border-[#0A7CB3] transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Cohorts</span>
                <div className="p-2 rounded-xl bg-blue-50 text-[#0A7CB3]">
                  <Layers size={16} />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {operationalData.summary_cards?.active_batches ?? 0}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Active learning batches</div>
            </div>

            {/* KPI 3: Placement Outcomes */}
            <div 
              onClick={() => onNavigateTab && onNavigateTab('placement')}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:border-purple-500 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Placement Rate</span>
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <Award size={16} />
                </div>
              </div>
              <div className="text-2xl font-black text-purple-700">
                {(placement.placement_rate_pct ?? 0) + '%'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {(placement.placed_students ?? 0) + ' placed of ' + (placement.eligible_students ?? 0) + ' eligible'}
              </div>
            </div>

            {/* KPI 4: Governance & Audit Trail */}
            <div 
              onClick={() => onNavigateTab && onNavigateTab('audit')}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:border-emerald-500 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Audit Trail</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Shield size={16} />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {auditLogs.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Recorded audit events</div>
            </div>

          </div>

          {/* Integration Health & Background Workers */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900">Platform Integrations & Background Workers</h3>
                <p className="text-xs text-slate-500">Real-time status of external API providers and scheduled cron workers.</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                All Systems Operational
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {integrations.map((it, idx) => (
                <div key={idx} className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-900">{it.name}</div>
                    <div className="text-[11px] text-slate-500">{it.service}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">{it.details}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                      {it.status}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-1">{it.latency}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sensitive Audit Log Trail */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs p-5 sm:p-7 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900">Recent Sensitive Actions Audit Log</h3>
                <p className="text-xs text-slate-500">Immutable governance ledger capturing role elevations, platform settings, and administrative modifications.</p>
              </div>
              <button
                onClick={() => onNavigateTab && onNavigateTab('audit')}
                className="text-xs font-bold text-[#0A7CB3] hover:underline"
              >
                View Full Audit Vault
              </button>
            </div>

            {auditLogs.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center italic">No audit log entries recorded.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Actor Email</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3">Entity</th>
                      <th className="px-4 py-3">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-mono text-slate-500">{formatDateTime(log.created_at)}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{log.user_email || 'System'}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
                            {log.user_role || 'system'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#0A7CB3]">{log.action}</td>
                        <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">{log.entity_type} #{log.entity_id}</td>
                        <td className="px-4 py-3 font-mono text-slate-400">{log.ip_address || 'Internal'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
