-- Keep extensible JSON properties consistent when individual relational columns are edited.
begin;
create or replace function public.portal_pm_sync_properties() returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$
declare columns jsonb;pair record;fresh jsonb:=to_jsonb(new);prior jsonb:=to_jsonb(old);patch jsonb:='{}';begin
 columns:=case tg_table_name
 when 'portal_pm_projects' then '{"name":"name","client":"client","pm":"pm","pl":"pl","start_date":"startDate","end_date":"endDate"}'::jsonb
 when 'portal_pm_tasks' then '{"source_id":"id","name":"name","task_group":"group","assignee":"assignee","plan_start":"planStart","plan_end":"planEnd","actual_start":"actStart","actual_end":"actEnd","progress":"progress"}'::jsonb
 when 'portal_pm_calendar' then '{"entry_date":"date","name":"name"}'::jsonb
 else '{"source_id":"id","name":"name"}'::jsonb end;
 for pair in select key,value from jsonb_each_text(columns) loop
 if fresh->pair.key is distinct from prior->pair.key then patch:=patch||jsonb_build_object(pair.value,fresh->pair.key);end if;
 end loop;
 if tg_table_name='portal_pm_projects' then
 new.metadata:=new.metadata||patch;
 new.state_extra:=jsonb_set(new.state_extra,'{project}',coalesce(new.state_extra->'project','{}')||patch,true);
 else new.properties:=new.properties||patch;end if;
 return new;end $$;
do $$declare t text;begin foreach t in array array['portal_pm_projects','portal_pm_phases','portal_pm_activities','portal_pm_tasks','portal_pm_calendar'] loop
 execute format('create trigger pm_sync_properties before update on public.%I for each row execute function public.portal_pm_sync_properties()',t);end loop;end $$;
revoke all on function public.portal_pm_sync_properties() from public,anon;
grant execute on function public.portal_pm_sync_properties() to authenticated;
-- Evaluate account/app permissions once per statement rather than once per WBS row.
do $$declare t text;begin foreach t in array array['portal_pm_workspaces','portal_pm_projects','portal_pm_phases','portal_pm_activities','portal_pm_tasks','portal_pm_calendar','portal_pm_files','portal_pm_versions','portal_pm_backups'] loop
 execute format('drop policy pm_read on public.%I',t);execute format('drop policy pm_insert on public.%I',t);execute format('drop policy pm_update on public.%I',t);execute format('drop policy pm_delete on public.%I',t);
 execute format('create policy pm_read on public.%I for select to authenticated using ((select auth.uid())=user_id and (select public.portal_can_access(''projects'',''read'')))',t);
 execute format('create policy pm_insert on public.%I for insert to authenticated with check ((select auth.uid())=user_id and (select public.portal_can_access(''projects'',''write'')) and (select public.portal_can_access(''projects'',''read'')))',t);
 execute format('create policy pm_update on public.%I for update to authenticated using ((select auth.uid())=user_id and (select public.portal_can_access(''projects'',''write'')) and (select public.portal_can_access(''projects'',''read''))) with check ((select auth.uid())=user_id and (select public.portal_can_access(''projects'',''write'')) and (select public.portal_can_access(''projects'',''read'')))',t);
 execute format('create policy pm_delete on public.%I for delete to authenticated using ((select auth.uid())=user_id and (select public.portal_can_access(''projects'',''write'')) and (select public.portal_can_access(''projects'',''read'')))',t);
 end loop;end $$;
notify pgrst,'reload schema';
commit;
