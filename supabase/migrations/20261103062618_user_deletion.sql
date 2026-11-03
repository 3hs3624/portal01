begin;
create table if not exists portal_private.user_deletions(
 id uuid primary key default gen_random_uuid(),actor_id uuid not null,user_id uuid not null,email text not null,
 status text not null default 'pending' check(status in('pending','completed','failed')),
 details jsonb not null default '{}',created_at timestamptz not null default now(),finished_at timestamptz
);
alter table portal_private.user_deletions enable row level security;
revoke all on portal_private.user_deletions from public,anon,authenticated;
create unique index if not exists portal_user_delete_pending on portal_private.user_deletions(user_id) where status='pending';
create or replace function portal_private.user_delete_check(p_actor uuid,p_user uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,portal_private as $$
declare account_email text;display text;workspaces int;storage_count int;
begin
 if p_actor is null or not portal_private.has_permission(p_actor,'system.access') or not portal_private.has_permission(p_actor,'system.users.manage') then raise exception using errcode='42501',message='Administrator permission required';end if;
 if p_actor=p_user then raise exception using errcode='PT409',message='현재 로그인한 본인 계정은 삭제할 수 없습니다.';end if;
 select u.email,p.display_name into account_email,display from auth.users u join portal_private.profiles p on p.user_id=u.id where u.id=p_user;
 if not found then raise exception using errcode='PT404',message='사용자를 찾지 못했습니다.';end if;
 if exists(select 1 from portal_private.role_permissions rp where (exists(select 1 from portal_private.user_roles ur where ur.user_id=p_user and ur.role_id=rp.role_id) or exists(select 1 from portal_private.group_members gm join portal_private.group_roles gr on gr.group_id=gm.group_id where gm.user_id=p_user and gr.role_id=rp.role_id)) and not portal_private.has_permission(p_actor,rp.permission)) then raise exception using errcode='42501',message='본인보다 높은 권한의 사용자는 삭제할 수 없습니다.';end if;
 if exists(select 1 from portal_private.user_roles ur join portal_private.roles r on r.id=ur.role_id join portal_private.profiles p on p.user_id=ur.user_id where ur.user_id=p_user and r.code='system_admin' and p.enabled)
 and (select count(*) from portal_private.profiles p where p.enabled and exists(select 1 from portal_private.user_roles ur join portal_private.roles r on r.id=ur.role_id where ur.user_id=p.user_id and r.code='system_admin'))<=1 then raise exception using errcode='PT409',message='마지막 활성 시스템 관리자는 삭제할 수 없습니다.';end if;
 select count(*) into workspaces from public.portal_workspaces where user_id=p_user;
 select count(*) into storage_count from storage.objects o where o.owner_id=p_user::text or o.owner=p_user;
 if storage_count>0 then raise exception using errcode='PT409',message='소유한 Storage 파일을 먼저 이전하거나 정리해야 합니다.';end if;
 return jsonb_build_object('id',p_user,'email',account_email,'display_name',display,'workspace_count',workspaces);
end $$;
revoke all on function portal_private.user_delete_check(uuid,uuid) from public,anon,authenticated;
create or replace function public.portal_user_delete_preview(p_actor uuid,p_user uuid) returns jsonb
language sql security definer set search_path=pg_catalog,portal_private as $$select portal_private.user_delete_check(p_actor,p_user)$$;
create or replace function public.portal_user_delete_reserve(p_actor uuid,p_user uuid,p_email text) returns jsonb
language plpgsql security definer set search_path=pg_catalog,portal_private as $$
declare summary jsonb;ticket uuid;
begin
 perform pg_advisory_xact_lock(81234001);
 summary:=portal_private.user_delete_check(p_actor,p_user);
 if p_email is null or lower(trim(p_email))<>lower(summary->>'email') then raise exception using errcode='22023',message='확인 이메일이 일치하지 않습니다.';end if;
 if exists(select 1 from portal_private.user_deletions where user_id=p_user and status='pending') then raise exception using errcode='PT409',message='삭제가 이미 진행 중입니다. 목록을 새로고침해 주세요.';end if;
 insert into portal_private.user_deletions(actor_id,user_id,email,details) values(p_actor,p_user,summary->>'email',summary) returning id into ticket;
 -- Revoke portal access before calling Auth; failed deletion remains suspended.
 update portal_private.profiles set enabled=false where user_id=p_user;
 insert into portal_private.audit_logs(actor_id,action,target_id,details) values(p_actor,'user_delete_requested',p_user,summary||jsonb_build_object('request_id',ticket));
 return jsonb_build_object('id',ticket);
end $$;
create or replace function portal_private.prevent_deleting_user_reactivation() returns trigger
language plpgsql security definer set search_path=pg_catalog,portal_private as $$
begin
 perform pg_advisory_xact_lock(81234001);
 if new.enabled and exists(select 1 from portal_private.user_deletions where user_id=new.user_id and status='pending') then raise exception using errcode='PT409',message='삭제 진행 중인 사용자는 재활성화할 수 없습니다.';end if;
 return new;
end $$;
revoke all on function portal_private.prevent_deleting_user_reactivation() from public,anon,authenticated;
drop trigger if exists portal_user_delete_guard on portal_private.profiles;
create trigger portal_user_delete_guard before update of enabled on portal_private.profiles for each row execute function portal_private.prevent_deleting_user_reactivation();
create or replace function public.portal_user_delete_finish(p_id uuid,p_success boolean) returns jsonb
language plpgsql security definer set search_path=pg_catalog,portal_private as $$
declare request portal_private.user_deletions%rowtype;
begin
 perform pg_advisory_xact_lock(81234001);
 select * into request from portal_private.user_deletions where id=p_id for update;
 if not found or request.status<>'pending' then raise exception 'Deletion is not pending';end if;
 if p_success is null or p_success and exists(select 1 from auth.users where id=request.user_id) then raise exception 'Auth deletion has not completed';end if;
 update portal_private.user_deletions set status=case when p_success then 'completed' else 'failed' end,finished_at=now() where id=p_id;
 insert into portal_private.audit_logs(actor_id,action,target_id,details) values(request.actor_id,case when p_success then 'user_delete_completed' else 'user_delete_failed' end,request.user_id,request.details||jsonb_build_object('request_id',p_id));
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.portal_user_delete_preview(uuid,uuid) from public,anon,authenticated;
revoke all on function public.portal_user_delete_reserve(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.portal_user_delete_finish(uuid,boolean) from public,anon,authenticated;
grant execute on function public.portal_user_delete_preview(uuid,uuid) to service_role;
grant execute on function public.portal_user_delete_reserve(uuid,uuid,text) to service_role;
grant execute on function public.portal_user_delete_finish(uuid,boolean) to service_role;
notify pgrst,'reload schema';
commit;
