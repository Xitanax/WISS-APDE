// Enhanced logging system for Chocadies backend
import fs from 'fs';
import path from 'path';

const LOG_DIR = '/app/logs';

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const createLogger = (module) => {
  const logFile = path.join(LOG_DIR, `${module}.log`);
  
  const log = (level, message, data = null) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      module,
      message,
      ...(data && { data })
    };
    
    const logLine = JSON.stringify(logEntry) + '\n';
    
    // Write to file
    fs.appendFileSync(logFile, logLine);
    
    // Also log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[${timestamp}] ${level.toUpperCase()} - ${module}: ${message}`, data || '');
    }
  };

  return {
    info: (message, data) => log('info', message, data),
    warn: (message, data) => log('warn', message, data),
    error: (message, data) => log('error', message, data),
    debug: (message, data) => log('debug', message, data)
  };
};

export default createLogger;
