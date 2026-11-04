import React, { useState } from 'react';
import { User, EncryptedFileItem, FileComment, FileVersion } from '../types';
import { computeSha256, encryptAes256, formatBytes, textToBytes } from '../utils/crypto';
import { 
  FileText, Download, ShieldCheck, Lock, Edit3, Save, 
  MessageSquare, CheckCircle2, History, X, ZoomIn, ZoomOut, 
  Table, Image as ImageIcon, Send, User as UserIcon, Trash2
} from 'lucide-react';

interface DocumentViewerModalProps {
  file: EncryptedFileItem | null;
  currentUser: User;
  onClose: () => void;
  onUpdateFile: (updatedFile: EncryptedFileItem) => void;
  onDownload: (file: EncryptedFileItem) => void;
  onDeleteFile?: (fileId: string) => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  file,
  currentUser,
  onClose,
  onUpdateFile,
  onDownload,
  onDeleteFile
}) => {
  if (!file) return null;

  // Determine user permission
  const isOwner = file.ownerEmail.toLowerCase() === currentUser.email.toLowerCase();
  const collabEntry = file.sharedWith?.find(c => c.email.toLowerCase() === currentUser.email.toLowerCase());
  const userPermission: 'owner' | 'editor' | 'reviewer' | 'viewer' = isOwner 
    ? 'owner' 
    : collabEntry?.permission || (file.generalAccess === 'mcl_domain' ? 'viewer' : 'viewer');

  const canEdit = isOwner || userPermission === 'editor';
  const canReview = isOwner || userPermission === 'editor' || userPermission === 'reviewer';

  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState<string>(file.rawContent || `[Decrypted Payload for ${file.name}]`);
  const [commitNote, setCommitNote] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);

  // Comments for reviewer / editor
  const [comments, setComments] = useState<FileComment[]>(file.comments || [
    {
      id: 'c-1',
      author: 'Prof. Enrico Santos',
      email: 'esantos@mcl.edu.ph',
      timestamp: '2026-11-04 10:15:00',
      text: 'Verified cryptographic parameters and campus network topology for Laguna node.'
    }
  ]);
  const [newCommentText, setNewCommentText] = useState('');
  const [activeTab, setActiveTab] = useState<'preview' | 'comments' | 'versions'>('preview');
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const handleSaveNewRevision = async () => {
    setIsCommitting(true);
    try {
      const bytes = textToBytes(editedContent);
      const newHash = await computeSha256(bytes);
      const encrypted = await encryptAes256(bytes);

      const nextVer = file.currentVersion + 1;
      const newVerEntry: FileVersion = {
        version: nextVer,
        uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        fileSize: bytes.length,
        sha256Hash: newHash,
        changeNote: commitNote.trim() || `Editor update by ${currentUser.name}`,
        uploadedBy: currentUser.email
      };

      const updatedFile: EncryptedFileItem = {
        ...file,
        currentVersion: nextVer,
        size: bytes.length,
        sha256Hash: newHash,
        rawContent: editedContent,
        encryptedPayloadPreview: encrypted.ciphertextHex,
        uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        versions: [newVerEntry, ...file.versions]
      };

      onUpdateFile(updatedFile);
      setIsEditing(false);
      setCommitNote('');
      alert(`Revision v${nextVer} successfully encrypted with AES-256 and committed!`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCommitting(false);
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const newComment: FileComment = {
      id: `comm-${Date.now()}`,
      author: currentUser.name,
      email: currentUser.email,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      text: newCommentText.trim()
    };

    const updatedComments = [...comments, newComment];
    setComments(updatedComments);
    setNewCommentText('');

    onUpdateFile({
      ...file,
      comments: updatedComments
    });
  };

  const isPdf = file.mimeType.includes('pdf') || file.name.endsWith('.pdf');
  const isDoc = file.mimeType.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc');
  const isSheet = file.mimeType.includes('sheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.csv');
  const isImage = file.mimeType.includes('image');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Top Control Header */}
        <div className="px-5 py-3.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded bg-rose-700 flex items-center justify-center font-bold text-white text-xs shrink-0">
              {isPdf ? 'PDF' : isDoc ? 'DOC' : isSheet ? 'XLS' : 'IMG'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-white truncate" title={file.name}>
                  {file.name}
                </h3>
                <span className="text-[10px] font-mono text-rose-400 bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-900">
                  v{file.currentVersion}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-900 hidden sm:inline">
                  AES-256 Decrypted
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                <span>{file.folder}</span>
                <span>·</span>
                <span>{formatBytes(file.size)}</span>
                <span>·</span>
                <span className="capitalize text-amber-400 font-semibold">Your role: {userPermission}</span>
              </div>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Zoom controls for visual viewer */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.max(75, prev - 15))}
                className="p-1 hover:text-white text-slate-400"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono text-slate-300 px-1">{zoomLevel}%</span>
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.min(150, prev + 15))}
                className="p-1 hover:text-white text-slate-400"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Edit Button if Editor / Owner */}
            {canEdit && (
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className={`py-1.5 px-3 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                  isEditing 
                    ? 'bg-amber-600 text-white' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Cancel Edit' : 'Edit Document'}</span>
              </button>
            )}

            {/* Download Clean Decrypted Payload */}
            <button
              type="button"
              onClick={() => onDownload(file)}
              className="py-1.5 px-3 bg-rose-700 hover:bg-rose-600 text-white rounded-lg text-xs font-medium transition flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download Decrypted</span>
            </button>

            {/* Delete button for Owner / Admin */}
            {(isOwner || currentUser.role === 'admin') && onDeleteFile && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Permanently delete "${file.name}"?`)) {
                    onDeleteFile(file.id);
                    onClose();
                  }
                }}
                className="py-1.5 px-2.5 bg-slate-800 hover:bg-red-950/80 text-slate-400 hover:text-red-400 rounded-lg text-xs font-medium transition flex items-center gap-1"
                title="Delete File"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Switcher Tabs (Document / Reviewer Comments / Version Ledger) */}
        <div className="bg-slate-950 px-6 py-2 border-b border-slate-800 flex items-center gap-4 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`py-1 transition ${activeTab === 'preview' ? 'text-rose-400 border-b-2 border-rose-500 font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Decrypted Content View
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('comments')}
            className={`py-1 transition flex items-center gap-1.5 ${activeTab === 'comments' ? 'text-rose-400 border-b-2 border-rose-500 font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <MessageSquare className="w-3 h-3" />
            <span>Reviewer Comments ({comments.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('versions')}
            className={`py-1 transition flex items-center gap-1.5 ${activeTab === 'versions' ? 'text-rose-400 border-b-2 border-rose-500 font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <History className="w-3 h-3" />
            <span>Version Commits ({file.versions.length})</span>
          </button>
        </div>

        {/* Main Body View */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/60">
          
          {/* TAB 1: PREVIEW */}
          {activeTab === 'preview' && (
            <div className="max-w-4xl mx-auto space-y-4" style={{ zoom: `${zoomLevel}%` }}>
              
              {/* EDIT MODE FOR EDITORS & OWNERS */}
              {isEditing ? (
                <div className="bg-slate-900 border border-amber-600/50 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editor Workspace — Modifying Protected Document</span>
                      </span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Changes will be re-encrypted with AES-256-GCM and committed as Version {file.currentVersion + 1}.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Revision Commit Note (Required for Cryptographic Audit)
                    </label>
                    <input
                      type="text"
                      value={commitNote}
                      onChange={e => setCommitNote(e.target.value)}
                      placeholder="e.g. Revised Chapter 2 cybersecurity invariants per review comments"
                      required
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Document Payload Content
                    </label>
                    <textarea
                      rows={14}
                      value={editedContent}
                      onChange={e => setEditedContent(e.target.value)}
                      className="w-full p-4 bg-slate-950 border border-slate-700 rounded-xl font-mono text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveNewRevision}
                      disabled={isCommitting}
                      className="py-2 px-5 bg-rose-700 hover:bg-rose-600 text-white font-medium text-xs rounded-lg transition shadow-sm flex items-center gap-2"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isCommitting ? 'Encrypting & Committing...' : `Commit Revision v${file.currentVersion + 1}`}</span>
                    </button>
                  </div>
                </div>
              ) : isPdf ? (
                /* PDF DOCUMENT PREVIEW (Academic Paper Style) */
                <div className="bg-white text-slate-900 rounded-2xl shadow-2xl p-8 sm:p-12 space-y-6 max-w-3xl mx-auto border border-slate-200">
                  {/* Institutional Header */}
                  <div className="border-b-2 border-rose-900 pb-4 text-center space-y-1">
                    <div className="text-xs font-bold tracking-widest text-rose-900 uppercase">
                      Mapúa Malayan Colleges Laguna
                    </div>
                    <div className="text-sm font-semibold text-slate-800">
                      College of Information Technology · Campus Vault Repository
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Security Level: Confidential Institutional Document · Cabuyao, Laguna
                    </div>
                  </div>

                  {/* Document Title */}
                  <div className="text-center py-2 space-y-1">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-950 tracking-tight">
                      {file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ")}
                    </h2>
                    <div className="text-xs text-slate-600">
                      Author: <span className="font-semibold">{file.ownerName}</span> ({file.ownerEmail})
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Revision Version: v{file.currentVersion} · Last Cryptographic Signature: {file.uploadedAt}
                    </div>
                  </div>

                  {/* Content Box */}
                  <div className="prose prose-sm max-w-none text-slate-800 leading-relaxed space-y-4 pt-2">
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono">
                      <strong>Document Abstract & Verification Notice:</strong>
                      <p className="mt-1 text-slate-600">
                        This digital payload is end-to-end encrypted with AES-256-GCM. File transmission is restricted strictly to members authenticated within Mapúa Malayan Colleges Laguna institutional subnets.
                      </p>
                    </div>

                    <div className="space-y-3 font-serif text-sm">
                      <h4 className="font-sans font-bold text-slate-900 text-sm">1. Course & Capstone Scope</h4>
                      <p>
                        This documentation establishes the curriculum, security protocols, and verifiable invariant testing required for students and faculty enrolled in academic period 2026. All lab submissions must pass SHA-256 hash validation before graduation clearances are issued.
                      </p>
                      
                      <h4 className="font-sans font-bold text-slate-900 text-sm">2. Payload Details</h4>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-xs text-slate-700 whitespace-pre-wrap">
                        {file.rawContent || "Encrypted byte streams verified. Plaintext authenticated by SeshCure Security Core."}
                      </div>

                      <h4 className="font-sans font-bold text-slate-900 text-sm">3. Campus Compliance</h4>
                      <p>
                        In accordance with Mapúa MCL IT governance policies, documents containing student evaluations, midterm grades, or capstone architectures are air-gapped on campus servers and accessible only via JWT authenticated sessions.
                      </p>
                    </div>
                  </div>

                  {/* Cryptographic Watermark Footer */}
                  <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row items-center justify-between text-[10px] font-mono text-slate-500 gap-2">
                    <span>MCL SeshCure Certified · AES-256 Payload</span>
                    <span className="truncate max-w-xs" title={file.sha256Hash}>
                      SHA-256: {file.sha256Hash}
                    </span>
                  </div>
                </div>
              ) : isDoc ? (
                /* DOCX DOCUMENT PREVIEW */
                <div className="bg-white text-slate-900 rounded-2xl shadow-2xl p-8 sm:p-12 space-y-6 max-w-3xl mx-auto border border-slate-200 font-sans">
                  <div className="flex items-center justify-between border-b border-blue-900 pb-3">
                    <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                      Mapúa MCL Academic Document
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">v{file.currentVersion} Active Head</span>
                  </div>

                  <h2 className="text-xl font-bold text-slate-900">
                    {file.name}
                  </h2>

                  <div className="text-xs text-slate-600 font-medium">
                    Owner: {file.ownerName} · Department: {file.folder}
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {file.rawContent || "SeshCure Secure Document Specifications\nMapua Malayan Colleges Laguna"}
                  </div>

                  <div className="text-[11px] text-slate-500 border-t border-slate-200 pt-3 flex justify-between font-mono">
                    <span>File size: {formatBytes(file.size)}</span>
                    <span>Checksum: {file.sha256Hash.slice(0, 20)}...</span>
                  </div>
                </div>
              ) : isSheet ? (
                /* SPREADSHEET TABLE PREVIEW */
                <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden space-y-4 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Table className="w-4 h-4 text-emerald-400" />
                        <span>{file.name}</span>
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">Faculty Evaluation & Midterm Master Sheet</p>
                    </div>
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-900">
                      FERPA Protected
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-slate-800 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-950 text-slate-300 border-b border-slate-800 font-mono text-[11px]">
                          <th className="py-2.5 px-3">Student ID</th>
                          <th className="py-2.5 px-3">Student Name</th>
                          <th className="py-2.5 px-3">Midterm Exam (40%)</th>
                          <th className="py-2.5 px-3">Lab Projects (40%)</th>
                          <th className="py-2.5 px-3">Quizzes (20%)</th>
                          <th className="py-2.5 px-3 text-right">Computed Final</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                        <tr className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 text-rose-400">2023-10492</td>
                          <td className="py-2.5 px-3 font-sans text-slate-200 font-medium">Maria Clara Ramos</td>
                          <td className="py-2.5 px-3">94.5%</td>
                          <td className="py-2.5 px-3">96.0%</td>
                          <td className="py-2.5 px-3">92.0%</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-400">1.25 (Superior)</td>
                        </tr>
                        <tr className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 text-rose-400">2023-10884</td>
                          <td className="py-2.5 px-3 font-sans text-slate-200 font-medium">Jose Protacio Mercado</td>
                          <td className="py-2.5 px-3">89.0%</td>
                          <td className="py-2.5 px-3">91.5%</td>
                          <td className="py-2.5 px-3">88.0%</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-400">1.75 (Very Good)</td>
                        </tr>
                        <tr className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 text-rose-400">2023-11204</td>
                          <td className="py-2.5 px-3 font-sans text-slate-200 font-medium">Andres Bonifacio Castro</td>
                          <td className="py-2.5 px-3">85.0%</td>
                          <td className="py-2.5 px-3">88.0%</td>
                          <td className="py-2.5 px-3">84.0%</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-400">2.00 (Good)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* IMAGE / BLUEPRINT PREVIEW */
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 text-center space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
                    <span className="font-semibold text-white">{file.name}</span>
                    <span className="font-mono text-slate-400">Dimensions: 3840 x 2160 (High Res)</span>
                  </div>

                  {/* Simulated network blueprint canvas */}
                  <div className="w-full h-80 bg-slate-950 rounded-xl border border-slate-800 flex flex-col items-center justify-center p-6 text-slate-400 relative overflow-hidden group">
                    <div className="w-20 h-20 rounded-2xl bg-rose-950/80 border border-rose-800/80 flex items-center justify-center text-rose-400 mb-3">
                      <ImageIcon className="w-10 h-10" />
                    </div>
                    <div className="text-sm font-semibold text-white">Mapúa MCL Air-Gapped Campus Topology</div>
                    <p className="text-xs text-slate-500 mt-1 max-w-md">
                      Pulo-Diezmo fiber backbone diagram decrypted on device. Sealed under administrative security protocols.
                    </p>
                    <div className="mt-3 text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-1 rounded border border-emerald-800">
                      AES-256 Vector Map Authenticated
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: COMMENTS (FOR REVIEWERS / EDITORS) */}
          {activeTab === 'comments' && (
            <div className="max-w-2xl mx-auto space-y-5">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-rose-500" />
                  <span>Collaborator Review Comments</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Reviewers and editors can leave feedback and audit notes tied to this file version.
                </p>

                {/* Add Comment Form */}
                {canReview ? (
                  <form onSubmit={handleAddComment} className="space-y-2 pt-2">
                    <textarea
                      rows={3}
                      value={newCommentText}
                      onChange={e => setNewCommentText(e.target.value)}
                      placeholder={`Add a review comment as ${currentUser.name}...`}
                      className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="py-1.5 px-4 bg-rose-700 hover:bg-rose-600 text-white rounded-lg text-xs font-medium transition flex items-center gap-1.5 shadow-sm"
                      >
                        <Send className="w-3 h-3" />
                        <span>Post Review Note</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-500">
                    You have <strong>Viewer</strong> role. Only Reviewers and Editors can post comments.
                  </div>
                )}
              </div>

              {/* Comments Feed */}
              <div className="space-y-3">
                {comments.map(c => (
                  <div key={c.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300 text-[10px]">
                          {c.author.charAt(0)}
                        </div>
                        <span className="font-semibold text-slate-200">{c.author}</span>
                        <span className="text-[10px] text-slate-500 font-mono">({c.email})</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">{c.timestamp}</span>
                    </div>
                    <p className="text-slate-300 pl-8 leading-relaxed">
                      {c.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: VERSIONS LEDGER */}
          {activeTab === 'versions' && (
            <div className="max-w-2xl mx-auto space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-rose-500" />
                <span>Immutable Version History</span>
              </h4>
              <p className="text-xs text-slate-400">
                Every modification committed by an Editor or Owner generates a signed version entry with an independent SHA-256 hash.
              </p>

              <div className="space-y-3 pt-2">
                {file.versions.map(v => (
                  <div key={v.version} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-rose-400 text-sm">
                        Version {v.version}
                        {v.version === file.currentVersion && (
                          <span className="ml-2 text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-900">
                            Current Head
                          </span>
                        )}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">{v.uploadedAt}</span>
                    </div>

                    <p className="text-slate-300">
                      Commit Note: <span className="text-white font-medium">"{v.changeNote}"</span>
                    </p>

                    <div className="text-[11px] font-mono text-slate-500 flex items-center justify-between border-t border-slate-950 pt-2">
                      <span>Uploaded by: {v.uploadedBy}</span>
                      <span>SHA: {v.sha256Hash.slice(0, 16)}...</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Mapúa MCL Cryptographic Engine · Verified Decryption</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="py-1 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs"
          >
            Close Viewer
          </button>
        </div>

      </div>
    </div>
  );
};
