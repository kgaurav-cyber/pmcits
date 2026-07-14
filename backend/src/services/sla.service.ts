import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';
import { NotificationService } from '../notifications/notification.service';

export class SLAEngineService {
  private notifService = new NotificationService();

  async checkSLABreaches(): Promise<void> {
    logger.info('Running SLA Breach check...');
    
    try {
      // Find all claims where sla_due_date is in the past and sla_breach_status is 'Within SLA'
      const { data: breachedClaims, error } = await supabaseAdmin
        .from('claims')
        .select(`
          id,
          claim_number,
          claim_stage,
          assigned_to,
          employee_id,
          employees!inner(
            profiles!inner(
              full_name
            )
          )
        `)
        .lt('sla_due_date', new Date().toISOString())
        .eq('sla_breach_status', 'Within SLA');

      if (error) {
        logger.error('Error fetching SLA breaches', error);
        return;
      }

      if (!breachedClaims || breachedClaims.length === 0) {
        logger.info('No new SLA breaches detected.');
        return;
      }

      logger.warn(`Found ${breachedClaims.length} new SLA breached claims. Escalating...`);

      for (const claim of breachedClaims) {
        // Mark as breached
        await supabaseAdmin
          .from('claims')
          .update({ sla_breach_status: 'Breached - Escalated' })
          .eq('id', claim.id);

        // Audit log for escalation
        await supabaseAdmin
          .from('audit_logs')
          .insert([{
            user_id: claim.assigned_to || claim.employee_id, // Who was supposed to act
            action: 'SLA_BREACH',
            entity_table: 'claims',
            entity_id: claim.id,
            new_values: { sla_breach_status: 'Breached - Escalated' }
          }]);

        // Notify assigned officer
        if (claim.assigned_to) {
          try {
            await this.notifService.triggerWorkflowNotification('ESCALATED', {
              userId: claim.assigned_to,
              claimNumber: claim.claim_number,
              patientName: 'Confidential',
              amount: 0,
              comments: `SLA exceeded for claim ${claim.claim_number}. Please process immediately.`
            });
          } catch (e) {
            logger.error(`Failed to send SLA notification to ${claim.assigned_to}`);
          }
        }
      }
    } catch (e) {
      logger.error('SLA Engine execution failed', e);
    }
  }
}
