'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useClaimsQueue, useSaveDraftClaim } from '../../hooks/useClaims';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Brain, 
  IndianRupee,
  Loader2,
  Filter,
  Search,
  ShieldCheck,
  Building,
  User as UserIcon,
  Stethoscope
} from 'lucide-react';
import Link from 'next/link';

function InboxPageInner() {
  const { apiFetch, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Tab state (default to 'inbox')
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'inbox');
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: allClaims, isLoading: claimsLoading, refetch } = useClaimsQueue('ALL');
  
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [remarks, setRemarks] = useState('');
  const [finalSanctionAmount, setFinalSanctionAmount] = useState<number>(0);
  const [utrNumber, setUtrNumber] = useState('');
  const [paymentDate, setPaymentDate] = useState('');

  const queryClient = useQueryClient();

  // Unified Tabs Definition
  const getTabsForRole = (role: string) => {
    switch (role) {
      case 'Employee':
        return [
          { id: 'inbox', label: 'My Claims' },
          { id: 'drafts', label: 'Drafts' },
          { id: 'returned', label: 'Returned' },
          { id: 'history', label: 'History' }
        ];
      case 'Medical Officer':
        return [
          { id: 'inbox', label: 'Inbox' },
          { id: 'pending', label: 'Pending AI' },
          { id: 'approved', label: 'Approved' },
          { id: 'returned', label: 'Returned' },
          { id: 'rejected', label: 'Rejected' },
          { id: 'history', label: 'History' }
        ];
      case 'Accounts Officer':
        return [
          { id: 'inbox', label: 'Inbox' },
          { id: 'pending', label: 'Pending Verification' },
          { id: 'approved', label: 'Verified' },
          { id: 'returned', label: 'Returned' },
          { id: 'rejected', label: 'Rejected' },
          { id: 'history', label: 'History' }
        ];
      case 'DDO':
        return [
          { id: 'inbox', label: 'Inbox' },
          { id: 'approved', label: 'Approved' },
          { id: 'returned', label: 'Returned' },
          { id: 'rejected', label: 'Rejected' },
          { id: 'history', label: 'History' }
        ];
      case 'Treasury':
        return [
          { id: 'inbox', label: 'Pending Payments' },
          { id: 'approved', label: 'Completed' },
          { id: 'failed', label: 'Failed' },
          { id: 'history', label: 'History' }
        ];
      case 'Administrator':
        return [
          { id: 'inbox', label: 'Inbox' },
          { id: 'exceptions', label: 'Exceptions Queue' },
          { id: 'history', label: 'All Claims' }
        ];
      default:
        return [
          { id: 'inbox', label: 'Inbox' },
          { id: 'history', label: 'History' }
        ];
    }
  };

  const tabs = user ? getTabsForRole(user.role) : [];

  // Filter Logic
  const filterByView = (claimsList: any[]) => {
    if (!claimsList || !user) return [];
    
    let filtered = claimsList;

    if (user.role === 'Employee') {
      if (activeTab === 'inbox') return filtered.filter(c => !['Paid', 'Closed', 'Draft'].includes(c.claim_stage));
      if (activeTab === 'drafts') return filtered.filter(c => c.claim_stage === 'Draft');
      if (activeTab === 'returned') return filtered.filter(c => c.claim_stage === 'Returned');
      if (activeTab === 'history') return filtered; 
      return filtered;
    }

    switch (activeTab) {
      case 'inbox':
        filtered = filtered.filter(c => c.assigned_to === user.id);
        break;
      case 'pending':
        // For general pending view (not actionable by them yet)
        filtered = filtered.filter(c => c.assigned_to !== user.id && !['Paid', 'Closed', 'Failed'].includes(c.claim_stage));
        break;
      case 'approved':
        // In a true workflow system, this would check if the user is in the workflow history.
        // For now, if they are not assigned to it, and it's past their stage, we show it.
        filtered = filtered.filter(c => c.assigned_to !== user.id && !['Draft', 'Submitted'].includes(c.claim_stage));
        break;
      case 'returned':
        filtered = filtered.filter(c => c.claim_stage === 'Returned');
        break;
      case 'rejected':
      case 'failed':
        filtered = filtered.filter(c => c.claim_stage === 'Closed' || c.claim_stage === 'Failed');
        break;
      case 'history':
        // Show everything
        break;
      case 'exceptions':
        // Claims without an assignee (routing failed) or breached SLA
        filtered = filtered.filter(c => 
          (c.assigned_to === null && !['Draft', 'Closed', 'Paid'].includes(c.claim_stage)) ||
          c.sla_breach_status?.includes('Breached')
        );
        break;
      default:
        break;
    }

    // Apply Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.claim_number?.toLowerCase().includes(q) || 
        c.employees?.profiles?.full_name?.toLowerCase().includes(q) ||
        c.hospitals?.name?.toLowerCase().includes(q)
      );
    }

    return filtered;
  };

  const filteredClaims = useMemo(() => filterByView(allClaims || []), [allClaims, activeTab, user, searchQuery]);
  const selectedClaim = useMemo(() => filteredClaims.find(c => c.id === selectedClaimId) || null, [filteredClaims, selectedClaimId]);

  // Auto-select first claim
  useEffect(() => {
    if (filteredClaims.length > 0 && (!selectedClaimId || !filteredClaims.find(c => c.id === selectedClaimId))) {
      setSelectedClaimId(filteredClaims[0].id);
    }
  }, [filteredClaims]);

  useEffect(() => {
    if (selectedClaim) {
      setFinalSanctionAmount(Number(selectedClaim.total_amount_eligible || selectedClaim.total_amount_claimed || 0));
      setUtrNumber(`UTR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`);
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setRemarks('');
    }
  }, [selectedClaim]);

  // Actions
  const processClaimAction = async (action: 'approve' | 'return' | 'reject') => {
    if (!selectedClaimId) return;
    
    // Validate inputs
    if (action === 'approve' && user?.role === 'Accounts Officer' && (!finalSanctionAmount || finalSanctionAmount <= 0)) {
      alert('Please enter a valid eligible amount.');
      return;
    }
    
    if (action === 'approve' && user?.role === 'Treasury' && !utrNumber) {
      alert('UTR Reference is required for payment completion.');
      return;
    }

    if ((action === 'return' || action === 'reject') && !remarks) {
      alert('Remarks are required for this action.');
      return;
    }

    try {
      const payload: any = {
        claimId: selectedClaimId,
        action,
        remarks,
        role: user?.role
      };

      if (user?.role === 'Accounts Officer' && action === 'approve') {
        payload.eligibleAmount = finalSanctionAmount;
      }

      if (user?.role === 'Treasury' && action === 'approve') {
        payload.utrNumber = utrNumber;
        payload.paymentDate = paymentDate;
      }

      await apiFetch(`/api/claims/${selectedClaimId}/workflow`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      alert(`Claim successfully ${action}d!`);
      queryClient.invalidateQueries({ queryKey: ['claimsQueue'] });
      setRemarks('');
      setSelectedClaimId(null);
    } catch (e: any) {
      alert(e.message || `Failed to process claim.`);
    }
  };

  const handleApprove = () => processClaimAction('approve');
  const handleReturn = () => processClaimAction('return');
  const handleReject = () => processClaimAction('reject');

  if (claimsLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Determine actionability dynamically based on workflow engine assignment
  const isInboxActionable = activeTab === 'inbox' && (
    selectedClaim?.assigned_to === user.id || 
    (user.role === 'Administrator' && !['Paid', 'Closed'].includes(selectedClaim?.claim_stage))
  );

  return (
    <div className="space-y-6">
      
      {/* Header and Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" /> {user.role} Workspace
            </h1>
            <p className="text-slate-500 text-xs font-semibold mt-1">Manage and process medical claims efficiently.</p>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search claims..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>
        
        <div className="flex overflow-x-auto p-2 gap-1 bg-slate-50/50">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === tab.id 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Pane: Queue List */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[600px]">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
            <h3 className="font-bold text-slate-800 text-sm">{tabs.find(t => t.id === activeTab)?.label} Queue</h3>
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-black text-xs">{filteredClaims.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredClaims.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-400">No claims found in this view.</p>
              </div>
            ) : (
              filteredClaims.map((claim: any) => (
                <button
                  key={claim.id}
                  onClick={() => setSelectedClaimId(claim.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedClaimId === claim.id 
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm' 
                      : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-black text-primary">{claim.claim_number}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      claim.claim_type === 'IPD' ? 'bg-indigo-50 text-indigo-700' : 'bg-teal-50 text-teal-700'
                    }`}>{claim.claim_type}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 truncate mb-1">
                    {claim.employees?.profiles?.full_name || 'Employee Name'}
                  </h4>
                  <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500">
                    <span>INR {Number(claim.total_amount_claimed).toLocaleString()}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(claim.created_at).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Pane: Claim Details & Actions */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[600px] overflow-hidden">
          {selectedClaim ? (
            <div className="flex-1 overflow-y-auto">
              
              {/* Header Info */}
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-800">{selectedClaim.employees?.profiles?.full_name || 'Employee Name'}</h2>
                    <p className="text-xs font-semibold text-slate-500 flex items-center gap-2 mt-1">
                      <Building className="w-3 h-3" /> {selectedClaim.employees?.district} District Police
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Claim Status</div>
                    <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-black">
                      {selectedClaim.claim_stage}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Patient</span>
                    <span className="text-xs font-black text-slate-700">{selectedClaim.patient_type}</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Diagnosis</span>
                    <span className="text-xs font-black text-slate-700 truncate block" title={selectedClaim.diagnosis}>{selectedClaim.diagnosis}</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Hospital</span>
                    <span className="text-xs font-black text-slate-700 truncate block" title={selectedClaim.hospitals?.name}>{selectedClaim.hospitals?.name || 'Unknown'}</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-primary/20 bg-primary/5">
                    <span className="block text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Claimed Amt</span>
                    <span className="text-xs font-black text-primary">₹{Number(selectedClaim.total_amount_claimed).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-8">
                
                {/* AI Summary */}
                {selectedClaim.ai_analysis && (
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Brain className="w-4 h-4 text-violet-600" /> AI Verification Summary
                    </h3>
                    <div className="bg-violet-50 rounded-xl p-4 border border-violet-100 text-xs font-medium text-slate-700">
                      <p className="whitespace-pre-line">{selectedClaim.ai_analysis.analysis_summary}</p>
                      <div className="flex gap-2 mt-3 pt-3 border-t border-violet-200/50">
                        <span className="bg-white px-2 py-1 rounded text-violet-700 font-bold text-[10px]">Risk: {selectedClaim.ai_analysis.risk_score}</span>
                        {selectedClaim.ai_analysis.mismatch_detected && <span className="bg-rose-100 px-2 py-1 rounded text-rose-700 font-bold text-[10px]">Data Mismatch</span>}
                      </div>
                    </div>
                  </div>
                )}

                {/* Documents */}
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3">Attached Documents</h3>
                  {selectedClaim.documents && selectedClaim.documents.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedClaim.documents.map((doc: any) => (
                        <a 
                          key={doc.id} href="#"
                          className="flex items-center justify-between p-3 border border-slate-200 hover:border-primary/45 rounded-xl bg-slate-50 transition-colors text-xs font-bold text-slate-700"
                        >
                          <span className="flex items-center gap-1.5 truncate"><FileText className="w-4 h-4 text-slate-400 shrink-0" /><span className="truncate">{doc.file_name}</span></span>
                          <span className="text-[10px] text-slate-400 uppercase px-1.5 py-0.5 border border-slate-200 bg-white rounded shrink-0">{doc.category}</span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 font-semibold italic">No documents attached.</p>
                  )}
                </div>

                {/* Timeline */}
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3">Workflow Timeline</h3>
                  <div className="border border-slate-100 bg-slate-50 rounded-xl p-4 space-y-4 max-h-48 overflow-y-auto">
                    {selectedClaim.timeline && selectedClaim.timeline.length > 0 ? (
                      selectedClaim.timeline.map((item: any) => (
                        <div key={item.id} className="flex gap-3 text-xs">
                          <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                          <div>
                            <p className="font-bold text-slate-800">{item.stage} <span className="text-[10px] text-slate-400">({new Date(item.created_at || item.timestamp).toLocaleDateString('en-IN')})</span></p>
                            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">By {item.profiles?.full_name || 'System'} ({item.profiles?.role})</p>
                            {item.comments && <p className="text-[11px] text-slate-600 italic mt-1 bg-white p-2 rounded border border-slate-200">{item.comments}</p>}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 font-semibold italic">No history recorded.</p>
                    )}
                  </div>
                </div>

                {/* Action Panel */}
                {isInboxActionable && (
                  <div className="border border-primary/20 bg-primary/5 p-5 rounded-2xl space-y-4">
                    <h3 className="text-xs font-black text-primary uppercase tracking-wider border-b border-primary/10 pb-2">Officer Decision Panel</h3>
                    
                    {user.role === 'Accounts Officer' && (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Approved Eligible Amount (INR) <span className="text-rose-500">*</span></label>
                        <input 
                          type="number"
                          value={finalSanctionAmount}
                          onChange={e => setFinalSanctionAmount(Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-bold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    )}

                    {user.role === 'Treasury' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">UTR Reference <span className="text-rose-500">*</span></label>
                          <input type="text" value={utrNumber} onChange={e => setUtrNumber(e.target.value)} className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-bold focus:outline-none focus:border-primary" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Disbursement Date <span className="text-rose-500">*</span></label>
                          <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-bold focus:outline-none focus:border-primary" />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Remarks / Justification <span className="text-rose-500">*</span></label>
                      <textarea 
                        rows={2}
                        value={remarks}
                        onChange={e => setRemarks(e.target.value)}
                        placeholder="Enter justification for approval, return, or rejection..."
                        className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-bold focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button onClick={handleApprove} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 px-4 rounded-xl text-xs flex justify-center items-center gap-1.5 shadow-sm">
                        <CheckCircle2 className="w-4 h-4" /> {user.role === 'Treasury' ? 'Complete Transfer' : 'Approve & Forward'}
                      </button>
                      <button onClick={handleReturn} className="flex-1 bg-amber-50 text-amber-700 border border-amber-200 font-black py-2.5 px-4 rounded-xl text-xs flex justify-center items-center gap-1.5">
                        <Clock className="w-4 h-4" /> Return for Correction
                      </button>
                      {user.role !== 'Treasury' && (
                        <button onClick={handleReject} className="flex-1 bg-rose-50 text-rose-700 border border-rose-200 font-black py-2.5 px-4 rounded-xl text-xs flex justify-center items-center gap-1.5">
                          <XCircle className="w-4 h-4" /> Reject File
                        </button>
                      )}
                    </div>
                  </div>
                )}
                
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 p-12 text-center text-slate-400">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-sm font-black text-slate-600 mb-1">No Claim Selected</h3>
              <p className="text-xs font-semibold">Select a claim from the queue to view its details and take action.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
      <InboxPageInner />
    </Suspense>
  );
}
