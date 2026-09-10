import winston from 'winston';

// Create Winston logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'eatout-api' },
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs with importance level of `info` or less to `combined.log`
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// If we're not in production, log to console with nice formatting
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ level, message, timestamp, ...metadata }) => {
          let msg = `${timestamp} [${level}]: ${message}`;
          if (Object.keys(metadata).length > 0 && metadata.service !== 'eatout-api') {
            msg += ` ${JSON.stringify(metadata)}`;
          }
          return msg;
        })
      ),
    })
  );
} else {
  // In production, also log to console (for Render/cloud platform logs)
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.simple()
      ),
    })
  );
}

// Create a stream object for Morgan HTTP logger
export const logStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

// Helper functions for common logging patterns
export const logError = (message: string, error?: any, metadata?: any) => {
  logger.error(message, { error: error?.message || error, stack: error?.stack, ...metadata });
};

export const logWarn = (message: string, metadata?: any) => {
  logger.warn(message, metadata);
};

export const logInfo = (message: string, metadata?: any) => {
  logger.info(message, metadata);
};

export const logDebug = (message: string, metadata?: any) => {
  logger.debug(message, metadata);
};

export default logger;
