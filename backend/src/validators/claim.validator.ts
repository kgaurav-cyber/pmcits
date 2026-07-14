import { z } from 'zod';

export const claimObjectSchema = z.object({
  patient_type: z.enum(['Self', 'Dependent']).optional(),
  dependent_id: z.string().uuid().nullable().optional(),
  claim_type: z.enum(['OPD', 'IPD']).optional(),
  hospital_id: z.string().uuid().nullable().optional(),
  doctor_id: z.string().uuid().nullable().optional(),
  admission_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').nullable().optional(),
  discharge_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').nullable().optional(),
  diagnosis: z.string().max(1000).nullable().optional(),
  total_amount_claimed: z.number().nonnegative().optional(),
  bill_items: z.array(z.object({
    bill_number: z.string().optional(),
    bill_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').or(z.literal('')).optional(),
    category: z.string().optional(),
    cghs_code: z.string().optional().nullable(),
    amount_claimed: z.number().nonnegative().optional()
  })).optional()
});

export const createClaimSchema = claimObjectSchema.refine(data => {
  if (data.patient_type === 'Dependent' && !data.dependent_id) {
    return false;
  }
  return true;
}, {
  message: "dependent_id is required when patient_type is 'Dependent'",
  path: ['dependent_id']
});

export const submitClaimSchema = z.object({
  patient_type: z.enum(['Self', 'Dependent']),
  dependent_id: z.string().uuid().nullable().optional(),
  claim_type: z.enum(['OPD', 'IPD']),
  hospital_id: z.string().uuid(),
  doctor_id: z.string().uuid(),
  admission_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  discharge_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').nullable().optional(),
  diagnosis: z.string().min(3).max(1000),
  bill_items: z.array(z.object({
    bill_number: z.string().min(1),
    bill_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
    category: z.string().min(1),
    cghs_code: z.string().optional().nullable(),
    amount_claimed: z.number().nonnegative()
  })).optional()
}).refine(data => {
  if (data.patient_type === 'Dependent' && !data.dependent_id) {
    return false;
  }
  return true;
}, {
  message: "dependent_id is required when patient_type is 'Dependent'",
  path: ['dependent_id']
});

export const updateClaimSchema = claimObjectSchema.partial();

export const approveClaimSchema = z.object({
  comments: z.string().max(2000).optional(),
  bill_adjustments: z.array(z.object({
    bill_item_id: z.string().uuid(),
    amount_eligible: z.number().nonnegative()
  })).optional(),
  total_eligible: z.number().nonnegative().optional(),
  sanction_number: z.string().max(100).optional(),
  sanction_date: z.string().optional(),
  utr_number: z.string().max(100).optional(),
  payment_reference_number: z.string().max(100).optional(),
  payment_date: z.string().optional()
});

export const returnClaimSchema = z.object({
  comments: z.string().min(5, 'Mandatory return comment must be at least 5 characters long').max(2000)
});

export const recordPaymentSchema = z.object({
  disbursed_amount: z.number().positive(),
  payment_reference_number: z.string().min(5).max(100),
  payment_date: z.string().datetime()
});
