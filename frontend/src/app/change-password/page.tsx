'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useForm } from 'react-hook-form';
import { Lock, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function ForceChangePasswordPage() {
  const { apiFetch } = useAuth();
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const newPassword = watch('password');

  const onSubmit = async (formData: any) => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ 
          password: formData.password,
          currentPassword: formData.currentPassword
        })
      });

      // Clear local storage flag
      const savedUser = JSON.parse(localStorage.getItem('pmcits_user') || '{}');
      savedUser.first_login_required = false;
      localStorage.setItem('pmcits_user', JSON.stringify(savedUser));

      setSuccessMsg('Your security password has been changed successfully. Forwarding to dashboard...');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update password. Try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        
        <div className="flex flex-col space-y-1.5 p-8 border-b border-slate-100">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold mb-2">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-black text-slate-800">Password Update Required</h2>
          <p className="text-slate-400 text-xs font-semibold">Your administrator marked this account as "First Login Required". You must change your temporary password to secure the account before opening the portal.</p>
        </div>

        <div className="p-8 space-y-5">
          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-lg flex items-start gap-3 font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-750 text-xs rounded-lg flex items-start gap-3 font-semibold animate-pulse">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input 
                  type="password" 
                  placeholder="Enter current temporary password"
                  {...register('currentPassword', { required: 'Current password is required' })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-slate-300"
                />
              </div>
              {errors.currentPassword && <p className="text-[10px] text-rose-500 mt-1">{errors.currentPassword.message as string}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input 
                  type="password" 
                  placeholder="Enter secure password"
                  {...register('password', { 
                    required: 'New password is required', 
                    minLength: { value: 6, message: 'Password must be at least 6 characters long' } 
                  })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-slate-300"
                />
              </div>
              {errors.password && <p className="text-[10px] text-rose-500 mt-1">{errors.password.message as string}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Confirm Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input 
                  type="password" 
                  placeholder="Re-type new password"
                  {...register('confirmPassword', { 
                    required: 'Confirm password is required',
                    validate: value => value === newPassword || 'Passwords do not match'
                  })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-slate-300"
                />
              </div>
              {errors.confirmPassword && <p className="text-[10px] text-rose-500 mt-1">{errors.confirmPassword.message as string}</p>}
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 px-4 rounded-lg text-xs transition-all shadow-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Secure Password & Enter'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
