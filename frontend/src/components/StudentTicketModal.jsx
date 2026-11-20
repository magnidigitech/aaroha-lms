import React, { useState, useEffect } from 'react';
import { X, HelpCircle, Send, AlertCircle, CheckCircle2, Clock, ShieldCheck, Loader2 } from 'lucide-react';
import api from '../apiService';

const CATEGORIES = [
  { value: 'academic', label: 'Academic Curriculum & Course Guidance', desc: 'Questions on syllabus, module lessons, or project deliverables' },
  { value: 'scheduling', label: 'Class Schedule & Session Timings', desc: 'Queries on upcoming live classes, timing changes, or faculty sessions' },
  { value: 'technical', label: 'Technical Platform & Playback', desc: 'Issues with video stream playback, login, or portal features' },
  { value: 'fees', label: 'Fee Plan & Payment Inquiries', desc: 'Questions regarding tuition, installments, or payment verification' },
  { value: 'placement', label: 'Career & Placement Assistance', desc: 'Assistance with resume reviews, interviews, or hiring drives' },
  { value: 'other', label: 'General Administrative Support', desc: 'Other institutional or administrative queries' }
];

const PRIORITIES = [
  { value: 'low', label: 'Low', desc: 'General question / no deadline' },
  { value: 'medium', label: 'Medium', desc: 'Standard turnaround (within 24 hours)' },
  { value: 'high', label: 'High', desc: 'Impacting upcoming class or deadline' },
  { value: 'urgent', label: 'Urgent', desc: 'Critical blocker requiring rapid resolution' }
];

export default function StudentTicketModal({
  isOpen,
  onClose,
  currentUser,
  onSuccess
}) {
  const [category, setCategory] = useState('academic');
  const [priority, setPriority] = useState('medium');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedTicket, setSubmittedTicket] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setCategory('academic');
      setPriority('medium');
      setSubject('');
      setDescription('');
      setError('');
      setSubmittedTicket(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanSubj = subject.trim();
    const cleanDesc = description.trim();

    if (!cleanSubj || cleanSubj.length < 3) {
      setError('Please provide a descriptive subject of at least 3 characters.');
      return;
    }

    if (!cleanDesc || cleanDesc.length < 5) {
      setError('Please provide details explaining your inquiry or issue (at least 5 characters).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.studentCreateSupportTicket({
        category,
        priority,
        subject: cleanSubj,
        description: cleanDesc
      });

      if (res && res.success) {
        setSubmittedTicket(res);
        if (onSuccess) {
          onSuccess(res.message || 'Support ticket submitted successfully!');
        }
      } else {
        setError(res?.error || 'Failed to submit support ticket. Please try again.');
      }
    } catch (err) {
      setError(err?.message || 'A network error occurred while submitting your ticket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticket-modal-title"
      >
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-[#0A7CB3] text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center border border-white/20 shrink-0">
              <HelpCircle className="w-5 h-5 text-sky-300" />
            </div>
            <div>
              <h2 id="ticket-modal-title" className="text-base sm:text-lg font-bold text-white leading-tight">
                Raise Support & Academic Ticket
              </h2>
              <p className="text-xs text-sky-100">
                Direct inquiry to Aaroha Academic Operations & Faculty
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Close support dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        {submittedTicket ? (
          <div className="p-6 sm:p-8 space-y-5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-900">Ticket Submitted Successfully</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Your ticket <span className="font-mono font-bold text-slate-800">{submittedTicket.ticket_number}</span> has been logged with the Academic Coordinator team.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left text-xs space-y-2 max-w-md mx-auto">
              <div className="flex justify-between">
                <span className="text-slate-500">Tracking Number:</span>
                <span className="font-mono font-bold text-[#0A7CB3]">{submittedTicket.ticket_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Student Account:</span>
                <span className="font-semibold text-slate-800">{currentUser?.full_name || 'Enrolled Student'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Initial Status:</span>
                <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 text-[10px] uppercase">
                  <Clock size={10} /> Open
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-[#0A7CB3] hover:bg-[#086491] text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-4 max-h-[82dvh] overflow-y-auto">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Category */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Inquiry Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs focus:outline-hidden focus:border-[#0A7CB3] focus:bg-white transition-colors cursor-pointer"
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">
                {CATEGORIES.find(c => c.value === category)?.desc}
              </p>
            </div>

            {/* Priority */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Urgency Level
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRIORITIES.map(p => {
                  const isSelected = priority === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPriority(p.value)}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#0A7CB3] bg-sky-50/70 text-[#0A7CB3] font-bold shadow-2xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      <div className="text-xs font-semibold">{p.label}</div>
                      <div className="text-[10px] text-slate-500 line-clamp-1">{p.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Subject Summary <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={200}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of your question, milestone issue, or technical problem..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs focus:outline-hidden focus:border-[#0A7CB3] focus:bg-white transition-colors"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Detailed Inquiry or Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please describe the question, module reference, error code, or specific guidance needed in detail..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs focus:outline-hidden focus:border-[#0A7CB3] focus:bg-white transition-colors resize-y min-h-[90px]"
              />
            </div>

            {/* Institutional note */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px] flex items-center gap-2">
              <ShieldCheck size={14} className="text-[#0A7CB3] shrink-0" />
              <span>
                Tickets are reviewed by Academic Operations within 24 hours. Responses appear in your academic thread.
              </span>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-[#0A7CB3] hover:bg-[#086491] text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Submitting Ticket...
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    Submit Ticket
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
