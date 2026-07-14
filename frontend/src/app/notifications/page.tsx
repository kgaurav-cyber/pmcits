'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Bell, Check, Phone, Mail, Award, Laptop, ShieldCheck } from 'lucide-react';

export default function NotificationsPage() {
  const { apiFetch, user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulatedEvent, setSimulatedEvent] = useState('SUBMITTED');
  const [simulating, setSimulating] = useState(false);
  const [previewTab, setPreviewTab] = useState<'email' | 'sms' | 'inapp'>('email');

  const loadNotifications = async () => {
    try {
      const res = await apiFetch('/api/notifications');
      setNotifications(res.data || []);
    } catch (e) {
      console.error('Failed to load notifications list', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markRead = async (id: string) => {
    try {
      await apiFetch(`/api/notifications/${id}/read`, {
        method: 'PATCH'
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (e) {
      console.error('Failed to update notification read state', e);
    }
  };

  const triggerTestSimulation = async () => {
    setSimulating(true);
    try {
      await apiFetch('/api/notifications/trigger-test', {
        method: 'POST',
        body: JSON.stringify({ eventType: simulatedEvent })
      });
      // Reload list
      const res = await apiFetch('/api/notifications');
      setNotifications(res.data || []);
    } catch (e) {
      alert('Simulation trigger failed.');
    } finally {
      setSimulating(false);
    }
  };

  // Preview data dictionary matching the backend templates
  const previewData = {
    claimNumber: 'CLM-100293',
    amount: 45000,
    fullName: user?.full_name || 'Rajesh Kumar',
    comments: 'Diagnostic scans require official medical board seal verification before room rent overrides.',
    role: 'Medical Officer',
    bankAccount: 'SBI-xxxx3829',
    txnRef: 'UTR-98291929312'
  };

  const getPreviewContent = (eventType: string) => {
    switch (eventType) {
      case 'SUBMITTED':
        return {
          emailSubject: `PMCITS: Claim Submitted - ${previewData.claimNumber}`,
          emailBody: `Dear ${previewData.fullName},\n\nYour medical claim file ${previewData.claimNumber} for INR ${previewData.amount.toLocaleString()} has been successfully submitted and routed to the Medical Officer queue for clinical auditing.`,
          smsBody: `PMCITS: Claim ${previewData.claimNumber} of INR ${previewData.amount.toLocaleString()} has been submitted. Check portal.`,
          inAppTitle: 'Claim File Submitted',
          inAppMessage: `Claim reference ${previewData.claimNumber} has been submitted for Medical Review.`
        };
      case 'RETURNED':
        return {
          emailSubject: `PMCITS: Action Required - Claim ${previewData.claimNumber} Returned`,
          emailBody: `Dear ${previewData.fullName},\n\nYour claim file ${previewData.claimNumber} has been returned by the audit team for correction.\n\nReason/Comments: ${previewData.comments}\n\nPlease update and resubmit.`,
          smsBody: `PMCITS Alert: Claim ${previewData.claimNumber} returned for correction: "${previewData.comments.slice(0, 40)}...".`,
          inAppTitle: 'Claim Returned for Correction',
          inAppMessage: `Claim file ${previewData.claimNumber} has been returned. Comments: ${previewData.comments}`
        };
      case 'APPROVED':
        return {
          emailSubject: `PMCITS: Claim Approved - ${previewData.claimNumber}`,
          emailBody: `Dear ${previewData.fullName},\n\nYour claim file ${previewData.claimNumber} has been approved by the ${previewData.role} and forwarded to the next auditing stage.`,
          smsBody: `PMCITS: Claim ${previewData.claimNumber} approved by ${previewData.role}. Status updated.`,
          inAppTitle: 'Claim Approved',
          inAppMessage: `Claim ${previewData.claimNumber} approved by ${previewData.role} and routed forward.`
        };
      case 'REJECTED':
        return {
          emailSubject: `PMCITS: Claim Rejected - ${previewData.claimNumber}`,
          emailBody: `Dear ${previewData.fullName},\n\nYour medical reimbursement file ${previewData.claimNumber} has been rejected.\n\nComments: Does not qualify under standard CGHS guidelines ceiling limits.`,
          smsBody: `PMCITS: Claim ${previewData.claimNumber} rejected. Reason: CGHS ceiling breach.`,
          inAppTitle: 'Claim Disapproved / Rejected',
          inAppMessage: `Claim file ${previewData.claimNumber} was rejected by ${previewData.role}. Comments: CGHS ceiling breach.`
        };
      case 'PAID':
        return {
          emailSubject: `PMCITS: Payment Disbursed - ${previewData.claimNumber}`,
          emailBody: `Dear ${previewData.fullName},\n\nReimbursement payment for claim ${previewData.claimNumber} has been successfully credited to your registered bank account ${previewData.bankAccount}.\n\nDisbursed Amount: INR ${previewData.amount.toLocaleString()}\nTransaction Reference: ${previewData.txnRef}`,
          smsBody: `PMCITS Payment: INR ${previewData.amount.toLocaleString()} disbursed for claim ${previewData.claimNumber}. Txn: ${previewData.txnRef}.`,
          inAppTitle: 'Reimbursement Disbursed',
          inAppMessage: `Disbursement of INR ${previewData.amount.toLocaleString()} completed for claim ${previewData.claimNumber}.`
        };
      case 'DELAY':
        return {
          emailSubject: `PMCITS: SLA Limit Breached - Claim ${previewData.claimNumber}`,
          emailBody: `Dear Officer,\n\nClaim file ${previewData.claimNumber} has been pending in your stage for more than 7 days, breaching the defined SLA limit.\n\nPlease audit and process the file immediately.`,
          smsBody: `PMCITS SLA Alert: Claim ${previewData.claimNumber} has breached processing SLA limits. Immediate action required.`,
          inAppTitle: 'SLA Delay Alert Warning',
          inAppMessage: `Urgent: Claim ${previewData.claimNumber} has exceeded queue limit SLA.`
        };
      default:
        return {
          emailSubject: '',
          emailBody: '',
          smsBody: '',
          inAppTitle: '',
          inAppMessage: ''
        };
    }
  };

  const preview = getPreviewContent(simulatedEvent);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Top Header */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">System Notification Center</h1>
          <p className="text-slate-400 text-xs mt-1 font-semibold">Real-time status updates, SMS dispatches, and email alerts.</p>
        </div>
        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded border border-slate-200 uppercase tracking-wider">
          {notifications.filter(n => !n.read).length} Unread Messages
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Inbox & Trigger Simulator */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Simulator Card */}
          <div className="gov-card p-6 bg-slate-900 text-white rounded-2xl shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 animate-pulse" /> Multi-Channel Dispatch Simulator
              </h3>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">Select an event to trigger mock SMS, Email, and In-App notifications.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <select 
                value={simulatedEvent}
                onChange={(e) => setSimulatedEvent(e.target.value)}
                className="flex-1 text-xs p-2.5 bg-slate-800 border border-slate-700 rounded-xl font-bold focus:outline-none text-white focus:border-indigo-500"
              >
                <option value="SUBMITTED">Claim Submitted Alert</option>
                <option value="RETURNED">Claim Returned Alert</option>
                <option value="APPROVED">Claim Approved Alert</option>
                <option value="REJECTED">Claim Rejected Alert</option>
                <option value="PAID">Payment Completed Alert</option>
                <option value="DELAY">Delay SLA Warning Alert</option>
              </select>

              <button 
                onClick={triggerTestSimulation}
                disabled={simulating}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-indigo-600/20"
              >
                {simulating ? 'Processing...' : 'Dispatch Live Alerts'}
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="gov-card divide-y divide-slate-150 overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">In-App Alerts Inbox</h3>
              <button onClick={() => loadNotifications()} className="text-[10px] text-primary font-bold hover:underline">Refresh</button>
            </div>

            {notifications.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs font-semibold flex flex-col items-center gap-3">
                <Bell className="w-8 h-8 text-slate-350" />
                <span>Your notification inbox is clean.</span>
              </div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`p-6 flex items-start justify-between gap-4 transition-colors ${
                    notif.read ? 'bg-white' : 'bg-indigo-50/20'
                  }`}
                >
                  <div className="flex gap-4">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                      notif.read ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-indigo-100 text-indigo-700 border-indigo-200'
                    }`}>
                      <Bell className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <h4 className={`text-xs font-bold ${notif.read ? 'text-slate-500' : 'text-slate-800'}`}>
                        {notif.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">{notif.message}</p>
                      <span className="text-[9px] text-slate-400 font-bold block pt-1">
                        {new Date(notif.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {!notif.read && (
                    <button 
                      onClick={() => markRead(notif.id)}
                      title="Mark as Read"
                      className="p-1.5 border border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-colors shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Simulator Device Mockup Previews */}
        <div className="lg:col-span-5 space-y-4">
          <div className="gov-card p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
            
            {/* Preview Channels Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-150">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Template Simulator Preview</span>
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button 
                  onClick={() => setPreviewTab('email')} 
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md flex items-center gap-1 transition-all ${previewTab === 'email' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-750'}`}
                >
                  <Mail className="w-3 h-3" /> Email
                </button>
                <button 
                  onClick={() => setPreviewTab('sms')} 
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md flex items-center gap-1 transition-all ${previewTab === 'sms' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-750'}`}
                >
                  <Phone className="w-3 h-3" /> SMS
                </button>
                <button 
                  onClick={() => setPreviewTab('inapp')} 
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md flex items-center gap-1 transition-all ${previewTab === 'inapp' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-750'}`}
                >
                  <Bell className="w-3 h-3" /> In-App
                </button>
              </div>
            </div>

            {/* Simulated Desktop Email Client Mockup */}
            {previewTab === 'email' && (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-slate-50 font-semibold text-xs text-slate-650">
                <div className="bg-slate-100 p-3 border-b border-slate-200 flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-slate-400" />
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Mock Email Client</span>
                </div>
                <div className="p-4 space-y-3 bg-white">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Subject:</span>
                    <p className="font-black text-slate-850 text-xs mt-0.5">{preview.emailSubject}</p>
                  </div>
                  <div className="border-t border-slate-100 pt-3">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Body:</span>
                    <pre className="font-sans whitespace-pre-wrap text-[11px] text-slate-600 mt-2 bg-slate-50 p-3.5 rounded-lg border border-slate-200 leading-relaxed">
                      {preview.emailBody}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* Simulated SMS Phone Mockup */}
            {previewTab === 'sms' && (
              <div className="max-w-[280px] mx-auto border-[6px] border-slate-800 rounded-[30px] overflow-hidden shadow-md bg-slate-900 flex flex-col h-96 relative">
                {/* Phone Speaker Notch */}
                <div className="w-24 h-4 bg-slate-800 absolute top-0 left-1/2 translate-x-[-50%] rounded-b-xl flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                </div>
                {/* Header Status */}
                <div className="bg-slate-800 pt-5 pb-2.5 px-3 flex justify-between items-center border-b border-slate-700 text-white">
                  <span className="text-[8px] font-bold">PMCITS Gov</span>
                  <div className="w-4 h-4 rounded-full bg-slate-700 flex items-center justify-center text-[7px] font-bold"><Phone className="w-2.5 h-2.5 text-slate-300" /></div>
                </div>
                {/* Body Messages screen */}
                <div className="flex-1 bg-slate-950 p-3 overflow-y-auto space-y-4 flex flex-col justify-end">
                  <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-none p-3 max-w-[85%] self-end shadow-sm">
                    <p className="text-[10px] font-bold leading-normal">{preview.smsBody}</p>
                  </div>
                  <span className="text-[7px] text-slate-500 font-bold text-center block uppercase mt-2">Today · Gov SMS Gateway</span>
                </div>
              </div>
            )}

            {/* Simulated In-App Notification preview */}
            {previewTab === 'inapp' && (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white p-4 space-y-3 font-semibold text-xs">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">In-App Alert Mockup Card</p>
                <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/30 flex items-start gap-3">
                  <Bell className="w-5 h-5 text-indigo-600 mt-0.5" />
                  <div>
                    <p className="font-black text-slate-800">{preview.inAppTitle}</p>
                    <p className="text-[10px] text-slate-500 mt-1 font-semibold leading-relaxed">{preview.inAppMessage}</p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
}
