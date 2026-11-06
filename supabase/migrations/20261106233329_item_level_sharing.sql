-- Item-level sharing. Private records are exposed only through authorized RPCs.
begin;
create schema portal_sharing;
revoke all on schema portal_sharing from public,anon,authenticated;
create table portal_sharing.shared_items(
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,
 app_id text not null check(app_id in('markdown','projects','insight')),source_key text not null check(length(source_key) between 1 and 300),
 title text not null check(length(btrim(title)) between 1 and 200),workspace jsonb not null,
 revision uuid not null default gen_random_uuid(),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(owner_id,app_id,source_key),check(octet_length(workspace::text)<=26214400)
);
create table portal_sharing.shared_members(
 item_id uuid not null references portal_sharing.shared_items(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,
 permission text not null check(permission in('view','edit')),created_at timestamptz not null default now(),primary key(item_id,user_id)
);
create index shared_members_recipient on portal_sharing.shared_members(user_id,item_id);
create index shared_items_owner_updated on portal_sharing.shared_items(owner_id,updated_at desc);
create table portal_sharing.shared_versions(
 item_id uuid not null references portal_sharing.shared_items(id) on delete cascade,revision uuid not null,workspace jsonb not null,actor_id uuid not null,saved_at timestamptz not null default now(),primary key(item_id,revision)
);
alter table portal_sharing.shared_items enable row level security;
alter table portal_sharing.shared_members enable row level security;
alter table portal_sharing.shared_versions enable row level security;
revoke all on portal_sharing.shared_items,portal_sharing.shared_members,portal_sharing.shared_versions from public,anon,authenticated;
create function portal_sharing.shared_validate(p_app text,w jsonb) returns void language plpgsql immutable set search_path=pg_catalog as $$
declare pid text;
begin
 if w is null or jsonb_typeof(w) is distinct from 'object' or w->>'version' is distinct from '1' or octet_length(w::text)>26214400 then raise exception 'Invalid shared workspace' using errcode='22023';end if;
 if p_app='markdown' then
  if w->>'format' is distinct from 'md-editor-workspace' or jsonb_typeof(w->'documents') is distinct from 'array' or jsonb_array_length(w->'documents')<>1 or coalesce(jsonb_array_length(w->'folders'),0)<>0 or w->>'activeId' is distinct from w->'documents'->0->>'id' then raise exception 'Share exactly one document' using errcode='22023';end if;
 elsif p_app='insight' then
  if w->>'format' is distinct from 'insight-bi-workspace' or jsonb_typeof(w->'dashboards') is distinct from 'array' or jsonb_array_length(w->'dashboards')<>1 or jsonb_typeof(w->'sources') is distinct from 'array' or jsonb_array_length(w->'sources')>1 or coalesce(jsonb_array_length(w->'detached'),0)<>0 then raise exception 'Share exactly one dashboard and selected data' using errcode='22023';end if;
  if exists(select 1 from jsonb_array_elements(w->'sources') s where jsonb_typeof(s->'sheets') is distinct from 'object' or (select count(*) from jsonb_object_keys(s->'sheets'))<>1 or coalesce(jsonb_array_length(s->'retainedDashboards'),0)<>0) then raise exception 'Share only the selected sheet' using errcode='22023';end if;
 elsif p_app='projects' then
  if w->>'format' is distinct from 'wbs-pm-cloud' or jsonb_typeof(w->'files') is distinct from 'array' or jsonb_array_length(w->'files')>5000 or jsonb_array_length(w->'files')<1 then raise exception 'Invalid shared project' using errcode='22023';end if;
  if (select count(*) from jsonb_array_elements(w->'files') f where f->>'path' ~ '^projects/[^/]+[.]meta[.]json$')<>1 then raise exception 'Share exactly one project' using errcode='22023';end if;
  select regexp_replace(f->>'path','^projects/([^/]+)[.]meta[.]json$','\1') into pid from jsonb_array_elements(w->'files') f where f->>'path' ~ '^projects/[^/]+[.]meta[.]json$';
  if exists(select 1 from jsonb_array_elements(w->'files') f where f->>'path' not in('projects/'||pid||'.json','projects/'||pid||'.meta.json') and not starts_with(f->>'path','projects/'||pid||'/')) then raise exception 'Share only the selected project' using errcode='22023';end if;
 else raise exception 'Invalid app' using errcode='22023';end if;
end $$;
revoke all on function portal_sharing.shared_validate(text,jsonb) from public,anon,authenticated;
create function portal_sharing.shared_action(p_action text,p_args jsonb) returns jsonb language plpgsql security definer set search_path=pg_catalog,portal_sharing as $$
declare uid uuid:=auth.uid();a text:=p_args->>'app';r portal_sharing.shared_items;recipient uuid;perm text;result jsonb;w jsonb;can_edit boolean;
begin
 if uid is null or jsonb_typeof(p_args)<>'object' then raise exception 'Authentication required' using errcode='42501';end if;
 if p_action in('users','list','ensure') then
  if a is null or a not in('markdown','projects','insight') or not public.portal_can_access(a,'read') then raise exception 'Access denied' using errcode='42501';end if;
  if p_action='users' then
   select coalesce(jsonb_agg(x),'[]'::jsonb) into result from (select p.user_id as id,p.display_name as name,u.email from portal_private.profiles p join auth.users u on u.id=p.user_id where p.enabled and u.email_confirmed_at is not null and p.user_id<>uid and portal_private.has_permission(p.user_id,'app.'||a||'.read') and (coalesce(p_args->>'query','')='' or position(lower(left(p_args->>'query',100)) in lower(p.display_name||' '||coalesce(u.email,'')))>0) order by p.display_name,p.user_id limit 100)x;return result;
  elsif p_action='list' then
   select coalesce(jsonb_agg(x order by x.updated_at desc),'[]'::jsonb) into result from(select i.id,i.app_id as app,i.source_key,i.title,i.updated_at,i.revision,i.owner_id=uid as owner,p.display_name as owner_name,case when i.owner_id=uid then 'owner' else m.permission end as permission from portal_sharing.shared_items i left join portal_sharing.shared_members m on m.item_id=i.id and m.user_id=uid join portal_private.profiles p on p.user_id=i.owner_id and p.enabled where i.app_id=a and (i.owner_id=uid or m.user_id=uid) and portal_private.has_permission(i.owner_id,'app.'||a||'.read'))x;return result;
  else
   if not public.portal_can_access(a,'write') then raise exception 'Write access required' using errcode='42501';end if;
   perform pg_advisory_xact_lock(hashtextextended(uid::text,531));
   select * into r from portal_sharing.shared_items where owner_id=uid and app_id=a and source_key=p_args->>'key';
   if not found then
    w:=p_args->'workspace';perform portal_sharing.shared_validate(a,w);
    if (select coalesce(sum(octet_length(workspace::text)),0) from portal_sharing.shared_items where owner_id=uid)+octet_length(w::text)>104857600 then raise exception 'Shared storage limit exceeded' using errcode='22023';end if;
    insert into portal_sharing.shared_items(owner_id,app_id,source_key,title,workspace) values(uid,a,p_args->>'key',p_args->>'title',w) returning * into r;
   end if;
   return jsonb_build_object('id',r.id,'title',r.title,'revision',r.revision,'owner',true,'permission','owner');
  end if;
 end if;
 select * into r from portal_sharing.shared_items where id=(p_args->>'id')::uuid for update;
 if not found or not public.portal_can_access(r.app_id,'read') or not portal_private.has_permission(r.owner_id,'app.'||r.app_id||'.read') then raise exception 'Shared item unavailable' using errcode='42501';end if;
 select permission into perm from portal_sharing.shared_members where item_id=r.id and user_id=uid;
 if r.owner_id<>uid and perm is null then raise exception 'Shared item unavailable' using errcode='42501';end if;
 can_edit:=(r.owner_id=uid or perm='edit') and public.portal_can_access(r.app_id,'write');
 if p_action='get' then return jsonb_build_object('id',r.id,'app',r.app_id,'title',r.title,'workspace',r.workspace,'revision',r.revision,'updatedAt',r.updated_at,'owner',r.owner_id=uid,'permission',case when r.owner_id=uid then 'owner' else perm end,'canEdit',can_edit);
 elsif p_action='save' then
  if not can_edit then raise exception 'Read only' using errcode='42501';end if;
  if r.revision is distinct from (p_args->>'revision')::uuid then raise exception 'Shared item changed' using errcode='PT409';end if;
  w:=p_args->'workspace';perform portal_sharing.shared_validate(r.app_id,w);
  perform pg_advisory_xact_lock(hashtextextended(r.owner_id::text,531));
  if (select coalesce(sum(octet_length(workspace::text)),0) from portal_sharing.shared_items where owner_id=r.owner_id and id<>r.id)+octet_length(w::text)>104857600 then raise exception 'Shared storage limit exceeded' using errcode='22023';end if;
  insert into portal_sharing.shared_versions(item_id,revision,workspace,actor_id) values(r.id,r.revision,r.workspace,uid);
  delete from portal_sharing.shared_versions where item_id=r.id and revision not in(select revision from portal_sharing.shared_versions where item_id=r.id order by saved_at desc limit 3);
  update portal_sharing.shared_items set workspace=w,title=left(coalesce(nullif(btrim(p_args->>'title'),''),title),200),revision=gen_random_uuid(),updated_at=now() where id=r.id returning * into r;
  return jsonb_build_object('id',r.id,'revision',r.revision,'savedAt',r.updated_at);
 elsif p_action in('members','grant','revoke') then
  if r.owner_id<>uid or not public.portal_can_access(r.app_id,'write') then raise exception 'Owner only' using errcode='42501';end if;
  if p_action<>'members' then
   recipient:=(p_args->>'user')::uuid;if recipient=uid then raise exception 'Cannot change owner' using errcode='22023';end if;
   if p_action='grant' then
    perm:=p_args->>'permission';if perm not in('view','edit') or perm is null then raise exception 'Invalid permission' using errcode='22023';end if;
    if not exists(select 1 from portal_private.profiles p join auth.users u on u.id=p.user_id where p.user_id=recipient and p.enabled and u.email_confirmed_at is not null) or not portal_private.has_permission(recipient,'app.'||r.app_id||'.read') or (perm='edit' and not portal_private.has_permission(recipient,'app.'||r.app_id||'.write')) then raise exception 'Recipient cannot access this app' using errcode='42501';end if;
    insert into portal_sharing.shared_members(item_id,user_id,permission) values(r.id,recipient,perm) on conflict(item_id,user_id) do update set permission=excluded.permission;
   else delete from portal_sharing.shared_members where item_id=r.id and user_id=recipient;end if;
   insert into portal_private.audit_logs(actor_id,action,target_id,details) values(uid,'share_'||p_action,recipient,jsonb_build_object('item',r.id,'app',r.app_id,'permission',p_args->>'permission'));
  end if;
  select coalesce(jsonb_agg(x),'[]'::jsonb) into result from(select m.user_id as id,p.display_name as name,u.email,m.permission,p.enabled from portal_sharing.shared_members m join portal_private.profiles p on p.user_id=m.user_id join auth.users u on u.id=m.user_id where m.item_id=r.id order by p.display_name)x;return result;
 else raise exception 'Invalid sharing operation' using errcode='22023';end if;
end $$;
revoke all on function portal_sharing.shared_action(text,jsonb) from public,anon;
grant usage on schema portal_sharing to authenticated;
grant execute on function portal_sharing.shared_action(text,jsonb) to authenticated;
create function public.portal_item_share(p_action text,p_args jsonb default '{}') returns jsonb language sql security invoker set search_path=pg_catalog as $$select portal_sharing.shared_action(p_action,p_args)$$;
revoke all on function public.portal_item_share(text,jsonb) from public,anon;
grant execute on function public.portal_item_share(text,jsonb) to authenticated;
commit;
