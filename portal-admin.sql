-- 3HS Portal system administration. Run as postgres in Supabase SQL Editor.
-- No credentials, account passwords, or automatic administrator assignment.
begin;
create schema if not exists portal_private;
revoke all on schema portal_private from public,anon,authenticated;
create table if not exists portal_private.migrations(key text primary key);
create table if not exists portal_private.profiles(
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '' check(length(display_name)<=100),
 enabled boolean not null default true,created_at timestamptz not null default now()
);
create table if not exists portal_private.permissions(code text primary key,name text not null,scope text not null);
create table if not exists portal_private.roles(id uuid primary key default gen_random_uuid(),code text unique not null,name text not null,description text not null default '',builtin boolean not null default false,created_at timestamptz not null default now());
create table if not exists portal_private.role_permissions(role_id uuid references portal_private.roles(id) on delete cascade,permission text references portal_private.permissions(code) on delete cascade,primary key(role_id,permission));
create table if not exists portal_private.user_roles(user_id uuid references portal_private.profiles(user_id) on delete cascade,role_id uuid references portal_private.roles(id) on delete cascade,primary key(user_id,role_id));
create table if not exists portal_private.groups(id uuid primary key default gen_random_uuid(),name text unique not null,description text not null default '',created_at timestamptz not null default now());
create table if not exists portal_private.group_members(group_id uuid references portal_private.groups(id) on delete cascade,user_id uuid references portal_private.profiles(user_id) on delete cascade,primary key(group_id,user_id));
create table if not exists portal_private.group_roles(group_id uuid references portal_private.groups(id) on delete cascade,role_id uuid references portal_private.roles(id) on delete cascade,primary key(group_id,role_id));
create table if not exists portal_private.access_logs(id uuid primary key,actor_id uuid not null,event text not null check(event in('login','session_restore','logout')),user_agent text not null default '',created_at timestamptz not null default now());
create table if not exists portal_private.audit_logs(id bigint generated always as identity primary key,actor_id uuid not null,action text not null,target_id uuid,details jsonb not null default '{}',created_at timestamptz not null default now());
create index if not exists portal_access_actor_time on portal_private.access_logs(actor_id,created_at desc);
create index if not exists portal_access_time on portal_private.access_logs(created_at desc);
create index if not exists portal_audit_time on portal_private.audit_logs(created_at desc);
-- Defense in depth: private tables have no browser grants or client-write policies.
alter table portal_private.migrations enable row level security;
alter table portal_private.profiles enable row level security;
alter table portal_private.permissions enable row level security;
alter table portal_private.roles enable row level security;
alter table portal_private.role_permissions enable row level security;
alter table portal_private.user_roles enable row level security;
alter table portal_private.groups enable row level security;
alter table portal_private.group_members enable row level security;
alter table portal_private.group_roles enable row level security;
alter table portal_private.access_logs enable row level security;
alter table portal_private.audit_logs enable row level security;
revoke all on all tables in schema portal_private from public,anon,authenticated;
revoke all on all sequences in schema portal_private from public,anon,authenticated;
insert into portal_private.permissions(code,name,scope) values
 ('system.access','시스템관리 진입','system'),('system.users.read','사용자 조회','system'),('system.users.manage','사용자 상태·역할 관리','system'),
 ('system.groups.read','그룹 조회','system'),('system.groups.manage','그룹·구성원 관리','system'),('system.roles.read','역할 조회','system'),('system.roles.manage','역할·권한 관리','system'),
 ('system.permissions.read','권한 목록 조회','system'),('system.logs.read','접속로그 조회','system'),('system.audit.read','관리 변경 이력 조회','system'),('system.logs.manage','오래된 로그 정리','system'),
 ('app.markdown.read','Write Studio 사용','application'),('app.markdown.write','Write Studio 클라우드 저장','application'),
 ('app.insight.read','Insight BI 사용','application'),('app.insight.write','Insight BI 클라우드 저장','application'),
 ('app.projects.read','Project Management 사용','application'),('app.projects.write','Project Management 클라우드 저장','application')
on conflict(code) do update set name=excluded.name,scope=excluded.scope;
insert into portal_private.roles(code,name,description,builtin) values
 ('system_admin','시스템 관리자','전체 시스템 및 애플리케이션 관리',true),('member','일반 사용자','기본 애플리케이션 사용',true)
on conflict(code) do nothing;
insert into portal_private.role_permissions(role_id,permission) select r.id,p.code from portal_private.roles r cross join portal_private.permissions p where r.code='system_admin' on conflict do nothing;
-- Only seed defaults for a new member role; repeat migrations preserve administrator choices.
insert into portal_private.role_permissions(role_id,permission)
select r.id,p.code from portal_private.roles r cross join portal_private.permissions p where r.code='member' and p.scope='application'
 and not exists(select 1 from portal_private.migrations where key='member_permissions_initialized') on conflict do nothing;
insert into portal_private.migrations(key) values('member_permissions_initialized') on conflict do nothing;
with added as (
 insert into portal_private.profiles(user_id,display_name)
 select id,left(coalesce(nullif(raw_user_meta_data->>'full_name',''),split_part(coalesce(email,''),'@',1)),100) from auth.users
 on conflict(user_id) do nothing returning user_id
)
insert into portal_private.user_roles(user_id,role_id) select a.user_id,r.id from added a cross join portal_private.roles r where r.code='member' on conflict do nothing;

create or replace function portal_private.has_permission(p_user uuid,p_permission text) returns boolean
language sql stable security definer set search_path=pg_catalog,portal_private as $$
 select exists(select 1 from portal_private.profiles p where p.user_id=p_user and p.enabled and exists(
  select 1 from portal_private.role_permissions rp where rp.permission=p_permission and (
   exists(select 1 from portal_private.user_roles ur where ur.user_id=p_user and ur.role_id=rp.role_id)
   or exists(select 1 from portal_private.group_members gm join portal_private.group_roles gr on gr.group_id=gm.group_id where gm.user_id=p_user and gr.role_id=rp.role_id)
  )
 ));
$$;
revoke all on function portal_private.has_permission(uuid,text) from public,anon,authenticated;
create or replace function public.portal_auth_context() returns jsonb language plpgsql security definer set search_path=pg_catalog,portal_private as $$
declare uid uuid:=auth.uid();added uuid;result jsonb;
begin
 if uid is null then raise exception using errcode='42501',message='Authentication required';end if;
 insert into portal_private.profiles(user_id,display_name) select id,left(coalesce(nullif(raw_user_meta_data->>'full_name',''),split_part(coalesce(email,''),'@',1)),100) from auth.users where id=uid on conflict do nothing returning user_id into added;
 if added is not null then insert into portal_private.user_roles(user_id,role_id) select uid,id from portal_private.roles where code='member' on conflict do nothing;end if;
 select jsonb_build_object('configured',true,'enabled',p.enabled,'displayName',p.display_name,'isAdmin',portal_private.has_permission(uid,'system.access'),
 'permissions',coalesce((select jsonb_agg(code order by code) from portal_private.permissions where portal_private.has_permission(uid,code)),'[]'::jsonb)) into result from portal_private.profiles p where p.user_id=uid;
 if result is null then raise exception using errcode='42501',message='User not found';end if;return result;
end $$;
create or replace function public.portal_can_access(p_app text,p_action text) returns boolean language sql stable security definer set search_path=pg_catalog,portal_private as $$
 select p_app in('markdown','insight','projects') and p_action in('read','write') and portal_private.has_permission(auth.uid(),'app.'||p_app||'.'||p_action);
$$;
create or replace function public.portal_record_access(p_event text,p_id uuid,p_user_agent text default '') returns boolean language plpgsql security definer set search_path=pg_catalog,portal_private as $$
begin
 if auth.uid() is null then raise exception using errcode='42501',message='Authentication required';end if;
 if p_event not in('login','session_restore','logout') or p_event is null or p_id is null then raise exception using errcode='22023',message='Invalid event';end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
 if (select count(*) from portal_private.access_logs where actor_id=auth.uid() and created_at>now()-interval '1 minute')>=10 or (select count(*) from portal_private.access_logs where actor_id=auth.uid() and created_at>now()-interval '1 day')>=300 then return false;end if;
 insert into portal_private.access_logs(id,actor_id,event,user_agent) values(p_id,auth.uid(),p_event,left(coalesce(p_user_agent,''),300)) on conflict do nothing;return true;
end $$;

create or replace function public.portal_admin_read(p_section text,p_limit int default 50,p_offset int default 0,p_query text default '') returns jsonb language plpgsql security definer set search_path=pg_catalog,portal_private as $$
declare uid uuid:=auth.uid();needed text;items jsonb;total bigint;lim int:=greatest(1,least(coalesce(p_limit,50),200));off int:=greatest(0,least(coalesce(p_offset,0),10000));q text:=left(coalesce(p_query,''),100);
begin
 needed:=case p_section when 'overview' then 'system.access' when 'users' then 'system.users.read' when 'groups' then 'system.groups.read' when 'roles' then 'system.roles.read' when 'permissions' then 'system.permissions.read' when 'access' then 'system.logs.read' when 'audit' then 'system.audit.read' else null end;
 if needed is null or not portal_private.has_permission(uid,'system.access') or not portal_private.has_permission(uid,needed) then raise exception using errcode='42501',message='Administrator permission required';end if;
 if p_section='overview' then return jsonb_build_object('users',(select count(*) from portal_private.profiles),'enabledUsers',(select count(*) from portal_private.profiles where enabled),'groups',(select count(*) from portal_private.groups),'roles',(select count(*) from portal_private.roles),'recentAccess',(select count(*) from portal_private.access_logs where created_at>now()-interval '1 day'));end if;
 if p_section='users' then
  -- Auth accounts are read only. Portal activation does not change Supabase Auth itself.
  select count(*) into total from portal_private.profiles p join auth.users u on u.id=p.user_id where concat_ws(' ',u.email,p.display_name) ilike '%'||q||'%';
  select coalesce(jsonb_agg(to_jsonb(t)),'[]') into items from(select p.user_id as id,u.email,p.display_name,p.enabled,u.created_at,u.last_sign_in_at,
   coalesce((select jsonb_agg(r.id) from portal_private.user_roles ur join portal_private.roles r on r.id=ur.role_id where ur.user_id=p.user_id),'[]') as role_ids,
   coalesce((select jsonb_agg(r.name) from portal_private.user_roles ur join portal_private.roles r on r.id=ur.role_id where ur.user_id=p.user_id),'[]') as role_names
   from portal_private.profiles p join auth.users u on u.id=p.user_id where concat_ws(' ',u.email,p.display_name) ilike '%'||q||'%' order by u.created_at desc,p.user_id limit lim offset off)t;
 elsif p_section='groups' then
  select count(*) into total from portal_private.groups where name ilike '%'||q||'%';
  select coalesce(jsonb_agg(to_jsonb(t)),'[]') into items from(select g.id,g.name,g.description,
   coalesce((select jsonb_agg(user_id) from portal_private.group_members where group_id=g.id),'[]') as member_ids,
   coalesce((select jsonb_agg(role_id) from portal_private.group_roles where group_id=g.id),'[]') as role_ids
   from portal_private.groups g where name ilike '%'||q||'%' order by name,id limit lim offset off)t;
 elsif p_section='roles' then
  select count(*) into total from portal_private.roles where concat_ws(' ',name,code) ilike '%'||q||'%';
  select coalesce(jsonb_agg(to_jsonb(t)),'[]') into items from(select r.*,coalesce((select jsonb_agg(permission order by permission) from portal_private.role_permissions where role_id=r.id),'[]') as permissions from portal_private.roles r where concat_ws(' ',name,code) ilike '%'||q||'%' order by builtin desc,name,id limit lim offset off)t;
 elsif p_section='permissions' then
  select count(*) into total from portal_private.permissions where concat_ws(' ',code,name) ilike '%'||q||'%';
  select coalesce(jsonb_agg(to_jsonb(t)),'[]') into items from(select * from portal_private.permissions where concat_ws(' ',code,name) ilike '%'||q||'%' order by scope,code limit lim offset off)t;
 elsif p_section='access' then
  select count(*) into total from portal_private.access_logs l left join auth.users u on u.id=l.actor_id where concat_ws(' ',u.email,l.event) ilike '%'||q||'%';
  select coalesce(jsonb_agg(to_jsonb(t)),'[]') into items from(select l.*,u.email from portal_private.access_logs l left join auth.users u on u.id=l.actor_id where concat_ws(' ',u.email,l.event) ilike '%'||q||'%' order by l.created_at desc,l.id limit lim offset off)t;
 else
  select count(*) into total from portal_private.audit_logs l left join auth.users u on u.id=l.actor_id where concat_ws(' ',u.email,l.action) ilike '%'||q||'%';
  select coalesce(jsonb_agg(to_jsonb(t)),'[]') into items from(select l.*,u.email from portal_private.audit_logs l left join auth.users u on u.id=l.actor_id where concat_ws(' ',u.email,l.action) ilike '%'||q||'%' order by l.created_at desc,l.id desc limit lim offset off)t;
 end if;
 return jsonb_build_object('items',items,'total',total,'limit',lim,'offset',off);
end $$;

create or replace function public.portal_admin_change(p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path=pg_catalog,portal_private as $$
declare uid uuid:=auth.uid();target uuid;needed text;ids uuid[];role_code text;is_builtin boolean;perm text;count_admins int;before_state jsonb;details jsonb:='{}';
begin
 needed:=case when p_action in('user_save','user_roles') then 'system.users.manage' when p_action in('group_save','group_delete','group_members','group_roles') then 'system.groups.manage' when p_action in('role_save','role_delete') then 'system.roles.manage' when p_action='logs_cleanup' then 'system.logs.manage' else null end;
 if needed is null or not portal_private.has_permission(uid,'system.access') or not portal_private.has_permission(uid,needed) then raise exception using errcode='42501',message='Administrator permission required';end if;
 if p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>65536 then raise exception using errcode='22023',message='Invalid change';end if;
 perform pg_advisory_xact_lock(81234001);
 target:=nullif(p_data->>'id','')::uuid;
 if p_action in('user_save','user_roles') then select jsonb_build_object('profile',to_jsonb(p),'role_ids',(select jsonb_agg(role_id) from portal_private.user_roles where user_id=target)) into before_state from portal_private.profiles p where p.user_id=target;
 elsif p_action like 'group_%' then select jsonb_build_object('group',to_jsonb(g),'member_ids',(select jsonb_agg(user_id) from portal_private.group_members where group_id=target),'role_ids',(select jsonb_agg(role_id) from portal_private.group_roles where group_id=target)) into before_state from portal_private.groups g where g.id=target;
 elsif p_action like 'role_%' then select jsonb_build_object('role',to_jsonb(r),'permissions',(select jsonb_agg(permission) from portal_private.role_permissions where role_id=target)) into before_state from portal_private.roles r where r.id=target;
 end if;

 -- Delegated managers cannot modify assignments that carry permissions beyond their own.
 if p_action in('user_roles','group_roles','group_members','role_save','role_delete') and exists(
  select 1 from portal_private.role_permissions rp where
   (rp.role_id=target and p_action in('role_save','role_delete')
    or p_action='user_roles' and exists(select 1 from portal_private.user_roles ur where ur.user_id=target and ur.role_id=rp.role_id)
    or p_action in('group_roles','group_members') and exists(select 1 from portal_private.group_roles gr where gr.group_id=target and gr.role_id=rp.role_id))
   and not portal_private.has_permission(uid,rp.permission)
 ) then raise exception using errcode='42501',message='Cannot manage permissions beyond your own';end if;

 if p_action='user_save' then
  if target is null or length(coalesce(p_data->>'display_name',''))>100 then raise exception using errcode='22023',message='Invalid user';end if;
  update portal_private.profiles set display_name=coalesce(p_data->>'display_name',display_name),enabled=coalesce((p_data->>'enabled')::boolean,enabled) where user_id=target;
  if not found then raise exception using errcode='22023',message='User not found';end if;
  details:=jsonb_build_object('enabled',p_data->'enabled','display_name',p_data->>'display_name');
 elsif p_action in('user_roles','group_roles') then
  if jsonb_typeof(p_data->'role_ids') is distinct from 'array' then raise exception using errcode='22023',message='Role IDs required';end if;
  select coalesce(array_agg(distinct value::uuid),'{}') into ids from jsonb_array_elements_text(p_data->'role_ids');
  if cardinality(ids)>200 or exists(select 1 from unnest(ids) x where not exists(select 1 from portal_private.roles r where r.id=x)) then raise exception using errcode='22023',message='Invalid role';end if;
  if exists(select 1 from portal_private.role_permissions rp where rp.role_id=any(ids) and not portal_private.has_permission(uid,rp.permission)) then raise exception using errcode='42501',message='Cannot grant permissions beyond your own';end if;
  if p_action='group_roles' then
   if exists(select 1 from portal_private.roles r where r.id=any(ids) and r.code='system_admin') then raise exception using errcode='22023',message='System administrator role cannot be assigned to a group';end if;
   if not exists(select 1 from portal_private.groups where id=target) then raise exception using errcode='22023',message='Group not found';end if;
   delete from portal_private.group_roles where group_id=target;insert into portal_private.group_roles select target,unnest(ids);
  else
   if not exists(select 1 from portal_private.profiles where user_id=target) then raise exception using errcode='22023',message='User not found';end if;
   delete from portal_private.user_roles where user_id=target;insert into portal_private.user_roles select target,unnest(ids);
  end if;
  details:=jsonb_build_object('role_ids',to_jsonb(ids));
 elsif p_action='group_members' then
  if not exists(select 1 from portal_private.groups where id=target) or jsonb_typeof(p_data->'member_ids') is distinct from 'array' then raise exception using errcode='22023',message='Group and member IDs required';end if;
  select coalesce(array_agg(distinct value::uuid),'{}') into ids from jsonb_array_elements_text(p_data->'member_ids');
  if cardinality(ids)>1000 or exists(select 1 from unnest(ids) x where not exists(select 1 from portal_private.profiles p where p.user_id=x)) then raise exception using errcode='22023',message='Invalid member';end if;
  delete from portal_private.group_members where group_id=target;insert into portal_private.group_members select target,unnest(ids);details:=jsonb_build_object('member_count',cardinality(ids));
 elsif p_action='group_save' then
  if length(trim(coalesce(p_data->>'name','')))<1 or length(p_data->>'name')>80 or length(coalesce(p_data->>'description',''))>300 then raise exception using errcode='22023',message='Invalid group name';end if;
  if target is null then insert into portal_private.groups(name,description) values(trim(p_data->>'name'),coalesce(p_data->>'description','')) returning id into target;
  else update portal_private.groups set name=trim(p_data->>'name'),description=coalesce(p_data->>'description','') where id=target;if not found then raise exception using errcode='22023',message='Group not found';end if;end if;
  details:=jsonb_build_object('name',p_data->>'name');
 elsif p_action='group_delete' then
  delete from portal_private.groups where id=target;if not found then raise exception using errcode='22023',message='Group not found';end if;
 elsif p_action='role_save' then
  if length(trim(coalesce(p_data->>'name','')))<1 or length(p_data->>'name')>80 or length(coalesce(p_data->>'description',''))>300 or jsonb_typeof(p_data->'permissions') is distinct from 'array' then raise exception using errcode='22023',message='Invalid role';end if;
  if target is null then
   if coalesce(p_data->>'code','')!~'^[a-z][a-z0-9_]{2,39}$' then raise exception using errcode='22023',message='Invalid role code';end if;
   insert into portal_private.roles(code,name,description) values(p_data->>'code',trim(p_data->>'name'),coalesce(p_data->>'description','')) returning id into target;
  else
   select r.code,r.builtin into role_code,is_builtin from portal_private.roles r where r.id=target;
   if role_code is null or role_code='system_admin' then raise exception using errcode='42501',message='Protected role';end if;
   update portal_private.roles set name=case when is_builtin then name else trim(p_data->>'name') end,description=coalesce(p_data->>'description','') where id=target;
  end if;
  for perm in select distinct value from jsonb_array_elements_text(p_data->'permissions') loop
   if not exists(select 1 from portal_private.permissions p where p.code=perm) then raise exception using errcode='22023',message='Unknown permission';end if;
   if not portal_private.has_permission(uid,perm) then raise exception using errcode='42501',message='Cannot grant permissions beyond your own';end if;
  end loop;
  delete from portal_private.role_permissions where role_id=target;
  insert into portal_private.role_permissions select target,value from(select distinct value from jsonb_array_elements_text(p_data->'permissions'))s;
  details:=jsonb_build_object('name',p_data->>'name','permissions',p_data->'permissions');
 elsif p_action='role_delete' then
  if exists(select 1 from portal_private.roles where id=target and builtin) then raise exception using errcode='42501',message='Protected role';end if;
  delete from portal_private.roles where id=target;if not found then raise exception using errcode='22023',message='Role not found';end if;
 else
  -- Fixed 90-day retention; never accept arbitrary SQL or arbitrary date ranges.
  delete from portal_private.access_logs where created_at<now()-interval '90 days';
  delete from portal_private.audit_logs where created_at<now()-interval '90 days';details:=jsonb_build_object('retention_days',90);
 end if;
 select count(*) into count_admins from portal_private.profiles p where p.enabled and exists(select 1 from portal_private.user_roles ur join portal_private.roles r on r.id=ur.role_id where ur.user_id=p.user_id and r.code='system_admin');
 if count_admins<1 then raise exception using errcode='PT409',message='The last active system administrator cannot be removed or disabled';end if;
 insert into portal_private.audit_logs(actor_id,action,target_id,details) values(uid,p_action,target,jsonb_build_object('before',before_state,'after',details));
 return jsonb_build_object('ok',true,'id',target);
end $$;
-- Function-only browser access. No browser can assign itself an administrator role.
revoke all on function public.portal_auth_context() from public,anon;
revoke all on function public.portal_can_access(text,text) from public,anon;
revoke all on function public.portal_record_access(text,uuid,text) from public,anon;
revoke all on function public.portal_admin_read(text,int,int,text) from public,anon;
revoke all on function public.portal_admin_change(text,jsonb) from public,anon;
grant execute on function public.portal_auth_context() to authenticated;
grant execute on function public.portal_can_access(text,text) to authenticated;
grant execute on function public.portal_record_access(text,uuid,text) to authenticated;
grant execute on function public.portal_admin_read(text,int,int,text) to authenticated;
grant execute on function public.portal_admin_change(text,jsonb) to authenticated;
-- Enforce portal status and application permissions on existing cloud workspace data.
do $$begin
 if to_regclass('public.portal_workspaces') is not null then
  execute 'drop policy if exists portal_workspace_select on public.portal_workspaces';
  execute 'create policy portal_workspace_select on public.portal_workspaces for select to authenticated using ((select auth.uid())=user_id and public.portal_can_access(app_id,''read''))';
  execute 'drop policy if exists portal_workspace_insert on public.portal_workspaces';
  execute 'create policy portal_workspace_insert on public.portal_workspaces for insert to authenticated with check ((select auth.uid())=user_id and public.portal_can_access(app_id,''write''))';
  execute 'drop policy if exists portal_workspace_update on public.portal_workspaces';
  execute 'create policy portal_workspace_update on public.portal_workspaces for update to authenticated using ((select auth.uid())=user_id and public.portal_can_access(app_id,''write'')) with check ((select auth.uid())=user_id and public.portal_can_access(app_id,''write''))';
 end if;
end $$;
notify pgrst,'reload schema';
commit;
