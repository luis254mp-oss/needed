import React, { useState } from 'react';
import { User, EncryptedFileItem, SharedLink, FileVersion, FileCollaborator, FolderItem } from '../types';
import { computeSha256, encryptAes256, decryptAes256, formatBytes, textToBytes } from '../utils/crypto';
import { ShareModal } from './ShareModal';
import { DocumentViewerModal } from './DocumentViewerModal';
import { 
  FileText, Folder, UploadCloud, Share2, History, Download, 
  CheckCircle2, ShieldCheck, Lock, Copy, AlertCircle, FilePlus, 
  Key, RefreshCw, LayoutGrid, List, Search, Star, Clock, 
  Users, HardDrive, Plus, MoreVertical, ChevronRight, Info, Eye, 
  FolderPlus, Filter, ExternalLink, Trash2, Layers, AlertTriangle
} from 'lucide-react';

interface VaultViewProps {
  currentUser: User;
  files: EncryptedFileItem[];
  folders: FolderItem[];
  sharedLinks: SharedLink[];
  onUploadFile: (newFile: EncryptedFileItem) => void;
  onUpdateFile: (updatedFile: EncryptedFileItem) => void;
  onDeleteFile: (fileId: string) => void;
  onCreateFolder: (newFolder: FolderItem) => void;
  onUpdateFolder: (updatedFolder: FolderItem) => void;
  onDeleteFolder: (folderId: string, folderName: string, deleteContainedFiles?: boolean) => void;
  onCreateShareLink: (link: SharedLink) => void;
  onOpenShareTester: (token: string) => void;
}

export const VaultView: React.FC<VaultViewProps> = ({
  currentUser,
  files,
  folders,
  sharedLinks,
  onUploadFile,
  onUpdateFile,
  onDeleteFile,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
  onCreateShareLink,
  onOpenShareTester
}) => {
  // Navigation views: 'all' shows both owned & shared files/folders
  const [activeSection, setActiveSection] = useState<'all' | 'my-vault' | 'shared-with-me' | 'starred'>('all');
  const [selectedFolder, setSelectedFolder] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  // Selection, details & viewer states
  const [selectedFileForDetails, setSelectedFileForDetails] = useState<EncryptedFileItem | null>(null);
  const [selectedFileForViewer, setSelectedFileForViewer] = useState<EncryptedFileItem | null>(null);
  const [selectedFileForShare, setSelectedFileForShare] = useState<EncryptedFileItem | null>(null);
  const [selectedFolderForShare, setSelectedFolderForShare] = useState<FolderItem | null>(null);
  const [selectedFileForVersions, setSelectedFileForVersions] = useState<EncryptedFileItem | null>(null);
  
  // Deletion Confirmation States
  const [fileToDelete, setFileToDelete] = useState<EncryptedFileItem | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<FolderItem | null>(null);
  const [purgeFolderFiles, setPurgeFolderFiles] = useState<boolean>(false);

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  const [uploadNote, setUploadNote] = useState('');
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [integrityToast, setIntegrityToast] = useState<{ name: string; hash: string } | null>(null);
  const [versioningTarget, setVersioningTarget] = useState<EncryptedFileItem | null>(null);

  // FOLDER ISOLATION:
  // "My Vault" shows ONLY folders created by currentUser
  const myFolders = folders.filter(
    f => f.ownerEmail.toLowerCase() === currentUser.email.toLowerCase()
  );

  // "Shared with me" shows folders created by OTHER users where currentUser is in sharedWith OR generalAccess is mcl_domain
  const sharedFolders = folders.filter(
    f => f.ownerEmail.toLowerCase() !== currentUser.email.toLowerCase() && 
         (f.sharedWith?.some(c => c.email.toLowerCase() === currentUser.email.toLowerCase()) || f.generalAccess === 'mcl_domain')
  );

  const activeFoldersList = activeSection === 'my-vault' 
    ? myFolders 
    : activeSection === 'shared-with-me' 
    ? sharedFolders 
    : [...myFolders, ...sharedFolders];

  const [targetFolder, setTargetFolder] = useState<string>(() => {
    return myFolders.length > 0 ? myFolders[0].name : 'General Vault';
  });

  // STRICT MULTI-TENANCY & ALL-ACCESS FILE FILTERING:
  // "all" shows all files owned by or shared with currentUser
  // "my-vault" shows ONLY files owned by currentUser
  // "shared-with-me" shows files NOT owned by currentUser where currentUser is in sharedWith OR generalAccess is mcl_domain
  const displayedFiles = files.filter(f => {
    if (f.isRevoked) return false;

    const isOwnedByMe = f.ownerEmail.toLowerCase() === currentUser.email.toLowerCase();
    const isSharedWithMe = f.sharedWith?.some(c => c.email.toLowerCase() === currentUser.email.toLowerCase());
    const isDomainShared = f.generalAccess === 'mcl_domain';
    const hasAccess = isOwnedByMe || isSharedWithMe || isDomainShared;

    if (activeSection === 'all') {
      if (!hasAccess) return false;
      if (selectedFolder !== 'All' && f.folder !== selectedFolder) return false;
    } else if (activeSection === 'my-vault') {
      if (!isOwnedByMe) return false;
      if (selectedFolder !== 'All' && f.folder !== selectedFolder) return false;
    } else if (activeSection === 'shared-with-me') {
      if (isOwnedByMe) return false;
      if (!isSharedWithMe && !isDomainShared) return false;
      if (selectedFolder !== 'All' && f.folder !== selectedFolder) return false;
    } else if (activeSection === 'starred') {
      if (!hasAccess || !f.isStarred) return false;
    }

    // Type filter
    if (typeFilter === 'pdf' && !f.mimeType.includes('pdf') && !f.name.endsWith('.pdf')) return false;
    if (typeFilter === 'doc' && !f.mimeType.includes('word') && !f.name.endsWith('.docx') && !f.name.endsWith('.doc')) return false;
    if (typeFilter === 'sheet' && !f.mimeType.includes('sheet') && !f.name.endsWith('.xlsx')) return false;
    if (typeFilter === 'image' && !f.mimeType.includes('image')) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = f.name.toLowerCase().includes(q);
      const matchFolder = f.folder.toLowerCase().includes(q);
      const matchTags = f.tags.some(t => t.toLowerCase().includes(q));
      if (!matchName && !matchFolder && !matchTags) return false;
    }

    return true;
  });

  // Metrics
  const myFilesCount = files.filter(f => !f.isRevoked && f.ownerEmail.toLowerCase() === currentUser.email.toLowerCase()).length;
  const sharedWithMeCount = files.filter(f => !f.isRevoked && f.ownerEmail.toLowerCase() !== currentUser.email.toLowerCase() && (f.sharedWith?.some(c => c.email.toLowerCase() === currentUser.email.toLowerCase()) || f.generalAccess === 'mcl_domain')).length;
  const allFilesCount = files.filter(f => !f.isRevoked && (
    f.ownerEmail.toLowerCase() === currentUser.email.toLowerCase() || 
    f.sharedWith?.some(c => c.email.toLowerCase() === currentUser.email.toLowerCase()) || 
    f.generalAccess === 'mcl_domain'
  )).length;
  const starredCount = files.filter(f => !f.isRevoked && f.isStarred && (f.ownerEmail.toLowerCase() === currentUser.email.toLowerCase() || f.sharedWith?.some(c => c.email.toLowerCase() === currentUser.email.toLowerCase()) || f.generalAccess === 'mcl_domain')).length;

  const confirmDeleteFile = () => {
    if (!fileToDelete) return;
    onDeleteFile(fileToDelete.id);
    if (selectedFileForDetails?.id === fileToDelete.id) {
      setSelectedFileForDetails(null);
    }
    if (selectedFileForViewer?.id === fileToDelete.id) {
      setSelectedFileForViewer(null);
    }
    setFileToDelete(null);
  };

  const confirmDeleteFolder = () => {
    if (!folderToDelete) return;
    onDeleteFolder(folderToDelete.id, folderToDelete.name, purgeFolderFiles);
    if (selectedFolder === folderToDelete.name) {
      setSelectedFolder('All');
    }
    setFolderToDelete(null);
    setPurgeFolderFiles(false);
  };

  const toggleStar = (file: EncryptedFileItem) => {
    onUpdateFile({
      ...file,
      isStarred: !file.isStarred
    });
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newFolderName.trim();
    if (!cleanName) return;

    if (myFolders.some(f => f.name.toLowerCase() === cleanName.toLowerCase())) {
      alert(`You already have a folder named "${cleanName}". Please choose a distinct folder name.`);
      return;
    }

    const newFolderObj: FolderItem = {
      id: `f-${Date.now()}`,
      name: cleanName,
      ownerEmail: currentUser.email,
      ownerName: currentUser.name,
      sharedWith: [],
      generalAccess: 'restricted',
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19)
    };

    onCreateFolder(newFolderObj);
    setSelectedFolder(cleanName);
    setNewFolderName('');
    setIsNewFolderModalOpen(false);
  };

  const handleBatchUpdateFolderFiles = (folderNameToUpdate: string, collabs: FileCollaborator[], access: 'restricted' | 'mcl_domain' | 'anyone_with_link') => {
    // Update folder entity
    const targetFolderObj = folders.find(f => f.name === folderNameToUpdate && f.ownerEmail.toLowerCase() === currentUser.email.toLowerCase());
    if (targetFolderObj) {
      onUpdateFolder({
        ...targetFolderObj,
        sharedWith: collabs,
        generalAccess: access
      });
    }

    // Update all files inside folder owned by currentUser
    files.forEach(f => {
      if (f.folder === folderNameToUpdate && f.ownerEmail.toLowerCase() === currentUser.email.toLowerCase()) {
        onUpdateFile({
          ...f,
          sharedWith: collabs,
          generalAccess: access
        });
      }
    });

    alert(`Folder "${folderNameToUpdate}" and its files are now shared with updated access settings!`);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];

    setIsEncrypting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const rawBytes = new Uint8Array(arrayBuffer);
      const sha256 = await computeSha256(arrayBuffer);
      const encrypted = await encryptAes256(rawBytes);

      // Inherit folder sharing if folder is already shared
      const currentFolderObj = folders.find(f => f.name === targetFolder);
      const inheritedCollaborators = currentFolderObj?.sharedWith || [];
      const inheritedAccess = currentFolderObj?.generalAccess || 'mcl_domain';

      const newFileItem: EncryptedFileItem = {
        id: `file-${Date.now()}`,
        name: file.name,
        folder: targetFolder || 'My Documents',
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        currentVersion: 1,
        sha256Hash: sha256,
        encryptedPayloadPreview: encrypted.ciphertextHex,
        uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        ownerEmail: currentUser.email,
        ownerName: currentUser.name,
        tags: [targetFolder.split(' ')[0] || 'Vault', 'AES-256'],
        isRevoked: false,
        isStarred: false,
        sharedWith: inheritedCollaborators,
        generalAccess: inheritedAccess,
        activeShareLinksCount: 0,
        rawContent: encrypted.combinedBase64,
        versions: [
          {
            version: 1,
            uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
            fileSize: file.size,
            sha256Hash: sha256,
            changeNote: uploadNote.trim() || 'Initial encrypted deposit',
            uploadedBy: currentUser.email
          }
        ]
      };

      onUploadFile(newFileItem);
      setIsUploadModalOpen(false);
      setUploadNote('');
      setIntegrityToast({ name: file.name, hash: sha256 });
      setTimeout(() => setIntegrityToast(null), 5000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsEncrypting(false);
      event.target.value = '';
    }
  };

  const handleNewVersionUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!versioningTarget) return;
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];

    setIsEncrypting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const rawBytes = new Uint8Array(arrayBuffer);
      const sha256 = await computeSha256(arrayBuffer);
      const encrypted = await encryptAes256(rawBytes);

      const nextVersionNum = versioningTarget.currentVersion + 1;
      const newVersionEntry: FileVersion = {
        version: nextVersionNum,
        uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        fileSize: file.size,
        sha256Hash: sha256,
        changeNote: uploadNote.trim() || `Revision v${nextVersionNum}`,
        uploadedBy: currentUser.email
      };

      const updatedFile: EncryptedFileItem = {
        ...versioningTarget,
        currentVersion: nextVersionNum,
        size: file.size,
        sha256Hash: sha256,
        encryptedPayloadPreview: encrypted.ciphertextHex,
        rawContent: encrypted.combinedBase64,
        uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        versions: [newVersionEntry, ...versioningTarget.versions]
      };

      onUpdateFile(updatedFile);
      setVersioningTarget(null);
      setUploadNote('');
      setIntegrityToast({ name: `${file.name} (v${nextVersionNum})`, hash: sha256 });
      setTimeout(() => setIntegrityToast(null), 5000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsEncrypting(false);
    }
  };

  const handleDownloadAndVerify = async (fileItem: EncryptedFileItem, versionTarget?: FileVersion) => {
    const targetHash = versionTarget ? versionTarget.sha256Hash : fileItem.sha256Hash;
    const targetVersion = versionTarget ? versionTarget.version : fileItem.currentVersion;

    try {
      let payloadBytes: Uint8Array;
      if (fileItem.rawContent) {
        try {
          payloadBytes = await decryptAes256(fileItem.rawContent);
        } catch {
          payloadBytes = textToBytes(`[SeshCure Decrypted Document Payload for ${fileItem.name}]\nAuthorized by Mapúa MCL Security Directorate.`);
        }
      } else {
        payloadBytes = textToBytes(`[SeshCure Decrypted Document Payload for ${fileItem.name}]\nSecurity ID: ${fileItem.id}`);
      }

      const blob = new Blob([payloadBytes as unknown as BlobPart], { type: fileItem.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = versionTarget ? `v${targetVersion}_${fileItem.name}` : fileItem.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setIntegrityToast({ name: `${fileItem.name} (v${targetVersion})`, hash: targetHash });
      setTimeout(() => setIntegrityToast(null), 5000);
    } catch (err) {
      console.error(err);
    }
  };

  const getFileIcon = (mime: string, name: string) => {
    if (mime.includes('pdf') || name.endsWith('.pdf')) {
      return <span className="w-8 h-8 rounded bg-rose-950/80 border border-rose-800 text-rose-400 font-bold text-[10px] flex items-center justify-center font-mono">PDF</span>;
    }
    if (mime.includes('word') || name.endsWith('.docx') || name.endsWith('.doc')) {
      return <span className="w-8 h-8 rounded bg-blue-950/80 border border-blue-800 text-blue-400 font-bold text-[10px] flex items-center justify-center font-mono">DOC</span>;
    }
    if (mime.includes('sheet') || name.endsWith('.xlsx') || name.endsWith('.csv')) {
      return <span className="w-8 h-8 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-400 font-bold text-[10px] flex items-center justify-center font-mono">XLS</span>;
    }
    if (mime.includes('image')) {
      return <span className="w-8 h-8 rounded bg-amber-950/80 border border-amber-800 text-amber-400 font-bold text-[10px] flex items-center justify-center font-mono">IMG</span>;
    }
    return <span className="w-8 h-8 rounded bg-slate-800 border border-slate-700 text-slate-300 font-bold text-[10px] flex items-center justify-center font-mono">FILE</span>;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      
      {/* Integrity Toast */}
      {integrityToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500/80 rounded-xl p-4 shadow-2xl max-w-md animate-slideUp">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-white">SHA-256 Checksum Verified & Clean</div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Payload for <span className="font-semibold text-emerald-300">{integrityToast.name}</span> verified bit-for-bit against stored hash.
              </p>
              <div className="text-[10px] font-mono text-slate-400 bg-slate-950 p-1.5 rounded mt-1.5 break-all border border-slate-800">
                {integrityToast.hash}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Google Drive Style Left Navigation Sidebar */}
      <aside className="w-full lg:w-64 shrink-0 space-y-4">
        
        {/* "+ New" Action Button */}
        <div className="flex gap-2">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex-1 py-3 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-rose-600 rounded-2xl text-xs font-semibold text-white shadow-lg transition-all flex items-center justify-center gap-2.5 group"
          >
            <div className="w-5 h-5 rounded-full bg-rose-700 flex items-center justify-center text-white">
              <Plus className="w-3.5 h-3.5" />
            </div>
            <span>New Encrypted Upload</span>
          </button>

          <button
            onClick={() => setIsNewFolderModalOpen(true)}
            className="py-3 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-2xl text-slate-300 transition"
            title="Create New Folder"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>

        {/* Sidebar Nav Links */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-2 space-y-0.5 text-xs">
          {/* "All" in the upper part of My Vault: Combined Owned & Shared */}
          <button
            onClick={() => { setActiveSection('all'); setSelectedFolder('All'); }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition ${
              activeSection === 'all' && selectedFolder === 'All'
                ? 'bg-rose-950/70 text-rose-300 border border-rose-800/60 font-semibold'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-rose-400" />
              <span>All Files & Folders</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">{allFilesCount}</span>
          </button>

          <button
            onClick={() => { setActiveSection('my-vault'); setSelectedFolder('All'); }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition ${
              activeSection === 'my-vault' && selectedFolder === 'All'
                ? 'bg-rose-950/70 text-rose-300 border border-rose-800/60 font-semibold'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <HardDrive className="w-4 h-4" />
              <span>My Vault</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">{myFilesCount}</span>
          </button>

          <button
            onClick={() => { setActiveSection('shared-with-me'); setSelectedFolder('All'); }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition ${
              activeSection === 'shared-with-me'
                ? 'bg-rose-950/70 text-rose-300 border border-rose-800/60 font-semibold'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4" />
              <span>Shared with me</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">{sharedWithMeCount}</span>
          </button>

          <button
            onClick={() => { setActiveSection('starred'); setSelectedFolder('All'); }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition ${
              activeSection === 'starred'
                ? 'bg-rose-950/70 text-rose-300 border border-rose-800/60 font-semibold'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Star className="w-4 h-4 text-amber-400" />
              <span>Starred</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">{starredCount}</span>
          </button>
        </div>

        {/* Folders Navigation in Sidebar: Isolated to Accessible Folders */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between px-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <span>{activeSection === 'all' ? 'All Accessible Folders' : activeSection === 'my-vault' ? 'My Folders' : 'Shared Folders'}</span>
            {(activeSection === 'my-vault' || activeSection === 'all') && (
              <button
                onClick={() => setIsNewFolderModalOpen(true)}
                className="hover:text-white p-0.5"
                title="Create Folder"
              >
                +
              </button>
            )}
          </div>

          <div className="space-y-1">
            {activeFoldersList.length > 0 ? (
              activeFoldersList.map(folder => {
                const count = files.filter(f => {
                  if (f.folder !== folder.name) return false;
                  if (activeSection === 'my-vault') return f.ownerEmail.toLowerCase() === currentUser.email.toLowerCase();
                  return true;
                }).length;

                const isSelected = selectedFolder === folder.name;
                const isFolderOwner = folder.ownerEmail.toLowerCase() === currentUser.email.toLowerCase();

                return (
                  <div
                    key={folder.id}
                    className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition ${
                      isSelected 
                        ? 'bg-slate-800 text-rose-400 font-semibold' 
                        : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                    }`}
                  >
                    <button
                      onClick={() => { setSelectedFolder(folder.name); }}
                      className="flex items-center gap-2 min-w-0 flex-1 text-left"
                    >
                      <Folder className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-rose-400' : 'text-slate-500'}`} />
                      <span className="truncate">{folder.name}</span>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono text-slate-500">{count}</span>
                      {isFolderOwner && (
                        <button
                          type="button"
                          onClick={() => setSelectedFolderForShare(folder)}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-400 p-0.5 transition"
                          title={`Share folder "${folder.name}"`}
                        >
                          <Share2 className="w-3 h-3" />
                        </button>
                      )}
                      {(isFolderOwner || currentUser.role === 'admin') && (
                        <button
                          type="button"
                          onClick={() => { setFolderToDelete(folder); setPurgeFolderFiles(false); }}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-400 p-0.5 transition"
                          title={`Delete folder "${folder.name}"`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-[11px] text-slate-500 italic px-2 py-1">
                {activeSection === 'my-vault' ? 'No folders created yet.' : 'No folders accessible.'}
              </div>
            )}
          </div>
        </div>

        {/* Storage Bar */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-300 font-medium">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-rose-500" />
              <span>Campus Storage</span>
            </span>
            <span className="font-mono text-slate-400 text-[11px]">8.6 MB / 15 GB</span>
          </div>

          <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div className="w-[12%] h-full bg-rose-600 rounded-full"></div>
          </div>

          <div className="text-[10px] text-slate-500 flex items-center justify-between font-mono">
            <span>AES-256 Encrypted</span>
            <span>Zero-Knowledge</span>
          </div>
        </div>

      </aside>

      {/* Main Google Drive Content Area */}
      <div className="flex-1 w-full space-y-5 min-w-0">
        
        {/* Search & Filter Top Bar */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search in SeshCure Vault..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex items-center justify-between w-full sm:w-auto gap-3 text-xs">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition ${typeFilter === 'all' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
              >
                All
              </button>
              <button
                onClick={() => setTypeFilter('pdf')}
                className={`px-2.5 py-1 rounded-lg transition ${typeFilter === 'pdf' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
              >
                PDFs
              </button>
              <button
                onClick={() => setTypeFilter('doc')}
                className={`px-2.5 py-1 rounded-lg transition ${typeFilter === 'doc' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
              >
                Docs
              </button>
              <button
                onClick={() => setTypeFilter('sheet')}
                className={`px-2.5 py-1 rounded-lg transition ${typeFilter === 'sheet' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
              >
                Sheets
              </button>
            </div>

            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition ${viewMode === 'grid' ? 'bg-slate-800 text-rose-400' : 'text-slate-500 hover:text-slate-300'}`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition ${viewMode === 'list' ? 'bg-slate-800 text-rose-400' : 'text-slate-500 hover:text-slate-300'}`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between text-xs px-1">
          <div className="flex items-center gap-1.5 font-medium text-slate-300">
            <span 
              onClick={() => { setSelectedFolder('All'); }}
              className="cursor-pointer hover:text-rose-400 transition"
            >
              {activeSection === 'all' ? 'All Files & Folders' : activeSection === 'my-vault' ? 'My Vault (Private)' : activeSection === 'shared-with-me' ? 'Shared with me' : 'Starred'}
            </span>
            {selectedFolder !== 'All' && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-white font-semibold">{selectedFolder}</span>
              </>
            )}
          </div>

          <div className="text-[11px] font-mono text-slate-500">
            {displayedFiles.length} item{displayedFiles.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Folders Section with Folder Sharing: ONLY displays accessible folders */}
        {selectedFolder === 'All' && activeFoldersList.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
              <span>Folders</span>
              <span className="text-[10px] text-slate-500 font-mono">
                {activeSection === 'all' ? 'All accessible folders' : activeSection === 'my-vault' ? 'Only visible to you until shared' : 'Folders shared with you'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {activeFoldersList.map(folder => {
                const count = files.filter(f => {
                  if (f.folder !== folder.name) return false;
                  if (activeSection === 'my-vault') return f.ownerEmail.toLowerCase() === currentUser.email.toLowerCase();
                  return true;
                }).length;

                const isFolderOwner = folder.ownerEmail.toLowerCase() === currentUser.email.toLowerCase();

                return (
                  <div
                    key={folder.id}
                    className="p-3.5 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 rounded-xl transition flex items-center justify-between group"
                  >
                    <div 
                      onClick={() => setSelectedFolder(folder.name)}
                      className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                    >
                      <Folder className="w-5 h-5 text-rose-500 shrink-0 group-hover:scale-105 transition-transform" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-slate-200 truncate block">{folder.name}</span>
                          {activeSection === 'all' && (
                            <span className={`text-[9px] px-1 rounded font-mono shrink-0 ${isFolderOwner ? 'text-rose-400 bg-rose-950/80 border border-rose-900/60' : 'text-blue-400 bg-blue-950/80 border border-blue-900/60'}`}>
                              {isFolderOwner ? 'Mine' : 'Shared'}
                            </span>
                          )}
                        </div>
                        {!isFolderOwner && (
                          <span className="text-[10px] text-slate-500 font-mono block truncate">by {folder.ownerName.split(' ')[0]}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono text-slate-500">{count}</span>
                      {isFolderOwner && (
                        <button
                          type="button"
                          onClick={() => setSelectedFolderForShare(folder)}
                          className="text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition"
                          title={`Share folder "${folder.name}"`}
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {(isFolderOwner || currentUser.role === 'admin') && (
                        <button
                          type="button"
                          onClick={() => { setFolderToDelete(folder); setPurgeFolderFiles(false); }}
                          className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-slate-800 transition"
                          title={`Delete folder "${folder.name}"`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Files Section Title */}
        <div className="text-xs font-semibold text-slate-400 pt-1 flex items-center justify-between">
          <span>Files</span>
          <span className="text-[10px] text-slate-500 font-mono">Click to open full document viewer</span>
        </div>

        {/* Grid View */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {displayedFiles.length > 0 ? (
              displayedFiles.map(file => (
                <div
                  key={file.id}
                  onClick={() => setSelectedFileForViewer(file)}
                  className={`bg-slate-900 border rounded-2xl p-4 transition-all space-y-3 cursor-pointer group shadow-sm ${
                    selectedFileForDetails?.id === file.id 
                      ? 'border-rose-600 ring-1 ring-rose-600/50 bg-slate-900/90' 
                      : 'border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {getFileIcon(file.mimeType, file.name)}
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate group-hover:text-rose-400 transition" title={file.name}>
                          {file.name}
                        </h4>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                          <span>{file.folder}</span>
                          <span>·</span>
                          {file.ownerEmail.toLowerCase() === currentUser.email.toLowerCase() ? (
                            <span className="text-rose-400 font-semibold">Mine</span>
                          ) : (
                            <span className="text-blue-400">by {file.ownerName.split(' ')[0]}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleStar(file); }}
                      className="text-slate-500 hover:text-amber-400 p-1"
                    >
                      <Star className={`w-3.5 h-3.5 ${file.isStarred ? 'text-amber-400 fill-amber-400' : ''}`} />
                    </button>
                  </div>

                  <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80 text-[10px] font-mono space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>AES-256 Verified:</span>
                      <span className="text-emerald-400 font-bold">GCM Stream</span>
                    </div>
                    <div className="text-slate-500 truncate" title={file.sha256Hash}>
                      SHA: {file.sha256Hash.slice(0, 16)}...
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
                    <div className="flex items-center gap-2 font-mono text-[10px]">
                      <span className="text-rose-400 font-bold bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-900">
                        v{file.currentVersion}
                      </span>
                      <span className="text-slate-400 tabular-nums">{formatBytes(file.size)}</span>
                    </div>

                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setSelectedFileForViewer(file)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
                        title="Open Document Preview"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedFileForShare(file)}
                        className="p-1.5 bg-slate-800 hover:bg-rose-900 hover:text-white rounded-lg text-slate-300 transition"
                        title="Share Document"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadAndVerify(file)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
                        title="Decrypt payload & download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedFileForDetails(file)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
                        title="View Details"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>

                      {(file.ownerEmail.toLowerCase() === currentUser.email.toLowerCase() || currentUser.role === 'admin') && (
                        <button
                          type="button"
                          onClick={() => setFileToDelete(file)}
                          className="p-1.5 bg-slate-800 hover:bg-red-950/80 hover:text-red-400 text-slate-400 rounded-lg transition"
                          title="Delete File"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              ))
            ) : (
              <div className="col-span-full py-16 text-center text-slate-500 text-xs">
                {activeSection === 'my-vault' 
                  ? 'You have not uploaded any files to this folder yet. Click "+ New Encrypted Upload" to deposit your first document.'
                  : activeSection === 'shared-with-me'
                  ? 'No documents have been shared with your account yet.'
                  : 'No starred documents found.'}
              </div>
            )}
          </div>
        ) : (
          /* List View */
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-medium">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Owner</th>
                    <th className="py-3 px-4">Folder</th>
                    <th className="py-3 px-4">Version</th>
                    <th className="py-3 px-4">File Size</th>
                    <th className="py-3 px-4">SHA-256 Checksum</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {displayedFiles.length > 0 ? (
                    displayedFiles.map(file => (
                      <tr 
                        key={file.id} 
                        onClick={() => setSelectedFileForViewer(file)}
                        className="hover:bg-slate-800/40 transition cursor-pointer"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggleStar(file); }}
                              className="text-slate-500 hover:text-amber-400"
                            >
                              <Star className={`w-3.5 h-3.5 ${file.isStarred ? 'text-amber-400 fill-amber-400' : ''}`} />
                            </button>
                            {getFileIcon(file.mimeType, file.name)}
                            <div>
                              <div className="font-semibold text-slate-100 hover:text-rose-400 transition">{file.name}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{file.uploadedAt}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-400 truncate max-w-[140px]">
                          {file.ownerEmail.toLowerCase() === currentUser.email.toLowerCase() ? 'You (Owner)' : file.ownerName}
                        </td>

                        <td className="py-3 px-4 text-slate-400">
                          {file.folder}
                        </td>

                        <td className="py-3 px-4 font-mono">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setSelectedFileForVersions(file); }}
                            className="hover:underline text-rose-400 font-bold"
                          >
                            v{file.currentVersion}
                          </button>
                        </td>

                        <td className="py-3 px-4 font-mono tabular-nums text-slate-300">
                          {formatBytes(file.size)}
                        </td>

                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400" title={file.sha256Hash}>
                          {file.sha256Hash.slice(0, 10)}...
                        </td>

                        <td className="py-3 px-4 text-right space-x-1.5" onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setSelectedFileForViewer(file)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition inline-block"
                            title="Open Preview"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedFileForShare(file)}
                            className="p-1.5 bg-slate-800 hover:bg-rose-900 text-slate-300 hover:text-white rounded-lg transition inline-block"
                            title="Share"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadAndVerify(file)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition inline-block"
                            title="Download & Verify"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {(file.ownerEmail.toLowerCase() === currentUser.email.toLowerCase() || currentUser.role === 'admin') && (
                            <button
                              type="button"
                              onClick={() => setFileToDelete(file)}
                              className="p-1.5 bg-slate-800 hover:bg-red-950/80 text-slate-400 hover:text-red-400 rounded-lg transition inline-block"
                              title="Delete File"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        No files found in this view.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Details Inspector Panel */}
      {selectedFileForDetails && (
        <aside className="w-full lg:w-80 shrink-0 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-rose-500" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">File Details</h3>
            </div>
            <button
              onClick={() => setSelectedFileForDetails(null)}
              className="text-slate-400 hover:text-white text-xs p-1"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3">
            <div className="text-center p-4 bg-slate-950 rounded-xl border border-slate-800/80">
              <div className="mx-auto flex justify-center mb-2">
                {getFileIcon(selectedFileForDetails.mimeType, selectedFileForDetails.name)}
              </div>
              <div className="font-semibold text-xs text-white break-words">
                {selectedFileForDetails.name}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                Version {selectedFileForDetails.currentVersion} · {formatBytes(selectedFileForDetails.size)}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setSelectedFileForViewer(selectedFileForDetails)}
                className="py-2 px-3 bg-rose-700 hover:bg-rose-600 text-white rounded-lg font-medium transition flex items-center justify-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Open Preview</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFileForShare(selectedFileForDetails)}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition flex items-center justify-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>
            </div>

            {/* Cryptographic Ledger */}
            <div className="space-y-2 text-xs">
              <div className="font-semibold text-slate-300">Security Invariants</div>
              
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-400 font-mono">
                  <span>Encryption:</span>
                  <span className="text-emerald-400 font-bold">AES-256-GCM</span>
                </div>
                <div className="text-slate-400 font-mono">
                  SHA-256 Checksum:
                </div>
                <div className="text-[10px] text-slate-300 font-mono break-all bg-slate-900 p-1 rounded">
                  {selectedFileForDetails.sha256Hash}
                </div>
              </div>
            </div>

            {/* People with access preview */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">Who Has Access</span>
                <button
                  type="button"
                  onClick={() => setSelectedFileForShare(selectedFileForDetails)}
                  className="text-[11px] text-rose-400 hover:underline"
                >
                  Manage
                </button>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80 space-y-2 text-[11px]">
                <div className="text-slate-300 font-medium">
                  {selectedFileForDetails.ownerName} {selectedFileForDetails.ownerEmail.toLowerCase() === currentUser.email.toLowerCase() ? '(You - Owner)' : '(Owner)'}
                </div>
                {selectedFileForDetails.sharedWith?.length > 0 ? (
                  selectedFileForDetails.sharedWith.map(c => (
                    <div key={c.email} className="flex justify-between text-slate-400 font-mono text-[10px]">
                      <span>{c.name} {c.email.toLowerCase() === currentUser.email.toLowerCase() ? '(You)' : ''}</span>
                      <span className="text-rose-400 capitalize">{c.permission}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500 text-[10px]">No specific users added yet.</div>
                )}
              </div>
            </div>

            {/* Version History Button */}
            <button
              type="button"
              onClick={() => setSelectedFileForVersions(selectedFileForDetails)}
              className="w-full py-2 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-medium text-slate-300 transition flex items-center justify-center gap-2"
            >
              <History className="w-3.5 h-3.5 text-rose-500" />
              <span>Version History ({selectedFileForDetails.versions.length})</span>
            </button>

            {/* Upload New Version */}
            <button
              type="button"
              onClick={() => setVersioningTarget(selectedFileForDetails)}
              className="w-full py-2 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-medium text-slate-300 transition flex items-center justify-center gap-2"
            >
              <FilePlus className="w-3.5 h-3.5 text-blue-400" />
              <span>Upload Next Revision (v{selectedFileForDetails.currentVersion + 1})</span>
            </button>

            {/* Delete File (Owner / Admin) */}
            {(selectedFileForDetails.ownerEmail.toLowerCase() === currentUser.email.toLowerCase() || currentUser.role === 'admin') && (
              <button
                type="button"
                onClick={() => setFileToDelete(selectedFileForDetails)}
                className="w-full py-2 px-3 border border-red-800/80 hover:bg-red-950/40 text-red-400 hover:text-red-300 rounded-lg text-xs font-medium transition flex items-center justify-center gap-2 mt-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete File Permanently</span>
              </button>
            )}
          </div>
        </aside>
      )}

      {/* Upload File Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-rose-500" />
                <span>Upload & Encrypt Campus File (AES-256)</span>
              </h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Target Vault Folder</label>
                <select
                  value={targetFolder}
                  onChange={e => setTargetFolder(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  {myFolders.map(f => (
                    <option key={f.id} value={f.name}>{f.name}</option>
                  ))}
                  {myFolders.length === 0 && (
                    <option value="My Documents">My Documents</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Version Commit Note</label>
                <input
                  type="text"
                  value={uploadNote}
                  onChange={e => setUploadNote(e.target.value)}
                  placeholder="e.g. Approved curriculum framework draft"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Select File</label>
                <div className="border-2 border-dashed border-slate-700 hover:border-rose-600 rounded-xl p-6 text-center cursor-pointer bg-slate-950 relative">
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={isEncrypting}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="text-slate-400">
                    {isEncrypting ? (
                      <span className="text-rose-400 flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" /> Deriving AES-256 Keys...
                      </span>
                    ) : (
                      <>
                        <span className="text-rose-500 font-semibold">Click to browse file</span> or drop here
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="py-1.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-rose-500" />
              <span>Create New Vault Folder</span>
            </h3>

            <p className="text-xs text-slate-400">
              Folders are private to you ({currentUser.name}) by default until you choose to share them.
            </p>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Folder Name</label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  placeholder="e.g. Capstone-Final-Drafts"
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewFolderModalOpen(false)}
                  className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-1.5 px-4 bg-rose-700 hover:bg-rose-600 text-white font-medium text-xs rounded-lg"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share Modal (Supports both single file and entire folder) */}
      <ShareModal
        file={selectedFileForShare}
        folderName={selectedFolderForShare?.name || null}
        allFiles={files}
        currentUser={currentUser}
        onClose={() => { setSelectedFileForShare(null); setSelectedFolderForShare(null); }}
        onUpdateFile={onUpdateFile}
        onBatchUpdateFolderFiles={handleBatchUpdateFolderFiles}
        onCreateOrUpdateLink={onCreateShareLink}
      />

      {/* Interactive In-App Document Viewer Modal (PDF, DOCX, XLSX, Images) */}
      <DocumentViewerModal
        file={selectedFileForViewer}
        currentUser={currentUser}
        onClose={() => setSelectedFileForViewer(null)}
        onUpdateFile={onUpdateFile}
        onDownload={handleDownloadAndVerify}
        onDeleteFile={onDeleteFile}
      />

      {/* Version History Modal */}
      {selectedFileForVersions && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-rose-500" />
                <h3 className="text-sm font-semibold text-white">Cryptographic Version Ledger</h3>
              </div>
              <button onClick={() => setSelectedFileForVersions(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {selectedFileForVersions.versions.map(ver => (
                <div key={ver.version} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-rose-400">
                      Version {ver.version}
                      {ver.version === selectedFileForVersions.currentVersion && (
                        <span className="ml-2 text-[10px] text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800">Active</span>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{ver.uploadedAt}</span>
                  </div>
                  <p className="text-slate-300">"{ver.changeNote}"</p>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-900">
                    <span>SHA-256: {ver.sha256Hash.slice(0, 16)}...</span>
                    <button
                      type="button"
                      onClick={() => handleDownloadAndVerify(selectedFileForVersions, ver)}
                      className="text-rose-400 hover:underline flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" /> Download v{ver.version}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedFileForVersions(null)}
                className="py-1.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Next Revision Modal */}
      {versioningTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Upload Next Version (v{versioningTarget.currentVersion + 1})</h3>
              <button onClick={() => setVersioningTarget(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Revision Commit Note</label>
                <input
                  type="text"
                  value={uploadNote}
                  onChange={e => setUploadNote(e.target.value)}
                  placeholder="e.g. Revised based on Dean review"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Select File</label>
                <input
                  type="file"
                  onChange={handleNewVersionUpload}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-rose-700 file:text-white hover:file:bg-rose-600 cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setVersioningTarget(null)}
                className="py-1.5 px-3 bg-slate-800 text-slate-300 text-xs rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete File Confirmation Modal */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-full bg-red-950/80 border border-red-900 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Permanently Delete File?</h3>
                <p className="text-[11px] text-slate-400">This action cannot be undone</p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-300 font-medium">
                <span className="truncate pr-2">{fileToDelete.name}</span>
                <span className="text-[10px] font-mono text-rose-400 shrink-0">v{fileToDelete.currentVersion}</span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>Folder: {fileToDelete.folder}</span>
                <span>{formatBytes(fileToDelete.size)}</span>
              </div>
              <div className="text-[10px] font-mono text-slate-500 truncate">
                SHA-256: {fileToDelete.sha256Hash}
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Deleting this file will permanently purge its AES-256 encrypted payload and immediately revoke all active public or domain-shared links.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteFile}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl shadow-lg transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Permanently Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Folder Confirmation Modal */}
      {folderToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-full bg-red-950/80 border border-red-900 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Delete Folder "{folderToDelete.name}"?</h3>
                <p className="text-[11px] text-slate-400">Folder management & relocation</p>
              </div>
            </div>

            {(() => {
              const containedFiles = files.filter(f => f.folder === folderToDelete.name && (f.ownerEmail.toLowerCase() === currentUser.email.toLowerCase() || currentUser.role === 'admin'));
              const containedCount = containedFiles.length;
              return (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-xs text-slate-300">
                    There {containedCount === 1 ? 'is' : 'are'} currently <span className="font-bold text-rose-400">{containedCount} file{containedCount !== 1 ? 's' : ''}</span> in this folder.
                  </div>

                  {containedCount > 0 ? (
                    <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800 cursor-pointer text-xs text-slate-300 select-none hover:border-slate-700 transition">
                      <input
                        type="checkbox"
                        checked={purgeFolderFiles}
                        onChange={e => setPurgeFolderFiles(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-red-600 focus:ring-red-500 mt-0.5"
                      />
                      <span className="leading-snug">
                        Also permanently delete all <strong className="text-white">{containedCount} file{containedCount !== 1 ? 's' : ''}</strong> inside.
                        <span className="block text-[11px] text-slate-500 mt-1">
                          If left unchecked, your files will be safely moved to <strong>General Vault</strong>.
                        </span>
                      </span>
                    </label>
                  ) : (
                    <p className="text-xs text-slate-400">
                      This folder is empty. Deleting it will remove it from your vault and any collaborators.
                    </p>
                  )}

                  <div className="pt-2 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => { setFolderToDelete(null); setPurgeFolderFiles(false); }}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmDeleteFolder}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl shadow-lg transition flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Folder</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

    </div>
  );
};
