import { useState, useEffect } from 'react';
import { PlayerType, RegisteredPlayer } from '../types';
import { playerAPI } from '../services/api';
import { User, Lock, CheckCircle, AlertCircle, Search, LogIn, UserPlus, Eye, EyeOff } from 'lucide-react';
import StadiumAssemblyLoader from '../components/StadiumAssemblyLoader';

interface AuthenticationProps {
  onSuccess: (player: RegisteredPlayer, rememberMe?: boolean) => void;
}

export default function Authentication({ onSuccess }: AuthenticationProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Loader state for stadium assembly animation on login/register success
  const [authPending, setAuthPending] = useState<{
    player: RegisteredPlayer;
    rememberMe: boolean;
    mode: 'login' | 'register';
  } | null>(null);

  // Toast state for short-lived error/notification messages
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Register form state
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regPlayerType, setRegPlayerType] = useState<PlayerType>('Batter');
  const [isRegistering, setIsRegistering] = useState(false);

  // Username availability check state
  const [usernameCheckStatus, setUsernameCheckStatus] = useState<{
    checked: boolean;
    available: boolean;
    message: string;
  } | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  // Search/Check username availability handler
  const handleCheckUsername = async () => {
    const trimmed = regUsername.trim();
    if (!trimmed) {
      showToast('Please enter a username to search.');
      setUsernameCheckStatus({
        checked: true,
        available: false,
        message: 'Please enter a username to check.',
      });
      return;
    }

    setIsCheckingUsername(true);
    try {
      const res = await playerAPI.checkUsername(trimmed);
      const available = res.data?.available ?? (res as any).available;
      const message = res.data?.message ?? (res as any).message;

      if (res.success && available !== undefined) {
        setUsernameCheckStatus({
          checked: true,
          available: !!available,
          message: message || (available ? `Username '${trimmed}' is available!` : `Username '${trimmed}' is already taken.`),
        });
        if (!available) {
          showToast(message || `Username '${trimmed}' is already taken.`);
        }
      } else {
        const errorMsg = res.error || 'Failed to check username.';
        setUsernameCheckStatus({
          checked: true,
          available: false,
          message: errorMsg,
        });
        showToast(errorMsg);
      }
    } catch {
      const err = 'Error checking username availability.';
      setUsernameCheckStatus({
        checked: true,
        available: false,
        message: err,
      });
      showToast(err);
    } finally {
      setIsCheckingUsername(false);
    }
  };

  // Load remembered credentials on mount if available
  useEffect(() => {
    try {
      const savedCreds = localStorage.getItem('score_master_remembered_credentials');
      if (savedCreds) {
        const { username, password } = JSON.parse(savedCreds);
        if (username) setLoginUsername(username);
        if (password) setLoginPassword(password);
        setRememberMe(true);
      }
    } catch (err) {
      console.error('Failed to load remembered credentials:', err);
    }
  }, []);

  // Login submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!loginUsername.trim() || !loginPassword) {
      showToast('Please enter both username and password.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await playerAPI.login({
        username: loginUsername.trim(),
        password: loginPassword,
      });

      if (res.success && res.data) {
        if (rememberMe) {
          localStorage.setItem('score_master_remembered_credentials', JSON.stringify({
            username: loginUsername.trim(),
            password: loginPassword,
          }));
        } else {
          localStorage.removeItem('score_master_remembered_credentials');
        }
        setAuthPending({
          player: res.data,
          rememberMe,
          mode: 'login',
        });
      } else {
        showToast(res.error || 'Invalid username or password.');
      }
    } catch {
      showToast('Server error during login. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Registration submission
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanUsername = regUsername.trim();
    if (!cleanUsername) {
      showToast('Username is required.');
      return;
    }
    if (!regPassword) {
      showToast('Password is required.');
      return;
    }
    if (!regFirstName.trim() || !regLastName.trim()) {
      showToast('First name and last name are required.');
      return;
    }

    if (usernameCheckStatus && usernameCheckStatus.checked && !usernameCheckStatus.available) {
      showToast('The chosen username is already taken. Please pick another one.');
      return;
    }

    setIsRegistering(true);
    try {
      const res = await playerAPI.register({
        username: cleanUsername,
        password: regPassword,
        firstName: regFirstName.trim(),
        lastName: regLastName.trim(),
        playerType: regPlayerType,
      });

      if (res.success && res.data) {
        if (rememberMe) {
          localStorage.setItem('score_master_remembered_credentials', JSON.stringify({
            username: cleanUsername,
            password: regPassword,
          }));
        } else {
          localStorage.removeItem('score_master_remembered_credentials');
        }
        setAuthPending({
          player: res.data,
          rememberMe,
          mode: 'register',
        });
      } else {
        showToast(res.error || 'Registration failed.');
      }
    } catch {
      showToast('Failed to register player. Please check your network connection.');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <>
      {authPending && (
        <StadiumAssemblyLoader
          mode={authPending.mode}
          playerName={`${authPending.player.firstName} ${authPending.player.lastName}`}
          onComplete={() => {
            onSuccess(authPending.player, authPending.rememberMe);
          }}
        />
      )}

      <div className="min-h-screen bg-linear-to-b from-slate-950 via-blue-950 to-slate-950 text-white flex flex-col justify-start pt-10 sm:pt-14 p-4 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute -top-24 -left-24 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-28 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Short-lived Toast for Errors */}
      {toastMessage && (
        <div className="fixed top-4 left-4 right-4 max-w-sm mx-auto z-50 animate-bounce">
          <div className="flex items-center gap-2.5 px-4 py-3 bg-red-600/95 backdrop-blur-md text-white rounded-xl shadow-xl text-xs font-semibold border border-red-500/50">
            <AlertCircle size={18} className="shrink-0" />
            <span className="flex-1">{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-white/80 hover:text-white text-sm font-bold pl-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Switchable Auth Tabs with Login as primary */}
      <div className="max-w-md w-full mx-auto bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden z-10">
        <div className="flex border-b border-white/10 bg-white/5">
          <button
            type="button"
            onClick={() => setActiveTab('login')}
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'login'
                ? 'border-blue-400 text-blue-300 bg-blue-500/15'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn size={18} />
            <span>Login</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('register')}
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'register'
                ? 'border-blue-400 text-blue-300 bg-blue-500/15'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus size={18} />
            <span>Register</span>
          </button>
        </div>

        <div className="p-6">
          {/* ═══════════ LOGIN TAB ═══════════ */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-2 font-black text-white text-xl shadow-lg shadow-blue-500/20 border border-white/20">
                  🏏
                </div>
                <h2 className="text-xl font-black text-white tracking-tight">Player Login</h2>
                <p className="text-xs text-slate-400 mt-1">Sign in with your username and password</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wide block mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={e => setLoginUsername(e.target.value)}
                    placeholder="Enter username"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/60 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wide block mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-900/60 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(prev => !prev)}
                    className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    title={showLoginPassword ? 'Hide password' : 'Show password'}
                  >
                    {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Remember Me Toggle Switch */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-semibold text-slate-300">Remember Me</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={rememberMe}
                  onClick={() => setRememberMe(!rememberMe)}
                  className={`inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                    rememberMe ? 'bg-blue-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      rememberMe ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3.5 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-900/40 border border-blue-400/40 disabled:opacity-50 transition-all cursor-pointer mt-2"
              >
                {isLoggingIn ? 'Logging in...' : 'Sign In'}
              </button>

              <div className="text-center pt-2">
                <span className="text-xs text-slate-400">Need an account? </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  className="text-xs text-blue-400 font-bold hover:underline cursor-pointer"
                >
                  Register here
                </button>
              </div>
            </form>
          )}

          {/* ═══════════ REGISTER TAB ═══════════ */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="text-center mb-4">
                <h2 className="text-xl font-black text-white tracking-tight">Create Player Profile</h2>
                <p className="text-xs text-slate-400 mt-1">Register to record your cricket statistics</p>
              </div>

              {/* Username Search / Check Row */}
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wide block mb-1.5">
                  Username Handle
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <User size={18} className="absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={regUsername}
                      onChange={e => {
                        setRegUsername(e.target.value);
                        setUsernameCheckStatus(null);
                      }}
                      placeholder="Choose username"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/60 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCheckUsername}
                    disabled={isCheckingUsername || !regUsername.trim()}
                    className="px-3 py-2.5 bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all disabled:opacity-50 cursor-pointer"
                    title="Check availability"
                  >
                    <Search size={14} />
                    <span>{isCheckingUsername ? 'Checking...' : 'Check'}</span>
                  </button>
                </div>

                {usernameCheckStatus && (
                  <div
                    className={`mt-2 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border ${
                      usernameCheckStatus.available
                        ? 'bg-green-500/10 text-green-300 border-green-500/30'
                        : 'bg-red-500/10 text-red-300 border-red-500/30'
                    }`}
                  >
                    {usernameCheckStatus.available ? (
                      <CheckCircle size={14} className="shrink-0" />
                    ) : (
                      <AlertCircle size={14} className="shrink-0" />
                    )}
                    <span>{usernameCheckStatus.message}</span>
                  </div>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wide block mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    placeholder="Create password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-900/60 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(prev => !prev)}
                    className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    title={showRegPassword ? 'Hide password' : 'Show password'}
                  >
                    {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* First Name & Last Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wide block mb-1.5">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={regFirstName}
                    onChange={e => setRegFirstName(e.target.value)}
                    placeholder="e.g. Rohit"
                    className="w-full px-3.5 py-2.5 bg-slate-900/60 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wide block mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={regLastName}
                    onChange={e => setRegLastName(e.target.value)}
                    placeholder="e.g. Sharma"
                    className="w-full px-3.5 py-2.5 bg-slate-900/60 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    required
                  />
                </div>
              </div>

              {/* Player Type Dropdown */}
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wide block mb-1.5">
                  Player Type
                </label>
                <select
                  value={regPlayerType}
                  onChange={e => setRegPlayerType(e.target.value as PlayerType)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer"
                >
                  <option value="Batter">🏏 Batter</option>
                  <option value="Bowler">🎯 Bowler</option>
                  <option value="All-Rounder">⚡ All-Rounder</option>
                </select>
              </div>

              {/* Submit Registration */}
              <button
                type="submit"
                disabled={isRegistering}
                className="w-full py-3.5 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-900/40 border border-blue-400/40 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isRegistering ? 'Registering...' : 'Complete Registration'}
              </button>

              <div className="text-center pt-1">
                <span className="text-xs text-slate-400">Already registered? </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className="text-xs text-blue-400 font-bold hover:underline cursor-pointer"
                >
                  Login here
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
