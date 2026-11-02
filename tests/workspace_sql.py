"""Requires pglast; validates SQL syntax and the safe 100MiB upgrade artifact."""
from pathlib import Path
from html.parser import HTMLParser
from pglast import parse_sql, parse_plpgsql

root = Path(__file__).resolve().parents[1]
setup = (root / 'portal-workspaces.sql').read_text()
upgrade = (root / 'portal-workspaces-100mb.sql').read_text()
for name, sql in [('setup', setup), ('upgrade', upgrade)]:
    assert parse_sql(sql)
    start = sql.index('create or replace function public.portal_workspace_save')
    end = sql.index('end $$;', start) + len('end $$;')
    assert parse_plpgsql(sql[start:end])
    assert 'drop constraint if exists portal_workspace_size' in sql
    assert 'octet_length(payload::text)<=104857600' in sql
    assert 'octet_length(p_workspace::text)>104857600' in sql
    assert 'security invoker' in sql and 'auth.uid()' in sql
    assert 'revision=p_expected' in sql and "errcode='PT409'" in sql
    assert "user_id=auth.uid() and app_id=p_app" in sql
    print('PASS PostgreSQL / PLpgSQL syntax, 100MiB and access/concurrency guards:', name)
assert not any(command in upgrade.lower() for command in ['drop policy', 'delete from', 'truncate', 'disable row level'])

class SetupSQL(HTMLParser):
    inside = False
    sql = ''
    def handle_starttag(self, tag, attrs):
        if tag == 'textarea':
            self.inside = True
    def handle_endtag(self, tag):
        if tag == 'textarea':
            self.inside = False
    def handle_data(self, text):
        if self.inside:
            self.sql += text

page = SetupSQL()
page.feed((root / 'cloud-setup.html').read_text())
assert page.sql == setup
print('PASS published setup SQL matches source; upgrade preserves data and policies')
