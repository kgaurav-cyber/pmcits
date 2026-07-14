'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import Link from 'next/link';
import {
  Upload, ChevronRight, Loader2, AlertCircle, CheckCircle2,
  XCircle, Download, FileSpreadsheet, Trash2, Eye, Table2, Users
} from 'lucide-react';
import * as XLSX from 'xlsx';

const REQUIRED_COLS = ['email', 'full_name', 'gpf_cps_number', 'district', 'rank', 'designation', 'bank_account_no', 'bank_ifsc'];
const OPTIONAL_COLS = ['employee_id', 'mobile', 'police_unit', 'joining_date', 'role', 'phone'];

export default function BulkImportPage() {
  const { apiFetch, user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [fileName, setFileName] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'results'>('upload');

  if (!user || user.role !== 'Administrator') {
    return <div className="flex flex-col items-center justify-center min-h-96"><AlertCircle className="w-12 h-12 text-red-400" /><p className="mt-2 text-slate-500">Access Restricted</p></div>;
  }

  const downloadTemplate = () => {
    const templateData = [
      {
        email: 'officer1@police.gov.in', full_name: 'Rajesh Kumar',
        gpf_cps_number: 'GPF-2024100', employee_id: 'EMP-001',
        district: 'Central District', rank: 'Inspector',
        designation: 'Welfare Admin', police_unit: 'Unit-5',
        mobile: '9876543210', phone: '011-12345678',
        joining_date: '2022-01-15',
        bank_account_no: '9903920392', bank_ifsc: 'SBIN0001024', role: 'Employee'
      },
      {
        email: 'officer2@police.gov.in', full_name: 'Priya Verma',
        gpf_cps_number: 'GPF-2024101', employee_id: 'EMP-002',
        district: 'South District', rank: 'Sub Inspector',
        designation: 'General Duty', police_unit: 'Unit-3',
        mobile: '9876543211', phone: '',
        joining_date: '2023-06-01',
        bank_account_no: '1234567890', bank_ifsc: 'SBIN0002048', role: 'Employee'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');
    XLSX.writeFile(wb, 'pmcits_bulk_import_template.xlsx');
  };

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        if (!data.length) {
          setValidationErrors(['Spreadsheet is empty. Add at least one row of data.']);
          return;
        }

        // Validate required columns
        const errors: string[] = [];
        const headers = Object.keys(data[0]);
        const missingCols = REQUIRED_COLS.filter(c => !headers.includes(c));
        if (missingCols.length > 0) {
          errors.push(`Missing required columns: ${missingCols.join(', ')}`);
        }

        // Validate each row
        data.forEach((row, i) => {
          if (!row.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
            errors.push(`Row ${i + 1}: Invalid or missing email`);
          }
          if (!row.full_name) errors.push(`Row ${i + 1}: Missing full_name`);
          if (!row.gpf_cps_number) errors.push(`Row ${i + 1}: Missing gpf_cps_number`);
          if (!row.bank_account_no) errors.push(`Row ${i + 1}: Missing bank_account_no`);
          if (!row.bank_ifsc) errors.push(`Row ${i + 1}: Missing bank_ifsc`);
        });

        setValidationErrors(errors);
        setRows(data);
        if (errors.length === 0) setStep('preview');
      } catch (err: any) {
        setValidationErrors(['Failed to parse file: ' + (err.message || 'Unknown error')]);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  }, []);

  const handleImport = async () => {
    setImporting(true);
    try {
      const res = await apiFetch('/api/users/bulk-import', { method: 'POST', body: JSON.stringify({ rows }) });
      setResults(res.data);
      setStep('results');
    } catch (err: any) {
      alert('Import failed: ' + (err.message || 'Unknown error'));
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setRows([]);
    setFileName('');
    setValidationErrors([]);
    setResults(null);
    setStep('upload');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
        <Link href="/admin/users" className="hover:text-blue-600 transition-colors">User Management</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-700">Bulk Import</span>
      </nav>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
          <Upload className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-800">Bulk Import Employees</h1>
          <p className="text-xs text-slate-400 font-medium">Upload an Excel spreadsheet to create multiple employee accounts</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-0 bg-white border border-slate-200 rounded-xl p-1">
        {[
          { id: 'upload', label: '1. Upload', icon: Upload },
          { id: 'preview', label: '2. Preview', icon: Eye },
          { id: 'results', label: '3. Results', icon: CheckCircle2 },
        ].map((s, i) => {
          const isActive = step === s.id;
          const isPast = (step === 'preview' && i === 0) || (step === 'results' && i < 2);
          return (
            <div key={s.id} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
              isActive ? 'bg-blue-600 text-white shadow-sm' : isPast ? 'text-blue-600' : 'text-slate-400'
            }`}>
              <s.icon className="w-3.5 h-3.5" />
              {s.label}
            </div>
          );
        })}
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="space-y-4">
          {/* Template Download */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800">Download Template</p>
                  <p className="text-xs text-slate-500 mt-0.5">Pre-formatted Excel template with sample data</p>
                </div>
              </div>
              <button onClick={downloadTemplate}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all">
                <Download className="w-3.5 h-3.5" /> Download .xlsx
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <p className="text-[10px] font-black text-blue-700 uppercase tracking-wider mb-1.5">Required Columns</p>
                <div className="flex flex-wrap gap-1">
                  {REQUIRED_COLS.map(c => (
                    <span key={c} className="text-[10px] font-mono bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{c}</span>
                  ))}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Optional Columns</p>
                <div className="flex flex-wrap gap-1">
                  {OPTIONAL_COLS.map(c => (
                    <span key={c} className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{c}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Upload Area */}
          <label className="block bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/20 transition-all group relative">
            <Upload className="w-10 h-10 text-slate-300 group-hover:text-blue-400 mx-auto mb-3 transition-colors" />
            <p className="text-sm font-bold text-slate-600">Drop your Excel file here or click to browse</p>
            <p className="text-xs text-slate-400 mt-1.5">.xlsx or .xls • Maximum 200 records per import</p>
            <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
          </label>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-2">
              <p className="text-sm font-bold text-red-800 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Validation Errors ({validationErrors.length})</p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {validationErrors.map((err, i) => (
                  <p key={i} className="text-[11px] text-red-600 font-medium">• {err}</p>
                ))}
              </div>
              <button onClick={reset} className="text-xs font-bold text-red-700 hover:underline mt-2">Clear & try again</button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <Table2 className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-sm font-black text-slate-800">Data Preview</p>
                  <p className="text-[11px] text-slate-400">{fileName} · {rows.length} records found</p>
                </div>
              </div>
              <button onClick={reset} className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 font-semibold transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 sticky top-0">
                    <th className="px-4 py-2 font-black text-slate-500 uppercase tracking-wider">#</th>
                    <th className="px-4 py-2 font-black text-slate-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-2 font-black text-slate-500 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-2 font-black text-slate-500 uppercase tracking-wider">GPF No.</th>
                    <th className="px-4 py-2 font-black text-slate-500 uppercase tracking-wider">Rank</th>
                    <th className="px-4 py-2 font-black text-slate-500 uppercase tracking-wider">District</th>
                    <th className="px-4 py-2 font-black text-slate-500 uppercase tracking-wider">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50/70">
                      <td className="px-4 py-2 text-slate-400 font-mono">{i + 1}</td>
                      <td className="px-4 py-2 font-semibold text-slate-800">{row.full_name}</td>
                      <td className="px-4 py-2 text-slate-600">{row.email}</td>
                      <td className="px-4 py-2 font-mono text-slate-600">{row.gpf_cps_number}</td>
                      <td className="px-4 py-2 text-slate-600">{row.rank}</td>
                      <td className="px-4 py-2 text-slate-600">{row.district}</td>
                      <td className="px-4 py-2"><span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-semibold">{row.role || 'Employee'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <button onClick={reset}
              className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-bold transition-all">
              ← Back
            </button>
            <button onClick={handleImport} disabled={importing}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-all shadow-sm">
              {importing ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing {rows.length} records...</> : <><Users className="w-4 h-4" /> Import {rows.length} Employees</>}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Results */}
      {step === 'results' && results && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-3xl font-black text-emerald-700">{results.success_count}</p>
              <p className="text-xs text-emerald-600 font-bold mt-1">Successfully Created</p>
            </div>
            <div className={`${results.failure_count > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-6 text-center`}>
              <XCircle className={`w-8 h-8 mx-auto mb-2 ${results.failure_count > 0 ? 'text-red-500' : 'text-slate-300'}`} />
              <p className={`text-3xl font-black ${results.failure_count > 0 ? 'text-red-700' : 'text-slate-400'}`}>{results.failure_count}</p>
              <p className={`text-xs font-bold mt-1 ${results.failure_count > 0 ? 'text-red-600' : 'text-slate-400'}`}>Failed</p>
            </div>
          </div>

          {/* Successes with temp passwords */}
          {results.successes?.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-emerald-50 flex items-center justify-between">
                <p className="text-sm font-black text-emerald-800">Created Accounts & Temporary Passwords</p>
                <button onClick={() => {
                  const text = results.successes.map((s: any) => `${s.email}\t${s.temp_password}`).join('\n');
                  navigator.clipboard.writeText(text);
                  alert('Copied all passwords to clipboard!');
                }} className="text-xs font-bold text-emerald-700 hover:underline">Copy All</button>
              </div>
              <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                {results.successes.map((s: any, i: number) => (
                  <div key={i} className="px-6 py-3 flex justify-between items-center hover:bg-slate-50/70">
                    <span className="text-xs font-semibold text-slate-700">{s.email}</span>
                    <code className="font-mono text-xs font-bold text-amber-600 select-all bg-amber-50 px-2 py-0.5 rounded">{s.temp_password}</code>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Failures */}
          {results.failures?.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-2">
              <p className="text-sm font-black text-red-800">Failed Imports</p>
              <div className="max-h-40 overflow-y-auto space-y-1.5">
                {results.failures.map((f: any, i: number) => (
                  <div key={i} className="text-[11px] text-red-700 font-medium bg-white p-2 rounded-lg border border-red-100">
                    <strong>{f.email}</strong>: {f.error}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <button onClick={reset}
              className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-bold transition-all">
              Import More
            </button>
            <Link href="/admin/users"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all">
              View All Employees
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
