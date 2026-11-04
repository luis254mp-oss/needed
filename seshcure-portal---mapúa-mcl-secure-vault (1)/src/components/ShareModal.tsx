import React, { useState, useMemo } from 'react';
import { User, EncryptedFileItem, SharedLink, FileCollaborator } from '../types';
import { TEST_CREDENTIALS } from '../data/mockData';
import { 
  Users, Lock, Copy, Check, Clock, ShieldCheck, 
  Trash2, ChevronDown, UserPlus, Globe, Building, X, AlertCircle, Folder
} from 'lucide-react';

interface ShareModalProps {
  file: EncryptedFileItem | null;
  folderName?: string | null;
  allFiles: EncryptedFileItem[];
  currentUser: User;
  onClose: () => void;
  onUpdateFile: (updatedFile: EncryptedFileItem) => void;
  onBatchUpdateFolderFiles?: (folderName: string, collabs: FileCollaborator[], access: 'restricted' | 'mcl_domain' | 'anyone_with_link') => void;
  onCreateOrUpdateLink: (link: SharedLink) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  file,
  folderName,
  allFiles,
  currentUser,
  onClose,
  onUpdateFile,
  onBatchUpdateFolderFiles,
  onCreateOrUpdateLink
}) => {
  if (!file && !folderName) return null;

  const isFolderSharing = !file && !!folderName;

  // Determine ownership
  const isOwner = isFolderSharing 
    ? true 
    : file?.ownerEmail.toLowerCase() === currentUser.email.toLowerCase();

  // Initial collaborators
  const [collaborators, setCollaborators] = useState<FileCollaborator[]>(() => {
    if (file) return file.sharedWith || [];
    if (folderName) {
      // Collect collaborators from files in this folder
      const folderFiles = allFiles.filter(f => f.folder === folderName);
      const map: Record<string, FileCollaborator> = {};
      folderFiles.forEach(f => f.sharedWith?.forEach(c => { map[c.email] = c; }));
      return Object.values(map);
    }
    return [];
  });

  const [newEmail, setNewEmail] = useState('');
  const [newPermission, setNewPermission] = useState<'viewer' | 'reviewer' | 'editor'>('viewer');
  
  // General Access
  const [generalAccess, setGeneralAccess] = useState<'restricted' | 'mcl_domain' | 'anyone_with_link'>(
    file?.generalAccess || 'mcl_domain'
  );

  // Expiration settings: 'never' means no time limit / until revoked
  const [expiryOption, setExpiryOption] = useState<string>('never');
  const [pinRequired, setPinRequired] = useState(false);
  const [pinCode, setPinCode] = useState('');
  
  const [copied, setCopied] = useState(false);
  const [shareToken] = useState<string>(() => `mcl-${Math.random().toString(36).substring(2, 10)}`);

  // Dynamically compute Top 3 frequent collaborators from files owned by current user
  const topCollaborators = useMemo(() => {
    const counts: Record<string, { email: string; name: string; count: number }> = {};
    
    allFiles
      .filter(f => f.ownerEmail.toLowerCase() === currentUser.email.toLowerCase())
      .forEach(f => {
        f.sharedWith?.forEach(c => {
          if (c.email.toLowerCase() !== currentUser.email.toLowerCase()) {
            if (!counts[c.email]) {
              counts[c.email] = { email: c.email, name: c.name, count: 0 };
            }
            counts[c.email].count += 1;
          }
        });
      });

    const sorted = Object.values(counts).sort((a, b) => b.count - a.count);
    const result = sorted.map(s => ({ email: s.email, name: s.name }));

    // Backfill with known campus contacts if fewer than 3
    TEST_CREDENTIALS.forEach(tc => {
      if (
        tc.email.toLowerCase() !== currentUser.email.toLowerCase() &&
        !result.some(r => r.email.toLowerCase() === tc.email.toLowerCase())
      ) {
        if (result.length < 3) {
          result.push({ email: tc.email, name: tc.name });
        }
      }
    });

    return result.slice(0, 3);
  }, [allFiles, currentUser.email]);

  const handleAddCollaborator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) {
      alert("Only the file owner can add or modify collaborators.");
      return;
    }

    const clean = newEmail.trim().toLowerCase();
    if (!clean) return;

    if (!clean.endsWith('@mcl.edu.ph') && !clean.endsWith('@mcl.ph')) {
      alert(`Invalid Campus Domain: "${clean}". Only @mcl.edu.ph or @mcl.ph addresses can be granted access.`);
      return;
    }

    if (collaborators.some(c => c.email === clean)) {
      alert(`User ${clean} is already in the collaborator list.`);
      return;
    }

    const matchedCred = TEST_CREDENTIALS.find(tc => tc.email.toLowerCase() === clean);
    const collaboratorName = matchedCred ? matchedCred.name : clean.split('@')[0].toUpperCase();

    const newCollab: FileCollaborator = {
      email: clean,
      name: collaboratorName,
      permission: newPermission,
      addedAt: new Date().toISOString().replace('T', ' ').slice(0, 19)
    };

    const updatedCollabs = [...collaborators, newCollab];
    setCollaborators(updatedCollabs);
    setNewEmail('');

    if (file) {
      onUpdateFile({
        ...file,
        sharedWith: updatedCollabs
      });
    } else if (folderName && onBatchUpdateFolderFiles) {
      onBatchUpdateFolderFiles(folderName, updatedCollabs, generalAccess);
    }
  };

  const handleRemoveCollaborator = (emailToRemove: string) => {
    if (!isOwner) return;
    const updated = collaborators.filter(c => c.email !== emailToRemove);
    setCollaborators(updated);

    if (file) {
      onUpdateFile({
        ...file,
        sharedWith: updated
      });
    } else if (folderName && onBatchUpdateFolderFiles) {
      onBatchUpdateFolderFiles(folderName, updated, generalAccess);
    }
  };

  const handleChangeCollaboratorPermission = (email: string, perm: 'viewer' | 'reviewer' | 'editor') => {
    if (!isOwner) return;
    const updated = collaborators.map(c => c.email === email ? { ...c, permission: perm } : c);
    setCollaborators(updated);

    if (file) {
      onUpdateFile({
        ...file,
        sharedWith: updated
      });
    } else if (folderName && onBatchUpdateFolderFiles) {
      onBatchUpdateFolderFiles(folderName, updated, generalAccess);
    }
  };

  const handleSaveAndCopyLink = () => {
    const isNeverExpire = expiryOption === 'never';
    const hours = isNeverExpire ? null : parseInt(expiryOption, 10);
    const now = new Date();
    const expiresAt = isNeverExpire 
      ? null 
      : new Date(now.getTime() + (hours || 2) * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    if (file) {
      const linkRecord: SharedLink = {
        id: `link-${Date.now()}`,
        fileId: file.id,
        fileName: file.name,
        token: shareToken,
        createdByName: currentUser.name,
        createdByEmail: currentUser.email,
        createdAt: now.toISOString().replace('T', ' ').slice(0, 19),
        expiresAt: expiresAt,
        expiryHours: hours,
        isNeverExpire: isNeverExpire,
        accessScope: generalAccess,
        allowedEmails: generalAccess === 'restricted' ? collaborators.map(c => c.email) : undefined,
        pinRequired: pinRequired,
        pinCode: pinRequired ? pinCode : undefined,
        downloadCount: 0,
        maxDownloads: 100,
        isRevoked: false,
        accessLog: []
      };

      onCreateOrUpdateLink(linkRecord);

      onUpdateFile({
        ...file,
        generalAccess: generalAccess,
        sharedWith: collaborators,
        activeShareLinksCount: (file.activeShareLinksCount || 0) + 1
      });
    } else if (folderName && onBatchUpdateFolderFiles) {
      onBatchUpdateFolderFiles(folderName, collaborators, generalAccess);
    }

    const shareUrl = `${window.location.origin}/s/${shareToken}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-5 animate-scaleUp">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              {isFolderSharing ? <Folder className="w-4 h-4 text-rose-500" /> : <Users className="w-4 h-4 text-rose-500" />}
              <span>Share {isFolderSharing ? `Folder "${folderName}"` : `"${file?.name}"`}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Mapúa Malayan Colleges Laguna Vault · {isOwner ? 'You are the owner' : `Owned by ${file?.ownerName}`}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1: Add People or Groups */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-300">
            Share with specific people (@mcl.edu.ph or @mcl.ph)
          </label>

          {isOwner ? (
            <form onSubmit={handleAddCollaborator} className="flex gap-2">
              <input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="Enter email: e.g. mcramos@mcl.ph, esantos@mcl.edu.ph"
                className="flex-1 px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
              <select
                value={newPermission}
                onChange={e => setNewPermission(e.target.value as any)}
                className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-rose-500"
              >
                <option value="viewer">Viewer</option>
                <option value="reviewer">Reviewer</option>
                <option value="editor">Editor</option>
              </select>
              <button
                type="submit"
                className="py-2 px-4 bg-rose-700 hover:bg-rose-600 text-white font-medium text-xs rounded-lg transition shadow-sm"
              >
                Add
              </button>
            </form>
          ) : (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400">
              Only the owner (<strong className="text-slate-200">{file?.ownerName}</strong>) can grant access to new people.
            </div>
          )}

          {/* Top 3 Frequent Collaborators */}
          {isOwner && topCollaborators.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="text-[11px] font-medium text-slate-400">
                Top 3 Frequent Collaborators:
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                {topCollaborators.map(c => (
                  <button
                    key={c.email}
                    type="button"
                    onClick={() => setNewEmail(c.email)}
                    className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 hover:border-rose-700/60 transition font-mono flex items-center gap-1.5"
                  >
                    <span className="text-rose-400 font-bold">+</span>
                    <span>{c.name.split(' ')[0]}</span>
                    <span className="text-slate-500 text-[10px]">({c.email.split('@')[0]})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* People with access list */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-300">People with access</div>
          
          <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
            {/* Owner Row */}
            {file && (
              <div className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-lg flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-rose-900/60 flex items-center justify-center font-bold text-rose-300 text-[10px]">
                    {file.ownerName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-slate-200 truncate">
                      {file.ownerName} {file.ownerEmail.toLowerCase() === currentUser.email.toLowerCase() ? '(You - Owner)' : '(Owner)'}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 truncate">{file.ownerEmail}</div>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded">
                  Owner
                </span>
              </div>
            )}

            {/* Added Collaborators */}
            {collaborators.map(c => {
              const isMe = c.email.toLowerCase() === currentUser.email.toLowerCase();
              return (
                <div key={c.email} className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-lg flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300 text-[10px]">
                      {c.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-slate-200 truncate">
                        {c.name} {isMe ? '(You)' : ''}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 truncate">{c.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isOwner ? (
                      <>
                        <select
                          value={c.permission}
                          onChange={e => handleChangeCollaboratorPermission(c.email, e.target.value as any)}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200 focus:outline-none"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="reviewer">Reviewer</option>
                          <option value="editor">Editor</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveCollaborator(c.email)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                          title="Remove access"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] font-mono text-slate-400 capitalize bg-slate-900 px-2 py-0.5 rounded">
                        {c.permission}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: General Access (ONLY EDITABLE BY OWNER) */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">General access</span>
            {!isOwner && (
              <span className="text-[10px] font-mono text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
                Owner-Managed Settings
              </span>
            )}
          </div>

          {isOwner ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Access Scope</label>
                <select
                  value={generalAccess}
                  onChange={e => setGeneralAccess(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                >
                  <option value="restricted">Restricted (Only added people can open)</option>
                  <option value="mcl_domain">Mapúa MCL (@mcl.edu.ph community)</option>
                  <option value="anyone_with_link">Anyone with the link (tokenized)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>Link Availability & Expiration</span>
                </label>
                <select
                  value={expiryOption}
                  onChange={e => setExpiryOption(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                >
                  <option value="never">No Time Limit (Until manually revoked)</option>
                  <option value="2">2 Hours (Campus Security Standard)</option>
                  <option value="6">6 Hours</option>
                  <option value="12">12 Hours</option>
                  <option value="24">24 Hours (1 Day)</option>
                  <option value="168">7 Days (1 Week)</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400 space-y-1">
              <div className="flex justify-between font-mono text-[11px]">
                <span>Current Scope:</span>
                <span className="text-slate-200 capitalize">
                  {generalAccess === 'mcl_domain' ? 'Mapúa MCL Community' : generalAccess === 'restricted' ? 'Restricted' : 'Link Access'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                You are viewing this file with delegated permissions. General access and security expiration can only be modified by the document owner ({file?.ownerName}).
              </p>
            </div>
          )}

          {/* Optional PIN (Owner Only) */}
          {isOwner && (
            <div className="flex items-center gap-3 pt-1 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={pinRequired}
                  onChange={e => setPinRequired(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-rose-600 focus:ring-0"
                />
                <span>Protect link with 4-digit Security PIN</span>
              </label>
              {pinRequired && (
                <input
                  type="password"
                  maxLength={8}
                  value={pinCode}
                  onChange={e => setPinCode(e.target.value)}
                  placeholder="PIN: e.g. 2026"
                  className="w-28 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                />
              )}
            </div>
          )}
        </div>

        {/* Footer actions: Copy Link & Done */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={handleSaveAndCopyLink}
            className="py-2 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Link Copied to Clipboard!' : 'Copy Link'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (isOwner) handleSaveAndCopyLink();
              onClose();
            }}
            className="py-2 px-5 bg-rose-700 hover:bg-rose-600 text-white font-medium text-xs rounded-lg transition shadow-sm"
          >
            {isOwner ? 'Save & Done' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
