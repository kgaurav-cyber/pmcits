'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { useSaveDraftClaim, useSubmitFinalClaim } from '../../../hooks/useClaims';
import { useAuth } from '../../../context/AuthContext';
import { ArrowLeft, ArrowRight, Save, Trash2, Plus, Upload, CheckCircle, User, Briefcase, FileText, Loader2, Building2 } from 'lucide-react';
import debounce from 'lodash.debounce';
import { AIDocumentUploader } from './components/AIDocumentUploader';

export default function NewClaimWizardPage() {
  const router = useRouter();
  const { user, token, apiFetch } = useAuth();
  const saveDraftMutation = useSaveDraftClaim();
  
  const [step, setStep] = useState(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const submitFinalMutation = useSubmitFinalClaim(draftId || '');

  const { register, control, handleSubmit, watch, trigger, getValues, setValue, formState: { errors } } = useForm({
    defaultValues: {
      patient_type: 'Self',
      dependent_id: '',
      claim_type: 'IPD',
      hospital_id: '',
      doctor_id: '',
      admission_date: '',
      discharge_date: '',
      diagnosis: '',
      total_amount_claimed: 0,
      bill_items: [] as { bill_number: string, bill_date: string, category: string, amount_claimed: number }[],
      declaration: false
    },
    mode: 'onTouched'
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'bill_items'
  });

  const formValues = watch();
  const patientType = watch('patient_type');

  // Auto-Save Draft
  const debouncedSaveDraft = useCallback(
    debounce(async (data: Record<string, any>) => {
      if (!user) return;
      try {
        const payload: Record<string, any> = { ...data, claim_id: draftId };
        if (payload.bill_items) {
          payload.total_amount_claimed = payload.bill_items.reduce((sum: number, item: any) => sum + Number(item.amount_claimed || 0), 0);
          payload.bill_items = payload.bill_items.map((item: any) => ({ ...item, amount_claimed: Number(item.amount_claimed) }));
        }
        
        // Remove empty strings for uuids/dates to pass Zod schema
        if (!payload.dependent_id) delete payload.dependent_id;
        if (!payload.hospital_id) delete payload.hospital_id;
        if (!payload.doctor_id) delete payload.doctor_id;
        if (!payload.admission_date) delete payload.admission_date;
        if (!payload.discharge_date) delete payload.discharge_date;

        const res = await saveDraftMutation.mutateAsync(payload);
        if (res?.id) {
          setDraftId(res.id);
          setLastSaved(new Date());
        }
      } catch (err) {
        console.error('Auto-save failed', err);
      }
    }, 2000),
    [draftId, user]
  );


  useEffect(() => {
    debouncedSaveDraft(formValues);
  }, [formValues, debouncedSaveDraft]);

  const validateStep = async () => {
    let fieldsToValidate: string[] = [];
    if (step === 2) fieldsToValidate = ['patient_type', ...(patientType === 'Dependent' ? ['dependent_id'] : [])];
    if (step === 3) fieldsToValidate = ['hospital_id', 'doctor_id'];
    if (step === 4) fieldsToValidate = ['claim_type', 'admission_date', 'diagnosis'];
    if (step === 6) fieldsToValidate = ['declaration'];
    
    if (fieldsToValidate.length > 0) {
      const isStepValid = await trigger(fieldsToValidate as any);
      return isStepValid;
    }
    return true;
  };

  const nextStep = async () => {
    setErrorMsg(null);
    const isValid = await validateStep();
    if (isValid) {
      setStep(prev => Math.min(prev + 1, 6));
    }
  };

  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const onSubmitFinal = async (data: any) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!draftId) {
      setErrorMsg('No draft claim found to submit.');
      return;
    }
    
    // validate declaration again just in case
    if (!data.declaration) {
       setErrorMsg('You must agree to the declaration before submitting.');
       return;
    }

    try {
      const payload = { ...data };
      if (payload.bill_items) {
        payload.total_amount_claimed = payload.bill_items.reduce((sum: number, item: any) => sum + Number(item.amount_claimed || 0), 0);
        payload.bill_items = payload.bill_items.map((item: any) => ({ ...item, amount_claimed: Number(item.amount_claimed) }));
      }
      if (!payload.dependent_id) delete payload.dependent_id;
      if (!payload.hospital_id) delete payload.hospital_id;
      if (!payload.doctor_id) delete payload.doctor_id;
      if (!payload.admission_date) delete payload.admission_date;
      if (!payload.discharge_date) delete payload.discharge_date;

      await submitFinalMutation.mutateAsync(payload);
      setSuccessMsg('Claim submitted successfully! Redirecting...');
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit medical claim. Please check all required fields.');
    }
  };

  const stepsList = [
    { num: 1, title: 'Employee' },
    { num: 2, title: 'Patient' },
    { num: 3, title: 'Hospital' },
    { num: 4, title: 'Treatment' },
    { num: 5, title: 'Documents' },
    { num: 6, title: 'Review' }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-700 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Submit Reimbursement Claim</h1>
            <p className="text-xs text-slate-500 font-semibold mt-1">Multi-step wizard for medical bill reimbursements</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          {saveDraftMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
          {lastSaved && !saveDraftMutation.isPending ? <span className="text-emerald-600 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Draft Saved {lastSaved.toLocaleTimeString()}</span> : 'Auto-saving enabled'}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="gov-card p-6 overflow-x-auto">
        <div className="flex items-center justify-between min-w-[700px]">
          {stepsList.map((s, idx) => (
            <React.Fragment key={s.num}>
              <div className="flex flex-col items-center gap-2 relative z-10 w-20">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300 ${
                  step === s.num ? 'bg-primary text-white shadow-md shadow-primary/20 scale-110' :
                  step > s.num ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  {step > s.num ? <CheckCircle className="w-4 h-4" /> : s.num}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider text-center ${
                  step >= s.num ? 'text-slate-800' : 'text-slate-400'
                }`}>
                  {s.title}
                </span>
              </div>
              {idx < stepsList.length - 1 && (
                <div className={`flex-1 h-1 rounded-full transition-colors duration-300 -ml-6 -mr-6 ${
                  step > s.num ? 'bg-emerald-500' : 'bg-slate-100'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-lg font-bold flex items-center gap-2">
          {errorMsg}
        </div>
      )}
      
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-lg font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {successMsg}
        </div>
      )}

      {/* Main Wizard Form */}
      <form onSubmit={handleSubmit(onSubmitFinal, () => setErrorMsg('Please ensure all required fields in previous steps are filled correctly.'))} className="gov-card p-8 min-h-[400px] flex flex-col">
        <div className="flex-1 space-y-8">
          
          {/* STEP 1: Employee Details */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-lg font-black text-slate-800 border-b border-slate-200 pb-3 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" /> Employee Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Full Name</p>
                  <p className="text-sm font-semibold text-slate-800">{user?.full_name}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">District</p>
                  <p className="text-sm font-semibold text-slate-800">{user?.district}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Email</p>
                  <p className="text-sm font-semibold text-slate-800">{user?.email}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Role</p>
                  <p className="text-sm font-semibold text-slate-800">{user?.role}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 font-semibold bg-blue-50 text-blue-700 p-4 rounded-lg border border-blue-100">
                Please verify your details. If any information is incorrect, contact your unit administrator to update your profile before submitting a claim.
              </p>
            </div>
          )}

          {/* STEP 2: Patient Details */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-lg font-black text-slate-800 border-b border-slate-200 pb-3 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" /> Patient Details
              </h2>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Claim Beneficiary</label>
                <div className="grid grid-cols-2 gap-4">
                  <label className={`p-4 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                    patientType === 'Self' ? 'border-primary bg-primary/5 text-primary font-bold' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}>
                    <span className="text-sm font-bold">Self (Employee)</span>
                    <input type="radio" value="Self" {...register('patient_type')} className="sr-only" />
                  </label>
                  <label className={`p-4 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                    patientType === 'Dependent' ? 'border-primary bg-primary/5 text-primary font-bold' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}>
                    <span className="text-sm font-bold">Registered Dependent</span>
                    <input type="radio" value="Dependent" {...register('patient_type')} className="sr-only" />
                  </label>
                </div>
              </div>

              {patientType === 'Dependent' && (
                <div className="animate-in fade-in zoom-in-95 duration-300">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Select Dependent Family Member <span className="text-rose-500">*</span></label>
                  <select 
                    {...register('dependent_id', { required: patientType === 'Dependent' })}
                    className={`gov-input font-semibold ${errors.dependent_id ? 'border-rose-300' : ''}`}
                  >
                    <option value="">-- Choose Dependent --</option>
                    <option value="d0000000-0000-0000-0000-000000000005">Kiran Sharma (Spouse)</option>
                    <option value="d0000000-0000-0000-0000-000000000006">Rohan Sharma (Son)</option>
                  </select>
                  {errors.dependent_id && <p className="text-[10px] text-rose-500 font-bold mt-1">Please select a dependent.</p>}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Hospital Details */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-lg font-black text-slate-800 border-b border-slate-200 pb-3 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" /> Hospital & Doctor
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Empanelled Hospital <span className="text-rose-500">*</span></label>
                  <select 
                    {...register('hospital_id', { required: true })}
                    className={`gov-input font-semibold ${errors.hospital_id ? 'border-rose-300' : ''}`}
                  >
                    <option value="">-- Select Hospital --</option>
                    <option value="a0000000-0000-0000-0000-000000000001">City General Hospital (Empanelled)</option>
                    <option value="a0000000-0000-0000-0000-000000000002">Metro Heart Institute (Empanelled)</option>
                    <option value="a0000000-0000-0000-0000-000000000003">Police Line Memorial (Non-empanelled)</option>
                  </select>
                  {errors.hospital_id && <p className="text-[10px] text-rose-500 font-bold mt-1">Hospital is required.</p>}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Attending Medical Practitioner <span className="text-rose-500">*</span></label>
                  <select 
                    {...register('doctor_id', { required: true })}
                    className={`gov-input font-semibold ${errors.doctor_id ? 'border-rose-300' : ''}`}
                  >
                    <option value="">-- Select Doctor --</option>
                    <option value="d0000000-0000-0000-0000-000000000002">Dr. Meera Sen (MC-45920)</option>
                    <option value="d0000000-0000-0000-0000-000000000001">Dr. Arvind Kumar (MC-12093)</option>
                  </select>
                  {errors.doctor_id && <p className="text-[10px] text-rose-500 font-bold mt-1">Doctor is required.</p>}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Treatment Details */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-lg font-black text-slate-800 border-b border-slate-200 pb-3 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" /> Treatment & Bills
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Treatment Classification <span className="text-rose-500">*</span></label>
                  <select 
                    {...register('claim_type')}
                    className="gov-input font-semibold"
                  >
                    <option value="IPD">Inpatient Treatment (IPD - Hospitalized)</option>
                    <option value="OPD">Outpatient Care (OPD - Consultation/Lab)</option>
                  </select>
                </div>
                <div />

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Admission Date <span className="text-rose-500">*</span></label>
                  <input 
                    type="date"
                    {...register('admission_date', { required: true })}
                    className={`gov-input font-semibold ${errors.admission_date ? 'border-rose-300' : ''}`}
                  />
                  {errors.admission_date && <p className="text-[10px] text-rose-500 font-bold mt-1">Admission date is required.</p>}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Discharge Date</label>
                  <input 
                    type="date"
                    {...register('discharge_date')}
                    className="gov-input font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Clinical Diagnosis / Symptoms Summary <span className="text-rose-500">*</span></label>
                <textarea 
                  rows={3}
                  placeholder="Enter doctor's diagnosis, treatment description, or procedures performed..."
                  {...register('diagnosis', { required: true, minLength: 3 })}
                  className={`gov-input font-semibold ${errors.diagnosis ? 'border-rose-300' : ''}`}
                />
                {errors.diagnosis && <p className="text-[10px] text-rose-500 font-bold mt-1">Diagnosis description is required (min 3 chars).</p>}
              </div>

              {/* Bill Items Sub-Form */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Itemized Expenses List</label>
                  <button 
                    type="button"
                    onClick={() => append({ bill_number: '', bill_date: '', category: 'Medicines', amount_claimed: 0 })}
                    className="text-xs font-bold text-primary flex items-center gap-1 hover:underline bg-primary/10 px-3 py-1.5 rounded-lg"
                  >
                    <Plus className="w-4 h-4" /> Add Bill Item
                  </button>
                </div>
                
                {fields.length === 0 ? (
                  <div className="text-center py-6 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="text-xs text-slate-400 font-semibold">No bill items added. Click "Add Bill Item" to claim expenses.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fields.map((field, index) => (
                      <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border border-slate-200 rounded-xl bg-slate-50/50 items-start">
                        <div className="md:col-span-3">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Bill No. <span className="text-rose-500">*</span></label>
                          <input type="text" {...register(`bill_items.${index}.bill_number` as const, { required: true })} className="gov-input py-2 text-xs font-semibold" />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Bill Date <span className="text-rose-500">*</span></label>
                          <input type="date" {...register(`bill_items.${index}.bill_date` as const, { required: true })} className="gov-input py-2 text-xs font-semibold" />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Category <span className="text-rose-500">*</span></label>
                          <select {...register(`bill_items.${index}.category` as const)} className="gov-input py-2 text-xs font-semibold">
                            <option value="Room Rent">Room Rent</option>
                            <option value="Medicines">Medicines</option>
                            <option value="Consultation">Consultation</option>
                            <option value="Lab Diagnostics">Lab Diagnostics</option>
                            <option value="Surgery">Surgery</option>
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Amount <span className="text-rose-500">*</span></label>
                          <input type="number" {...register(`bill_items.${index}.amount_claimed` as const, { required: true, min: 1 })} className="gov-input py-2 text-xs font-bold text-slate-800" />
                        </div>
                        <div className="md:col-span-1 flex justify-end mt-5">
                          <button type="button" onClick={() => remove(index)} className="p-2 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors bg-rose-50 border border-rose-200" title="Remove Item">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: Documents with AI OCR */}
          {step === 5 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-lg font-black text-slate-800 border-b border-slate-200 pb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> Upload Medical Documents
              </h2>
              
              <AIDocumentUploader
                claimId={draftId || undefined}
                onAutoFill={(data) => {
                  if (data.hospital_name) {
                    // Map extracted data → wizard fields
                    const hospitalMatch = [
                      { id: 'a0000000-0000-0000-0000-000000000001', name: 'City General Hospital' },
                      { id: 'a0000000-0000-0000-0000-000000000002', name: 'Metro Heart Institute' },
                    ].find(h => h.name.toLowerCase().includes((data.hospital_name || '').toLowerCase()));
                    if (hospitalMatch) setValue('hospital_id', hospitalMatch.id);
                  }
                  if (data.admission_date) setValue('admission_date', data.admission_date);
                  if (data.discharge_date) setValue('discharge_date', data.discharge_date);
                  if (data.diagnosis) setValue('diagnosis', data.diagnosis);
                  if (data.line_items && data.line_items.length > 0) {
                    const newItems = data.line_items.map(item => ({
                      bill_number: data.bill_number || '',
                      bill_date: data.bill_date || '',
                      category: item.category || 'Medicines',
                      amount_claimed: item.amount || 0
                    }));
                    setValue('bill_items', newItems);
                  }
                }}
              />
            </div>
          )}


          {/* STEP 6: Review & Submit */}
          {step === 6 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-lg font-black text-slate-800 border-b border-slate-200 pb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" /> Final Review & Submission
              </h2>
              
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 space-y-6">
                
                <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Patient</span>
                    <span className="text-sm font-bold text-slate-800">{formValues.patient_type}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Treatment Type</span>
                    <span className="text-sm font-bold text-slate-800">{formValues.claim_type}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Diagnosis Summary</span>
                    <span className="text-sm font-semibold text-slate-700">{formValues.diagnosis || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Admission Date</span>
                    <span className="text-sm font-semibold text-slate-700">{formValues.admission_date || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Total Items</span>
                    <span className="text-sm font-semibold text-slate-700">{fields.length} invoices attached</span>
                  </div>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                  <input 
                    type="checkbox" 
                    id="declaration" 
                    {...register('declaration', { required: true })} 
                    className="mt-1 w-4 h-4 text-primary rounded border-amber-300 focus:ring-primary"
                  />
                  <div className="flex-1">
                    <label htmlFor="declaration" className="text-xs text-amber-800 font-bold cursor-pointer">Declaration</label>
                    <p className="text-[10px] text-amber-700 font-semibold mt-1 leading-relaxed">
                      I hereby declare that the statements made in this application are true to the best of my knowledge and belief. I understand that submitting false or exaggerated claims may result in disciplinary action under the service rules.
                    </p>
                    {errors.declaration && <p className="text-[10px] text-rose-500 font-bold mt-1">You must accept the declaration to submit the claim.</p>}
                  </div>
                </div>

                {fields.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Itemized Expenses Summary</h3>
                    <div className="space-y-2">
                      {fields.map((field, idx) => (
                        <div key={field.id} className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>
                            <div>
                              <p className="text-xs font-bold text-slate-800">Bill No: {formValues.bill_items?.[idx]?.bill_number || 'N/A'}</p>
                              <p className="text-[10px] text-slate-500 font-semibold">{formValues.bill_items?.[idx]?.category} • {formValues.bill_items?.[idx]?.bill_date || 'N/A'}</p>
                            </div>
                          </div>
                          <p className="text-sm font-black text-slate-800">₹ {Number(formValues.bill_items?.[idx]?.amount_claimed || 0).toLocaleString('en-IN')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}
        </div>

        {/* Form Controls / Footer Buttons */}
        <div className="flex justify-between items-center border-t border-slate-200 pt-6 mt-8">
          <button 
            type="button" 
            onClick={prevStep}
            disabled={step === 1 || submitFinalMutation.isPending}
            className={`px-6 py-2.5 border border-slate-200 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${step === 1 ? 'opacity-0' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {step < 6 ? (
            <button 
              type="button" 
              onClick={nextStep}
              className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg text-xs transition-all shadow-md shadow-primary/20 flex items-center gap-2"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button 
              type="submit"
              disabled={submitFinalMutation.isPending}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg text-sm transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2 disabled:opacity-70"
            >
              {submitFinalMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <><Save className="w-5 h-5" /> Submit Claim Now</>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
