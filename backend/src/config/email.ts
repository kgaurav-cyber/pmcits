import { env } from './environment';

export const emailConfig = {
  provider: env.EMAIL_PROVIDER,
  resendApiKey: env.RESEND_API_KEY,
  host: env.SMTP_HOST,
  port: env.SMTP_PORT ? parseInt(env.SMTP_PORT, 10) : undefined,
  user: env.SMTP_USER,
  password: env.SMTP_PASSWORD,
  from: env.EMAIL_FROM,
};
