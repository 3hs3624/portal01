#!/usr/bin/env python3
"""Keep the user-guide source and its readable documentation copy in sync."""
import argparse,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def render():
 data=json.loads((ROOT/'manual-content.json').read_text());articles=data['articles'];ids={a['id'] for a in articles}
 if data['version']!=1 or len(ids)!=len(articles):raise ValueError('Invalid manual IDs/version')
 if any(r not in ids for a in articles for r in a['related']):raise ValueError('Broken related-article link')
 md='# Portal 사용자 매뉴얼\n\n기준일: '+data['updated']+'(KST). 앱 내 매뉴얼 메뉴의 원문 사본입니다.\n\n'
 for a in articles:
  md+='## '+a['title']+'\n\n분류: '+a['group']+' / 문서 ID: '+a['id']+'\n\n'+a['summary']+'\n\n'
  for s in a['sections']:
   md+='### '+s['title']+'\n\n'+'\n\n'.join(s['paragraphs'])+'\n\n'
   md+=''.join(str(i)+'. '+p+'\n' for i,p in enumerate(s['steps'],1))+'\n'
   md+=''.join('> '+p+'\n\n' for p in s['notes'])
 return md
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');a=p.parse_args();path=ROOT/'docs/manual/README.md';text=render()
 if a.check:
  if not path.exists() or path.read_text()!=text:raise SystemExit('Run python scripts/sync_manual.py')
  print('Manual source, related links and documentation copy verified')
 else:path.parent.mkdir(parents=True,exist_ok=True);path.write_text(text);print('Manual documentation copy updated')
