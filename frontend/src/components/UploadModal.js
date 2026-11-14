'use client';

import { useState, useRef } from 'react';
import { uploadDocument } from '@/lib/api';

export default function UploadModal({ onClose, onUploaded }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [sourceType, setSourceType] = useState('upload');
  const [classification, setClassification] = useState('internal');
  const [allowedRoles, setAllowedRoles] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      setFile(e.dataTransfer.files[0]);
      if (!title) setTitle(e.dataTransfer.files[0].name.replace(/\.[^.]+$/, ''));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      if (!title) setTitle(e.target.files[0].name.replace(/\.[^.]+$/, ''));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const doc = await uploadDocument(file, {
        title: title || undefined,
        source_type: sourceType,
        classification,
        allowed_roles: allowedRoles || undefined,
      });
      onUploaded?.(doc);
      onClose();
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content animate-scale-in">
        <div className="modal-header">
          <h2>📄 Upload Document</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 'var(--radius-md)', color: 'var(--rose-400)', fontSize: '0.8rem' }}>
              ⚠ {error}
            </div>
          )}

          {/* Dropzone */}
          <div
            className={`dropzone ${dragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" hidden onChange={handleFileChange}
              accept=".pdf,.txt,.md,.markdown,.html,.htm,.csv,.json,.log,.rst,.docx,.pptx" />
            {file ? (
              <>
                <div className="dropzone-icon">📎</div>
                <div className="dropzone-text" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{file.name}</div>
                <div className="dropzone-hint">{(file.size / 1024 / 1024).toFixed(2)} MB · Click to change</div>
              </>
            ) : (
              <>
                <div className="dropzone-icon">📁</div>
                <div className="dropzone-text">Drop a file here or click to browse</div>
                <div className="dropzone-hint">PDF, TXT, MD, MARKDOWN, HTML, HTM, CSV, JSON, LOG, RST, DOCX, PPTX (max 25 MB)</div>
              </>
            )}
          </div>

          {/* Metadata */}
          <div className="form-grid">
            <div className="input-group full-width">
              <label htmlFor="upload-title">Title</label>
              <input id="upload-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title" />
            </div>

            <div className="input-group">
              <label htmlFor="upload-source">Source Type</label>
              <select id="upload-source" className="select" value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
                <option value="upload">Upload</option>
                <option value="pdf">PDF</option>
                <option value="confluence">Confluence</option>
                <option value="jira">Jira</option>
                <option value="notion">Notion</option>
                <option value="sharepoint">SharePoint</option>
                <option value="sql">SQL</option>
                <option value="drive">Drive</option>
                <option value="email">Email</option>
              </select>
            </div>

            <div className="input-group">
              <label htmlFor="upload-class">Classification</label>
              <select id="upload-class" className="select" value={classification} onChange={(e) => setClassification(e.target.value)}>
                <option value="public">Public</option>
                <option value="internal">Internal</option>
                <option value="confidential">Confidential</option>
                <option value="restricted">Restricted</option>
              </select>
            </div>

            <div className="input-group full-width">
              <label htmlFor="upload-roles">Allowed Roles (comma-separated, * = everyone)</label>
              <input id="upload-roles" className="input" value={allowedRoles} onChange={(e) => setAllowedRoles(e.target.value)} placeholder="e.g. employee, manager or *" />
            </div>
          </div>

          <div className="modal-footer" style={{ margin: 0, paddingTop: 16 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={!file || uploading}>
              {uploading ? '⏳ Uploading…' : '📤 Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
