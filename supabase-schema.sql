-- ─── MUTEX Juguetico — Supabase schema ───
-- Pegá este SQL completo en: Supabase → SQL Editor → New query → Run.
-- Crea la tabla, índices y reglas de seguridad (RLS) para la galería pública.

create table if not exists public.designs (
  id            bigserial primary key,
  grid          jsonb       not null,
  rows          integer     not null check (rows between 4 and 24),
  cols          integer     not null check (cols between 4 and 24),
  email         text        not null,
  email_masked  text        not null,
  created_at    timestamptz not null default now()
);

create index if not exists designs_created_at_idx
  on public.designs (created_at desc);

-- Row Level Security ON
alter table public.designs enable row level security;

-- Limpieza por si re-corres el script
drop policy if exists "anon read designs" on public.designs;
revoke all on public.designs from anon;
revoke all on public.designs from authenticated;

-- Sólo columnas seguras quedan visibles para visitantes anónimos del sitio
grant select (id, grid, rows, cols, email_masked, created_at)
  on public.designs to anon;

-- Política de lectura: cualquier visitante puede leer (filtrado por columnas arriba)
create policy "anon read designs"
  on public.designs
  for select
  to anon
  using (true);

-- Los inserts los hace la Vercel Function con la SERVICE_ROLE key
-- (service_role salta RLS por diseño de Supabase). No hace falta policy de INSERT.

-- ─── Listo. Verificá con: select * from public.designs limit 1; ───
