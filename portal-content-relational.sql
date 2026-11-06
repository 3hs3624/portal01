-- Relational cloud storage for Write Studio and Insight BI. Local formats remain unchanged.
begin;
create table public.portal_content_workspaces(
 user_id uuid not null references auth.users(id) on delete cascade,app_id text not null check(app_id in('markdown','insight')),
 revision uuid not null default gen_random_uuid(),updated_at timestamptz not null default now(),envelope jsonb not null,primary key(user_id,app_id)
);
create table public.portal_content_backups(
 user_id uuid not null references auth.users(id) on delete cascade,app_id text not null check(app_id in('markdown','insight')),revision uuid not null,saved_at timestamptz not null default now(),payload jsonb not null,primary key(user_id,app_id,revision)
);
create index portal_content_backups_recent on public.portal_content_backups(user_id,app_id,saved_at desc);
create table public.portal_ws_folders(
 user_id uuid not null references auth.users(id) on delete cascade,folder_id text not null,position integer not null,name text not null check(btrim(name)<>'' and length(name)<=80),parent_id text,properties jsonb not null,
 primary key(user_id,folder_id),foreign key(user_id,parent_id) references public.portal_ws_folders(user_id,folder_id) deferrable initially deferred
);
create table public.portal_ws_documents(
 user_id uuid not null references auth.users(id) on delete cascade,document_id text not null,position integer not null,title text not null check(btrim(title)<>'' and length(title)<=200),content text not null check(octet_length(content)<=5242880),folder_id text,created_at text not null,updated_at text not null,properties jsonb not null,
 primary key(user_id,document_id),foreign key(user_id,folder_id) references public.portal_ws_folders deferrable initially deferred
);
create table public.portal_ws_tags(
 user_id uuid not null,document_id text not null,position integer not null,tag text not null check(btrim(tag)<>'' and length(tag)<=40),primary key(user_id,document_id,position),foreign key(user_id,document_id) references public.portal_ws_documents on delete cascade
);
create table public.portal_ws_comments(
 user_id uuid not null,document_id text not null,position integer not null,comment_id text not null,author text,body text not null check(btrim(body)<>'' and length(body)<=5000),posted_at text not null,properties jsonb not null,primary key(user_id,document_id,position),foreign key(user_id,document_id) references public.portal_ws_documents on delete cascade
);
create table public.portal_bi_dashboards(
 user_id uuid not null references auth.users(id) on delete cascade,dashboard_id text not null,position integer not null,name text not null,updated_at text,properties jsonb not null,primary key(user_id,dashboard_id)
);
create table public.portal_bi_cards(
 user_id uuid not null,dashboard_id text not null,position integer not null,configuration jsonb not null,primary key(user_id,dashboard_id,position),foreign key(user_id,dashboard_id) references public.portal_bi_dashboards on delete cascade
);
create table public.portal_bi_sources(
 user_id uuid not null references auth.users(id) on delete cascade,source_id text not null,detached boolean not null,position integer not null,name text not null,connected_at text,properties jsonb not null,primary key(user_id,source_id)
);
create table public.portal_bi_sheets(
 user_id uuid not null,source_id text not null,sheet_name text not null,properties jsonb not null,primary key(user_id,source_id,sheet_name),foreign key(user_id,source_id) references public.portal_bi_sources on delete cascade
);
create table public.portal_bi_columns(
 user_id uuid not null,source_id text not null,sheet_name text not null,position integer not null,name text not null,primary key(user_id,source_id,sheet_name,position),foreign key(user_id,source_id,sheet_name) references public.portal_bi_sheets on delete cascade
);
create table public.portal_bi_rows(
 user_id uuid not null,source_id text not null,sheet_name text not null,position integer not null,"values" jsonb not null check(jsonb_typeof("values")='array'),primary key(user_id,source_id,sheet_name,position),foreign key(user_id,source_id,sheet_name) references public.portal_bi_sheets on delete cascade
);
create table public.portal_bi_links(
 user_id uuid not null,source_id text not null,sheet_name text not null,position integer not null,link_key text not null,name text not null,primary key(user_id,source_id,sheet_name,position),foreign key(user_id,source_id) references public.portal_bi_sources on delete cascade
);
create unique index portal_ws_folder_names on public.portal_ws_folders(user_id,coalesce(parent_id,''),btrim(name));
create index portal_ws_document_folder on public.portal_ws_documents(user_id,folder_id);
create index portal_ws_document_updated on public.portal_ws_documents(user_id,updated_at desc);
create index portal_ws_tags_search on public.portal_ws_tags(user_id,tag);
do $$declare t text;a text;expr text;write_expr text;begin
 foreach t in array array['portal_content_workspaces','portal_content_backups','portal_ws_folders','portal_ws_documents','portal_ws_tags','portal_ws_comments','portal_bi_dashboards','portal_bi_cards','portal_bi_sources','portal_bi_sheets','portal_bi_columns','portal_bi_rows','portal_bi_links'] loop
 a:=case when t like 'portal_ws_%' then quote_literal('markdown') when t like 'portal_bi_%' then quote_literal('insight') else 'app_id' end;
 expr:='(select auth.uid())=user_id and '||case when a='app_id' then 'public.portal_can_access(app_id,''read'')' else '(select public.portal_can_access('||a||',''read''))' end;
 write_expr:=expr||' and '||case when a='app_id' then 'public.portal_can_access(app_id,''write'')' else '(select public.portal_can_access('||a||',''write''))' end;
 execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from public,anon,authenticated',t);execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 execute format('create policy content_read on public.%I for select to authenticated using (%s)',t,expr);
 execute format('create policy content_insert on public.%I for insert to authenticated with check (%s)',t,write_expr);
 execute format('create policy content_update on public.%I for update to authenticated using (%s) with check (%s)',t,write_expr,write_expr);
 execute format('create policy content_delete on public.%I for delete to authenticated using (%s)',t,write_expr);
 end loop;end $$;
create or replace function public.portal_content_workspace_info(p_app text) returns jsonb language plpgsql stable security invoker set search_path=pg_catalog,public as $$
declare r public.portal_content_workspaces;l public.portal_workspaces;begin
 if p_app is null or p_app not in('markdown','insight') then raise exception using errcode='22023',message='Invalid content application';end if;
 if auth.uid() is null or not public.portal_can_access(p_app,'read') then raise exception using errcode='42501',message='Application read permission required';end if;
 select * into r from public.portal_content_workspaces where user_id=auth.uid() and app_id=p_app;
 if found then return jsonb_build_object('hasWorkspace',true,'revision',r.revision,'savedAt',r.updated_at,'backend','relational');end if;
 select * into l from public.portal_workspaces where user_id=auth.uid() and app_id=p_app;
 if found then return jsonb_build_object('hasWorkspace',true,'revision',l.revision,'savedAt',l.updated_at,'backend','legacy-json');end if;
 return jsonb_build_object('hasWorkspace',false,'revision',null,'backend','relational');end $$;
create or replace function public.portal_bi_source(p_id text) returns jsonb language sql stable security invoker set search_path=pg_catalog,public as $$
 select s.properties||jsonb_strip_nulls(jsonb_build_object('id',s.source_id,'name',s.name,'connectedAt',s.connected_at))||jsonb_build_object('sheets',coalesce((select jsonb_object_agg(sh.sheet_name,sh.properties||jsonb_build_object('columns',coalesce((select jsonb_agg(c.name order by c.position) from public.portal_bi_columns c where c.user_id=sh.user_id and c.source_id=sh.source_id and c.sheet_name=sh.sheet_name),'[]'),'rows',coalesce((select jsonb_agg(r.values order by r.position) from public.portal_bi_rows r where r.user_id=sh.user_id and r.source_id=sh.source_id and r.sheet_name=sh.sheet_name),'[]'))) from public.portal_bi_sheets sh where sh.user_id=s.user_id and sh.source_id=s.source_id),'{}'))
 ||case when s.properties?'links' or exists(select 1 from public.portal_bi_links l where l.user_id=s.user_id and l.source_id=s.source_id) then jsonb_build_object('links',coalesce(s.properties->'links','{}')||coalesce((select jsonb_object_agg(x.sheet_name,x.entries) from (select l.sheet_name,jsonb_agg(jsonb_build_array(l.link_key,l.name) order by l.position) entries from public.portal_bi_links l where l.user_id=s.user_id and l.source_id=s.source_id group by l.sheet_name)x),'{}')) else '{}' end
 from public.portal_bi_sources s where s.user_id=(select auth.uid()) and s.source_id=p_id
$$;
create or replace function public.portal_content_workspace_get(p_app text) returns jsonb language plpgsql stable security invoker set search_path=pg_catalog,public as $$
declare r public.portal_content_workspaces;l public.portal_workspaces;w jsonb;docs jsonb;folders jsonb;begin
 perform public.portal_content_workspace_info(p_app);
 select * into r from public.portal_content_workspaces where user_id=auth.uid() and app_id=p_app;
 if not found then select * into l from public.portal_workspaces where user_id=auth.uid() and app_id=p_app;
 if found then return jsonb_build_object('hasWorkspace',true,'revision',l.revision,'savedAt',l.updated_at,'workspace',l.payload,'backend','legacy-json');end if;
 return jsonb_build_object('hasWorkspace',false,'revision',null,'backend','relational');end if;
 if p_app='markdown' then
 select coalesce(jsonb_agg(d.properties||jsonb_build_object('id',d.document_id,'title',d.title,'content',d.content,'createdAt',d.created_at,'updatedAt',d.updated_at)||jsonb_strip_nulls(jsonb_build_object('folderId',d.folder_id))
 ||case when d.properties?'tags' or exists(select 1 from public.portal_ws_tags t where t.user_id=d.user_id and t.document_id=d.document_id) then jsonb_build_object('tags',coalesce((select jsonb_agg(t.tag order by t.position) from public.portal_ws_tags t where t.user_id=d.user_id and t.document_id=d.document_id),'[]')) else '{}' end
 ||case when d.properties?'pageComments' or exists(select 1 from public.portal_ws_comments c where c.user_id=d.user_id and c.document_id=d.document_id) then jsonb_build_object('pageComments',coalesce((select jsonb_agg(c.properties||jsonb_build_object('id',c.comment_id,'text',c.body,'date',c.posted_at)||jsonb_strip_nulls(jsonb_build_object('author',c.author)) order by c.position) from public.portal_ws_comments c where c.user_id=d.user_id and c.document_id=d.document_id),'[]')) else '{}' end order by d.position),'[]') into docs from public.portal_ws_documents d where d.user_id=auth.uid();
 select coalesce(jsonb_agg(f.properties||jsonb_build_object('id',f.folder_id,'name',f.name)||jsonb_strip_nulls(jsonb_build_object('parentId',f.parent_id)) order by f.position),'[]') into folders from public.portal_ws_folders f where f.user_id=auth.uid();
 w:=r.envelope||jsonb_build_object('documents',docs)||case when r.envelope?'folders' or jsonb_array_length(folders)>0 then jsonb_build_object('folders',folders) else '{}' end;
 else
 w:=r.envelope||jsonb_build_object('dashboards',coalesce((select jsonb_agg(d.properties||jsonb_build_object('id',d.dashboard_id,'name',d.name)||jsonb_strip_nulls(jsonb_build_object('updatedAt',d.updated_at))||jsonb_build_object('board',coalesce((select jsonb_agg(c.configuration order by c.position) from public.portal_bi_cards c where c.user_id=d.user_id and c.dashboard_id=d.dashboard_id),'[]')) order by d.position) from public.portal_bi_dashboards d where d.user_id=auth.uid()),'[]'),
 'sources',coalesce((select jsonb_agg(public.portal_bi_source(s.source_id) order by s.position) from public.portal_bi_sources s where s.user_id=auth.uid() and not s.detached),'[]'),
 'detached',coalesce((select jsonb_agg(public.portal_bi_source(s.source_id) order by s.position) from public.portal_bi_sources s where s.user_id=auth.uid() and s.detached),'[]'));
 end if;
 return jsonb_build_object('hasWorkspace',true,'workspace',w,'revision',r.revision,'savedAt',r.updated_at,'backend','relational');end $$;
create or replace function public.portal_content_workspace_save(p_app text,p_workspace jsonb,p_expected uuid default null) returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare u uuid:=auth.uid();head public.portal_content_workspaces;l public.portal_workspaces;prior uuid;rev uuid:=gen_random_uuid();old jsonb;env jsonb;f jsonb;d jsonb;s jsonb;sh record;ln record;key text;props jsonb;pos int;sid text;begin
 if p_app is null or p_app not in('markdown','insight') then raise exception using errcode='22023',message='Invalid content application';end if;
 if u is null or not public.portal_can_access(p_app,'read') or not public.portal_can_access(p_app,'write') then raise exception using errcode='42501',message='Application write permission required';end if;
 if p_workspace is null or jsonb_typeof(p_workspace)<>'object' or octet_length(p_workspace::text)>104857600 or p_workspace->>'version' is distinct from '1' then raise exception using errcode='22023',message='Invalid content workspace';end if;
 if p_app='markdown' and (p_workspace->>'format' is distinct from 'md-editor-workspace' or jsonb_typeof(p_workspace->'documents') is distinct from 'array' or jsonb_array_length(p_workspace->'documents') not between 1 and 500 or jsonb_typeof(coalesce(p_workspace->'folders','[]'))<>'array' or jsonb_array_length(coalesce(p_workspace->'folders','[]'))>200) then raise exception using errcode='22023',message='Invalid document workspace';end if;
 if p_app='insight' and (p_workspace->>'format' is distinct from 'insight-bi-workspace' or jsonb_typeof(p_workspace->'dashboards') is distinct from 'array' or jsonb_array_length(p_workspace->'dashboards')>40 or jsonb_typeof(p_workspace->'sources') is distinct from 'array' or jsonb_typeof(p_workspace->'detached') is distinct from 'array') then raise exception using errcode='22023',message='Invalid BI workspace';end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text||':'||p_app||'-workspace',0));
 select * into head from public.portal_content_workspaces where user_id=u and app_id=p_app for update;
 if found then prior:=head.revision;old:=(public.portal_content_workspace_get(p_app))->'workspace';else select * into l from public.portal_workspaces where user_id=u and app_id=p_app for update;prior:=l.revision;end if;
 if prior is distinct from p_expected then raise exception using errcode='PT409',message='Workspace changed. Reload before saving.';end if;
 if old is not null then insert into public.portal_content_backups(user_id,app_id,revision,payload) values(u,p_app,prior,old) on conflict do nothing;end if;
 perform set_config('portal.content_bulk_write','on',true);
 if p_app='markdown' then env:=p_workspace-'documents';if env?'folders' then env:=jsonb_set(env,'{folders}','[]');end if;else env:=p_workspace-'dashboards'-'sources'-'detached';end if;
 insert into public.portal_content_workspaces(user_id,app_id,revision,envelope) values(u,p_app,rev,env) on conflict(user_id,app_id) do update set revision=excluded.revision,updated_at=now(),envelope=excluded.envelope;
 if p_app='markdown' then
 delete from public.portal_ws_documents where user_id=u;delete from public.portal_ws_folders where user_id=u;
 pos:=0;for f in select value from jsonb_array_elements(coalesce(p_workspace->'folders','[]')) loop
 if jsonb_typeof(f->'id') is distinct from 'string' or f->>'id'='' or jsonb_typeof(f->'name') is distinct from 'string' or f?'parentId' and jsonb_typeof(f->'parentId')<>'string' then raise exception using errcode='22023',message='Invalid folder';end if;
 insert into public.portal_ws_folders values(u,f->>'id',pos,f->>'name',nullif(f->>'parentId',''),f-'id'-'name');pos:=pos+1;end loop;
 if exists(with recursive walk as(select folder_id,parent_id,array[folder_id] path,false cycle,1 depth from public.portal_ws_folders where user_id=u union all select f.folder_id,f.parent_id,w.path||f.folder_id,f.folder_id=any(w.path),w.depth+1 from walk w join public.portal_ws_folders f on f.user_id=u and f.folder_id=w.parent_id where not w.cycle and w.depth<=20)select 1 from walk where cycle or depth>20) then raise exception using errcode='22023',message='Folder cycle or depth exceeded';end if;
 if exists(select 1 from public.portal_ws_folders f where f.user_id=u and f.parent_id is not null and not exists(select 1 from public.portal_ws_folders p where p.user_id=u and p.folder_id=f.parent_id)) then raise exception using errcode='22023',message='Folder parent is missing';end if;
 pos:=0;for d in select value from jsonb_array_elements(p_workspace->'documents') loop
 if jsonb_typeof(d->'id') is distinct from 'string' or d->>'id'='' or jsonb_typeof(d->'title') is distinct from 'string' or jsonb_typeof(d->'content') is distinct from 'string' or jsonb_typeof(d->'createdAt') is distinct from 'string' or jsonb_typeof(d->'updatedAt') is distinct from 'string' or d?'folderId' and jsonb_typeof(d->'folderId')<>'string' then raise exception using errcode='22023',message='Invalid document';end if;
 props:=d-'id'-'title'-'content'-'createdAt'-'updatedAt';if d?'tags' then props:=jsonb_set(props,'{tags}','[]');end if;if d?'pageComments' then props:=jsonb_set(props,'{pageComments}','[]');end if;
 insert into public.portal_ws_documents values(u,d->>'id',pos,d->>'title',d->>'content',nullif(d->>'folderId',''),d->>'createdAt',d->>'updatedAt',props);pos:=pos+1;
 if d?'tags' then
 if jsonb_typeof(d->'tags')<>'array' or jsonb_array_length(d->'tags')>20 or exists(select 1 from jsonb_array_elements(d->'tags')x where jsonb_typeof(x)<>'string') then raise exception using errcode='22023',message='Invalid document tags';end if;
 insert into public.portal_ws_tags select u,d->>'id',ordinality-1,value#>>'{}' from jsonb_array_elements(d->'tags') with ordinality;
 end if;
 if d?'pageComments' then
 if jsonb_typeof(d->'pageComments')<>'array' or jsonb_array_length(d->'pageComments')>100 or exists(select 1 from jsonb_array_elements(d->'pageComments')c where jsonb_typeof(c->'id') is distinct from 'string' or jsonb_typeof(c->'text') is distinct from 'string' or jsonb_typeof(c->'date') is distinct from 'string') then raise exception using errcode='22023',message='Invalid document comments';end if;
 insert into public.portal_ws_comments select u,d->>'id',ordinality-1,value->>'id',case when jsonb_typeof(value->'author')='string' then value->>'author' end,value->>'text',value->>'date',value-'id'-'text'-'date' from jsonb_array_elements(d->'pageComments') with ordinality;
 end if;end loop;
 if not exists(select 1 from public.portal_ws_documents where user_id=u and document_id=p_workspace->>'activeId') then raise exception using errcode='22023',message='Active document is missing';end if;
 else
 delete from public.portal_bi_dashboards where user_id=u;delete from public.portal_bi_sources where user_id=u;
 pos:=0;for d in select value from jsonb_array_elements(p_workspace->'dashboards') loop
 if jsonb_typeof(d->'id') is distinct from 'string' or jsonb_typeof(d->'name') is distinct from 'string' or jsonb_typeof(d->'board') is distinct from 'array' or jsonb_array_length(d->'board')>20 then raise exception using errcode='22023',message='Invalid dashboard';end if;
 insert into public.portal_bi_dashboards values(u,d->>'id',pos,d->>'name',case when jsonb_typeof(d->'updatedAt')='string' then d->>'updatedAt' end,d-'id'-'name'-'board');pos:=pos+1;
 insert into public.portal_bi_cards select u,d->>'id',ordinality-1,value from jsonb_array_elements(d->'board') with ordinality;
 end loop;
 foreach key in array array['sources','detached'] loop pos:=0;
 for s in select value from jsonb_array_elements(p_workspace->key) loop
 if jsonb_typeof(s->'id') is distinct from 'string' or jsonb_typeof(s->'name') is distinct from 'string' or jsonb_typeof(s->'sheets') is distinct from 'object' then raise exception using errcode='22023',message='Invalid data source';end if;
 sid:=s->>'id';props:=s-'id'-'name'-'sheets';if s?'links' then if jsonb_typeof(s->'links')<>'object' then raise exception using errcode='22023',message='Invalid links';end if;select coalesce(jsonb_object_agg(k,'[]'::jsonb),'{}') into f from jsonb_object_keys(s->'links')k;props:=jsonb_set(props,'{links}',f);end if;
 insert into public.portal_bi_sources values(u,sid,key='detached',pos,s->>'name',case when jsonb_typeof(s->'connectedAt')='string' then s->>'connectedAt' end,props);pos:=pos+1;
 for sh in select * from jsonb_each(s->'sheets') loop
 if jsonb_typeof(sh.value->'columns') is distinct from 'array' or jsonb_array_length(sh.value->'columns')>1000 or jsonb_typeof(sh.value->'rows') is distinct from 'array' or jsonb_array_length(sh.value->'rows')>100000 or jsonb_array_length(sh.value->'columns')=0 and jsonb_array_length(sh.value->'rows')<>0 then raise exception using errcode='22023',message='Invalid data sheet';end if;
 if exists(select 1 from jsonb_array_elements(sh.value->'columns')c where jsonb_typeof(c)<>'string' or length(btrim(c#>>'{}'))=0 or length(c#>>'{}')>200) or (select count(distinct btrim(value#>>'{}')) from jsonb_array_elements(sh.value->'columns'))<>jsonb_array_length(sh.value->'columns') then raise exception using errcode='22023',message='Invalid data columns';end if;
 if exists(select 1 from jsonb_array_elements(sh.value->'rows')r where jsonb_typeof(r)<>'array' or jsonb_array_length(r)<>jsonb_array_length(sh.value->'columns') or exists(select 1 from jsonb_array_elements(r)c where jsonb_typeof(c) not in('string','number','boolean','null'))) then raise exception using errcode='22023',message='Invalid data rows';end if;
 insert into public.portal_bi_sheets values(u,sid,sh.key,sh.value-'columns'-'rows');
 insert into public.portal_bi_columns select u,sid,sh.key,ordinality-1,value#>>'{}' from jsonb_array_elements(sh.value->'columns') with ordinality;
 insert into public.portal_bi_rows select u,sid,sh.key,ordinality-1,value from jsonb_array_elements(sh.value->'rows') with ordinality;
 end loop;
 for ln in select * from jsonb_each(coalesce(s->'links','{}')) loop
 if jsonb_typeof(ln.value)<>'array' or exists(select 1 from jsonb_array_elements(ln.value)e where jsonb_typeof(e)<>'array' or jsonb_array_length(e)<>2 or jsonb_typeof(e->0)<>'string' or jsonb_typeof(e->1)<>'string') then raise exception using errcode='22023',message='Invalid data links';end if;
 insert into public.portal_bi_links select u,sid,ln.key,ordinality-1,value->>0,value->>1 from jsonb_array_elements(ln.value) with ordinality;
 end loop;end loop;end loop;
 end if;
 delete from public.portal_content_backups where user_id=u and app_id=p_app and revision in(select revision from public.portal_content_backups where user_id=u and app_id=p_app order by saved_at desc,revision offset 10);
 perform set_config('portal.content_bulk_write','off',true);
 return jsonb_build_object('hasWorkspace',true,'revision',rev,'savedAt',now(),'backend','relational');end $$;
create or replace function public.portal_content_touch() returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$begin
 if coalesce(current_setting('portal.content_bulk_write',true),'off')<>'on' then update public.portal_content_workspaces set revision=gen_random_uuid(),updated_at=now() where user_id=case when tg_op='DELETE' then old.user_id else new.user_id end and app_id=tg_argv[0];end if;return null;end $$;
create trigger content_touch after insert or update or delete on public.portal_ws_folders for each row execute function public.portal_content_touch('markdown');
create trigger content_touch after insert or update or delete on public.portal_ws_documents for each row execute function public.portal_content_touch('markdown');
create trigger content_touch after insert or update or delete on public.portal_ws_tags for each row execute function public.portal_content_touch('markdown');
create trigger content_touch after insert or update or delete on public.portal_ws_comments for each row execute function public.portal_content_touch('markdown');
create trigger content_touch after insert or update or delete on public.portal_bi_dashboards for each row execute function public.portal_content_touch('insight');
create trigger content_touch after insert or update or delete on public.portal_bi_cards for each row execute function public.portal_content_touch('insight');
create trigger content_touch after insert or update or delete on public.portal_bi_sources for each row execute function public.portal_content_touch('insight');
create trigger content_touch after insert or update or delete on public.portal_bi_sheets for each row execute function public.portal_content_touch('insight');
create trigger content_touch after insert or update or delete on public.portal_bi_columns for each row execute function public.portal_content_touch('insight');
create trigger content_touch after insert or update or delete on public.portal_bi_rows for each row execute function public.portal_content_touch('insight');
create trigger content_touch after insert or update or delete on public.portal_bi_links for each row execute function public.portal_content_touch('insight');
create or replace function public.portal_content_sync_properties() returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$
declare columns jsonb;pair record;fresh jsonb:=to_jsonb(new);prior jsonb:=to_jsonb(old);v jsonb;begin
 columns:=case tg_table_name when 'portal_ws_documents' then '{"folder_id":"folderId"}'::jsonb when 'portal_ws_folders' then '{"parent_id":"parentId"}'::jsonb when 'portal_ws_comments' then '{"author":"author"}'::jsonb when 'portal_bi_dashboards' then '{"updated_at":"updatedAt"}'::jsonb else '{"connected_at":"connectedAt"}'::jsonb end;
 for pair in select key,value from jsonb_each_text(columns) loop if fresh->pair.key is distinct from prior->pair.key then
 v:=fresh->pair.key;if pair.key in('folder_id','parent_id') and v='null'::jsonb then v:='""'::jsonb;end if;
 new.properties:=new.properties||jsonb_build_object(pair.value,v);end if;end loop;return new;end $$;
create trigger content_sync_properties before update on public.portal_ws_documents for each row execute function public.portal_content_sync_properties();
create trigger content_sync_properties before update on public.portal_ws_folders for each row execute function public.portal_content_sync_properties();
create trigger content_sync_properties before update on public.portal_ws_comments for each row execute function public.portal_content_sync_properties();
create trigger content_sync_properties before update on public.portal_bi_dashboards for each row execute function public.portal_content_sync_properties();
create trigger content_sync_properties before update on public.portal_bi_sources for each row execute function public.portal_content_sync_properties();
revoke all on function public.portal_content_sync_properties() from public,anon;grant execute on function public.portal_content_sync_properties() to authenticated;
create or replace function public.portal_content_legacy_guard() returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$begin
 if new.app_id in('markdown','insight') then perform pg_advisory_xact_lock(hashtextextended(new.user_id::text||':'||new.app_id||'-workspace',0));if exists(select 1 from public.portal_content_workspaces where user_id=new.user_id and app_id=new.app_id) then raise exception using errcode='PT409',message='Storage upgraded. Refresh before saving.';end if;end if;return new;end $$;
create trigger portal_content_legacy_guard before insert or update on public.portal_workspaces for each row execute function public.portal_content_legacy_guard();
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
 if p_app in('markdown','insight') then perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':'||p_app||'-workspace',0));if exists(select 1 from public.portal_content_workspaces where user_id=auth.uid() and app_id=p_app) then raise exception using errcode='PT409',message='Storage upgraded. Refresh before saving.';end if;end if;
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
revoke all on function public.portal_content_workspace_info(text),public.portal_content_workspace_get(text),public.portal_content_workspace_save(text,jsonb,uuid),public.portal_bi_source(text),public.portal_content_touch(),public.portal_content_legacy_guard() from public,anon;
grant execute on function public.portal_content_workspace_info(text),public.portal_content_workspace_get(text),public.portal_content_workspace_save(text,jsonb,uuid),public.portal_bi_source(text),public.portal_content_touch(),public.portal_content_legacy_guard() to authenticated;
notify pgrst,'reload schema';
commit;
