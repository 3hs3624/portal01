"""Release contracts: failure, timeout, stale/missing evidence and changed assets must block."""
from pathlib import Path
import importlib.util,json,sys,tempfile,unittest
import yaml
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from regression import SUITES,execute,verify_reports
from stage_release import stage,verify_site
SHA='a'*40

def fixtures(directory):
 paths=[]
 for suite,cases in SUITES.items():
  p=Path(directory)/suite/'report.json';p.parent.mkdir(parents=True);p.write_text(json.dumps({'schema':1,'source_sha':SHA,'suite':suite,'status':'passed','cases':[{'id':n,'status':'passed','exit_code':0} for n,_ in cases]}));paths.append(p)
 return paths

class ReleaseGate(unittest.TestCase):
 def test_failure_stops_suite_and_retains_report(self):
  with tempfile.TemporaryDirectory() as tmp:
   r=execute('probe',[('failure',[sys.executable,'-c','raise SystemExit(7)']),('later',[sys.executable,'-c','raise SystemExit(0)'])],tmp,sha=SHA)
   self.assertEqual(r['status'],'failed');self.assertEqual(r['cases'][0]['exit_code'],7);self.assertEqual(r['cases'][1]['status'],'not_run');self.assertTrue((Path(tmp)/'report.json').exists())
 def test_timeout_is_failure(self):
  with tempfile.TemporaryDirectory() as tmp:
   r=execute('probe',[('timeout',[sys.executable,'-c','import time;time.sleep(5)'])],tmp,timeout=.05,sha=SHA)
   self.assertEqual(r['cases'][0]['status'],'timeout');self.assertEqual(r['status'],'failed')
 def test_all_exact_commit_reports_pass(self):
  with tempfile.TemporaryDirectory() as tmp:self.assertEqual(set(verify_reports(fixtures(tmp),SHA)),set(SUITES))
 def test_missing_suite_blocks(self):
  with tempfile.TemporaryDirectory() as tmp:
   paths=fixtures(tmp)
   with self.assertRaises(ValueError):verify_reports(paths[:-1],SHA)
 def test_stale_report_blocks(self):
  with tempfile.TemporaryDirectory() as tmp:
   paths=fixtures(tmp)
   with self.assertRaises(ValueError):verify_reports(paths,'b'*40)
 def test_failed_case_cannot_hide_behind_passed_suite(self):
  with tempfile.TemporaryDirectory() as tmp:
   paths=fixtures(tmp);r=json.loads(paths[0].read_text());r['cases'][0]['exit_code']=1;paths[0].write_text(json.dumps(r))
   with self.assertRaises(ValueError):verify_reports(paths,SHA)
 def test_omitted_case_blocks(self):
  with tempfile.TemporaryDirectory() as tmp:
   paths=fixtures(tmp);r=json.loads(paths[0].read_text());r['cases'].pop();paths[0].write_text(json.dumps(r))
   with self.assertRaises(ValueError):verify_reports(paths,SHA)
 def test_duplicate_suite_blocks(self):
  with tempfile.TemporaryDirectory() as tmp:
   paths=fixtures(tmp)
   with self.assertRaises(ValueError):verify_reports(paths+[paths[0]],SHA)
 def test_staging_requires_passed_reports(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);(root/'apps').mkdir();(root/'index.html').write_text('fixture')
   with self.assertRaises(ValueError):stage(root,root/'work/site',root/'reports',SHA)
   self.assertFalse((root/'work/site').exists())
 def test_staging_excludes_private_and_work_files_and_detects_tamper(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);(root/'apps/example').mkdir(parents=True);(root/'work').mkdir();(root/'index.html').write_text('fixture');(root/'app.js').write_text('safe');(root/'secret.sql').write_text('not public');(root/'work/private.json').write_text('not public');(root/'apps/example/index.html').write_text('app')
   fixtures(root/'reports');m=stage(root,root/'work/site',root/'reports',SHA);self.assertEqual(m['source_sha'],SHA);self.assertFalse((root/'work/site/secret.sql').exists());self.assertFalse((root/'work/site/work/private.json').exists());verify_site(root/'work/site',SHA)
   (root/'work/site/app.js').write_text('changed')
   with self.assertRaises(ValueError):verify_site(root/'work/site',SHA)
 def test_unlisted_file_blocks_restore(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);(root/'apps').mkdir();(root/'index.html').write_text('fixture');fixtures(root/'reports');stage(root,root/'work/site',root/'reports',SHA);(root/'work/site/extra.js').write_text('injected')
   with self.assertRaises(ValueError):verify_site(root/'work/site',SHA)
 def test_workflow_requires_business_and_design_success(self):
  quality=yaml.safe_load((ROOT/'.github/workflows/quality-gate.yml').read_text())['jobs'];reuse=yaml.safe_load((ROOT/'.github/workflows/business-regression.yml').read_text())['jobs']
  self.assertEqual(quality['release-ready']['needs'],['regression','design']);self.assertEqual(quality['deploy']['needs'],'release-ready');self.assertNotIn('always()',quality['deploy'].get('if',''));self.assertIn("refs/heads/gh-pages",quality['deploy']['if']);self.assertIn("pull_request",quality['deploy']['if']);self.assertEqual(set(reuse['suite']['strategy']['matrix']['suite']),set(SUITES))
 def test_restore_requires_trusted_provenance_and_validation(self):
  raw=(ROOT/'.github/workflows/restore-web-release.yml').read_text();jobs=yaml.safe_load(raw)['jobs'];self.assertEqual(jobs['deploy']['needs'],'validate');self.assertIn('acknowledge_static_only',jobs['validate']['if']);self.assertIn("r.conclusion !== 'success'",raw);self.assertIn("r.head_branch !== 'gh-pages'",raw);self.assertIn('stage_release.py --verify',raw)
 def test_browser_override_is_required_to_exist(self):
  import os
  from unittest.mock import patch
  sys.path.insert(0,str(ROOT/'tests'));from write_studio_blocks import chromium_executable
  with patch.dict(os.environ,{'CHROMIUM_BIN':'/no/such/browser'}):
   with self.assertRaises(RuntimeError):chromium_executable()

if __name__=='__main__':unittest.main()
