-- Project Management hybrid cloud storage. Existing local files and legacy JSON are preserved.
begin;
create table if not exists public.portal_pm_workspaces (
 user_id uuid primary key references auth.users(id) on delete cascade,
 revision uuid not null default gen_random_uuid(), updated_at timestamptz not null default now(),
 directories jsonb not null default '[]', envelope jsonb not null default '{"format":"portal-project-relational","version":1}',
 constraint pm_directories_array check(jsonb_typeof(directories)='array')
);
create table if not exists public.portal_pm_projects (
 user_id uuid not null references public.portal_pm_workspaces(user_id) on delete cascade,
 project_id text not null, name text, client text, pm text, pl text, start_date date, end_date date,
 metadata jsonb not null default '{}', state_extra jsonb not null default '{}',
 primary key(user_id,project_id)
);
create table if not exists public.portal_pm_phases (
 user_id uuid not null, project_id text not null, position integer not null check(position>=0),
 source_id text, name text, properties jsonb not null, primary key(user_id,project_id,position),
 foreign key(user_id,project_id) references public.portal_pm_projects on delete cascade
);
create table if not exists public.portal_pm_activities (
 user_id uuid not null, project_id text not null, phase_position integer not null, position integer not null check(position>=0),
 source_id text, name text, properties jsonb not null, primary key(user_id,project_id,phase_position,position),
 foreign key(user_id,project_id,phase_position) references public.portal_pm_phases on delete cascade
);
create table if not exists public.portal_pm_tasks (
 user_id uuid not null, project_id text not null, phase_position integer not null, activity_position integer not null, position integer not null check(position>=0),
 source_id text, name text, task_group text, assignee text, plan_start date, plan_end date, actual_start date, actual_end date, progress numeric,
 properties jsonb not null, primary key(user_id,project_id,phase_position,activity_position,position),
 foreign key(user_id,project_id,phase_position,activity_position) references public.portal_pm_activities on delete cascade
);
create index if not exists portal_pm_tasks_schedule on public.portal_pm_tasks(user_id,plan_start,plan_end);
create index if not exists portal_pm_tasks_progress on public.portal_pm_tasks(user_id,project_id,progress);
create table if not exists public.portal_pm_calendar (
 user_id uuid not null,project_id text not null,kind text not null check(kind in('holidays','milestones')),position integer not null,
 entry_date date,name text,properties jsonb not null,primary key(user_id,project_id,kind,position),
 foreign key(user_id,project_id) references public.portal_pm_projects on delete cascade
);
create table if not exists public.portal_pm_files (
 user_id uuid not null references public.portal_pm_workspaces(user_id) on delete cascade,path text not null,
 role text not null check(role in('meta','current','snapshot','json','blob')),project_id text,document jsonb,
 asset_hash text,asset_bytes bigint,primary key(user_id,path),
 constraint pm_asset_reference check((role='blob' and asset_hash is not null and asset_bytes is not null and asset_hash ~ '^[a-f0-9]{64}$' and asset_bytes between 0 and 104857600) or (role<>'blob' and asset_hash is null and asset_bytes is null))
);
create index if not exists portal_pm_files_project on public.portal_pm_files(user_id,project_id);
create table if not exists public.portal_pm_versions (
 user_id uuid not null,project_id text not null,path text not null,name text,author text,saved_at timestamptz,state jsonb,
 primary key(user_id,path),foreign key(user_id,path) references public.portal_pm_files on delete cascade,
 foreign key(user_id,project_id) references public.portal_pm_projects on delete cascade
);
create index if not exists portal_pm_versions_project on public.portal_pm_versions(user_id,project_id,saved_at desc);
create table if not exists public.portal_pm_backups (
 user_id uuid not null references auth.users(id) on delete cascade,revision uuid not null,saved_at timestamptz not null default now(),
 manifest jsonb not null,primary key(user_id,revision)
);
create index if not exists portal_pm_backups_recent on public.portal_pm_backups(user_id,saved_at desc);
-- Same account/app authorization as the existing portal, including disabled-account checks.
do $$declare t text;begin
 foreach t in array array['portal_pm_workspaces','portal_pm_projects','portal_pm_phases','portal_pm_activities','portal_pm_tasks','portal_pm_calendar','portal_pm_files','portal_pm_versions','portal_pm_backups'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 execute format('create policy pm_read on public.%I for select to authenticated using ((select auth.uid())=user_id and public.portal_can_access(''projects'',''read''))',t);
 execute format('create policy pm_insert on public.%I for insert to authenticated with check ((select auth.uid())=user_id and public.portal_can_access(''projects'',''write'') and public.portal_can_access(''projects'',''read''))',t);
 execute format('create policy pm_update on public.%I for update to authenticated using ((select auth.uid())=user_id and public.portal_can_access(''projects'',''write'') and public.portal_can_access(''projects'',''read'')) with check ((select auth.uid())=user_id and public.portal_can_access(''projects'',''write'') and public.portal_can_access(''projects'',''read''))',t);
 execute format('create policy pm_delete on public.%I for delete to authenticated using ((select auth.uid())=user_id and public.portal_can_access(''projects'',''write'') and public.portal_can_access(''projects'',''read''))',t);
 end loop;
end $$;
create or replace function public.portal_pm_date(value text) returns date language plpgsql immutable strict security invoker set search_path=pg_catalog as $$begin
 if value !~ '^\d{4}-\d{2}-\d{2}$' then return null;end if;return value::date;exception when invalid_datetime_format or datetime_field_overflow then return null;end $$;
create or replace function public.portal_pm_time(value text) returns timestamptz language plpgsql stable strict security invoker set search_path=pg_catalog as $$begin
 return value::timestamptz;exception when invalid_datetime_format or datetime_field_overflow then return null;end $$;
create or replace function public.portal_pm_number(value text) returns numeric language plpgsql immutable strict security invoker set search_path=pg_catalog as $$begin
 if value !~ '^-?[0-9]+(\.[0-9]+)?$' then return null;end if;return value::numeric;exception when numeric_value_out_of_range then return null;end $$;

-- Build the native WBS tree from authoritative relational rows; JSONB stores extensible properties only.
create or replace function public.portal_pm_state(p_project text) returns jsonb language sql stable security invoker set search_path=pg_catalog,public as $$
 select p.state_extra || jsonb_build_object('project',coalesce(p.state_extra->'project','{}') || jsonb_strip_nulls(jsonb_build_object('name',p.name,'client',p.client,'pm',p.pm,'pl',p.pl,'startDate',p.start_date,'endDate',p.end_date)),
 'phases',coalesce((select jsonb_agg(ph.properties || jsonb_strip_nulls(jsonb_build_object('id',ph.source_id,'name',ph.name)) || jsonb_build_object('activities',coalesce((select jsonb_agg(a.properties || jsonb_strip_nulls(jsonb_build_object('id',a.source_id,'name',a.name)) || jsonb_build_object('tasks',coalesce((select jsonb_agg(t.properties || jsonb_strip_nulls(jsonb_build_object('id',t.source_id,'name',t.name,'group',t.task_group,'assignee',t.assignee,'planStart',t.plan_start,'planEnd',t.plan_end,'actStart',t.actual_start,'actEnd',t.actual_end,'progress',t.progress)) order by t.position) from public.portal_pm_tasks t where t.user_id=p.user_id and t.project_id=p.project_id and t.phase_position=ph.position and t.activity_position=a.position),'[]')) order by a.position) from public.portal_pm_activities a where a.user_id=p.user_id and a.project_id=p.project_id and a.phase_position=ph.position),'[]')) order by ph.position) from public.portal_pm_phases ph where ph.user_id=p.user_id and ph.project_id=p.project_id),'[]'))
 || case when p.state_extra ? 'holidays' then jsonb_build_object('holidays',coalesce((select jsonb_agg(c.properties || jsonb_strip_nulls(jsonb_build_object('date',c.entry_date,'name',c.name)) order by c.position) from public.portal_pm_calendar c where c.user_id=p.user_id and c.project_id=p.project_id and c.kind='holidays'),'[]')) else '{}' end
 || case when p.state_extra ? 'milestones' then jsonb_build_object('milestones',coalesce((select jsonb_agg(c.properties || jsonb_strip_nulls(jsonb_build_object('date',c.entry_date,'name',c.name)) order by c.position) from public.portal_pm_calendar c where c.user_id=p.user_id and c.project_id=p.project_id and c.kind='milestones'),'[]')) else '{}' end
 from public.portal_pm_projects p where p.user_id=(select auth.uid()) and p.project_id=p_project
$$;
create or replace function public.portal_project_workspace_info() returns jsonb language plpgsql stable security invoker set search_path=pg_catalog,public as $$
declare r public.portal_pm_workspaces;l public.portal_workspaces;begin
 if auth.uid() is null or not public.portal_can_access('projects','read') then raise exception using errcode='42501',message='Project read permission required';end if;
 select * into r from public.portal_pm_workspaces where user_id=auth.uid();if found then return jsonb_build_object('hasWorkspace',true,'revision',r.revision,'savedAt',r.updated_at,'backend','relational');end if;
 select * into l from public.portal_workspaces where user_id=auth.uid() and app_id='projects';if found then return jsonb_build_object('hasWorkspace',true,'revision',l.revision,'savedAt',l.updated_at,'backend','legacy-json');end if;
 return jsonb_build_object('hasWorkspace',false,'revision',null,'backend','relational');end $$;
create or replace function public.portal_project_workspace_get() returns jsonb language plpgsql stable security invoker set search_path=pg_catalog,public as $$
declare r public.portal_pm_workspaces;l public.portal_workspaces;files jsonb;begin
 if auth.uid() is null or not public.portal_can_access('projects','read') then raise exception using errcode='42501',message='Project read permission required';end if;
 select * into r from public.portal_pm_workspaces where user_id=auth.uid();if not found then
 select * into l from public.portal_workspaces where user_id=auth.uid() and app_id='projects';if found then return jsonb_build_object('hasWorkspace',true,'workspace',l.payload,'revision',l.revision,'savedAt',l.updated_at,'backend','legacy-json');end if;
 return jsonb_build_object('hasWorkspace',false,'revision',null,'backend','relational');end if;
 select coalesce(jsonb_agg(case when f.role='blob' then jsonb_build_object('path',f.path,'kind','blob','hash',f.asset_hash,'bytes',f.asset_bytes) else jsonb_build_object('path',f.path,'kind','json','document',case f.role when 'meta' then p.metadata when 'current' then f.document || jsonb_build_object('current',public.portal_pm_state(f.project_id)) when 'snapshot' then f.document || case when v.state is not null then jsonb_build_object('state',v.state) else '{}' end else f.document end) end order by f.path),'[]') into files from public.portal_pm_files f left join public.portal_pm_projects p on p.user_id=f.user_id and p.project_id=f.project_id left join public.portal_pm_versions v on v.user_id=f.user_id and v.path=f.path where f.user_id=auth.uid();
 return jsonb_build_object('hasWorkspace',true,'workspace',r.envelope || jsonb_build_object('directories',r.directories,'files',files),'revision',r.revision,'savedAt',r.updated_at,'backend','relational');end $$;
create or replace function public.portal_project_workspace_save(p_workspace jsonb,p_expected uuid default null) returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare u uuid:=auth.uid();r public.portal_pm_workspaces;l public.portal_workspaces;expected uuid;nextrev uuid:=gen_random_uuid();f jsonb;doc jsonb;meta jsonb;st jsonb;ph jsonb;a jsonb;t jsonb;c jsonb;pid text;fp text;role text;pn int;an int;tn int;cn int;k text;old jsonb;begin
 if u is null or not public.portal_can_access('projects','write') or not public.portal_can_access('projects','read') then raise exception using errcode='42501',message='Project write permission required';end if;
 if p_workspace->>'format' is distinct from 'portal-project-relational' or p_workspace->>'version' is distinct from '1' or jsonb_typeof(p_workspace->'files') is distinct from 'array' or jsonb_typeof(p_workspace->'directories') is distinct from 'array' or jsonb_array_length(p_workspace->'files')>5000 or jsonb_array_length(p_workspace->'directories')>5000 or octet_length(p_workspace::text)>104857600 then raise exception using errcode='22023',message='Invalid project workspace';end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text||':project-workspace',0));
 select * into r from public.portal_pm_workspaces where user_id=u for update;
 if found then expected:=r.revision;old:=(public.portal_project_workspace_get())->'workspace';else select * into l from public.portal_workspaces where user_id=u and app_id='projects' for update;expected:=l.revision;end if;
 if expected is distinct from p_expected then raise exception using errcode='PT409',message='Project workspace changed. Reload before saving.';end if;
 if old is not null then insert into public.portal_pm_backups(user_id,revision,manifest) values(u,r.revision,old) on conflict do nothing;end if;
 perform set_config('portal.pm_bulk_write','on',true);
 insert into public.portal_pm_workspaces(user_id,revision,directories,envelope) values(u,nextrev,p_workspace->'directories',p_workspace-'files'-'directories') on conflict(user_id) do update set revision=excluded.revision,updated_at=now(),directories=excluded.directories,envelope=excluded.envelope;
 delete from public.portal_pm_files where user_id=u;delete from public.portal_pm_projects where user_id=u;
 -- Validate paths before inserting or decoding application documents.
 for f in select value from jsonb_array_elements(p_workspace->'files') loop
 fp:=f->>'path';if fp is null or length(fp)>300 or fp ~ '(^/|(^|/)[.][.]?(/|$)|//|\\)' or fp='' or fp like '%/' or f->>'kind' is null or f->>'kind' not in('json','blob') then raise exception using errcode='22023',message='Invalid project file path';end if;
 end loop;
 for fp in select jsonb_array_elements_text(p_workspace->'directories') loop
 if fp is null or fp='' or length(fp)>300 or fp ~ '(^/|(^|/)[.][.]?(/|$)|//|\\)' or fp like '%/' then raise exception using errcode='22023',message='Invalid project directory';end if;
 end loop;
 -- One project row per native current file; historical snapshots remain version records.
 for f in select value from jsonb_array_elements(p_workspace->'files') where value->>'path' ~ '^projects/[^/]+[.]json$' and value->>'path' !~ '[.]meta[.]json$' loop
 fp:=f->>'path';pid:=substring(fp from '^projects/(.*)[.]json$');doc:=f->'document';st:=doc->'current';
 if f->>'kind'<>'json' or jsonb_typeof(st) is distinct from 'object' or jsonb_typeof(st->'phases') is distinct from 'array' then raise exception using errcode='22023',message='Invalid project current data';end if;
 select value->'document' into meta from jsonb_array_elements(p_workspace->'files') where value->>'path'='projects/'||pid||'.meta.json' and value->>'kind'='json';
 if meta is null or jsonb_typeof(meta) is distinct from 'object' or meta->>'id' is distinct from pid then raise exception using errcode='22023',message='Project metadata is missing or mismatched';end if;
 insert into public.portal_pm_projects(user_id,project_id,name,client,pm,pl,start_date,end_date,metadata,state_extra) values(u,pid,st#>>'{project,name}',st#>>'{project,client}',st#>>'{project,pm}',st#>>'{project,pl}',public.portal_pm_date(st#>>'{project,startDate}'),public.portal_pm_date(st#>>'{project,endDate}'),meta,st-'phases');
 pn:=0;for ph in select value from jsonb_array_elements(st->'phases') loop
 if jsonb_typeof(ph->'activities') is distinct from 'array' then raise exception using errcode='22023',message='Invalid phase activities';end if;
 insert into public.portal_pm_phases values(u,pid,pn,ph->>'id',ph->>'name',ph-'activities');an:=0;
 for a in select value from jsonb_array_elements(ph->'activities') loop
 if jsonb_typeof(a->'tasks') is distinct from 'array' then raise exception using errcode='22023',message='Invalid activity tasks';end if;
 insert into public.portal_pm_activities values(u,pid,pn,an,a->>'id',a->>'name',a-'tasks');tn:=0;
 for t in select value from jsonb_array_elements(a->'tasks') loop
 insert into public.portal_pm_tasks values(u,pid,pn,an,tn,t->>'id',t->>'name',t->>'group',t->>'assignee',public.portal_pm_date(t->>'planStart'),public.portal_pm_date(t->>'planEnd'),public.portal_pm_date(t->>'actStart'),public.portal_pm_date(t->>'actEnd'),public.portal_pm_number(t->>'progress'),t);tn:=tn+1;
 end loop;an:=an+1;end loop;pn:=pn+1;end loop;
 foreach k in array array['holidays','milestones'] loop cn:=0;for c in select value from jsonb_array_elements(coalesce(st->k,'[]')) loop insert into public.portal_pm_calendar values(u,pid,k,cn,public.portal_pm_date(c->>'date'),c->>'name',c);cn:=cn+1;end loop;end loop;
 end loop;
 for f in select value from jsonb_array_elements(p_workspace->'files') loop
 fp:=f->>'path';doc:=f->'document';pid:=substring(fp from '^projects/([^/]+?)(?:[.]meta[.]json|[.]json|/)');role:=case when f->>'kind'='blob' then 'blob' when fp ~ '^projects/[^/]+[.]meta[.]json$' then 'meta' when fp ~ '^projects/[^/]+[.]json$' then 'current' when fp ~ '^projects/[^/]+/snapshots/[^/]+[.]json$' and doc->>'format'='wbs-snapshot' then 'snapshot' else 'json' end;
 if role in('meta','current','snapshot') and not exists(select 1 from public.portal_pm_projects where user_id=u and project_id=pid) then raise exception using errcode='22023',message='Project reference is missing';end if;
 insert into public.portal_pm_files(user_id,path,role,project_id,document,asset_hash,asset_bytes) values(u,fp,role,pid,case role when 'meta' then null when 'current' then doc-'current' when 'snapshot' then doc-'state' else doc end,f->>'hash',(f->>'bytes')::bigint);
 if role='snapshot' then insert into public.portal_pm_versions values(u,pid,fp,doc->>'name',doc->>'author',public.portal_pm_time(doc->>'savedAt'),doc->'state');end if;
 end loop;
 if exists(select 1 from public.portal_pm_files f cross join jsonb_array_elements_text(p_workspace->'directories') d where f.user_id=u and (d.value=f.path or left(d.value,length(f.path)+1)=f.path||'/')) then raise exception using errcode='22023',message='File/directory collision';end if;
 if exists(select 1 from public.portal_pm_files f where f.user_id=u and exists(select 1 from public.portal_pm_files c where c.user_id=u and left(c.path,length(f.path)+1)=f.path||'/')) then raise exception using errcode='22023',message='File/directory collision';end if;
 delete from public.portal_pm_backups where user_id=u and revision in(select revision from public.portal_pm_backups where user_id=u order by saved_at desc,revision offset 10);
 perform set_config('portal.pm_bulk_write','off',true);
 return jsonb_build_object('hasWorkspace',true,'revision',nextrev,'savedAt',now(),'backend','relational');end $$;

-- Individual row edits also advance the workspace revision; bulk RPC writes advance it once.
create or replace function public.portal_pm_touch() returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
 if coalesce(current_setting('portal.pm_bulk_write',true),'off')<>'on' then
 update public.portal_pm_workspaces set revision=gen_random_uuid(),updated_at=now() where user_id=case when tg_op='DELETE' then old.user_id else new.user_id end;
 end if;return null;end $$;
do $$declare t text;begin foreach t in array array['portal_pm_projects','portal_pm_phases','portal_pm_activities','portal_pm_tasks','portal_pm_calendar','portal_pm_files','portal_pm_versions'] loop
 execute format('create trigger pm_touch after insert or update or delete on public.%I for each row execute function public.portal_pm_touch()',t);end loop;end $$;
revoke all on function public.portal_pm_touch() from public,anon;
grant execute on function public.portal_pm_touch() to authenticated;

-- Prevent stale clients from overwriting the legacy snapshot after relational cutover.
create or replace function public.portal_pm_legacy_guard() returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$begin
 if new.app_id='projects' then
 perform pg_advisory_xact_lock(hashtextextended(new.user_id::text||':project-workspace',0));
 if exists(select 1 from public.portal_pm_workspaces where user_id=new.user_id) then raise exception using errcode='PT409',message='Project storage upgraded. Refresh the portal before saving.';end if;end if;return new;end $$;
create trigger portal_pm_legacy_guard before insert or update on public.portal_workspaces for each row execute function public.portal_pm_legacy_guard();
create or replace function public.portal_workspace_save(p_app text,p_workspace jsonb,p_expected uuid default null)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare r public.portal_workspaces;
begin
 if auth.uid() is null then raise exception using errcode='42501',message='Authentication required'; end if;
 if p_app not in ('markdown','insight','projects') or p_app is null or p_workspace is null or jsonb_typeof(p_workspace)<>'object' then raise exception using errcode='22023',message='Invalid workspace'; end if;
 if octet_length(p_workspace::text)>104857600 then raise exception using errcode='22023',message='Workspace exceeds 100 MB'; end if;
 if p_app='projects' then
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':project-workspace',0));
 if exists(select 1 from public.portal_pm_workspaces where user_id=auth.uid()) then raise exception using errcode='PT409',message='Project storage upgraded. Refresh before saving.';end if;end if;
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
-- Immutable assets are stored by account/content hash. No public bucket, overwrite or delete grant.
create policy portal_pm_assets_read on storage.objects for select to authenticated using(bucket_id='portal-project-assets' and split_part(name,'/',1)=(select auth.uid())::text and public.portal_can_access('projects','read'));
create policy portal_pm_assets_insert on storage.objects for insert to authenticated with check(bucket_id='portal-project-assets' and name ~ ('^'||(select auth.uid())::text||'/[a-f0-9]{64}$') and public.portal_can_access('projects','write'));
revoke all on function public.portal_pm_date(text),public.portal_pm_time(text),public.portal_pm_number(text),public.portal_pm_state(text),public.portal_project_workspace_info(),public.portal_project_workspace_get(),public.portal_project_workspace_save(jsonb,uuid),public.portal_pm_legacy_guard() from public,anon;
grant execute on function public.portal_pm_date(text),public.portal_pm_time(text),public.portal_pm_number(text),public.portal_pm_state(text),public.portal_project_workspace_info(),public.portal_project_workspace_get(),public.portal_project_workspace_save(jsonb,uuid),public.portal_pm_legacy_guard() to authenticated;
notify pgrst,'reload schema';
commit;
