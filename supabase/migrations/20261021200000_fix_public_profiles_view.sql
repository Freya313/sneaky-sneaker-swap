-- Switch public_profiles from security_invoker to security_definer so all
-- authenticated users can see other users' safe public fields (name, avatar,
-- house, reputation) without the email column ever being exposed.
create or replace view public_profiles
  with (security_invoker = false)
as
  select id, name, ciup_house, is_verified_resident,
         reputation_score, avatar_url, created_at
  from profiles;

grant select on public_profiles to authenticated;
