'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User, Briefcase, CreditCard, ShieldCheck, ChevronRight, Edit3,
  Lock, Ban, UserCheck, AlertCircle, Loader2, Phone, Mail,
  Building2, Calendar, Hash, Clock, RefreshCw, CheckCircle2, XCircle
} from 'lucide-react';

const roleBadge = (role: string) => {
  const map: Record<string, string> = {
    'Administrator': 'bg-red-50 text-red-700 border-red-200',
    'DDO': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'Medical Officer': 'bg-teal-50 text-teal-700 border-teal-200',
    'Accounts Officer': 'bg-amber-50 text-amber-700 border-amber-200',
    'Treasury': 'bg-purple-50 text-purple-700 border-purple-200',
    'Employee': 'bg-slate-50 text-slate-600 border-slate-200',
  };
  return map[role] || 'bg-slate-50 text-slate-600 border-slate-200';
};

const Field = ({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: any }) => (
  <div className="space-y-1">
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</p>
    <div className="flex items-center gap-1.5">
      {Icon && <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
      <p className="text-sm font-semibold text-slate-800">{value || <span className="text-slate-300">—</span>}</p>
    </div>
  </div>
);

export default function ViewEmployeePage() {
  const { apiFetch, user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchEmployee = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/users/${userId}`);
      setEmployee(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await apiFetch(`/api/users/audit-logs?user_id=${userId}&limit=10`);
      setAuditLogs(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLogsLoading(false); }
  };

  useEffect(() => {
    if (user?.role === 'Administrator' && userId) {
      fetchEmployee();
      fetchLogs();
    }
  }, [userId, user]);

  if (!user || user.role !== 'Administrator') {
    return <div className="flex flex-col items-center justify-center min-h-96"><AlertCircle className="w-12 h-12 text-red-400" /><p className="text-slate-500 mt-2">Access Restricted</p></div>;
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-96"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;
  }

  if (!employee) {
    return <div className="flex flex-col items-center justify-center min-h-96"><AlertCircle className="w-12 h-12 text-slate-300" /><p className="text-slate-500 mt-2">Employee not found.</p><Link href="/admin/users" className="text-blue-600 text-sm mt-2 hover:underline">← Back to list</Link></div>;
  }

  const e = employee;
  const emp = e.employees || {};
  const initials = (e.full_name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const handleResetPassword = async () => {
    if (!confirm('Reset password for ' + e.full_name + '?')) return;
    setActionLoading('pwd');
    try {
      const res = await apiFetch(`/api/users/${userId}/reset-password`, { method: 'POST' });
      setTempPassword(res.data.temp_password);
      await fetchEmployee();
    } catch (err: any) { alert(err.message); }
    finally { setActionLoading(''); }
  };

  const handleToggleStatus = async () => {
    if (!confirm(`${e.is_disabled ? 'Enable' : 'Disable'} account for ${e.full_name}?`)) return;
    setActionLoading('status');
    try {
      await apiFetch(`/api/users/${userId}/toggle-status`, { method: 'POST', body: JSON.stringify({ disabled: !e.is_disabled }) });
      await fetchEmployee();
    } catch (err: any) { alert(err.message); }
    finally { setActionLoading(''); }
  };

  const statusInfo = e.is_disabled
    ? { label: 'Disabled', cls: 'bg-red-50 text-red-700 border-red-200', icon: Ban }
    : e.first_login_required
      ? { label: 'Pending First Login', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: Lock }
      : { label: 'Active', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 };

  const actionMap: Record<string, { label: string; color: string }> = {
    ACCOUNT_CREATION: { label: 'Account Created', color: 'text-emerald-600' },
    ACCOUNT_UPDATE: { label: 'Profile Updated', color: 'text-blue-600' },
    PASSWORD_RESET: { label: 'Password Reset', color: 'text-amber-600' },
    ROLE_CHANGE: { label: 'Role Changed', color: 'text-purple-600' },
    ACCOUNT_DISABLED: { label: 'Account Disabled', color: 'text-red-600' },
    ACCOUNT_ENABLED: { label: 'Account Enabled', color: 'text-emerald-600' },
    STATUS_CHANGE: { label: 'Status Changed', color: 'text-orange-600' },
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
        <Link href="/admin/users" className="hover:text-blue-600 transition-colors">User Management</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-700">{e.full_name}</span>
      </nav>

      {/* Profile Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-blue-600 to-blue-800" />
        <div className="px-6 pb-6 -mt-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-lg text-blue-700 flex items-center justify-center font-black text-2xl flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <h1 className="text-xl font-black text-slate-800">{e.full_name}</h1>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${roleBadge(e.role)}`}>{e.role}</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${statusInfo.cls}`}>
                  <statusInfo.icon className="w-3 h-3" /> {statusInfo.label}
                </span>
              </div>
              <p className="text-sm text-slate-500 font-medium mt-0.5">{emp.rank} · {emp.designation}</p>
              <p className="text-xs text-slate-400 mt-0.5">{e.email}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Link href={`/admin/users/${userId}/edit`}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all">
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </Link>
              <button onClick={handleResetPassword} disabled={actionLoading === 'pwd'}
                className="flex items-center gap-1.5 px-3 py-2 border border-amber-200 bg-amber-50 rounded-lg text-xs font-bold text-amber-700 hover:bg-amber-100 transition-all disabled:opacity-50">
                {actionLoading === 'pwd' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Reset Password
              </button>
              <button onClick={handleToggleStatus} disabled={actionLoading === 'status'}
                className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${e.is_disabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'}`}>
                {actionLoading === 'status' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : e.is_disabled ? <UserCheck className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                {e.is_disabled ? 'Enable Account' : 'Disable Account'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Temp Password Banner */}
      {tempPassword && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-800">Temporary Password Generated</p>
            <div className="mt-2 flex items-center gap-3">
              <code className="bg-white border border-amber-200 rounded px-3 py-1.5 font-mono text-sm font-bold text-amber-700 select-all">{tempPassword}</code>
              <button onClick={() => navigator.clipboard.writeText(tempPassword)} className="text-xs text-amber-700 font-bold hover:underline">Copy</button>
            </div>
          </div>
          <button onClick={() => setTempPassword(null)} className="text-amber-400 font-bold text-lg">×</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Info */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <User className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-black text-slate-800">Personal Information</h2>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <Field label="Email" value={e.email} icon={Mail} />
            <Field label="Phone" value={e.phone || '—'} icon={Phone} />
            <Field label="Mobile" value={emp.mobile || '—'} icon={Phone} />
            <Field label="District" value={e.district} icon={Building2} />
            <Field label="Joining Date" value={emp.joining_date ? new Date(emp.joining_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'} icon={Calendar} />
          </div>
        </div>

        {/* Service Details */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Briefcase className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-black text-slate-800">Service Details</h2>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <Field label="Employee ID" value={emp.employee_id || '—'} icon={Hash} />
            <Field label="GPF / CPS Number" value={emp.gpf_cps_number} icon={Hash} />
            <Field label="Rank" value={emp.rank} />
            <Field label="Designation" value={emp.designation} />
            <Field label="Police Unit / Station" value={emp.police_unit || '—'} icon={Building2} />
          </div>
        </div>

        {/* Bank Details */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <CreditCard className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-black text-slate-800">Bank Details</h2>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <Field label="Account Number" value={emp.bank_account_no ? '••••' + emp.bank_account_no.slice(-4) : '—'} />
            <Field label="IFSC Code" value={emp.bank_ifsc} />
          </div>
        </div>

        {/* Account Status */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-black text-slate-800">Account Status</h2>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <Field label="System Role" value={e.role} />
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Account Status</p>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border w-fit ${statusInfo.cls}`}>
                <statusInfo.icon className="w-3.5 h-3.5" /> {statusInfo.label}
              </span>
            </div>
            <Field label="Account Created" value={e.created_at ? new Date(e.created_at).toLocaleString('en-IN') : '—'} icon={Clock} />
            <Field label="Last Sign In" value={e.last_sign_in ? new Date(e.last_sign_in).toLocaleString('en-IN') : 'Never'} icon={Clock} />
          </div>
        </div>
      </div>

      {/* Audit Logs */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-black text-slate-800">Activity Log</h2>
          </div>
          <Link href={`/admin/users/audit-logs?user_id=${userId}`} className="text-xs font-bold text-blue-600 hover:underline">View All</Link>
        </div>
        {logsLoading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 text-blue-600 animate-spin" /></div>
        ) : auditLogs.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400 font-semibold">No activity recorded yet.</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {auditLogs.map((log: any) => {
              const actionInfo = actionMap[log.action] || { label: log.action, color: 'text-slate-500' };
              return (
                <div key={log.id} className="px-6 py-3.5 flex items-start gap-3 hover:bg-slate-50/70">
                  <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold ${actionInfo.color}`}>{actionInfo.label}</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      {log.profiles?.full_name || 'Administrator'} · {new Date(log.created_at).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
