import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

export interface NotificationPayload {
  userId: string;
  claimNumber: string;
  amount: number;
  patientName: string;
  comments?: string;
  role?: string;
  txnRef?: string;
  bankAccount?: string;
}

export class NotificationService {
  
  async getUserNotifications(userId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error(`Error loading notifications for user ${userId}`, error);
      throw error;
    }
    return data || [];
  }

  async markAsRead(userId: string, notificationId: string): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      logger.error(`Error marking notification ${notificationId} as read`, error);
      throw error;
    }
    return data;
  }

  async sendSystemNotification(userId: string, title: string, message: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('notifications')
      .insert([{
        user_id: userId,
        title,
        message,
        read: false
      }]);

    if (error) {
      logger.error(`Error sending notification to user ${userId}`, error);
    }
  }

  /**
   * Dispatches unified multi-channel notifications (In-app, simulated Email & SMS)
   */
  async triggerWorkflowNotification(
    eventType: 'SUBMITTED' | 'RETURNED' | 'APPROVED' | 'REJECTED' | 'PAID' | 'DELAY' | 'ESCALATED',
    payload: NotificationPayload
  ): Promise<void> {
    const { userId, claimNumber, amount, comments, role, txnRef, bankAccount } = payload;
    
    // Resolve email address and phone number for user
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .maybeSingle();

    const email = profile?.email || 'officer@police.gov.in';
    const fullName = profile?.full_name || 'Officer';

    let inAppTitle = '';
    let inAppMessage = '';
    let emailSubject = '';
    let emailBody = '';
    let smsBody = '';

    switch (eventType) {
      case 'SUBMITTED':
        inAppTitle = 'Claim File Submitted';
        inAppMessage = `Claim reference ${claimNumber} has been submitted for Medical Review.`;
        emailSubject = `PMCITS: Claim Submitted - ${claimNumber}`;
        emailBody = `Dear ${fullName},\n\nYour medical claim file ${claimNumber} for INR ${amount.toLocaleString()} has been successfully submitted and routed to the Medical Officer queue for clinical auditing.`;
        smsBody = `PMCITS: Claim ${claimNumber} of INR ${amount.toLocaleString()} has been submitted. Check portal.`;
        break;

      case 'ESCALATED':
        inAppTitle = 'SLA Escalation';
        inAppMessage = comments || `Claim ${claimNumber} SLA exceeded.`;
        emailSubject = `PMCITS URGENT: SLA Escalation - ${claimNumber}`;
        emailBody = `Dear ${fullName},\n\n${comments || 'A claim assigned to you has exceeded its SLA.'}`;
        smsBody = `PMCITS URGENT: Claim ${claimNumber} SLA exceeded. Please process immediately.`;
        break;

      case 'RETURNED':
        inAppTitle = 'Claim Returned for Correction';
        inAppMessage = `Claim file ${claimNumber} has been returned. Comments: ${comments || 'None'}`;
        emailSubject = `PMCITS: Action Required - Claim ${claimNumber} Returned`;
        emailBody = `Dear ${fullName},\n\nYour claim file ${claimNumber} has been returned by the audit team for correction.\n\nReason/Comments: ${comments || 'Please verify bill attachments.'}\n\nPlease update and resubmit.`;
        smsBody = `PMCITS Alert: Claim ${claimNumber} returned for correction: "${comments || 'Verify bills'}".`;
        break;

      case 'APPROVED':
        inAppTitle = 'Claim Approved';
        inAppMessage = `Claim ${claimNumber} approved by ${role || 'Officer'} and routed forward.`;
        emailSubject = `PMCITS: Claim Approved - ${claimNumber}`;
        emailBody = `Dear ${fullName},\n\nYour claim file ${claimNumber} has been approved by the ${role || 'Reviewing Officer'} and forwarded to the next auditing stage.`;
        smsBody = `PMCITS: Claim ${claimNumber} approved by ${role}. Status updated.`;
        break;

      case 'REJECTED':
        inAppTitle = 'Claim Disapproved / Rejected';
        inAppMessage = `Claim file ${claimNumber} was rejected by ${role || 'Officer'}. Comments: ${comments}`;
        emailSubject = `PMCITS: Claim Rejected - ${claimNumber}`;
        emailBody = `Dear ${fullName},\n\nYour medical reimbursement file ${claimNumber} has been rejected.\n\nComments: ${comments || 'Does not qualify under CGHS rules.'}`;
        smsBody = `PMCITS: Claim ${claimNumber} rejected. Reason: ${comments}`;
        break;

      case 'PAID':
        inAppTitle = 'Reimbursement Disbursed';
        inAppMessage = `Disbursement of INR ${amount.toLocaleString()} completed for claim ${claimNumber}.`;
        emailSubject = `PMCITS: Payment Disbursed - ${claimNumber}`;
        emailBody = `Dear ${fullName},\n\nReimbursement payment for claim ${claimNumber} has been successfully credited to your registered bank account ${bankAccount || 'ending in routing code'}.\n\nDisbursed Amount: INR ${amount.toLocaleString()}\nTransaction Reference: ${txnRef || 'N/A'}`;
        smsBody = `PMCITS Payment: INR ${amount.toLocaleString()} disbursed for claim ${claimNumber}. Txn: ${txnRef}.`;
        break;

      case 'DELAY':
        inAppTitle = 'SLA Delay Alert Warning';
        inAppMessage = `Urgent: Claim ${claimNumber} has exceeded queue limit SLA.`;
        emailSubject = `PMCITS: SLA Limit Breached - Claim ${claimNumber}`;
        emailBody = `Dear Officer,\n\nClaim file ${claimNumber} has been pending in your stage for more than 7 days, breaching the defined SLA limit.\n\nPlease audit and process the file immediately.`;
        smsBody = `PMCITS SLA Alert: Claim ${claimNumber} has breached processing SLA limits. Immediate action required.`;
        break;
    }

    // 1. Dispatch In-App Notification (Supabase database entry)
    await this.sendSystemNotification(userId, inAppTitle, inAppMessage);

    // 2. Dispatch Email (Simulate SMTP client send logs)
    logger.info(`[SMTP EMAIL CHANNEL] Sending to: ${email}`);
    logger.info(`[SMTP Subject]: ${emailSubject}`);
    logger.info(`[SMTP Body]:\n${emailBody}`);

    // 3. Dispatch SMS (Simulate SMS Gateway API dispatch logs)
    logger.info(`[SMS GATEWAY CHANNEL] Dispatching text message to profile device:`);
    logger.info(`[SMS Body]: ${smsBody}`);
  }

  /**
   * Scans for claims stuck in queues and generates Delay Alerts notifications.
   */
  async scanAndTriggerDelayAlerts(): Promise<number> {
    logger.info('Scanning for delayed claims breaching SLAs...');
    // Fetch all claims that are pending action
    const { data: claims, error } = await supabaseAdmin
      .from('claims')
      .select('id, claim_number, employee_id, status, updated_at, created_at, total_amount_claimed')
      .not('status', 'in', '("Paid","Closed","Returned for Correction","Draft")');

    if (error) {
      logger.error('Error scanning claims for SLA delays', error);
      return 0;
    }

    const now = new Date();
    let triggeredCount = 0;

    for (const claim of claims) {
      const updatedAtDate = new Date(claim.updated_at || claim.created_at);
      const diffTime = Math.abs(now.getTime() - updatedAtDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // If claim stuck in a stage for more than 7 days (or 0 days for immediate demonstration simulation!)
      if (diffDays >= 7) {
        triggeredCount++;
        await this.triggerWorkflowNotification('DELAY', {
          userId: claim.employee_id,
          claimNumber: claim.claim_number,
          amount: Number(claim.total_amount_claimed),
          patientName: 'Self/Dependent'
        });
      }
    }

    return triggeredCount;
  }
}
