-- Existing Supabase projects: increase each app workspace to 100 MiB.
-- Run as postgres in SQL Editor. Existing payloads, revisions and policies are preserved.
begin;
alter table public.portal_workspaces drop constraint if exists portal_workspace_size;
alter table public.portal_workspaces add constraint portal_workspace_size
 check (octet_length(payload::text)<=104857600);

create or replace function public.portal_workspace_save(p_app text,p_workspace jsonb,p_expected uuid default null)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare r public.portal_workspaces;
begin
 if auth.uid() is null then raise exception using errcode='42501',message='Authentication required'; end if;
 if p_app not in ('markdown','insight','projects') or p_app is null or p_workspace is null or jsonb_typeof(p_workspace)<>'object' then raise exception using errcode='22023',message='Invalid workspace'; end if;
 if octet_length(p_workspace::text)>104857600 then raise exception using errcode='22023',message='Workspace exceeds 100 MB'; end if;
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
revoke all on function public.portal_workspace_save(text,jsonb,uuid) from public,anon;
grant execute on function public.portal_workspace_save(text,jsonb,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
