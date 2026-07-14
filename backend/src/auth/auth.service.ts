import { supabaseAdmin, getSupabaseUserClient } from '../config/supabase';
import { jwtConfig } from '../config/jwt';
import { logger } from '../utils/logger';
import bcrypt from 'bcryptjs';

export class AuthService {
  
  async registerEmployee(registerData: any): Promise<any> {
    const { email, password, full_name, district, phone, gpf_cps_number, rank, designation, bank_account_no, bank_ifsc } = registerData;

    logger.info(`Registering new employee: ${email}`);

    const passwordHash = await bcrypt.hash(password, 10);

    // Create user via RPC to avoid SMTP 500 mailer timeouts
    const { data: userId, error: authError } = await supabaseAdmin.rpc('create_new_auth_user', {
      p_email: email,
      p_password_hash: passwordHash,
      p_metadata: {
        role: 'Employee',
        district,
        full_name
      }
    });

    if (authError || !userId) {
      logger.error('Error creating user in Supabase Auth via RPC', authError);
      throw authError || new Error('Auth creation failed');
    }

    // Profiles trigger automatically writes to profiles, but we write employees parameters manually
    const { data: employeeData, error: empError } = await supabaseAdmin
      .from('employees')
      .insert([{
        id: userId,
        gpf_cps_number,
        rank,
        designation,
        bank_account_no,
        bank_ifsc
      }])
      .select()
      .single();

    if (empError) {
      logger.error('Error writing employee metadata, rollback auth user', empError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw empError;
    }

    return {
      userId,
      email,
      full_name,
      employee_details: employeeData
    };
  }

  async login(credentials: any): Promise<any> {
    const { email, password } = credentials;
    logger.info(`Attempting login for identifier: ${email}`);

    let targetEmail = email;
    let profileId: string | null = null;
    let profile: any = null;

    if (!email.includes('@')) {
      // Treat as employee_id
      const { data: empData, error: empErr } = await supabaseAdmin
        .from('employees')
        .select('id, profiles(email)')
        .eq('employee_id', email)
        .single();
      if (empErr || !empData || !empData.profiles) {
        logger.error(`Employee ID lookup failed for: ${email}`);
        throw { statusCode: 401, message: 'Invalid credentials.', code: 'UNAUTHORIZED' };
      }
      targetEmail = (empData.profiles as any).email;
      profileId = empData.id;
    }

    // Load profile details to check constraints
    const { data: prof, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', targetEmail)
      .single();

    if (profErr || !prof) {
      logger.error(`Profile lookup failed for: ${targetEmail}`);
      throw { statusCode: 401, message: 'Invalid credentials.', code: 'UNAUTHORIZED' };
    }

    profile = prof;
    profileId = profile.id;

    if (profile.is_disabled) {
      logger.warn(`Attempted login on disabled account: ${targetEmail}`);
      throw { statusCode: 403, message: 'Your account has been disabled. Contact administrator.', code: 'FORBIDDEN' };
    }

    if (profile.is_locked) {
      logger.warn(`Attempted login on locked account: ${targetEmail}`);
      throw { statusCode: 403, message: 'Your account is locked due to multiple failed login attempts. Contact administrator.', code: 'FORBIDDEN' };
    }

    // Temporary password expiry checks
    if (profile.first_login_required && profile.temp_password_created_at) {
      const createdAt = new Date(profile.temp_password_created_at).getTime();
      const now = Date.now();
      const diffDays = (now - createdAt) / (1000 * 60 * 60 * 24);
      const expiryDays = jwtConfig.tempPasswordExpiryDays;
      if (diffDays > expiryDays) {
        logger.warn(`Temporary password expired for: ${targetEmail}`);
        throw { statusCode: 403, message: 'Your temporary password has expired. Contact administrator to reset your password.', code: 'FORBIDDEN' };
      }
    }

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: targetEmail,
      password
    });

    if (error || !data.user || !data.session) {
      logger.error(`Login failed for: ${targetEmail}`, error);
      
      // Update failed attempts and lock if threshold is breached
      const nextAttempts = profile.failed_login_attempts + 1;
      const maxAttempts = jwtConfig.maxFailedLoginAttempts;
      const shouldLock = nextAttempts >= maxAttempts;
      
      await supabaseAdmin
        .from('profiles')
        .update({
          failed_login_attempts: nextAttempts,
          is_locked: shouldLock ? true : profile.is_locked
        })
        .eq('id', profileId);

      if (shouldLock) {
        logger.warn(`Account locked: ${targetEmail}`);
        throw { statusCode: 403, message: 'Your account has been locked due to too many failed attempts. Contact administrator.', code: 'FORBIDDEN' };
      }

      throw { statusCode: 401, message: 'Invalid credentials.', code: 'UNAUTHORIZED' };
    }

    // Successful login: reset failed login attempts
    await supabaseAdmin
      .from('profiles')
      .update({ failed_login_attempts: 0 })
      .eq('id', profileId);

    return {
      token: data.session.access_token,
      expires_in: data.session.expires_in,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: profile.role || 'Employee',
        full_name: profile.full_name || '',
        district: profile.district || '',
        first_login_required: profile.first_login_required
      }
    };
  }

  async logout(token: string): Promise<void> {
    logger.info('Logging out user session');
    const userClient = getSupabaseUserClient(token);
    const { error } = await userClient.auth.signOut();
    
    if (error) {
      logger.error('Logout failed for user session', error);
      throw error;
    }
  }

  async forgotPassword(email: string, redirectTo?: string): Promise<void> {
    logger.info(`Requesting password recovery email for: ${email}`);
    
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo || undefined
    });

    if (error) {
      logger.error(`Failed to initiate password reset for ${email}`, error);
      throw error;
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    logger.info('Resetting password via recovery session token');

    // Exchange recovery session context and perform password update under user scope
    const userClient = getSupabaseUserClient(token);
    const { error } = await userClient.auth.updateUser({ password: newPassword });

    if (error) {
      logger.error('Failed updating password during reset workflow', error);
      throw error;
    }
  }

  async changePassword(userId: string, newPassword: string, currentPassword?: string): Promise<void> {
    logger.info(`Changing password for user ID: ${userId}`);

    // Update password and clear first login flag
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    const existingMeta = authUser?.user?.user_metadata || {};

    if (!authUser || !authUser.user) {
      throw new Error('User not found');
    }

    if (currentPassword) {
      const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email: authUser.user.email || '',
        password: currentPassword
      });
      if (signInError) {
        throw new Error('Current password validation failed. Verification incorrect.');
      }
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
      user_metadata: {
        ...existingMeta,
        first_login_required: false
      }
    });

    if (error) {
      logger.error(`Failed changing password for user ${userId}`, error);
      throw error;
    }

    // Update profile table
    await supabaseAdmin
      .from('profiles')
      .update({
        first_login_required: false,
        temp_password_created_at: null
      })
      .eq('id', userId);
  }
}

