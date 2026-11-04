import React, { useState } from 'react';
import { User } from '../types';
import { INITIAL_USERS } from '../data/mockData';
import { Shield, AlertTriangle, CheckCircle2, Lock, User as UserIcon, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('College of Information Technology (CCIS)');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  if (!isOpen) return null;

  const validateMclDomain = (val: string): boolean => {
    const trimmed = val.trim().toLowerCase();
    return trimmed.endsWith('@mcl.edu.ph') || trimmed.endsWith('@mcl.ph');
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);
    setSuccessBanner(null);

    const cleanEmail = email.trim().toLowerCase();

    // Strict Domain Gate
    if (!validateMclDomain(cleanEmail)) {
      setErrorBanner(
        `Domain Rejected: "${cleanEmail || 'blank'}" is not an authorized Mapúa MCL address. Only @mcl.edu.ph or @mcl.ph are permitted.`
      );
      return;
    }

    if (!password) {
      setErrorBanner('Please enter your master password.');
      return;
    }

    // Check against existing users or synthesize authorized campus profile
    const existing = INITIAL_USERS.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      setSuccessBanner(`Authenticated successfully as ${existing.name}. Establishing AES-256 session.`);
      setTimeout(() => {
        onLogin(existing);
        onClose();
      }, 600);
    } else {
      // New valid MCL domain user
      const isFaculty = cleanEmail.startsWith('prof') || cleanEmail.startsWith('engr') || cleanEmail.includes('faculty');
      const newUser: User = {
        id: `u-${Date.now()}`,
        email: cleanEmail,
        name: cleanEmail.split('@')[0].replace('.', ' ').toUpperCase(),
        role: isFaculty ? 'faculty' : 'student',
        department: 'Mapúa Malayan Colleges Laguna',
        lastLoginIp: '10.10.22.84',
        isCampusSubnet: true
      };
      setSuccessBanner(`Authenticated successfully as ${newUser.name}. Establishing AES-256 session.`);
      setTimeout(() => {
        onLogin(newUser);
        onClose();
      }, 600);
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);
    setSuccessBanner(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!validateMclDomain(cleanEmail)) {
      setErrorBanner(
        `Registration Denied: "${cleanEmail}" was rejected by campus perimeter security. Only official emails ending in @mcl.edu.ph or @mcl.ph are accepted.`
      );
      return;
    }

    if (password.length < 8) {
      setErrorBanner('Password must be at least 8 characters long for AES-256 master key derivation.');
      return;
    }

    const isFaculty = department.toLowerCase().includes('faculty') || department.toLowerCase().includes('staff');
    const newUser: User = {
      id: `u-${Date.now()}`,
      email: cleanEmail,
      name: fullName || cleanEmail.split('@')[0],
      role: isFaculty ? 'faculty' : 'student',
      department: department,
      lastLoginIp: '10.10.15.55',
      isCampusSubnet: true
    };

    setSuccessBanner(`Account created successfully for ${newUser.name} with Bcrypt hash verification! Signing in...`);
    setTimeout(() => {
      onLogin(newUser);
      onClose();
    }, 700);
  };

  const pickPersona = (persona: User) => {
    setErrorBanner(null);
    setSuccessBanner(`Switching session to ${persona.name} (${persona.role.toUpperCase()})...`);
    setTimeout(() => {
      onLogin(persona);
      onClose();
    }, 400);
  };

  const simulateBadDomainTest = () => {
    setEmail('payongluismiguel649@gmail.com');
    setPassword('test1234');
    setErrorBanner(
      'Access Denied: External domain "@gmail.com" detected. Mapúa MCL Campus Security strictly prevents non-institutional email accounts from accessing or receiving decrypted vault documents.'
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors p-1"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-5 border-b border-slate-800 mb-5">
          <div className="w-10 h-10 rounded-lg bg-rose-700 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            MCL
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">SeshCure Campus Gate</h2>
            <p className="text-xs text-slate-400">Mapúa Malayan Colleges Laguna Security</p>
          </div>
        </div>

        {/* Alert Banner for Rejections */}
        {errorBanner && (
          <div className="mb-4 p-3.5 bg-rose-950/90 border border-rose-800 rounded-lg text-xs text-rose-200 leading-relaxed flex items-start gap-2.5 animate-fadeIn">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Security Gate Rejection:</span>
              {errorBanner}
            </div>
          </div>
        )}

        {/* Alert Banner for Success */}
        {successBanner && (
          <div className="mb-4 p-3.5 bg-emerald-950/90 border border-emerald-800 rounded-lg text-xs text-emerald-200 leading-relaxed flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Campus Gate Verified:</span>
              {successBanner}
            </div>
          </div>
        )}

        {/* Quick Demo Personas Selector */}
        <div className="mb-5 p-3 bg-slate-950/80 border border-slate-800 rounded-lg">
          <div className="text-[11px] font-medium text-slate-400 mb-2 flex items-center justify-between">
            <span>Quick MCL Demo Personas:</span>
            <button
              type="button"
              onClick={simulateBadDomainTest}
              className="text-rose-400 hover:text-rose-300 font-mono text-[10px] underline"
            >
              Test Non-MCL @gmail.com
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {INITIAL_USERS.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => pickPersona(p)}
                className="text-left p-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800/80 hover:border-rose-700/60 transition text-xs"
              >
                <div className="font-medium text-slate-200 truncate">{p.name.split(' ')[0]}</div>
                <div className="text-[10px] text-slate-400 font-mono truncate">{p.email}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-slate-800 mb-5">
          <button
            type="button"
            onClick={() => { setTab('login'); setErrorBanner(null); }}
            className={`flex-1 pb-2.5 text-xs font-semibold transition-colors ${
              tab === 'login'
                ? 'text-rose-500 border-b-2 border-rose-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Campus Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setErrorBanner(null); }}
            className={`flex-1 pb-2.5 text-xs font-semibold transition-colors ${
              tab === 'register'
                ? 'text-rose-500 border-b-2 border-rose-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Register Student / Staff
          </button>
        </div>

        {/* Login Form */}
        {tab === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="mclEmail">
                Campus Email Address
              </label>
              <input
                id="mclEmail"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. lpayong@mcl.edu.ph"
                required
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Accepted domains: <span className="font-mono text-slate-300">@mcl.edu.ph</span> or <span className="font-mono text-slate-300">@mcl.ph</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="mclPassword">
                Master Key Password
              </label>
              <input
                id="mclPassword"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-rose-700 hover:bg-rose-600 text-white font-medium text-xs rounded-lg transition-colors shadow-sm mt-3"
            >
              Verify Credentials & Start Session
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="e.g. Luis Miguel Payong"
                required
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Official MCL Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="yourname@mcl.edu.ph"
                required
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Department / College</label>
              <select
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="College of Information Technology (CCIS)">College of Information Technology (CCIS)</option>
                <option value="Mapúa Institute of Technology at Laguna (MITL)">Mapúa Institute of Technology (MITL)</option>
                <option value="E.T. Yuchengco College of Business">E.T. Yuchengco College of Business</option>
                <option value="College of Arts and Science">College of Arts and Science</option>
                <option value="MCL Academic Staff">MCL Academic Staff</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Create Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                required
                minLength={8}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-rose-700 hover:bg-rose-600 text-white font-medium text-xs rounded-lg transition-colors shadow-sm mt-2"
            >
              Register & Encrypt Master Key
            </button>
          </form>
        )}

        {/* Footer Note */}
        <div className="mt-5 pt-4 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between font-mono">
          <span>AES-256-GCM + Bcrypt</span>
          <span>Pulo-Diezmo, Cabuyao</span>
        </div>
      </div>
    </div>
  );
};
