import React, { useState } from 'react';
import { User, EncryptedFileItem, SharedLink, SessionAuditLog, FolderItem } from './types';
import { INITIAL_USERS, TEST_CREDENTIALS, INITIAL_FILES, INITIAL_SHARED_LINKS, INITIAL_AUDIT_LOGS, INITIAL_FOLDERS } from './data/mockData';
import { Navbar } from './components/Navbar';
import { LoginScreen } from './components/LoginScreen';
import { VaultView } from './components/VaultView';
import { AdminConsole } from './components/AdminConsole';
import { MobileAppEmulator } from './components/MobileAppEmulator';
import { CloudExportView } from './components/CloudExportView';
import { SharedLinkAccessModal } from './components/SharedLinkAccessModal';

export default function App() {
  // Start unauthenticated so user lands on Login Interface FIRST
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'vault' | 'admin' | 'mobile' | 'cloud'>('vault');
  const [files, setFiles] = useState<EncryptedFileItem[]>(INITIAL_FILES);
  const [folders, setFolders] = useState<FolderItem[]>(INITIAL_FOLDERS);
  const [sharedLinks, setSharedLinks] = useState<SharedLink[]>(INITIAL_SHARED_LINKS);
  const [auditLogs, setAuditLogs] = useState<SessionAuditLog[]>(INITIAL_AUDIT_LOGS);
  
  // Persistent Accounts & Passwords Repository
  const [registeredUsers, setRegisteredUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('seshcure_users');
      return saved ? JSON.parse(saved) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  const [userCredentials, setUserCredentials] = useState<Record<string, string>>(() => {
    const creds: Record<string, string> = {};
    TEST_CREDENTIALS.forEach(c => {
      creds[c.email.toLowerCase()] = c.password;
    });
    try {
      const saved = localStorage.getItem('seshcure_creds');
      if (saved) {
        return { ...creds, ...JSON.parse(saved) };
      }
    } catch {}
    return creds;
  });

  const [testingShareToken, setTestingShareToken] = useState<string | null>(null);

  // Handlers
  const handleRegisterAccount = (newUser: User, newPassword: string) => {
    setRegisteredUsers(prev => {
      const updated = [newUser, ...prev.filter(u => u.email.toLowerCase() !== newUser.email.toLowerCase())];
      try { localStorage.setItem('seshcure_users', JSON.stringify(updated)); } catch {}
      return updated;
    });
    setUserCredentials(prev => {
      const updated = { ...prev, [newUser.email.toLowerCase()]: newPassword };
      try { localStorage.setItem('seshcure_creds', JSON.stringify(updated)); } catch {}
      return updated;
    });
    handleLogin(newUser);
  };

  const handleUpdatePassword = (emailToUpdate: string, newPass: string) => {
    setUserCredentials(prev => {
      const updated = { ...prev, [emailToUpdate.toLowerCase()]: newPass };
      try { localStorage.setItem('seshcure_creds', JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    setRegisteredUsers(prev => {
      const updated = prev.map(u => u.email.toLowerCase() === updatedUser.email.toLowerCase() ? updatedUser : u);
      try { localStorage.setItem('seshcure_users', JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    // Security reset: Always start on 'vault' tab so non-admins never inherit admin tabs
    setActiveTab('vault');

    const newLog: SessionAuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      userEmail: user.email,
      userName: user.name,
      action: 'LOGIN_AUTH_SUCCESS',
      ipAddress: user.lastLoginIp || '10.10.18.24',
      city: 'Cabuyao City',
      region: 'Laguna (CALABARZON)',
      country: 'Philippines',
      isp: user.isCampusSubnet ? 'Mapúa MCL Enterprise Campus Network' : 'External ISP Network',
      isCampusSubnet: !!user.isCampusSubnet,
      status: 'SUCCESS',
      riskScore: user.isCampusSubnet ? 0 : 15
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleLogout = () => {
    // Security reset: Wipe active tab back to vault
    setActiveTab('vault');

    if (currentUser) {
      const newLog: SessionAuditLog = {
        id: `log-logout-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        userEmail: currentUser.email,
        userName: currentUser.name,
        action: 'LOGOUT_SESSION_TERMINATED',
        ipAddress: currentUser.lastLoginIp || '10.10.18.24',
        city: 'Cabuyao City',
        region: 'Laguna',
        country: 'Philippines',
        isp: 'Mapúa MCL Network',
        isCampusSubnet: true,
        status: 'SUCCESS',
        riskScore: 0
      };
      setAuditLogs(prev => [newLog, ...prev]);
    }
    setCurrentUser(null);
  };

  const handleCreateFolder = (newFolder: FolderItem) => {
    setFolders(prev => [...prev, newFolder]);
  };

  const handleUpdateFolder = (updatedFolder: FolderItem) => {
    setFolders(prev => prev.map(f => f.id === updatedFolder.id ? updatedFolder : f));
  };

  const handleUploadFile = (newFile: EncryptedFileItem) => {
    setFiles(prev => [newFile, ...prev]);
    if (currentUser) {
      const log: SessionAuditLog = {
        id: `log-up-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        userEmail: currentUser.email,
        userName: currentUser.name,
        action: `AES256_UPLOAD_${newFile.name}`,
        ipAddress: currentUser.lastLoginIp || '10.10.18.24',
        city: 'Cabuyao City',
        region: 'Laguna',
        country: 'Philippines',
        isp: 'Mapúa MCL Enterprise Campus Network',
        isCampusSubnet: true,
        status: 'SUCCESS',
        riskScore: 1
      };
      setAuditLogs(prev => [log, ...prev]);
    }
  };

  const handleUpdateFile = (updated: EncryptedFileItem) => {
    setFiles(prev => prev.map(f => f.id === updated.id ? updated : f));
  };

  const handleCreateShareLink = (newLink: SharedLink) => {
    setSharedLinks(prev => [newLink, ...prev]);
    if (currentUser) {
      const log: SessionAuditLog = {
        id: `log-share-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        userEmail: currentUser.email,
        userName: currentUser.name,
        action: `SHARE_LINK_CREATED_${newLink.isNeverExpire ? 'NO_EXPIRY' : newLink.expiryHours + 'H'}_${newLink.token}`,
        ipAddress: currentUser.lastLoginIp || '10.10.18.24',
        city: 'Cabuyao City',
        region: 'Laguna',
        country: 'Philippines',
        isp: 'Mapúa MCL Enterprise Campus Network',
        isCampusSubnet: true,
        status: 'SUCCESS',
        riskScore: 2
      };
      setAuditLogs(prev => [log, ...prev]);
    }
  };

  const handleRevokeLink = (linkId: string) => {
    setSharedLinks(prev => prev.map(l => l.id === linkId ? { ...l, isRevoked: true } : l));
    if (currentUser) {
      const log: SessionAuditLog = {
        id: `log-revlink-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        userEmail: currentUser.email,
        userName: currentUser.name,
        action: `ADMIN_EMERGENCY_REVOKE_LINK_${linkId}`,
        ipAddress: '10.10.42.105',
        city: 'Cabuyao City',
        region: 'Laguna',
        country: 'Philippines',
        isp: 'MCL IT Security Directorate',
        isCampusSubnet: true,
        status: 'WARNING',
        riskScore: 0
      };
      setAuditLogs(prev => [log, ...prev]);
    }
  };

  const handleDeleteFile = (fileId: string) => {
    const fileToDelete = files.find(f => f.id === fileId);
    setFiles(prev => prev.filter(f => f.id !== fileId));
    setSharedLinks(prev => prev.filter(l => l.fileId !== fileId));
    if (currentUser && fileToDelete) {
      const log: SessionAuditLog = {
        id: `log-delfile-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        userEmail: currentUser.email,
        userName: currentUser.name,
        action: `FILE_DELETED_${fileToDelete.name}`,
        ipAddress: currentUser.lastLoginIp || '10.10.18.24',
        city: 'Cabuyao City',
        region: 'Laguna',
        country: 'Philippines',
        isp: 'Mapúa MCL Enterprise Campus Network',
        isCampusSubnet: true,
        status: 'WARNING',
        riskScore: 2
      };
      setAuditLogs(prev => [log, ...prev]);
    }
  };

  const handleDeleteFolder = (folderId: string, folderName: string, deleteContainedFiles: boolean = false) => {
    setFolders(prev => prev.filter(f => f.id !== folderId));
    if (deleteContainedFiles) {
      setFiles(prev => prev.filter(f => !(f.folder === folderName && (f.ownerEmail.toLowerCase() === currentUser?.email.toLowerCase() || currentUser?.role === 'admin'))));
    } else {
      setFiles(prev => prev.map(f => {
        if (f.folder === folderName && (f.ownerEmail.toLowerCase() === currentUser?.email.toLowerCase() || currentUser?.role === 'admin')) {
          return { ...f, folder: 'General Vault' };
        }
        return f;
      }));
    }

    if (currentUser) {
      const log: SessionAuditLog = {
        id: `log-delfolder-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        userEmail: currentUser.email,
        userName: currentUser.name,
        action: `FOLDER_DELETED_${folderName}_${deleteContainedFiles ? 'PURGED_FILES' : 'RELOCATED_TO_GENERAL'}`,
        ipAddress: currentUser.lastLoginIp || '10.10.18.24',
        city: 'Cabuyao City',
        region: 'Laguna',
        country: 'Philippines',
        isp: 'Mapúa MCL Enterprise Campus Network',
        isCampusSubnet: true,
        status: 'WARNING',
        riskScore: 2
      };
      setAuditLogs(prev => [log, ...prev]);
    }
  };

  const handleRevokeFile = (fileId: string) => {
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, isRevoked: true } : f));
    setSharedLinks(prev => prev.map(l => l.fileId === fileId ? { ...l, isRevoked: true } : l));
  };

  const handleAddAuditLog = (log: SessionAuditLog) => {
    setAuditLogs(prev => [log, ...prev]);
  };

  const handleRecordDownload = (linkId: string, email: string) => {
    setSharedLinks(prev => prev.map(l => {
      if (l.id === linkId) {
        return {
          ...l,
          downloadCount: l.downloadCount + 1,
          accessLog: [
            {
              timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
              ip: currentUser?.lastLoginIp || '10.10.18.24',
              location: 'Cabuyao, Laguna (MCL Campus Subnet)',
              emailAttempt: email,
              status: 'GRANTED'
            },
            ...l.accessLog
          ]
        };
      }
      return l;
    }));
  };

  // GATEKEEPING: If user is not logged in, render the dedicated Mapúa MCL Login Screen first
  if (!currentUser) {
    return (
      <>
        <LoginScreen 
          onLogin={handleLogin}
          users={registeredUsers}
          userCredentials={userCredentials}
          onRegisterAccount={handleRegisterAccount}
          onUpdatePassword={handleUpdatePassword}
        />
        {testingShareToken && (
          <SharedLinkAccessModal
            token={testingShareToken}
            onClose={() => setTestingShareToken(null)}
            currentUser={currentUser}
            sharedLinks={sharedLinks}
            files={files}
            onOpenAuth={() => {}}
            onRecordDownload={handleRecordDownload}
          />
        )}
      </>
    );
  }

  // CRITICAL ROLE-BASED ACCESS CONTROL:
  // Non-admin accounts (students, faculty) CANNOT be on 'admin', 'mobile', or 'cloud' under any circumstances!
  const effectiveTab = currentUser.role === 'admin' ? activeTab : 'vault';

  // Once authenticated, user enters the Google Drive style SeshCure Vault
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-900 selection:text-white">
      
      {/* Navigation Header */}
      <Navbar
        currentUser={currentUser}
        activeTab={effectiveTab}
        setActiveTab={setActiveTab}
        onOpenAuth={() => {}}
        onLogout={handleLogout}
        onUpdateUser={handleUpdateUser}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* Dynamic Route View */}
        {effectiveTab === 'vault' && (
          <VaultView
            currentUser={currentUser}
            files={files}
            folders={folders}
            sharedLinks={sharedLinks}
            onUploadFile={handleUploadFile}
            onUpdateFile={handleUpdateFile}
            onDeleteFile={handleDeleteFile}
            onCreateFolder={handleCreateFolder}
            onUpdateFolder={handleUpdateFolder}
            onDeleteFolder={handleDeleteFolder}
            onCreateShareLink={handleCreateShareLink}
            onOpenShareTester={(token) => setTestingShareToken(token)}
          />
        )}

        {effectiveTab === 'admin' && currentUser.role === 'admin' && (
          <AdminConsole
            currentUser={currentUser}
            auditLogs={auditLogs}
            sharedLinks={sharedLinks}
            files={files}
            onRevokeLink={handleRevokeLink}
            onRevokeFile={handleRevokeFile}
            onAddAuditLog={handleAddAuditLog}
          />
        )}

        {effectiveTab === 'mobile' && currentUser.role === 'admin' && (
          <MobileAppEmulator
            currentUser={currentUser}
            files={files}
            onUploadFile={handleUploadFile}
          />
        )}

        {effectiveTab === 'cloud' && currentUser.role === 'admin' && (
          <CloudExportView />
        )}

      </main>

      {/* Campus Institutional Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/40 py-6 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-rose-700 flex items-center justify-center font-bold text-white text-[10px]">
              MCL
            </div>
            <span className="font-medium text-slate-400">
              SeshCure Portal · Mapúa Malayan Colleges Laguna
            </span>
          </div>

          <div className="text-center sm:text-right text-[11px] text-slate-500 space-y-0.5">
            <div>Pulo-Diezmo Road, Cabuyao, Laguna, 4025 Philippines</div>
            <div className="font-mono text-slate-600">
              Subnet 10.10.0.0/16 · AES-256-GCM Hardware Encrypted
            </div>
          </div>
        </div>
      </footer>

      {/* Shared Link Gateway Tester Modal */}
      <SharedLinkAccessModal
        token={testingShareToken}
        onClose={() => setTestingShareToken(null)}
        currentUser={currentUser}
        sharedLinks={sharedLinks}
        files={files}
        onOpenAuth={() => {}}
        onRecordDownload={handleRecordDownload}
      />

    </div>
  );
}
