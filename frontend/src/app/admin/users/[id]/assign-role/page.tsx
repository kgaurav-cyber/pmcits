'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../../../context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck, ChevronRight, Loader2, AlertCircle, CheckCircle2,
  Users, FileText, Briefcase, CreditCard, Eye, Settings, Crown
} from 'lucide-react';

const ROLES = [
  {
    id: 'Employee',
    label: 'Employee',
    description: 'Standard police personnel. Can submit and track own medical claims.',
    icon: Users,
    color: 'bg-slate-100 border-slate-300 text-slate-700',
    activeColor: 'bg-slate-600 border-slate-600 text-white',
    permissions: ['Submit claims', 'View own claims', 'Upload documents', 'View profile']
  },
  {
    id: 'Medical Officer',
    label: 'Medical Officer',
    description: 'Reviews and verifies medical claims for compliance and accuracy.',
    icon: FileText,
    color: 'bg-teal-50 border-teal-200 text-teal-700',
    activeColor: 'bg-teal-600 border-teal-600 text-white',
    permissions: ['Review claims', 'Approve/reject medical review', 'View all claims', 'Add medical notes']
  },
  {
    id: 'Accounts Officer',
    label: 'Accounts Officer',
    description: 'Audits financial details of claims and verifies billing amounts.',
    icon: CreditCard,
    color: 'bg-amber-50 border-amber-200 text-amber-700',
    activeColor: 'bg-amber-600 border-amber-600 text-white',
    permissions: ['Audit claims', 'Verify CGHS rates', 'Financial review', 'Generate reports']
  },
  {
    id: 'DDO',
    label: 'DDO (Drawing & Disbursing Officer)',
    description: 'Final sanctioning authority for approved claims.',
    icon: Briefcase,
    color: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    activeColor: 'bg-indigo-600 border-indigo-600 text-white',
    permissions: ['Sanction claims', 'View all claims', 'Generate reports', 'Override decisions']
  },
  {
    id: 'Treasury',
    label: 'Treasury',
    description: 'Processes payments for sanctioned claims.',
    icon: CreditCard,
    color: 'bg-purple-50 border-purple-200 text-purple-700',
    activeColor: 'bg-purple-600 border-purple-600 text-white',
    permissions: ['Process payments', 'View sanctioned claims', 'Generate payment reports', 'Mark claims paid']
  },
  {
    id: 'Administrator',
    label: 'Administrator',
    description: 'Full system access including user management and configuration.',
    icon: Crown,
    color: 'bg-red-50 border-red-200 text-red-700',
    activeColor: 'bg-red-600 border-red-600 text-white',
    permissions: ['Full system access', 'User management', 'System configuration', 'All reports', 'Audit logs']
  },
];

export default function AssignRolePage() {
  const { apiFetch, user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [originalRole, setOriginalRole] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!userId || !user) return;
    (async () => {
      try {
        const res = await apiFetch(`/api/users/${userId}`);
        setEmployee(res.data);
        setSelectedRole(res.data.role);
        setOriginalRole(res.data.role);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [userId, user]);

  if (!user || user.role !== 'Administrator') {
    return <div className="flex flex-col items-center justify-center min-h-96"><AlertCircle className="w-12 h-12 text-red-400" /><p className="mt-2 text-slate-500">Access Restricted</p></div>;
  }

  if (loading) return <div className="flex items-center justify-center min-h-96"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;

  const handleSave = async () => {
    if (selectedRole === originalRole) {
      alert('No change detected. Select a different role.');
      return;
    }
    if (!confirm(`Change role for ${employee?.full_name} from "${originalRole}" to "${selectedRole}"?`)) return;

    setSaving(true);
    try {
      await apiFetch(`/api/users/${userId}/assign-role`, { method: 'POST', body: JSON.stringify({ role: selectedRole }) });
      setSuccess(true);
      setTimeout(() => router.push(`/admin/users/${userId}`), 2000);
    } catch (err: any) {
      alert(err.message || 'Failed to assign role.');
    } finally {
      setSaving(false);
    }
  };

  const hasChanged = selectedRole !== originalRole;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
        <Link href="/admin/users" className="hover:text-blue-600 transition-colors">User Management</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href={`/admin/users/${userId}`} className="hover:text-blue-600 transition-colors">{employee?.full_name}</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-700">Assign Role</span>
      </nav>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-800">Role Assignment</h1>
          <p className="text-xs text-slate-400 font-medium">
            Assign system role for {employee?.full_name} · Current: <span className="text-slate-600 font-bold">{originalRole}</span>
          </p>
        </div>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-sm font-bold text-emerald-800">Role updated successfully to "{selectedRole}". Redirecting...</p>
        </div>
      )}

      {/* Role Cards */}
      <div className="space-y-3">
        {ROLES.map(role => {
          const Icon = role.icon;
          const isSelected = selectedRole === role.id;
          const isCurrent = originalRole === role.id;

          return (
            <button
              key={role.id}
              type="button"
              onClick={() => setSelectedRole(role.id)}
              className={`w-full text-left rounded-2xl border-2 p-5 transition-all ${
                isSelected ? role.activeColor + ' shadow-lg scale-[1.01]' : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isSelected ? 'bg-white/20' : role.color.split(' ')[0]
                }`}>
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : ''}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-black ${isSelected ? 'text-white' : 'text-slate-800'}`}>{role.label}</p>
                    {isCurrent && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
                      }`}>Current Role</span>
                    )}
                    {isSelected && !isCurrent && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">Selected</span>
                    )}
                  </div>
                  <p className={`text-xs mt-1 ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>{role.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {role.permissions.map(perm => (
                      <span key={perm} className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                        isSelected ? 'bg-white/15 text-white/90' : 'bg-slate-100 text-slate-500'
                      }`}>{perm}</span>
                    ))}
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                  isSelected ? 'border-white bg-white' : 'border-slate-300'
                }`}>
                  {isSelected && <div className={`w-2.5 h-2.5 rounded-full ${role.activeColor.split(' ')[0]}`} />}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-2">
        <Link href={`/admin/users/${userId}`}
          className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-bold transition-all">
          Cancel
        </Link>
        <button onClick={handleSave} disabled={saving || !hasChanged || success}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${
            hasChanged && !success ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}>
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><ShieldCheck className="w-4 h-4" /> Assign Role</>}
        </button>
      </div>
    </div>
  );
}
