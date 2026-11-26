#!/usr/bin/env python3
"""Run trusted fixture suites and always leave an exact-commit machine-readable report."""
from pathlib import Path
import argparse,datetime,hashlib,json,os,platform,subprocess,sys,time
ROOT=Path(__file__).resolve().parents[1]
SUITES={
 'unit':[(f'node-{n}', ['node',f'tests/{n}.cjs']) for n in ['storage_models','storage_compare','folder_storage_conflicts','content_cloud','project_cloud','cloud_workspace_limits','document_metadata','block_recommendations']]+[(n,[sys.executable,p,*args]) for n,p,args in [('design-tests','tests/design_docs.py',[]),('spec-tests','tests/spec_catalog.py',[]),('inventory','scripts/design_inventory.py',['--check']),('spec-catalog','scripts/spec_catalog.py',['--check']),('release-contracts','tests/release_gate.py',[])]],
 'sql':[(n,['node',f'tests/{n}.mjs']) for n in ['content_relational_sql','project_relational_sql','item_sharing_sql']],
 'browser-storage':[(n,[sys.executable,f'tests/{n}.py']) for n in ['storage_feedback','write_studio_storage_flow','shared_storage_flow']],
 'browser-sharing':[('item_sharing_ui',[sys.executable,'tests/item_sharing_ui.py'])],
 'browser-excel':[('projects_excel',[sys.executable,'tests/projects_excel.py','--format-fixture'])],
 'browser-editor':[(n,[sys.executable,f'tests/{n}.py']) for n in ['editor_view_transition','table_axis_drag','sidebar_layout','manual_wiki']],
}
def source_sha():return subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def execute(suite,cases,destination,timeout=300,env=None,sha=None):
 destination=Path(destination);destination.mkdir(parents=True,exist_ok=True);results=[];started=now();failed=False
 for name,command in cases:
  if failed:results.append({'id':name,'status':'not_run','exit_code':None,'seconds':0});continue
  stamp=time.monotonic();log=destination/(name+'.log');print('RUN '+suite+'/'+name,flush=True)
  try:
   with log.open('w',encoding='utf-8') as stream:r=subprocess.run(command,cwd=ROOT,stdout=stream,stderr=subprocess.STDOUT,env=env,timeout=timeout)
   code=r.returncode;status='passed' if code==0 else 'failed'
  except subprocess.TimeoutExpired:code=124;status='timeout'
  except OSError as error:log.write_text(str(error),encoding='utf-8');code=127;status='failed'
  results.append({'id':name,'status':status,'exit_code':code,'seconds':round(time.monotonic()-stamp,3),'log':log.name,'log_sha256':hashlib.sha256(log.read_bytes()).hexdigest()});failed=code!=0
  print(status.upper()+' '+name,flush=True)
  if failed:print(log.read_text(errors='replace')[-10000:],flush=True)
 report={'schema':1,'source_sha':sha or source_sha(),'suite':suite,'started_at':started,'finished_at':now(),'platform':platform.platform(),'python':platform.python_version(),'status':'failed' if failed else 'passed','cases':results}
 (destination/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');return report

def verify_reports(paths,expected_sha):
 reports={}
 for path in paths:
  r=json.loads(Path(path).read_text());suite=r.get('suite')
  if suite not in SUITES or suite in reports:raise ValueError('Unknown/duplicate suite: '+str(suite))
  if r.get('schema')!=1 or r.get('source_sha')!=expected_sha or r.get('status')!='passed':raise ValueError('Failed/stale report: '+str(path))
  if [x.get('id') for x in r.get('cases',[])]!=[n for n,_ in SUITES[suite]]:raise ValueError('Missing/reordered cases: '+suite)
  if any(x.get('status')!='passed' or x.get('exit_code')!=0 for x in r['cases']):raise ValueError('Unsuccessful case: '+suite)
  reports[suite]=r
 if set(reports)!=set(SUITES):raise ValueError('Missing suites: '+', '.join(sorted(set(SUITES)-set(reports))))
 return reports

def main():
 p=argparse.ArgumentParser();p.add_argument('--suite',choices=SUITES);p.add_argument('--output',default='work/regression');p.add_argument('--timeout',type=int,default=300);p.add_argument('--verify',type=Path);p.add_argument('--sha');a=p.parse_args()
 if a.verify:
  result=verify_reports(sorted(a.verify.rglob('report.json')),a.sha or source_sha());print('VERIFIED '+str(len(result))+' suites / '+str(sum(len(r['cases']) for r in result.values()))+' cases');return 0
 if not a.suite:p.error('--suite or --verify is required')
 env=os.environ.copy();env['PYTHONUNBUFFERED']='1';(ROOT/'work').mkdir(exist_ok=True)
 module=ROOT/'ci/node_modules/@electric-sql/pglite/dist/index.js'
 if module.exists():env['PGLITE_MODULE']=module.as_uri()
 r=execute(a.suite,SUITES[a.suite],Path(a.output)/a.suite,a.timeout,env);return 0 if r['status']=='passed' else 1
if __name__=='__main__':sys.exit(main())
