'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { 
  LayoutDashboard,
  Activity,
  Map,
  Users,
  IndianRupee,
  Building2,
  ShieldAlert,
  Clock,
  AlertTriangle,
  ListOrdered,
  FileSearch,
  BarChart3,
  Server,
  Settings,
  ArrowLeft
} from 'lucide-react';

export const CommandCenterSidebar: React.FC = () => {
  const searchParams = useSearchParams();
  const currentView = searchParams ? searchParams.get('view') || 'dashboard' : 'dashboard';

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'workflow', name: 'Workflow Monitor', icon: Activity },
    { id: 'districts', name: 'District Analytics', icon: Map },
    { id: 'officers', name: 'Officer Performance', icon: Users },
    { id: 'financials', name: 'Financial Analytics', icon: IndianRupee },
    { id: 'hospitals', name: 'Hospital Analytics', icon: Building2 },
    { id: 'fraud', name: 'Fraud Monitor', icon: ShieldAlert },
    { id: 'sla', name: 'SLA Monitor', icon: Clock },
    { id: 'escalations', name: 'Escalations', icon: AlertTriangle },
    { id: 'queue', name: 'Live Queue', icon: ListOrdered },
    { id: 'audit', name: 'Audit Center', icon: FileSearch },
    { id: 'reports', name: 'Reports', icon: BarChart3 },
    { id: 'health', name: 'System Health', icon: Server },
    { id: 'settings', name: 'Settings', icon: Settings }
  ];

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 h-screen flex flex-col fixed left-0 top-0 text-slate-300 overflow-y-auto shadow-2xl">
      {/* Official Header */}
      <div className="p-6 border-b border-slate-800 sticky top-0 bg-slate-950/95 backdrop-blur z-10">
        <div className="flex flex-col gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-white transition-colors w-max">
            <ArrowLeft className="w-4 h-4" /> Exit Command Center
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-base shadow-[0_0_15px_rgba(79,70,229,0.5)]">
              C2
            </div>
            <div>
              <h1 className="font-black text-sm tracking-tight text-white uppercase">State Command</h1>
              <span className="text-[10px] text-indigo-400 font-bold tracking-widest uppercase block mt-0.5">Control Center</span>
            </div>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3 px-2">Executive Modules</div>
        {menuItems.map((link) => {
          const Icon = link.icon;
          const isActive = currentView === link.id;

          return (
            <Link 
              key={link.id} 
              href={`/command-center?view=${link.id}`}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${
                isActive 
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-[inset_0_0_20px_rgba(79,70,229,0.1)]' 
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
              {link.name}
            </Link>
          );
        })}
      </nav>
      
      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 space-y-2 bg-slate-950 mt-auto">
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
          <span>System Status</span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Optimal
          </span>
        </div>
        <div className="text-[9px] text-slate-600 font-semibold uppercase tracking-wider">
          CLASSIFIED: Authorized Personnel Only
        </div>
      </div>
    </aside>
  );
};
