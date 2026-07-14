'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Clock, ChevronRight, Loader2, AlertCircle, Filter, Search,
  UserPlus, Edit3, Lock, ShieldCheck, Ban, UserCheck, Upload,
  RefreshCw, Activity, ArrowUpDown
} from 'lucide-react';

const ACTION_MAP: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  ACCOUNT_CREATION: { label: 'Account Created', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: UserPlus },
  ACCOUNT_UPDATE: { label: 'Profile Updated', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: Edit3 },
  PASSWORD_RESET: { label: 'Password Reset', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Lock },
  ROLE_CHANGE: { label: 'Role Changed', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', icon: ShieldCheck },
  ACCOUNT_DISABLED: { label: 'Account Disabled', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: Ban },
  ACCOUNT_ENABLED: { label: 'Account Enabled', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: UserCheck },
  STATUS_CHANGE: { label: 'Status Changed', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', icon: ArrowUpDown },
  BULK_IMPORT: { label: 'Bulk Import', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200', icon: Upload },
  LOGIN: { label: 'User Login', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: Activity },
  LOGOUT: { label: 'User Logout', color: 'text-slate-600', bg: 'bg-slate-100 border-slate-200', icon: Activity },
  CLAIM_SUBMISSION: { label: 'Claim Submitted', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200', icon: Activity },
  APPROVAL: { label: 'Claim Approved', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: Activity },
  REJECTION: { label: 'Claim Rejected', color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200', icon: Activity },
  RETURN: { label: 'Claim Returned', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Activity },
  PAYMENT: { label: 'Payment Processed', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200', icon: Activity },
};

function AuditLogsPageInner() {
  const { apiFetch, user } = useAuth();
  const searchParams = useSearchParams();
  const filterUserId = searchParams.get('user_id') || '';

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [searchText, setSearchText] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterUserId) params.set('user_id', filterUserId);
      params.set('limit', '100');
      const res = await apiFetch(`/api/users/audit-logs?${params}`);
      setLogs(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (user?.role === 'Administrator') fetchLogs();
  }, [user, filterUserId]);

  if (!user || user.role !== 'Administrator') {
    return <div className="flex flex-col items-center justify-center min-h-96"><AlertCircle className="w-12 h-12 text-red-400" /><p className="mt-2 text-slate-500">Access Restricted</p></div>;
  }

  const filteredLogs = logs.filter(log => {
    if (actionFilter && log.action !== actionFilter) return false;
    if (searchText) {
      const lower = searchText.toLowerCase();
      const adminName = log.profiles?.full_name?.toLowerCase() || '';
      const adminEmail = log.profiles?.email?.toLowerCase() || '';
      const entityId = log.entity_id?.toLowerCase() || '';
      if (!adminName.includes(lower) && !adminEmail.includes(lower) && !entityId.includes(lower)) return false;
    }
    return true;
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const renderChanges = (log: any) => {
    const newVals = log.new_values;
    if (!newVals || typeof newVals !== 'object') return null;

    const displayKeys = Object.keys(newVals).filter(k => !['password_hash'].includes(k)).slice(0, 4);
    if (!displayKeys.length) return null;

    return (
      <div className="flex flex-wrap gap-1.5 mt-2">
        {displayKeys.map(key => (
          <span key={key} className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
            {key}: {typeof newVals[key] === 'object' ? '...' : String(newVals[key]).substring(0, 30)}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
        <Link href="/admin/users" className="hover:text-blue-600 transition-colors">User Management</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-700">Audit Logs</span>
      </nav>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center shadow-sm">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800">Audit Logs</h1>
            <p className="text-xs text-slate-400 font-medium">User management activity trail · {logs.length} entries</p>
          </div>
        </div>
        <button onClick={fetchLogs} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by admin name or email..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs font-semibold border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white min-w-44 focus:outline-none">
          <option value="">All Actions</option>
          {Object.entries(ACTION_MAP).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
      </div>

      {/* Logs Timeline */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-xs text-slate-400 font-semibold">Loading audit trail...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Clock className="w-12 h-12 text-slate-200" />
            <p className="text-sm text-slate-400 font-semibold">No audit log entries found.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filteredLogs.map((log: any) => {
              const info = ACTION_MAP[log.action] || { label: log.action, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', icon: Clock };
              const Icon = info.icon;

              return (
                <div key={log.id} className="px-6 py-4 hover:bg-slate-50/50 transition-colors flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${info.bg}`}>
                    <Icon className={`w-4 h-4 ${info.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-black ${info.color}`}>{info.label}</span>
                      {log.entity_id && (
                        <Link href={`/admin/users/${log.entity_id}`} className="text-[10px] font-mono text-blue-600 hover:underline">
                          {log.entity_id.substring(0, 8)}...
                        </Link>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      By: <span className="text-slate-700 font-semibold">{log.profiles?.full_name || 'System'}</span>
                      {log.profiles?.email && <span className="text-slate-400"> ({log.profiles.email})</span>}
                      {log.ip_address && <span className="text-indigo-650 font-bold ml-2">· IP: {log.ip_address}</span>}
                    </p>
                    {renderChanges(log)}
                  </div>

                  {/* Timestamp */}
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-slate-500">{formatDate(log.created_at)}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filteredLogs.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-400 font-semibold">
            Showing {filteredLogs.length} of {logs.length} log entries
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuditLogsPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-96 gap-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs text-slate-400 font-semibold">Loading audit logs...</p>
      </div>
    }>
      <AuditLogsPageInner />
    </Suspense>
  );
}
