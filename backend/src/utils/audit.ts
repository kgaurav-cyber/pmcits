import { supabaseAdmin } from '../config/supabase';
import { logger } from './logger';

export async function logAudit(
  userId: string | null,
  action: string,
  ipAddress: string,
  entityTable: string,
  entityId: string | null,
  oldValues: any = {},
  newValues: any = {}
) {
  try {
    logger.info(`Audit log writing: ${action} by user ${userId} from IP ${ipAddress}`);
    const { error } = await supabaseAdmin
      .from('audit_logs')
      .insert([{
        user_id: userId,
        action,
        ip_address: ipAddress,
        entity_table: entityTable,
        entity_id: entityId,
        old_values: oldValues,
        new_values: newValues
      }]);
    if (error) {
      logger.error('Failed to write audit log entry to database', error);
    }
  } catch (err) {
    logger.error('Error logging audit trail', err);
  }
}
