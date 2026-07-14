export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  AUDIT = 'AUDIT'
}

export const logger = {
  info(message: string, meta?: any) {
    this.log(LogLevel.INFO, message, meta);
  },

  warn(message: string, meta?: any) {
    this.log(LogLevel.WARN, message, meta);
  },

  error(message: string, error?: any) {
    this.log(LogLevel.ERROR, message, {
      message: error?.message,
      stack: error?.stack,
      ...error
    });
  },

  audit(userId: string, action: string, message: string, meta?: any) {
    this.log(LogLevel.AUDIT, `[User: ${userId}] Action: ${action} - ${message}`, meta);
  },

  log(level: LogLevel, message: string, meta?: any) {
    const timestamp = new Date().toISOString();
    const metaString = meta ? ` | Meta: ${JSON.stringify(meta)}` : '';
    console.log(`[${timestamp}] [${level}] ${message}${metaString}`);
  }
};
