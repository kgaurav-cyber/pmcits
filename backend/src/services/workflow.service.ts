import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

export class WorkflowEngineService {
  /**
   * Determine the next workflow stage based on the current stage and the action taken.
   */
  async getNextStage(workflowId: string, currentStageCode: string, action: string, role: string): Promise<any> {
    try {
      // Allow administrator override by skipping exact role match if the transition exists
      let query = supabaseAdmin
        .from('workflow_transition')
        .select(`
          to_stage,
          action,
          role
        `)
        .eq('workflow_id', workflowId)
        .eq('from_stage', currentStageCode)
        .eq('action', action)
        .eq('is_active', true);

      // Only filter by role if it's not the Administrator trying to override
      if (role !== 'Administrator') {
        query = query.eq('role', role);
      }

      const { data, error } = await query.single();

      if (error || !data) {
        logger.error(`No valid transition found for ${currentStageCode} via ${action} by ${role}`);
        throw { statusCode: 400, message: `Invalid workflow transition for role ${role} on stage ${currentStageCode}.`, code: 'INVALID_TRANSITION' };
      }

      // Get the details of the next stage
      const { data: stageData, error: stageError } = await supabaseAdmin
        .from('workflow_stage')
        .select('*')
        .eq('workflow_id', workflowId)
        .eq('stage_code', data.to_stage)
        .single();

      if (stageError || !stageData) {
        logger.error(`Destination stage ${data.to_stage} not found in workflow configuration.`);
        throw { statusCode: 500, message: 'Workflow configuration error.', code: 'WORKFLOW_ERROR' };
      }

      return stageData;
    } catch (e) {
      throw e;
    }
  }

  async getWorkflowStageByCode(workflowId: string, stageCode: string): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('workflow_stage')
      .select('*')
      .eq('workflow_id', workflowId)
      .eq('stage_code', stageCode)
      .single();
    
    return data || null;
  }

  async getDefaultWorkflow(): Promise<any> {
    const { data } = await supabaseAdmin
      .from('workflow_master')
      .select('id, workflow_name')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    return data;
  }
}
