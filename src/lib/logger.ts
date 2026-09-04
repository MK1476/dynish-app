export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
  details?: any;
  shopId?: string | null;
}

// In-memory rolling log buffer (stores last 200 logs across server lifecycle)
const globalLogsBuffer: LogEntry[] = [];
const MAX_BUFFER_SIZE = 200;

export function addLog(
  level: LogLevel,
  source: string,
  message: string,
  details?: any,
  shopId?: string | null
): LogEntry {
  const entry: LogEntry = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    level,
    source,
    message,
    details: details ? (typeof details === 'object' ? details : { raw: String(details) }) : undefined,
    shopId: shopId || null,
  };

  globalLogsBuffer.unshift(entry);
  if (globalLogsBuffer.length > MAX_BUFFER_SIZE) {
    globalLogsBuffer.pop();
  }

  // Also print to server console with formatted prefix
  const prefix = `[${entry.timestamp.slice(11, 19)}] [${entry.level}] [${entry.source}]`;
  if (level === 'ERROR') {
    console.error(`${prefix} ${entry.message}`, details || '');
  } else if (level === 'WARN') {
    console.warn(`${prefix} ${entry.message}`, details || '');
  } else {
    console.log(`${prefix} ${entry.message}`, details || '');
  }

  return entry;
}

export const logger = {
  info: (source: string, message: string, details?: any, shopId?: string | null) => 
    addLog('INFO', source, message, details, shopId),
  warn: (source: string, message: string, details?: any, shopId?: string | null) => 
    addLog('WARN', source, message, details, shopId),
  error: (source: string, message: string, details?: any, shopId?: string | null) => 
    addLog('ERROR', source, message, details, shopId),
  debug: (source: string, message: string, details?: any, shopId?: string | null) => 
    addLog('DEBUG', source, message, details, shopId),
  getLogs: () => [...globalLogsBuffer],
  clearLogs: () => {
    globalLogsBuffer.length = 0;
  }
};
