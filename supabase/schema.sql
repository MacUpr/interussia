-- ============================================================
-- Inmap — Supabase Schema
-- ============================================================
-- Run this in the Supabase SQL editor (or via the CLI) to create
-- the backing tables for buildings, destinations (POIs), and QR
-- anchor locations. The app reads these via src/data/repository.ts
-- and falls back to bundled local data when the tables are empty
-- or the backend is unreachable.
-- ============================================================

-- ── Buildings ───────────────────────────────────────────────
-- Stores the full floor geometry as JSONB (the Floor[] structure
-- used by the navigation engine: regions, waypoints, connections).
create table if not exists buildings (
  id          text primary key,
  name        text not null,
  address     text,
  geo_lat     real,
  geo_lng     real,
  floor_data  jsonb not null,
  created_at  timestamptz default now()
);

-- ── Destinations (POIs) ─────────────────────────────────────
create table if not exists destinations (
  id                  text primary key,
  name                text not null,
  category            text not null,
  floor_id            text not null,
  position_x          real not null,
  position_y          real not null,
  icon                text default '📍',
  description         text,
  phone               text,
  website             text,
  email               text,
  rating              real,
  review_count        integer default 0,
  opening_hours       jsonb,
  tags                text[],
  entrance_note       text,
  nearest_waypoint_id text not null,
  created_at          timestamptz default now()
);

create index if not exists destinations_floor_idx on destinations (floor_id);
create index if not exists destinations_category_idx on destinations (category);

-- ── Locations (QR anchors) ──────────────────────────────────
create table if not exists locations (
  id                text primary key,
  qr_payload        text unique not null,
  floor_id          text not null,
  position_x        real not null,
  position_y        real not null,
  orientation_deg   real default 0,
  height_from_floor real default 1.5,
  description       text,
  created_at        timestamptz default now()
);

create index if not exists locations_floor_idx on locations (floor_id);

-- ── Row Level Security ──────────────────────────────────────
-- Public read access (anon key) for the navigation app; writes
-- restricted to authenticated admin roles. Adjust to your needs.
alter table buildings    enable row level security;
alter table destinations enable row level security;
alter table locations    enable row level security;

create policy "public read buildings"
  on buildings for select using (true);
create policy "public read destinations"
  on destinations for select using (true);
create policy "public read locations"
  on locations for select using (true);

-- Example write policy (uncomment and adapt once auth is set up):
-- create policy "admin write destinations"
--   on destinations for all
--   using (auth.jwt() ->> 'role' = 'admin')
--   with check (auth.jwt() ->> 'role' = 'admin');
