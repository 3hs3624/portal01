begin;
create table if not exists portal_private.user_invitations(
 id uuid primary key default gen_random_uuid(),actor_id uuid not null,email text not null,
 display_name text not null,status text not null default 'pending' check(status in('pending','sent','failed')),
 user_id uuid,created_at timestamptz not null default now()
);
alter table portal_private.user_invitations enable row level security;
revoke all on portal_private.user_invitations from public,anon,authenticated;
create index if not exists portal_invite_email_time on portal_private.user_invitations(email,created_at desc);
create or replace function public.portal_invite_reserve(p_actor uuid,p_email text,p_name text) returns jsonb
language plpgsql security definer set search_path=pg_catalog,portal_private as $$
declare ticket uuid;
begin
 if not portal_private.has_permission(p_actor,'system.access') or not portal_private.has_permission(p_actor,'system.users.manage') then raise exception using errcode='42501',message='Administrator permission required';end if;
 if p_email is null or p_email<>lower(trim(p_email)) or length(p_email)>254 or p_email!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or p_name is null or length(p_name)>100 then raise exception 'Invalid invitation';end if;
 perform pg_advisory_xact_lock(81234002);
 if exists(select 1 from auth.users where lower(email)=p_email) then raise exception 'User already exists';end if;
 if exists(select 1 from portal_private.user_invitations where email=p_email and created_at>now()-interval '10 minutes')
 or (select count(*) from portal_private.user_invitations where actor_id=p_actor and created_at>now()-interval '1 minute')>=5
 or (select count(*) from portal_private.user_invitations where created_at>now()-interval '1 day')>=100 then raise exception 'Invitation limit';end if;
 insert into portal_private.user_invitations(actor_id,email,display_name) values(p_actor,p_email,p_name) returning id into ticket;
 insert into portal_private.audit_logs(actor_id,action,details) values(p_actor,'user_invite_requested',jsonb_build_object('invitation_id',ticket,'email',p_email));
 return jsonb_build_object('id',ticket);
end $$;
create or replace function public.portal_invite_finish(p_id uuid,p_user uuid,p_success boolean) returns jsonb
language plpgsql security definer set search_path=pg_catalog,portal_private as $$
declare invitation portal_private.user_invitations%rowtype;
begin
 select * into invitation from portal_private.user_invitations where id=p_id for update;
 if not found or invitation.status<>'pending' then raise exception 'Invitation not pending';end if;
 if p_success then
  if not exists(select 1 from auth.users where id=p_user and lower(email)=invitation.email) then raise exception 'Invitation user mismatch';end if;
  -- Match the portal's existing default registration, without granting extra roles.
  with added as (
   insert into portal_private.profiles(user_id,display_name) values(p_user,invitation.display_name) on conflict do nothing returning user_id
  ) insert into portal_private.user_roles(user_id,role_id) select a.user_id,r.id from added a cross join portal_private.roles r where r.code='member' on conflict do nothing;
 end if;
 update portal_private.user_invitations set status=case when p_success then 'sent' else 'failed' end,user_id=p_user where id=p_id;
 insert into portal_private.audit_logs(actor_id,action,target_id,details) values(invitation.actor_id,case when p_success then 'user_invite_sent' else 'user_invite_failed' end,p_user,jsonb_build_object('invitation_id',p_id,'email',invitation.email));
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.portal_invite_reserve(uuid,text,text) from public,anon,authenticated;
revoke all on function public.portal_invite_finish(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.portal_invite_reserve(uuid,text,text) to service_role;
grant execute on function public.portal_invite_finish(uuid,uuid,boolean) to service_role;
notify pgrst,'reload schema';
commit;
