'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../../context/AuthContext';
import {
  ArrowLeft, Shield, AlertTriangle, CheckCircle, XCircle, FileText,
  Brain, MessageSquare, Send, Loader2, ChevronRight, TrendingUp,
  Copy, RefreshCw, AlertCircle, Info
} from 'lucide-react';

interface AIAnalysis {
  risk_score: 'Low' | 'Medium' | 'High';
  duplicate_detected: boolean;
  mismatch_detected: boolean;
  missing_documents: string[];
  analysis_summary: string;
  ai_recommendation: string;
  details: {
    duplicate_scans?: { checked_hashes_count: number; duplicate_found: boolean };
    amounts_scans?: { inputted_total: number; bill_items_sum: number; mismatch_found: boolean };
    date_mismatch?: { detected: boolean; admission_date: string; discharge_date: string };
    key_flags?: string[];
    advisory?: string;
    score_points?: number;
    audited_at?: string;
  };
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

const riskConfig = {
  Low: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icon: <CheckCircle className="w-6 h-6 text-emerald-600" />,
    bar: 'bg-emerald-500',
    barWidth: '25%',
    label: 'Low Risk'
  },
  Medium: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    icon: <AlertTriangle className="w-6 h-6 text-amber-500" />,
    bar: 'bg-amber-400',
    barWidth: '60%',
    label: 'Medium Risk'
  },
  High: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    badge: 'bg-rose-100 text-rose-800 border-rose-300',
    icon: <XCircle className="w-6 h-6 text-rose-600" />,
    bar: 'bg-rose-500',
    barWidth: '95%',
    label: 'High Risk'
  }
};

function CheckRow({ pass, label, detail }: { pass: boolean; label: string; detail?: string }) {
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${pass ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${pass ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
        {pass ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
      </div>
      <div>
        <p className={`text-sm font-black ${pass ? 'text-emerald-800' : 'text-rose-800'}`}>{label}</p>
        {detail && <p className={`text-xs font-semibold mt-0.5 ${pass ? 'text-emerald-600' : 'text-rose-600'}`}>{detail}</p>}
      </div>
      <div className={`ml-auto text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${pass ? 'text-emerald-700 border-emerald-300 bg-emerald-100' : 'text-rose-700 border-rose-300 bg-rose-100'}`}>
        {pass ? 'PASS' : 'FLAG'}
      </div>
    </div>
  );
}

export default function AIReportPage() {
  const params = useParams();
  const router = useRouter();
  const { user, apiFetch } = useAuth();
  const claimId = params.id as string;

  const [claim, setClaim] = useState<any>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{
    role: 'assistant',
    text: '👋 Hello, Officer! I am the PMCITS AI Assistant. I can help you understand this claim, verify CGHS compliance, and identify any anomalies. What would you like to know?'
  }]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [claimRes, analysisRes] = await Promise.all([
        apiFetch(`/api/claims/${claimId}`),
        apiFetch(`/api/claims/${claimId}`).catch(() => null)
      ]);
      setClaim(claimRes.data);
      // Try to pull existing analysis from claim data
      if (claimRes.data?.ai_analysis) {
        setAnalysis(claimRes.data.ai_analysis);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    setRunning(true);
    try {
      const res = await apiFetch(`/api/ai/claims/${claimId}/full-analysis`, { method: 'POST' });
      setAnalysis(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [claimId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const question = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: question }]);
    setChatLoading(true);
    try {
      const res = await apiFetch(`/api/ai/claims/${claimId}/assistant`, {
        method: 'POST',
        body: JSON.stringify({ question })
      });
      setChatMessages(prev => [...prev, { role: 'assistant', text: res.data.answer }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', text: '⚠️ Unable to reach the AI assistant right now. Please try again shortly.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const isOfficer = ['Medical Officer', 'Accounts Officer', 'DDO', 'Administrator'].includes(user?.role || '');

  if (!isOfficer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96">
        <Shield className="w-12 h-12 text-slate-300" />
        <p className="text-slate-500 font-semibold mt-3">Access restricted to Medical Officers.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-96"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  const risk = analysis ? riskConfig[analysis.risk_score] : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/claims/${claimId}`} className="text-slate-400 hover:text-slate-700 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">AI Verification Report</h1>
            <div className="px-2 py-0.5 bg-violet-100 text-violet-700 text-[10px] font-black rounded-full border border-violet-200 uppercase tracking-wider flex items-center gap-1">
              <Brain className="w-3 h-3" /> GPT-4o
            </div>
          </div>
          <nav className="flex items-center gap-1 text-xs text-slate-400 font-semibold mt-1">
            <Link href="/dashboard" className="hover:text-primary">Dashboard</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href={`/claims/${claimId}`} className="hover:text-primary">Claim</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-700">AI Report</span>
          </nav>
        </div>

        <button
          onClick={runAnalysis}
          disabled={running}
          className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-violet-500/20 disabled:opacity-60"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {running ? 'Analyzing...' : analysis ? 'Re-run Analysis' : 'Run AI Analysis'}
        </button>
      </div>

      {/* Claim Quick Info */}
      {claim && (
        <div className="gov-card p-5 flex items-center gap-6 flex-wrap">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Claim No.</p>
            <p className="text-sm font-black text-slate-800">{claim.claim_number}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Type</p>
            <p className="text-sm font-black text-slate-800">{claim.claim_type}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Hospital</p>
            <p className="text-sm font-black text-slate-800">{claim.hospitals?.name || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Amount Claimed</p>
            <p className="text-sm font-black text-emerald-700">₹ {Number(claim.total_amount_claimed || 0).toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Status</p>
            <p className="text-sm font-black text-slate-800">{claim.status}</p>
          </div>
        </div>
      )}

      {!analysis && !running && (
        <div className="gov-card p-12 flex flex-col items-center text-center gap-4">
          <div className="w-20 h-20 rounded-3xl bg-violet-100 text-violet-600 flex items-center justify-center">
            <Brain className="w-10 h-10" />
          </div>
          <h2 className="text-lg font-black text-slate-800">No AI Analysis Yet</h2>
          <p className="text-sm text-slate-500 max-w-sm font-medium">
            Click <strong>"Run AI Analysis"</strong> to trigger the GPT-4o verification pipeline. The AI will check for duplicates, mismatches, missing documents, and generate a risk score.
          </p>
        </div>
      )}

      {running && (
        <div className="gov-card p-12 flex flex-col items-center text-center gap-4">
          <div className="w-20 h-20 rounded-3xl bg-violet-100 text-violet-600 flex items-center justify-center animate-pulse">
            <Brain className="w-10 h-10" />
          </div>
          <h2 className="text-lg font-black text-slate-800">AI Analysis In Progress</h2>
          <p className="text-sm text-slate-500 max-w-sm font-medium">
            Running duplicate detection, mismatch verification, missing document checks, and generating GPT-4o summary...
          </p>
          <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-violet-600 rounded-full animate-pulse w-3/4" />
          </div>
        </div>
      )}

      {analysis && !running && (
        <>
          {/* Risk Score Card */}
          <div className={`gov-card p-6 border-2 ${risk?.border}`}>
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${risk?.bg}`}>
                {risk?.icon}
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">AI Risk Assessment</p>
                <div className="flex items-center gap-3 mt-1">
                  <h2 className="text-2xl font-black text-slate-800">{risk?.label}</h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-black border ${risk?.badge}`}>
                    Score: {analysis.details?.score_points ?? '—'} pts
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full mt-3 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${risk?.bar}`} style={{ width: risk?.barWidth }} />
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Audited At</p>
                <p className="text-xs font-semibold text-slate-600">
                  {analysis.details?.audited_at ? new Date(analysis.details.audited_at).toLocaleString('en-IN') : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Fraud Detection Grid */}
          <div className="gov-card p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Shield className="w-4 h-4 text-violet-600" />
              <h2 className="text-sm font-black text-slate-800">Fraud Detection Results</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <CheckRow
                pass={!analysis.duplicate_detected}
                label="Duplicate Bill Detection"
                detail={analysis.duplicate_detected
                  ? `Matching document hash found in another claim.`
                  : `No matching document hashes found across ${analysis.details?.duplicate_scans?.checked_hashes_count ?? 0} scanned documents.`}
              />
              <CheckRow
                pass={!analysis.mismatch_detected}
                label="Bill Amount Verification"
                detail={analysis.mismatch_detected
                  ? `Total claimed (₹${analysis.details?.amounts_scans?.inputted_total?.toLocaleString('en-IN')}) ≠ bill items sum (₹${analysis.details?.amounts_scans?.bill_items_sum?.toLocaleString('en-IN')})`
                  : `Claimed amount matches sum of bill line items.`}
              />
              <CheckRow
                pass={!analysis.details?.date_mismatch?.detected}
                label="Date Consistency Check"
                detail={analysis.details?.date_mismatch?.detected
                  ? `Bill dates fall outside the admission–discharge window.`
                  : `All bill dates within the treatment period.`}
              />
              <CheckRow
                pass={analysis.missing_documents.length === 0}
                label="Document Completeness"
                detail={analysis.missing_documents.length > 0
                  ? `Missing: ${analysis.missing_documents.join(', ')}`
                  : `All required documents are present.`}
              />
            </div>
          </div>

          {/* Key Flags */}
          {analysis.details?.key_flags && analysis.details.key_flags.length > 0 && (
            <div className="gov-card p-6 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-black text-slate-800">Investigation Flags</h2>
              </div>
              <div className="space-y-2">
                {analysis.details.key_flags.map((flag, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold text-amber-900">{flag}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Officer Summary */}
          {analysis.analysis_summary && (
            <div className="gov-card p-6 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <FileText className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-black text-slate-800">AI Officer Summary</h2>
                <button
                  onClick={() => navigator.clipboard.writeText(analysis.analysis_summary)}
                  className="ml-auto text-slate-400 hover:text-slate-700 transition-colors"
                  title="Copy summary"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <div className="prose prose-sm prose-slate max-w-none text-slate-700 text-sm font-medium leading-relaxed whitespace-pre-line">
                {analysis.analysis_summary}
              </div>
            </div>
          )}

          {/* AI Recommendation */}
          {analysis.ai_recommendation && (
            <div className="gov-card p-6 space-y-4 border-l-4 border-violet-500">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Brain className="w-4 h-4 text-violet-600" />
                <h2 className="text-sm font-black text-slate-800">AI Recommendation</h2>
                <span className="ml-auto px-2 py-0.5 bg-violet-100 text-violet-700 text-[9px] font-black rounded-full border border-violet-200 uppercase tracking-wider">Advisory Only</span>
              </div>
              <p className="text-sm font-semibold text-slate-700 leading-relaxed">{analysis.ai_recommendation}</p>
              {analysis.details?.advisory && (
                <div className="flex items-start gap-2 p-3 bg-violet-50 border border-violet-100 rounded-xl">
                  <Info className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-violet-800">{analysis.details.advisory}</p>
                </div>
              )}

              {/* Disclaimer */}
              <div className="mt-4 p-3 bg-slate-900 text-slate-200 rounded-xl flex items-start gap-2">
                <Shield className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold leading-relaxed">
                  <span className="text-white">⚠️ IMPORTANT: </span>
                  AI analysis is purely advisory and NEVER approves or rejects claims. The Medical Officer is the sole authority responsible for the final decision on this reimbursement claim.
                </p>
              </div>
            </div>
          )}

          {/* Officer AI Assistant Chat */}
          <div className="gov-card overflow-hidden flex flex-col" style={{ minHeight: '500px' }}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-800">Officer AI Assistant</h2>
                <p className="text-[10px] text-slate-400 font-semibold">Ask anything about this claim — CGHS compliance, eligibility, anomalies</p>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-6 space-y-4 overflow-y-auto" style={{ maxHeight: '400px' }}>
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-violet-100 text-violet-700'}`}>
                    {msg.role === 'user' ? <User /> : <Brain className="w-4 h-4" />}
                  </div>
                  <div className={`max-w-[75%] p-4 rounded-2xl text-sm font-medium leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-white rounded-tr-sm'
                      : 'bg-slate-50 text-slate-700 border border-slate-200 rounded-tl-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                    <Brain className="w-4 h-4" />
                  </div>
                  <div className="p-4 rounded-2xl rounded-tl-sm bg-slate-50 border border-slate-200 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-violet-600 animate-spin" />
                    <span className="text-xs text-slate-400 font-semibold">AI is analyzing...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Prompts */}
            <div className="px-6 pb-3 flex gap-2 flex-wrap">
              {[
                'Does the amount exceed CGHS limits?',
                'Are there any suspicious patterns?',
                'Should I request more documents?'
              ].map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => { setChatInput(q); }}
                  className="px-3 py-1.5 border border-violet-200 bg-violet-50 text-violet-700 text-[10px] font-bold rounded-lg hover:bg-violet-100 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-100 flex gap-3">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Ask about this claim..."
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 bg-slate-50"
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={!chatInput.trim() || chatLoading}
                className="w-11 h-11 rounded-xl bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center transition-colors disabled:opacity-40"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function User() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}
