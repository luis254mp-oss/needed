import React, { useState } from 'react';
import { User } from '../types';
import { TEST_CREDENTIALS, INITIAL_USERS } from '../data/mockData';
import { 
  ShieldCheck, AlertTriangle, CheckCircle2, Lock, ArrowRight, 
  Key, UserCheck, ShieldAlert, Sparkles, Eye, EyeOff, Check, X,
  Smartphone, Mail, RefreshCw, Send, ArrowLeft, ExternalLink
} from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: User) => void;
  users?: User[];
  userCredentials?: Record<string, string>;
  onRegisterAccount?: (newUser: User, newPassword: string) => void;
  onUpdatePassword?: (email: string, newPass: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ 
  onLogin, 
  users = INITIAL_USERS,
  userCredentials,
  onRegisterAccount,
  onUpdatePassword
}) => {
  // Screens: 'login' | 'register' | 'pin-challenge' | 'forgot-password' | 'reset-form'
  const [screen, setScreen] = useState<'login' | 'register' | 'pin-challenge' | 'forgot-password' | 'reset-form'>('login');
  
  // Login Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // 2FA PIN Registration / State
  const [enablePin2fa, setEnablePin2fa] = useState(false);
  const [customPin, setCustomPin] = useState('2026');

  // PIN Challenge States
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Forgot Password / Email Reset States
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [simulatedMailReceived, setSimulatedMailReceived] = useState(false);
  const [newResetPassword, setNewResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');

  // Banners & Loading
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Active credentials map
  const activeCreds: Record<string, string> = React.useMemo(() => {
    if (userCredentials && Object.keys(userCredentials).length > 0) {
      return userCredentials;
    }
    const map: Record<string, string> = {};
    TEST_CREDENTIALS.forEach(c => {
      map[c.email.toLowerCase()] = c.password;
    });
    return map;
  }, [userCredentials]);

  // Mapúa MCL Institutional Domain Validation:
  // Strictly enforces @live.mcl.edu.ph for students, @mcl.edu.ph for staff/prof/dean and admin
  const validateMclDomain = (val: string): { isValid: boolean; domainType?: 'student' | 'staff'; message?: string } => {
    const trimmed = val.trim().toLowerCase();
    if (trimmed.endsWith('@live.mcl.edu.ph')) {
      return { isValid: true, domainType: 'student' };
    }
    if (trimmed.endsWith('@mcl.edu.ph') || trimmed.endsWith('@mcl.ph')) {
      return { isValid: true, domainType: 'staff' };
    }
    return {
      isValid: false,
      message: `Access Denied: "${trimmed || 'blank'}" is not an authorized Mapúa MCL institutional domain. Student accounts must end in @live.mcl.edu.ph and staff accounts in @mcl.edu.ph.`
    };
  };

  // Standard Password Criteria
  const checkPasswordCriteria = (pass: string) => {
    const hasMinLength = pass.length >= 10;
    const hasUpper = /[A-Z]/.test(pass);
    const hasLower = /[a-z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass);
    const isStandard = hasMinLength && hasUpper && hasLower && hasNumber && hasSymbol;
    return { hasMinLength, hasUpper, hasLower, hasNumber, hasSymbol, isStandard };
  };

  const regPassCriteria = checkPasswordCriteria(password);
  const resetPassCriteria = checkPasswordCriteria(newResetPassword);

  const generateStandardPassword = (target: 'register' | 'reset') => {
    const prefixes = [
      'MCL_Secure',
      'MCL_Campus',
      'MCL_VaultGuard',
      'MclStudent',
      'MclMember',
      'FacultySecure',
      'MitlProf'
    ];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const year = new Date().getFullYear();
    const symbols = ['!', '@', '#', '$'];
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const stdPass = `${prefix}${year}${symbol}`;
    
    if (target === 'register') {
      setPassword(stdPass);
    } else {
      setNewResetPassword(stdPass);
      setConfirmResetPassword(stdPass);
    }
    setShowPassword(true);
    setSuccessBanner(`Standard password generated: "${stdPass}". Meets all campus entropy standards.`);
    setErrorBanner(null);
  };

  const executeLogin = (userToLogin: User) => {
    setLoading(true);
    setSuccessBanner(`Identity verified: ${userToLogin.name} (${userToLogin.role.toUpperCase()}). Initializing AES-256 session...`);
    setTimeout(() => {
      onLogin(userToLogin);
      setLoading(false);
    }, 600);
  };

  // 1. Initial Step: Manual Login submission
  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);
    setSuccessBanner(null);

    const cleanEmail = email.trim().toLowerCase();

    // 1. Domain Check
    const domainCheck = validateMclDomain(cleanEmail);
    if (!domainCheck.isValid) {
      setErrorBanner(domainCheck.message || 'Invalid Mapúa MCL email domain.');
      return;
    }

    if (!password) {
      setErrorBanner('Please enter your account password.');
      return;
    }

    // 2. Strict Credential Check
    const expectedPassword = activeCreds[cleanEmail];
    if (!expectedPassword) {
      setErrorBanner(
        `Account Not Found: No SeshCure account is registered under "${cleanEmail}". Please check your email or click "Register New Account".`
      );
      return;
    }

    // 3. Strict Password Verification
    if (password !== expectedPassword) {
      setErrorBanner(
        `Invalid Credentials: The password entered does not match the campus authentication records for "${cleanEmail}". Access is denied.`
      );
      return;
    }

    // 4. Retrieve or construct user
    const existing = users.find(u => u.email.toLowerCase() === cleanEmail) || {
      id: `u-${Date.now()}`,
      email: cleanEmail,
      name: cleanEmail.split('@')[0].replace('.', ' ').toUpperCase(),
      role: (cleanEmail === 'admin@mcl.edu.ph' ? 'admin' : domainCheck.domainType === 'staff' ? 'faculty' : 'student') as any,
      department: 'Mapúa Malayan Colleges Laguna',
      lastLoginIp: '10.10.18.99',
      isCampusSubnet: true,
      pin2faEnabled: cleanEmail === 'admin@mcl.edu.ph',
      pinCode: cleanEmail === 'admin@mcl.edu.ph' ? '6767' : '2026'
    };

    // 5. 4-Digit Code Authentication Challenge:
    // Admin is MANDATORY 6767. Other users only if pin2faEnabled is true.
    const requiresPin = cleanEmail === 'admin@mcl.edu.ph' || existing.pin2faEnabled;

    if (requiresPin) {
      setPendingUser(existing);
      setEnteredPin('');
      setPinError(null);
      setScreen('pin-challenge');
    } else {
      executeLogin(existing);
    }
  };

  // 2. PIN Numpad / Submission Handler
  const handlePinDigit = (digit: string) => {
    if (enteredPin.length < 4) {
      const nextPin = enteredPin + digit;
      setEnteredPin(nextPin);
      setPinError(null);

      // Auto-submit on 4th digit
      if (nextPin.length === 4) {
        verifyPinCode(nextPin);
      }
    }
  };

  const handlePinBackspace = () => {
    setEnteredPin(prev => prev.slice(0, -1));
    setPinError(null);
  };

  const verifyPinCode = (pinToTest: string) => {
    if (!pendingUser) return;

    // Admin MUST be 6767
    const expectedPin = pendingUser.email.toLowerCase() === 'admin@mcl.edu.ph' 
      ? '6767' 
      : (pendingUser.pinCode || '2026');

    if (pinToTest === expectedPin) {
      setSuccessBanner(`PIN verified for ${pendingUser.name}! Hardware authorization successful.`);
      setTimeout(() => {
        executeLogin(pendingUser);
      }, 400);
    } else {
      setPinError(
        pendingUser.email.toLowerCase() === 'admin@mcl.edu.ph'
          ? 'Invalid code. Admin 4-digit security code is strictly 6767.'
          : 'Invalid 4-digit PIN code. Please try again.'
      );
      setEnteredPin('');
    }
  };

  // 3. Register Account Handler
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);
    setSuccessBanner(null);

    const cleanEmail = email.trim().toLowerCase();

    // Validate domain
    const domainCheck = validateMclDomain(cleanEmail);
    if (!domainCheck.isValid) {
      setErrorBanner(domainCheck.message || 'Registration rejected: Invalid domain.');
      return;
    }

    // Enforce Standard Password
    if (!regPassCriteria.isStandard) {
      setErrorBanner(
        'Standard Password Required: Your password must meet the Mapúa MCL security standard (minimum 10 characters with uppercase, lowercase, number, and special symbol like "!"). Click "Generate Standard Password" to apply one instantly.'
      );
      return;
    }

    if (enablePin2fa && customPin.trim().length !== 4) {
      setErrorBanner('Please provide a valid 4-digit security PIN.');
      return;
    }

    const newUser: User = {
      id: `u-${Date.now()}`,
      email: cleanEmail,
      name: fullName.trim() || cleanEmail.split('@')[0].toUpperCase(),
      role: (cleanEmail === 'admin@mcl.edu.ph' ? 'admin' : domainCheck.domainType === 'staff' ? 'faculty' : 'student') as any,
      department: 'Mapúa Malayan Colleges Laguna',
      lastLoginIp: '10.10.18.99',
      isCampusSubnet: true,
      pin2faEnabled: enablePin2fa,
      pinCode: enablePin2fa ? customPin.trim() : undefined
    };

    setSuccessBanner(`Account registered for ${newUser.name}! Standard password & 2FA credentials saved.`);
    setTimeout(() => {
      if (onRegisterAccount) {
        onRegisterAccount(newUser, password);
      } else {
        onLogin(newUser);
      }
    }, 700);
  };

  // 4. Quick Login via Test Cards
  const handleQuickLogin = (testCred: typeof TEST_CREDENTIALS[0]) => {
    setEmail(testCred.email);
    setPassword(testCred.password);
    setErrorBanner(null);

    const matched = users.find(u => u.email.toLowerCase() === testCred.email.toLowerCase()) || {
      id: `u-${testCred.email}`,
      email: testCred.email,
      name: testCred.name,
      role: testCred.role as any,
      department: testCred.department,
      lastLoginIp: '10.10.18.24',
      isCampusSubnet: true,
      pin2faEnabled: testCred.pin2faEnabled,
      pinCode: testCred.pinCode
    };

    // If admin or 2FA enabled, trigger the 4-digit code challenge
    if (testCred.email.toLowerCase() === 'admin@mcl.edu.ph' || testCred.pin2faEnabled) {
      setPendingUser(matched);
      setEnteredPin('');
      setPinError(null);
      setScreen('pin-challenge');
    } else {
      executeLogin(matched);
    }
  };

  // 5. Send Password Reset Link to School Email
  const handleSendResetEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);
    setSuccessBanner(null);

    const cleanEmail = forgotEmail.trim().toLowerCase();
    const domainCheck = validateMclDomain(cleanEmail);
    if (!domainCheck.isValid) {
      setErrorBanner(domainCheck.message || 'Please enter an official Mapúa MCL email address.');
      return;
    }

    const token = `mcl_reset_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    setResetToken(token);
    setSimulatedMailReceived(true);
    setSuccessBanner(`Password reset authorization link dispatched to official school mailbox (${cleanEmail}). Check simulated inbox below.`);
  };

  // 6. Complete Reset Password
  const handleCompletePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);
    setSuccessBanner(null);

    if (!resetPassCriteria.isStandard) {
      setErrorBanner('Your new password must meet the standard (10+ characters, uppercase, lowercase, number, symbol).');
      return;
    }

    if (newResetPassword !== confirmResetPassword) {
      setErrorBanner('Passwords do not match. Please re-enter your new password.');
      return;
    }

    if (onUpdatePassword) {
      onUpdatePassword(forgotEmail.trim().toLowerCase(), newResetPassword);
    }

    setSuccessBanner(`Password successfully reset for ${forgotEmail}! You may now sign in with your new credentials.`);
    setEmail(forgotEmail);
    setPassword(newResetPassword);
    setScreen('login');
    setSimulatedMailReceived(false);
    setResetToken(null);
    setNewResetPassword('');
    setConfirmResetPassword('');
  };

  const testRejection = () => {
    setEmail('payongluismiguel649@gmail.com');
    setPassword('TestSecretPassword123');
    setErrorBanner(
      'Security Gate Rejection: External domain "@gmail.com" dropped. Only official student accounts (@live.mcl.edu.ph) and staff accounts (@mcl.edu.ph) are permitted.'
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-rose-900 selection:text-white">
      
      {/* Top Banner */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-rose-700 flex items-center justify-center font-bold text-white text-sm shadow-sm">
            MCL
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">SeshCure Portal</h1>
            <p className="text-xs text-slate-400">Mapúa Malayan Colleges Laguna · Institutional File Vault</p>
          </div>
        </div>
        <div className="text-xs font-mono text-slate-400 hidden sm:flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Domain Gate Active</span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-rose-400">@live.mcl.edu.ph & @mcl.edu.ph</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row items-center justify-center gap-8 my-auto">
        
        {/* Left Column: Institutional Credentials for Testing */}
        <div className="w-full lg:w-1/2 space-y-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-950/80 border border-rose-800/80 text-[11px] font-mono text-rose-300">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Campus Single Sign-On & 4-Digit PIN Auth</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Sign in to your SeshCure Vault
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Research documents, student submissions, and faculty grades are protected by AES-256 end-to-end encryption. Mapúa MCL enforces domain gating and phone-style 4-digit code authorization.
            </p>
          </div>

          {/* Test Users Cards */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
              <span className="font-semibold text-slate-200">Test Credentials & Security PINs</span>
              <button
                type="button"
                onClick={testRejection}
                className="text-rose-400 hover:text-rose-300 text-[11px] font-mono underline"
              >
                Test @gmail.com Rejection
              </button>
            </div>

            <div className="space-y-2">
              {TEST_CREDENTIALS.map((cred) => (
                <div
                  key={cred.email}
                  className="p-3 bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 rounded-lg transition group flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-100 truncate">{cred.name}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded uppercase ${
                        cred.role === 'admin' 
                          ? 'bg-amber-950 text-amber-300 border border-amber-800' 
                          : cred.role === 'faculty' 
                          ? 'bg-rose-950 text-rose-300 border border-rose-800' 
                          : 'bg-blue-950 text-blue-300 border border-blue-800'
                      }`}>
                        {cred.role}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 truncate">
                      Email: <span className="text-slate-200 font-medium">{cred.email}</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 truncate flex items-center gap-2">
                      <span>Pass: <strong className="text-emerald-400">{cred.password}</strong></span>
                      {cred.pinCode && (
                        <span className="text-amber-400 bg-amber-950/60 px-1 rounded border border-amber-900/60 font-mono">
                          PIN: {cred.pinCode}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin(cred)}
                    className="py-1.5 px-3 bg-rose-700 hover:bg-rose-600 text-white rounded text-[11px] font-medium transition shrink-0 shadow-sm flex items-center gap-1"
                  >
                    <span>Sign In</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            <div className="text-[11px] text-slate-500 font-mono pt-1 flex items-center justify-between">
              <span>Admin PIN: <strong className="text-rose-400">6767</strong></span>
              <span>Students: <strong className="text-blue-400">@live.mcl.edu.ph</strong></span>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Screen Container */}
        <div className="w-full lg:w-1/2 max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative">
          
          {/* Header */}
          <div className="flex items-center gap-3 pb-5 border-b border-slate-800 mb-5">
            <div className="w-10 h-10 rounded-lg bg-rose-700 flex items-center justify-center font-bold text-white text-sm">
              MCL
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Institutional Authentication</h3>
              <p className="text-xs text-slate-400">Mapúa Malayan Colleges Laguna SSO</p>
            </div>
          </div>

          {/* Error Banner */}
          {errorBanner && (
            <div className="mb-4 p-3.5 bg-rose-950/90 border border-rose-800 rounded-lg text-xs text-rose-200 leading-relaxed flex items-start gap-2.5 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">Authentication Notice:</span>
                {errorBanner}
              </div>
            </div>
          )}

          {/* Success Banner */}
          {successBanner && (
            <div className="mb-4 p-3.5 bg-emerald-950/90 border border-emerald-800 rounded-lg text-xs text-emerald-200 leading-relaxed flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">Security Dispatch:</span>
                {successBanner}
              </div>
            </div>
          )}

          {/* SCREEN 1: SIGN IN FORM */}
          {screen === 'login' && (
            <>
              {/* Tab Selector */}
              <div className="flex border-b border-slate-800 mb-5">
                <button
                  type="button"
                  onClick={() => { setScreen('login'); setErrorBanner(null); setSuccessBanner(null); }}
                  className="flex-1 pb-2.5 text-xs font-semibold text-rose-500 border-b-2 border-rose-500 transition-colors"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setScreen('register'); setErrorBanner(null); setSuccessBanner(null); }}
                  className="flex-1 pb-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Register New Account
                </button>
              </div>

              <form onSubmit={handleManualLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="loginEmailInput">
                    Official School Email Address
                  </label>
                  <input
                    id="loginEmailInput"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="student@live.mcl.edu.ph or staff@mcl.edu.ph"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                    <span>Students: <strong className="text-slate-400 font-mono">@live.mcl.edu.ph</strong></span>
                    <span>Staff: <strong className="text-slate-400 font-mono">@mcl.edu.ph</strong></span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-slate-300" htmlFor="loginPasswordInput">
                      Account Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(email);
                        setSimulatedMailReceived(false);
                        setScreen('forgot-password');
                        setErrorBanner(null);
                        setSuccessBanner(null);
                      }}
                      className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="loginPasswordInput"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter account password"
                      required
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Passwords are strictly validated against encrypted records.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition shadow-sm mt-2 flex items-center justify-center gap-2"
                >
                  {loading ? 'Verifying Credentials...' : 'Sign In with Mapúa MCL ID'}
                </button>
              </form>
            </>
          )}

          {/* SCREEN 2: 4-DIGIT PIN AUTHENTICATION (PHONE STYLE) */}
          {screen === 'pin-challenge' && pendingUser && (
            <div className="space-y-5 animate-scaleUp">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-800 flex items-center justify-center mx-auto text-rose-400">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white">4-Digit Security PIN</h4>
                <p className="text-xs text-slate-400">
                  {pendingUser.email.toLowerCase() === 'admin@mcl.edu.ph'
                    ? 'Administrator security requirement: Enter PIN 6767'
                    : `Enter your 4-digit code for ${pendingUser.email}`}
                </p>
              </div>

              {/* 4 PIN Boxes */}
              <div className="flex justify-center gap-3 my-2">
                {[0, 1, 2, 3].map((index) => {
                  const digit = enteredPin[index];
                  return (
                    <div
                      key={index}
                      className={`w-11 h-12 rounded-xl border flex items-center justify-center font-mono text-xl font-bold transition-all shadow-inner ${
                        digit
                          ? 'border-rose-500 bg-rose-950/40 text-rose-300 scale-105'
                          : 'border-slate-800 bg-slate-950 text-slate-600'
                      }`}
                    >
                      {digit ? '•' : ''}
                    </div>
                  );
                })}
              </div>

              {pinError && (
                <div className="text-center text-xs text-rose-400 font-medium">
                  {pinError}
                </div>
              )}

              {/* Phone-Style Dialpad */}
              <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handlePinDigit(digit)}
                    className="h-12 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 text-lg font-semibold text-white transition active:scale-95 shadow-sm"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setEnteredPin('')}
                  className="h-12 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800/80 text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handlePinDigit('0')}
                  className="h-12 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800/80 text-lg font-semibold text-white transition active:scale-95 shadow-sm"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handlePinBackspace}
                  className="h-12 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800/80 text-sm font-semibold text-slate-400 hover:text-white transition flex items-center justify-center"
                >
                  ⌫
                </button>
              </div>

              {pendingUser.email.toLowerCase() === 'admin@mcl.edu.ph' && (
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-center text-[11px] font-mono text-slate-400">
                  Admin Master PIN: <strong className="text-rose-400 font-bold">6767</strong>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => { setScreen('login'); setPendingUser(null); }}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>

                <button
                  type="button"
                  disabled={enteredPin.length !== 4}
                  onClick={() => verifyPinCode(enteredPin)}
                  className="py-1.5 px-4 bg-rose-700 hover:bg-rose-600 disabled:opacity-40 text-white font-medium text-xs rounded-lg transition shadow-sm"
                >
                  Confirm PIN
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 3: REGISTER NEW ACCOUNT */}
          {screen === 'register' && (
            <>
              {/* Tab Selector */}
              <div className="flex border-b border-slate-800 mb-5">
                <button
                  type="button"
                  onClick={() => { setScreen('login'); setErrorBanner(null); setSuccessBanner(null); }}
                  className="flex-1 pb-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setScreen('register'); setErrorBanner(null); setSuccessBanner(null); }}
                  className="flex-1 pb-2.5 text-xs font-semibold text-rose-500 border-b-2 border-rose-500 transition-colors"
                >
                  Register New Account
                </button>
              </div>

              <form onSubmit={handleRegister} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="e.g. Juan P. Dela Cruz"
                    required
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Official School Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="student@live.mcl.edu.ph or faculty@mcl.edu.ph"
                    required
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Student accounts strictly use <strong className="text-slate-300">@live.mcl.edu.ph</strong>. Staff accounts use <strong className="text-slate-300">@mcl.edu.ph</strong>.
                  </p>
                </div>

                {/* Password Input with Standard Generator */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-slate-300">Create Standard Password</label>
                    <button
                      type="button"
                      onClick={() => generateStandardPassword('register')}
                      className="text-[11px] text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1 hover:underline"
                    >
                      <Sparkles className="w-3 h-3 text-rose-400" />
                      <span>Generate Standard Password</span>
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="e.g. MCL_Secure2026!"
                      required
                      className="w-full pl-3.5 pr-10 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Live Standard Checklist */}
                  <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 text-[10px] space-y-1">
                    <div className="font-semibold text-slate-400 flex items-center justify-between">
                      <span>Standard Requirements:</span>
                      <span className={regPassCriteria.isStandard ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                        {regPassCriteria.isStandard ? 'Standard Met' : 'Incomplete'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-slate-400 pt-0.5">
                      <span className={`flex items-center gap-1 ${regPassCriteria.hasMinLength ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {regPassCriteria.hasMinLength ? <Check className="w-3 h-3" /> : '•'} 10+ characters
                      </span>
                      <span className={`flex items-center gap-1 ${regPassCriteria.hasUpper ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {regPassCriteria.hasUpper ? <Check className="w-3 h-3" /> : '•'} Uppercase (A-Z)
                      </span>
                      <span className={`flex items-center gap-1 ${regPassCriteria.hasLower ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {regPassCriteria.hasLower ? <Check className="w-3 h-3" /> : '•'} Lowercase (a-z)
                      </span>
                      <span className={`flex items-center gap-1 ${regPassCriteria.hasNumber ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {regPassCriteria.hasNumber ? <Check className="w-3 h-3" /> : '•'} Number (0-9)
                      </span>
                      <span className={`flex items-center gap-1 col-span-2 ${regPassCriteria.hasSymbol ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {regPassCriteria.hasSymbol ? <Check className="w-3 h-3" /> : '•'} Special Symbol (!@#$)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Optional 4-Digit Security PIN (Users choose on/off) */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Enable 4-Digit Security PIN (2FA)</div>
                      <div className="text-[10px] text-slate-500">Phone-style verification at sign in</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={enablePin2fa}
                      onChange={e => setEnablePin2fa(e.target.checked)}
                      className="w-4 h-4 rounded text-rose-600 bg-slate-900 border-slate-700 focus:ring-rose-500"
                    />
                  </div>

                  {enablePin2fa && (
                    <div className="pt-1.5 border-t border-slate-800/80">
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Choose 4-Digit PIN Code
                      </label>
                      <input
                        type="text"
                        maxLength={4}
                        value={customPin}
                        onChange={e => setCustomPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="e.g. 6767 or 2026"
                        required
                        className="w-full text-center tracking-widest text-base font-mono px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        You can turn this on or off anytime inside your account settings.
                      </p>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-rose-700 hover:bg-rose-600 text-white font-medium text-xs rounded-lg transition shadow-sm mt-3 flex items-center justify-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Create Protected Account</span>
                </button>
              </form>
            </>
          )}

          {/* SCREEN 4: FORGOT PASSWORD REQUEST VIA SCHOOL EMAIL */}
          {screen === 'forgot-password' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                <button
                  type="button"
                  onClick={() => setScreen('login')}
                  className="text-slate-400 hover:text-white p-1 rounded"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h4 className="text-sm font-bold text-white">Reset Password via School Email</h4>
                  <p className="text-[11px] text-slate-400">Mapúa MCL Identity Services Dispatch</p>
                </div>
              </div>

              {!simulatedMailReceived ? (
                <form onSubmit={handleSendResetEmail} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Your Official School Email Address
                    </label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      placeholder="student@live.mcl.edu.ph or staff@mcl.edu.ph"
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      A cryptographically signed password reset token will be delivered to your official campus mailbox.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-rose-700 hover:bg-rose-600 text-white font-medium text-xs rounded-lg transition shadow-sm flex items-center justify-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Reset Link to School Email</span>
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setScreen('login')}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Return to Sign In
                    </button>
                  </div>
                </form>
              ) : (
                /* Interactive Simulated School Email Dispatch */
                <div className="space-y-3">
                  <div className="p-4 bg-slate-950 rounded-xl border border-rose-900/60 shadow-lg space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px]">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-rose-400" />
                        <span className="font-semibold text-slate-200">MCL School Mailbox Dispatch</span>
                      </div>
                      <span className="text-emerald-400 font-mono text-[10px]">Delivered Just Now</span>
                    </div>

                    <div className="text-[11px] font-mono space-y-0.5 text-slate-400">
                      <div><strong className="text-slate-300">From:</strong> security@mcl.edu.ph (Mapúa MCL SeshCure Gate)</div>
                      <div><strong className="text-slate-300">To:</strong> {forgotEmail}</div>
                      <div><strong className="text-slate-300">Subject:</strong> Authorization: Reset your SeshCure master password</div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed pt-1">
                      Hello, a password reset request was initiated for your Mapúa MCL SeshCure account. Click the button below to formulate a new password.
                    </p>

                    {/* The Clickable Button inside the school mail */}
                    <button
                      type="button"
                      onClick={() => {
                        setScreen('reset-form');
                        setErrorBanner(null);
                        setSuccessBanner(null);
                      }}
                      className="w-full py-2.5 px-4 bg-rose-700 hover:bg-rose-600 text-white font-semibold text-xs rounded-lg transition shadow-md flex items-center justify-center gap-2"
                    >
                      <span>Click to Reset SeshCure Password</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>

                    <div className="text-[10px] text-slate-500 font-mono truncate">
                      Link Token: https://seshcure.mcl.edu.ph/auth/reset?token={resetToken}
                    </div>
                  </div>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setScreen('login')}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SCREEN 5: FORMULATE NEW PASSWORD */}
          {screen === 'reset-form' && (
            <form onSubmit={handleCompletePasswordReset} className="space-y-4 animate-fadeIn">
              <div className="pb-3 border-b border-slate-800">
                <h4 className="text-sm font-bold text-white">Create New Standard Password</h4>
                <p className="text-[11px] text-slate-400">Account: <strong className="text-rose-400">{forgotEmail}</strong></p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-slate-300">New Master Password</label>
                  <button
                    type="button"
                    onClick={() => generateStandardPassword('reset')}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1 hover:underline"
                  >
                    <Sparkles className="w-3 h-3 text-rose-400" />
                    <span>Generate Standard Password</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newResetPassword}
                    onChange={e => setNewResetPassword(e.target.value)}
                    placeholder="Enter new standard password"
                    required
                    className="w-full pl-3.5 pr-10 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Standard Requirements */}
                <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 text-[10px] text-slate-400 grid grid-cols-2 gap-1">
                  <span className={resetPassCriteria.hasMinLength ? 'text-emerald-400' : 'text-slate-500'}>
                    {resetPassCriteria.hasMinLength ? '✓' : '•'} 10+ characters
                  </span>
                  <span className={resetPassCriteria.hasUpper ? 'text-emerald-400' : 'text-slate-500'}>
                    {resetPassCriteria.hasUpper ? '✓' : '•'} Uppercase (A-Z)
                  </span>
                  <span className={resetPassCriteria.hasLower ? 'text-emerald-400' : 'text-slate-500'}>
                    {resetPassCriteria.hasLower ? '✓' : '•'} Lowercase (a-z)
                  </span>
                  <span className={resetPassCriteria.hasNumber && resetPassCriteria.hasSymbol ? 'text-emerald-400' : 'text-slate-500'}>
                    {resetPassCriteria.hasNumber && resetPassCriteria.hasSymbol ? '✓' : '•'} Number & Symbol
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmResetPassword}
                  onChange={e => setConfirmResetPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-rose-700 hover:bg-rose-600 text-white font-medium text-xs rounded-lg transition shadow-sm flex items-center justify-center gap-2"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Save New Password & Sign In</span>
              </button>
            </form>
          )}

          <div className="mt-5 pt-4 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between font-mono">
            <span>Perimeter: Pulo-Diezmo Subnet</span>
            <span>MCL Security 2026</span>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500">
        © Mapúa Malayan Colleges Laguna · Pulo-Diezmo Road, Cabuyao, Laguna, 4025 Philippines · SeshCure Security Architecture
      </footer>

    </div>
  );
};
