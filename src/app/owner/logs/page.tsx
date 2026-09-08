import React from 'react';
import { getCurrentVendorSession } from '@/actions/auth';
import { getRecentLogs } from '@/actions/logs';
import { LogsClient } from './LogsClient';
import { redirect } from 'next/navigation';

export default async function LogsPage() {
  const { phone, userId } = await getCurrentVendorSession();
  if (!phone && !userId) {
    redirect('/owner/login');
  }

  const logs = await getRecentLogs();
  return <LogsClient initialLogs={logs} />;
}
