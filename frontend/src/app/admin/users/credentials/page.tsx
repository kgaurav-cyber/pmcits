'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import Link from 'next/link';
import {
  ShieldAlert, RefreshCw, Mail, Download, Search, Filter,
  FileSpreadsheet, FileText, ArrowLeft, Loader2, CheckCircle2,
  XCircle, AlertCircle, Play, Ban, Trash2, Key
} from 'lucide-react';
import * as XLSX from 'xlsx';

const DISTRICTS = ['Central District', 'South District', 'North District', 'East District', 'West District'];

export default function CredentialDistributionCenterPage() {
  const { apiFetch, user } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selected Job Details Modal
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Regenerated credentials preview modal state
  const [regeneratedCredentials, setRegeneratedCredentials] = useState<any[] | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/users/import-jobs');
      setJobs(res.data || []);
    } catch (err) {
      console.error('Failed to load import jobs', err);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (user?.role === 'Administrator') {
      fetchJobs();
    }
  }, [fetchJobs, user]);

  const viewReport = async (job: any) => {
    setSelectedJob(job);
    setLoadingReport(true);
    try {
      const res = await apiFetch(`/api/users/import-jobs/${job.id}`);
      setReportData(res.data);
    } catch (err: any) {
      alert('Failed to load job report: ' + err.message);
      setSelectedJob(null);
    } finally {
      setLoadingReport(false);
    }
  };

  const handleRetryEmails = async (jobId: string) => {
    setActionLoading('retry-emails');
    try {
      const res = await apiFetch(`/api/users/import-jobs/${jobId}/retry-emails`, {
        method: 'POST'
      });
      alert(`Email retry complete! Sent: ${res.data.sent}, Failed: ${res.data.failed}`);
      // Refresh report
      if (selectedJob && selectedJob.id === jobId) {
        await viewReport(selectedJob);
      }
      await fetchJobs();
    } catch (err: any) {
      alert('Failed to retry emails: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRegeneratePasswords = async (jobId: string) => {
    if (!confirm('Are you sure you want to generate brand new temporary passwords for all successfully imported employees in this job? This will overwrite their current passwords and force them to change it on their next login.')) {
      return;
    }
    
    setActionLoading('regenerate-passwords');
    try {
      const res = await apiFetch(`/api/users/import-jobs/${jobId}/new-passwords`, {
        method: 'POST'
      });
      setRegeneratedCredentials(res.data || []);
      await fetchJobs();
    } catch (err: any) {
      alert('Failed to regenerate passwords: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const downloadExcelCredentials = (accounts: any[], jobName: string) => {
    if (confirm('WARNING: This file contains raw temporary passwords. Distribute securely. Passwords cannot be recovered later. Do you want to download?')) {
      const rows = accounts.map(a => ({
        'Employee Name': a.full_name,
        'Employee ID': a.employee_id,
        'Username': a.employee_id,
        'Temporary Password': a.temp_password,
        'Official Email': a.email,
        'District': a.district || 'Central District',
        'Role': a.role || 'Employee',
        'Status': 'Active'
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Credentials');
      XLSX.writeFile(wb, `pmcits_credentials_${jobName}.xlsx`);
    }
  };

  const downloadFailedRowsExcel = (failures: any[], jobId: string) => {
    const rows = failures.map(f => ({
      ...f.row_data,
      'Error Message': f.error_message,
      'Failure Timestamp': f.created_at
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Failures');
    XLSX.writeFile(wb, `pmcits_failed_records_${jobId.substring(0, 8)}.xlsx`);
  };

  // Filter logic
  const filteredJobs = jobs.filter(job => {
    // Search filter
    const matchesSearch = 
      job.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.profiles?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.profiles?.email || '').toLowerCase().includes(searchQuery.toLowerCase());

    // Date filter
    const matchesDate = !dateFilter || job.import_date.startsWith(dateFilter);

    // Status filter
    const matchesStatus = !statusFilter || job.status === statusFilter;

    return matchesSearch && matchesDate && matchesStatus;
  });

  if (!user || user.role !== 'Administrator') {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 gap-4">
        <AlertCircle className="w-16 h-16 text-red-400" />
        <h2 className="text-xl font-bold text-slate-800">Access Restricted</h2>
        <p className="text-slate-500 text-sm">Only Administrators can access the Credential Distribution Center.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/users" className="p-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg text-slate-500 transition-all shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">Credential Distribution Center</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">Audit onboarding history, retry emails, and download credentials</p>
        </div>
      </div>

      {/* Warning Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-amber-800">Security & Privacy Protocol</p>
          <p className="text-[11px] text-amber-700 leading-relaxed mt-0.5">
            This module stores ONLY import metadata and delivery states. In compliance with security standards, temporary passwords are never saved in the database.
            Administrators must distribute generated credentials securely.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by job ID, administrator email, or name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs font-semibold border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>
        <div className="flex gap-3 flex-wrap">
          <input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white min-w-36 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="Completed">Completed</option>
            <option value="Running">Running</option>
            <option value="Failed">Failed</option>
          </select>
          <button onClick={fetchJobs} className="px-3 py-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-all">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Import History Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-xs text-slate-400 font-semibold">Loading import history logs...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <FileSpreadsheet className="w-12 h-12 text-slate-200" />
            <p className="text-sm font-semibold text-slate-400">No import history logs found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Import Job</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Date / Time</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Imported By</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Accounts Summary</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Emails Sent</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredJobs.map(job => (
                  <tr key={job.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-mono text-xs font-bold text-slate-700">#{job.id.substring(0, 8)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs text-slate-600 font-semibold">{new Date(job.import_date).toLocaleString()}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs text-slate-700 font-bold">{job.profiles?.full_name || 'System'}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{job.profiles?.email || ''}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-700 font-bold">{job.total_users} Total</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                        <span className="text-xs text-emerald-600 font-bold">{job.successful_imports} Success</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                        <span className="text-xs text-rose-500 font-bold">{job.failed_imports} Failed</span>
                        {job.duplicate_records > 0 && (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                            <span className="text-xs text-amber-500 font-bold">{job.duplicate_records} Dup</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700">{job.emails_sent} Sent</span>
                        {job.emails_failed > 0 && (
                          <span className="text-xs font-bold text-rose-500 bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5 flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> {job.emails_failed} Failed
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        job.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        job.status === 'Running' ? 'bg-blue-50 text-blue-700 border-blue-100 animate-pulse' :
                        'bg-rose-50 text-rose-700 border-rose-100'
                      }`}>{job.status}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => viewReport(job)}
                        className="px-3 py-1.5 border border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg text-xs font-bold transition-all shadow-sm"
                      >
                        View Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Job Report Details Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-4xl max-h-[85vh] shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Import Job Report: #{selectedJob.id.substring(0, 8)}</h3>
                  <p className="text-[10px] text-slate-400">Created: {new Date(selectedJob.import_date).toLocaleString()}</p>
                </div>
              </div>
              <button onClick={() => { setSelectedJob(null); setReportData(null); }} className="text-slate-400 hover:text-slate-600 text-xl font-bold leading-none">×</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingReport ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  <p className="text-xs text-slate-400 font-semibold">Loading job detailed stats...</p>
                </div>
              ) : reportData ? (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                      <p className="text-xl font-extrabold text-slate-800">{reportData.job.total_users}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Total Rows</p>
                    </div>
                    <div className="border border-slate-200 rounded-xl p-4 bg-emerald-50/50 border-emerald-100">
                      <p className="text-xl font-extrabold text-emerald-600">{reportData.job.successful_imports}</p>
                      <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider mt-0.5">Successful</p>
                    </div>
                    <div className="border border-slate-200 rounded-xl p-4 bg-rose-50/50 border-rose-100">
                      <p className="text-xl font-extrabold text-rose-600">{reportData.job.failed_imports}</p>
                      <p className="text-[10px] text-rose-500 font-bold uppercase tracking-wider mt-0.5">Failed Logs</p>
                    </div>
                    <div className="border border-slate-200 rounded-xl p-4 bg-amber-50/50 border-amber-100">
                      <p className="text-xl font-extrabold text-amber-600">{reportData.job.duplicate_records}</p>
                      <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider mt-0.5">Duplicates</p>
                    </div>
                  </div>

                  {/* Operational actions panel */}
                  <div className="border border-slate-200 rounded-xl p-4 flex flex-wrap justify-between items-center gap-4 bg-[#F8FAFC]">
                    <div>
                      <p className="text-xs font-bold text-slate-700">Administrative Distribution Controls</p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Perform bulk distribution dispatch or passwords replacement</p>
                    </div>
                    <div className="flex gap-2.5">
                      {reportData.job.emails_failed > 0 && (
                        <button
                          onClick={() => handleRetryEmails(selectedJob.id)}
                          disabled={actionLoading !== null}
                          className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                        >
                          {actionLoading === 'retry-emails' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                          Retry Failed Emails
                        </button>
                      )}
                      <button
                        onClick={() => handleRegeneratePasswords(selectedJob.id)}
                        disabled={actionLoading !== null}
                        className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                      >
                        {actionLoading === 'regenerate-passwords' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                        Generate New Passwords
                      </button>
                      {reportData.failures?.length > 0 && (
                        <button
                          onClick={() => downloadFailedRowsExcel(reportData.failures, selectedJob.id)}
                          className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold transition-all shadow-sm"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Export Failed Rows
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tabs: Failed Rows and Email Dispatch log */}
                  <div className="space-y-4">
                    {/* Failed Rows Section */}
                    {reportData.failures?.length > 0 && (
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="px-4 py-3 bg-rose-50 border-b border-slate-200">
                          <h4 className="text-xs font-black text-rose-700 uppercase tracking-wide">Failed Import Rows ({reportData.failures.length})</h4>
                        </div>
                        <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                          {reportData.failures.map((fail: any, idx: number) => (
                            <div key={idx} className="p-3 text-xs flex justify-between gap-4">
                              <div>
                                <span className="font-bold text-slate-700">{fail.row_data?.email || 'N/A'}</span>
                                <span className="text-slate-400 font-semibold ml-2">({fail.row_data?.full_name || 'No Name'})</span>
                              </div>
                              <span className="text-rose-600 font-bold shrink-0">{fail.error_message}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Email tracking logs */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide">Onboarding Email Dispatch Log</h4>
                        <div className="flex gap-4 text-xs font-bold">
                          <span className="text-emerald-600">{reportData.emails.filter((e: any) => e.status === 'Delivered').length} Delivered</span>
                          <span className="text-rose-500">{reportData.emails.filter((e: any) => e.status === 'Failed').length} Failed</span>
                        </div>
                      </div>
                      {reportData.emails.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-400 font-semibold">No onboarding emails have been dispatched for this job yet.</div>
                      ) : (
                        <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                          {reportData.emails.map((email: any, idx: number) => (
                            <div key={idx} className="p-3 text-xs flex justify-between items-center gap-4">
                              <div>
                                <p className="font-bold text-slate-700 leading-tight">{email.profiles?.full_name || 'Employee'}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{email.email_address}</p>
                              </div>
                              <div className="text-right">
                                <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold border ${
                                  email.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                  email.status === 'Queued' ? 'bg-slate-50 text-slate-600 border-slate-200' :
                                  'bg-rose-50 text-rose-700 border-rose-100'
                                }`}>{email.status}</span>
                                {email.error_message && <p className="text-[9px] text-rose-500 mt-1 font-semibold">{email.error_message}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
              <button
                onClick={() => { setSelectedJob(null); setReportData(null); }}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-350 text-slate-700 rounded-lg text-xs font-bold transition-all shadow-sm"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regenerated Credentials Download Modal Preview */}
      {regeneratedCredentials && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-black text-slate-800">Regenerated Credentials Bundle</h3>
              </div>
              <button onClick={() => setRegeneratedCredentials(null)} className="text-slate-400 hover:text-slate-600 text-xl font-bold leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs flex items-start gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-850">Important Download Notice</p>
                  <p className="text-amber-700 leading-relaxed mt-0.5">
                    This file contains newly generated temporary passwords. Distribute them securely. These credentials will disappear as soon as you close this modal.
                  </p>
                </div>
              </div>

              <div className="flex justify-center py-2">
                <button
                  onClick={() => downloadExcelCredentials(regeneratedCredentials, `regen_${Date.now()}`)}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-md hover:-translate-y-0.5"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  DOWNLOAD CREDENTIALS EXCEL
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl p-3">
                {regeneratedCredentials.map((c, idx) => (
                  <div key={idx} className="py-2.5 flex justify-between text-xs items-center">
                    <div>
                      <p className="font-bold text-slate-700">{c.full_name}</p>
                      <p className="text-[10px] text-slate-400">{c.email}</p>
                    </div>
                    <code className="font-mono bg-amber-50 border border-amber-200 px-2 py-1 rounded text-amber-700 font-bold select-all">{c.temp_password}</code>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 shrink-0 pt-2">
                <button
                  onClick={() => setRegeneratedCredentials(null)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-250 text-slate-700 rounded-lg text-xs font-bold transition-all shadow-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
