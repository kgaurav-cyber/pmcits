import { ClaimRepository } from '../repositories/claim.repository';
import { NotificationService } from '../notifications/notification.service';
import { WorkflowEngineService } from './workflow.service';
import { AssignmentEngineService } from './assignment.service';
import { logger } from '../utils/logger';
import { supabaseAdmin } from '../config/supabase';

export class ClaimService {
  private claimRepo = new ClaimRepository();
  private notifService = new NotificationService();
  private workflowEngine = new WorkflowEngineService();
  private assignmentEngine = new AssignmentEngineService();

  async submitClaim(userId: string, claimData: any, billItems: any[]): Promise<any> {
    logger.info(`User ${userId} submitting a new claim`);
    
    const workflow = await this.workflowEngine.getDefaultWorkflow();
    const stage = await this.workflowEngine.getWorkflowStageByCode(workflow.id, 'Submitted');
    
    const baseClaim = {
      ...claimData,
      employee_id: userId,
      status: 'Submitted',
      claim_stage: 'Submitted',
      workflow_id: workflow.id,
      current_stage_id: stage?.id || null,
      assigned_to: null,
      sla_due_date: stage?.sla_days ? new Date(Date.now() + stage.sla_days * 86400000) : null
    };

    const claim = await this.claimRepo.createClaim(baseClaim);

    if (billItems && billItems.length > 0) {
      const formattedItems = billItems.map(item => ({
        bill_number: item.bill_number,
        bill_date: item.bill_date,
        category: item.category,
        cghs_code: item.cghs_code || null,
        amount_claimed: item.amount_claimed,
        amount_eligible: 0.00
      }));
      await this.claimRepo.addBillItems(claim.id, formattedItems);
    }

    await this.claimRepo.addWorkflowHistory({
      claim_id: claim.id,
      stage: 'Submitted',
      action: 'Submit',
      performed_by: userId,
      remarks: 'Claim submitted by employee.'
    });

    await this.claimRepo.writeAuditLog({
      user_id: userId,
      action: 'CLAIM_SUBMIT',
      entity_table: 'claims',
      entity_id: claim.id,
      new_values: claim
    });

    try {
      await this.notifService.triggerWorkflowNotification('SUBMITTED', {
        userId: claim.employee_id,
        claimNumber: claim.claim_number,
        amount: Number(claim.total_amount_claimed),
        patientName: claim.patient_type
      });
    } catch (notifErr) {
      logger.error('Failed to trigger notification on submission', notifErr);
    }

    // Trigger AI Verification automatically
    this.runAiVerification(claim.id, userId, workflow.id).catch(err => logger.error('AI Verification failed', err));

    return claim;
  }

  async saveDraft(userId: string, claimId: string | undefined, claimData: any, billItems: any[]): Promise<any> {
    logger.info(`User ${userId} saving draft claim`);

    let claim;
    if (claimId) {
      const existing = await this.claimRepo.getClaimById(claimId);
      if (!existing || existing.employee_id !== userId || (existing.claim_stage !== 'Draft' && existing.claim_stage !== 'Returned')) {
        throw { statusCode: 403, message: 'Forbidden or not a draft/returned claim.', code: 'FORBIDDEN' };
      }
      claim = await this.claimRepo.updateClaim(claimId, claimData);
      
      if (billItems && billItems.length > 0) {
        await this.claimRepo.deleteBillItems(claimId);
        const formattedItems = billItems.map(item => ({
          bill_number: item.bill_number,
          bill_date: item.bill_date,
          category: item.category,
          cghs_code: item.cghs_code || null,
          amount_claimed: item.amount_claimed,
          amount_eligible: 0.00
        }));
        await this.claimRepo.addBillItems(claimId, formattedItems);
      }
    } else {
      const baseClaim = {
        ...claimData,
        employee_id: userId,
        status: 'Draft',
        claim_stage: 'Draft'
      };
      claim = await this.claimRepo.createClaim(baseClaim);
    }
    return claim;
  }

  async submitFinalClaim(userId: string, claimId: string, claimData: any, billItems: any[]): Promise<any> {
    logger.info(`User ${userId} submitting final claim ${claimId}`);

    const existing = await this.claimRepo.getClaimById(claimId);
    if (!existing || existing.employee_id !== userId || (existing.claim_stage !== 'Draft' && existing.claim_stage !== 'Returned')) {
      throw { statusCode: 403, message: 'Forbidden or not a draft/returned claim.', code: 'FORBIDDEN' };
    }

    const workflow = await this.workflowEngine.getDefaultWorkflow();
    const stage = await this.workflowEngine.getWorkflowStageByCode(workflow.id, 'Submitted');

    const updatedClaim = await this.claimRepo.updateClaim(claimId, { 
      ...claimData, 
      status: 'Submitted',
      claim_stage: 'Submitted',
      workflow_id: workflow.id,
      current_stage_id: stage?.id || null,
      assigned_to: null,
      sla_due_date: stage?.sla_days ? new Date(Date.now() + stage.sla_days * 86400000) : null
    });

    if (billItems && billItems.length > 0) {
      await this.claimRepo.deleteBillItems(claimId);
      const formattedItems = billItems.map(item => ({
        bill_number: item.bill_number,
        bill_date: item.bill_date,
        category: item.category,
        cghs_code: item.cghs_code || null,
        amount_claimed: item.amount_claimed,
        amount_eligible: 0.00
      }));
      await this.claimRepo.addBillItems(claimId, formattedItems);
    }

    await this.claimRepo.addWorkflowHistory({
      claim_id: claimId,
      stage: 'Submitted',
      action: 'Submit',
      performed_by: userId,
      remarks: 'Claim submitted by employee via wizard.'
    });

    await this.claimRepo.writeAuditLog({
      user_id: userId,
      action: 'CLAIM_SUBMIT',
      entity_table: 'claims',
      entity_id: claimId,
      new_values: updatedClaim
    });

    try {
      await this.notifService.triggerWorkflowNotification('SUBMITTED', {
        userId: updatedClaim.employee_id,
        claimNumber: updatedClaim.claim_number,
        amount: Number(updatedClaim.total_amount_claimed),
        patientName: updatedClaim.patient_type
      });
    } catch (notifErr) {
      logger.error('Failed to trigger notification on submission', notifErr);
    }

    // Trigger AI Verification automatically
    this.runAiVerification(claimId, userId, workflow.id).catch(err => logger.error('AI Verification failed', err));

    return updatedClaim;
  }

  private async runAiVerification(claimId: string, userId: string, workflowId: string) {
    logger.info(`Running AI Verification for claim ${claimId}`);
    
    const stage = await this.workflowEngine.getWorkflowStageByCode(workflowId, 'AI Verification');
    const slaDueDate = stage?.sla_days ? new Date(Date.now() + stage.sla_days * 86400000) : null;

    // Set stage to AI Verification
    await this.claimRepo.updateClaim(claimId, { 
      claim_stage: 'AI Verification', 
      ai_status: 'Processing',
      current_stage_id: stage?.id || null,
      sla_due_date: slaDueDate
    });
    
    await this.claimRepo.addWorkflowHistory({
      claim_id: claimId,
      stage: 'AI Verification',
      action: 'AI Verification Started',
      performed_by: userId,
      remarks: 'AI is analyzing documents...'
    });

    // Simulate AI processing delay
    setTimeout(async () => {
      try {
        const claim = await this.claimRepo.getClaimById(claimId);
        if (!claim) return;
        
        // Mocking AI Verification logic
        const missingDocuments = claim.claim_documents?.length === 0;
        const aiScore = missingDocuments ? 40 : 95;
        const riskLevel = missingDocuments ? 'High' : 'Low';
        
        await supabaseAdmin.from('claim_ai_analysis').insert([{
          claim_id: claimId,
          risk_score: riskLevel,
          document_score: aiScore,
          missing_documents: missingDocuments ? JSON.stringify(['Prescription', 'Discharge Summary']) : '[]',
          summary: missingDocuments ? 'Required medical documents are missing.' : 'All documents verified successfully.',
          recommendation: missingDocuments ? 'Return to employee' : 'Proceed to Medical Officer'
        }]);

        if (missingDocuments) {
          // Dynamic Routing for return
          const nextStage = await this.workflowEngine.getNextStage(workflowId, 'AI Verification', 'return', 'System');
          
          await this.claimRepo.updateClaim(claimId, { 
            claim_stage: nextStage.stage_code, 
            ai_status: 'Failed',
            status: 'Returned for Correction',
            current_stage_id: nextStage.id,
            assigned_to: claim.employee_id, // Return to employee
            sla_due_date: null
          });
          
          await this.claimRepo.addWorkflowHistory({
            claim_id: claimId,
            stage: nextStage.stage_code,
            action: 'AI Returned',
            performed_by: userId,
            remarks: 'AI Verification failed: Missing mandatory documents.'
          });

          // Notify employee
          await this.notifService.triggerWorkflowNotification('RETURNED', {
            userId: claim.employee_id,
            claimNumber: claim.claim_number,
            amount: Number(claim.total_amount_claimed),
            patientName: claim.patient_type,
            comments: 'AI Verification failed: Missing mandatory documents.'
          });

        } else {
          // Dynamic Routing to next stage (Medical Officer)
          const nextStage = await this.workflowEngine.getNextStage(workflowId, 'AI Verification', 'approve', 'System');
          const claimantDistrict = claim.employees?.profiles?.district;
          const assignedOfficer = await this.assignmentEngine.assignClaim(claimId, nextStage.role, claimantDistrict);

          const nextSlaDueDate = nextStage.sla_days ? new Date(Date.now() + nextStage.sla_days * 86400000) : null;

          await this.claimRepo.updateClaim(claimId, { 
            claim_stage: nextStage.stage_code, 
            ai_status: 'Completed',
            risk_score: riskLevel,
            document_score: aiScore,
            status: 'Under Medical Review',
            current_stage_id: nextStage.id,
            assigned_to: assignedOfficer,
            sla_due_date: nextSlaDueDate,
            sla_breach_status: 'Within SLA'
          });
          
          await this.claimRepo.addWorkflowHistory({
            claim_id: claimId,
            stage: nextStage.stage_code,
            action: 'AI Approved',
            performed_by: userId,
            remarks: 'AI Verification passed. Forwarded to ' + nextStage.stage_name
          });
        }
      } catch (err) {
        logger.error(`AI Verification failed for claim ${claimId}`, err);
      }
    }, 2000); // 2 second mock delay
  }

  async getClaim(userId: string, role: string, district: string, claimId: string): Promise<any> {
    const claim = await this.claimRepo.getClaimById(claimId);
    if (!claim) {
      throw { statusCode: 404, message: 'Claim not found.', code: 'NOT_FOUND' };
    }

    if (['Medical Officer', 'Accounts Officer', 'DDO'].includes(role)) {
      const claimantDistrict = claim.employees?.profiles?.district;
      // Allow if they are assigned explicitly, OR if it's their district
      if (claim.assigned_to !== userId && claimantDistrict !== district) {
        throw { statusCode: 403, message: 'Forbidden: Claim is outside your district queue.', code: 'FORBIDDEN' };
      }
    } else if (role === 'Employee' && claim.employee_id !== userId) {
      throw { statusCode: 403, message: 'Forbidden: You do not own this claim.', code: 'FORBIDDEN' };
    }

    const billItems = await this.claimRepo.getBillItems(claimId);
    const documents = await this.claimRepo.getDocuments(claimId);
    const timeline = await this.claimRepo.getWorkflowHistory(claimId);

    const { data: aiAnalysis } = await supabaseAdmin 
      .from('claim_ai_analysis')
      .select('*')
      .eq('claim_id', claimId)
      .maybeSingle();

    return {
      ...claim,
      bill_items: billItems,
      documents,
      timeline,
      ai_analysis: aiAnalysis || null
    };
  }

  async getQueue(userId: string, role: string, district: string, status?: string, employeeId?: string): Promise<any[]> {
    return this.claimRepo.getClaimsQueue(userId, role, district, status, employeeId);
  }

  private async processWorkflowAction(
    userId: string,
    role: string,
    district: string,
    claimId: string,
    action: string, // 'approve', 'return', 'reject'
    actionData: any
  ): Promise<any> {
    const claim = await this.claimRepo.getClaimById(claimId);
    if (!claim) {
      throw { statusCode: 404, message: 'Claim not found.', code: 'NOT_FOUND' };
    }

    const claimantDistrict = claim.employees?.profiles?.district;
    if (claim.assigned_to !== userId && claimantDistrict !== district && !['Treasury', 'Administrator'].includes(role)) {
      throw { statusCode: 403, message: 'Forbidden: Claim is not assigned to you or in your district.', code: 'FORBIDDEN' };
    }

    const workflowId = claim.workflow_id || (await this.workflowEngine.getDefaultWorkflow()).id;
    const currentStage = claim.claim_stage;

    const nextStage = await this.workflowEngine.getNextStage(workflowId, currentStage, action, role);

    // Assign to next officer
    let assignedTo = null;
    if (nextStage.role === 'Employee') {
      assignedTo = claim.employee_id;
    } else if (nextStage.role !== 'System') {
      assignedTo = await this.assignmentEngine.assignClaim(claimId, nextStage.role, claimantDistrict);
    }

    const slaDueDate = nextStage.sla_days ? new Date(Date.now() + nextStage.sla_days * 86400000) : null;

    const updates: any = {
      claim_stage: nextStage.stage_code,
      workflow_id: workflowId,
      current_stage_id: nextStage.id,
      assigned_to: assignedTo,
      sla_due_date: slaDueDate,
      sla_breach_status: slaDueDate ? 'Within SLA' : null,
      status: `Moved to ${nextStage.stage_name}`
    };

    // Maintain legacy fields for compatibility
    if (action === 'approve') {
      if (role === 'Medical Officer' || (role === 'Administrator' && currentStage === 'Medical Officer Review')) {
        updates.medical_status = 'Approved';
      } else if (role === 'Accounts Officer' || (role === 'Administrator' && currentStage === 'Accounts Review')) {
        updates.accounts_status = 'Approved';
      } else if (role === 'DDO' || (role === 'Administrator' && currentStage === 'DDO Approval')) {
        updates.ddo_status = 'Approved';
        updates.sanction_number = actionData.sanction_number || `SANC-${claim.claim_number}`;
        updates.sanction_date = actionData.sanction_date || new Date().toISOString().split('T')[0];
      } else if (role === 'Treasury' || (role === 'Administrator' && currentStage === 'Treasury Processing')) {
        updates.treasury_status = 'Paid';
        updates.payment_status = 'Completed';
        updates.utr_number = actionData.utr_number || 'SIMULATED_UTR_' + Date.now();
        updates.payment_reference = actionData.payment_reference_number || 'SIM_REF_' + Date.now();
        updates.payment_date = actionData.payment_date || new Date().toISOString();
      }
    } else if (action === 'return') {
      updates.status = 'Returned for Correction';
      if (role === 'Medical Officer') updates.medical_status = 'Returned';
      if (role === 'Accounts Officer') updates.accounts_status = 'Returned';
      if (role === 'DDO') updates.ddo_status = 'Returned';
    } else if (action === 'reject') {
      updates.status = 'Closed';
      if (role === 'Medical Officer') updates.medical_status = 'Rejected';
      if (role === 'Accounts Officer') updates.accounts_status = 'Rejected';
      if (role === 'DDO') updates.ddo_status = 'Rejected';
    }

    const updatedClaim = await this.claimRepo.updateClaim(claimId, updates);

    // Bill adjustments
    if (action === 'approve' && role === 'Accounts Officer' && actionData.bill_adjustments) {
      for (const adj of actionData.bill_adjustments) {
        await this.claimRepo.updateBillItemEligible(adj.bill_item_id, adj.amount_eligible);
      }
      if (actionData.total_eligible) {
        await this.claimRepo.updateClaim(claimId, { eligible_amount: actionData.total_eligible, total_amount_eligible: actionData.total_eligible });
      }
    }
    if (action === 'approve' && role === 'DDO' && claim.eligible_amount) {
      await this.claimRepo.updateClaim(claimId, { approved_amount: claim.eligible_amount, total_amount_approved: claim.eligible_amount });
    }

    // Payment insertion
    if (nextStage.stage_code === 'Paid') {
      const pDate = actionData.payment_date || new Date().toISOString();
      await supabaseAdmin
        .from('payments')
        .insert([{
          claim_id: claimId,
          bank_name: claim.employees?.bank_name || 'Bank',
          account_number: claim.employees?.bank_account_no,
          utr: actionData.utr_number,
          status: 'Completed',
          payment_reference: updates.payment_reference,
          payment_date: pDate
        }]);
    }

    await this.claimRepo.addWorkflowHistory({
      claim_id: claimId,
      stage: nextStage.stage_code,
      action: action.charAt(0).toUpperCase() + action.slice(1),
      performed_by: userId,
      role: role,
      remarks: actionData.comments || `${action} by ${role}.`
    });

    await this.claimRepo.writeAuditLog({
      user_id: userId,
      action: `CLAIM_${action.toUpperCase()}`,
      entity_table: 'claims',
      entity_id: claimId,
      old_values: { claim_stage: currentStage },
      new_values: { claim_stage: nextStage.stage_code, comment: actionData.comments }
    });

    // Notifications
    try {
      if (nextStage.stage_code === 'Paid') {
        await this.notifService.triggerWorkflowNotification('PAID', {
          userId: claim.employee_id,
          claimNumber: claim.claim_number,
          amount: Number(claim.approved_amount || claim.eligible_amount || claim.total_amount_claimed),
          patientName: claim.patient_type,
          txnRef: updates.payment_reference,
          bankAccount: claim.employees?.bank_account_no || 'Registered Account'
        });
      } else if (action === 'approve') {
        await this.notifService.triggerWorkflowNotification('APPROVED', {
          userId: claim.employee_id,
          claimNumber: claim.claim_number,
          amount: Number(claim.total_amount_claimed),
          patientName: claim.patient_type,
          role: role
        });
      } else if (action === 'return') {
        await this.notifService.triggerWorkflowNotification('RETURNED', {
          userId: claim.employee_id,
          claimNumber: claim.claim_number,
          amount: Number(claim.total_amount_claimed),
          patientName: claim.patient_type,
          comments: actionData.comments
        });
      } else if (action === 'reject') {
        await this.notifService.triggerWorkflowNotification('REJECTED', {
          userId: claim.employee_id,
          claimNumber: claim.claim_number,
          amount: Number(claim.total_amount_claimed),
          patientName: claim.patient_type,
          role: role,
          comments: actionData.comments
        });
      }
    } catch (notifErr) {
      logger.error(`Failed to trigger notification on ${action}`, notifErr);
    }

    return updatedClaim;
  }

  async approveClaim(userId: string, role: string, district: string, claimId: string, approvalData: any): Promise<any> {
    return this.processWorkflowAction(userId, role, district, claimId, 'approve', approvalData);
  }

  async returnClaim(userId: string, role: string, district: string, claimId: string, comments: string): Promise<any> {
    return this.processWorkflowAction(userId, role, district, claimId, 'return', { comments });
  }

  async rejectClaim(userId: string, role: string, district: string, claimId: string, comments: string): Promise<any> {
    return this.processWorkflowAction(userId, role, district, claimId, 'reject', { comments });
  }

  async requestUploadSignature(userId: string, claimId: string, filename: string, category: any): Promise<any> {
    const claim = await this.claimRepo.getClaimById(claimId);
    if (!claim) {
      throw { statusCode: 404, message: 'Claim not found.', code: 'NOT_FOUND' };
    }
    if (claim.employee_id !== userId) {
      throw { statusCode: 403, message: 'Forbidden: You do not own this claim.', code: 'FORBIDDEN' };
    }
    if (!['Draft', 'Returned'].includes(claim.claim_stage)) {
      throw { statusCode: 400, message: 'Documents can only be uploaded for Draft or Returned claims.', code: 'BAD_REQUEST' };
    }

    const storagePath = `claims/${userId}/${claimId}/${Date.now()}_${filename}`;

    const docMeta = await this.claimRepo.addDocument(claimId, {
      category,
      file_name: filename,
      storage_path: storagePath,
      ocr_status: 'Pending'
    });

    return {
      document_id: docMeta.id,
      storage_path: storagePath,
      upload_instructions: {
        bucket: 'claim-documents',
        path: storagePath,
        msg: 'Upload file directly using Supabase client to this path.'
      }
    };
  }
}
