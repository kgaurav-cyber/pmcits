'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { Sidebar } from '../components/Sidebar';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home, Bell, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import './globals.css';

function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();

  // If user is not logged in (e.g. LoginPage), render full width without sidebar or sticky header
  if (!user) {
    return <div className="min-h-screen bg-[#F8FAFC]">{children}</div>;
  }

  // Parse path for breadcrumbs
  const pathParts = pathname.split('/').filter(p => p);
  
  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Fixed Left Sidebar */}
      <Sidebar />

      {/* Main View Area */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        
        {/* Sticky Top Header */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
          
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <Link href="/dashboard" className="hover:text-primary transition-colors flex items-center gap-1">
              <Home className="w-3.5 h-3.5" />
              <span>Portal</span>
            </Link>
            {pathParts.map((part, index) => {
              const routeTo = '/' + pathParts.slice(0, index + 1).join('/');
              const isLast = index === pathParts.length - 1;
              const formattedPart = part.charAt(0).toUpperCase() + part.slice(1);
              
              return (
                <React.Fragment key={part}>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                  {isLast ? (
                    <span className="text-slate-800 font-extrabold">{formattedPart}</span>
                  ) : (
                    <Link href={routeTo} className="hover:text-primary transition-colors">
                      {formattedPart}
                    </Link>
                  )}
                </React.Fragment>
              );
            })}
          </nav>

          {/* Right Header Controls */}
          <div className="flex items-center gap-4">
            {/* Notifications icon */}
            <Link 
              href="/notifications" 
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 relative transition-all border border-transparent hover:border-slate-100"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
            </Link>

            {/* Vertical separator */}
            <div className="w-px h-6 bg-slate-200" />

            {/* Profile Avatar Trigger */}
            <Link href="/profile" className="flex items-center gap-2.5 hover:opacity-90 transition-all text-left">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-extrabold text-slate-700 leading-none">{user.full_name}</p>
                <span className="text-[9px] font-bold text-slate-400 block mt-0.5 uppercase tracking-wide">{user.role}</span>
              </div>
            </Link>
          </div>

        </header>

        {/* Dynamic page context */}
        <main className="flex-1 p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: false
      }
    }
  }));

  return (
    <html lang="en">
      <body className="min-h-screen antialiased text-slate-800">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppLayout>{children}</AppLayout>
          </AuthProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
