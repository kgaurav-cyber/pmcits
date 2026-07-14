'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';
import Link from 'next/link';
import {
  UserPlus, ChevronRight, AlertCircle, CheckCircle2,
  Loader2, User, Briefcase, Building2, CreditCard, ShieldCheck, Lock, Eye, EyeOff
} from 'lucide-react';

const ROLES = ['Employee', 'Medical Officer', 'Accounts Officer', 'DDO', 'Treasury', 'Administrator'];
const DISTRICTS = ['Central District', 'South District', 'North District', 'East District', 'West District'];
const RANKS = ['Constable', 'Head Constable', 'Assistant Sub Inspector', 'Sub Inspector', 'Inspector', 'Deputy SP', 'SP', 'DIG', 'IGP', 'ADGP', 'DGP'];

const defaultForm = {
  email: '', full_name: '', phone: '', mobile: '',
  district: 'Central District', gpf_cps_number: '', employee_id: '',
  rank: 'Constable', designation: '', police_unit: '', joining_date: '',
  bank_account_no: '', bank_ifsc: '', role: 'Employee'
};

type FormErrors = Partial<Record<keyof typeof defaultForm, string>>;

const F = ({ label, id, required, error, children }: any) => (
  <div className="space-y-1.5">
    <label htmlFor={id} className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {error && <p className="text-[11px] text-red-500 font-medium">{error}</p>}
  </div>
);

const inputCls = (err?: string) => `w-full px-3 py-2.5 rounded-lg border ${err ? 'border-red-300 bg-red-50' : 'border-slate-200'} text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all`;

export default function AddEmployeePage() {
  const { apiFetch, user } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ ...defaultForm });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<any>(null);
  const [activeTab, setActiveTab] = useState(0);

  if (!user || user.role !== 'Administrator') {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 gap-4">
        <AlertCircle className="w-16 h-16 text-red-400" />
        <h2 className="text-xl font-bold text-slate-800">Access Restricted</h2>
      </div>
    );
  }

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Valid email required';
    if (!form.full_name || form.full_name.length < 2) errs.full_name = 'Full name required (min 2 chars)';
    if (!form.gpf_cps_number) errs.gpf_cps_number = 'GPF/CPS number required';
    if (!form.designation) errs.designation = 'Designation required';
    if (!form.bank_account_no) errs.bank_account_no = 'Bank account number required';
    if (!form.bank_ifsc || form.bank_ifsc.length < 5) errs.bank_ifsc = 'Valid IFSC code required';
    if (!form.district) errs.district = 'District required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await apiFetch('/api/users', { method: 'POST', body: JSON.stringify(form) });
      setSuccess(res.data);
    } catch (err: any) {
      alert(err.message || 'Failed to create employee account.');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { label: 'Personal Info', icon: User },
    { label: 'Service Details', icon: Briefcase },
    { label: 'Bank & Role', icon: CreditCard },
  ];

  if (success) {
    const empId = success.employee_details?.employee_id || form.employee_id || 'N/A';
    const email = success.email || form.email;
    const name = success.full_name || form.full_name;

    const copyCredentials = () => {
      const text = `State Department Force - PMCITS Credentials Notice
--------------------------------------------------
Employee Name      : ${name}
Employee ID        : ${empId}
Username / Login ID: ${empId}
Temporary Password : ${success.temp_password}
Official Email     : ${email}
Portal Login URL   : ${window.location.origin}/login
--------------------------------------------------
Note: You must change your temporary password on first login.`;
      navigator.clipboard.writeText(text);
      alert('Credentials copied to clipboard!');
    };

    const sendEmail = async () => {
      try {
        await apiFetch('/api/users/send-onboarding-emails', {
          method: 'POST',
          body: JSON.stringify({
            accounts: [{
              email,
              full_name: name,
              employee_id: empId,
              temp_password: success.temp_password
            }]
          })
        });
        alert('Onboarding email dispatched successfully!');
      } catch (err: any) {
        alert('Failed to send onboarding email: ' + err.message);
      }
    };

    const handlePrint = () => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;
      printWindow.document.write(`
        <html>
          <head>
            <title>PMCITS Credentials - ${empId}</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1E293B; line-height: 1.5; }
              .header { text-align: center; border-bottom: 2px double #E2E8F0; padding-bottom: 20px; margin-bottom: 30px; }
              .govt { font-size: 11px; font-weight: 800; color: #2563EB; text-transform: uppercase; letter-spacing: 0.1em; }
              .title { font-size: 20px; font-weight: 900; margin-top: 5px; color: #0F172A; }
              .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
              .meta-table th, .meta-table td { padding: 12px; border: 1px solid #E2E8F0; text-align: left; font-size: 13px; }
              .meta-table th { background-color: #F8FAFC; font-weight: 700; width: 35%; color: #475569; }
              .meta-table td { font-weight: 600; font-family: monospace; font-size: 14px; }
              .instructions { background-color: #F8FAFC; border: 1px solid #E2E8F0; padding: 20px; border-radius: 8px; margin-bottom: 40px; }
              .instructions h3 { font-size: 13px; margin-top: 0; font-weight: 800; color: #0F172A; }
              .instructions ol { font-size: 12px; padding-left: 20px; color: #334155; }
              .instructions li { margin-bottom: 8px; }
              .warning { background-color: #FEF3C7; border: 1px solid #FCD34D; color: #92400E; padding: 12px; border-radius: 6px; font-size: 11px; font-weight: 700; margin-bottom: 30px; }
              .footer { text-align: center; font-size: 10px; color: #94A3B8; margin-top: 60px; border-top: 1px solid #F1F5F9; padding-top: 20px; font-weight: 600; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="govt">State Department Force</div>
              <div class="title">Police Medical Claims Intelligence & Transparency System (PMCITS)</div>
            </div>
            
            <div class="warning">
              CONFIDENTIAL DOCUMENTS NOTICE: This document contains a temporary password generated for system access. Change it immediately upon logging in. Keep this record in a secure location.
            </div>

            <table class="meta-table">
              <tr>
                <th>Employee Name</th>
                <td>${name}</td>
              </tr>
              <tr>
                <th>Employee ID</th>
                <td>${empId}</td>
              </tr>
              <tr>
                <th>Username</th>
                <td>${empId}</td>
              </tr>
              <tr>
                <th>Temporary Password</th>
                <td style="color: #B45309; font-weight: bold;">${success.temp_password}</td>
              </tr>
              <tr>
                <th>Official Email</th>
                <td>${email}</td>
              </tr>
              <tr>
                <th>Portal Login URL</th>
                <td>${window.location.origin}/login</td>
              </tr>
            </table>

            <div class="instructions">
              <h3>System Access Instructions</h3>
              <ol>
                <li>Open a web browser and navigate to: <strong>${window.location.origin}/login</strong></li>
                <li>Log in using your Username (<strong>${empId}</strong>) and the Temporary Password provided above.</li>
                <li>The system will immediately prompt you to set a new secure personal password.</li>
                <li>Your temporary credentials will expire in 7 days if not activated.</li>
              </ol>
            </div>

            <div class="footer">
              PMCITS Cryptographic Security & Registry Division • Generated on ${new Date().toLocaleString()}
            </div>
            
            <script>
              window.onload = function() { window.print(); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    };

    return (
      <div className="max-w-lg mx-auto mt-10">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm space-y-6">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">Employee Account Created!</h2>
            <p className="text-slate-500 text-sm mt-1">The account has been successfully created.</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-left space-y-4">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600" />
              <p className="text-sm font-bold text-amber-800">Temporary Onboarding Credentials</p>
            </div>
            
            <div className="space-y-2 text-xs">
              <p className="text-slate-600"><strong>Name:</strong> {name}</p>
              <p className="text-slate-600"><strong>Employee ID:</strong> {empId}</p>
              <p className="text-slate-600"><strong>Username:</strong> {empId}</p>
              <p className="text-slate-600"><strong>Official Email:</strong> {email}</p>
              <div className="bg-white border border-amber-250 rounded-lg p-3 flex items-center justify-between gap-3 font-mono">
                <span className="font-bold text-amber-700 select-all">{success.temp_password}</span>
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-500 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5">Temporary</span>
              </div>
            </div>
            
            <p className="text-[10px] text-amber-600 font-extrabold tracking-wide uppercase">
              ⚠️ Warning: This temporary password will never be displayed again.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button onClick={copyCredentials} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-700 transition-all shadow-sm">
              Copy Credentials
            </button>
            <button onClick={sendEmail} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-700 transition-all shadow-sm flex items-center justify-center gap-1.5">
              Send Email
            </button>
            <button onClick={handlePrint} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-700 transition-all shadow-sm">
              Print / Save PDF
            </button>
            <button onClick={() => { setSuccess(null); setForm({ ...defaultForm }); setActiveTab(0); }} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all">
              Close / Add Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <nav className="flex items-center gap-2 text-xs text-slate-400 font-semibold mb-3">
          <Link href="/admin/users" className="hover:text-blue-600 transition-colors">User Management</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-700">Add New Employee</span>
        </nav>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
            <UserPlus className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800">Add New Employee</h1>
            <p className="text-xs text-slate-400 font-medium">Create a new employee account with login access</p>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {tabs.map((tab, i) => (
          <button key={i} onClick={() => setActiveTab(i)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === i ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Tab 0: Personal Info */}
          {activeTab === 0 && (
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <User className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-black text-slate-800">Personal Information</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <F label="Full Name" id="full_name" required error={errors.full_name}>
                  <input id="full_name" type="text" value={form.full_name} onChange={set('full_name')} placeholder="e.g. Rajesh Kumar Singh" className={inputCls(errors.full_name)} />
                </F>
                <F label="Email Address" id="email" required error={errors.email}>
                  <input id="email" type="email" value={form.email} onChange={set('email')} placeholder="rajesh@police.gov.in" className={inputCls(errors.email)} />
                </F>
                <F label="Phone Number" id="phone" error={errors.phone}>
                  <input id="phone" type="text" value={form.phone} onChange={set('phone')} placeholder="011-XXXXXXXX" className={inputCls(errors.phone)} />
                </F>
                <F label="Mobile Number" id="mobile" error={errors.mobile}>
                  <input id="mobile" type="text" value={form.mobile} onChange={set('mobile')} placeholder="9876543210" className={inputCls(errors.mobile)} />
                </F>
                <F label="District" id="district" required error={errors.district}>
                  <select id="district" value={form.district} onChange={set('district')} className={inputCls(errors.district)}>
                    {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </F>
                <F label="Joining Date" id="joining_date" error={errors.joining_date}>
                  <input id="joining_date" type="date" value={form.joining_date} onChange={set('joining_date')} className={inputCls(errors.joining_date)} />
                </F>
              </div>
            </div>
          )}

          {/* Tab 1: Service Details */}
          {activeTab === 1 && (
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Briefcase className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-black text-slate-800">Service Details</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <F label="Employee ID" id="employee_id" error={errors.employee_id}>
                  <input id="employee_id" type="text" value={form.employee_id} onChange={set('employee_id')} placeholder="EMP-2024-001" className={inputCls(errors.employee_id)} />
                </F>
                <F label="GPF / CPS Number" id="gpf_cps_number" required error={errors.gpf_cps_number}>
                  <input id="gpf_cps_number" type="text" value={form.gpf_cps_number} onChange={set('gpf_cps_number')} placeholder="GPF-2024001" className={inputCls(errors.gpf_cps_number)} />
                </F>
                <F label="Rank" id="rank" required error={errors.rank}>
                  <select id="rank" value={form.rank} onChange={set('rank')} className={inputCls(errors.rank)}>
                    {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </F>
                <F label="Designation" id="designation" required error={errors.designation}>
                  <input id="designation" type="text" value={form.designation} onChange={set('designation')} placeholder="e.g. General Duty, Desk Command" className={inputCls(errors.designation)} />
                </F>
                <F label="Police Unit / Station" id="police_unit" error={errors.police_unit}>
                  <input id="police_unit" type="text" value={form.police_unit} onChange={set('police_unit')} placeholder="e.g. Unit-5, PS Connaught Place" className={inputCls(errors.police_unit)} />
                </F>
              </div>
            </div>
          )}

          {/* Tab 2: Bank & Role */}
          {activeTab === 2 && (
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-black text-slate-800">Bank Details & System Role</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <F label="Bank Account Number" id="bank_account_no" required error={errors.bank_account_no}>
                  <input id="bank_account_no" type="text" value={form.bank_account_no} onChange={set('bank_account_no')} placeholder="XXXXXXXXXXXXXX" className={inputCls(errors.bank_account_no)} />
                </F>
                <F label="Bank IFSC Code" id="bank_ifsc" required error={errors.bank_ifsc}>
                  <input id="bank_ifsc" type="text" value={form.bank_ifsc} onChange={set('bank_ifsc')} placeholder="SBIN0001024" className={inputCls(errors.bank_ifsc)} />
                </F>
                <div className="md:col-span-2">
                  <F label="System Role" id="role" required error={errors.role}>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1">
                      {ROLES.map(r => (
                        <button type="button" key={r} onClick={() => setForm(prev => ({ ...prev, role: r }))}
                          className={`px-3 py-2.5 rounded-lg border text-xs font-bold transition-all text-left ${form.role === r ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50'}`}>
                          <ShieldCheck className="w-3.5 h-3.5 mb-1" />
                          {r}
                        </button>
                      ))}
                    </div>
                  </F>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-amber-800">Temporary Password</p>
                    <p className="text-[11px] text-amber-700 mt-0.5">A secure temporary password will be auto-generated. The employee must change it on their first login.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Navigation */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
            <div className="flex gap-2">
              {activeTab > 0 && (
                <button type="button" onClick={() => setActiveTab(t => t - 1)}
                  className="px-4 py-2 border border-slate-200 hover:bg-white text-slate-600 rounded-lg text-xs font-bold transition-all">
                  ← Previous
                </button>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-[11px] text-slate-400 font-semibold">{activeTab + 1} / {tabs.length}</span>
              {activeTab < tabs.length - 1 ? (
                <button type="button" onClick={() => setActiveTab(t => t + 1)}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all">
                  Next →
                </button>
              ) : (
                <button type="submit" disabled={loading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2">
                  {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating...</> : <><UserPlus className="w-3.5 h-3.5" /> Create Employee</>}
                </button>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
