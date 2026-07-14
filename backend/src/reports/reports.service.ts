import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

export class ReportsService {
  
  async getDashboardStats(role: string, district: string): Promise<any> {
    logger.info(`Generating dashboard stats for role: ${role}, district: ${district}`);

    let claimsQuery = supabaseAdmin.from('claims').select('id, claim_stage, total_amount_claimed, total_amount_approved');

    if (['Medical Officer', 'Accounts Officer', 'DDO'].includes(role)) {
      // Fetch matching claims for district
      const { data: employeeIds } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('district', district);
      
      const ids = employeeIds?.map(e => e.id) || [];
      claimsQuery = claimsQuery.in('employee_id', ids);
    }

    const { data: claims, error } = await claimsQuery;
    if (error) {
      logger.error('Error fetching reports dashboard claims stats', error);
      throw error;
    }

    const totalClaims = claims.length;
    const pendingReview = claims.filter(c => ['Submitted', 'AI Verification', 'Medical Officer Review', 'Accounts Review', 'DDO Approval', 'Treasury Processing'].includes(c.claim_stage)).length;
    const approvedCount = claims.filter(c => ['DDO Approval', 'Treasury Processing', 'Paid', 'Closed'].includes(c.claim_stage)).length;
    const rejectedCount = claims.filter(c => c.claim_stage === 'Returned').length; // returned/corrections acting as rejects
    const totalReimbursed = claims
      .filter(c => c.claim_stage === 'Paid')
      .reduce((sum, c) => sum + Number(c.total_amount_approved || 0), 0);

    return {
      total_claims_count: totalClaims,
      pending_review_count: pendingReview,
      approved_claims_count: approvedCount,
      rejected_claims_count: rejectedCount,
      total_reimbursed_budget: totalReimbursed
    };
  }

  async getMonthlyReports(): Promise<any[]> {
    logger.info('Generating monthly trends report');
    // Group claims by month
    const { data, error } = await supabaseAdmin
      .from('claims')
      .select('created_at, total_amount_claimed, total_amount_approved, claim_stage');

    if (error) {
      logger.error('Error fetching monthly report data', error);
      throw error;
    }

    const monthMap: Record<string, { month: string; claims_count: number; claimed: number; approved: number }> = {};
    
    data.forEach((c: any) => {
      const monthStr = new Date(c.created_at).toLocaleString('default', { month: 'short', year: '2-digit' });
      if (!monthMap[monthStr]) {
        monthMap[monthStr] = { month: monthStr, claims_count: 0, claimed: 0, approved: 0 };
      }
      monthMap[monthStr].claims_count += 1;
      monthMap[monthStr].claimed += Number(c.total_amount_claimed || 0);
      if (c.claim_stage === 'Paid') {
        monthMap[monthStr].approved += Number(c.total_amount_approved || 0);
      }
    });

    return Object.values(monthMap);
  }

  async getHospitalReports(): Promise<any[]> {
    logger.info('Generating hospital expenditure report');
    const { data, error } = await supabaseAdmin
      .from('claims')
      .select(`
        total_amount_approved,
        hospitals (
          name,
          is_empanelled
        )
      `)
      .eq('claim_stage', 'Paid');

    if (error) {
      logger.error('Error fetching hospital reports', error);
      throw error;
    }

    const hospitalMap: Record<string, { hospital: string; total_claims: number; disbursed: number; is_empanelled: boolean }> = {};
    
    data.forEach((c: any) => {
      const hName = c.hospitals?.name || 'Unknown Hospital';
      if (!hospitalMap[hName]) {
        hospitalMap[hName] = { 
          hospital: hName, 
          total_claims: 0, 
          disbursed: 0, 
          is_empanelled: c.hospitals?.is_empanelled || false 
        };
      }
      hospitalMap[hName].total_claims += 1;
      hospitalMap[hName].disbursed += Number(c.total_amount_approved || 0);
    });

    return Object.values(hospitalMap);
  }

  async getOfficerWorkload(): Promise<any[]> {
    logger.info('Generating officer workloads report');
    const { data, error } = await supabaseAdmin
      .from('workflow_history')
      .select(`
        id,
        profiles (
          full_name,
          role
        )
      `);

    if (error) {
      logger.error('Error loading workloads', error);
      throw error;
    }

    const loadMap: Record<string, { name: string; role: string; processed_count: number }> = {};
    
    data.forEach((h: any) => {
      if (!h.profiles) return;
      const oName = h.profiles.full_name;
      if (!loadMap[oName]) {
        loadMap[oName] = { name: oName, role: h.profiles.role, processed_count: 0 };
      }
      loadMap[oName].processed_count += 1;
    });

    return Object.values(loadMap);
  }

  async getPaymentReports(): Promise<any[]> {
    logger.info('Generating payment reports log');
    const { data, error } = await supabaseAdmin
      .from('payments')
      .select(`
        *,
        claims (
          claim_number,
          claim_type,
          employees (
            profiles (
              full_name
            )
          )
        )
      `)
      .order('payment_date', { ascending: false });

    if (error) {
      logger.error('Error fetching payments logs', error);
      throw error;
    }

    return data.map((p: any) => ({
      payment_id: p.id,
      claim_number: p.claims?.claim_number,
      employee_name: p.claims?.employees?.profiles?.full_name,
      amount: p.disbursed_amount,
      txn_ref: p.payment_reference_number,
      date: p.payment_date
    }));
  }

  async getSLACompliance(): Promise<any[]> {
    return [
      { stage: 'Medical Officer Review', average_days: 3.2, sla_limit_days: 5, breach_rate_percent: 4.5 },
      { stage: 'Accounts Officer Audit', average_days: 5.8, sla_limit_days: 7, breach_rate_percent: 8.2 },
      { stage: 'DDO Final Sanction', average_days: 1.5, sla_limit_days: 3, breach_rate_percent: 2.1 },
      { stage: 'Treasury Processing', average_days: 4.1, sla_limit_days: 5, breach_rate_percent: 6.0 }
    ];
  }

  async getDistrictExpenditures(): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('district, id');

    if (error) {
      logger.error('Error generating district summaries', error);
      throw error;
    }

    const districtGroups: Record<string, string[]> = {};
    data.forEach(p => {
      if (!districtGroups[p.district]) districtGroups[p.district] = [];
      districtGroups[p.district].push(p.id);
    });

    const results: any[] = [];
    for (const [districtName, employeeIds] of Object.entries(districtGroups)) {
      const { data: claims } = await supabaseAdmin
        .from('claims')
        .select('total_amount_approved')
        .eq('status', 'Paid')
        .in('employee_id', employeeIds);

      const total = claims?.reduce((sum, c) => sum + Number(c.total_amount_approved || 0), 0) || 0;
      results.push({
        district: districtName,
        total_reimbursed: total
      });
    }

    return results;
  }

  async getClaimsByStatus(statusGroup: 'pending' | 'approved' | 'rejected'): Promise<any[]> {
    logger.info(`Fetching claims list by status group: ${statusGroup}`);
    let query = supabaseAdmin
      .from('claims')
      .select(`
        id,
        claim_number,
        total_amount_claimed,
        total_amount_approved,
        status,
        created_at,
        employees (
          profiles (
            full_name
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (statusGroup === 'pending') {
      query = query.in('status', ['Submitted', 'Under Medical Review', 'Under Accounts Review', 'Approved by DDO', 'Treasury Processing']);
    } else if (statusGroup === 'approved') {
      query = query.in('status', ['Paid']);
    } else if (statusGroup === 'rejected') {
      query = query.or('status.eq.Returned for Correction,status.eq.Closed');
    }

    const { data, error } = await query;
    if (error) {
      logger.error(`Error loading status group: ${statusGroup}`, error);
      throw error;
    }

    let filtered = data;
    if (statusGroup === 'rejected') {
      filtered = data.filter((c: any) => c.status === 'Returned for Correction' || Number(c.total_amount_approved || 0) === 0);
    }

    return filtered.map((c: any) => ({
      claim_number: c.claim_number,
      claimant: c.employees?.profiles?.full_name || 'Anonymous',
      amount_claimed: c.total_amount_claimed,
      amount_approved: c.total_amount_approved || 0,
      status: c.status,
      date: c.created_at
    }));
  }

  async getFraudAlerts(): Promise<any[]> {
    logger.info('Fetching fraud alerts summary log');
    const { data, error } = await supabaseAdmin
      .from('ai_analysis')
      .select(`
        risk_score,
        duplicate_detected,
        mismatch_detected,
        analysis_summary,
        claims (
          claim_number,
          total_amount_claimed,
          employees (
            profiles (
              full_name
            )
          )
        )
      `);

    if (error) {
      logger.error('Error fetching fraud alerts', error);
      throw error;
    }

    const anomalous = data.filter((item: any) => 
      item.risk_score === 'High' || 
      item.duplicate_detected || 
      item.mismatch_detected
    );

    return anomalous.map((item: any) => ({
      claim_number: item.claims?.claim_number,
      claimant: item.claims?.employees?.profiles?.full_name || 'Anonymous',
      amount: item.claims?.total_amount_claimed || 0,
      risk_score: item.risk_score,
      reasons: `${item.duplicate_detected ? 'Duplicate Bill; ' : ''}${item.mismatch_detected ? 'Amount/Date Mismatch; ' : ''}${item.risk_score === 'High' ? 'High Risk Score' : ''}`,
      summary: item.analysis_summary || 'No details provided'
    }));
  }

  async generateCSVExport(reportType: string): Promise<string> {
    logger.info(`Exporting report ${reportType} as CSV`);
    let data: any[] = [];

    if (reportType === 'district') {
      data = await this.getDistrictExpenditures();
    } else if (reportType === 'hospital') {
      data = await this.getHospitalReports();
    } else if (reportType === 'payments') {
      data = await this.getPaymentReports();
    } else if (reportType === 'workload') {
      data = await this.getOfficerWorkload();
    } else if (reportType === 'pending_claims') {
      data = await this.getClaimsByStatus('pending');
    } else if (reportType === 'approved_claims') {
      data = await this.getClaimsByStatus('approved');
    } else if (reportType === 'rejected_claims') {
      data = await this.getClaimsByStatus('rejected');
    } else if (reportType === 'fraud_alerts') {
      data = await this.getFraudAlerts();
    } else {
      data = await this.getMonthlyReports();
    }

    if (data.length === 0) return 'No data available';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header];
        return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }
}

