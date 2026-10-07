-- Run after deploying the activation Edge Function and updated frontend.
-- The service-role function performs exact code/receipt lookups. Browsers must
-- not enumerate unused codes or the customer information on issued codes.
alter table public.activation_codes enable row level security;
drop policy if exists "Anon can read assigned codes" on public.activation_codes;
drop policy if exists "Allow anon to read unused codes" on public.activation_codes;
drop policy if exists "Allow anon to mark code as used" on public.activation_codes;
revoke all on public.activation_codes from public, anon, authenticated;
grant select, update on public.activation_codes to service_role;

-- Serializes repeated delivery of a checkout and locks inventory rows so
-- concurrent purchases cannot receive the same code.
-- Existing historical duplicate assignments are preserved so no customer's
-- code is revoked. The advisory lock enforces one assignment for new checkouts.
create index if not exists activation_codes_checkout_idx
  on public.activation_codes (stripe_session_id) where stripe_session_id is not null;

create or replace function public.assign_checkout_code(checkout_session text, buyer_email text)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  assigned_id integer;
  assigned_code text;
begin
  if checkout_session is null or checkout_session !~ '^cs_live_[A-Za-z0-9]+$' then
    raise exception 'Invalid checkout session';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(checkout_session, 0));
  select code into assigned_code from public.activation_codes where stripe_session_id = checkout_session
    order by used_at desc nulls last, id desc limit 1;
  if found then return assigned_code; end if;

  select id into assigned_id from public.activation_codes
    where used = false and stripe_session_id is null
    order by id for update skip locked limit 1;
  if not found then raise exception 'No activation codes available'; end if;

  update public.activation_codes
    set used = true, used_at = now(), customer_email = buyer_email, stripe_session_id = checkout_session
    where id = assigned_id returning code into assigned_code;
  return assigned_code;
end;
$$;
revoke all on function public.assign_checkout_code(text, text) from public, anon, authenticated;
grant execute on function public.assign_checkout_code(text, text) to service_role;
