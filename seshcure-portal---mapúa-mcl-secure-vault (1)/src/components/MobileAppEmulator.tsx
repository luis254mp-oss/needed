import React, { useState } from 'react';
import { User, EncryptedFileItem } from '../types';
import { formatBytes } from '../utils/crypto';
import { 
  Smartphone, ShieldCheck, Camera, Lock, Bell, FileText, 
  Upload, Share2, Fingerprint, CheckCircle2, ChevronRight, Eye, RefreshCw
} from 'lucide-react';

interface MobileAppEmulatorProps {
  currentUser: User;
  files: EncryptedFileItem[];
  onUploadFile: (newFile: EncryptedFileItem) => void;
}

export const MobileAppEmulator: React.FC<MobileAppEmulatorProps> = ({
  currentUser,
  files,
  onUploadFile
}) => {
  const [mobileTab, setMobileTab] = useState<'vault' | 'scan' | 'alerts' | 'profile'>('vault');
  const [deviceModel, setDeviceModel] = useState<'ios' | 'android'>('ios');
  const [biometricsEnabled, setBiometricsEnabled] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedDocName, setScannedDocName] = useState('');
  const [scanSuccessToast, setScanSuccessToast] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);

  const handleSimulateCameraScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      const docName = scannedDocName.trim() || `MCL_Lecture_Notes_${Date.now().toString().slice(-4)}.pdf`;
      const newScannedFile: EncryptedFileItem = {
        id: `file-mob-${Date.now()}`,
        name: docName,
        folder: 'Curriculum & Syllabi',
        mimeType: 'application/pdf',
        size: 1850000,
        currentVersion: 1,
        sha256Hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        ownerEmail: currentUser.email,
        ownerName: currentUser.name,
        tags: ['MobileScan', 'Encrypted', 'Campus'],
        isRevoked: false,
        isStarred: false,
        sharedWith: [],
        generalAccess: 'mcl_domain',
        activeShareLinksCount: 0,
        versions: [
          {
            version: 1,
            uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
            fileSize: 1850000,
            sha256Hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
            changeNote: 'Direct mobile camera capture with hardware AES-256 encryption',
            uploadedBy: currentUser.email
          }
        ]
      };

      onUploadFile(newScannedFile);
      setIsScanning(false);
      setScannedDocName('');
      setScanSuccessToast(true);
      setMobileTab('vault');
      setTimeout(() => setScanSuccessToast(false), 4000);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      
      {/* Introduction Banner & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-rose-500" />
            <h2 className="text-lg font-bold text-white tracking-tight">SeshCure Cross-Platform Mobile Client</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            iOS & Android native client simulation for Mapúa MCL students and faculty on the go.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
            <button
              onClick={() => setDeviceModel('ios')}
              className={`px-3 py-1 rounded transition ${deviceModel === 'ios' ? 'bg-rose-700 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Apple iOS
            </button>
            <button
              onClick={() => setDeviceModel('android')}
              className={`px-3 py-1 rounded transition ${deviceModel === 'android' ? 'bg-rose-700 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Google Android
            </button>
          </div>
        </div>
      </div>

      {/* Main Dual-Column Layout: Device Mockup + Companion Features */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Mobile Device Frame */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-[360px] sm:w-[380px] h-[720px] bg-slate-950 border-4 border-slate-700 rounded-[48px] shadow-2xl relative overflow-hidden flex flex-col p-2.5 ring-1 ring-slate-800">
            
            {/* Speaker / Dynamic Island */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-full z-30 flex items-center justify-center gap-2 px-3">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-800"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>

            {/* Inner Screen */}
            <div className="flex-1 bg-slate-900 rounded-[38px] overflow-hidden flex flex-col relative pt-8 border border-slate-800/60">
              
              {/* Mobile Top Status Bar */}
              <div className="px-6 py-1.5 flex items-center justify-between text-[11px] text-slate-300 font-mono">
                <span>9:41</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-emerald-400">MCL-5G</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Mobile App Header */}
              <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-rose-700 flex items-center justify-center text-white font-bold text-[10px]">
                    MCL
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">SeshCure Mobile</div>
                    <div className="text-[10px] text-slate-400 font-mono">Vault · Cabuyao Subnet</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOfflineMode(!offlineMode)}
                    className={`text-[10px] px-2 py-0.5 rounded border transition font-mono ${
                      offlineMode 
                        ? 'bg-amber-950 border-amber-800 text-amber-300' 
                        : 'bg-emerald-950 border-emerald-800 text-emerald-300'
                    }`}
                  >
                    {offlineMode ? 'Offline Vault' : 'Live Sync'}
                  </button>
                </div>
              </div>

              {/* Toast inside device */}
              {scanSuccessToast && (
                <div className="mx-4 mt-2 p-2.5 bg-emerald-950 border border-emerald-800 rounded-lg text-emerald-300 text-[11px] flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Document scanned, encrypted with AES-256 & deposited.</span>
                </div>
              )}

              {/* Mobile Body Content based on tab */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {mobileTab === 'vault' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">Encrypted Documents</span>
                      <span className="text-[10px] font-mono text-slate-400">{files.length} Files</span>
                    </div>

                    <div className="space-y-2">
                      {files.slice(0, 5).map(f => (
                        <div key={f.id} className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                              <div className="text-xs font-medium text-slate-200 truncate max-w-[170px]">{f.name}</div>
                            </div>
                            <span className="text-[10px] font-mono text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-900">
                              v{f.currentVersion}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                            <span>{formatBytes(f.size)}</span>
                            <span className="text-emerald-400">AES-256 Verified</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {mobileTab === 'scan' && (
                  <div className="space-y-4 pt-2">
                    <div className="text-center space-y-1">
                      <h4 className="text-xs font-bold text-white">Camera Document Scanner</h4>
                      <p className="text-[11px] text-slate-400">
                        Capture physical syllabus, exams, or forms. SeshCure performs hardware AES-256 encryption before upload.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[11px] font-medium text-slate-300">Document Label</label>
                      <input
                        type="text"
                        value={scannedDocName}
                        onChange={e => setScannedDocName(e.target.value)}
                        placeholder="e.g. IT210_Lab_Exam_Rubric.pdf"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div className="border border-slate-800 bg-slate-950 rounded-xl p-6 flex flex-col items-center justify-center space-y-3">
                      <div className="w-16 h-16 rounded-full bg-rose-950/80 border border-rose-800 flex items-center justify-center text-rose-400">
                        <Camera className="w-8 h-8" />
                      </div>
                      <button
                        onClick={handleSimulateCameraScan}
                        disabled={isScanning}
                        className="w-full py-2.5 px-4 bg-rose-700 hover:bg-rose-600 text-white font-medium text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
                      >
                        {isScanning ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Processing & Encrypting...</span>
                          </>
                        ) : (
                          <>
                            <Camera className="w-4 h-4" />
                            <span>Take Photo & Encrypt</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {mobileTab === 'alerts' && (
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-slate-200">Security & Subnet Alerts</div>
                    <div className="p-3 bg-rose-950/40 border border-rose-900 rounded-xl space-y-1">
                      <div className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5" />
                        <span>Off-Campus Login Alert</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Login attempt detected from Santa Rosa City (Residential ISP). Session granted with restricted token window.
                      </p>
                      <div className="text-[10px] text-slate-500 font-mono">Today, 11:28 AM</div>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                      <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Campus Subnet Connected</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Device synced on Mapúa MCL 10.10.x.x LAN. Hardware key verified.
                      </p>
                      <div className="text-[10px] text-slate-500 font-mono">Today, 09:15 AM</div>
                    </div>
                  </div>
                )}

                {mobileTab === 'profile' && (
                  <div className="space-y-4 pt-1">
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                      <div className="text-xs font-bold text-white">{currentUser.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{currentUser.email}</div>
                      <div className="text-[10px] text-rose-400 font-semibold mt-1">Role: {currentUser.role.toUpperCase()}</div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
                        <div className="flex items-center gap-2">
                          <Fingerprint className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-200">Biometric Unlock (FaceID)</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={biometricsEnabled}
                          onChange={e => setBiometricsEnabled(e.target.checked)}
                          className="rounded text-rose-600 focus:ring-0"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Bottom Tab Bar */}
              <div className="border-t border-slate-800 bg-slate-950 px-4 py-2 flex items-center justify-around text-[10px]">
                <button
                  onClick={() => setMobileTab('vault')}
                  className={`flex flex-col items-center gap-1 transition ${mobileTab === 'vault' ? 'text-rose-400 font-semibold' : 'text-slate-500'}`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Vault</span>
                </button>

                <button
                  onClick={() => setMobileTab('scan')}
                  className={`flex flex-col items-center gap-1 transition ${mobileTab === 'scan' ? 'text-rose-400 font-semibold' : 'text-slate-500'}`}
                >
                  <Camera className="w-4 h-4" />
                  <span>Scan</span>
                </button>

                <button
                  onClick={() => setMobileTab('alerts')}
                  className={`flex flex-col items-center gap-1 transition ${mobileTab === 'alerts' ? 'text-rose-400 font-semibold' : 'text-slate-500'}`}
                >
                  <Bell className="w-4 h-4" />
                  <span>Alerts</span>
                </button>

                <button
                  onClick={() => setMobileTab('profile')}
                  className={`flex flex-col items-center gap-1 transition ${mobileTab === 'profile' ? 'text-rose-400 font-semibold' : 'text-slate-500'}`}
                >
                  <Lock className="w-4 h-4" />
                  <span>Security</span>
                </button>
              </div>

              {/* Bottom Home Indicator Bar */}
              <div className="pb-2 pt-1 flex justify-center bg-slate-950">
                <div className="w-24 h-1 bg-slate-700 rounded-full"></div>
              </div>

            </div>
          </div>
        </div>

        {/* Feature Explanations & Mobile Capabilities */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-white">Cross-Platform Architecture (iOS, Android, PWA)</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              SeshCure Portal's mobile application is built to ensure that Mapúa MCL faculty, researchers, and students can securely access institutional files without leaking confidential material onto unencrypted personal phone storage.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                <div className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                  <Fingerprint className="w-4 h-4" />
                  <span>Biometric Key Storage</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  AES-256 decryption keys are sealed inside Apple Secure Enclave or Android Keystore and unlocked only with FaceID or fingerprint.
                </p>
              </div>

              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Camera className="w-4 h-4" />
                  <span>Encrypted Camera Pipeline</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Scanned photos bypass unencrypted device camera rolls, streaming directly into encrypted RAM buffers and converting to signed PDFs.
                </p>
              </div>

              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                <div className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                  <Bell className="w-4 h-4" />
                  <span>Push Perimeter Alerts</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Instant push notifications if someone attempts to authenticate with your @mcl.edu.ph account outside of campus subnets.
                </p>
              </div>

              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                <div className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Offline Vault Sync</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  AES-256 encrypted local caching allows teachers to review syllabi and submissions inside air-gapped classrooms.
                </p>
              </div>
            </div>
          </div>

          {/* Quick instructions on installing as PWA */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs">
            <div className="font-semibold text-slate-200">How to Install on Mobile Devices (Zero App Store Friction):</div>
            <p className="text-slate-400 text-[11px]">
              On iOS Safari: Tap <strong>Share</strong> → <strong>Add to Home Screen</strong>.
              <br />
              On Android Chrome: Tap the <strong>Install App</strong> banner for instant offline biometric access.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
