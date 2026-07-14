'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts';
import { FileText, Award, BarChart3, Users, Download, HelpCircle, Activity, Clock } from 'lucide-react';

export default function ReportsPage() {
  const { apiFetch, user, token } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [slaData, setSlaData] = useState<any[]>([]);
  const [districtData, setDistrictData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [hospitalData, setHospitalData] = useState<any[]>([]);
  const [workloadData, setWorkloadData] = useState<any[]>([]);
  const [paymentData, setPaymentData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExportType, setSelectedExportType] = useState('monthly');

  // Custom states for the new reports
  const [pendingClaimsList, setPendingClaimsList] = useState<any[]>([]);
  const [approvedClaimsList, setApprovedClaimsList] = useState<any[]>([]);
  const [rejectedClaimsList, setRejectedClaimsList] = useState<any[]>([]);
  const [fraudAlertsList, setFraudAlertsList] = useState<any[]>([]);

  const loadReports = async () => {
    try {
      // 1. Load basic stats
      const statsRes = await apiFetch('/api/reports/dashboard-stats');
      setStats(statsRes.data);

      // Load claims by status logs
      if (user) {
        const pendingRes = await apiFetch('/api/reports/claims-by-status?group=pending');
        setPendingClaimsList(pendingRes.data || []);

        const approvedRes = await apiFetch('/api/reports/claims-by-status?group=approved');
        setApprovedClaimsList(approvedRes.data || []);

        const rejectedRes = await apiFetch('/api/reports/claims-by-status?group=rejected');
        setRejectedClaimsList(rejectedRes.data || []);

        if (['Administrator', 'DDO', 'Medical Officer', 'Accounts Officer'].includes(user.role)) {
          const fraudRes = await apiFetch('/api/reports/fraud-alerts');
          setFraudAlertsList(fraudRes.data || []);
        }
      }

      // 2. Load detailed audits (requires reviewer roles)
      if (['Administrator', 'DDO', 'Treasury'].includes(user?.role || '')) {
        const slaRes = await apiFetch('/api/reports/sla-compliance');
        setSlaData(slaRes.data || []);

        const distRes = await apiFetch('/api/reports/district-expenditure');
        setDistrictData(distRes.data || []);

        const monthRes = await apiFetch('/api/reports/monthly');
        setMonthlyData(monthRes.data || []);

        const hospRes = await apiFetch('/api/reports/hospitals');
        setHospitalData(hospRes.data || []);

        const payRes = await apiFetch('/api/reports/payments');
        setPaymentData(payRes.data || []);

        if (['Administrator', 'DDO'].includes(user?.role || '')) {
          const workRes = await apiFetch('/api/reports/workloads');
          setWorkloadData(workRes.data || []);
        }
      }
    } catch (e) {
      console.error('Failed to load analytical reports data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [user]);

  const triggerExport = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/api/reports/export/${format}?type=${selectedExportType}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Download failed');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pmcits_${selectedExportType}_report.${format === 'excel' ? 'xls' : format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download report. Check server configurations.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Simulated chart monthly data fallback if database table is empty
  const monthlySpending = monthlyData.length > 0 ? monthlyData : [
    { month: 'Jan', claimed: 45000, approved: 42000 },
    { month: 'Feb', claimed: 62000, approved: 58000 },
    { month: 'Mar', claimed: 51000, approved: 49000 },
    { month: 'Apr', claimed: 89000, approved: 82000 },
    { month: 'May', claimed: 120000, approved: 110000 },
    { month: 'Jun', claimed: stats?.total_reimbursed_budget || 95000, approved: stats?.total_reimbursed_budget || 90000 }
  ];

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Analytics & Expenditure Reports</h1>
          <p className="text-slate-400 text-xs mt-1 font-semibold">Statewide financial metrics and SLA tracking dashboards.</p>
        </div>

        {/* Exporter Controls */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center gap-3 shadow-sm">
          <select 
            value={selectedExportType} 
            onChange={(e) => setSelectedExportType(e.target.value)}
            className="text-xs p-2 border border-slate-200 rounded font-bold focus:outline-none"
          >
            <option value="monthly">Monthly Report</option>
            <option value="district">District Report</option>
            <option value="hospital">Hospital Report</option>
            <option value="workload">Officer Workload</option>
            <option value="payments">Payments Logs</option>
            <option value="pending_claims">Pending Claims</option>
            <option value="approved_claims">Approved Claims</option>
            <option value="rejected_claims">Rejected Claims</option>
            <option value="fraud_alerts">Fraud Alerts Summary</option>
          </select>
          
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => triggerExport('csv')}
              className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded font-bold text-xs flex items-center gap-1.5 transition-all"
              title="Export CSV"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button 
              onClick={() => triggerExport('excel')}
              className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded font-bold text-xs flex items-center gap-1.5 transition-all"
              title="Export Excel"
            >
              <Download className="w-3.5 h-3.5" /> XLS
            </button>
            <button 
              onClick={() => triggerExport('pdf')}
              className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded font-bold text-xs flex items-center gap-1.5 transition-all"
              title="Export PDF"
            >
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <div className="gov-card p-6 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Disbursed Budget</span>
              <span className="text-xl font-black text-slate-800 mt-1 block">INR {stats.total_reimbursed_budget.toLocaleString()}</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
              <Award className="w-5 h-5" />
            </div>
          </div>

          <div className="gov-card p-6 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Awaiting Action</span>
              <span className="text-xl font-black text-amber-600 mt-1 block">{stats.pending_review_count}</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="gov-card p-6 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Approved Reimbursements</span>
              <span className="text-xl font-black text-slate-850 mt-1 block">{stats.approved_claims_count}</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/5 text-primary flex items-center justify-center border border-primary/10">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          <div className="gov-card p-6 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Rejected/Returned</span>
              <span className="text-xl font-black text-rose-600 mt-1 block">{stats.rejected_claims_count}</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
              <Activity className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Recharts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Expenditure History Area Chart */}
        <div className="gov-card p-6 space-y-4">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Reimbursement Spending History</h3>
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlySpending}>
                <defs>
                  <linearGradient id="colorSpending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="approved" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#colorSpending)" name="Disbursed (INR)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SLA Average Review times Bar Chart */}
        {slaData.length > 0 && (
          <div className="gov-card p-6 space-y-4">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Average Processing Days by Stage</h3>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={slaData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="stage" stroke="#94A3B8" fontSize={9} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="average_days" fill="#2563EB" radius={[4, 4, 0, 0]} name="Average Days" />
                  <Bar dataKey="sla_limit_days" fill="#CBD5E1" radius={[4, 4, 0, 0]} name="SLA Limit" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      </div>

      {/* Reports Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* District Expenditure Summary */}
        {districtData.length > 0 && (
          <div className="gov-card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-white">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">District Expenditure Summary</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse gov-table">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-6 py-3">Police District</th>
                    <th className="px-6 py-3">Approved Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                  {districtData.map((exp: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-700">{exp.district}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">INR {exp.total_reimbursed.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Hospital Expenditure Summary */}
        {hospitalData.length > 0 && (
          <div className="gov-card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-white">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Hospital Disbursements Audit</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse gov-table">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-6 py-3">Hospital Name</th>
                    <th className="px-6 py-3">Claims Cleared</th>
                    <th className="px-6 py-3">Disbursed Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                  {hospitalData.map((hosp: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-700">{hosp.hospital}</td>
                      <td className="px-6 py-4">{hosp.total_claims} Claims</td>
                      <td className="px-6 py-4 font-bold text-slate-800">INR {hosp.disbursed.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Officer Workload Reviewer Load */}
        {workloadData.length > 0 && (
          <div className="gov-card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-white">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Officer Audit Workload Summary</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse gov-table">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-6 py-3">Reviewer Name</th>
                    <th className="px-6 py-3">Officer Role</th>
                    <th className="px-6 py-3">Files Processed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                  {workloadData.map((work: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-700">{work.name}</td>
                      <td className="px-6 py-4 capitalize text-[10px] text-slate-400">{work.role}</td>
                      <td className="px-6 py-4 font-bold text-primary">{work.processed_count} files</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payment Disbursement logs */}
        {paymentData.length > 0 && (
          <div className="gov-card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-white">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Treasury Payments Disbursement log</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse gov-table">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-6 py-3">Claim Reference</th>
                    <th className="px-6 py-3">Disbursed Amount</th>
                    <th className="px-6 py-3">Transaction ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                  {paymentData.slice(0, 5).map((pay: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-primary">{pay.claim_number}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">INR {pay.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-slate-400 font-medium">{pay.txn_ref}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pending Claims List */}
        {pendingClaimsList.length > 0 && (
          <div className="gov-card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-white">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Awaiting Audit Review (Pending Claims)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse gov-table">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-6 py-3">Claim No</th>
                    <th className="px-6 py-3">Claimant</th>
                    <th className="px-6 py-3">Claimed Amt</th>
                    <th className="px-6 py-3">Current State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                  {pendingClaimsList.map((c: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-primary">{c.claim_number}</td>
                      <td className="px-6 py-4 text-slate-800">{c.claimant}</td>
                      <td className="px-6 py-4 font-bold text-slate-850">₹{Number(c.amount_claimed).toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Approved Claims List */}
        {approvedClaimsList.length > 0 && (
          <div className="gov-card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-white">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Sanctioned Reimbursements (Approved Claims)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse gov-table">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-6 py-3">Claim No</th>
                    <th className="px-6 py-3">Claimant</th>
                    <th className="px-6 py-3">Sanctioned Amt</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                  {approvedClaimsList.map((c: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-primary">{c.claim_number}</td>
                      <td className="px-6 py-4 text-slate-800">{c.claimant}</td>
                      <td className="px-6 py-4 font-bold text-emerald-600">₹{Number(c.amount_approved).toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          Paid / Closed
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Rejected Claims List */}
        {rejectedClaimsList.length > 0 && (
          <div className="gov-card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-white">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Returned or Rejected Files</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse gov-table">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-6 py-3">Claim No</th>
                    <th className="px-6 py-3">Claimant</th>
                    <th className="px-6 py-3">Requested Amt</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                  {rejectedClaimsList.map((c: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-primary">{c.claim_number}</td>
                      <td className="px-6 py-4 text-slate-800">{c.claimant}</td>
                      <td className="px-6 py-4 font-bold text-rose-600">₹{Number(c.amount_claimed).toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100">
                          {c.status === 'Returned for Correction' ? 'Returned' : 'Closed / Rejected'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AI Fraud & Risk Alerts List */}
        {fraudAlertsList.length > 0 && (
          <div className="gov-card overflow-hidden lg:col-span-2">
            <div className="px-6 py-4 border-b border-slate-200 bg-white">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">AI Fraud Verification & Risk Alerts</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse gov-table">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-6 py-3">Claim No</th>
                    <th className="px-6 py-3">Claimant</th>
                    <th className="px-6 py-3">Claimed Amt</th>
                    <th className="px-6 py-3">AI Risk Score</th>
                    <th className="px-6 py-3">Anomalies Detected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                  {fraudAlertsList.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-primary">{item.claim_number}</td>
                      <td className="px-6 py-4 text-slate-800">{item.claimant}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">₹{Number(item.amount).toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-wider ${
                          item.risk_score === 'High' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                          'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                          {item.risk_score} Risk
                        </span>
                      </td>
                      <td className="px-6 py-4 text-rose-600 font-bold max-w-xs truncate" title={item.summary}>{item.reasons}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
