-- 3HS Portal: run once in the Supabase project's SQL Editor.
-- Contains no credentials. Existing application data is not imported or deleted.
begin;
create table if not exists public.portal_workspaces (
  user_id uuid not null references auth.users(id) on delete cascade,
  app_id text not null check (app_id in ('markdown','insight','projects')),
  payload jsonb not null check (jsonb_typeof(payload)='object'),
  revision uuid not null default gen_random_uuid(),
  updated_at timestamptz not null default now(),
  primary key (user_id,app_id),
  constraint portal_workspace_size check (octet_length(payload::text)<=10485760)
);
alter table public.portal_workspaces enable row level security;
revoke all on public.portal_workspaces from public,anon,authenticated;
grant select,insert,update on public.portal_workspaces to authenticated;
drop policy if exists portal_workspace_select on public.portal_workspaces;
create policy portal_workspace_select on public.portal_workspaces for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists portal_workspace_insert on public.portal_workspaces;
create policy portal_workspace_insert on public.portal_workspaces for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists portal_workspace_update on public.portal_workspaces;
create policy portal_workspace_update on public.portal_workspaces for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

create or replace function public.portal_workspace_get(p_app text)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare r public.portal_workspaces;
begin
 if auth.uid() is null then raise exception using errcode='42501',message='Authentication required'; end if;
 if p_app not in ('markdown','insight','projects') or p_app is null then raise exception using errcode='22023',message='Invalid application'; end if;
 select * into r from public.portal_workspaces where user_id=auth.uid() and app_id=p_app;
 if not found then return jsonb_build_object('hasWorkspace',false,'revision',null); end if;
 return jsonb_build_object('hasWorkspace',true,'workspace',r.payload,'revision',r.revision,'savedAt',r.updated_at);
end $$;

create or replace function public.portal_workspace_save(p_app text,p_workspace jsonb,p_expected uuid default null)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare r public.portal_workspaces;
begin
 if auth.uid() is null then raise exception using errcode='42501',message='Authentication required'; end if;
 if p_app not in ('markdown','insight','projects') or p_app is null or p_workspace is null or jsonb_typeof(p_workspace)<>'object' then raise exception using errcode='22023',message='Invalid workspace'; end if;
 if octet_length(p_workspace::text)>10485760 then raise exception using errcode='22023',message='Workspace exceeds 10 MB'; end if;
 if p_expected is null then
  insert into public.portal_workspaces(user_id,app_id,payload) values(auth.uid(),p_app,p_workspace)
  on conflict(user_id,app_id) do nothing returning * into r;
 else
  update public.portal_workspaces set payload=p_workspace,revision=gen_random_uuid(),updated_at=now()
  where user_id=auth.uid() and app_id=p_app and revision=p_expected returning * into r;
 end if;
 if not found then raise exception using errcode='PT409',message='Workspace changed on another device. Reload before saving.'; end if;
 return jsonb_build_object('hasWorkspace',true,'revision',r.revision,'savedAt',r.updated_at);
end $$;
revoke all on function public.portal_workspace_get(text) from public,anon;
revoke all on function public.portal_workspace_save(text,jsonb,uuid) from public,anon;
grant execute on function public.portal_workspace_get(text) to authenticated;
grant execute on function public.portal_workspace_save(text,jsonb,uuid) to authenticated;
-- Enforce portal status and application permissions on existing cloud workspace data.
do $$begin
 if to_regclass('public.portal_workspaces') is not null and to_regprocedure('public.portal_can_access(text,text)') is not null then
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
