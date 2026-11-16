import React, { useState } from 'react';
import {
  ShieldCheck, UserPlus, Search, CheckCircle2, Lock,
  AlertTriangle, Shield, User, X
} from 'lucide-react';
import { formatDate } from '../../adminUtils';

export default function AdminUsersTab({
  users = [],
  currentUser = null,
  onUpdateUserRole,
  onCreateUser
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [roleModalUser, setRoleModalUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('student');

  const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

  const filteredUsers = users.filter(u => {
    const matchesSearch = !searchTerm ||
      (u.full_name && u.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleCommitRoleChange = async () => {
    if (!roleModalUser) return;
    if (onUpdateUserRole) {
      await onUpdateUserRole(roleModalUser.id, { role: selectedRole });
    }
    setRoleModalUser(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Users, Roles & System Permissions</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Administer institutional RBAC permissions across Super Admin, Admin/Coordinator, Faculty, Placement Officer, and Student.
          </p>
        </div>
      </div>

      {/* Permissions Matrix Overview Card */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Shield size={16} className="text-[#0A7CB3]" />
          <span>Role-Based Access Control (RBAC) Governance</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-[11px] font-mono">
          <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
            <strong className="text-[#0A7CB3] block">Super Admin</strong>
            <span className="text-slate-500">Complete access & settings</span>
          </div>
          <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
            <strong className="text-blue-400 block">Coordinator</strong>
            <span className="text-slate-500">Students, cohorts & schedule</span>
          </div>
          <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
            <strong className="text-amber-700 block">Placement</strong>
            <span className="text-slate-500">Interviews & corporate jobs</span>
          </div>
          <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
            <strong className="text-purple-400 block">Faculty</strong>
            <span className="text-slate-500">Assigned batches & grades</span>
          </div>
          <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
            <strong className="text-slate-500 block">Student</strong>
            <span className="text-slate-500">Enrolled courses & credentials</span>
          </div>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search user name or email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs focus:outline-hidden focus:border-blue-500"
          />
        </div>

        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-hidden"
        >
          <option value="all">All Roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="admin">Admin / Coordinator</option>
          <option value="placement_officer">Placement Officer</option>
          <option value="faculty">Faculty Member</option>
          <option value="student">Student Fellow</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold tracking-wider uppercase text-[11px]">
              <th className="py-3 px-4">User</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Assigned Role</th>
              <th className="py-3 px-4">Joined Date</th>
              <th className="py-3 px-4 text-right">Access Control</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filteredUsers.map(u => (
              <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4">
                  <strong className="text-slate-900 block">{u.full_name}</strong>
                  <span className="text-[11px] text-slate-500">{u.title || 'Fellow'}</span>
                </td>
                <td className="py-3 px-4 font-mono text-slate-700">{u.email}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-semibold ${
                    u.role === 'super_admin'
                      ? 'bg-sky-50 text-[#086491] border border-sky-200'
                      : u.role === 'admin' || u.role === 'coordinator'
                      ? 'bg-blue-100 text-blue-900 border border-blue-200'
                      : u.role === 'placement_officer'
                      ? 'bg-amber-100 text-amber-900 border border-amber-200'
                      : u.role === 'faculty'
                      ? 'bg-purple-100 text-purple-900 border border-purple-200'
                      : 'bg-slate-50 text-slate-700'
                  }`}>
                    {u.role.replace('_', ' ')}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-500">{formatDate(u.created_at)}</td>
                <td className="py-3 px-4 text-right">
                  {isSuperAdmin ? (
                    <button
                      onClick={() => {
                        setRoleModalUser(u);
                        setSelectedRole(u.role);
                      }}
                      className="px-2.5 py-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium"
                    >
                      Change Role
                    </button>
                  ) : (
                    <span className="text-slate-600 text-xs flex items-center justify-end gap-1">
                      <Lock size={12} /> Restricted
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Role Change Modal */}
      {roleModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Elevate / Modify User Role</h2>
              <button onClick={() => setRoleModalUser(null)} className="text-slate-500 hover:text-slate-900">
                <X size={18} />
              </button>
            </div>

            <div>
              <span className="text-slate-500 block">User:</span>
              <strong className="text-slate-900 text-sm">{roleModalUser.full_name}</strong>
              <span className="text-slate-500 font-mono text-xs block">{roleModalUser.email}</span>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Select New Privilege Role *</label>
              <select
                value={selectedRole}
                onChange={e => setSelectedRole(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
              >
                <option value="student">Student Fellow</option>
                <option value="faculty">Faculty Member</option>
                <option value="placement_officer">Placement Officer</option>
                <option value="admin">Administrator / Coordinator</option>
                <option value="super_admin">Super Administrator</option>
              </select>
            </div>

            <div className="p-3 rounded-lg bg-amber-100/30 border border-amber-200 text-amber-900 text-[11px]">
              Users cannot elevate their own role privileges. Every modification is logged in the immutable audit log.
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setRoleModalUser(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCommitRoleChange}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold"
              >
                Apply Role Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

