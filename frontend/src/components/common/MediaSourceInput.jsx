import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, Link2, X, CheckCircle2, AlertCircle, 
  FileText, Film, Image as ImageIcon, Loader2, RefreshCw, Trash2, Eye
} from 'lucide-react';
import api from '../../apiService';

const CATEGORY_CONFIG = {
  course_image: {
    allowedExtensions: ['.png', '.jpg', '.jpeg', '.webp', '.svg'],
    allowedMimePrefix: 'image/',
    maxSizeMB: 10,
    typeLabel: 'PNG, JPG, WEBP, or SVG',
    icon: ImageIcon
  },
  lesson_video: {
    allowedExtensions: ['.mp4', '.webm', '.mov', '.mkv'],
    allowedMimePrefix: 'video/',
    maxSizeMB: 500,
    typeLabel: 'MP4, WEBM, MOV, or MKV',
    icon: Film
  },
  class_recording: {
    allowedExtensions: ['.mp4', '.webm', '.mov', '.mkv'],
    allowedMimePrefix: 'video/',
    maxSizeMB: 500,
    typeLabel: 'MP4, WEBM, or MOV',
    icon: Film
  },
  material_document: {
    allowedExtensions: ['.pdf', '.docx', '.pptx', '.xlsx', '.txt', '.zip'],
    allowedMimePrefix: '',
    maxSizeMB: 50,
    typeLabel: 'PDF, DOCX, PPTX, XLSX, TXT, or ZIP',
    icon: FileText
  },
  assignment_attachment: {
    allowedExtensions: ['.pdf', '.zip', '.docx', '.txt', '.ipynb', '.py'],
    allowedMimePrefix: '',
    maxSizeMB: 50,
    typeLabel: 'PDF, ZIP, DOCX, or Code Archives',
    icon: FileText
  },
  task_submission: {
    allowedExtensions: ['.pdf', '.zip', '.tar.gz', '.docx', '.txt', '.ipynb', '.py', '.js', '.ts'],
    allowedMimePrefix: '',
    maxSizeMB: 50,
    typeLabel: 'PDF, ZIP, IPYNB, Code Archives, or DOCX',
    icon: FileText
  }
};

export default function MediaSourceInput({
  value = '',
  onChange,
  category = 'material_document',
  label = 'Content Source',
  helpText = '',
  required = false,
  placeholderUrl = 'https://...',
  existingMetadata = null
}) {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.material_document;
  const CategoryIcon = config.icon;

  // Determine initial mode based on value: if value is an uploaded file (/api/uploads/...) or has storage_key, default to 'upload'
  const isUploadedUrl = value && (value.includes('/api/uploads/') || existingMetadata?.source_type === 'upload');
  const [sourceMode, setSourceMode] = useState(isUploadedUrl || !value ? 'upload' : 'url');
  
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadedFile, setUploadedFile] = useState(() => {
    if (isUploadedUrl) {
      return {
        url: value,
        name: existingMetadata?.file_name || existingMetadata?.original_filename || 'Uploaded File',
        size: existingMetadata?.file_size || null,
        file_key: existingMetadata?.storage_key || null
      };
    }
    return null;
  });

  const [urlInput, setUrlInput] = useState(!isUploadedUrl ? value : '');
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);

  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Sync when value prop changes externally
  useEffect(() => {
    if (value && value.includes('/api/uploads/')) {
      setSourceMode('upload');
      setUploadedFile(prev => prev || {
        url: value,
        name: existingMetadata?.file_name || 'Uploaded File',
        size: existingMetadata?.file_size || null
      });
    } else if (value && !value.includes('/api/uploads/')) {
      setUrlInput(value);
    }
  }, [value, existingMetadata]);

  const validateFile = (file) => {
    if (!file) return 'No file selected.';
    
    // Size check
    const maxBytes = config.maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum allowed limit of ${config.maxSizeMB}MB.`;
    }

    // Extension check
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    const isExtAllowed = config.allowedExtensions.some(e => e.toLowerCase() === ext);
    if (!isExtAllowed) {
      return `File format not supported. Allowed formats: ${config.allowedExtensions.join(', ')}`;
    }

    return null;
  };

  const handleFileSelect = async (file) => {
    if (!file) return;
    setUploadError('');
    const validationError = validateFile(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      let result;
      // For files > 20MB, use chunked upload
      if (file.size > 20 * 1024 * 1024 && api.uploadLargeFileChunked) {
        result = await api.uploadLargeFileChunked(file, category, (pct) => {
          setUploadProgress(pct);
        }, abortController.signal);
      } else {
        result = await api.uploadFile(file, category, (pct) => {
          setUploadProgress(pct);
        }, abortController.signal);
      }

      if (result && result.success && (result.file || result.url)) {
        const fileObj = result.file || result;
        const fileInfo = {
          url: fileObj.url || fileObj.public_url || fileObj.signed_stream_url,
          name: fileObj.original_filename || fileObj.filename || file.name,
          size: fileObj.file_size || file.size,
          file_key: fileObj.file_key || fileObj.storage_key,
          mime_type: fileObj.mime_type || file.type
        };
        setUploadedFile(fileInfo);
        setUploadProgress(100);
        setUploadError('');
        if (onChange) {
          onChange(fileInfo.url, {
            source_type: 'upload',
            storage_key: fileInfo.file_key,
            file_name: fileInfo.name,
            file_size: fileInfo.size,
            mime_type: fileInfo.mime_type
          });
        }
      } else {
        throw new Error(result?.error || 'File upload failed on server.');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setUploadError('Upload cancelled.');
      } else {
        setUploadError(err.message || 'File upload failed. Please try again.');
      }
    } finally {
      setIsUploading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setUploadProgress(0);
    setUploadError('');
    setShowConfirmRemove(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onChange) {
      onChange('', {
        source_type: 'upload',
        storage_key: null,
        file_name: null,
        file_size: null,
        mime_type: null
      });
    }
  };

  const handleUrlChange = (newUrl) => {
    const trimmed = typeof newUrl === 'string' ? newUrl.trim() : '';
    setUrlInput(newUrl);
    setUploadError('');
    if (onChange) {
      onChange(trimmed, {
        source_type: 'url',
        storage_key: null,
        file_name: null,
        file_size: null,
        mime_type: null
      });
    }
  };

  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center justify-between">
        <label className="font-semibold text-slate-800 flex items-center gap-1.5">
          <CategoryIcon className="w-3.5 h-3.5 text-[#0A7CB3]" />
          <span>{label} {required && <span className="text-rose-500">*</span>}</span>
        </label>
        
        {/* Source Mode Toggle */}
        <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => {
              setSourceMode('upload');
              setUploadError('');
            }}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
              sourceMode === 'upload'
                ? 'bg-white text-[#0A7CB3] shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <UploadCloud className="w-3 h-3" />
            <span>Upload File</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSourceMode('url');
              setUploadError('');
            }}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
              sourceMode === 'url'
                ? 'bg-white text-[#0A7CB3] shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Link2 className="w-3 h-3" />
            <span>External URL</span>
          </button>
        </div>
      </div>

      {helpText && <p className="text-[11px] text-slate-500">{helpText}</p>}

      {/* 1. UPLOAD FILE MODE */}
      {sourceMode === 'upload' && (
        <div className="space-y-2">
          {!uploadedFile && !isUploading && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileSelect(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`p-5 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-[#0A7CB3] bg-sky-50/50'
                  : 'border-slate-300 hover:border-[#0A7CB3] bg-slate-50/60 hover:bg-white'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={config.allowedExtensions.join(',')}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />
              <div className="flex flex-col items-center justify-center space-y-1.5">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-[#0A7CB3] flex items-center justify-center">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold text-slate-700">
                  <span className="text-[#0A7CB3] font-bold underline">Click to browse</span> or drag and drop file here
                </div>
                <div className="text-[11px] text-slate-400">
                  Allowed: {config.typeLabel} (Max {config.maxSizeMB}MB)
                </div>
              </div>
            </div>
          )}

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0A7CB3]" />
                  <span>Uploading file...</span>
                </span>
                <span className="font-mono font-bold text-[#0A7CB3]">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#0A7CB3] h-2 rounded-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleCancelUpload}
                  className="px-2.5 py-1 text-[11px] text-slate-600 hover:text-rose-600 font-semibold cursor-pointer"
                >
                  Cancel Upload
                </button>
              </div>
            </div>
          )}

          {/* Uploaded File Card & Preview */}
          {uploadedFile && (
            <div className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-xs truncate">
                      {uploadedFile.name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {uploadedFile.size ? `${(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB • ` : ''}
                      Direct Storage Asset
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {uploadedFile.url && (
                    <a
                      href={uploadedFile.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-[#0A7CB3] hover:bg-slate-100 transition-colors"
                      title="Preview / Download Asset"
                    >
                      <Eye className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Replace File"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmRemove(true)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Remove File"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Live Preview for Images or Videos */}
              {category === 'course_image' && uploadedFile.url && (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 max-h-40 bg-slate-900/5">
                  <img
                    src={uploadedFile.url}
                    alt="Preview"
                    className="w-full h-32 object-cover"
                  />
                </div>
              )}

              {category === 'lesson_video' && uploadedFile.url && (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-950">
                  <video
                    src={uploadedFile.url}
                    controls
                    className="w-full max-h-48 object-contain"
                  />
                </div>
              )}

              {/* Confirmation for Remove */}
              {showConfirmRemove && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2 animate-in fade-in duration-100">
                  <p className="text-[11px] text-rose-800 font-semibold">
                    Are you sure you want to remove this uploaded file?
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowConfirmRemove(false)}
                      className="px-2 py-1 rounded bg-white text-slate-700 text-[11px] font-bold border border-slate-200 cursor-pointer"
                    >
                      Keep File
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="px-2 py-1 rounded bg-rose-600 text-white text-[11px] font-bold cursor-pointer hover:bg-rose-700"
                    >
                      Confirm Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Hidden file input for Replace action */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={config.allowedExtensions.join(',')}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelect(e.target.files[0]);
              }
            }}
          />
        </div>
      )}

      {/* 2. EXTERNAL URL MODE */}
      {sourceMode === 'url' && (
        <div className="space-y-2">
          <div className="relative flex items-center">
            <Link2 className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="url"
              value={urlInput}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder={placeholderUrl}
              required={required && sourceMode === 'url'}
              className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden focus:border-[#0A7CB3] transition-all text-xs"
            />
            {urlInput && (
              <button
                type="button"
                onClick={() => handleUrlChange('')}
                className="absolute right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 cursor-pointer"
                title="Clear URL"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>Supports direct HTTP/HTTPS URLs (PNG, JPG, WEBP, SVG), Bunny Stream, and CDN endpoints.</span>
            {urlInput && (
              <a
                href={urlInput}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0A7CB3] hover:underline flex items-center gap-0.5 font-semibold"
              >
                <span>Test Link</span>
                <Eye className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Live Preview for External Image */}
          {urlInput && category === 'course_image' && (
            <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900/5 p-2">
              <div className="text-[11px] font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
                <span>External Image Preview</span>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  URL Loaded
                </span>
              </div>
              <img
                src={urlInput}
                alt="Thumbnail Preview"
                className="w-full h-32 object-cover rounded-lg border border-slate-200"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  setUploadError('Unable to render image from the specified URL. Please ensure it is a direct, publicly accessible image URL.');
                }}
                onLoad={() => {
                  setUploadError('');
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Validation / Error Message */}
      {uploadError && (
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-1.5 text-[11px]">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{uploadError}</span>
        </div>
      )}
    </div>
  );
}
