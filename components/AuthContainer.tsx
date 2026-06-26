'use client';

import React, { useState } from 'react';
import { KeyRound, ShieldAlert, Sparkles, User, Mail, Phone, ArrowRight, CheckCircle, Lock } from 'lucide-react';
import { authApi, Profile, isSupabaseConfigured } from '@/lib/storage';

interface AuthContainerProps {
  onLoginSuccess: (profile: Profile) => void;
}

export default function AuthContainer({ onLoginSuccess }: AuthContainerProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('email') || params.get('signup') === 'true' ? 'signup' : 'login';
    }
    return 'login';
  });
  const [role, setRole] = useState<'admin' | 'driver'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('email') ? 'driver' : 'admin';
    }
    return 'admin';
  });
  const [email, setEmail] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('email') || '';
    }
    return '';
  });
  const [password, setPassword] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email) {
      setError('Please enter a valid email address.');
      return;
    }

    if (isSupabaseConfigured && !password) {
      setError('Password is required when Supabase is connected.');
      return;
    }

    try {
      const profile = await authApi.login(email, password, role);
      onLoginSuccess(profile);
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !name || !phone) {
      setError('Please fill in all details.');
      return;
    }

    if (isSupabaseConfigured && !signupPassword) {
      setError('Password is required for registration when Supabase is connected.');
      return;
    }

    try {
      const profile = await authApi.signUpWithInvite(email, name, phone, signupPassword);
      setSuccess('Registration successful! Access granted.');
      setTimeout(() => {
        onLoginSuccess(profile);
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Signup failed.');
    }
  };

  // Preset accounts for swift testing in iFrame preview
  const handleAutofill = (selectedEmail: string, selectedRole: 'admin' | 'driver') => {
    setEmail(selectedEmail);
    setRole(selectedRole);
    if (!isSupabaseConfigured) {
      setPassword('demo-mode-password');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background visual accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="text-center mb-8 z-10">
        <span className="text-[10px] uppercase font-extrabold tracking-widest text-teal-400 bg-teal-950/80 px-3 py-1 rounded-full border border-teal-800">
          🔒 Professional Fleet System
        </span>
        <h1 className="text-4xl font-extrabold text-white tracking-tight mt-3">
          INYATHI
        </h1>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          High-performance fleet logistics, cost reconciliations, and pre-trip driver compliance.
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="bg-slate-800/80 border border-slate-700/60 backdrop-blur-md w-full max-w-md rounded-2xl shadow-2xl p-6 z-10">
        
        {/* Tab Selection */}
        <div className="flex bg-slate-950/60 p-1.5 rounded-lg mb-6 border border-slate-800">
          <button
            type="button"
            onClick={() => { setActiveTab('login'); setError(''); }}
            className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${
              activeTab === 'login'
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In to Portal
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('signup'); setError(''); }}
            className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${
              activeTab === 'signup'
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Register Invite
          </button>
        </div>

        {activeTab === 'login' ? (
          /* Sign In Form */
          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* Email Field */}
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                Portal Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="e.g. name@inyathi.co.za"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-teal-500 placeholder-slate-600 transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                Portal Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={isSupabaseConfigured}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-teal-500 placeholder-slate-600 transition-colors"
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {isSupabaseConfigured 
                  ? 'Required: Authenticates securely via your Supabase DB.' 
                  : 'Enter password to authenticate.'}
              </span>
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-xs text-rose-300 font-medium">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-md flex items-center justify-center gap-1"
            >
              Enter Portal Access
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* Sign Up (Invite Invite Check) */
          <form onSubmit={handleSignUp} className="space-y-4">
            
            <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-700/30">
              💡 Driver sign-up is <strong className="text-teal-400">invite-only</strong>. To test, use the email <strong className="text-white">invitee@inyathi.co.za</strong>, which is pre-seeded in the system invite table.
            </p>

            {/* Name */}
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                Full Legal Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl py-2 pl-4 pr-4 text-xs text-white focus:outline-none focus:border-teal-500 placeholder-slate-600 transition-colors"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                Mobile Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="+27 82 000 0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-teal-500 placeholder-slate-600 transition-colors"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                Invited Email Address
              </label>
              <input
                type="email"
                required
                placeholder="invitee@inyathi.co.za"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl py-2 pl-4 pr-4 text-xs text-white focus:outline-none focus:border-teal-500 placeholder-slate-600 transition-colors"
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                Register Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  required={isSupabaseConfigured}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-teal-500 placeholder-slate-600 transition-colors"
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {isSupabaseConfigured 
                  ? 'Required: Sets your password in the Supabase user database.' 
                  : 'Optional in Offline sandbox mode.'}
              </span>
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-xs text-rose-300 font-medium">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs text-emerald-300 font-medium animate-pulse">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-md flex items-center justify-center gap-1"
            >
              Complete Registration & Enter
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
