'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { 
  Activity, Map, ShieldAlert, AlertTriangle, 
  IndianRupee, Building2, Users, FileText, 
  CheckCircle2, Clock, XCircle, BrainCircuit,
  ArrowRight
} from 'lucide-react';

function CommandCenterInner() {
  const { apiFetch, user } = useAuth();
  const searchParams = useSearchParams();
  const currentView = searchParams.get('view') || 'dashboard';

  const [kpis, setKpis] = useState<any>(null);
  const [workflow, setWorkflow] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [kpiRes, wfRes, distRes] = await Promise.all([
        apiFetch('/api/command-center/kpis'),
        apiFetch('/api/command-center/workflow'),
        apiFetch('/api/command-center/districts')
      ]);
      setKpis(kpiRes.data);
      setWorkflow(wfRes.data);
      setDistricts(distRes.data);
    } catch (e) {
      console.error('Failed to load command center data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto refresh every 30 seconds
    const interval = setInterval(() => {
      loadData();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !kpis) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(79,70,229,0.5)]" />
      </div>
    );
  }

  // --- VIEWS ---

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Executive Dashboard</h2>
          <p className="text-slate-400 text-sm font-semibold mt-1">Real-time state-wide monitoring overview.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold bg-slate-800 px-3 py-1.5 rounded-full text-emerald-400 border border-slate-700 shadow-inner">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute" />
          <div className="w-2 h-2 rounded-full bg-emerald-400 relative z-10" /> 
          LIVE
        </div>
      </div>

      {/* Top Level KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Claims', value: kpis.totalClaims, icon: FileText, color: 'text-blue-400', bg: 'bg-blue-400/10' },
          { label: 'Pending Review', value: kpis.pendingClaims, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10' },
          { label: 'Approved Claims', value: kpis.approvedClaims, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
          { label: 'Rejected Claims', value: kpis.rejectedClaims, icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-400/10' }
        ].map((item, i) => (
          <div key={i} className="bg-slate-800/50 backdrop-blur border border-slate-700/50 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{item.label}</p>
              <p className="text-3xl font-black text-white">{item.value.toLocaleString()}</p>
            </div>
            <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center`}>
              <item.icon className={`w-6 h-6 ${item.color}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Queue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur border border-slate-700/50 p-6 rounded-2xl">
          <h3 className="text-sm font-black text-white uppercase tracking-wider mb-6 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" /> Operational Bottlenecks
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 text-center">
              <BrainCircuit className="w-6 h-6 text-violet-400 mx-auto mb-2" />
              <div className="text-xl font-black text-white">{kpis.claimsUnderAI}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1">Pending AI</div>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 text-center">
              <Users className="w-6 h-6 text-sky-400 mx-auto mb-2" />
              <div className="text-xl font-black text-white">{kpis.claimsPendingMedical}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1">Pending MO</div>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/10 blur-xl rounded-full" />
              <FileText className="w-6 h-6 text-amber-400 mx-auto mb-2 relative z-10" />
              <div className="text-xl font-black text-white relative z-10">{kpis.claimsPendingAccounts}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1 relative z-10">Pending AO</div>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 text-center">
              <Building2 className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
              <div className="text-xl font-black text-white">{kpis.claimsPendingTreasury}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1">Treasury</div>
            </div>
          </div>
        </div>

        {/* Financial Highlights */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 p-6 rounded-2xl flex flex-col justify-between">
          <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-emerald-400" /> Financial Output
          </h3>
          <div className="space-y-4">
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Total Disbursed (FY)</div>
              <div className="text-3xl font-black text-emerald-400">₹{(kpis.financialYearExpenditure / 100000).toFixed(2)}L</div>
            </div>
            <div className="h-px bg-slate-700/50 w-full" />
            <div className="flex justify-between items-center">
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">SLA Compliance</div>
                <div className="text-lg font-black text-white">{kpis.slaCompliance}%</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">Avg Processing</div>
                <div className="text-lg font-black text-white">{kpis.averageProcessingTime}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderWorkflow = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Workflow Monitor</h2>
          <p className="text-slate-400 text-sm font-semibold mt-1">Live tracking of the processing pipeline.</p>
        </div>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-4 items-center w-full overflow-x-auto pb-4 hide-scrollbar">
        {workflow.map((stage, idx) => (
          <React.Fragment key={idx}>
            <div className="bg-slate-800 border border-slate-700 p-5 rounded-2xl min-w-[240px] shadow-lg flex-1">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider">{stage.stage}</h3>
                <span className={`w-2 h-2 rounded-full ${stage.slaStatus === 'Red' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]' : stage.slaStatus === 'Yellow' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-slate-900/50 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400">Pending Load</span>
                  <span className="text-sm font-black text-white">{stage.pending}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-900/50 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400">Avg Time</span>
                  <span className="text-sm font-black text-white">{stage.avgTime}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-900/50 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400">Oldest Claim</span>
                  <span className="text-sm font-black text-rose-400">{stage.oldest}</span>
                </div>
              </div>
            </div>
            {idx < workflow.length - 1 && (
              <ArrowRight className="w-6 h-6 text-slate-600 shrink-0 hidden lg:block" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  const renderDistricts = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">District Analytics Heatmap</h2>
          <p className="text-slate-400 text-sm font-semibold mt-1">Geographic performance and load monitoring.</p>
        </div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/80 border-b border-slate-700">
              <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">District</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Status</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Submitted</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Pending</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Avg Time (Days)</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Budget Util.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {districts.map((dist, idx) => (
              <tr key={idx} className="hover:bg-slate-800/80 transition-colors">
                <td className="p-4 text-sm font-bold text-white flex items-center gap-2">
                  <Map className="w-4 h-4 text-indigo-400" /> {dist.name}
                </td>
                <td className="p-4 text-right">
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                    dist.color === 'Red' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 
                    dist.color === 'Yellow' ? 'bg-amber-400' : 'bg-emerald-400'
                  }`} />
                </td>
                <td className="p-4 text-sm font-black text-slate-300 text-right">{dist.submitted}</td>
                <td className="p-4 text-sm font-black text-amber-400 text-right">{dist.pending}</td>
                <td className="p-4 text-sm font-black text-slate-300 text-right">{dist.avgTime}</td>
                <td className="p-4 text-sm font-black text-emerald-400 text-right">{dist.budgetUtil}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPlaceholder = (title: string) => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-20 h-20 bg-slate-800/50 border border-slate-700 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
        <Activity className="w-10 h-10 text-indigo-500 opacity-50" />
      </div>
      <h2 className="text-2xl font-black text-white mb-2">{title} Module</h2>
      <p className="text-sm font-semibold text-slate-400 max-w-md">
        This high-level executive module is currently capturing telemetry. Real-time visualization will be available in the next deployment phase.
      </p>
    </div>
  );

  const viewMap: Record<string, React.ReactNode> = {
    'dashboard': renderDashboard(),
    'workflow': renderWorkflow(),
    'districts': renderDistricts(),
  };

  const getTitle = (id: string) => {
    const titles: any = {
      'officers': 'Officer Performance',
      'financials': 'Financial Analytics',
      'hospitals': 'Hospital Analytics',
      'fraud': 'Fraud Monitor',
      'sla': 'SLA Monitor',
      'escalations': 'Escalation Center',
      'queue': 'Live Queues',
      'audit': 'Audit Center',
      'reports': 'System Reports',
      'health': 'System Health',
      'settings': 'Command Center Settings'
    };
    return titles[id] || 'Module';
  };

  return (
    <div className="p-8 pb-20">
      {viewMap[currentView] || renderPlaceholder(getTitle(currentView))}
    </div>
  );
}

export default function CommandCenterPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-slate-900"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <CommandCenterInner />
    </Suspense>
  );
}
