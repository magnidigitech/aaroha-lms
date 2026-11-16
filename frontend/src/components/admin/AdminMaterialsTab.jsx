import React, { useState } from 'react';
import {
  FileText, Video, Link as LinkIcon, PlusCircle, Download,
  ExternalLink, Trash2, Eye, Calendar, Clock, Layers, BookOpen, X
} from 'lucide-react';
import { formatDate } from '../../adminUtils';

export default function AdminMaterialsTab({
  materials = [],
  courses = [],
  batches = [],
  onCreateMaterial,
  onDeleteMaterial
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const [newMaterial, setNewMaterial] = useState({
    title: '',
    description: '',
    material_type: 'document',
    file_url: '',
    external_url: '',
    course_id: '',
    batch_id: '',
    is_published: true,
    file_size: '3.5 MB',
    file_type: 'PDF'
  });

  const filteredMaterials = materials.filter(m => {
    const matchesSearch = !searchTerm ||
      (m.title && m.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (m.description && m.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = typeFilter === 'all' || m.material_type === typeFilter;
    const matchesCourse = courseFilter === 'all' || String(m.course_id) === String(courseFilter);

    return matchesSearch && matchesType && matchesCourse;
  });

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newMaterial.title || !newMaterial.course_id) return;

    await onCreateMaterial(newMaterial);
    setIsUploadModalOpen(false);
    setNewMaterial({
      title: '',
      description: '',
      material_type: 'document',
      file_url: '',
      external_url: '',
      course_id: '',
      batch_id: '',
      is_published: true,
      file_size: '3.5 MB',
      file_type: 'PDF'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Learning Materials & Resource Vault</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Architectural whitepapers, GitHub code blueprints, lecture recordings, and session artifacts.
          </p>
        </div>

        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-colors"
        >
          <PlusCircle size={15} /> Publish Resource
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          type="text"
          placeholder="Search learning materials..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs focus:outline-hidden focus:border-blue-500"
        />

        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-hidden"
        >
          <option value="all">All Media Types</option>
          <option value="document">PDF & Documentation</option>
          <option value="link">GitHub & External Links</option>
          <option value="video">Video Lectures</option>
          <option value="recording">Session Recordings</option>
        </select>

        <select
          value={courseFilter}
          onChange={e => setCourseFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-hidden"
        >
          <option value="all">All Programs</option>
          {courses.map(c => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>

      {/* Materials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMaterials.map(m => (
          <div
            key={m.id}
            className="p-5 rounded-xl bg-white border border-slate-200 flex flex-col justify-between space-y-3 hover:border-slate-200 transition-colors"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <span className="p-2 rounded-lg bg-slate-100 border border-slate-200 text-[#0A7CB3]">
                  {m.material_type === 'link' ? <LinkIcon size={18} /> : m.material_type === 'video' ? <Video size={18} /> : <FileText size={18} />}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200 uppercase">
                  {m.file_type || m.material_type}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-sm line-clamp-2">{m.title}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{m.description}</p>
              </div>

              <div className="text-[11px] text-slate-500 space-y-0.5 pt-2 border-t border-slate-200">
                <div>Program: <strong className="text-slate-700">{m.course_title}</strong></div>
                {m.batch_code && <div>Cohort: <strong className="text-[#0A7CB3]">{m.batch_code}</strong></div>}
                <div>Size: {m.file_size || 'N/A'}</div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              {m.external_url || m.file_url ? (
                <a
                  href={m.external_url || m.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-900 font-semibold flex items-center gap-1"
                >
                  <ExternalLink size={13} /> Open Resource
                </a>
              ) : (
                <span className="text-xs text-slate-500">Local Resource</span>
              )}

              <button
                onClick={() => onDeleteMaterial && onDeleteMaterial(m.id)}
                className="p-1 rounded text-slate-500 hover:text-rose-700 transition-colors"
                title="Archive Resource"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Material Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Publish Learning Resource</h2>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-500 hover:text-slate-900">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Resource Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Consensus Verification Checklist"
                  value={newMaterial.title}
                  onChange={e => setNewMaterial({ ...newMaterial, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Target Program Course *</label>
                <select
                  required
                  value={newMaterial.course_id}
                  onChange={e => setNewMaterial({ ...newMaterial, course_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
                >
                  <option value="">-- Choose Course --</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Resource Type</label>
                  <select
                    value={newMaterial.material_type}
                    onChange={e => setNewMaterial({ ...newMaterial, material_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
                  >
                    <option value="document">Document (PDF/DOC)</option>
                    <option value="link">External / GitHub Link</option>
                    <option value="video">Video Stream</option>
                    <option value="recording">Live Class Recording</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Target Cohort Batch (Optional)</label>
                  <select
                    value={newMaterial.batch_id}
                    onChange={e => setNewMaterial({ ...newMaterial, batch_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
                  >
                    <option value="">All Batches</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>{b.batch_code}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Resource Link / File URL *</label>
                <input
                  type="url"
                  placeholder="https://assets.aaroha-inc.com/... or https://github.com/..."
                  value={newMaterial.file_url || newMaterial.external_url}
                  onChange={e => setNewMaterial({ ...newMaterial, file_url: e.target.value, external_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Description</label>
                <textarea
                  rows="2"
                  placeholder="Outline purpose, prerequisites, or usage instructions..."
                  value={newMaterial.description}
                  onChange={e => setNewMaterial({ ...newMaterial, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md"
                >
                  Publish Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

