import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Globe, Lock, Layers, BookOpen, Users, PlusCircle, CheckCircle2,
  Clock, AlertCircle, FileText, Video, Link as LinkIcon, Trash2,
  Edit3, ExternalLink, ShieldAlert, ArrowRight, Eye, Send, Filter,
  Check, X, RefreshCw, MessageSquare, ChevronRight, Share2, Sparkles
} from 'lucide-react';
import api from '../../apiService';
import { formatDate, formatDateTime } from '../../adminUtils';

export default function AdminContentPublishingTab({
  courses = [],
  batches = [],
  currentUser = {},
  showToast = () => {}
}) {
  // Main view: 'lms_content' vs 'public_content' vs 'approval_queue'
  const [activeView, setActiveView] = useState('lms_content');
  const [materials, setMaterials] = useState([]);
  const [publicContent, setPublicContent] = useState([]);
  const [publishingQueues, setPublishingQueues] = useState(null);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [destinationFilter, setDestinationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');

  // Modals
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [isPublicSubmissionModalOpen, setIsPublicSubmissionModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedReviewItem, setSelectedReviewItem] = useState(null);
  const [reviewAction, setReviewAction] = useState('approve');
  const [reviewNotes, setReviewNotes] = useState('');

  // Audience Count Live Estimator
  const [audienceCount, setAudienceCount] = useState(null);
  const [audienceLoading, setAudienceLoading] = useState(false);

  // Material Form State
  const [materialForm, setMaterialForm] = useState({
    title: '',
    description: '',
    material_type: 'document',
    file_url: '',
    external_url: '',
    course_id: '',
    batch_id: '',
    destination: 'private_lms',
    audience_type: 'course_enrolled',
    audience_id: '',
    status: 'published',
    scheduled_release_at: '',
    notify_audience: false,
    file_size: '2.4 MB',
    file_type: 'PDF'
  });

  // Public Submission Form State
  const [publicForm, setPublicForm] = useState({
    title: '',
    content_type: 'article',
    summary: '',
    body: '',
    media_url: '',
    external_url: '',
    consent_given: true
  });

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [matResResult, pubResResult, queueResResult] = await Promise.allSettled([
        api.adminGetMaterials(),
        api.publicGetContent({}),
        api.adminGetPublishingQueues()
      ]);

      if (matResResult.status === 'fulfilled' && matResResult.value?.success) {
        setMaterials(matResResult.value.materials || []);
      }

      if (pubResResult.status === 'fulfilled' && pubResResult.value?.success) {
        const pubRes = pubResResult.value;
        const combined = [
          ...(pubRes.articles || []),
          ...(pubRes.project_showcases || []),
          ...(pubRes.free_resources || [])
        ];
        setPublicContent(combined);
      } else if (pubResResult.status === 'rejected') {
        console.warn('Public content fetch warning:', pubResResult.reason);
      }

      if (queueResResult.status === 'fulfilled' && queueResResult.value?.success) {
        setPublishingQueues(queueResResult.value);
      } else if (queueResResult.status === 'rejected') {
        console.warn('Publishing queues fetch warning:', queueResResult.reason);
      }

      if (matResResult.status === 'rejected' && pubResResult.status === 'rejected' && queueResResult.status === 'rejected') {
        showToast(matResResult.reason?.message || 'Error loading content data', 'error');
      }
    } catch (err) {
      console.warn('Publishing data fetch error:', err);
      showToast(err.message || 'Error loading content data', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Recalculate audience count dynamically when form changes
  const checkAudienceCount = useCallback(async (type, id) => {
    if (!type) return;
    setAudienceLoading(true);
    try {
      const res = await api.adminGetAudienceCount(type, id);
      if (res?.success) {
        setAudienceCount(res.recipient_count);
      } else {
        setAudienceCount(null);
      }
    } catch {
      setAudienceCount(null);
    } finally {
      setAudienceLoading(false);
    }
  }, []);

  const handleAudienceChange = (type, id) => {
    setMaterialForm(prev => ({
      ...prev,
      audience_type: type,
      audience_id: id || ''
    }));
    checkAudienceCount(type, id);
  };

  // Submit Material
  const handleMaterialSubmit = async (e) => {
    e.preventDefault();
    if (!materialForm.title || !materialForm.course_id) {
      showToast('Title and Course are required', 'error');
      return;
    }

    try {
      const payload = {
        ...materialForm,
        course_id: Number(materialForm.course_id),
        batch_id: materialForm.batch_id ? Number(materialForm.batch_id) : null,
        audience_id: materialForm.audience_id ? Number(materialForm.audience_id) : Number(materialForm.course_id),
        notify_audience: materialForm.notify_audience ? 1 : 0
      };

      const res = await api.adminCreateMaterial(payload);
      if (res?.success) {
        showToast(res.message || 'Material saved successfully');
        setIsMaterialModalOpen(false);
        fetchData();
      } else {
        showToast(res?.error || 'Failed to save material', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Error saving material', 'error');
    }
  };

  // Submit Public Article / Showcase
  const handlePublicSubmit = async (e) => {
    e.preventDefault();
    if (!publicForm.title || !publicForm.summary) {
      showToast('Title and summary are required', 'error');
      return;
    }

    try {
      const res = await api.facultyCreatePublicSubmission(publicForm);
      if (res?.success) {
        showToast(res.message || 'Submission queued for admin review');
        setIsPublicSubmissionModalOpen(false);
        fetchData();
      } else {
        showToast(res?.error || 'Submission failed', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Error submitting content', 'error');
    }
  };

  // Review Public Content
  const handleReviewAction = async (item, action) => {
    setSelectedReviewItem(item);
    setReviewAction(action);
    setReviewNotes('');
    setIsReviewModalOpen(true);
  };

  const submitReview = async () => {
    if (!selectedReviewItem) return;
    try {
      const contentType = selectedReviewItem.material_type ? 'learning_material' : 'public_website_content';
      const res = await api.adminReviewPublicContent({
        content_type: contentType,
        id: selectedReviewItem.id,
        action: reviewAction,
        review_notes: reviewNotes
      });

      if (res?.success) {
        showToast(res.message || 'Review processed successfully');
        setIsReviewModalOpen(false);
        fetchData();
      } else {
        showToast(res?.error || 'Failed to submit review', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Error processing review', 'error');
    }
  };

  // Filtered Materials
  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      const matchesSearch = !searchTerm ||
        (m.title && m.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (m.description && m.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesDest = destinationFilter === 'all' || m.destination === destinationFilter;
      const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
      const matchesCourse = courseFilter === 'all' || String(m.course_id) === String(courseFilter);
      return matchesSearch && matchesDest && matchesStatus && matchesCourse;
    });
  }, [materials, searchTerm, destinationFilter, statusFilter, courseFilter]);

  const pendingApprovalsCount = publishingQueues?.summary?.pending_approval_count || 0;
  const scheduledCount = publishingQueues?.summary?.scheduled_count || 0;

  return (
    <div className="space-y-6">
      {/* Tab Header & View Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Content Publishing & Audience Governance</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
              Role Scoped
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Publishing destinations, strict audience targeting, review queues, version preservation, and decoupled notifications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setMaterialForm({
                title: '',
                description: '',
                material_type: 'document',
                file_url: '',
                external_url: '',
                course_id: courses[0]?.id || '',
                batch_id: '',
                destination: 'private_lms',
                audience_type: 'course_enrolled',
                audience_id: courses[0]?.id || '',
                status: 'published',
                scheduled_release_at: '',
                notify_audience: false,
                file_size: '2.4 MB',
                file_type: 'PDF'
              });
              if (courses[0]?.id) checkAudienceCount('course_enrolled', courses[0].id);
              setIsMaterialModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <PlusCircle size={15} /> Publish LMS Material
          </button>

          <button
            onClick={() => setIsPublicSubmissionModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Sparkles size={15} /> Submit Public Showcase
          </button>
        </div>
      </div>

      {/* Primary View Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveView('lms_content')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeView === 'lms_content'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Lock size={14} /> Private LMS Learning Content ({materials.length})
        </button>

        <button
          onClick={() => setActiveView('public_content')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeView === 'public_content'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Globe size={14} /> Public Website Content ({publicContent.length})
        </button>

        <button
          onClick={() => setActiveView('approval_queue')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeView === 'approval_queue'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-amber-700 hover:bg-amber-50 border border-amber-200'
          }`}
        >
          <Clock size={14} /> Review & Approval Queue
          {pendingApprovalsCount > 0 && (
            <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
              activeView === 'approval_queue' ? 'bg-white text-amber-700' : 'bg-amber-600 text-white'
            }`}>
              {pendingApprovalsCount}
            </span>
          )}
        </button>
      </div>

      {/* VIEW 1: PRIVATE LMS LEARNING CONTENT */}
      {activeView === 'lms_content' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3 shadow-2xs">
            <input
              type="text"
              placeholder="Search by title, description..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs focus:outline-hidden focus:border-blue-500"
            />

            <select
              value={destinationFilter}
              onChange={e => setDestinationFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-hidden"
            >
              <option value="all">All Destinations</option>
              <option value="private_lms">Private LMS Only</option>
              <option value="public_website">Public Website</option>
              <option value="both">Both (LMS + Website)</option>
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-hidden"
            >
              <option value="all">All Workflow States</option>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
              <option value="draft">Draft</option>
              <option value="pending_review">Pending Review</option>
            </select>

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
          </div>

          {/* Materials Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Content Item</th>
                  <th className="py-3 px-4">Destination</th>
                  <th className="py-3 px-4">Audience Scope</th>
                  <th className="py-3 px-4">Publishing State</th>
                  <th className="py-3 px-4">Delivery</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredMaterials.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No learning materials found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredMaterials.map(mat => (
                    <tr key={mat.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-2.5">
                          <div className="p-2 rounded-lg bg-slate-100 text-slate-600 mt-0.5">
                            {mat.material_type === 'video' ? <Video size={16} /> :
                             mat.material_type === 'link' ? <LinkIcon size={16} /> : <FileText size={16} />}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{mat.title}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {mat.course_title || 'General'} {mat.batch_code ? `• Batch: ${mat.batch_code}` : ''}
                            </div>
                            {mat.live_version_data && (
                              <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                                <Sparkles size={10} /> Active live version preserved during revision
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {mat.destination === 'private_lms' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            <Lock size={11} /> Private LMS
                          </span>
                        )}
                        {mat.destination === 'public_website' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <Globe size={11} /> Public Website
                          </span>
                        )}
                        {mat.destination === 'both' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Share2 size={11} /> LMS & Website
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 capitalize">
                          {mat.audience_type ? mat.audience_type.replace('_', ' ') : 'Course Enrolled'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {mat.recipient_count || 0} active learners
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          {mat.status === 'published' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 w-fit">
                              <CheckCircle2 size={11} /> Published
                            </span>
                          )}
                          {mat.status === 'scheduled' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-100 text-sky-800 w-fit">
                              <Clock size={11} /> Scheduled: {formatDate(mat.scheduled_release_at)}
                            </span>
                          )}
                          {mat.status === 'draft' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 w-fit">
                              Draft
                            </span>
                          )}
                          {mat.status === 'pending_review' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 w-fit">
                              Pending Review
                            </span>
                          )}
                          {mat.approval_status === 'changes_requested' && (
                            <span className="text-[11px] text-rose-600 font-medium">Changes requested</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                          mat.notification_status === 'queued' ? 'bg-amber-50 text-amber-700' :
                          mat.notification_status === 'sent' ? 'bg-emerald-50 text-emerald-700' :
                          mat.notification_status === 'failed' ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-400'
                        }`}>
                          {mat.notification_status ? mat.notification_status.toUpperCase() : 'NONE'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {mat.status === 'draft' && (
                            <button
                              onClick={async () => {
                                const res = await api.adminPublishMaterial(mat.id);
                                if (res?.success) {
                                  showToast('Material published');
                                  fetchData();
                                }
                              }}
                              className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-semibold"
                            >
                              Publish
                            </button>
                          )}
                          {mat.status === 'published' && (
                            <button
                              onClick={async () => {
                                const res = await api.adminUnpublishMaterial(mat.id);
                                if (res?.success) {
                                  showToast('Material moved to draft');
                                  fetchData();
                                }
                              }}
                              className="px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 text-[11px] font-medium"
                            >
                              Unpublish
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              if (window.confirm(`Delete ${mat.title}?`)) {
                                const res = await api.adminDeleteMaterial(mat.id);
                                if (res?.success) {
                                  showToast('Material deleted');
                                  fetchData();
                                }
                              }
                            }}
                            className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: PUBLIC WEBSITE CONTENT */}
      {activeView === 'public_content' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-3">
            <Globe className="text-blue-600 mt-0.5 shrink-0" size={18} />
            <div>
              <div className="text-xs font-bold text-blue-900">Strict Public Data Isolation Active</div>
              <p className="text-xs text-blue-700 mt-0.5">
                All public articles, showcases, and resources shown here are sanitized on the server. Public website visitors never receive private LMS Zoom/Google Meet links, protected video recordings, attendance records, or learner rosters.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {publicContent.map(item => (
              <div key={item.id} className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                      {item.content_type?.replace('_', ' ')}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                      <CheckCircle2 size={12} /> Approved & Live
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">{item.title}</h3>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">{item.summary}</p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Author: {item.author_name}</span>
                  <a
                    href={`/api/public/content/${item.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    View Public API <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: ADMIN REVIEW & APPROVAL QUEUE */}
      {activeView === 'approval_queue' && (
        <div className="space-y-6">
          {/* Pending Reviews */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 bg-amber-50/50 border-b border-amber-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Faculty Submissions Awaiting Public Approval</h3>
                <p className="text-xs text-slate-500">
                  Submissions intended for Aaroha’s public website require explicit administrative review before going live.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                {pendingApprovalsCount} Pending
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {pendingApprovalsCount === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Zero items awaiting review. All public submissions have been processed!
                </div>
              ) : (
                <>
                  {publishingQueues?.pending_review?.public_website_content?.map(item => (
                    <div key={`pwc-${item.id}`} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                      <div className="space-y-1 max-w-2xl">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-700">
                            {item.content_type?.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-slate-400">
                            Submitted by <strong className="text-slate-700">{item.author_name}</strong> on {formatDateTime(item.created_at)}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                        <p className="text-xs text-slate-600 line-clamp-2">{item.summary || item.body}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleReviewAction(item, 'approve')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-2xs"
                        >
                          Approve & Publish
                        </button>
                        <button
                          onClick={() => handleReviewAction(item, 'request_changes')}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                        >
                          Request Changes
                        </button>
                        <button
                          onClick={() => handleReviewAction(item, 'reject')}
                          className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}

                  {publishingQueues?.pending_review?.learning_materials?.map(item => (
                    <div key={`mat-${item.id}`} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                      <div className="space-y-1 max-w-2xl">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 text-purple-700">
                            Learning Material
                          </span>
                          <span className="text-xs text-slate-400">
                            Uploaded by <strong className="text-slate-700">{item.author_name}</strong> for {item.course_title}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                        <p className="text-xs text-slate-600">{item.description}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleReviewAction(item, 'approve')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-2xs"
                        >
                          Approve Public Release
                        </button>
                        <button
                          onClick={() => handleReviewAction(item, 'request_changes')}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                        >
                          Request Changes
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Scheduled Publications */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Scheduled Publications Queue</h3>
                <p className="text-xs text-slate-500">
                  Content scheduled for automated release to authorized audiences at future timestamps.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800">
                {scheduledCount} Scheduled
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {scheduledCount === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  Zero publications scheduled for future release.
                </div>
              ) : (
                publishingQueues?.scheduled?.materials?.map(item => (
                  <div key={`sched-${item.id}`} className="p-4 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-900">{item.title}</div>
                      <div className="text-[11px] text-slate-400">{item.course_title} • Author: {item.author_name}</div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 font-semibold text-sky-700">
                        <Clock size={12} /> {formatDateTime(item.scheduled_release_at)}
                      </span>
                      <div className="text-[10px] text-slate-400">Targeting {item.recipient_count} recipients</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: PUBLISH LMS LEARNING MATERIAL */}
      {isMaterialModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Publish Learning Material</h2>
                <p className="text-xs text-slate-500">Configure destination, audience scope, and notification delivery.</p>
              </div>
              <button onClick={() => setIsMaterialModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleMaterialSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Material Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Consensus in Cloud Architecture"
                  value={materialForm.title}
                  onChange={e => setMaterialForm({ ...materialForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Course Assignment *</label>
                  <select
                    value={materialForm.course_id}
                    onChange={e => {
                      const cid = e.target.value;
                      setMaterialForm(prev => ({ ...prev, course_id: cid }));
                      if (materialForm.audience_type === 'course_enrolled') {
                        checkAudienceCount('course_enrolled', cid);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-hidden"
                  >
                    <option value="">Select Course</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Media Type</label>
                  <select
                    value={materialForm.material_type}
                    onChange={e => setMaterialForm({ ...materialForm, material_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-hidden"
                  >
                    <option value="document">PDF / Document</option>
                    <option value="video">Video Recording</option>
                    <option value="link">GitHub / Web Link</option>
                  </select>
                </div>
              </div>

              {/* 1. Explicit Publishing Destination */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Explicit Publishing Destination *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMaterialForm({ ...materialForm, destination: 'private_lms' })}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      materialForm.destination === 'private_lms'
                        ? 'border-purple-600 bg-purple-50/70 text-purple-900'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <Lock size={13} /> Private LMS
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">Default. Enrolled learners only.</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMaterialForm({ ...materialForm, destination: 'public_website' })}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      materialForm.destination === 'public_website'
                        ? 'border-blue-600 bg-blue-50/70 text-blue-900'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <Globe size={13} /> Public Website
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">Requires admin review.</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMaterialForm({ ...materialForm, destination: 'both' })}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      materialForm.destination === 'both'
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <Share2 size={13} /> Both
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">LMS & public showcase.</div>
                  </button>
                </div>
              </div>

              {/* 2. Audience Selection with Live Count */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Target Audience Scope</label>
                  <span className="text-[11px] font-semibold text-blue-700">
                    {audienceLoading ? 'Calculating...' : `${audienceCount !== null ? audienceCount : '—'} Confirmed Recipients`}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="audType"
                      checked={materialForm.audience_type === 'course_enrolled'}
                      onChange={() => handleAudienceChange('course_enrolled', materialForm.course_id)}
                    />
                    <span>Course Enrolments</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="audType"
                      checked={materialForm.audience_type === 'batch_enrolled'}
                      onChange={() => handleAudienceChange('batch_enrolled', batches[0]?.id)}
                    />
                    <span>Selected Batch</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="audType"
                      checked={materialForm.audience_type === 'all_students'}
                      onChange={() => handleAudienceChange('all_students', null)}
                    />
                    <span>All Students (Admin)</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="audType"
                      checked={materialForm.audience_type === 'individual'}
                      onChange={() => handleAudienceChange('individual', 7)}
                    />
                    <span>Individual Learner</span>
                  </label>
                </div>

                {materialForm.audience_type === 'batch_enrolled' && (
                  <select
                    value={materialForm.batch_id}
                    onChange={e => {
                      const bid = e.target.value;
                      setMaterialForm(prev => ({ ...prev, batch_id: bid, audience_id: bid }));
                      checkAudienceCount('batch_enrolled', bid);
                    }}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 bg-white"
                  >
                    <option value="">Select Specific Batch</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>{b.title} ({b.batch_code})</option>
                    ))}
                  </select>
                )}
              </div>

              {/* 3. Decoupled Notifications */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">Audience Notification</div>
                  <div className="text-[11px] text-slate-500">Send immediate broadcast alert to targeted audience.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={materialForm.notify_audience}
                    onChange={e => setMaterialForm({ ...materialForm, notify_audience: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* 4. Scheduled Release Option */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Scheduled Release Time (Optional)</label>
                <input
                  type="datetime-local"
                  value={materialForm.scheduled_release_at}
                  onChange={e => {
                    const dt = e.target.value;
                    setMaterialForm({
                      ...materialForm,
                      scheduled_release_at: dt,
                      status: dt ? 'scheduled' : 'published'
                    });
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-hidden"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Leave blank for immediate release.</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsMaterialModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs"
                >
                  Confirm & Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SUBMIT PUBLIC ARTICLE OR SHOWCASE */}
      {isPublicSubmissionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Submit Content for Public Website</h2>
                <p className="text-xs text-slate-500">All submissions are queued for admin review before public release.</p>
              </div>
              <button onClick={() => setIsPublicSubmissionModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePublicSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Content Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Building High-Throughput Matching Engines in Go"
                  value={publicForm.title}
                  onChange={e => setPublicForm({ ...publicForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Content Type</label>
                <select
                  value={publicForm.content_type}
                  onChange={e => setPublicForm({ ...publicForm, content_type: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-hidden"
                >
                  <option value="article">Technical Article / Case Study</option>
                  <option value="project_showcase">Student Capstone Showcase</option>
                  <option value="resource">Free Developer Resource</option>
                  <option value="news_event">News / Industry Event</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Summary *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Brief synopsis shown on public listing cards..."
                  value={publicForm.summary}
                  onChange={e => setPublicForm({ ...publicForm, summary: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Body Content</label>
                <textarea
                  rows={4}
                  placeholder="Full article markdown or project writeup..."
                  value={publicForm.body}
                  onChange={e => setPublicForm({ ...publicForm, body: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-hidden font-mono"
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  id="consent"
                  checked={publicForm.consent_given}
                  onChange={e => setPublicForm({ ...publicForm, consent_given: e.target.checked })}
                />
                <label htmlFor="consent" className="text-slate-600">
                  I confirm consent has been verified for any student project showcases or quotes.
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPublicSubmissionModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs"
                >
                  Submit for Admin Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADMIN REVIEW ACTION MODAL */}
      {isReviewModalOpen && selectedReviewItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900 capitalize">
                  {reviewAction.replace('_', ' ')} Submission
                </h2>
                <p className="text-xs text-slate-500">Provide editorial feedback or review confirmation.</p>
              </div>
              <button onClick={() => setIsReviewModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <div className="font-bold text-slate-900">{selectedReviewItem.title}</div>
                <div className="text-slate-500 mt-1 line-clamp-2">{selectedReviewItem.summary || selectedReviewItem.description}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reviewer Notes / Feedback {reviewAction !== 'approve' ? '*' : '(Optional)'}
                </label>
                <textarea
                  rows={3}
                  required={reviewAction !== 'approve'}
                  placeholder={reviewAction === 'approve' ? 'Approved for website publication...' : 'Specify revisions required before approval...'}
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => setIsReviewModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={submitReview}
                  className={`px-4 py-2 rounded-lg text-white text-xs font-semibold shadow-xs ${
                    reviewAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-500' :
                    reviewAction === 'request_changes' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  Confirm {reviewAction.replace('_', ' ')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
