import { env } from './environment';

export const jwtConfig = {
  secret: env.JWT_SECRET,
  expiresIn: env.JWT_EXPIRES_IN,
  tempPasswordExpiryDays: parseInt(env.TEMP_PASSWORD_EXPIRY_DAYS, 10),
  maxFailedLoginAttempts: parseInt(env.MAX_FAILED_LOGIN_ATTEMPTS, 10),
};
