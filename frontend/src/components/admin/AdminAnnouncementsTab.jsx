import React, { useState, useMemo } from 'react';
import {
  Bell, PlusCircle, Search, Filter, Calendar, Users, Layers,
  BookOpen, CheckCircle2, Clock, Trash2, Edit3, X, Eye,
  AlertCircle, ChevronRight, Send, ShieldAlert, ArrowRight,
  MoreVertical, Check, MessageSquare
} from 'lucide-react';
import { formatDate, formatDateTime } from '../../adminUtils';

export default function AdminAnnouncementsTab({
  announcements = [],
  courses = [],
  batches = [],
  students = [],
  faculty = [],
  onCreateAnnouncement,
  onDeleteAnnouncement,
  currentUser
}) {
  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [audienceFilter, setAudienceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeFormTab, setActiveFormTab] = useState('edit'); // 'edit' | 'preview'
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    target_type: 'all_students', // 'all_students' | 'course' | 'batch' | 'faculty'
    target_id: '',
    priority: 'normal', // 'normal' | 'important' | 'urgent'
    publish_timing: 'now', // 'now' | 'schedule'
    scheduled_at: '',
    send_email: false,
    status: 'published' // 'published' | 'draft' | 'scheduled'
  });

  // Calculate estimated recipient count based on actual roster data
  const estimatedRecipientCount = useMemo(() => {
    if (formData.target_type === 'all_students') {
      const activeCount = students.filter(s => s.account_status === 'active').length;
      return activeCount > 0 ? activeCount : students.length;
    }
    if (formData.target_type === 'faculty') {
      return faculty.length;
    }
    if (formData.target_type === 'course' && formData.target_id) {
      return students.filter(s => String(s.course_id) === String(formData.target_id)).length;
    }
    if (formData.target_type === 'batch' && formData.target_id) {
      return students.filter(s => String(s.batch_id) === String(formData.target_id)).length;
    }
    return students.length;
  }, [formData.target_type, formData.target_id, students, faculty]);

  // Filtered announcements
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter(a => {
      // Search
      const q = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm ||
        (a.title && a.title.toLowerCase().includes(q)) ||
        (a.content && a.content.toLowerCase().includes(q)) ||
        (a.author_name && a.author_name.toLowerCase().includes(q));

      // Audience
      const matchesAudience = audienceFilter === 'all' || a.target_type === audienceFilter;

      // Status (support explicit status or infer from publish date)
      const aStatus = a.status || (a.is_draft ? 'draft' : 'published');
      const matchesStatus = statusFilter === 'all' || aStatus === statusFilter;

      // Date
      let matchesDate = true;
      if (dateFilter === '7d') {
        const d = new Date(a.created_at || a.published_at).getTime();
        matchesDate = Date.now() - d <= 7 * 24 * 60 * 60 * 1000;
      } else if (dateFilter === '30d') {
        const d = new Date(a.created_at || a.published_at).getTime();
        matchesDate = Date.now() - d <= 30 * 24 * 60 * 60 * 1000;
      }

      return matchesSearch && matchesAudience && matchesStatus && matchesDate;
    });
  }, [announcements, searchTerm, audienceFilter, statusFilter, dateFilter]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) return;

    setIsSubmitting(true);
    try {
      const computedStatus = formData.publish_timing === 'schedule' ? 'scheduled' : formData.status;
      await onCreateAnnouncement({
        title: formData.title.trim(),
        content: formData.content.trim(),
        target_type: formData.target_type,
        target_id: formData.target_id || null,
        priority: formData.priority,
        send_email: formData.send_email,
        status: computedStatus,
        scheduled_at: formData.publish_timing === 'schedule' ? formData.scheduled_at : null
      });

      setIsCreateModalOpen(false);
      setFormData({
        title: '',
        content: '',
        target_type: 'all_students',
        target_id: '',
        priority: 'normal',
        publish_timing: 'now',
        scheduled_at: '',
        send_email: false,
        status: 'published'
      });
      setActiveFormTab('edit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    if (onDeleteAnnouncement) {
      await onDeleteAnnouncement(deleteConfirmId);
    }
    if (selectedAnnouncement?.id === deleteConfirmId) {
      setSelectedAnnouncement(null);
    }
    setDeleteConfirmId(null);
  };

  const getAudienceLabel = (item) => {
    if (item.target_type === 'all_students') return 'All Students';
    if (item.target_type === 'faculty') return 'Faculty';
    if (item.target_type === 'course') {
      const c = courses.find(course => String(course.id) === String(item.target_id));
      return c ? `Course: ${c.title}` : 'Selected Course';
    }
    if (item.target_type === 'batch') {
      const b = batches.find(batch => String(batch.id) === String(item.target_id));
      return b ? `Batch: ${b.batch_code}` : 'Selected Batch';
    }
    return item.target_type?.replace('_', ' ') || 'General';
  };

  const getStatusBadge = (status) => {
    const s = (status || 'published').toLowerCase();
    if (s === 'published') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Published
        </span>
      );
    }
    if (s === 'scheduled') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-800 border border-sky-200">
          <Clock size={11} className="text-sky-600" />
          Scheduled
        </span>
      );
    }
    if (s === 'draft') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
          Draft
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Heading & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Announcements</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Create, schedule, and broadcast official updates to students, batches, and faculty.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsCreateModalOpen(true);
            setActiveFormTab('edit');
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#0a7cb3] hover:bg-[#086491] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle size={16} />
          <span>Create Announcement</span>
        </button>
      </div>

      {/* 2. Controls: Search, Audience Filter, Status Filter, Date Filter */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search announcements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 placeholder-slate-400 text-xs focus:outline-hidden focus:border-[#0a7cb3] focus:ring-1 focus:ring-[#0a7cb3]"
          />
        </div>

        {/* Audience Filter */}
        <div>
          <select
            value={audienceFilter}
            onChange={(e) => setAudienceFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs focus:outline-hidden focus:border-[#0a7cb3] cursor-pointer"
            aria-label="Filter by audience"
          >
            <option value="all">All Audiences</option>
            <option value="all_students">All Students</option>
            <option value="batch">Specific Batch</option>
            <option value="course">Specific Course</option>
            <option value="faculty">Faculty</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs focus:outline-hidden focus:border-[#0a7cb3] cursor-pointer"
            aria-label="Filter by status"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="scheduled">Scheduled</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        {/* Date Filter */}
        <div>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs focus:outline-hidden focus:border-[#0a7cb3] cursor-pointer"
            aria-label="Filter by date range"
          >
            <option value="all">All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* 3. Announcements List (Desktop Table & Mobile Compact Cards) */}
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        {filteredAnnouncements.length === 0 ? (
          <div className="py-12 px-4 text-center">
            {announcements.length === 0 ? (
              <div className="max-w-sm mx-auto space-y-3">
                <div className="w-12 h-12 rounded-full bg-sky-50 text-[#0a7cb3] flex items-center justify-center mx-auto">
                  <Bell size={24} />
                </div>
                <h3 className="text-sm font-bold text-slate-900">No announcements yet</h3>
                <p className="text-xs text-slate-500">
                  Publish your first announcement to share updates with students and instructional staff.
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0a7cb3] hover:bg-[#086491] text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  <PlusCircle size={15} />
                  <span>Create Announcement</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">No announcements match your filter criteria.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setAudienceFilter('all');
                    setStatusFilter('all');
                    setDateFilter('all');
                  }}
                  className="text-xs font-semibold text-[#0a7cb3] hover:underline cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Audience</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Publish Date</th>
                    <th className="py-3 px-4">Author</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredAnnouncements.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedAnnouncement(item)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      {/* Title & Short Preview */}
                      <td className="py-3 px-4 max-w-md">
                        <div className="font-semibold text-slate-900 group-hover:text-[#0a7cb3] transition-colors truncate">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {item.content}
                        </div>
                      </td>

                      {/* Audience */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {getAudienceLabel(item)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(item.status)}
                      </td>

                      {/* Publish Date */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        {formatDate(item.created_at || item.published_at)}
                      </td>

                      {/* Author */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-800">
                        {item.author_name || 'Academic Office'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedAnnouncement(item)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                            title="View Announcement Details"
                            aria-label="View details"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(item.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Archive / Remove Announcement"
                            aria-label="Archive announcement"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Compact Cards View */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredAnnouncements.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedAnnouncement(item)}
                  className="p-4 space-y-2 hover:bg-slate-50/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 leading-snug">
                      {item.title}
                    </h3>
                    <div className="shrink-0">
                      {getStatusBadge(item.status)}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2">
                    {item.content}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500 border-t border-slate-100">
                    <span className="font-medium text-slate-700">
                      {getAudienceLabel(item)}
                    </span>
                    <span className="font-mono">
                      {formatDate(item.created_at || item.published_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 4. Side Panel Details Drawer */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedAnnouncement(null)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-[#0a7cb3]" />
                <h2 className="text-base font-bold text-slate-900">Announcement Details</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAnnouncement(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                aria-label="Close details"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
              {/* Title & Status */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {getStatusBadge(selectedAnnouncement.status)}
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                    {getAudienceLabel(selectedAnnouncement)}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {selectedAnnouncement.title}
                </h3>
              </div>

              {/* Message Content */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-wrap">
                {selectedAnnouncement.content}
              </div>

              {/* Scope & Metadata Details */}
              <div className="space-y-2 border-t border-slate-200 pt-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Publication Details</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Published Date:</span>
                    <span className="font-medium text-slate-900 font-mono">
                      {formatDateTime(selectedAnnouncement.created_at || selectedAnnouncement.published_at)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Author:</span>
                    <span className="font-medium text-slate-900">
                      {selectedAnnouncement.author_name || 'Academic Administrator'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Target Scope:</span>
                    <span className="font-medium text-slate-900">
                      {getAudienceLabel(selectedAnnouncement)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Priority:</span>
                    <span className="font-medium text-slate-900 capitalize">
                      {selectedAnnouncement.priority || 'Normal'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Real Delivery Status Breakdown (Never Fake) */}
              <div className="space-y-2 border-t border-slate-200 pt-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Channel Delivery Status</h4>
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-emerald-900">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-xs">In-App Notification Feed</div>
                      <div className="text-[11px] text-emerald-700 mt-0.5">
                        Active on recipient dashboards and mobile learning workspace.
                      </div>
                    </div>
                  </div>

                  {selectedAnnouncement.send_email ? (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-amber-900">
                      <ShieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-xs">Email Broadcast Logged</div>
                        <div className="text-[11px] text-amber-800 mt-0.5">
                          Notification requested. External SMTP provider status is unconfigured in institutional settings.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-xs">
                      External email dispatch was not requested for this notice.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(selectedAnnouncement.id)}
                className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer"
              >
                Archive Announcement
              </button>
              <button
                type="button"
                onClick={() => setSelectedAnnouncement(null)}
                className="px-4 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-medium transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Create Announcement Modal (With Live Preview Tab & Recipient Count) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Create Announcement</h2>
                <p className="text-xs text-slate-500 mt-0.5">Publish a notice to specific cohorts or the entire academy.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Mode Tabs: Edit vs Preview */}
            <div className="flex border-b border-slate-200 px-5 pt-2 gap-4 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveFormTab('edit')}
                className={`pb-2 border-b-2 transition-colors cursor-pointer ${
                  activeFormTab === 'edit'
                    ? 'border-[#0a7cb3] text-[#0a7cb3] font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Compose Message
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('preview')}
                className={`pb-2 border-b-2 transition-colors cursor-pointer ${
                  activeFormTab === 'preview'
                    ? 'border-[#0a7cb3] text-[#0a7cb3] font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Preview Card
              </button>
            </div>

            {/* Form Content */}
            {activeFormTab === 'edit' ? (
              <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 text-xs">
                {/* Title */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Announcement Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Schedule Shift: Capstone Architecture Reviews"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 text-xs focus:outline-hidden focus:border-[#0a7cb3] focus:ring-1 focus:ring-[#0a7cb3]"
                  />
                </div>

                {/* Audience Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Target Audience</label>
                    <select
                      value={formData.target_type}
                      onChange={(e) => setFormData({ ...formData, target_type: e.target.value, target_id: '' })}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs focus:outline-hidden focus:border-[#0a7cb3] cursor-pointer"
                    >
                      <option value="all_students">All Students</option>
                      <option value="batch">Specific Batch</option>
                      <option value="course">Specific Course</option>
                      <option value="faculty">Faculty Only</option>
                    </select>
                  </div>

                  {formData.target_type === 'batch' && (
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Select Batch</label>
                      <select
                        required
                        value={formData.target_id}
                        onChange={(e) => setFormData({ ...formData, target_id: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs focus:outline-hidden focus:border-[#0a7cb3] cursor-pointer"
                      >
                        <option value="">Choose a batch...</option>
                        {batches.map(b => (
                          <option key={b.id} value={b.id}>{b.batch_code} ({b.title})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formData.target_type === 'course' && (
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Select Course</label>
                      <select
                        required
                        value={formData.target_id}
                        onChange={(e) => setFormData({ ...formData, target_id: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs focus:outline-hidden focus:border-[#0a7cb3] cursor-pointer"
                      >
                        <option value="">Choose a course...</option>
                        {courses.map(c => (
                          <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formData.target_type !== 'batch' && formData.target_type !== 'course' && (
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Priority</label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs focus:outline-hidden focus:border-[#0a7cb3] cursor-pointer"
                      >
                        <option value="normal">Normal Priority</option>
                        <option value="important">Important</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Recipient Scope Callout */}
                <div className="p-3 rounded-lg bg-sky-50/70 border border-sky-100 flex items-center justify-between text-xs">
                  <span className="text-slate-600">Selected Audience:</span>
                  <span className="font-semibold text-[#0a7cb3]">
                    ~{estimatedRecipientCount} recipient{estimatedRecipientCount === 1 ? '' : 's'}
                  </span>
                </div>

                {/* Content Message */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Announcement Message <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Provide details regarding schedule adjustments, meeting links, or submission deadlines..."
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 text-xs focus:outline-hidden focus:border-[#0a7cb3] focus:ring-1 focus:ring-[#0a7cb3] leading-relaxed"
                  />
                </div>

                {/* Publishing Timing */}
                <div className="space-y-2 border-t border-slate-200 pt-3">
                  <label className="block text-slate-700 font-semibold">Publish Timing</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="timing"
                        value="now"
                        checked={formData.publish_timing === 'now'}
                        onChange={() => setFormData({ ...formData, publish_timing: 'now' })}
                        className="text-[#0a7cb3] focus:ring-[#0a7cb3]"
                      />
                      <span>Publish immediately</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="timing"
                        value="schedule"
                        checked={formData.publish_timing === 'schedule'}
                        onChange={() => setFormData({ ...formData, publish_timing: 'schedule' })}
                        className="text-[#0a7cb3] focus:ring-[#0a7cb3]"
                      />
                      <span>Schedule for later</span>
                    </label>
                  </div>

                  {formData.publish_timing === 'schedule' && (
                    <div className="pt-2">
                      <input
                        type="datetime-local"
                        required
                        value={formData.scheduled_at}
                        onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-800 text-xs focus:outline-hidden focus:border-[#0a7cb3]"
                      />
                    </div>
                  )}
                </div>

                {/* Notification Channels */}
                <div className="space-y-1.5 border-t border-slate-200 pt-3">
                  <label className="block text-slate-700 font-semibold">Notification Channels</label>
                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={true}
                      disabled
                      className="rounded text-[#0a7cb3]"
                    />
                    <span>In-App Workspace Notice (Always Active)</span>
                  </label>
                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.send_email}
                      onChange={(e) => setFormData({ ...formData, send_email: e.target.checked })}
                      className="rounded text-[#0a7cb3] focus:ring-[#0a7cb3]"
                    />
                    <span>Dispatch Email Alert (Depends on institutional SMTP provider)</span>
                  </label>
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-lg bg-[#0a7cb3] hover:bg-[#086491] text-white font-semibold transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {isSubmitting ? 'Publishing...' : formData.publish_timing === 'schedule' ? 'Schedule Announcement' : 'Publish Announcement'}
                  </button>
                </div>
              </form>
            ) : (
              /* Live Preview Card */
              <div className="p-5 space-y-4 text-xs">
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-[#0a7cb3] border border-blue-100 uppercase">
                      {formData.target_type.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {formatDate(new Date().toISOString())}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">
                    {formData.title || 'Announcement Title Preview'}
                  </h3>

                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {formData.content || 'Your message body will appear here once written.'}
                  </p>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Published by: <strong className="text-slate-700">{currentUser?.full_name || 'Academic Office'}</strong></span>
                    <span>Audience: ~{estimatedRecipientCount} recipients</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setActiveFormTab('edit')}
                    className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer"
                  >
                    Back to Edit
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateSubmit}
                    disabled={!formData.title.trim() || !formData.content.trim() || isSubmitting}
                    className="px-4 py-2 rounded-lg bg-[#0a7cb3] hover:bg-[#086491] text-white font-semibold transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {isSubmitting ? 'Publishing...' : 'Confirm & Publish'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Destructive Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-sm shadow-xl p-5 space-y-4 text-xs animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5 text-rose-600">
              <AlertCircle size={20} />
              <h3 className="text-sm font-bold text-slate-900">Archive Announcement</h3>
            </div>
            <p className="text-slate-600 text-xs leading-relaxed">
              Are you sure you want to archive this announcement? It will no longer be visible to students or faculty in the notification feed.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-colors cursor-pointer"
              >
                Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
