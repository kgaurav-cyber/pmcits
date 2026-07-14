'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../../../context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Edit3, ChevronRight, Loader2, AlertCircle, CheckCircle2,
  User, Briefcase, CreditCard, ShieldCheck, Save
} from 'lucide-react';

const ROLES = ['Employee', 'Medical Officer', 'Accounts Officer', 'DDO', 'Treasury', 'Administrator'];
const DISTRICTS = ['Central District', 'South District', 'North District', 'East District', 'West District'];
const RANKS = ['Constable', 'Head Constable', 'Assistant Sub Inspector', 'Sub Inspector', 'Inspector', 'Deputy SP', 'SP', 'DIG', 'IGP', 'ADGP', 'DGP'];

const F = ({ label, id, required, error, children }: any) => (
  <div className="space-y-1.5">
    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
    {children}
    {error && <p className="text-[11px] text-red-500 font-medium">{error}</p>}
  </div>
);

const inputCls = (err?: string) => `w-full px-3 py-2.5 rounded-lg border ${err ? 'border-red-300 bg-red-50' : 'border-slate-200'} text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all`;

export default function EditEmployeePage() {
  const { apiFetch, user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [employeeName, setEmployeeName] = useState('');

  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', mobile: '', district: 'Central District',
    gpf_cps_number: '', employee_id: '', rank: 'Constable', designation: '',
    police_unit: '', joining_date: '', bank_account_no: '', bank_ifsc: '', role: 'Employee'
  });

  const [errors, setErrors] = useState<Partial<typeof form>>({});

  useEffect(() => {
    if (!userId || !user) return;
    (async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/api/users/${userId}`);
        const d = res.data;
        const emp = d.employees || {};
        setEmployeeName(d.full_name);
        setForm({
          full_name: d.full_name || '',
          email: d.email || '',
          phone: d.phone || '',
          mobile: emp.mobile || '',
          district: d.district || 'Central District',
          gpf_cps_number: emp.gpf_cps_number || '',
          employee_id: emp.employee_id || '',
          rank: emp.rank || 'Constable',
          designation: emp.designation || '',
          police_unit: emp.police_unit || '',
          joining_date: emp.joining_date ? emp.joining_date.split('T')[0] : '',
          bank_account_no: emp.bank_account_no || '',
          bank_ifsc: emp.bank_ifsc || '',
          role: d.role || 'Employee',
        });
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [userId, user]);

  if (!user || user.role !== 'Administrator') {
    return <div className="flex flex-col items-center justify-center min-h-96"><AlertCircle className="w-12 h-12 text-red-400" /><p className="mt-2 text-slate-500">Access Restricted</p></div>;
  }

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const errs: Partial<typeof form> = {};
    if (!form.full_name || form.full_name.length < 2) errs.full_name = 'Full name required';
    if (!form.gpf_cps_number) errs.gpf_cps_number = 'GPF/CPS required';
    if (!form.designation) errs.designation = 'Designation required';
    if (!form.bank_account_no) errs.bank_account_no = 'Bank account required';
    if (!form.bank_ifsc || form.bank_ifsc.length < 5) errs.bank_ifsc = 'Valid IFSC required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await apiFetch(`/api/users/${userId}`, { method: 'PUT', body: JSON.stringify(form) });
      setSuccess(true);
      setTimeout(() => router.push(`/admin/users/${userId}`), 1500);
    } catch (err: any) {
      alert(err.message || 'Failed to update employee.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-96"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
        <Link href="/admin/users" className="hover:text-blue-600 transition-colors">User Management</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href={`/admin/users/${userId}`} className="hover:text-blue-600 transition-colors">{employeeName}</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-700">Edit</span>
      </nav>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
          <Edit3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-800">Edit Employee</h1>
          <p className="text-xs text-slate-400 font-medium">Update details for {employeeName}</p>
        </div>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-sm font-bold text-emerald-800">Employee updated successfully. Redirecting...</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Info */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <User className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-black text-slate-800">Personal Information</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <F label="Full Name" required error={errors.full_name}>
              <input type="text" value={form.full_name} onChange={set('full_name')} className={inputCls(errors.full_name)} />
            </F>
            <F label="Email (read-only)">
              <input type="email" value={form.email} disabled className="w-full px-3 py-2.5 rounded-lg border border-slate-100 text-sm font-medium bg-slate-50 text-slate-400 cursor-not-allowed" />
            </F>
            <F label="Phone" error={errors.phone}>
              <input type="text" value={form.phone} onChange={set('phone')} className={inputCls(errors.phone)} />
            </F>
            <F label="Mobile" error={errors.mobile}>
              <input type="text" value={form.mobile} onChange={set('mobile')} className={inputCls(errors.mobile)} />
            </F>
            <F label="District" required error={errors.district}>
              <select value={form.district} onChange={set('district')} className={inputCls(errors.district)}>
                {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </F>
            <F label="Joining Date">
              <input type="date" value={form.joining_date} onChange={set('joining_date')} className={inputCls()} />
            </F>
          </div>
        </div>

        {/* Service Details */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Briefcase className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-black text-slate-800">Service Details</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <F label="Employee ID">
              <input type="text" value={form.employee_id} onChange={set('employee_id')} className={inputCls()} />
            </F>
            <F label="GPF / CPS Number" required error={errors.gpf_cps_number}>
              <input type="text" value={form.gpf_cps_number} onChange={set('gpf_cps_number')} className={inputCls(errors.gpf_cps_number)} />
            </F>
            <F label="Rank" required>
              <select value={form.rank} onChange={set('rank')} className={inputCls()}>
                {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </F>
            <F label="Designation" required error={errors.designation}>
              <input type="text" value={form.designation} onChange={set('designation')} className={inputCls(errors.designation)} />
            </F>
            <F label="Police Unit / Station">
              <input type="text" value={form.police_unit} onChange={set('police_unit')} className={inputCls()} />
            </F>
          </div>
        </div>

        {/* Bank & Role */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <CreditCard className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-black text-slate-800">Bank Details & System Role</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <F label="Bank Account Number" required error={errors.bank_account_no}>
              <input type="text" value={form.bank_account_no} onChange={set('bank_account_no')} className={inputCls(errors.bank_account_no)} />
            </F>
            <F label="Bank IFSC Code" required error={errors.bank_ifsc}>
              <input type="text" value={form.bank_ifsc} onChange={set('bank_ifsc')} className={inputCls(errors.bank_ifsc)} />
            </F>
            <div className="md:col-span-2">
              <F label="System Role" required>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1">
                  {ROLES.map(r => (
                    <button type="button" key={r} onClick={() => setForm(prev => ({ ...prev, role: r }))}
                      className={`px-3 py-2.5 rounded-lg border text-xs font-bold transition-all text-left ${form.role === r ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50'}`}>
                      <ShieldCheck className="w-3.5 h-3.5 mb-1" /> {r}
                    </button>
                  ))}
                </div>
              </F>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <Link href={`/admin/users/${userId}`}
            className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-bold transition-all">
            Cancel
          </Link>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-all shadow-sm">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Changes</>}
          </button>
        </div>
      </form>
    </div>
  );
}
