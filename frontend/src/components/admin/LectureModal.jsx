import React, { useState, useEffect, useRef } from 'react';
import { X, Video, FileText, CheckCircle2, AlertCircle, Loader2, Sparkles, ShieldCheck, KeyRound } from 'lucide-react';
import { extractBunnyVideoId } from '../../videoUtils';

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * Reusable Accessible Lecture Modal (Create & Edit)
 * Features Bunny Stream Video ID validation, provider switching, and unsaved changes confirmation.
 */
export default function LectureModal({
  isOpen,
  onClose,
  onSave,
  initialData = null, // null for create mode, or existing lesson object for edit mode
  moduleId,
  courseId
}) {
  const isEditMode = Boolean(initialData?.id);

  const [formData, setFormData] = useState({
    title: '',
    content_type: 'video',
    video_provider: 'bunny_stream',
    media_url: '',
    content_body: '',
    duration: '20 min',
    is_free_preview: false,
    is_published: true
  });

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const titleInputRef = useRef(null);
  const triggerElementRef = useRef(null);

  // Initialize/prefill form state
  useEffect(() => {
    if (isOpen) {
      triggerElementRef.current = document.activeElement;
      if (initialData) {
        // Detect provider from existing lesson
        let detectedProvider = initialData.video_provider || 'bunny_stream';
        const media = initialData.media_url || initialData.video_url || '';
        if (!initialData.video_provider) {
          if (extractBunnyVideoId(media) || media.length === 36) {
            detectedProvider = 'bunny_stream';
          } else if (media.includes('youtu')) {
            detectedProvider = 'youtube';
          } else if (media.includes('vimeo')) {
            detectedProvider = 'vimeo';
          } else if (media) {
            detectedProvider = 'direct';
          }
        }

        const prefillMedia = detectedProvider === 'bunny_stream' 
          ? (extractBunnyVideoId(media) || media) 
          : media;

        setFormData({
          title: initialData.title || '',
          content_type: initialData.content_type || 'video',
          video_provider: detectedProvider,
          media_url: prefillMedia,
          content_body: initialData.content_body || '',
          duration: initialData.duration || '20 min',
          is_free_preview: Boolean(initialData.is_free_preview),
          is_published: initialData.is_published !== undefined ? Boolean(initialData.is_published) : true
        });
      } else {
        // Create mode defaults
        setFormData({
          title: '',
          content_type: 'video',
          video_provider: 'bunny_stream',
          media_url: '',
          content_body: '',
          duration: '20 min',
          is_free_preview: false,
          is_published: true
        });
      }
      setErrors({});
      setSaveError(null);
      setIsDirty(false);
      setIsSaving(false);
      setTimeout(() => titleInputRef.current?.focus(), 60);
    }
  }, [isOpen, initialData]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape' && !isSaving) {
        handleAttemptClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSaving, isDirty]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Lecture title is required';
    }

    if (formData.content_type === 'video') {
      const mediaVal = formData.media_url.trim();
      if (!mediaVal) {
        newErrors.media_url = formData.video_provider === 'bunny_stream' 
          ? 'Bunny Video ID is required' 
          : 'Video URL is required';
      } else if (formData.video_provider === 'bunny_stream') {
        const extracted = extractBunnyVideoId(mediaVal);
        if (!extracted && !UUID_REGEX.test(mediaVal)) {
          newErrors.media_url = 'Invalid Video ID format. Expected a 36-character UUID (e.g. 0de41d3a-4d1d-498b-b731-bcc31a59ffc2).';
        }
      }
    }

    if (formData.content_type === 'article' && !formData.content_body.trim()) {
      newErrors.content_body = 'Technical article body is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAttemptClose = () => {
    if (isDirty && !window.confirm('You have unsaved changes. Are you sure you want to discard them?')) {
      return;
    }
    onClose();
    setTimeout(() => triggerElementRef.current?.focus?.(), 50);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || isSaving) return;

    setIsSaving(true);
    setSaveError(null);

    // Normalize Bunny video ID if Bunny Stream selected
    let normalizedMedia = formData.media_url.trim();
    if (formData.content_type === 'video' && formData.video_provider === 'bunny_stream') {
      const extracted = extractBunnyVideoId(normalizedMedia);
      if (extracted) normalizedMedia = extracted;
    }

    const payload = {
      ...formData,
      media_url: normalizedMedia,
      is_free_preview: formData.is_free_preview ? 1 : 0,
      is_published: formData.is_published ? 1 : 0
    };

    try {
      await onSave(payload);
      setIsSaving(false);
      setIsDirty(false);
      onClose();
      setTimeout(() => triggerElementRef.current?.focus?.(), 50);
    } catch (err) {
      setIsSaving(false);
      // Retain entered values and display error banner
      setSaveError(err.message || 'Failed to save lecture. Please verify inputs and retry.');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lecture-modal-title"
    >
      <div 
        className="relative bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200/60 shadow-2xs">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h3 id="lecture-modal-title" className="text-sm sm:text-base font-bold text-slate-900">
                {isEditMode ? 'Edit Curriculum Lecture' : 'Add Curriculum Lecture'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isEditMode ? 'Update lecture metadata and video reference' : 'Add new lecture to this module'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAttemptClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {saveError && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{saveError}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="font-semibold text-slate-800 block mb-1">
              Lecture Title <span className="text-red-500">*</span>
            </label>
            <input
              ref={titleInputRef}
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="e.g. Raft Consensus Protocol & Split-Brain Mitigation"
              className={`w-full p-2.5 bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${
                errors.title ? 'border-red-400 bg-red-50/20' : 'border-slate-200'
              }`}
            />
            {errors.title && <p className="text-red-600 text-[11px] mt-1">{errors.title}</p>}
          </div>

          {/* Format & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-800 block mb-1">Content Type</label>
              <select
                value={formData.content_type}
                onChange={(e) => handleChange('content_type', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              >
                <option value="video">Video Lecture</option>
                <option value="article">Technical Reading / Article</option>
                <option value="resource">Reference Resource</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-800 block mb-1">Estimated Duration</label>
              <input
                type="text"
                value={formData.duration}
                onChange={(e) => handleChange('duration', e.target.value)}
                placeholder="e.g. 20 min"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              >
              </input>
            </div>
          </div>

          {/* Video Provider Section (Visible if content_type === 'video') */}
          {formData.content_type === 'video' && (
            <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-3.5">
              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  Video Delivery Provider
                </label>
                <select
                  value={formData.video_provider}
                  onChange={(e) => handleChange('video_provider', e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium"
                >
                  <option value="bunny_stream">Bunny Stream (Authenticated & Secure)</option>
                  <option value="youtube">YouTube Embed</option>
                  <option value="vimeo">Vimeo</option>
                  <option value="direct">Direct MP4 / WebM File</option>
                </select>
              </div>

              {/* Bunny Stream Video ID Entry */}
              {formData.video_provider === 'bunny_stream' ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <span>Bunny Video ID</span>
                      <span className="text-red-500">*</span>
                      <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                        UUID Only
                      </span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">36-character GUID</span>
                  </div>
                  <input
                    type="text"
                    value={formData.media_url}
                    onChange={(e) => handleChange('media_url', e.target.value)}
                    placeholder="0de41d3a-4d1d-498b-b731-bcc31a59ffc2"
                    className={`w-full p-2.5 bg-white border rounded-xl font-mono text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${
                      errors.media_url ? 'border-red-400 bg-red-50/20' : 'border-slate-200'
                    }`}
                  />
                  {errors.media_url ? (
                    <p className="text-red-600 text-[11px] mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.media_url}</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed flex items-start gap-1">
                      <KeyRound className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>
                        Copy the Video ID from your Bunny Stream video details. <strong>Do not enter your API key.</strong>
                      </span>
                    </p>
                  )}
                </div>
              ) : (
                /* Other Video Providers (YouTube, Vimeo, Direct) */
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">
                    {formData.video_provider === 'youtube' && 'YouTube Video URL:'}
                    {formData.video_provider === 'vimeo' && 'Vimeo Video URL:'}
                    {formData.video_provider === 'direct' && 'Direct Media URL (.mp4 / .webm):'}
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="url"
                    value={formData.media_url}
                    onChange={(e) => handleChange('media_url', e.target.value)}
                    placeholder={
                      formData.video_provider === 'youtube'
                        ? 'https://www.youtube.com/watch?v=...'
                        : formData.video_provider === 'vimeo'
                        ? 'https://vimeo.com/...'
                        : 'https://cdn.example.com/video.mp4'
                    }
                    className={`w-full p-2.5 bg-white border rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${
                      errors.media_url ? 'border-red-400 bg-red-50/20' : 'border-slate-200'
                    }`}
                  />
                  {errors.media_url && <p className="text-red-600 text-[11px] mt-1">{errors.media_url}</p>}
                </div>
              )}
            </div>
          )}

          {/* Technical Lecture Notes / Article Body */}
          <div>
            <label className="font-semibold text-slate-800 block mb-1">
              Lecture Notes & Technical Documentation
              {formData.content_type === 'article' && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              rows={4}
              value={formData.content_body}
              onChange={(e) => handleChange('content_body', e.target.value)}
              placeholder="Enter technical lecture notes, architecture diagrams description, code snippets, and key takeaways..."
              className={`w-full p-2.5 bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${
                errors.content_body ? 'border-red-400 bg-red-50/20' : 'border-slate-200'
              }`}
            />
            {errors.content_body && <p className="text-red-600 text-[11px] mt-1">{errors.content_body}</p>}
          </div>

          {/* Toggles: Free Preview and Publication */}
          <div className="pt-2 space-y-2.5 border-t border-slate-100">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.is_free_preview}
                onChange={(e) => handleChange('is_free_preview', e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
              />
              <span className="font-medium text-slate-700">
                Enable Free Preview Access (Visible to un-enrolled candidates)
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.is_published}
                onChange={(e) => handleChange('is_published', e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
              />
              <span className="font-medium text-slate-700">
                Publish Lecture Immediately (Live in curriculum syllabus)
              </span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleAttemptClose}
              disabled={isSaving}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50 text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-slate-900 hover:bg-blue-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-98 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <span>{isEditMode ? 'Save Changes' : 'Create Lecture'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

