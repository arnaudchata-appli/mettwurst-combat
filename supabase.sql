-- ---------------------------------------------------------------------------
-- Classement interga-lactique de Mettwurst Combat : table Supabase
-- À coller dans Supabase > SQL Editor > New query, puis « Run ».
-- ---------------------------------------------------------------------------

create table if not exists public.scores (
  id         bigint generated always as identity primary key,
  name       text    not null check (name ~ '^[A-Z0-9]{3}$'),            -- 3 initiales
  score      integer not null check (score > 0 and score <= 500000),     -- score plausible
  fighter    text    not null check (fighter ~ '^[a-z]{1,16}$'),            -- id du grilladin
  diff       smallint not null check (diff between 0 and 3),             -- difficulté
  created_at timestamptz not null default now()
);

create index if not exists scores_top on public.scores (score desc, created_at asc);

-- Sécurité : tout le monde peut lire et ajouter un score,
-- personne ne peut modifier ni effacer ceux des autres.
alter table public.scores enable row level security;

drop policy if exists "lecture publique" on public.scores;
create policy "lecture publique" on public.scores for select to anon using (true);

drop policy if exists "ajout public" on public.scores;
create policy "ajout public" on public.scores for insert to anon with check (true);

revoke all on public.scores from anon;
grant select (name, score, fighter, diff, created_at) on public.scores to anon;
grant insert (name, score, fighter, diff) on public.scores to anon;
