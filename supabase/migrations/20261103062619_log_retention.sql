begin;
create table if not exists portal_private.log_retention(
 singleton boolean primary key default true check(singleton),retention_days int not null default 180 check(retention_days between 1 and 3650),
 enabled boolean not null default true,
 last_run timestamptz,updated_at timestamptz not null default now(),updated_by uuid
);
alter table portal_private.log_retention enable row level security;
revoke all on portal_private.log_retention from public,anon,authenticated;
insert into portal_private.log_retention(singleton) values(true) on conflict do nothing;
create or replace function public.portal_log_settings(p_settings jsonb default null) returns jsonb
language plpgsql security definer set search_path=pg_catalog,portal_private as $$
declare uid uuid:=auth.uid();settings portal_private.log_retention%rowtype;
begin
 if uid is null or not portal_private.has_permission(uid,'system.access') or not portal_private.has_permission(uid,'system.logs.manage') then raise exception using errcode='42501',message='로그 관리 권한이 필요합니다.';end if;
 if p_settings is not null then
  if jsonb_typeof(p_settings)<>'object' or (p_settings->>'retention_days') is null or jsonb_typeof(p_settings->'enabled') is distinct from 'boolean' then raise exception 'Invalid retention settings';end if;
  perform pg_advisory_xact_lock(81234003);
  update portal_private.log_retention set retention_days=(p_settings->>'retention_days')::int,enabled=(p_settings->>'enabled')::boolean,updated_at=now(),updated_by=uid where singleton;
  insert into portal_private.audit_logs(actor_id,action,details) values(uid,'log_retention_save',p_settings);
 end if;
 select * into settings from portal_private.log_retention where singleton;
 return to_jsonb(settings)-'singleton';
end $$;
create or replace function portal_private.cleanup_logs(p_force boolean default false,p_actor uuid default null) returns jsonb
language plpgsql security definer set search_path=pg_catalog,portal_private as $$
declare settings portal_private.log_retention%rowtype;cutoff timestamptz;access_count bigint;audit_count bigint;result jsonb;
begin
 perform pg_advisory_xact_lock(81234003);
 select * into settings from portal_private.log_retention where singleton for update;
 if not p_force and (not settings.enabled or settings.last_run is not null and (settings.last_run at time zone 'Asia/Seoul')::date>=(now() at time zone 'Asia/Seoul')::date) then return jsonb_build_object('skipped',true);end if;
 cutoff:=now()-make_interval(days=>settings.retention_days);
 delete from portal_private.access_logs where created_at<cutoff;get diagnostics access_count=row_count;
 delete from portal_private.audit_logs where created_at<cutoff;get diagnostics audit_count=row_count;
 update portal_private.log_retention set last_run=now() where singleton;
 result:=jsonb_build_object('retention_days',settings.retention_days,'access_deleted',access_count,'audit_deleted',audit_count,'automatic',not p_force,'cutoff',cutoff);
 insert into portal_private.audit_logs(actor_id,action,details) values(coalesce(p_actor,'00000000-0000-0000-0000-000000000000'::uuid),'logs_cleanup',result);
 return result;
end $$;
create or replace function public.portal_log_cleanup_now() returns jsonb
language plpgsql security definer set search_path=pg_catalog,portal_private as $$
begin
 if auth.uid() is null or not portal_private.has_permission(auth.uid(),'system.access') or not portal_private.has_permission(auth.uid(),'system.logs.manage') then raise exception using errcode='42501',message='로그 관리 권한이 필요합니다.';end if;
 return portal_private.cleanup_logs(true,auth.uid());
end $$;
create or replace function public.portal_admin_delete_log(p_section text,p_id text) returns jsonb
language plpgsql security definer set search_path=pg_catalog,portal_private as $$
declare uid uuid:=auth.uid();deleted jsonb;
begin
 if uid is null or p_section not in('access','audit') or p_section is null or not portal_private.has_permission(uid,'system.access') or not portal_private.has_permission(uid,'system.logs.manage') or not portal_private.has_permission(uid,case when p_section='access' then 'system.logs.read' else 'system.audit.read' end) then raise exception using errcode='42501',message='로그 삭제 권한이 필요합니다.';end if;
 if p_section='access' then delete from portal_private.access_logs where id=p_id::uuid returning jsonb_build_object('id',id,'created_at',created_at,'actor_id',actor_id,'event',event) into deleted;
 else delete from portal_private.audit_logs where id=p_id::bigint returning jsonb_build_object('id',id,'created_at',created_at,'actor_id',actor_id,'action',action) into deleted;end if;
 if deleted is null then raise exception using errcode='PT404',message='삭제할 로그를 찾지 못했습니다.';end if;
 insert into portal_private.audit_logs(actor_id,action,details) values(uid,p_section||'_log_delete',deleted);
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.portal_log_settings(jsonb) from public,anon;
revoke all on function public.portal_log_cleanup_now() from public,anon;
revoke all on function public.portal_admin_delete_log(text,text) from public,anon;
revoke all on function portal_private.cleanup_logs(boolean,uuid) from public,anon,authenticated;
grant execute on function public.portal_log_settings(jsonb) to authenticated;
grant execute on function public.portal_log_cleanup_now() to authenticated;
grant execute on function public.portal_admin_delete_log(text,text) to authenticated;
-- Older open tabs must also honor the configured retention, instead of their old 90-day action.
do $patch$
declare definition text;marker text:='perform pg_advisory_xact_lock(81234001);';
begin
 definition:=pg_get_functiondef('public.portal_admin_change(text,jsonb)'::regprocedure);
 if position('portal_private.cleanup_logs(true,uid)' in definition)=0 then
  if position(marker in definition)=0 then raise exception 'Admin change function has changed; review retention compatibility before applying';end if;
  definition:=replace(definition,marker,'if p_action=''logs_cleanup'' then return portal_private.cleanup_logs(true,uid);end if;'||chr(10)||marker);
  execute definition;
 end if;
end $patch$;
-- Cron wakes daily at 18:00 UTC = 03:00 Asia/Seoul. The function honors retention/enable settings.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('portal-log-retention','0 18 * * *','select portal_private.cleanup_logs(false,null);');
notify pgrst,'reload schema';
commit;
