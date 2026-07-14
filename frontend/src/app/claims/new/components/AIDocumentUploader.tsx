'use client';

import React, { useState, useRef } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import {
  Upload, FileText, Loader2, CheckCircle, Sparkles, X,
  AlertCircle, Building2, User, Calendar, Pill, Receipt, DollarSign
} from 'lucide-react';

interface ExtractedData {
  document_type?: string;
  hospital_name?: string;
  doctor_name?: string;
  patient_name?: string;
  bill_number?: string;
  bill_date?: string;
  admission_date?: string;
  discharge_date?: string;
  diagnosis?: string;
  medicines?: string[];
  total_amount?: number;
  line_items?: { description: string; category: string; amount: number }[];
  confidence_notes?: string;
}

interface UploadedDoc {
  id: string;
  fileName: string;
  documentType: string;
  fileUrl: string;
  extracted?: ExtractedData;
  status: 'uploading' | 'analyzing' | 'done' | 'error';
  error?: string;
}

interface Props {
  claimId?: string;
  onAutoFill?: (data: ExtractedData) => void;
}

const DOC_TYPES = ['Bill', 'Prescription', 'Discharge Summary', 'Diagnostic Report'];

const categoryIcon: Record<string, string> = {
  'Room Rent': '🛏️',
  'Medicines': '💊',
  'Consultation': '👨‍⚕️',
  'Lab Diagnostics': '🧪',
  'Surgery': '🏥',
  'Other': '📋',
};

export function AIDocumentUploader({ claimId, onAutoFill }: Props) {
  const { apiFetch } = useAuth();
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [selectedType, setSelectedType] = useState('Bill');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    const docId = `doc-${Date.now()}`;
    const newDoc: UploadedDoc = {
      id: docId,
      fileName: file.name,
      documentType: selectedType,
      fileUrl: '',
      status: 'uploading'
    };

    setUploadedDocs(prev => [...prev, newDoc]);

    try {
      // Step 1: Convert file to data URL (base64) for direct GPT-4o analysis
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const dataUrl = await base64Promise;

      // Mark as analyzing
      setUploadedDocs(prev => prev.map(d => d.id === docId ? { ...d, fileUrl: dataUrl, status: 'analyzing' } : d));

      // Step 2: Call AI analyze-document endpoint
      const res = await apiFetch('/api/ai/analyze-document', {
        method: 'POST',
        body: JSON.stringify({ file_url: dataUrl, document_type: selectedType })
      });

      const extracted: ExtractedData = res.data;

      setUploadedDocs(prev => prev.map(d =>
        d.id === docId ? { ...d, extracted, status: 'done' } : d
      ));
    } catch (err: any) {
      setUploadedDocs(prev => prev.map(d =>
        d.id === docId ? { ...d, status: 'error', error: err?.message || 'Analysis failed' } : d
      ));
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(processFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeDoc = (id: string) => {
    setUploadedDocs(prev => prev.filter(d => d.id !== id));
  };

  const handleAutoFill = (doc: UploadedDoc) => {
    if (doc.extracted && onAutoFill) {
      onAutoFill(doc.extracted);
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Banner */}
      <div className="p-4 bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-200 rounded-xl flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-black text-violet-900">AI Document Analysis Active</p>
          <p className="text-xs text-violet-700 font-medium mt-0.5">
            Upload any medical document — GPT-4o OCR will extract all fields and auto-fill your claim form.
          </p>
        </div>
      </div>

      {/* Document Type Selector */}
      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Document Type</label>
        <div className="flex flex-wrap gap-2">
          {DOC_TYPES.map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                selectedType === type
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-primary/40'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all ${
          dragOver
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-slate-300 hover:border-primary/40 bg-slate-50'
        }`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${dragOver ? 'bg-primary text-white' : 'bg-blue-100 text-blue-600'}`}>
          <Upload className="w-8 h-8" />
        </div>
        <div className="text-center">
          <p className="text-sm font-black text-slate-700">
            {dragOver ? 'Drop to analyze' : `Drop ${selectedType} or click to browse`}
          </p>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">PDF, JPG, PNG — Max 5MB</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png"
          multiple
          onChange={e => handleFileSelect(e.target.files)}
        />
      </div>

      {/* Uploaded Documents */}
      {uploadedDocs.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
            Analyzed Documents ({uploadedDocs.length})
          </h3>
          {uploadedDocs.map(doc => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onRemove={() => removeDoc(doc.id)}
              onAutoFill={() => handleAutoFill(doc)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DocumentCard({ doc, onRemove, onAutoFill }: { doc: UploadedDoc; onRemove: () => void; onAutoFill: () => void }) {
  const [expanded, setExpanded] = useState(true);
  const e = doc.extracted;

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Card Header */}
      <div className={`px-4 py-3 flex items-center gap-3 ${
        doc.status === 'done' ? 'bg-emerald-50' :
        doc.status === 'error' ? 'bg-rose-50' :
        'bg-slate-50'
      }`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          doc.status === 'done' ? 'bg-emerald-500 text-white' :
          doc.status === 'error' ? 'bg-rose-500 text-white' :
          'bg-slate-200 text-slate-500'
        }`}>
          {doc.status === 'uploading' || doc.status === 'analyzing'
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : doc.status === 'done'
            ? <CheckCircle className="w-4 h-4" />
            : <AlertCircle className="w-4 h-4" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-slate-800 truncate">{doc.fileName}</p>
          <p className="text-[10px] font-semibold text-slate-500">
            {doc.status === 'uploading' ? 'Uploading...' :
             doc.status === 'analyzing' ? '🤖 GPT-4o analyzing...' :
             doc.status === 'done' ? `${doc.documentType} — Extraction Complete` :
             `Error: ${doc.error}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {doc.status === 'done' && (
            <>
              <button
                type="button"
                onClick={onAutoFill}
                className="px-3 py-1.5 bg-primary text-white rounded-lg text-[10px] font-black hover:bg-primary-dark transition-colors flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" /> Auto-Fill
              </button>
              <button type="button" onClick={() => setExpanded(p => !p)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <FileText className="w-4 h-4" />
              </button>
            </>
          )}
          <button type="button" onClick={onRemove} className="text-slate-300 hover:text-rose-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Extracted Data Panel */}
      {doc.status === 'done' && e && expanded && (
        <div className="p-4 bg-white space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {e.hospital_name && (
              <InfoChip icon={<Building2 className="w-3.5 h-3.5" />} label="Hospital" value={e.hospital_name} />
            )}
            {e.doctor_name && (
              <InfoChip icon={<User className="w-3.5 h-3.5" />} label="Doctor" value={e.doctor_name} />
            )}
            {e.bill_number && (
              <InfoChip icon={<Receipt className="w-3.5 h-3.5" />} label="Bill No." value={e.bill_number} />
            )}
            {e.bill_date && (
              <InfoChip icon={<Calendar className="w-3.5 h-3.5" />} label="Bill Date" value={e.bill_date} />
            )}
            {e.admission_date && (
              <InfoChip icon={<Calendar className="w-3.5 h-3.5" />} label="Admission" value={e.admission_date} />
            )}
            {e.discharge_date && (
              <InfoChip icon={<Calendar className="w-3.5 h-3.5" />} label="Discharge" value={e.discharge_date} />
            )}
            {e.total_amount != null && (
              <InfoChip icon={<DollarSign className="w-3.5 h-3.5" />} label="Amount" value={`₹ ${e.total_amount.toLocaleString('en-IN')}`} highlight />
            )}
          </div>

          {e.diagnosis && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider mb-1">Diagnosis Extracted</p>
              <p className="text-xs font-semibold text-blue-900">{e.diagnosis}</p>
            </div>
          )}

          {e.medicines && e.medicines.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Pill className="w-3 h-3" /> Medicines ({e.medicines.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {e.medicines.map((m, i) => (
                  <span key={i} className="px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded text-[10px] font-bold">{m}</span>
                ))}
              </div>
            </div>
          )}

          {e.line_items && e.line_items.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Bill Line Items</p>
              <div className="space-y-1">
                {e.line_items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50 text-xs border-b border-slate-50 last:border-0">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <span>{categoryIcon[item.category] || '📋'}</span>
                      {item.description}
                    </span>
                    <span className="font-black text-slate-800">₹ {item.amount.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {e.confidence_notes && (
            <p className="text-[10px] text-amber-600 font-semibold bg-amber-50 border border-amber-100 px-3 py-2 rounded-lg">
              ⚠️ {e.confidence_notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function InfoChip({ icon, label, value, highlight = false }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-2.5 border ${highlight ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-0.5">
        {icon} {label}
      </p>
      <p className={`text-xs font-black truncate ${highlight ? 'text-emerald-700' : 'text-slate-800'}`}>{value}</p>
    </div>
  );
}
