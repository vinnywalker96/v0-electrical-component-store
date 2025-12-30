import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
}

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
}

// Add colors to winston
winston.addColors(colors)

// Define the format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
)

// Define which transports the logger must use
const transports = [
  // Console transport for development
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }),

  // Error log file
  new DailyRotateFile({
    filename: 'logs/error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    maxSize: '20m',
    maxFiles: '14d',
  }),

  // Combined log file
  new DailyRotateFile({
    filename: 'logs/combined-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    maxSize: '20m',
    maxFiles: '14d',
  }),

  // HTTP requests log
  new DailyRotateFile({
    filename: 'logs/http-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    level: 'http',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    maxSize: '20m',
    maxFiles: '7d',
  }),
]

// Create the logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
})

// Create a stream for Morgan HTTP logging
export const stream = {
  write: (message: string) => {
    logger.http(message.trim())
  },
}

// Helper functions for different log levels
export const logError = (message: string, error?: any, meta?: any) => {
  logger.error(message, { error: error?.message || error, stack: error?.stack, ...meta })
}

export const logWarn = (message: string, meta?: any) => {
  logger.warn(message, meta)
}

export const logInfo = (message: string, meta?: any) => {
  logger.info(message, meta)
}

export const logDebug = (message: string, meta?: any) => {
  logger.debug(message, meta)
}

// Performance logging
export const logPerformance = (operation: string, duration: number, meta?: any) => {
  logger.info(`Performance: ${operation}`, { duration, ...meta })
}

// Security logging
export const logSecurity = (event: string, userId?: string, ip?: string, meta?: any) => {
  logger.warn(`Security: ${event}`, { userId, ip, ...meta })
}

// Database logging
export const logDatabase = (operation: string, table: string, duration?: number, meta?: any) => {
  logger.info(`Database: ${operation} on ${table}`, { duration, ...meta })
}

// API logging
export const logApi = (method: string, url: string, statusCode: number, duration: number, userId?: string) => {
  const level = statusCode >= 400 ? 'warn' : 'http'
  logger.log(level, `API: ${method} ${url}`, {
    method,
    url,
    statusCode,
    duration,
    userId
  })
}