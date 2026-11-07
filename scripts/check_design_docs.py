#!/usr/bin/env python3
"""Require design updates beside functional runtime/schema changes."""
import argparse, re, subprocess, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DESIGN='docs/design/'
APP_DOCS={'markdown':'write-studio.md','projects':'project-management.md','insight':'insight-bi.md'}
RUNTIME_SUFFIXES={'.js','.cjs','.mjs','.html','.css','.sql','.ts','.json'}

def normalize_cache(text):
    text=re.sub(r'\?v=[a-f0-9]{6,64}', '?v=CACHE', text)
    return re.sub(r'const appPageVersions=\{[^;]+;', 'const appPageVersions=CACHE;',text)

def required_documents(path,before='',after=''):
    p=Path(path)
    if path=='.github/workflows/desktop-preview.yml':return {DESIGN+'desktop.md'}
    if path.startswith(('tests/','scripts/','docs/','work/','.github/')) or '/vendor/' in path or p.suffix not in RUNTIME_SUFFIXES:return set()
    if before and normalize_cache(before)==normalize_cache(after):return set()
    for app,doc in APP_DOCS.items():
        if path.startswith('apps/'+app+'/'):return {DESIGN+doc}
    if path.startswith('desktop/'):
        if any(x in p.parts for x in ['node_modules','release','staged-web']):return set()
        return {DESIGN+'desktop.md'}
    if path in {'project-cloud.js','cloud-files.js','portal-projects-relational.sql','portal-projects-consistency.sql'}:return {DESIGN+'common.md',DESIGN+'project-management.md'}
    if path in {'content-cloud.js','portal-content-relational.sql'}:return {DESIGN+'common.md',DESIGN+'write-studio.md',DESIGN+'insight-bi.md'}
    if '/' not in path or path.startswith('supabase/'):return {DESIGN+'common.md'}
    return set()

def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT,text=True).strip()
def content(ref,path):
    if ref is None:
        p=ROOT/path
        return p.read_text(errors='replace') if p.is_file() else ''
    result=subprocess.run(['git','show',ref+':'+path],cwd=ROOT,text=True,capture_output=True)
    return result.stdout if result.returncode==0 else ''
def missing_documents(changed,required):
    if not required:return set()
    return (required|{DESIGN+'CHANGELOG.md'})-set(changed)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--base',required=True);parser.add_argument('--head');args=parser.parse_args()
    base=args.base
    if set(base)=={'0'}:base=git('rev-list','--max-parents=0',args.head or 'HEAD').splitlines()[0]
    changed=git('diff','--name-only',base,*([args.head] if args.head else [])).splitlines();required=set()
    for path in changed:required|=required_documents(path,content(base,path),content(args.head,path))
    missing=missing_documents(changed,required)
    if missing:
        print('기능 변경과 같은 커밋/PR에서 다음 설계서를 갱신하세요:\n'+'\n'.join(sorted(missing)),file=sys.stderr);return 1
    for doc in required:
        if not content(args.head,doc).strip():print('설계서가 비어 있습니다: '+doc,file=sys.stderr);return 1
    print('Design update coverage verified: '+str(len(required))+' affected design documents')
    return 0
if __name__=='__main__':sys.exit(main())
