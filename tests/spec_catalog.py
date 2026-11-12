"""Definition extraction catches quoted commas, PK nullability and stale contracts."""
import importlib.util,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('spec_catalog',ROOT/'scripts/spec_catalog.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class CatalogTests(unittest.TestCase):
 def test_balanced_sql(self):
  s="(a text default 'x,)''y',check(a in('x','y')),b numeric(10,2)) trailing";end=m.balanced(s,0);self.assertEqual(s[end+1:],' trailing');self.assertEqual(len(m.split_sql(s[1:end])),3)
 def test_all_physical_tables_and_columns(self):
  d=m.collect();self.assertEqual(len(d['tables']),40);self.assertEqual(len({t['name'] for t in d['tables']}),40);self.assertEqual(sum(len(t['columns']) for t in d['tables']),223)
  for t in d['tables']:
   self.assertTrue(t['primaryKey'],t['name']);self.assertEqual(len({c['name'] for c in t['columns']}),len(t['columns']))
   for c in t['columns']:
    if c['name'] in t['primaryKey']:self.assertFalse(c['nullable'])
 def test_final_override_and_rpc(self):
  d=m.collect();f={x['name']:x for x in d['functions']};self.assertEqual(f['public.portal_workspace_save']['source'],'portal-content-relational.sql');self.assertEqual(f['public.portal_item_share']['security'],'INVOKER');self.assertEqual(len(f),39)
 def test_source_fingerprints(self):
  d=m.collect();self.assertIn('storage-status.js',d['runtimeSources']);self.assertTrue(all(len(h)==64 for h in d['sources'].values()))
 def test_recreation_documents(self):
  for name in ['screen-design','functional-design','code-definition','table-definition']:
   text=(ROOT/'docs/design'/f'{name}.md').read_text();self.assertGreater(len(text),5000,name);self.assertIn('2026-11-13',text)
if __name__=='__main__':unittest.main()
