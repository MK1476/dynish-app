import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

const PROTECTED_PHONES = ['9876543210', '9440001449'];

async function runCleanup() {
  console.log('--- DYNISH 2.0 DEMO DATA CLEANUP ---');
  console.log('Protected owner phone numbers:', PROTECTED_PHONES);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase credentials in .env.local');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // 1. Fetch all shops
  const { data: shops, error: shopsErr } = await supabase
    .from('shops')
    .select('id, name, owner_phone, created_at');

  if (shopsErr) {
    throw new Error(`Failed to fetch shops: ${shopsErr.message}`);
  }

  console.log(`\nFound ${shops?.length || 0} total shops in database.`);

  const toKeep = (shops || []).filter((s) => PROTECTED_PHONES.includes(s.owner_phone));
  const toDelete = (shops || []).filter((s) => !PROTECTED_PHONES.includes(s.owner_phone));

  console.log(`\nShops to KEEP (${toKeep.length}):`);
  for (const k of toKeep) {
    console.log(`  ✓ KEEP: "${k.name}" (ID: ${k.id}, Owner: ${k.owner_phone})`);
  }

  console.log(`\nShops to DELETE (${toDelete.length}):`);
  for (const d of toDelete) {
    console.log(`  ✗ DELETE: "${d.name}" (ID: ${d.id}, Owner: ${d.owner_phone})`);
  }

  if (toDelete.length === 0) {
    console.log('\nNo unallowed demo shops found. Clean up already up to date!');
  } else {
    for (const d of toDelete) {
      console.log(`Deleting shop "${d.name}" (${d.id})...`);
      const { error: delErr } = await supabase.from('shops').delete().eq('id', d.id);
      if (delErr) {
        console.error(`  Failed to delete shop ${d.id}:`, delErr);
      } else {
        console.log(`  ✓ Successfully deleted shop "${d.name}".`);
      }
    }
  }

  // Verify remaining shops
  const { data: remainingShops } = await supabase
    .from('shops')
    .select('id, name, owner_phone');
  console.log(`\n--- Verification Post-Cleanup ---`);
  console.log(`Remaining shops count: ${remainingShops?.length || 0}`);
  for (const r of remainingShops || []) {
    console.log(`- Shop "${r.name}" (Phone: ${r.owner_phone})`);
    if (!PROTECTED_PHONES.includes(r.owner_phone)) {
      console.error(`CRITICAL: Unallowed shop still remains: ${r.name}`);
    }
  }

  // Check remaining customers
  const { count: customerCount } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true });
  console.log(`Remaining customers: ${customerCount}`);

  // Check remaining transactions
  const { count: txCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true });
  console.log(`Remaining transactions: ${txCount}`);

  console.log('\nDemo data cleanup completed successfully!\n');
}

runCleanup().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
