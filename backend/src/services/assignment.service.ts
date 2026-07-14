import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

export class AssignmentEngineService {
  /**
   * Intelligently assigns a claim to an officer based on Role, District, and Workload.
   * If it cannot find an officer, it leaves assigned_to null (falling to Exception Queue).
   */
  async assignClaim(claimId: string, targetRole: string, claimDistrict: string | null): Promise<string | null> {
    try {
      if (['System', 'Employee', 'Administrator'].includes(targetRole)) {
        // System/Employee stages don't require an explicit assignment
        return null;
      }

      // Step 1: Find all active users with the correct role
      let query = supabaseAdmin
        .from('users')
        .select('id, district, role')
        .eq('role', targetRole);
        
      const { data: users, error } = await query;
      if (error || !users || users.length === 0) {
        logger.warn(`No active users found for role ${targetRole}. Claim ${claimId} going to Exception Queue.`);
        return null;
      }

      // Step 2: Filter by District if the role is district-based (MO, AO, DDO)
      let eligibleOfficers = users;
      if (claimDistrict && ['Medical Officer', 'Accounts Officer', 'DDO'].includes(targetRole)) {
        eligibleOfficers = users.filter(u => u.district === claimDistrict);
        
        if (eligibleOfficers.length === 0) {
          logger.warn(`No ${targetRole} found in district ${claimDistrict}. Falling back to state-wide pool or Exception Queue.`);
          // If strict mapping is required, return null. We'll return null to send it to Exception Queue.
          return null;
        }
      }

      if (eligibleOfficers.length === 1) {
        // Only one person can take it
        return eligibleOfficers[0].id;
      }

      // Step 3: Workload balancing. Find officer with the lowest number of pending claims.
      // This is a naive workload calculation (counting claims currently assigned to them)
      const officerIds = eligibleOfficers.map(u => u.id);
      
      const { data: claimsData } = await supabaseAdmin
        .from('claims')
        .select('assigned_to')
        .in('assigned_to', officerIds)
        .in('status', ['Under Medical Review', 'Under Accounts Review', 'Approved by DDO', 'Treasury Processing']);

      const workloadMap = new Map<string, number>();
      officerIds.forEach(id => workloadMap.set(id, 0));

      if (claimsData) {
        claimsData.forEach(c => {
          if (c.assigned_to) {
            workloadMap.set(c.assigned_to, (workloadMap.get(c.assigned_to) || 0) + 1);
          }
        });
      }

      // Find the officer with the minimum workload
      let bestOfficer = eligibleOfficers[0].id;
      let minLoad = Infinity;

      for (const [officerId, load] of workloadMap.entries()) {
        if (load < minLoad) {
          minLoad = load;
          bestOfficer = officerId;
        }
      }

      logger.info(`Assigned claim ${claimId} to officer ${bestOfficer} with current workload ${minLoad}`);
      return bestOfficer;

    } catch (e) {
      logger.error('Error in AssignmentEngine', e);
      return null;
    }
  }
}
