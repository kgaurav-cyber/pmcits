import { Suspense } from 'react';
import { Metadata } from 'next';
import { CommandCenterSidebar } from '../../components/CommandCenterSidebar';

export const metadata: Metadata = {
  title: 'State Command & Control Center - PMCITS',
  description: 'Executive Monitoring Dashboard for Medical Claims',
};

export default function CommandCenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-900 font-sans">
      <Suspense fallback={<div className="w-64 bg-slate-950 h-screen fixed left-0" />}>
        <CommandCenterSidebar />
      </Suspense>
      {/* Hide the default global layout styling since this is a dark-mode, separate module */}
      <main className="ml-64 bg-slate-900 min-h-screen">
        {children}
      </main>
    </div>
  );
}
