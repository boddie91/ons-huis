-- Ons Huis: database-inrichting voor Supabase
-- Plak dit hele bestand in Supabase > SQL Editor en klik op Run.
-- Pas eerst op de laatste regel de huiscode aan.

create extension if not exists pgcrypto with schema extensions;

-- De huiscode (alleen als versleutelde hash bewaard)
create table if not exists public.hh_config (
  id int primary key default 1 check (id = 1),
  code_hash text not null
);

-- Alle gegevens van het huis, als kleine documenten per verzameling
create table if not exists public.hh_docs (
  collection text not null,
  id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (collection, id)
);
create index if not exists hh_docs_updated on public.hh_docs (updated_at);

-- Niemand mag de tabellen rechtstreeks lezen of schrijven; alles loopt via de functies hieronder,
-- en die controleren eerst de huiscode.
alter table public.hh_config enable row level security;
alter table public.hh_docs enable row level security;
revoke all on public.hh_config from anon, authenticated;
revoke all on public.hh_docs from anon, authenticated;

create or replace function public.hh_check(p_code text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_code is null or not exists (select 1 from hh_config where code_hash = crypt(p_code, code_hash)) then
    raise exception 'verkeerde huiscode' using errcode = '28P01';
  end if;
end $$;

-- Alles wat sinds p_since veranderd is (of alles, als p_since leeg is). Grote foto's blijven buiten beschouwing.
create or replace function public.hh_changes(p_code text, p_since timestamptz default null)
returns table (collection text, id text, data jsonb, updated_at timestamptz)
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform hh_check(p_code);
  return query
    select d.collection, d.id, d.data, d.updated_at
    from hh_docs d
    where d.collection <> 'fotobestand'
      and (p_since is null or d.updated_at > p_since)
      and (p_since is not null or not (d.data ? '_del'))
    order by d.updated_at;
end $$;

create or replace function public.hh_get(p_code text, p_collection text, p_id text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform hh_check(p_code);
  return (select data from hh_docs where collection = p_collection and id = p_id and not (data ? '_del'));
end $$;

create or replace function public.hh_set(p_code text, p_collection text, p_id text, p_data jsonb) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform hh_check(p_code);
  if pg_column_size(p_data) > 3000000 then raise exception 'te groot'; end if;
  insert into hh_docs (collection, id, data, updated_at) values (p_collection, p_id, p_data, clock_timestamp())
  on conflict (collection, id) do update set data = excluded.data, updated_at = clock_timestamp();
end $$;

create or replace function public.hh_merge(p_code text, p_collection text, p_id text, p_patch jsonb) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform hh_check(p_code);
  insert into hh_docs (collection, id, data, updated_at) values (p_collection, p_id, p_patch, clock_timestamp())
  on conflict (collection, id) do update
    set data = (hh_docs.data - '_del') || excluded.data, updated_at = clock_timestamp();
end $$;

-- Verwijderen laat een 'grafsteen' achter, zodat andere apparaten het ook verwijderen.
create or replace function public.hh_delete(p_code text, p_collection text, p_id text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform hh_check(p_code);
  if p_collection = 'fotobestand' then
    delete from hh_docs where collection = p_collection and id = p_id;
  else
    update hh_docs set data = '{"_del": true}'::jsonb, updated_at = clock_timestamp()
    where collection = p_collection and id = p_id;
  end if;
end $$;

-- Meerdere schrijfacties in één keer: [{"op":"set"|"merge","c":"...","id":"...","data":{...}}]
create or replace function public.hh_batch(p_code text, p_ops jsonb) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare o jsonb;
begin
  perform hh_check(p_code);
  if jsonb_array_length(p_ops) > 200 then raise exception 'te veel tegelijk'; end if;
  for o in select * from jsonb_array_elements(p_ops) loop
    if o->>'op' = 'merge' then
      insert into hh_docs (collection, id, data, updated_at) values (o->>'c', o->>'id', o->'data', clock_timestamp())
      on conflict (collection, id) do update
        set data = (hh_docs.data - '_del') || excluded.data, updated_at = clock_timestamp();
    else
      insert into hh_docs (collection, id, data, updated_at) values (o->>'c', o->>'id', o->'data', clock_timestamp())
      on conflict (collection, id) do update set data = excluded.data, updated_at = clock_timestamp();
    end if;
  end loop;
end $$;

revoke all on function public.hh_check(text) from public, anon, authenticated;
grant execute on function public.hh_changes(text, timestamptz) to anon;
grant execute on function public.hh_get(text, text, text) to anon;
grant execute on function public.hh_set(text, text, text, jsonb) to anon;
grant execute on function public.hh_merge(text, text, text, jsonb) to anon;
grant execute on function public.hh_delete(text, text, text) to anon;
grant execute on function public.hh_batch(text, jsonb) to anon;

-- >>> Kies hier jullie huiscode (tussen de enkele aanhalingstekens). Minstens 6 tekens, bijv. twee woorden.
-- Later wijzigen? Pas de code aan en voer alleen deze regel opnieuw uit.
insert into public.hh_config (id, code_hash) values (1, extensions.crypt('KIES-HIER-JULLIE-CODE', extensions.gen_salt('bf')))
on conflict (id) do update set code_hash = excluded.code_hash;
