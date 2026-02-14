/**
 * Structured Logging Utility
 * 
 * Level 2 Requirement: All logs must be structured JSON with context.
 * 
 * Features:
 * - JSON output for machine parsing
 * - Log levels: debug, info, warn, error
 * - Correlation IDs for request tracing
 * - Contextual metadata (agentId, guildId, sessionKey, etc.)
 * - Timestamps in ISO 8601 format
 * - Human-readable in dev, JSON in production
 */

import util from 'util';

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

class StructuredLogger {
  constructor(options = {}) {
    this.serviceName = options.serviceName || 'chopsticks';
    this.minLevel = LOG_LEVELS[options.minLevel || process.env.LOG_LEVEL || 'info'];
    this.pretty = options.pretty !== undefined ? options.pretty : process.env.NODE_ENV === 'development';
  }

  _log(level, message, meta = {}) {
    if (LOG_LEVELS[level] < this.minLevel) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message,
      ...meta
    };

    if (this.pretty) {
      // Human-readable format for development
      const timestamp = logEntry.timestamp.split('T')[1].split('.')[0];
      const levelColor = {
        debug: '\x1b[36m', // cyan
        info: '\x1b[32m',  // green
        warn: '\x1b[33m',  // yellow
        error: '\x1b[31m'  // red
      }[level];
      const reset = '\x1b[0m';
      
      let contextStr = '';
      const context = { ...meta };
      delete context.error;
      if (Object.keys(context).length > 0) {
        contextStr = ' ' + util.inspect(context, { colors: true, depth: 2, compact: true });
      }

      console.log(`${levelColor}${timestamp} [${level.toUpperCase()}]${reset} ${message}${contextStr}`);
      
      // Print error details separately if present
      if (meta.error) {
        if (meta.error.stack) {
          console.log(meta.error.stack);
        } else {
          console.log(meta.error);
        }
      }
    } else {
      // JSON format for production
      console.log(JSON.stringify(logEntry));
    }
  }

  debug(message, meta = {}) {
    this._log('debug', message, meta);
  }

  info(message, meta = {}) {
    this._log('info', message, meta);
  }

  warn(message, meta = {}) {
    this._log('warn', message, meta);
  }

  error(message, meta = {}) {
    // Serialize error objects
    if (meta.error instanceof Error) {
      meta.error = {
        name: meta.error.name,
        message: meta.error.message,
        stack: meta.error.stack,
        ...meta.error
      };
    }
    this._log('error', message, meta);
  }

  // Backwards compatibility
  log(message, meta = {}) {
    this.info(message, meta);
  }

  // Create child logger with inherited context
  child(defaultMeta = {}) {
    return new ChildLogger(this, defaultMeta);
  }
}

class ChildLogger {
  constructor(parent, defaultMeta) {
    this.parent = parent;
    this.defaultMeta = defaultMeta;
  }

  _mergeMeta(meta) {
    return { ...this.defaultMeta, ...meta };
  }

  debug(message, meta = {}) {
    this.parent.debug(message, this._mergeMeta(meta));
  }

  info(message, meta = {}) {
    this.parent.info(message, this._mergeMeta(meta));
  }

  warn(message, meta = {}) {
    this.parent.warn(message, this._mergeMeta(meta));
  }

  error(message, meta = {}) {
    this.parent.error(message, this._mergeMeta(meta));
  }

  log(message, meta = {}) {
    this.info(message, meta);
  }

  child(additionalMeta = {}) {
    return new ChildLogger(this.parent, this._mergeMeta(additionalMeta));
  }
}

// Generate correlation ID for request tracing
export function generateCorrelationId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Default logger instance
const defaultLogger = new StructuredLogger({
  serviceName: 'chopsticks-bot'
});

// Export default instance
export const logger = defaultLogger;

// Backwards compatibility - legacy log function
export function log(level, message, meta = {}) {
  const method = level === 'log' ? 'info' : level;
  if (defaultLogger[method]) {
    defaultLogger[method](message, meta);
  }
}

// Create logger for agents
export function createAgentLogger() {
  return new StructuredLogger({
    serviceName: 'chopsticks-agent'
  });
}

// Export class for custom instances
export { StructuredLogger };

// Helper: Create request-scoped logger with correlation ID
export function createRequestLogger(requestId, meta = {}) {
  return logger.child({ requestId, ...meta });
}

// Helper: Create session-scoped logger
export function createSessionLogger(guildId, voiceChannelId, meta = {}) {
  const sessionKey = `${guildId}:${voiceChannelId}`;
  return logger.child({ sessionKey, guildId, voiceChannelId, ...meta });
}

// Helper: Create agent-scoped logger (renamed to avoid conflict)
export function createAgentScopedLogger(agentId, meta = {}) {
  return logger.child({ agentId, ...meta });
}

// Default export for backwards compatibility
export default logger;
