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
notify pgrst, 'reload schema';
