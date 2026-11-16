#!/usr/bin/env python3
"""Build only public static assets, binding the artifact to successful suite reports."""
from pathlib import Path
import argparse,hashlib,json,shutil,sys
from regression import ROOT,source_sha,verify_reports
PUBLIC_DOWNLOADS={'portal-workspaces.sql','portal-workspaces-100mb.sql','portal-projects-relational.sql','portal-projects-consistency.sql','portal-content-relational.sql'} # Existing public cloud-setup downloads.
SUFFIXES={'.html','.css','.js','.json','.svg','.png','.jpg','.jpeg','.webp','.woff','.woff2','.ttf','.ico'}
def stage(source,destination,reports,sha):
 source=Path(source).resolve();destination=Path(destination).resolve()
 if source==destination or not destination.is_relative_to(source/'work'):raise ValueError('Release output must be under work/')
 proof=verify_reports(sorted(Path(reports).rglob('report.json')),sha)
 if destination.exists():shutil.rmtree(destination)
 destination.mkdir(parents=True);files=[]
 candidates=list(source.iterdir())+list((source/'apps').rglob('*'))
 for p in sorted(candidates):
  if p.is_symlink():raise ValueError('Symlink is not a public asset: '+str(p))
  if not p.is_file() or p.suffix.lower() not in SUFFIXES and p.name not in PUBLIC_DOWNLOADS:continue
  relative=p.relative_to(source)
  if any(x in relative.parts for x in ['node_modules','.git','work','__pycache__']):continue
  target=destination/relative;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,target);files.append({'path':relative.as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
 if not (destination/'index.html').exists():raise ValueError('Missing site index')
 manifest={'schema':1,'source_sha':sha,'suites':sorted(proof),'case_count':sum(len(r['cases']) for r in proof.values()),'files':files}
 (destination/'release.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');return manifest

def verify_site(directory,expected_sha):
 directory=Path(directory).resolve();m=json.loads((directory/'release.json').read_text())
 if m.get('schema')!=1 or m.get('source_sha')!=expected_sha:raise ValueError('Release SHA mismatch')
 listed=set()
 for entry in m['files']:
  relative=Path(entry['path']);p=directory/relative
  if relative.is_absolute() or '..' in relative.parts or p.is_symlink() or not p.resolve().is_relative_to(directory):raise ValueError('Unsafe release asset')
  if not p.is_file() or hashlib.sha256(p.read_bytes()).hexdigest()!=entry['sha256']:raise ValueError('Changed/missing release asset: '+str(relative))
  listed.add(relative.as_posix())
 actual={p.relative_to(directory).as_posix() for p in directory.rglob('*') if p.is_file()}
 if actual!=listed|{'release.json'}:raise ValueError('Unexpected release files')
 return m

def main():
 p=argparse.ArgumentParser();p.add_argument('--reports',default='work/reports');p.add_argument('--output',default='work/release/site');p.add_argument('--verify',type=Path);p.add_argument('--sha');a=p.parse_args();sha=a.sha or source_sha()
 m=verify_site(a.verify,sha) if a.verify else stage(ROOT,ROOT/a.output,a.reports,sha);print('VERIFIED release '+m['source_sha']+' / '+str(len(m['files']))+' assets')
if __name__=='__main__':main()
