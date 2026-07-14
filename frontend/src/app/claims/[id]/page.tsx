'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useClaimDetails, useApproveClaim, useReturnClaim } from '../../../hooks/useClaims';
import { ArrowLeft, CheckCircle, ShieldAlert, Sparkles, MessageSquare, AlertTriangle, HelpCircle, Download, Brain, FileCheck } from 'lucide-react';
import Link from 'next/link';

const STAGES = [
  { id: 'Submitted', label: 'Submitted' },
  { id: 'AI Verification', label: 'AI Verification' },
  { id: 'Medical Officer Review', label: 'Medical Review' },
  { id: 'Accounts Review', label: 'Accounts Review' },
  { id: 'DDO Approval', label: 'DDO Approval' },
  { id: 'Treasury Processing', label: 'Treasury' },
  { id: 'Paid', label: 'Payment Completed' }
];

export default function ClaimDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token, apiFetch } = useAuth();
  const claimId = params.id as string;

  const { data: claim, isLoading, refetch } = useClaimDetails(claimId);
  const approveMutation = useApproveClaim(claimId);
  const returnMutation = useReturnClaim(claimId);

  const [comments, setComments] = useState('');
  const [sanctionNo, setSanctionNo] = useState('');
  const [utrNo, setUtrNo] = useState('');
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatAnswers, setChatAnswers] = useState<{ q: string; a: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (isLoading || !claim) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleApprove = async () => {
    setErrorMsg(null);
    try {
      const payload: any = { comments };
      
      if (user?.role === 'Accounts Officer') {
        payload.total_eligible = claim.total_amount_claimed; // Assuming full eligibility for now
      }
      if (user?.role === 'DDO') {
        if (!sanctionNo) throw new Error('Sanction number is required for DDO Approval');
        payload.sanction_number = sanctionNo;
      }
      if (user?.role === 'Treasury') {
        if (!utrNo) throw new Error('UTR number is required for Treasury Payment');
        payload.utr_number = utrNo;
      }

      await approveMutation.mutateAsync(payload);
      refetch();
      setComments('');
      setSanctionNo('');
      setUtrNo('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to approve claim.');
    }
  };

  const handleReturn = async () => {
    setErrorMsg(null);
    if (!comments) {
      setErrorMsg('Comments are mandatory when returning a claim.');
      return;
    }
    try {
      await returnMutation.mutateAsync(comments);
      refetch();
      setComments('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to return claim.');
    }
  };

  const handleDownloadSanctionOrder = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/api/claims/${claimId}/sanction-order`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Download failed');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sanction_order_${claim.claim_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download sanction order.');
    }
  };

  const canReview = ['Medical Officer', 'Accounts Officer', 'DDO', 'Treasury'].includes(user?.role || '') && 
                    claim.claim_stage !== 'Paid' && claim.claim_stage !== 'Closed' && claim.claim_stage !== 'Returned';

  const isApproved = ['Treasury Processing', 'Paid'].includes(claim.claim_stage);

  const getStageColor = (stage: string) => {
    if (claim.claim_stage === 'Returned') return 'bg-rose-500';
    if (claim.claim_stage === 'Closed' || claim.claim_stage === 'Paid') return 'bg-emerald-500';
    
    const currentIndex = STAGES.findIndex(s => s.id === claim.claim_stage);
    const stageIndex = STAGES.findIndex(s => s.id === stage);
    
    if (currentIndex === -1) return 'bg-slate-300';
    
    if (stageIndex < currentIndex) return 'bg-blue-500'; // Completed
    if (stageIndex === currentIndex) return 'bg-orange-500 ring-4 ring-orange-200'; // Current
    return 'bg-slate-300'; // Pending
  };

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-700 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">Claim Review: {claim.claim_number}</h1>
            <p className="text-slate-400 text-xs mt-0.5 font-semibold">Diagnosis Reference: <span className="text-slate-600 font-bold">{claim.diagnosis || 'N/A'}</span></p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isApproved && (
            <button 
              onClick={handleDownloadSanctionOrder}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-bold transition-all shadow-sm"
              title="Download Sanction Order PDF"
            >
              <Download className="w-3.5 h-3.5" />
              Sanction Order
            </button>
          )}
          <span className={`px-3 py-1.5 rounded text-[10px] font-bold ${
            claim.claim_stage === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
            claim.claim_stage === 'Returned' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
            'bg-amber-50 text-amber-700 border border-amber-100'
          }`}>
            STAGE: {claim.claim_stage?.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Enterprise Status Timeline */}
      <div className="gov-card p-6 bg-white overflow-hidden">
        <h2 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-6">Workflow Progress Tracker</h2>
        <div className="relative flex items-center justify-between w-full max-w-5xl mx-auto">
          {/* Connecting line */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 -z-10 rounded-full" />
          
          {STAGES.map((stage, idx) => {
            const colorClass = getStageColor(stage.id);
            return (
              <div key={idx} className="flex flex-col items-center relative z-10 w-24">
                <div className={`w-4 h-4 rounded-full transition-all duration-300 ${colorClass}`} />
                <span className="text-[10px] font-bold text-slate-600 mt-2 text-center leading-tight">
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-lg font-bold">
          {errorMsg}
        </div>
      )}

      {/* Split Pane Details layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        <div className="space-y-6">
          
          {/* Claim Metadata Details */}
          <div className="gov-card p-6 space-y-4">
            <h2 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-200 pb-3">Clinical Context</h2>
            <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600">
              <div>
                <span className="text-slate-400 uppercase tracking-wider block mb-1 text-[10px]">Beneficiary Type</span>
                <span>{claim.patient_type}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase tracking-wider block mb-1 text-[10px]">Hospital (Empanelled)</span>
                <span>{claim.hospitals?.name} ({claim.hospitals?.is_empanelled ? 'Yes' : 'No'})</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase tracking-wider block mb-1 text-[10px]">Admission Date</span>
                <span>{claim.admission_date || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase tracking-wider block mb-1 text-[10px]">Discharge Date</span>
                <span>{claim.discharge_date || 'N/A'}</span>
              </div>
            </div>
            
            {/* Display Approved Amount or Sanction if available */}
            {claim.sanction_number && (
              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 flex justify-between">
                <span>Sanction No: {claim.sanction_number}</span>
                <span>Approved: ₹{claim.approved_amount}</span>
              </div>
            )}
          </div>

          {/* AI Auditing Findings Badge */}
          {claim.ai_analysis && (
            <div className="gov-card p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h2 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  AI Verification Engine
                </h2>
                <div className="flex gap-2">
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                    claim.ai_analysis.risk_score === 'High' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                    claim.ai_analysis.risk_score === 'Medium' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                    'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  }`}>
                    Risk: {claim.ai_analysis.risk_score}
                  </span>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                    Doc Score: {claim.ai_analysis.document_score}/100
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-xs font-medium">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Duplicate Invoices Detected</span>
                  <span className={claim.ai_analysis.duplicate_detected ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                    {claim.ai_analysis.duplicate_bill ? 'Duplicate Warning' : 'No matches'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Sum Mismatch Detected</span>
                  <span className={claim.ai_analysis.mismatch_detected ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                    {claim.ai_analysis.amount_mismatch ? 'Discrepancy Found' : 'Totals Match'}
                  </span>
                </div>
                {claim.ai_analysis.missing_documents && claim.ai_analysis.missing_documents !== '[]' && (
                  <div className="p-3 bg-amber-50 text-amber-700 rounded-lg border border-amber-200 font-semibold text-[11px] leading-relaxed">
                    <span className="font-bold block mb-1">Missing required documents:</span>
                    <span>{claim.ai_analysis.missing_documents}</span>
                  </div>
                )}
                <p className="text-slate-500 text-[11px] italic bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed mt-2 font-medium">
                  Summary: {claim.ai_analysis.summary}
                </p>
                <div className="flex justify-end mt-2">
                   <span className="text-primary text-[10px] font-bold uppercase">Recommendation: {claim.ai_analysis.recommendation}</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Review Form */}
          {canReview && (
            <div className="gov-card p-6 space-y-4">
              <h2 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-200 pb-3">Review Action Hub</h2>
              
              {user?.role === 'DDO' && (
                <input 
                  type="text"
                  placeholder="Enter Sanction Number"
                  value={sanctionNo}
                  onChange={(e) => setSanctionNo(e.target.value)}
                  className="gov-input font-semibold text-xs mb-2"
                />
              )}

              {user?.role === 'Treasury' && (
                <input 
                  type="text"
                  placeholder="Enter UTR Number"
                  value={utrNo}
                  onChange={(e) => setUtrNo(e.target.value)}
                  className="gov-input font-semibold text-xs mb-2"
                />
              )}

              <textarea 
                rows={3}
                placeholder="Write audit comments or details of returned request here..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="gov-input font-semibold text-xs"
              />
              <div className="flex gap-4">
                <button 
                  onClick={handleApprove}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg text-xs transition-all shadow-sm flex items-center justify-center gap-1"
                >
                  <CheckCircle className="w-4 h-4" /> {user?.role === 'Treasury' ? 'Mark Paid' : 'Approve & Forward'}
                </button>
                <button 
                  onClick={handleReturn}
                  className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold py-2.5 rounded-lg text-xs transition-all flex items-center justify-center gap-1"
                >
                  <AlertTriangle className="w-4 h-4" /> Return to Employee
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Right Pane: Document Previewer panel */}
        <div className="gov-card p-6 min-h-[60vh] flex flex-col bg-white">
          <div className="border-b border-slate-200 pb-3 mb-4 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-primary" /> Claim Document Viewer
            </h2>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">File Preview</span>
          </div>

          <div className="flex-1 bg-slate-50 rounded-lg border border-slate-200 flex flex-col items-center justify-center p-8 gap-4 text-center">
            {claim.documents?.length === 0 ? (
              <p className="text-xs font-semibold text-slate-400">No medical billing documents attached to this claim.</p>
            ) : (
              <div className="w-full space-y-4">
                <div className="p-3 bg-white border border-slate-200 rounded-lg text-left text-xs font-semibold flex items-center justify-between shadow-sm">
                  <span>{claim.documents?.[0]?.file_name || 'discharge_summary.pdf'}</span>
                  <a 
                    href="#" 
                    className="text-primary hover:underline text-xs font-bold"
                    onClick={(e) => { e.preventDefault(); alert('Signed Supabase storage link requested.'); }}
                  >
                    Open Document File
                  </a>
                </div>
                <div className="w-full h-96 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center">
                  <div className="text-xs text-slate-400 font-medium">
                    <p className="font-bold mb-1">[Visual File Renderer Placeholder]</p>
                    <p>PDF/Image previews generated using pre-signed tokens.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Claim History Timeline indicator */}
      <div className="gov-card p-8 space-y-6 bg-white">
        <h2 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-200 pb-3">Process Timeline & Approval Audit History</h2>
        
        {claim.timeline?.length === 0 ? (
          <p className="text-xs text-slate-400 font-semibold">No actions logged yet.</p>
        ) : (
          <div className="space-y-6">
            {claim.timeline?.map((item: any, index: number) => (
              <div key={item.id} className="flex gap-4 items-start text-xs font-semibold text-slate-600">
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center border-4 border-primary/20" />
                  {index < claim.timeline.length - 1 && <div className="w-0.5 h-12 bg-slate-200 mt-2" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{item.stage}</span>
                    <span className="text-slate-400 text-[10px] font-semibold">| {new Date(item.timestamp || item.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Operator: {item.auth_users?.email || 'System'} {item.role ? `(${item.role})` : ''}</p>
                  {item.remarks && <p className="text-xs italic bg-slate-50 p-2.5 rounded-lg border border-slate-200 mt-2 text-slate-600 font-medium">{item.remarks}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );

}
