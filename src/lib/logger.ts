type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
}

class Logger {
  private sensitivePatterns = [
    /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    /st_[A-Za-z0-9_-]+/g,
    /sk_[A-Za-z0-9_-]+/g,
    /pk_[A-Za-z0-9_-]+/g,
    /Bearer\s+[A-Za-z0-9_-]+/g,
    /api[_-]?key['":\s]*[A-Za-z0-9_-]+/gi,
    /token['":\s]*[A-Za-z0-9_-]+/gi,
    /password['":\s]*[^\s"',}]+/gi,
    /secret['":\s]*[A-Za-z0-9_-]+/gi,
    /0x[a-fA-F0-9]{40}/g
  ];

  private redactSensitiveData(data: any): any {
    if (typeof data === 'string') {
      let redacted = data;
      this.sensitivePatterns.forEach(pattern => {
        redacted = redacted.replace(pattern, '[REDACTED]');
      });
      return redacted;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.redactSensitiveData(item));
    }

    if (data && typeof data === 'object') {
      const redacted: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (this.isSensitiveKey(key)) {
          redacted[key] = '[REDACTED]';
        } else {
          redacted[key] = this.redactSensitiveData(value);
        }
      }
      return redacted;
    }

    return data;
  }

  private isSensitiveKey(key: string): boolean {
    const sensitiveKeys = [
      'password', 'token', 'secret', 'key', 'auth', 'authorization',
      'api_key', 'apikey', 'access_token', 'refresh_token', 'jwt',
      'bearer', 'credential', 'private_key', 'public_key', 'address',
      'wallet', 'mnemonic', 'seed'
    ];
    
    return sensitiveKeys.some(sensitiveKey => 
      key.toLowerCase().includes(sensitiveKey)
    );
  }

  private formatLogEntry(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      level,
      message: this.redactSensitiveData(message),
      data: data ? this.redactSensitiveData(data) : undefined,
      timestamp: new Date().toISOString()
    };
  }

  debug(message: string, data?: any): void {
    const entry = this.formatLogEntry('debug', message, data);
    console.debug(`[${entry.timestamp}] DEBUG: ${entry.message}`, entry.data || '');
  }

  info(message: string, data?: any): void {
    const entry = this.formatLogEntry('info', message, data);
    console.info(`[${entry.timestamp}] INFO: ${entry.message}`, entry.data || '');
  }

  warn(message: string, data?: any): void {
    const entry = this.formatLogEntry('warn', message, data);
    console.warn(`[${entry.timestamp}] WARN: ${entry.message}`, entry.data || '');
  }

  error(message: string, data?: any): void {
    const entry = this.formatLogEntry('error', message, data);
    console.error(`[${entry.timestamp}] ERROR: ${entry.message}`, entry.data || '');
  }
}

export const logger = new Logger();
