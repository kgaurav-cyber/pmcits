'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import Link from 'next/link';
import {
  Users, UserPlus, Upload, Search, Filter, RefreshCw,
  Edit3, Eye, Lock, ShieldCheck, Ban, UserCheck, ChevronDown,
  MoreVertical, AlertCircle, Download, Loader2, CheckCircle2,
  XCircle, Building2, Calendar, Phone, Hash, FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';

const ROLES = ['Employee', 'Medical Officer', 'Accounts Officer', 'DDO', 'Treasury', 'Administrator'];
const DISTRICTS = ['Central District', 'South District', 'North District', 'East District', 'West District'];

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

const statusBadge = (u: any) => {
  if (u.is_disabled) return { label: 'Disabled', cls: 'bg-red-50 text-red-700 border-red-200', icon: Ban };
  if (u.is_locked) return { label: 'Locked', cls: 'bg-rose-50 text-rose-700 border-rose-200', icon: AlertCircle };
  if (u.first_login_required) return { label: 'Pending', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: Lock };
  return { label: 'Active', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 };
};

export default function EmployeeListPage() {
  const { apiFetch, user } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionUser, setActionUser] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState('');
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, disabled: 0, pending: 0 });

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);
      const res = await apiFetch(`/api/users?${params}`);
      const data = res.data || [];
      setEmployees(data);
      setStats({
        total: data.length,
        active: data.filter((e: any) => !e.is_disabled && !e.first_login_required).length,
        disabled: data.filter((e: any) => e.is_disabled).length,
        pending: data.filter((e: any) => e.first_login_required && !e.is_disabled).length,
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, roleFilter, statusFilter, apiFetch]);

  useEffect(() => {
    if (user?.role === 'Administrator') fetchEmployees();
  }, [fetchEmployees, user]);

  if (!user || user.role !== 'Administrator') {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 gap-4">
        <AlertCircle className="w-16 h-16 text-red-400" />
        <h2 className="text-xl font-bold text-slate-800">Access Restricted</h2>
        <p className="text-slate-500 text-sm">Only Administrators can access User Management.</p>
      </div>
    );
  }

  const handleToggleStatus = async (emp: any) => {
    setActionLoading(emp.id);
    try {
      await apiFetch(`/api/users/${emp.id}/toggle-status`, { method: 'POST', body: JSON.stringify({ disabled: !emp.is_disabled }) });
      await fetchEmployees();
    } catch (e: any) { alert(e.message); }
    finally { setActionLoading(''); setActionUser(null); }
  };

  const handleResetPassword = async (emp: any) => {
    setActionLoading(emp.id + '-pwd');
    try {
      const res = await apiFetch(`/api/users/${emp.id}/reset-password`, { method: 'POST' });
      setTempPassword(res.data.temp_password);
      await fetchEmployees();
    } catch (e: any) { alert(e.message); }
    finally { setActionLoading(''); setActionUser(null); }
  };

  const [emailing, setEmailing] = useState(false);

  const handleEmailAllUsers = async () => {
    if (!importResults || !importResults.successes || importResults.successes.length === 0) return;
    setEmailing(true);
    try {
      await apiFetch('/api/users/send-onboarding-emails', {
        method: 'POST',
        body: JSON.stringify({
          jobId: importResults.jobId,
          accounts: importResults.successes
        })
      });
      alert('Onboarding emails dispatched to all successfully imported users!');
    } catch (err: any) {
      alert('Failed to send onboarding emails: ' + err.message);
    } finally {
      setEmailing(false);
    }
  };

  const handleDownloadExcel = () => {
    if (!importResults || !importResults.successes || importResults.successes.length === 0) return;
    if (confirm('WARNING: This file contains raw temporary passwords. Distribute securely. Passwords cannot be recovered later. Do you want to download?')) {
      const rows = importResults.successes.map((s: any) => ({
        'Employee Name': s.full_name,
        'Employee ID': s.employee_id,
        'Username': s.employee_id,
        'Temporary Password': s.temp_password,
        'Official Email': s.email,
        'District': s.district || 'Central District',
        'Role': s.role || 'Employee',
        'Status': 'Active'
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Credentials');
      XLSX.writeFile(wb, `pmcits_credentials_job_${importResults.jobId.substring(0, 8)}.xlsx`);
    }
  };

  const handleDownloadPDF = () => {
    if (!importResults || !importResults.successes || importResults.successes.length === 0) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    let html = `
      <html>
        <head>
          <title>PMCITS Credentials Notice - Batch</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1E293B; line-height: 1.5; }
            .page { page-break-after: always; max-width: 800px; margin: 0 auto; padding-bottom: 40px; }
            .page:last-child { page-break-after: avoid; }
            .header { text-align: center; border-bottom: 2px double #E2E8F0; padding-bottom: 20px; margin-bottom: 30px; }
            .govt { font-size: 11px; font-weight: 800; color: #2563EB; text-transform: uppercase; letter-spacing: 0.1em; }
            .title { font-size: 20px; font-weight: 900; margin-top: 5px; color: #0F172A; }
            .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .meta-table th, .meta-table td { padding: 12px; border: 1px solid #E2E8F0; text-align: left; font-size: 13px; }
            .meta-table th { background-color: #F8FAFC; font-weight: 700; width: 35%; color: #475569; }
            .meta-table td { font-weight: 600; font-family: monospace; font-size: 14px; }
            .instructions { background-color: #F8FAFC; border: 1px solid #E2E8F0; padding: 20px; border-radius: 8px; margin-bottom: 40px; }
            .instructions h3 { font-size: 13px; margin-top: 0; font-weight: 800; color: #0F172A; }
            .instructions ol { font-size: 12px; padding-left: 20px; color: #334155; }
            .instructions li { margin-bottom: 8px; }
            .warning { background-color: #FEF3C7; border: 1px solid #FCD34D; color: #92400E; padding: 12px; border-radius: 6px; font-size: 11px; font-weight: 700; margin-bottom: 30px; }
            .footer { text-align: center; font-size: 10px; color: #94A3B8; margin-top: 60px; border-top: 1px solid #F1F5F9; padding-top: 20px; font-weight: 600; }
          </style>
        </head>
        <body>
    `;

    importResults.successes.forEach((s: any) => {
      const empId = s.employee_id || 'N/A';
      html += `
        <div class="page">
          <div class="header">
            <div class="govt">State Department Force</div>
            <div class="title">Police Medical Claims Intelligence & Transparency System (PMCITS)</div>
          </div>
          
          <div class="warning">
            CONFIDENTIAL DOCUMENTS NOTICE: This document contains a temporary password generated for system access. Change it immediately upon logging in. Keep this record in a secure location.
          </div>

          <table class="meta-table">
            <tr>
              <th>Employee Name</th>
              <td>${s.full_name}</td>
            </tr>
            <tr>
              <th>Employee ID</th>
              <td>${empId}</td>
            </tr>
            <tr>
              <th>Username</th>
              <td>${empId}</td>
            </tr>
            <tr>
              <th>Temporary Password</th>
              <td style="color: #B45309; font-weight: bold;">${s.temp_password}</td>
            </tr>
            <tr>
              <th>Official Email</th>
              <td>${s.email}</td>
            </tr>
            <tr>
              <th>Portal Login URL</th>
              <td>${window.location.origin}/login</td>
            </tr>
          </table>

          <div class="instructions">
            <h3>System Access Instructions</h3>
            <ol>
              <li>Open a web browser and navigate to: <strong>${window.location.origin}/login</strong></li>
              <li>Log in using your Username (<strong>${empId}</strong>) and the Temporary Password provided above.</li>
              <li>The system will immediately prompt you to set a new secure personal password.</li>
              <li>Your temporary credentials will expire in 7 days if not activated.</li>
            </ol>
          </div>

          <div class="footer">
            PMCITS Cryptographic Security & Registry Division • Generated on ${new Date().toLocaleString()}
          </div>
        </div>
      `;
    });

    html += `
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      setImporting(true);
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);
        if (!rows.length) { alert('Empty spreadsheet.'); return; }
        const res = await apiFetch('/api/users/bulk-import', { method: 'POST', body: JSON.stringify({ rows }) });
        setImportResults(res.data);
        await fetchEmployees();
      } catch (err: any) { alert('Import failed: ' + err.message); }
      finally { setImporting(false); }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{
      email: 'officer@police.gov.in', full_name: 'Rajesh Sharma',
      gpf_cps_number: 'GPF-2024100', employee_id: 'EMP-001',
      district: 'Central District', rank: 'Inspector',
      designation: 'Welfare Admin', police_unit: 'Unit-5',
      mobile: '9876543210', joining_date: '2022-01-15',
      bank_account_no: '9903920392', bank_ifsc: 'SBIN0001024', role: 'Employee'
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');
    XLSX.writeFile(wb, 'pmcits_import_template.xlsx');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">User Management</h1>
              <p className="text-xs text-slate-400 font-medium">Manage employee accounts, roles & access</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/admin/users/credentials"
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg text-xs font-semibold text-blue-600 border-blue-100 hover:border-blue-200 transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Credential Center
          </Link>
          <Link
            href="/admin/users/audit-logs"
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all"
          >
            <Filter className="w-3.5 h-3.5" /> Audit Logs
          </Link>
          <button
            onClick={() => { setImportResults(null); setShowBulkModal(true); }}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-all shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" /> Bulk Import
          </button>
          <Link
            href="/admin/users/add"
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm hover:-translate-y-0.5"
          >
            <UserPlus className="w-3.5 h-3.5" /> Add Employee
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Employees', value: stats.total, color: 'bg-blue-600', icon: Users },
          { label: 'Active Accounts', value: stats.active, color: 'bg-emerald-600', icon: CheckCircle2 },
          { label: 'Pending First Login', value: stats.pending, color: 'bg-amber-500', icon: Lock },
          { label: 'Disabled Accounts', value: stats.disabled, color: 'bg-red-500', icon: Ban },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-9 h-9 ${kpi.color} rounded-lg flex items-center justify-center mb-3 shadow-sm`}>
              <kpi.icon className="w-4 h-4 text-white" />
            </div>
            <p className="text-2xl font-black text-slate-800">{loading ? '—' : kpi.value}</p>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Temp Password Banner */}
      {tempPassword && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-800">Temporary Password Generated</p>
            <p className="text-xs text-amber-700 mt-0.5">Share this securely with the employee. They must change it on first login.</p>
            <div className="mt-2 flex items-center gap-3">
              <code className="bg-white border border-amber-200 rounded px-3 py-1.5 font-mono text-sm font-bold text-amber-700 select-all">{tempPassword}</code>
              <button onClick={() => { navigator.clipboard.writeText(tempPassword); }} className="text-xs text-amber-700 font-bold hover:underline">Copy</button>
            </div>
          </div>
          <button onClick={() => setTempPassword(null)} className="text-amber-400 hover:text-amber-600 font-bold text-lg leading-none">×</button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, GPF number, unit..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs font-semibold border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white min-w-36 focus:outline-none">
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white min-w-36 focus:outline-none">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending Login</option>
          <option value="disabled">Disabled</option>
        </select>
        <button onClick={fetchEmployees} className="px-3 py-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-all">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-xs text-slate-400 font-semibold">Loading employee directory...</p>
          </div>
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Users className="w-12 h-12 text-slate-200" />
            <p className="text-sm font-semibold text-slate-400">No employees found matching your filters.</p>
            <Link href="/admin/users/add" className="text-xs text-blue-600 font-bold hover:underline">+ Add first employee</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Employee</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">ID / GPF</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Unit / District</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {employees.map(emp => {
                  const status = statusBadge(emp);
                  const StatusIcon = status.icon;
                  const initials = (emp.full_name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-blue-600/10 border border-blue-100 text-blue-700 flex items-center justify-center font-black text-xs shrink-0">
                            {initials}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 leading-tight">{emp.full_name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{emp.email}</p>
                            {emp.employees?.rank && <p className="text-[10px] text-slate-500 font-semibold">{emp.employees.rank} · {emp.employees?.designation}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-mono text-xs font-bold text-slate-700">{emp.employees?.employee_id || '—'}</p>
                        <p className="font-mono text-[10px] text-slate-400">{emp.employees?.gpf_cps_number || '—'}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${roleBadge(emp.role)}`}>{emp.role}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-xs text-slate-700 font-semibold">{emp.employees?.police_unit || '—'}</p>
                        <p className="text-[10px] text-slate-400">{emp.district}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${status.cls}`}>
                          <StatusIcon className="w-3 h-3" /> {status.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          {emp.is_locked && (
                            <button title="Unlock Account"
                              disabled={actionLoading === emp.id + '-unlock'}
                              onClick={async () => {
                                if (confirm(`Unlock account for ${emp.full_name}?`)) {
                                  setActionLoading(emp.id + '-unlock');
                                  try {
                                    await apiFetch(`/api/users/${emp.id}/unlock`, { method: 'POST' });
                                    await fetchEmployees();
                                  } catch (err: any) { alert(err.message); }
                                  finally { setActionLoading(''); }
                                }
                              }}
                              className="p-1.5 rounded-lg border border-transparent hover:border-slate-200 hover:bg-white text-emerald-500 hover:text-emerald-700 transition-all disabled:opacity-50">
                              {actionLoading === emp.id + '-unlock' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          <Link href={`/admin/users/${emp.id}`} title="View Profile"
                            className="p-1.5 rounded-lg border border-transparent hover:border-slate-200 hover:bg-white text-slate-400 hover:text-blue-600 transition-all">
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          <Link href={`/admin/users/${emp.id}/edit`} title="Edit Employee"
                            className="p-1.5 rounded-lg border border-transparent hover:border-slate-200 hover:bg-white text-slate-400 hover:text-slate-700 transition-all">
                            <Edit3 className="w-3.5 h-3.5" />
                          </Link>
                          <button title="Reset Password"
                            disabled={actionLoading === emp.id + '-pwd'}
                            onClick={() => { if (confirm('Reset password for ' + emp.full_name + '?')) handleResetPassword(emp); }}
                            className="p-1.5 rounded-lg border border-transparent hover:border-slate-200 hover:bg-white text-slate-400 hover:text-amber-600 transition-all disabled:opacity-50">
                            {actionLoading === emp.id + '-pwd' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                          </button>
                          <button title={emp.is_disabled ? 'Enable Account' : 'Disable Account'}
                            disabled={actionLoading === emp.id}
                            onClick={() => handleToggleStatus(emp)}
                            className={`p-1.5 rounded-lg border border-transparent hover:border-slate-200 hover:bg-white transition-all disabled:opacity-50 ${emp.is_disabled ? 'text-emerald-500 hover:text-emerald-700' : 'text-red-400 hover:text-red-600'}`}>
                            {actionLoading === emp.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : emp.is_disabled ? <UserCheck className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-400 font-semibold">
              Showing {employees.length} employee{employees.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Upload className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Bulk Import Employees</h3>
                  <p className="text-[10px] text-slate-400">Upload Excel spreadsheet file</p>
                </div>
              </div>
              <button onClick={() => setShowBulkModal(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-xs font-bold text-blue-800 mb-1">Required Columns</p>
                <p className="text-[11px] text-blue-700 font-mono leading-relaxed">
                  email, full_name, gpf_cps_number, district, rank, designation, bank_account_no, bank_ifsc
                </p>
                <p className="text-[11px] text-blue-600 mt-1.5 font-medium">Optional: employee_id, mobile, police_unit, joining_date, role</p>
              </div>

              <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                <div className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="text-xs font-bold text-emerald-800">Download Template</p>
                    <p className="text-[10px] text-emerald-600">Pre-formatted Excel template</p>
                  </div>
                </div>
                <button onClick={downloadTemplate} className="text-xs font-bold text-emerald-700 hover:underline border border-emerald-200 px-3 py-1.5 rounded-lg bg-white hover:bg-emerald-50 transition-all">
                  Download
                </button>
              </div>

              <label className="block border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all group relative">
                <Upload className="w-8 h-8 text-slate-300 group-hover:text-blue-400 mx-auto mb-2 transition-colors" />
                <p className="text-sm font-bold text-slate-500">Click to choose Excel file</p>
                <p className="text-[11px] text-slate-400 mt-1">.xlsx or .xls formats supported</p>
                {importing && <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>}
                <input type="file" accept=".xlsx,.xls" onChange={handleExcelImport} className="absolute inset-0 opacity-0 cursor-pointer" />
              </label>

              {importResults && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <p className="text-xs font-black text-slate-700 uppercase tracking-wide">Import Results</p>
                    <div className="flex gap-4 text-xs font-bold">
                      <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {importResults.success_count} Created</span>
                      <span className="text-red-500 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> {importResults.failure_count} Failed</span>
                    </div>
                  </div>
                  {importResults.successes?.length > 0 && (
                    <div className="max-h-40 overflow-y-auto p-3 space-y-1.5">
                      {importResults.successes.map((s: any, i: number) => (
                        <div key={i} className="flex justify-between text-[11px] bg-emerald-50 rounded p-2">
                          <span className="font-semibold text-slate-700">{s.email}</span>
                          <code className="font-mono text-amber-600 font-bold select-all">{s.temp_password}</code>
                        </div>
                      ))}
                    </div>
                  )}
                  {importResults.failures?.length > 0 && (
                    <div className="max-h-28 overflow-y-auto p-3 space-y-1 border-t border-slate-100">
                      {importResults.failures.map((f: any, i: number) => (
                        <div key={i} className="text-[11px] text-red-600 font-medium"><strong>{f.email}:</strong> {f.error}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {importResults && importResults.successes?.length > 0 && (
                <div className="bg-amber-50 border border-amber-250 rounded-xl p-4 space-y-3">
                  <p className="text-[10px] text-amber-800 font-extrabold uppercase tracking-wide">
                    ⚠️ Warning: This file/modal contains temporary passwords. Distribute securely. Passwords cannot be recovered later.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={handleEmailAllUsers}
                      disabled={emailing}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-755 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
                    >
                      {emailing ? 'Emailing...' : 'Email All Users'}
                    </button>
                    <button
                      onClick={handleDownloadPDF}
                      className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                    >
                      Download PDF
                    </button>
                    <button
                      onClick={handleDownloadExcel}
                      className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                    >
                      Download Excel
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2.5">
                <button onClick={() => { setShowBulkModal(false); setImportResults(null); }}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all">
                  Close & Destroy Passwords
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
