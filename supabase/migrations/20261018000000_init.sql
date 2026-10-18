-- Subtivio initial schema. Mirrors the types in packages/core.
-- Every table is protected by row-level security: a user only sees their own rows.
-- The render/ASR worker uses the service role and bypasses RLS.

create type project_status as enum ('uploading', 'transcribing', 'ready', 'rendering', 'exported', 'failed');
create type caption_script as enum ('roman', 'urdu', 'hindi');
create type spoken_language as enum ('ur', 'hi', 'pa', 'en');
create type plan_id as enum ('free', 'creator', 'pro', 'agency');
create type billing_source as enum ('lemonsqueezy', 'app_store', 'play_store', 'manual');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users on delete cascade,
  title text not null,
  status project_status not null default 'uploading',
  language spoken_language not null,
  script caption_script not null default 'roman',
  template_id text not null default 'signature',
  duration_sec numeric not null check (duration_sec >= 0),
  -- Object keys in Cloudflare R2, not URLs. The worker signs URLs on demand.
  source_key text,
  export_key text,
  -- { language, words: [{ id, start, end, confidence?, text: { roman?, urdu?, hindi? } }] }
  transcript jsonb,
  error text,
  created_at timestamptz not null default now(),
  -- Raw uploads are deleted after 7 days (privacy promise in the app).
  source_expires_at timestamptz not null default now() + interval '7 days'
);
create index projects_owner_created on projects (owner_id, created_at desc);

-- A creator's own spellings, applied after the LLM normalisation pass.
create table spelling_rules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users on delete cascade,
  script caption_script not null,
  "from" text not null,
  "to" text not null,
  unique (owner_id, script, "from")
);

-- One row per user, written only by billing webhooks (Lemon Squeezy, RevenueCat).
create table entitlements (
  owner_id uuid primary key references auth.users on delete cascade,
  plan plan_id not null default 'free',
  source billing_source,
  external_id text,
  renews_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Append-only ledger; monthly usage = count of rows in the current period.
create table usage_events (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users on delete cascade,
  project_id uuid references projects on delete set null,
  kind text not null check (kind in ('transcribe', 'export')),
  seconds numeric not null default 0,
  created_at timestamptz not null default now()
);
create index usage_events_owner_created on usage_events (owner_id, created_at);

alter table profiles enable row level security;
alter table projects enable row level security;
alter table spelling_rules enable row level security;
alter table entitlements enable row level security;
alter table usage_events enable row level security;

create policy "own profile" on profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "own projects" on projects for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own spelling rules" on spelling_rules for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
-- Read-only for users: plans and usage are written by the backend only.
create policy "read own entitlement" on entitlements for select using (owner_id = auth.uid());
create policy "read own usage" on usage_events for select using (owner_id = auth.uid());

-- New users get a profile and a free entitlement.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id) values (new.id);
  insert into entitlements (owner_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Live status updates for the processing screen.
alter publication supabase_realtime add table projects;
