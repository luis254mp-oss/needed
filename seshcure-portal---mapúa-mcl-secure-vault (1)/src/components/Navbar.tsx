import React, { useState } from 'react';
import { User } from '../types';
import { ShieldCheck, LogOut, UserCheck, Key, Smartphone, Check, X, ShieldAlert } from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  activeTab: 'vault' | 'admin' | 'mobile' | 'cloud';
  setActiveTab: (tab: 'vault' | 'admin' | 'mobile' | 'cloud') => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onUpdateUser?: (updatedUser: User) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onOpenAuth,
  onLogout,
  onUpdateUser
}) => {
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(currentUser?.pin2faEnabled ?? (currentUser?.role === 'admin'));
  const [pinCode, setPinCode] = useState(currentUser?.pinCode || (currentUser?.role === 'admin' ? '6767' : '2026'));
  const [pinSavedToast, setPinSavedToast] = useState(false);

  const handleSavePinSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !onUpdateUser) return;

    const finalPin = currentUser.role === 'admin' ? '6767' : pinCode.trim();
    if (pinEnabled && finalPin.length !== 4) {
      alert('Security PIN must be exactly 4 digits (e.g. 6767).');
      return;
    }

    const updated: User = {
      ...currentUser,
      pin2faEnabled: currentUser.role === 'admin' ? true : pinEnabled,
      pinCode: finalPin
    };
    onUpdateUser(updated);
    setPinSavedToast(true);
    setTimeout(() => {
      setPinSavedToast(false);
      setIsPinModalOpen(false);
    }, 1200);
  };
  return (
    <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur-md sticky top-0 z-50">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded bg-rose-700 flex items-center justify-center font-bold text-white text-xs tracking-wider shadow-sm">
            MCL
          </div>
          <button 
            onClick={() => setActiveTab('vault')}
            className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 hover:text-rose-400 transition-colors text-left"
          >
            SeshCure Portal
          </button>
        </div>

        {/* Zone 2: Navigation Links ONLY visible to Admin */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          {currentUser?.role === 'admin' ? (
            <>
              <button
                onClick={() => setActiveTab('vault')}
                className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
                  activeTab === 'vault'
                    ? 'text-white border-b-2 border-rose-500 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Vault Files
              </button>
              <button
                onClick={() => setActiveTab('admin')}
                className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
                  activeTab === 'admin'
                    ? 'text-white border-b-2 border-rose-500 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Session Monitor
              </button>
              <button
                onClick={() => setActiveTab('mobile')}
                className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
                  activeTab === 'mobile'
                    ? 'text-white border-b-2 border-rose-500 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Mobile App View
              </button>
              <button
                onClick={() => setActiveTab('cloud')}
                className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
                  activeTab === 'cloud'
                    ? 'text-white border-b-2 border-rose-500 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Cloud Hosting & Code
              </button>
            </>
          ) : (
            <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Mapúa MCL Campus Vault · End-to-End Encrypted (AES-256)</span>
            </div>
          )}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setPinEnabled(currentUser.pin2faEnabled ?? (currentUser.role === 'admin'));
                  setPinCode(currentUser.pinCode || (currentUser.role === 'admin' ? '6767' : '2026'));
                  setIsPinModalOpen(true);
                }}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-mono transition flex items-center gap-1.5 border ${
                  currentUser.role === 'admin' || currentUser.pin2faEnabled
                    ? 'bg-rose-950/60 text-rose-300 border-rose-800/80 hover:bg-rose-900/60'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700/80 hover:text-slate-200'
                }`}
                title="Manage 4-Digit Security PIN (2FA)"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">2FA PIN:</span>
                <span className="font-bold text-white">
                  {currentUser.role === 'admin' 
                    ? '6767' 
                    : currentUser.pin2faEnabled 
                    ? (currentUser.pinCode || 'ON') 
                    : 'OFF'}
                </span>
              </button>

              <div className="text-right hidden sm:block">
                <div className="text-xs font-medium text-slate-200 truncate max-w-[180px]">
                  {currentUser.name}
                </div>
                <div className="text-[11px] text-slate-400 font-mono flex items-center justify-end gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${currentUser.isCampusSubnet ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                  {currentUser.role.toUpperCase()} · {currentUser.email.split('@')[1]}
                </div>
              </div>
              <button
                onClick={onLogout}
                className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                title="Log out of session"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="py-2 px-4 bg-rose-700 hover:bg-rose-600 text-white rounded-lg text-xs font-medium transition-colors shadow-sm whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Campus Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* 2FA PIN Settings Modal */}
      {isPinModalOpen && currentUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-rose-500" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  4-Digit Phone Security PIN
                </h3>
              </div>
              <button
                onClick={() => setIsPinModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            {pinSavedToast ? (
              <div className="p-4 bg-emerald-950/80 border border-emerald-800 rounded-xl text-center space-y-1">
                <Check className="w-6 h-6 text-emerald-400 mx-auto" />
                <div className="text-xs font-bold text-emerald-200">2FA PIN Settings Saved</div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {pinEnabled ? `Active PIN: ${currentUser.role === 'admin' ? '6767' : pinCode}` : 'PIN 2FA is turned OFF'}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSavePinSettings} className="space-y-4 text-xs">
                {currentUser.role === 'admin' ? (
                  <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-xl space-y-1">
                    <span className="font-semibold text-rose-300 block">Admin Institutional Policy:</span>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      For IT Directorate and administrator accounts, 4-digit code authentication is mandatory.
                    </p>
                    <div className="text-xs font-mono text-white bg-slate-950 p-2 rounded border border-rose-900/80 mt-1 flex justify-between">
                      <span>Admin Access PIN:</span>
                      <strong className="text-rose-400 font-bold">6767</strong>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div>
                        <div className="font-semibold text-white">Enable 4-Digit PIN Security</div>
                        <div className="text-[10px] text-slate-400">Phone-style passcode upon sign in</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={pinEnabled}
                        onChange={e => setPinEnabled(e.target.checked)}
                        className="w-4 h-4 rounded text-rose-600 bg-slate-900 border-slate-700 focus:ring-rose-500"
                      />
                    </div>

                    {pinEnabled && (
                      <div>
                        <label className="block text-slate-300 font-medium mb-1.5">
                          Set 4-Digit Security Code
                        </label>
                        <input
                          type="text"
                          maxLength={4}
                          value={pinCode}
                          onChange={e => setPinCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="4 digits (e.g. 6767 or 2026)"
                          required
                          className="w-full text-center tracking-widest text-lg font-mono px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
                        />
                        <p className="text-[10px] text-slate-500 mt-1 text-center">
                          Enter 4 numbers. You can choose to keep this on or off anytime.
                        </p>
                      </div>
                    )}
                  </>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPinModalOpen(false)}
                    className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-1.5 px-4 bg-rose-700 hover:bg-rose-600 text-white font-semibold rounded-lg text-xs shadow-sm"
                  >
                    Save PIN Settings
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Mobile Nav strip only for Admin */}
      {currentUser?.role === 'admin' && (
        <div className="md:hidden flex items-center justify-around border-t border-slate-800/80 px-2 py-2 bg-slate-950/80 text-xs">
          <button
            onClick={() => setActiveTab('vault')}
            className={`px-2.5 py-1 rounded ${activeTab === 'vault' ? 'text-rose-400 font-semibold bg-rose-950/40' : 'text-slate-400'}`}
          >
            Vault
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`px-2.5 py-1 rounded ${activeTab === 'admin' ? 'text-rose-400 font-semibold bg-rose-950/40' : 'text-slate-400'}`}
          >
            Admin
          </button>
          <button
            onClick={() => setActiveTab('mobile')}
            className={`px-2.5 py-1 rounded ${activeTab === 'mobile' ? 'text-rose-400 font-semibold bg-rose-950/40' : 'text-slate-400'}`}
          >
            Mobile
          </button>
          <button
            onClick={() => setActiveTab('cloud')}
            className={`px-2.5 py-1 rounded ${activeTab === 'cloud' ? 'text-rose-400 font-semibold bg-rose-950/40' : 'text-slate-400'}`}
          >
            Cloud
          </button>
        </div>
      )}
    </header>
  );
};
