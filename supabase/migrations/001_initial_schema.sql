-- Enable extensions
create extension if not exists "uuid-ossp";

-- Profiles
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  wallet_address text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Courses
create table public.courses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  semester text,
  data_set_id text, -- Filecoin DataSet CID/ID if available
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Assignments
create table public.assignments (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid references public.courses(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  due_date timestamptz,
  grade_weight numeric(5,2) default 0,
  status text default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Files (academic metadata)
create table public.files (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete set null,
  assignment_id uuid references public.assignments(id) on delete set null,
  file_name text not null,
  file_type text,
  file_size bigint,
  piece_cid text unique,
  status text default 'active',
  priority_score numeric(10,2),
  urgency_score numeric(10,2),
  survival_score numeric(10,2),
  temperature text default 'cold',
  last_accessed timestamptz,
  last_modified timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Filecoin storage details
create table public.filecoin_storage (
  id uuid primary key default uuid_generate_v4(),
  file_id uuid references public.files(id) on delete cascade not null,
  piece_cid text not null,
  data_set_id text,
  storage_size bigint,
  provider_count int,
  healthy_provider_count int,
  pdp_status text,
  retrieval_status text,
  payment_status text,
  storage_status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Providers
create table public.filecoin_providers (
  id uuid primary key default uuid_generate_v4(),
  file_id uuid references public.files(id) on delete cascade,
  provider_id text,
  provider_name text,
  location text,
  status text,
  storage_copy boolean,
  health text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Payments
create table public.storage_payments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  filecoin_balance numeric(20,8),
  storage_spend_rate numeric(20,8),
  estimated_runway numeric(20,8),
  last_payment timestamptz,
  payment_status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Agent actions
create table public.agent_actions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  action_type text not null,
  description text,
  file_id uuid references public.files(id) on delete set null,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Weather reports
create table public.weather_reports (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  weather_state text,
  details jsonb,
  created_at timestamptz default now()
);

-- Forecast data
create table public.forecast_data (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  day_offset int,
  weather_state text,
  runway_epochs numeric,
  created_at timestamptz default now()
);

-- Agent permissions
create table public.agent_permissions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  can_monitor_storage boolean default true,
  can_monitor_payments boolean default true,
  can_archive_files boolean default true,
  can_restore_files boolean default true,
  can_retrieve_files boolean default true,
  can_transfer_funds boolean default false,
  can_access_other_wallets boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.assignments enable row level security;
alter table public.files enable row level security;
alter table public.filecoin_storage enable row level security;
alter table public.filecoin_providers enable row level security;
alter table public.storage_payments enable row level security;
alter table public.agent_actions enable row level security;
alter table public.weather_reports enable row level security;
alter table public.forecast_data enable row level security;
alter table public.agent_permissions enable row level security;

-- RLS Policies (example for files, replicate for all)
create policy "Users can view their own files"
  on public.files for select
  using (auth.uid() = user_id);

create policy "Users can insert their own files"
  on public.files for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own files"
  on public.files for update
  using (auth.uid() = user_id);

create policy "Users can delete their own files"
  on public.files for delete
  using (auth.uid() = user_id);

-- Add similar policies for other tables (omit for brevity)