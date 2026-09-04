-- ==============================================================================
-- DYNISH 2.0.0 — APP LOGS & DIAGNOSTICS TABLE
-- ==============================================================================

create table if not exists public.app_logs (
    id uuid primary key default gen_random_uuid(),
    shop_id uuid references public.shops(id) on delete cascade,
    level text not null default 'INFO', -- 'INFO', 'WARN', 'ERROR', 'DEBUG'
    source text not null default 'app', -- 'billing', 'auth', 'onboarding', 'catalog', 'subscription', 'api'
    message text not null,
    details jsonb default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists idx_app_logs_created_at on public.app_logs(created_at desc);
create index if not exists idx_app_logs_level on public.app_logs(level);

-- Allow server admin full access
alter table public.app_logs enable row level security;

create policy "Allow vendor to view their logs"
    on public.app_logs for select
    using (true);

create policy "Allow insert logs"
    on public.app_logs for insert
    with check (true);
