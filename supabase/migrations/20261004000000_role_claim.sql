-- Puts the user's profile role in their access token as the user_role claim,
-- so src/proxy.ts can redirect by role (e.g. keep staff out of /admin and
-- /couple) from the session cookie alone, without a database query on every
-- request.
--
-- The claim is only a hint for those redirects: it's fixed until the token is
-- refreshed (up to an hour). Pages and API routes still read the role from
-- profiles on every request.
--
-- After running this, enable the hook in the dashboard: Authentication →
-- Hooks → Customize Access Token (JWT) Claims → Postgres function
-- public.custom_access_token_hook. Users who are already signed in get the
-- claim the next time their token refreshes.

create function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  claims jsonb := event -> 'claims';
  user_role text;
begin
  select role into user_role
  from public.profiles
  where id = (event ->> 'user_id')::uuid;

  -- No profile: leave the claim out rather than invent a role.
  if user_role is not null then
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  else
    claims := claims - 'user_role';
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- Only Supabase Auth may call the hook.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb)
  to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb)
  from authenticated, anon, public;

-- profiles has RLS with no other policies, so Auth needs its own to read it.
-- anon and authenticated still can't read it.
grant select on table public.profiles to supabase_auth_admin;

create policy "Auth can read roles for access tokens"
  on public.profiles
  as permissive
  for select
  to supabase_auth_admin
  using (true);
