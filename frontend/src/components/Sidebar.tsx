'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { 
  FileText, 
  BarChart3, 
  User, 
  Bell, 
  LogOut, 
  PlusCircle, 
  LayoutDashboard,
  Activity,
  ShieldAlert,
  Users
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) return null;

  const links: any[] = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Inbox', path: '/inbox', icon: FileText }
  ];

  if (user.role === 'Employee') {
    links.push({ name: 'New Claim', path: '/claims/new', icon: PlusCircle });
  }

  if (user.role === 'Administrator') {
    links.push(
      { name: 'Command & Control Center', path: '/command-center', icon: Activity },
      { name: 'User Management', path: '/admin/users', icon: Users }
    );
  }

  links.push(
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'Notifications', path: '/notifications', icon: Bell },
    { name: 'Profile', path: '/profile', icon: User }
  );

  return (
    <aside className="w-64 bg-white border-r border-slate-200 h-screen flex flex-col fixed left-0 top-0 text-slate-800 overflow-y-auto">
      {/* Official Header */}
      <div className="p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center">
            <img src="/uppolice.png" alt="UP Police Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-tight text-slate-800">UTTAR PRADESH POLICE</h1>
            <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase block">Medical Claims Portal</span>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.path || (link.path !== '/dashboard' && pathname.startsWith(link.path));

          return (
            <Link 
              key={link.path + link.name} 
              href={link.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                isActive 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {link.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer Operator Info */}
      <div className="p-4 border-t border-slate-200 space-y-4">
        <div className="px-4 py-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Session</span>
          </div>
          <p className="text-xs font-bold text-slate-700 truncate">{user.full_name}</p>
          <p className="text-[10px] text-slate-400 capitalize truncate font-semibold">{user.role}</p>
        </div>
        <button 
          onClick={logout}
          className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold text-rose-600 hover:bg-rose-50/50 transition-all border border-transparent hover:border-rose-100"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          Sign Out File
        </button>
      </div>
    </aside>
  );

};
