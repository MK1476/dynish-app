import React from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminAuthenticated } from '@/actions/admin';
import { AdminPinGate } from './AdminPinGate';
import { AdminDashboardClient } from './AdminDashboardClient';

export default async function AdminPage() {
  const isAuthed = await isAdminAuthenticated();

  if (!isAuthed) {
    return <AdminPinGate />;
  }

  const admin = createAdminClient();

  const [shopsRes, txRes, custRes] = await Promise.all([
    admin.from('shops').select('*').order('created_at', { ascending: false }),
    admin.from('transactions').select('*').order('created_at', { ascending: false }),
    admin.from('customers').select('*').order('visit_count', { ascending: false }),
  ]);

  return (
    <AdminDashboardClient
      initialShops={shopsRes.data || []}
      transactions={txRes.data || []}
      customers={custRes.data || []}
    />
  );
}
