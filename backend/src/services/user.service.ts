import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';
import bcrypt from 'bcryptjs';

export class UserService {

  async listUsers(search?: string, roleFilter?: string, status?: string): Promise<any[]> {
    let query = supabaseAdmin
      .from('profiles')
      .select('*, employees(*)');

    if (roleFilter) query = query.eq('role', roleFilter);
    if (status === 'active') {
      query = query.eq('is_disabled', false).eq('first_login_required', false);
    } else if (status === 'disabled') {
      query = query.eq('is_disabled', true);
    } else if (status === 'pending') {
      query = query.eq('first_login_required', true);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      logger.error('Failed to list profiles', error);
      throw error;
    }

    let results = data || [];

    if (search) {
      const lower = search.toLowerCase();
      results = results.filter((p: any) =>
        p.full_name?.toLowerCase().includes(lower) ||
        p.email?.toLowerCase().includes(lower) ||
        p.district?.toLowerCase().includes(lower) ||
        p.employees?.gpf_cps_number?.toLowerCase().includes(lower) ||
        p.employees?.employee_id?.toLowerCase().includes(lower) ||
        p.employees?.police_unit?.toLowerCase().includes(lower)
      );
    }

    return results;
  }

  async getUserById(userId: string): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*, employees(*)')
      .eq('id', userId)
      .single();

    if (error) throw error;

    return data;
  }

  async createEmployee(adminId: string, employeeData: any): Promise<any> {
    const {
      email,
      full_name,
      district,
      phone,
      mobile,
      gpf_cps_number,
      employee_id,
      rank,
      designation,
      police_unit,
      joining_date,
      bank_account_no,
      bank_ifsc,
      role = 'Employee'
    } = employeeData;

    logger.info(`Admin ${adminId} is creating user account: ${email}`);

    const tempPassword = `Pmcits@${Math.random().toString(36).slice(-6).toUpperCase()}1`;
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const { data: newUserId, error: authError } = await supabaseAdmin.rpc('create_new_auth_user', {
      p_email: email,
      p_password_hash: passwordHash,
      p_metadata: {
        role,
        district,
        full_name,
        first_login_required: true,
        is_disabled: false,
      }
    });

    if (authError || !newUserId) {
      logger.error('Failed creating Supabase Auth account via RPC', authError);
      throw authError || new Error('Auth user creation failed.');
    }

    // Profile is auto-created by trigger; update phone
    await supabaseAdmin.from('profiles').update({ phone }).eq('id', newUserId);

    const { data: employeeRow, error: empError } = await supabaseAdmin
      .from('employees')
      .insert([{
        id: newUserId,
        gpf_cps_number,
        employee_id,
        rank,
        designation,
        bank_account_no,
        bank_ifsc,
        mobile,
        police_unit,
        joining_date: joining_date || null,
      }])
      .select()
      .single();

    if (empError) {
      logger.error('Failed inserting employee record, rolling back auth account', empError);
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw empError;
    }

    await supabaseAdmin.from('audit_logs').insert([{
      user_id: adminId,
      action: 'ACCOUNT_CREATION',
      entity_table: 'profiles',
      entity_id: newUserId,
      new_values: { email, full_name, role, district, phone, gpf_cps_number, employee_id, rank, designation, police_unit }
    }]);

    return {
      id: newUserId,
      email,
      full_name,
      temp_password: tempPassword,
      employee_details: employeeRow
    };
  }

  async updateEmployee(adminId: string, userId: string, updateData: any): Promise<any> {
    const {
      full_name,
      district,
      phone,
      mobile,
      gpf_cps_number,
      employee_id,
      rank,
      designation,
      police_unit,
      joining_date,
      bank_account_no,
      bank_ifsc,
      role,
      status
    } = updateData;

    logger.info(`Admin ${adminId} updating profile ${userId}`);

    const { data: oldProfile } = await supabaseAdmin.from('profiles').select('*, employees(*)').eq('id', userId).single();

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ full_name, district, phone, role })
      .eq('id', userId);

    if (profileError) throw profileError;

    const { error: empError } = await supabaseAdmin
      .from('employees')
      .update({ gpf_cps_number, employee_id, rank, designation, bank_account_no, bank_ifsc, mobile, police_unit, joining_date: joining_date || null })
      .eq('id', userId);

    if (empError) throw empError;

    // Sync Auth metadata
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    const existingMeta = authUser?.user?.user_metadata || {};

    let metaUpdate: any = { ...existingMeta, role, district, full_name };
    if (status !== undefined) {
      metaUpdate.is_disabled = status === 'disabled';
    }

    await supabaseAdmin.auth.admin.updateUserById(userId, { user_metadata: metaUpdate });

    await supabaseAdmin.from('audit_logs').insert([{
      user_id: adminId,
      action: 'ACCOUNT_UPDATE',
      entity_table: 'profiles',
      entity_id: userId,
      old_values: oldProfile || {},
      new_values: updateData
    }]);

    return { success: true };
  }

  async resetPassword(adminId: string, userId: string, customPassword?: string): Promise<string> {
    logger.info(`Admin ${adminId} resetting password for user ${userId}`);

    const tempPassword = customPassword || `Pmcits@${Math.random().toString(36).slice(-6).toUpperCase()}1`;

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    const existingMeta = authUser?.user?.user_metadata || {};

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: tempPassword,
      user_metadata: { ...existingMeta, first_login_required: true }
    });

    if (error) {
      logger.error('Failed password reset', error);
      throw error;
    }

    await supabaseAdmin.from('audit_logs').insert([{
      user_id: adminId,
      action: 'PASSWORD_RESET',
      entity_table: 'profiles',
      entity_id: userId,
      new_values: { first_login_required: true }
    }]);

    return tempPassword;
  }

  async toggleUserStatus(adminId: string, userId: string, disabled: boolean): Promise<void> {
    logger.info(`Admin ${adminId} setting disabled=${disabled} for ${userId}`);

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    const existingMeta = authUser?.user?.user_metadata || {};

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { ...existingMeta, is_disabled: disabled }
    });

    if (error) {
      logger.error('Failed status change', error);
      throw error;
    }

    // Update profiles table
    await supabaseAdmin
      .from('profiles')
      .update({ is_disabled: disabled })
      .eq('id', userId);

    await supabaseAdmin.from('audit_logs').insert([{
      user_id: adminId,
      action: disabled ? 'ACCOUNT_DISABLED' : 'ACCOUNT_ENABLED',
      entity_table: 'profiles',
      entity_id: userId,
      new_values: { is_disabled: disabled }
    }]);
  }

  async assignRole(adminId: string, userId: string, role: any): Promise<void> {
    logger.info(`Admin ${adminId} setting role=${role} for ${userId}`);

    const { error: dbError } = await supabaseAdmin.from('profiles').update({ role }).eq('id', userId);
    if (dbError) throw dbError;

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    const existingMeta = authUser?.user?.user_metadata || {};

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { ...existingMeta, role }
    });

    if (authError) throw authError;

    await supabaseAdmin.from('audit_logs').insert([{
      user_id: adminId,
      action: 'ROLE_CHANGE',
      entity_table: 'profiles',
      entity_id: userId,
      new_values: { role }
    }]);
  }

  async bulkImport(adminId: string, rows: any[]): Promise<any> {
    logger.info(`Admin ${adminId} started bulk import of ${rows.length} rows`);

    // Create import job record
    const { data: job, error: jobErr } = await supabaseAdmin
      .from('import_jobs')
      .insert([{
        imported_by: adminId,
        total_users: rows.length,
        successful_imports: 0,
        failed_imports: 0,
        duplicate_records: 0,
        status: 'Running'
      }])
      .select()
      .single();

    if (jobErr || !job) {
      logger.error('Failed to create import job record', jobErr);
      throw jobErr || new Error('Failed to create import job');
    }

    const successes: any[] = [];
    const failures: any[] = [];
    let duplicateCount = 0;
    let successCount = 0;
    let failureCount = 0;

    for (const row of rows) {
      try {
        // Basic validations
        if (!row.email || !row.full_name || !row.gpf_cps_number || !row.district || !row.rank || !row.designation || !row.bank_account_no || !row.bank_ifsc) {
          throw new Error('Missing required fields (email, full_name, gpf_cps_number, district, rank, designation, bank_account_no, bank_ifsc)');
        }

        const email = row.email.trim().toLowerCase();
        const gpf = row.gpf_cps_number.trim();
        const employeeId = row.employee_id ? row.employee_id.trim() : `EMP-${gpf.split('-').pop()}`;

        // Check duplicates
        const { data: dupEmail } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        const { data: dupGpf } = await supabaseAdmin
          .from('employees')
          .select('id')
          .or(`gpf_cps_number.eq."${gpf}",employee_id.eq."${employeeId}"`)
          .maybeSingle();

        if (dupEmail || dupGpf) {
          duplicateCount++;
          continue;
        }

        // Generate temporary password
        const tempPassword = `Pmcits@${Math.random().toString(36).slice(-6).toUpperCase()}1`;
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        // Create auth user using our RPC function
        const { data: newUserId, error: authError } = await supabaseAdmin.rpc('create_new_auth_user', {
          p_email: email,
          p_password_hash: passwordHash,
          p_metadata: {
            role: row.role || 'Employee',
            district: row.district,
            full_name: row.full_name,
            first_login_required: true,
            is_disabled: false,
          }
        });

        if (authError || !newUserId) {
          throw authError || new Error('Auth creation failed');
        }

        // Profile phone sync
        await supabaseAdmin.from('profiles').update({ phone: row.phone || '' }).eq('id', newUserId);

        // Insert employee details
        const { error: empError } = await supabaseAdmin
          .from('employees')
          .insert([{
            id: newUserId,
            gpf_cps_number: gpf,
            employee_id: employeeId,
            rank: row.rank,
            designation: row.designation,
            bank_account_no: row.bank_account_no,
            bank_ifsc: row.bank_ifsc,
            mobile: row.mobile || '',
            police_unit: row.police_unit || '',
            joining_date: row.joining_date || null
          }]);

        if (empError) {
          await supabaseAdmin.auth.admin.deleteUser(newUserId);
          throw empError;
        }

        successCount++;
        successes.push({
          id: newUserId,
          email,
          full_name: row.full_name,
          employee_id: employeeId,
          temp_password: tempPassword,
          role: row.role || 'Employee',
          district: row.district
        });
      } catch (err: any) {
        failureCount++;
        const errorMsg = err.message || 'Import database write error.';
        failures.push({ email: row.email || 'unknown', error: errorMsg });

        // Log failed record
        await supabaseAdmin
          .from('import_failed_records')
          .insert([{
            job_id: job.id,
            row_data: row,
            error_message: errorMsg
          }]);
      }
    }

    // Complete the import job stats
    await supabaseAdmin
      .from('import_jobs')
      .update({
        successful_imports: successCount,
        failed_imports: failureCount,
        duplicate_records: duplicateCount,
        status: 'Completed'
      })
      .eq('id', job.id);

    // Audit log
    await supabaseAdmin.from('audit_logs').insert([{
      user_id: adminId,
      action: 'BULK_IMPORT',
      entity_table: 'import_jobs',
      entity_id: job.id,
      new_values: { imported_rows_count: rows.length, success_count: successCount, failure_count: failureCount, duplicate_count: duplicateCount }
    }]);

    return {
      jobId: job.id,
      success_count: successCount,
      failure_count: failureCount,
      duplicate_count: duplicateCount,
      successes,
      failures
    };
  }

  async sendOnboardingEmails(adminId: string, jobId: string | null, accounts: any[]): Promise<any> {
    logger.info(`Admin ${adminId} triggered onboarding emails dispatch for ${accounts.length} users`);
    
    let sent = 0;
    let failed = 0;

    for (const acc of accounts) {
      try {
        const { data: userProfile } = await supabaseAdmin.from('profiles').select('id').eq('email', acc.email).single();
        const userId = userProfile ? userProfile.id : null;

        // Insert queued state
        const { data: trackRow } = await supabaseAdmin
          .from('email_tracking')
          .insert([{
            job_id: jobId || null,
            user_id: userId,
            email_address: acc.email,
            status: 'Queued'
          }])
          .select('id')
          .single();

        if (!trackRow) {
          throw new Error('Failed to create email tracking record');
        }

        const trackingId = (trackRow as any).id;

        // Transition to sending
        await supabaseAdmin.from('email_tracking').update({ status: 'Sending' }).eq('id', trackingId);

        // Simulation sending email with logger details
        const subject = `PMCITS Onboarding: Credentials for ${acc.full_name}`;
        const body = `Dear ${acc.full_name},

Welcome to the Police Medical Claims Intelligence & Transparency System (PMCITS).
Your employee account has been created successfully. Below are your temporary login credentials:

Employee ID: ${acc.employee_id}
Username: ${acc.employee_id}
Temporary Password: ${acc.temp_password}
Portal Login URL: http://localhost:3000/login

Instructions:
1. Navigate to the Portal Login URL.
2. Enter your Username (Employee ID) and the Temporary Password.
3. Upon first login, you will be prompted to choose a new secure password.
4. Distribute and store these credentials securely.

Regards,
PMCITS Administration`;

        logger.info(`[SMTP ONBOARDING EMAIL] Dispatching to: ${acc.email}`);
        logger.info(`[SMTP Subject]: ${subject}`);
        logger.info(`[SMTP Body]:\n${body}`);

        // Introduce a minor random SMTP connection fail (5% chance) for testing retries
        const shouldFail = Math.random() < 0.05;
        if (shouldFail) {
          throw new Error('SMTP Timeout: Connection to mail server timed out.');
        }

        // Mark as Delivered
        await supabaseAdmin.from('email_tracking').update({ status: 'Delivered' }).eq('id', trackingId);
        
        if (jobId) {
          await supabaseAdmin.rpc('increment_job_email_sent', { p_job_id: jobId });
        }
        sent++;
      } catch (err: any) {
        failed++;
        logger.error(`Failed sending onboarding email to ${acc.email}`, err);
        // Find if we had a tracking ID or just create failed entry
        await supabaseAdmin
          .from('email_tracking')
          .insert([{
            job_id: jobId || null,
            email_address: acc.email,
            status: 'Failed',
            error_message: err.message || 'SMTP client dispatch error'
          }]);
        
        if (jobId) {
          await supabaseAdmin.rpc('increment_job_email_failed', { p_job_id: jobId });
        }
      }
    }

    return { sent, failed };
  }

  async getImportJobs(): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('import_jobs')
      .select('*, profiles:imported_by(full_name, email)')
      .order('import_date', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async getImportJobReport(jobId: string): Promise<any> {
    const { data: job, error: jobErr } = await supabaseAdmin
      .from('import_jobs')
      .select('*, profiles:imported_by(full_name, email)')
      .eq('id', jobId)
      .single();
    if (jobErr) throw jobErr;

    const { data: failures, error: failErr } = await supabaseAdmin
      .from('import_failed_records')
      .select('*')
      .eq('job_id', jobId);
    if (failErr) throw failErr;

    const { data: emails, error: emailErr } = await supabaseAdmin
      .from('email_tracking')
      .select('*, profiles:user_id(full_name, email)')
      .eq('job_id', jobId);
    if (emailErr) throw emailErr;

    return { job, failures: failures || [], emails: emails || [] };
  }

  async retryFailedEmails(adminId: string, jobId: string): Promise<any> {
    logger.info(`Admin ${adminId} retrying failed emails for job: ${jobId}`);

    const { data: failedEmails, error: fetchErr } = await supabaseAdmin
      .from('email_tracking')
      .select('*')
      .eq('job_id', jobId)
      .eq('status', 'Failed');

    if (fetchErr) throw fetchErr;
    if (!failedEmails || failedEmails.length === 0) {
      return { sent: 0, failed: 0 };
    }

    const accountsToResend: any[] = [];
    for (const fe of failedEmails) {
      let fullName = 'Employee';
      let employeeId = 'N/A';
      
      if (fe.user_id) {
        const { data: profile } = await supabaseAdmin.from('profiles').select('full_name').eq('id', fe.user_id).single();
        if (profile) fullName = profile.full_name;
        
        const { data: emp } = await supabaseAdmin.from('employees').select('employee_id').eq('id', fe.user_id).single();
        if (emp) employeeId = emp.employee_id;
      }

      // Generate a fresh temporary password since we do not store old passwords
      const newTempPassword = `Pmcits@${Math.random().toString(36).slice(-6).toUpperCase()}1`;

      if (fe.user_id) {
        // Reset password on Supabase Auth
        await supabaseAdmin.auth.admin.updateUserById(fe.user_id, { password: newTempPassword });
        // Update profile
        await supabaseAdmin
          .from('profiles')
          .update({
            first_login_required: true,
            temp_password_created_at: new Date().toISOString(),
            is_locked: false,
            failed_login_attempts: 0
          })
          .eq('id', fe.user_id);
      }

      accountsToResend.push({
        email: fe.email_address,
        full_name: fullName,
        employee_id: employeeId,
        temp_password: newTempPassword
      });

      // Clear the previous failed entry
      await supabaseAdmin.from('email_tracking').delete().eq('id', fe.id);
    }

    // Decrement emails_failed by the number of retried rows in import_jobs
    const { data: job } = await supabaseAdmin.from('import_jobs').select('emails_failed').eq('id', jobId).single();
    if (job) {
      const nextFailed = Math.max(0, job.emails_failed - failedEmails.length);
      await supabaseAdmin.from('import_jobs').update({ emails_failed: nextFailed }).eq('id', jobId);
    }

    return await this.sendOnboardingEmails(adminId, jobId, accountsToResend);
  }

  async regenerateJobPasswords(adminId: string, jobId: string): Promise<any[]> {
    logger.info(`Admin ${adminId} regenerating new passwords for successful imports of job: ${jobId}`);
    
    // Fetch all email_tracking/profiles for the job
    const { data: trackings, error } = await supabaseAdmin
      .from('email_tracking')
      .select('user_id, email_address')
      .eq('job_id', jobId);
    
    if (error) throw error;
    if (!trackings) return [];

    const newCredentialsList: any[] = [];
    for (const t of trackings) {
      if (!t.user_id) continue;

      const { data: profile } = await supabaseAdmin.from('profiles').select('full_name, role, district').eq('id', t.user_id).single();
      const { data: emp } = await supabaseAdmin.from('employees').select('employee_id').eq('id', t.user_id).single();

      if (!profile || !emp) continue;

      const newTempPassword = `Pmcits@${Math.random().toString(36).slice(-6).toUpperCase()}1`;
      
      // Update in Supabase Auth
      await supabaseAdmin.auth.admin.updateUserById(t.user_id, { password: newTempPassword });
      
      // Update in profiles
      await supabaseAdmin
        .from('profiles')
        .update({
          first_login_required: true,
          temp_password_created_at: new Date().toISOString(),
          is_locked: false,
          failed_login_attempts: 0
        })
        .eq('id', t.user_id);

      newCredentialsList.push({
        id: t.user_id,
        email: t.email_address,
        full_name: profile.full_name,
        employee_id: emp.employee_id,
        temp_password: newTempPassword,
        role: profile.role,
        district: profile.district,
        status: 'Active'
      });
    }

    // Update job downloaded status flags
    await supabaseAdmin.from('import_jobs').update({ pdf_downloaded: true, excel_downloaded: true }).eq('id', jobId);

    // Audit log
    await supabaseAdmin.from('audit_logs').insert([{
      user_id: adminId,
      action: 'CREDENTIALS_REGENERATED',
      entity_table: 'import_jobs',
      entity_id: jobId
    }]);

    return newCredentialsList;
  }

  async unlockUser(adminId: string, userId: string): Promise<void> {
    logger.info(`Admin ${adminId} unlocking account for user ID: ${userId}`);
    
    await supabaseAdmin
      .from('profiles')
      .update({
        is_locked: false,
        failed_login_attempts: 0
      })
      .eq('id', userId);

    await supabaseAdmin.from('audit_logs').insert([{
      user_id: adminId,
      action: 'ACCOUNT_ENABLED',
      entity_table: 'profiles',
      entity_id: userId,
      new_values: { unlocked: true }
    }]);
  }

  async getAuditLogs(userId?: string, limit: number = 50): Promise<any[]> {
    let query = supabaseAdmin
      .from('audit_logs')
      .select('*, profiles:user_id(full_name, email)')
      .in('action', [
        'ACCOUNT_CREATION', 'ACCOUNT_UPDATE', 'PASSWORD_RESET', 'ROLE_CHANGE', 
        'ACCOUNT_DISABLED', 'ACCOUNT_ENABLED', 'BULK_IMPORT', 'STATUS_CHANGE',
        'CREDENTIALS_REGENERATED'
      ])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (userId) query = query.eq('entity_id', userId);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
}
