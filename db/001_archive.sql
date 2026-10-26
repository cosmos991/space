-- Run once in this game's Supabase SQL editor. No public read/write policies.
create table if not exists public.asterion_archives (
  id uuid primary key,
  created_at timestamptz not null default now(),
  world_seed bigint not null check (world_seed between 1 and 4294967295),
  summary text not null check (length(summary) <= 180),
  payload jsonb not null check (jsonb_typeof(payload) = 'object')
);
alter table public.asterion_archives enable row level security;
revoke all on public.asterion_archives from anon, authenticated;
grant select, insert, delete on public.asterion_archives to service_role;
create index if not exists asterion_archives_created_idx on public.asterion_archives (created_at desc);
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('asterion-art','asterion-art',false,3100000,array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public=false,file_size_limit=3100000,allowed_mime_types=array['image/png','image/jpeg','image/webp'];
