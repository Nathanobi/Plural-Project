-- Plural Space — schéma initial Supabase (Postgres)
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run.
--
-- Adapté de data-model.md : une table par entité plutôt qu'un array JSON
-- par clé (ce n'était nécessaire que pour le stockage clé-valeur des
-- artifacts Claude). Les relations many-to-many simples (tagIds) sont
-- gardées en colonnes "uuid[]" plutôt qu'en tables de jointure, pour
-- rester proches du modèle d'origine ; à normaliser plus tard si besoin.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Système (singleton)
-- ---------------------------------------------------------------------
create table system_info (
  id uuid primary key default gen_random_uuid(),
  pk_system_id text,
  nom text,
  tag text,
  description text,
  pronoms text,
  date_creation_pk timestamptz,
  last_sync_at timestamptz,
  last_send_at timestamptz,
  last_modif_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Tags (= Groupes)
-- ---------------------------------------------------------------------
create table tags (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  couleur text not null,
  description text,
  parent_id uuid references tags(id) on delete set null,
  ordre integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Prénoms
-- ---------------------------------------------------------------------
create table prenoms (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  tag_ids uuid[] not null default '{}',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Images
-- ---------------------------------------------------------------------
create table images (
  id uuid primary key default gen_random_uuid(),
  prenom_id uuid references prenoms(id) on delete set null,
  tag_ids uuid[] not null default '{}',
  url_hebergee text,
  url_pinterest_source text,
  recadrage jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Proxys
-- ---------------------------------------------------------------------
create table proxys (
  id uuid primary key default gen_random_uuid(),
  prenom_id uuid not null references prenoms(id) on delete cascade,
  tag_ids uuid[] not null default '{}',
  prefix text,
  suffix text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Profils
-- ---------------------------------------------------------------------
create table profils (
  id uuid primary key default gen_random_uuid(),
  prenom_id uuid not null references prenoms(id) on delete cascade,
  image_id uuid references images(id) on delete set null,
  proxy_ids uuid[] not null default '{}',
  tag_ids uuid[] not null default '{}',
  pk_id text,
  display_name text,
  pronouns text,
  color text,
  birthday text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- État de synchro Pluralkit par profil (data-model.md §4)
create table sync_meta (
  profil_id uuid primary key references profils(id) on delete cascade,
  last_sync_at timestamptz,
  last_sync_direction text,
  pk_last_known_update timestamptz
);

-- ---------------------------------------------------------------------
-- Fiches
-- ---------------------------------------------------------------------
create table fiches (
  id uuid primary key default gen_random_uuid(),
  profil_id uuid not null references profils(id) on delete cascade,
  contenu jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Liens (SYSTÈME > Liens)
-- ---------------------------------------------------------------------
create table liens (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null,
  target_id uuid not null,
  cible_type text not null check (cible_type in ('prenom', 'profil')),
  type text not null,
  label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Innerworld (Zones)
-- ---------------------------------------------------------------------
create table innerworld_zones (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  description text,
  groupe_id uuid references tags(id) on delete set null,
  position jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Notes
-- ---------------------------------------------------------------------
create table notes (
  id uuid primary key default gen_random_uuid(),
  titre text,
  contenu text,
  cible_type text check (cible_type in ('prenom', 'profil', 'groupe', 'systeme')),
  cible_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Contacts
-- ---------------------------------------------------------------------
create table contacts (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  info jsonb not null default '{}',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Rappels
-- ---------------------------------------------------------------------
create table rappels (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  description text,
  date_echeance timestamptz,
  statut text not null default 'à faire' check (statut in ('à faire', 'fait')),
  contact_id uuid references contacts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Config (Settings) — singleton
-- ---------------------------------------------------------------------
create table config_settings (
  id boolean primary key default true check (id),
  apparence jsonb not null default '{}',
  connexions jsonb not null default '{}',
  donnees jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Journal (log d'actions)
-- ---------------------------------------------------------------------
create table config_journal (
  id uuid primary key default gen_random_uuid(),
  "timestamp" timestamptz not null default now(),
  action text not null,
  entity_type text,
  entity_id uuid,
  details jsonb
);

-- ---------------------------------------------------------------------
-- NOTE SÉCURITÉ IMPORTANTE
-- ---------------------------------------------------------------------
-- Ces tables n'ont pas de Row Level Security (RLS) activée : la clé
-- "anon" (publique par design, visible dans le code du navigateur une
-- fois l'app déployée) peut donc actuellement tout lire et tout écrire.
-- Tant que l'app reste privée (URL non partagée) c'est un risque limité,
-- mais ce n'est pas une vraie protection. À traiter dans une conversation
-- dédiée "authentification" avant de considérer l'app comme sécurisée :
-- activer RLS + Supabase Auth (ex. connexion par email) pour que seul
-- ton compte puisse lire/écrire ces données.
