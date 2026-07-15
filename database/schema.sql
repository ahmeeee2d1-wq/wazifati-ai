-- وظيفتي AI — مخطط PostgreSQL / Supabase للنسخة الإنتاجية
-- الحماية الأساسية: كل سجل خاص بصاحبه، والتقديم المكرر ممنوع بقيد فريد.

create extension if not exists "pgcrypto";

create type public.application_status as enum ('pending', 'applied', 'viewed', 'rejected', 'interview', 'offer');
create type public.automation_level as enum ('manual', 'review', 'limited');
create type public.resume_state as enum ('uploaded', 'parsing', 'ready', 'failed', 'archived');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  phone text not null default '',
  city text not null default '',
  education text not null default '',
  bio text not null default '',
  skills text[] not null default '{}',
  languages text[] not null default '{}',
  courses text[] not null default '{}',
  experiences jsonb not null default '[]'::jsonb,
  suggested_roles text[] not null default '{}',
  ats_score smallint not null default 0 check (ats_score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  original_name text not null,
  mime_type text not null,
  file_size bigint not null check (file_size between 1 and 10485760),
  state public.resume_state not null default 'uploaded',
  extracted_text text,
  parsed_data jsonb not null default '{}'::jsonb,
  improved_data jsonb not null default '{}'::jsonb,
  ats_score_before smallint check (ats_score_before between 0 and 100),
  ats_score_after smallint check (ats_score_after between 0 and 100),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index one_active_resume_per_user on public.resumes(user_id) where is_active;

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  external_id text not null,
  title text not null,
  company text not null,
  city text not null,
  workplace text,
  employment_type text,
  salary_text text,
  description text not null default '',
  skills text[] not null default '{}',
  application_url text not null,
  source_verified boolean not null default false,
  active boolean not null default true,
  published_at timestamptz,
  expires_at timestamptz,
  discovered_at timestamptz not null default now(),
  unique (source, external_id)
);
create index jobs_city_active_idx on public.jobs(city, active, published_at desc);

create table public.user_job_matches (
  user_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  score smallint not null check (score between 0 and 100),
  reasons jsonb not null default '[]'::jsonb,
  matched_skills text[] not null default '{}',
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, job_id)
);

create table public.automation_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  target_cities text[] not null default array['مكة المكرمة', 'جدة'],
  target_roles text[] not null default '{}',
  daily_limit smallint not null default 5 check (daily_limit between 1 and 20),
  minimum_match smallint not null default 70 check (minimum_match between 40 and 100),
  automation public.automation_level not null default 'review',
  remote_allowed boolean not null default true,
  exclude_commission_only boolean not null default true,
  require_confirmation boolean not null default true,
  email_monitoring boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete restrict,
  external_job_key text,
  job_snapshot jsonb not null default '{}'::jsonb,
  resume_id uuid references public.resumes(id) on delete set null,
  status public.application_status not null default 'pending',
  automation public.automation_level not null default 'manual',
  cover_letter text,
  submitted_payload jsonb not null default '{}'::jsonb,
  external_confirmation text,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, job_id),
  check (job_id is not null or external_job_key is not null)
);
create index applications_user_status_idx on public.applications(user_id, status, updated_at desc);
create unique index applications_user_external_job_idx on public.applications(user_id, external_job_key) where external_job_key is not null;

create table public.application_events (
  id bigint generated always as identity primary key,
  application_id uuid not null references public.applications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  from_status public.application_status,
  to_status public.application_status not null,
  source text not null default 'user',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.email_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  provider text not null,
  provider_message_id text not null,
  sender text not null,
  subject text not null,
  snippet text not null default '',
  category text not null check (category in ('confirmation', 'viewed', 'rejection', 'interview', 'offer', 'job-alert', 'other')),
  confidence numeric(4,3) check (confidence between 0 and 1),
  received_at timestamptz not null,
  processed_at timestamptz not null default now(),
  unique (user_id, provider, provider_message_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  kind text not null default 'info',
  action_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- حد يومي حقيقي يُفحص داخل قاعدة البيانات قبل إنشاء أي تقديم.
create or replace function public.assert_daily_application_limit(target_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare allowed_count integer; used_count integer;
begin
  select daily_limit into allowed_count from automation_settings where user_id = target_user;
  allowed_count := coalesce(allowed_count, 5);
  select count(*) into used_count from applications
    where user_id = target_user and created_at >= date_trunc('day', now());
  if used_count >= allowed_count then
    raise exception 'DAILY_APPLICATION_LIMIT_REACHED';
  end if;
end;
$$;

-- عزل بيانات كل مستخدم عبر Row Level Security.
alter table public.profiles enable row level security;
alter table public.resumes enable row level security;
alter table public.user_job_matches enable row level security;
alter table public.automation_settings enable row level security;
alter table public.applications enable row level security;
alter table public.application_events enable row level security;
alter table public.email_events enable row level security;
alter table public.notifications enable row level security;

create policy "own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own resumes" on public.resumes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own matches" on public.user_job_matches for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own settings" on public.automation_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own applications" on public.applications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own application events" on public.application_events for select using (auth.uid() = user_id);
create policy "own email events" on public.email_events for select using (auth.uid() = user_id);
create policy "own notifications" on public.notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- الوظائف العامة قابلة للقراءة فقط للمستخدم المسجل.
alter table public.jobs enable row level security;
create policy "authenticated users read active jobs" on public.jobs for select to authenticated using (active = true);

-- مجلد Storage خاص بالسير الذاتية؛ المسار يبدأ بمعرف المستخدم.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 10485760, array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain'])
on conflict (id) do nothing;
create policy "users upload own resumes" on storage.objects for insert to authenticated
with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users read own resumes" on storage.objects for select to authenticated
using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users delete own resumes" on storage.objects for delete to authenticated
using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

-- إنشاء الملف والإعدادات الأساسية فور تسجيل المستخدم لأول مرة.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), coalesce(new.email, ''))
  on conflict (id) do nothing;
  insert into public.automation_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- أقل صلاحيات يحتاجها عميل الويب؛ سياسات RLS تبقى الحارس الفعلي لكل صف.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.resumes to authenticated;
grant select on public.jobs to authenticated;
grant select, insert, update, delete on public.user_job_matches to authenticated;
grant select, insert, update, delete on public.automation_settings to authenticated;
grant select, insert, update, delete on public.applications to authenticated;
grant select on public.application_events to authenticated;
grant select on public.email_events to authenticated;
grant select, insert, update, delete on public.notifications to authenticated;
