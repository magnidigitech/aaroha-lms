import React, { useState } from 'react';
import {
  Settings, Save, Globe, Mail, Clock, ShieldCheck,
  CheckCircle2, AlertTriangle, Key, Server
} from 'lucide-react';

export default function AdminSettingsTab({
  settings = {},
  onSaveSettings
}) {
  const [formSettings, setFormSettings] = useState({
    institute_name: settings.institute_name || 'Aaroha Academy & Technologies Inc.',
    support_email: settings.support_email || 'admissions@aaroha-inc.com',
    default_timezone: settings.default_timezone || 'Asia/Kolkata',
    currency_symbol: settings.currency_symbol || 'INR',
    low_attendance_threshold_pct: settings.low_attendance_threshold_pct || '80',
    assignment_passing_pct: settings.assignment_passing_pct || '75',
    email_delivery_provider: settings.email_delivery_provider || 'Not Configured (Simulated Live Preview)'
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (onSaveSettings) {
      await onSaveSettings(formSettings);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Institutional Configuration & Parameters</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Operational timezone, delivery thresholds, currency formatting, and outbound mail providers.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-colors"
        >
          <Save size={15} /> Save Settings
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-lg bg-emerald-100/50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} /> Global configuration saved successfully.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* Core Institutional Parameters */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-4">
          <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm">
            <Globe size={16} className="text-[#0A7CB3]" />
            <span>Core Institutional Identity & Region</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Legal Institution Title *</label>
              <input
                type="text"
                required
                value={formSettings.institute_name}
                onChange={e => setFormSettings({ ...formSettings, institute_name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Central Admissions Support Email *</label>
              <input
                type="email"
                required
                value={formSettings.support_email}
                onChange={e => setFormSettings({ ...formSettings, support_email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Default Operational Timezone</label>
              <select
                value={formSettings.default_timezone}
                onChange={e => setFormSettings({ ...formSettings, default_timezone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST, UTC+05:30)</option>
                <option value="UTC">UTC (Coordinated Universal Time)</option>
                <option value="America/New_York">America/New_York (EST, UTC-05:00)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Default Transaction Currency</label>
              <input
                type="text"
                value={formSettings.currency_symbol}
                onChange={e => setFormSettings({ ...formSettings, currency_symbol: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono uppercase focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Academic Policy Thresholds */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-4">
          <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm">
            <ShieldCheck size={16} className="text-emerald-700" />
            <span>Academic Performance & Retention Thresholds</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Low Attendance Alert Threshold (%)</label>
              <input
                type="number"
                min="50"
                max="100"
                value={formSettings.low_attendance_threshold_pct}
                onChange={e => setFormSettings({ ...formSettings, low_attendance_threshold_pct: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono focus:border-blue-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Fellows dropping below this threshold appear automatically on the follow-up triage board.
              </span>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Assignment Passing Grade Threshold (%)</label>
              <input
                type="number"
                min="50"
                max="100"
                value={formSettings.assignment_passing_pct}
                onChange={e => setFormSettings({ ...formSettings, assignment_passing_pct: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono focus:border-blue-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Minimum score required on mandatory project deliverables for certificate clearance.
              </span>
            </div>
          </div>
        </div>

        {/* Email & Outbound Gateway Status (Clear Configuration Requirement) */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm">
              <Server size={16} className="text-amber-700" />
              <span>Outbound Transactional Email Gateway</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200 font-medium">
              Live Preview Mode
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 space-y-2">
            <p className="leading-relaxed">
              <strong>Configuration Status:</strong> {formSettings.email_delivery_provider}
            </p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              When SMTP credentials (Hostinger mail, Amazon SES, or SendGrid) are not set in <code className="text-[#086491]">backend/config/env.php</code>, single-use student invitation tokens and account reset links are rendered directly inside the Coordinator UI. Plaintext passwords are never emailed or stored unhashed.
            </p>
            <div className="p-2.5 rounded bg-white border border-slate-200 font-mono text-[11px] text-slate-500">
              SMTP Setup in env.php: 'SMTP_HOST' =&gt; 'smtp.hostinger.com', 'SMTP_PORT' =&gt; 465, 'SMTP_USER' =&gt; 'admissions@aaroha-inc.com'
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

