'use server';

import { logger, LogEntry, LogLevel } from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/admin';

export async function getRecentLogs(): Promise<LogEntry[]> {
  const buffered = logger.getLogs();
  
  // Try fetching any persistent logs from Supabase if table exists
  try {
    const admin = createAdminClient();
    const { data: dbLogs } = await admin
      .from('app_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (dbLogs && dbLogs.length > 0) {
      const formattedDbLogs: LogEntry[] = dbLogs.map(l => ({
        id: l.id,
        timestamp: l.created_at,
        level: l.level as LogLevel,
        source: l.source,
        message: l.message,
        details: l.details,
        shopId: l.shop_id,
      }));

      // Merge and deduplicate by id
      const existingIds = new Set(buffered.map(b => b.id));
      for (const d of formattedDbLogs) {
        if (!existingIds.has(d.id)) {
          buffered.push(d);
        }
      }
    }
  } catch {
    // If app_logs table doesn't exist yet, buffered logs work seamlessly
  }

  // Sort descending by timestamp
  return buffered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function logAction(
  level: LogLevel,
  source: string,
  message: string,
  details?: any,
  shopId?: string | null
): Promise<LogEntry> {
  const entry = logger[level.toLowerCase() as 'info' | 'warn' | 'error' | 'debug'](
    source,
    message,
    details,
    shopId
  );

  // Attempt async write to database
  try {
    const admin = createAdminClient();
    await admin.from('app_logs').insert({
      level,
      source,
      message,
      details: details || {},
      shop_id: shopId || null,
    });
  } catch {
    // Silently ignore if table not present
  }

  return entry;
}

export async function clearAllLogs(): Promise<{ success: boolean }> {
  logger.clearLogs();
  try {
    const admin = createAdminClient();
    await admin.from('app_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  } catch {
    // Silently ignore
  }
  return { success: true };
}
