import React from 'react';
import { getRecentLogs } from '@/actions/logs';
import { LogsClient } from './LogsClient';

export default async function LogsPage() {
  const logs = await getRecentLogs();
  return <LogsClient initialLogs={logs} />;
}
