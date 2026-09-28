-- Quire data model v1
-- Prepared for Supabase/PostgreSQL. This file is not connected to the front-end yet.
-- Step 2 (accounts + cloud persistence) will wire these tables to the app.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create table if not exists public.thesis_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  degree_name text,
  institution_name text,
  supervisor_name text,
  research_question text,
  abstract text,
  word_target integer check (word_target is null or word_target >= 0),
  proposal_word_target integer check (proposal_word_target is null or proposal_word_target >= 0),
  start_date date,
  final_deadline date,
  status text not null default 'active' check (status in ('planning','active','paused','completed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_setups (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.thesis_projects(id) on delete cascade,
  study_type text check (study_type is null or study_type in ('qualitative','quantitative','mixed','meta')),
  population text,
  study_setting text,
  method_notes text,
  analysis jsonb not null default '[]'::jsonb,
  analysis_software text,
  analysis_rule text,
  analysis_notes text,
  proposal_required boolean not null default true,
  ethics_required boolean not null default true,
  data_management_required boolean not null default false,
  protocol_registration boolean not null default false,
  proposal_requirements text,
  proposal_deadline date,
  ethics_deadline date,
  data_start date,
  data_end date,
  draft_deadline date,
  ai_tailor_method boolean not null default true,
  ai_method_checks boolean not null default true,
  ai_protect_voice boolean not null default true,
  ai_evidence_links boolean not null default true,
  design_details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.objectives (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.thesis_projects(id) on delete cascade,
  order_index integer not null default 1,
  title text not null,
  description text,
  status text not null default 'active' check (status in ('active','completed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.thesis_projects(id) on delete cascade,
  number text,
  title text not null,
  order_index integer not null,
  target_word_count integer check (target_word_count is null or target_word_count >= 0),
  current_word_count integer not null default 0 check (current_word_count >= 0),
  status text not null default 'not_started' check (status in ('not_started','outlined','in_progress','review','complete')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, order_index)
);

create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.thesis_projects(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  parent_section_id uuid references public.sections(id) on delete cascade,
  number text,
  title text not null,
  order_index integer not null,
  content text not null default '',
  target_word_count integer check (target_word_count is null or target_word_count >= 0),
  current_word_count integer not null default 0 check (current_word_count >= 0),
  status text not null default 'not_started' check (status in ('not_started','outlined','in_progress','review','complete')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.thesis_projects(id) on delete cascade,
  title text not null,
  authors text,
  journal text,
  publication_year integer,
  doi text,
  abstract text,
  pdf_storage_path text,
  source_url text,
  reading_status text not null default 'unread' check (reading_status in ('unread','reading','reviewed','archived')),
  ai_processed boolean not null default false,
  citation_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists articles_project_doi_unique on public.articles(project_id,doi) where doi is not null and doi <> '';

create table if not exists public.highlights (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.thesis_projects(id) on delete cascade,
  article_id uuid not null references public.articles(id) on delete cascade,
  page_number integer check (page_number is null or page_number > 0),
  highlighted_text text not null,
  color text,
  category text,
  pdf_anchor jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.thesis_projects(id) on delete cascade,
  article_id uuid references public.articles(id) on delete cascade,
  highlight_id uuid references public.highlights(id) on delete cascade,
  title text,
  body text not null,
  tags text[] not null default '{}',
  note_type text not null default 'research' check (note_type in ('research','idea','method','critique','quote','supervisor')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.themes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.thesis_projects(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id,name)
);

create table if not exists public.article_themes (
  article_id uuid not null references public.articles(id) on delete cascade,
  theme_id uuid not null references public.themes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(article_id,theme_id)
);

create table if not exists public.evidence_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.thesis_projects(id) on delete cascade,
  article_id uuid references public.articles(id) on delete cascade,
  highlight_id uuid references public.highlights(id) on delete cascade,
  note_id uuid references public.notes(id) on delete cascade,
  theme_id uuid references public.themes(id) on delete set null,
  objective_id uuid references public.objectives(id) on delete set null,
  section_id uuid references public.sections(id) on delete cascade,
  relationship text not null default 'supports' check (relationship in ('supports','contradicts','contextualises','critiques','method')),
  rationale text,
  created_at timestamptz not null default now(),
  check (article_id is not null or highlight_id is not null or note_id is not null)
);

create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.thesis_projects(id) on delete cascade,
  type text,
  title text not null,
  description text,
  order_index integer,
  due_date date,
  completed_at timestamptz,
  status text not null default 'not_started' check (status in ('not_started','in_progress','complete','skipped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.progress_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.thesis_projects(id) on delete cascade,
  snapshot_date date not null default current_date,
  current_words integer not null default 0 check (current_words >= 0),
  words_per_week integer not null default 0 check (words_per_week >= 0),
  articles_total integer not null default 0,
  articles_reviewed integer not null default 0,
  chapters_total integer not null default 0,
  chapters_developed integer not null default 0,
  milestones_total integer not null default 0,
  milestones_complete integer not null default 0,
  highlights integer not null default 0,
  notes integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_threads (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.thesis_projects(id) on delete cascade,
  article_id uuid references public.articles(id) on delete cascade,
  section_id uuid references public.sections(id) on delete cascade,
  mode text not null default 'research',
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.ai_threads(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  source_refs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_study_setups_project on public.study_setups(project_id);
create index if not exists idx_objectives_project on public.objectives(project_id);
create index if not exists idx_chapters_project on public.chapters(project_id);
create index if not exists idx_sections_project on public.sections(project_id);
create index if not exists idx_articles_project on public.articles(project_id);
create index if not exists idx_highlights_article on public.highlights(article_id);
create index if not exists idx_notes_project on public.notes(project_id);
create index if not exists idx_themes_project on public.themes(project_id);
create index if not exists idx_evidence_section on public.evidence_links(section_id);
create index if not exists idx_milestones_project_due on public.milestones(project_id,due_date);
create index if not exists idx_progress_project_date on public.progress_snapshots(project_id,snapshot_date desc);
create index if not exists idx_ai_threads_project on public.ai_threads(project_id);

drop trigger if exists trg_projects_updated_at on public.thesis_projects;
create trigger trg_projects_updated_at before update on public.thesis_projects for each row execute function public.set_updated_at();
drop trigger if exists trg_study_setups_updated_at on public.study_setups;
create trigger trg_study_setups_updated_at before update on public.study_setups for each row execute function public.set_updated_at();
drop trigger if exists trg_objectives_updated_at on public.objectives;
create trigger trg_objectives_updated_at before update on public.objectives for each row execute function public.set_updated_at();
drop trigger if exists trg_chapters_updated_at on public.chapters;
create trigger trg_chapters_updated_at before update on public.chapters for each row execute function public.set_updated_at();
drop trigger if exists trg_sections_updated_at on public.sections;
create trigger trg_sections_updated_at before update on public.sections for each row execute function public.set_updated_at();
drop trigger if exists trg_articles_updated_at on public.articles;
create trigger trg_articles_updated_at before update on public.articles for each row execute function public.set_updated_at();
drop trigger if exists trg_highlights_updated_at on public.highlights;
create trigger trg_highlights_updated_at before update on public.highlights for each row execute function public.set_updated_at();
drop trigger if exists trg_notes_updated_at on public.notes;
create trigger trg_notes_updated_at before update on public.notes for each row execute function public.set_updated_at();
drop trigger if exists trg_themes_updated_at on public.themes;
create trigger trg_themes_updated_at before update on public.themes for each row execute function public.set_updated_at();
drop trigger if exists trg_milestones_updated_at on public.milestones;
create trigger trg_milestones_updated_at before update on public.milestones for each row execute function public.set_updated_at();
drop trigger if exists trg_ai_threads_updated_at on public.ai_threads;
create trigger trg_ai_threads_updated_at before update on public.ai_threads for each row execute function public.set_updated_at();

-- Row-level security is intentionally deferred to Step 2, when authentication
-- and cloud persistence are connected to the front-end.
