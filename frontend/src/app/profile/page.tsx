'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useForm } from 'react-hook-form';
import { User, Shield, CreditCard, Key, Plus, AlertCircle } from 'lucide-react';

export default function ProfilePage() {
  const { apiFetch, user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const loadProfile = async () => {
    try {
      const res = await apiFetch('/api/auth/profile');
      setProfile(res.data);
    } catch (e) {
      console.error('Failed to load profile details', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const onPasswordSubmit = async (data: any) => {
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ password: data.new_password })
      });
      setSuccessMsg('Your security password has been updated successfully.');
      reset();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update password.');
    }
  };

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">User Profile</h1>
        <p className="text-slate-400 text-xs mt-1 font-semibold">Review identity credentials and banking info.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Profile Card & Info */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Identity details */}
          <div className="gov-card p-6 space-y-4">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-200 pb-3 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Service Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600">
              <div>
                <span className="text-slate-400 uppercase tracking-wider block mb-1 text-[10px]">Full Name</span>
                <span>{profile.full_name}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase tracking-wider block mb-1 text-[10px]">GPF/CPS Number</span>
                <span>{profile.employee_details?.gpf_cps_number || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase tracking-wider block mb-1 text-[10px]">Rank</span>
                <span>{profile.employee_details?.rank || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase tracking-wider block mb-1 text-[10px]">Designation</span>
                <span>{profile.employee_details?.designation || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Banking details */}
          <div className="gov-card p-6 space-y-4">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-200 pb-3 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Reimbursement Bank Routing
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600">
              <div>
                <span className="text-slate-400 uppercase tracking-wider block mb-1 text-[10px]">Bank Account Number</span>
                <span>{profile.employee_details?.bank_account_no || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase tracking-wider block mb-1 text-[10px]">IFSC Routing Code</span>
                <span>{profile.employee_details?.bank_ifsc || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Dependents list */}
          {user?.role === 'Employee' && (
            <div className="gov-card p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Family Dependents Registry
                </h3>
                <button 
                  onClick={() => alert('Dependent registration dialog')}
                  className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                >
                  <Plus className="w-4 h-4" /> Register Dependent
                </button>
              </div>

              <div className="space-y-3">
                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 flex justify-between items-center text-xs font-semibold">
                  <div>
                    <h5 className="font-bold text-slate-800">Kiran Sharma</h5>
                    <span className="text-slate-400">Spouse | DOB: 1994-08-12</span>
                  </div>
                  <span className="text-slate-400 font-medium">Aadhaar: 1234-5678-9012</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Change password panel */}
        <div className="gov-card p-6 space-y-4 bg-white">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-200 pb-3 flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            Security Center
          </h3>

          {successMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded border border-emerald-100">
              {successMsg}
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 text-rose-700 text-[10px] font-bold rounded border border-rose-100">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit(onPasswordSubmit)} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">New Password</label>
              <input 
                type="password" 
                placeholder="••••••••"
                {...register('new_password', { required: true, minLength: 6 })}
                className="gov-input py-2 text-xs font-semibold"
              />
              {errors.new_password && <p className="text-[9px] text-rose-500 mt-1 font-semibold">Minimum 6 characters required.</p>}
            </div>

            <button 
              type="submit"
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 rounded-lg text-xs transition-colors shadow-sm"
            >
              Update Password
            </button>
          </form>
        </div>

      </div>
    </div>
  );

}
