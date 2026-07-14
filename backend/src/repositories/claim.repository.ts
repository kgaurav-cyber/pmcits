import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

export class ClaimRepository {
  
  async createClaim(claimData: any): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('claims')
      .insert([claimData])
      .select()
      .single();

    if (error) {
      logger.error('Error inserting claim into database', error);
      throw error;
    }
    return data;
  }

  async getClaimById(id: string): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('claims')
      .select(`
        *,
        employees (
          *,
          profiles (*)
        ),
        hospitals (*),
        doctors (*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No match found
      logger.error(`Error fetching claim ID ${id}`, error);
      throw error;
    }
    return data;
  }

  async updateClaim(id: string, updateData: any): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('claims')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error(`Error updating claim ID ${id}`, error);
      throw error;
    }
    return data;
  }

  async getClaimsQueue(userId: string, role: string, district: string, status?: string, employeeId?: string): Promise<any[]> {
    let query = supabaseAdmin
      .from('claims')
      .select(`
        id,
        claim_number,
        patient_type,
        claim_type,
        status,
        claim_stage,
        total_amount_claimed,
        eligible_amount,
        approved_amount,
        created_at,
        assigned_to,
        employees!inner(
          profiles!inner(
            full_name,
            district
          )
        )
      `);

    // Filter by district for local reviewers (MO, AO, DDO)
    if (['Medical Officer', 'Accounts Officer', 'DDO'].includes(role) && !employeeId) {
      query = query.eq('employees.profiles.district', district);
    } else if (role === 'Employee') {
      // Filter strictly by employee_id for Employees
      query = query.eq('employee_id', userId);
    }

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    // Filter by status if provided explicitly, otherwise return all relevant claims for the role/district
    if (status && status !== 'ALL') {
      query = query.eq('claim_stage', status);
    }

    const { data, error } = await query;
    if (error) {
      logger.error('Error fetching claims queue', error);
      throw error;
    }
    return data || [];
  }

  async addBillItems(claimId: string, items: any[]): Promise<any[]> {
    const formatted = items.map(item => ({ ...item, claim_id: claimId }));
    const { data, error } = await supabaseAdmin
      .from('claim_bill_items')
      .insert(formatted)
      .select();

    if (error) {
      logger.error(`Error bulk inserting bill items for claim ${claimId}`, error);
      throw error;
    }
    return data || [];
  }

  async getBillItems(claimId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('claim_bill_items')
      .select('*')
      .eq('claim_id', claimId);

    if (error) {
      logger.error(`Error getting bill items for claim ${claimId}`, error);
      throw error;
    }
    return data || [];
  }

  async deleteBillItems(claimId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('claim_bill_items')
      .delete()
      .eq('claim_id', claimId);

    if (error) {
      logger.error(`Error deleting bill items for claim ${claimId}`, error);
      throw error;
    }
  }

  async updateBillItemEligible(itemId: string, amountEligible: number): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('claim_bill_items')
      .update({ amount_eligible: amountEligible })
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      logger.error(`Error updating bill item ID ${itemId}`, error);
      throw error;
    }
    return data;
  }

  async addDocument(claimId: string, docData: any): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('claim_documents')
      .insert([{ ...docData, claim_id: claimId }])
      .select()
      .single();

    if (error) {
      logger.error(`Error adding document metadata for claim ${claimId}`, error);
      throw error;
    }
    return data;
  }

  async getDocuments(claimId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('claim_documents')
      .select('*')
      .eq('claim_id', claimId);

    if (error) {
      logger.error(`Error getting documents for claim ${claimId}`, error);
      throw error;
    }
    return data || [];
  }

  async writeAuditLog(logEntry: {
    user_id: string | null;
    action: string;
    entity_table: string;
    entity_id: string;
    old_values?: any;
    new_values?: any;
    ip_address?: string;
  }): Promise<void> {
    const { error } = await supabaseAdmin
      .from('audit_logs')
      .insert([logEntry]);

    if (error) {
      logger.error('Failed to write immutable audit log', error);
    }
  }

  async addWorkflowHistory(historyEntry: {
    claim_id: string;
    stage: string;
    action: string;
    performed_by: string | null;
    role?: string | null;
    remarks?: string | null;
  }): Promise<void> {
    const { error } = await supabaseAdmin
      .from('claim_stage_history')
      .insert([historyEntry]);

    if (error) {
      logger.error('Failed to log claim stage history', error);
    }
  }

  async getWorkflowHistory(claimId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('claim_stage_history')
      .select(`
        *,
        auth_users:performed_by (
          email
        )
      `)
      .eq('claim_id', claimId)
      .order('timestamp', { ascending: true });

    if (error) {
      logger.error(`Error getting workflow history for claim ${claimId}`, error);
      throw error;
    }
    
    // We fetch the profile details manually if needed, or rely on the role column stored in the history
    return data || [];
  }
}
