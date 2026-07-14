'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useForm } from 'react-hook-form';
import { Lock, Mail, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const { login, user } = useAuth();
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const onSubmit = async (formData: any) => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await login(formData);
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row">
      
      {/* Left Side: Premium Illustration & Official Identity (Hidden on Mobile for responsiveness) */}
      <div className="hidden md:flex md:w-1/2 bg-white border-r border-slate-200 p-12 flex-col justify-between items-start self-stretch">
        
        {/* Header / Logo */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 flex items-center justify-center">
            <img src="/uppolice.png" alt="UP Police Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="text-[10px] text-primary font-bold uppercase tracking-widest block">UTTAR PRADESH POLICE</span>
            <h1 className="text-base font-extrabold text-slate-800 tracking-tight leading-none">POLICE MEDICAL CLAIMS</h1>
          </div>
        </div>

        {/* Central Illustration Area */}
        <div className="w-full max-w-sm my-8 space-y-6">
          <div className="relative flex justify-center py-6">
            <svg viewBox="0 0 200 200" className="w-48 h-48 text-primary" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="100" cy="100" r="80" className="stroke-slate-100" strokeWidth="2" />
              <circle cx="100" cy="100" r="60" className="stroke-slate-50" strokeWidth="2" />
              <circle cx="50" cy="50" r="8" className="fill-accent/20" />
              <circle cx="160" cy="150" r="12" className="fill-primary/10" />
              <path d="M100 60L135 75V110C135 135 100 155 100 155C100 155 65 135 65 110V75L100 60Z" className="fill-primary/5 stroke-primary" strokeWidth="3" />
              <path d="M85 108L95 118L115 95" className="stroke-primary" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-black text-slate-800 tracking-tight leading-snug">
              Police Medical Claims Intelligence & Transparency System (PMCITS)
            </h2>
            <p className="text-slate-400 text-xs leading-relaxed font-semibold">
              Reimbursement workflows audit portal. Processes doctor consultations, diagnostic invoices, and IPD hospital admissions through automatic compliance verification.
            </p>
          </div>
        </div>

        {/* Security Alert Notice */}
        <div className="w-full bg-[#F8FAFC] border border-slate-200 p-4 rounded-xl space-y-2 text-[11px] leading-relaxed font-semibold text-slate-500">
          <div className="flex items-center gap-2 text-primary font-bold">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Authorized Operations Only</span>
          </div>
          <p>Access events, modifications, and routing transitions are cryptographically logged to the central database logs.</p>
        </div>
      </div>

      {/* Right Side: Center Login Card */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 w-full">
        
        {/* Mobile Header (Visible only on mobile) */}
        <div className="flex md:hidden items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-md">
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-slate-800 tracking-tight leading-none">POLICE MEDICAL CLAIMS</h1>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block mt-1">State Department Force</span>
          </div>
        </div>

        {/* shadcn/ui Card centering container */}
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm overflow-hidden">
          
          <div className="flex flex-col space-y-1.5 p-8 border-b border-slate-100">
            <h2 className="text-xl font-black text-slate-800">Officer Credentials</h2>
            <p className="text-slate-400 text-xs font-semibold">Enter credentials to open your dashboard queue.</p>
          </div>

          <div className="p-8 space-y-5">
            {errorMsg && (
              <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-lg flex items-start gap-3 font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Employee ID or Official Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input 
                    type="text" 
                    placeholder="EMP-XXXX or name@police.gov.in"
                    {...register('email', { required: 'Employee ID or email is required' })}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-slate-300"
                  />
                </div>
                {errors.email && <p className="text-[10px] text-rose-500 mt-1">{errors.email.message as string}</p>}
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Password</label>
                  <a 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); alert('Please contact system administrator to initiate password reset.'); }}
                    className="text-[10px] text-primary hover:underline font-bold"
                  >
                    Forgot Password?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    {...register('password', { required: 'Password is required' })}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-slate-300"
                  />
                </div>
                {errors.password && <p className="text-[10px] text-rose-500 mt-1">{errors.password.message as string}</p>}
              </div>

              {/* Remember Me Option */}
              <div className="flex items-center">
                <input 
                  id="remember_me"
                  type="checkbox" 
                  className="w-4 h-4 rounded border-slate-200 text-primary focus:ring-primary/10 cursor-pointer"
                />
                <label htmlFor="remember_me" className="ml-2 text-xs font-bold text-slate-500 select-none cursor-pointer">
                  Keep me signed in on this computer
                </label>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 px-4 rounded-lg text-xs transition-all shadow-sm flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Secure Log In'
                )}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
