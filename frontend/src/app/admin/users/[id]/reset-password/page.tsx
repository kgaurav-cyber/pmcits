'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../../../context/AuthContext';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Lock, ChevronRight, Loader2, AlertCircle, CheckCircle2,
  Eye, EyeOff, RefreshCw, Copy, ShieldAlert
} from 'lucide-react';

export default function ResetPasswordPage() {
  const { apiFetch, user } = useAuth();
  const params = useParams();
  const userId = params.id as string;

  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'auto' | 'custom'>('auto');
  const [customPassword, setCustomPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [result, setResult] = useState<{ password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!userId || !user) return;
    (async () => {
      try {
        const res = await apiFetch(`/api/users/${userId}`);
        setEmployee(res.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [userId, user]);

  if (!user || user.role !== 'Administrator') {
    return <div className="flex flex-col items-center justify-center min-h-96"><AlertCircle className="w-12 h-12 text-red-400" /><p className="mt-2 text-slate-500">Access Restricted</p></div>;
  }

  if (loading) return <div className="flex items-center justify-center min-h-96"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;

  const passwordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    const labels = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
    const colors = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-emerald-500'];
    return { score, label: labels[score] || 'Very Weak', color: colors[score] || 'bg-red-500' };
  };

  const strength = passwordStrength(customPassword);

  const handleReset = async () => {
    if (mode === 'custom' && customPassword.length < 8) {
      alert('Password must be at least 8 characters.');
      return;
    }
    if (!confirm(`Reset password for ${employee?.full_name}? They will be required to change it on next login.`)) return;

    setResetting(true);
    try {
      const body: any = {};
      if (mode === 'custom') body.custom_password = customPassword;
      const res = await apiFetch(`/api/users/${userId}/reset-password`, { method: 'POST', body: JSON.stringify(body) });
      setResult({ password: res.data.temp_password });
    } catch (err: any) {
      alert(err.message || 'Failed to reset password.');
    } finally {
      setResetting(false);
    }
  };

  const copyToClipboard = () => {
    if (result) navigator.clipboard.writeText(result.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
        <Link href="/admin/users" className="hover:text-blue-600 transition-colors">User Management</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href={`/admin/users/${userId}`} className="hover:text-blue-600 transition-colors">{employee?.full_name}</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-700">Reset Password</span>
      </nav>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-sm">
          <Lock className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-800">Reset Password</h1>
          <p className="text-xs text-slate-400 font-medium">For: {employee?.full_name} ({employee?.email})</p>
        </div>
      </div>

      {!result ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 space-y-6">
            {/* Warning */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-800">Security Notice</p>
                <p className="text-xs text-amber-700 mt-1">Resetting the password will immediately lock the account until the employee changes it on first login. Ensure you deliver the temporary password securely.</p>
              </div>
            </div>

            {/* Mode selector */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password Reset Mode</p>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setMode('auto')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${mode === 'auto' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <RefreshCw className={`w-5 h-5 mb-2 ${mode === 'auto' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <p className={`text-xs font-bold ${mode === 'auto' ? 'text-blue-800' : 'text-slate-700'}`}>Auto-Generate</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">System creates a secure random password</p>
                </button>
                <button type="button" onClick={() => setMode('custom')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${mode === 'custom' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <Lock className={`w-5 h-5 mb-2 ${mode === 'custom' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <p className={`text-xs font-bold ${mode === 'custom' ? 'text-blue-800' : 'text-slate-700'}`}>Set Custom</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Specify the initial password manually</p>
                </button>
              </div>
            </div>

            {/* Custom password input */}
            {mode === 'custom' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={customPassword}
                      onChange={e => setCustomPassword(e.target.value)}
                      placeholder="Min 8 characters, mix of letters, numbers & symbols"
                      className="w-full px-3 py-2.5 pr-10 rounded-lg border border-slate-200 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {customPassword && (
                  <div className="space-y-1.5">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= strength.score ? strength.color : 'bg-slate-100'}`} />
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500 font-semibold">{strength.label}</p>
                  </div>
                )}
                <ul className="space-y-1 text-[11px] text-slate-500 font-medium">
                  {['At least 8 characters', 'Contains uppercase letter', 'Contains number', 'Contains special character'].map((req, i) => {
                    const checks = [
                      customPassword.length >= 8,
                      /[A-Z]/.test(customPassword),
                      /[0-9]/.test(customPassword),
                      /[^A-Za-z0-9]/.test(customPassword)
                    ];
                    return (
                      <li key={req} className={`flex items-center gap-1.5 ${checks[i] ? 'text-emerald-600' : 'text-slate-400'}`}>
                        <CheckCircle2 className={`w-3 h-3 ${checks[i] ? 'text-emerald-500' : 'text-slate-200'}`} /> {req}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between">
            <Link href={`/admin/users/${userId}`}
              className="px-5 py-2.5 border border-slate-200 hover:bg-white text-slate-600 rounded-xl text-xs font-bold transition-all">
              Cancel
            </Link>
            <button onClick={handleReset} disabled={resetting || (mode === 'custom' && customPassword.length < 8)}
              className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm">
              {resetting ? <><Loader2 className="w-4 h-4 animate-spin" /> Resetting...</> : <><Lock className="w-4 h-4" /> Reset Password</>}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center space-y-5">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">Password Reset Successfully</h2>
            <p className="text-sm text-slate-500 mt-1">The account will require password change on next login.</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-left space-y-3">
            <p className="text-xs font-bold text-amber-800 flex items-center gap-2"><Lock className="w-3.5 h-3.5" /> Temporary Password</p>
            <div className="flex items-center gap-3">
              <code className="flex-1 bg-white border border-amber-200 rounded-lg px-4 py-2.5 font-mono text-sm font-bold text-amber-700 select-all">{result.password}</code>
              <button onClick={copyToClipboard}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-xs font-bold transition-all ${copied ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {copied ? <><CheckCircle2 className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
              </button>
            </div>
            <p className="text-[11px] text-amber-700">⚠️ This password will not be shown again. Copy and share it securely with the employee.</p>
          </div>
          <div className="flex gap-3 justify-center">
            <Link href={`/admin/users/${userId}`}
              className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-bold transition-all">
              View Profile
            </Link>
            <Link href="/admin/users"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all">
              Back to List
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
