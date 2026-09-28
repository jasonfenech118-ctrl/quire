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
  id text primary key default gen_random_uuid()::text,
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
  id text primary key default gen_random_uuid()::text,
  project_id text not null unique references public.thesis_projects(id) on delete cascade,
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
  id text primary key default gen_random_uuid()::text,
  project_id text not null references public.thesis_projects(id) on delete cascade,
  order_index integer not null default 1,
  title text not null,
  description text,
  status text not null default 'active' check (status in ('active','completed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chapters (
  id text primary key default gen_random_uuid()::text,
  project_id text not null references public.thesis_projects(id) on delete cascade,
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
  id text primary key default gen_random_uuid()::text,
  project_id text not null references public.thesis_projects(id) on delete cascade,
  chapter_id text not null references public.chapters(id) on delete cascade,
  parent_section_id text references public.sections(id) on delete cascade,
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
  id text primary key default gen_random_uuid()::text,
  project_id text not null references public.thesis_projects(id) on delete cascade,
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
  id text primary key default gen_random_uuid()::text,
  project_id text not null references public.thesis_projects(id) on delete cascade,
  article_id text not null references public.articles(id) on delete cascade,
  page_number integer check (page_number is null or page_number > 0),
  highlighted_text text not null,
  color text,
  category text,
  pdf_anchor jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notes (
  id text primary key default gen_random_uuid()::text,
  project_id text not null references public.thesis_projects(id) on delete cascade,
  article_id text references public.articles(id) on delete cascade,
  highlight_id text references public.highlights(id) on delete cascade,
  title text,
  body text not null,
  tags text[] not null default '{}',
  note_type text not null default 'research' check (note_type in ('research','idea','method','critique','quote','supervisor')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.themes (
  id text primary key default gen_random_uuid()::text,
  project_id text not null references public.thesis_projects(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id,name)
);

create table if not exists public.article_themes (
  article_id text not null references public.articles(id) on delete cascade,
  theme_id text not null references public.themes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(article_id,theme_id)
);

create table if not exists public.evidence_links (
  id text primary key default gen_random_uuid()::text,
  project_id text not null references public.thesis_projects(id) on delete cascade,
  article_id text references public.articles(id) on delete cascade,
  highlight_id text references public.highlights(id) on delete cascade,
  note_id text references public.notes(id) on delete cascade,
  theme_id text references public.themes(id) on delete set null,
  objective_id text references public.objectives(id) on delete set null,
  section_id text references public.sections(id) on delete cascade,
  relationship text not null default 'supports' check (relationship in ('supports','contradicts','contextualises','critiques','method')),
  rationale text,
  created_at timestamptz not null default now(),
  check (article_id is not null or highlight_id is not null or note_id is not null)
);

create table if not exists public.milestones (
  id text primary key default gen_random_uuid()::text,
  project_id text not null references public.thesis_projects(id) on delete cascade,
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
  id text primary key default gen_random_uuid()::text,
  project_id text not null references public.thesis_projects(id) on delete cascade,
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
  id text primary key default gen_random_uuid()::text,
  project_id text not null references public.thesis_projects(id) on delete cascade,
  article_id text references public.articles(id) on delete cascade,
  section_id text references public.sections(id) on delete cascade,
  mode text not null default 'research',
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id text primary key default gen_random_uuid()::text,
  thread_id text not null references public.ai_threads(id) on delete cascade,
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

-- Step 2: user isolation and cloud persistence security
alter table public.thesis_projects enable row level security;
alter table public.study_setups enable row level security;
alter table public.objectives enable row level security;
alter table public.chapters enable row level security;
alter table public.sections enable row level security;
alter table public.articles enable row level security;
alter table public.highlights enable row level security;
alter table public.notes enable row level security;
alter table public.themes enable row level security;
alter table public.article_themes enable row level security;
alter table public.evidence_links enable row level security;
alter table public.milestones enable row level security;
alter table public.progress_snapshots enable row level security;
alter table public.ai_threads enable row level security;
alter table public.ai_messages enable row level security;

drop policy if exists "own thesis projects" on public.thesis_projects;
create policy "own thesis projects" on public.thesis_projects
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own study setups" on public.study_setups;
create policy "own study setups" on public.study_setups
for all using (exists(select 1 from public.thesis_projects p where p.id=project_id and p.user_id=auth.uid()))
with check (exists(select 1 from public.thesis_projects p where p.id=project_id and p.user_id=auth.uid()));

drop policy if exists "own objectives" on public.objectives;
create policy "own objectives" on public.objectives
for all using (exists(select 1 from public.thesis_projects p where p.id=project_id and p.user_id=auth.uid()))
with check (exists(select 1 from public.thesis_projects p where p.id=project_id and p.user_id=auth.uid()));

drop policy if exists "own chapters" on public.chapters;
create policy "own chapters" on public.chapters
for all using (exists(select 1 from public.thesis_projects p where p.id=project_id and p.user_id=auth.uid()))
with check (exists(select 1 from public.thesis_projects p where p.id=project_id and p.user_id=auth.uid()));

drop policy if exists "own sections" on public.sections;
create policy "own sections" on public.sections
for all using (exists(select 1 from public.thesis_projects p where p.id=project_id and p.user_id=auth.uid()))
with check (exists(select 1 from public.thesis_projects p where p.id=project_id and p.user_id=auth.uid()));

drop policy if exists "own articles" on public.articles;
create policy "own articles" on public.articles
for all using (exists(select 1 from public.thesis_projects p where p.id=project_id and p.user_id=auth.uid()))
with check (exists(select 1 from public.thesis_projects p where p.id=project_id and p.user_id=auth.uid()));

drop policy if exists "own highlights" on public.highlights;
create policy "own highlights" on public.highlights
for all using (exists(select 1 from public.thesis_projects p where p.id=project_id and p.user_id=auth.uid()))
with check (exists(select 1 from public.thesis_projects p where p.id=project_id and p.user_id=auth.uid()));

drop policy if exists "own notes" on public.notes;
create policy "own notes" on public.notes
for all using (exists(select 1 from public.thesis_projects p where p.id=project_id and p.user_id=auth.uid()))
with check (exists(select 1 from public.thesis_projects p where p.id=project_id and p.user_id=auth.uid()));

drop policy if exists "own themes" on public.themes;
create policy "own themes" on public.themes
for all using (exists(select 1 from public.thesis_projects p where p.id=project_id and p.user_id=auth.uid()))
with check (exists(select 1 from public.thesis_projects p where p.id=project_id and p.user_id=auth.uid()));

drop policy if exists "own article themes" on public.article_themes;
create policy "own article themes" on public.article_themes
for all using (
  exists(
    select 1 from public.articles a
    join public.thesis_projects p on p.id=a.project_id
    where a.id=article_id and p.user_id=auth.uid()
  )
)
with check (
  exists(
    select 1 from public.articles a
    join public.thesis_projects p on p.id=a.project_id
    where a.id=article_id and p.user_id=auth.uid()
  )
);

drop policy if exists "own evidence links" on public.evidence_links;
create policy "own evidence links" on public.evidence_links
for all using (exists(select 1 from public.thesis_projects p where p.id=project_id and p.user_id=auth.uid()))
with check (exists(select 1 from public.thesis_projects p where p.id=project_id and p.user_id=auth.uid()));

drop policy if exists "own milestones" on public.milestones;
create policy "own milestones" on public.milestones
for all using (exists(select 1 from public.thesis_projects p where p.id=project_id and p.user_id=auth.uid()))
with check (exists(select 1 from public.thesis_projects p where p.id=project_id and p.user_id=auth.uid()));

drop policy if exists "own progress snapshots" on public.progress_snapshots;
create policy "own progress snapshots" on public.progress_snapshots
for all using (exists(select 1 from public.thesis_projects p where p.id=project_id and p.user_id=auth.uid()))
with check (exists(select 1 from public.thesis_projects p where p.id=project_id and p.user_id=auth.uid()));

drop policy if exists "own ai threads" on public.ai_threads;
create policy "own ai threads" on public.ai_threads
for all using (exists(select 1 from public.thesis_projects p where p.id=project_id and p.user_id=auth.uid()))
with check (exists(select 1 from public.thesis_projects p where p.id=project_id and p.user_id=auth.uid()));

drop policy if exists "own ai messages" on public.ai_messages;
create policy "own ai messages" on public.ai_messages
for all using (
  exists(
    select 1 from public.ai_threads t
    join public.thesis_projects p on p.id=t.project_id
    where t.id=thread_id and p.user_id=auth.uid()
  )
)
with check (
  exists(
    select 1 from public.ai_threads t
    join public.thesis_projects p on p.id=t.project_id
    where t.id=thread_id and p.user_id=auth.uid()
  )
);
