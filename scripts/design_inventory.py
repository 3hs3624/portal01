#!/usr/bin/env python3
"""Generate deterministic design appendices from shipped markup and UI modules."""
from pathlib import Path
from html.parser import HTMLParser
import argparse, ast, base64, gzip, json, re, sys

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/design'
TAGS = {'button', 'input', 'select', 'textarea', 'dialog'}
VOID = {'input', 'meta', 'link', 'img', 'br', 'hr', 'source', 'area', 'wbr', 'embed', 'param', 'col', 'base'}
ATTRS = {'id','type','name','role','aria-label','aria-labelledby','placeholder','title','required','disabled','checked','min','max','step','maxlength','accept','data-view','data-tab','data-action','data-page','multiple'}

class Controls(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack=[]; self.rows=[]; self.labels={}; self.active_labels=[]
    def handle_starttag(self, tag, attrs):
        a=dict(attrs); idx=None
        if tag in TAGS and not any(t in {'script','style'} for t,_ in self.stack):
            idx=len(self.rows); self.rows.append({'tag':tag,'line':self.getpos()[0],'attributes':{k:('true' if v is None else v) for k,v in a.items() if k in ATTRS},'text':'','options':[]})
        if tag=='label': self.active_labels.append((a.get('for'), []))
        if tag=='option':
            select=next((i for t,i in reversed(self.stack) if t=='select' and i is not None),None)
            if select is not None: self.rows[select]['options'].append({'value':a.get('value',''),'label':''})
        if tag not in VOID: self.stack.append((tag,idx))
    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag,attrs)
        if tag not in VOID:self.handle_endtag(tag)
    def handle_endtag(self, tag):
        if tag=='label' and self.active_labels:
            key,parts=self.active_labels.pop()
            if key:self.labels[key]=' '.join(' '.join(parts).split())
        for pos in range(len(self.stack)-1,-1,-1):
            if self.stack[pos][0]==tag:
                self.stack=self.stack[:pos];break
    def handle_data(self, text):
        if any(t in {'script','style'} for t,_ in self.stack):return
        for _,parts in self.active_labels:parts.append(text)
        for tag,idx in self.stack:
            if idx is not None and tag in {'button','textarea'}:self.rows[idx]['text']+=' '+text
        if self.stack and self.stack[-1][0]=='option':
            select=next((i for t,i in reversed(self.stack) if t=='select' and i is not None),None)
            if select is not None and self.rows[select]['options']:self.rows[select]['options'][-1]['label']+=text
    def result(self):
        for row in self.rows:
            a=row['attributes'];row['text']=' '.join(row['text'].split())
            if row['tag']=='textarea':
                row['initialContentLength']=len(row['text']);row['text']=''
            row['label']=a.get('aria-label') or self.labels.get(a.get('id')) or row['text'] or a.get('placeholder') or a.get('title') or a.get('id') or a.get('name') or '(동적/아이콘 제어)'
            for option in row['options']:option['label']=' '.join(option['label'].split())
        return self.rows

LITERAL_ARRAY = re.compile(r'''\[(?:\s*(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*,?)+\s*\]''')
def string_arrays(text):
    for match in LITERAL_ARRAY.finditer(text):
        try:yield match,ast.literal_eval(match.group())
        except (ValueError,SyntaxError):continue

def commands():
    block=(ROOT/'apps/markdown/block-ui.js').read_text()
    start=block.index('const SLASH = [');end=block.index('\n];',start)+3
    rows=[{'id':v[0],'label':v[1],'group':v[3],'source':'apps/markdown/block-ui.js'} for _,v in string_arrays(block[start:end]) if len(v)==5]
    extra=(ROOT/'apps/markdown/block-widgets.js').read_text();initial=extra[extra.index('const EXTRA_BLOCKS = ['):extra.index('\n];')+3]
    for match,v in string_arrays(initial):
        if len(v)==4:rows.append({'id':v[0],'label':v[1],'group':v[3],'source':'apps/markdown/block-widgets.js'})
        elif len(v)==2:
            after=initial[match.end():];mapping=re.search(r'\.map\(\(\[id, n\]\) => \["(db-|chart-)"',after)
            if mapping:
                prefix=mapping[1];rows.append({'id':prefix+v[0],'label':v[1]+(' 보기' if prefix=='db-' else ' 차트'),'group':'데이터베이스','source':'apps/markdown/block-widgets.js'})
        elif v and v[0]=='Google Drive':
            rows.extend({'id':'service-'+n,'label':n,'group':'임베드','source':'apps/markdown/block-widgets.js'} for n in v)
    nums=re.search(r'\.\.\.\[([\d, ]+)\]\.map\(\(n\) => \["columns"',initial)
    if nums:rows.extend({'id':'columns'+n.strip(),'label':n.strip()+'개의 열','group':'고급 블록','source':'apps/markdown/block-widgets.js'} for n in nums[1].split(','))
    actions=extra[extra.index('EXTRA_BLOCKS.push('):extra.index('const STUDIO_EXTRA')]
    rows.extend({'id':'action-'+v[0],'label':v[1],'group':'작업','source':'apps/markdown/block-widgets.js'} for _,v in string_arrays(actions) if len(v)==3)
    colors=block[block.index('const STUDIO_COLORS = ['):];colors=ast.literal_eval(colors[colors.index('['):colors.index('];')+1])
    names=extra[extra.index('const STUDIO_COLOR_LABELS = ['):];names=ast.literal_eval(names[names.index('['):names.index('];')+1])
    for attr,suffix in [('studioColor','텍스트'),('studioBackground','배경')]:
        rows.extend({'id':'color-'+attr+'-'+c,'label':n+' '+suffix,'group':suffix+' 색상','source':'apps/markdown/block-widgets.js'} for c,n in zip(colors,names))
    return sorted({r['id']:r for r in rows}.values(),key=lambda r:(r['group'],r['id']))

def collect():
    markup=['index.html','cloud-setup.html','shared-item.html','apps/markdown/index.html','apps/projects/index.html','apps/insight/index.html','apps/insight/data-detail.html']
    screens=[]; inline_modules=[]
    for name in markup:
        source=(ROOT/name).read_text();parser=Controls();parser.feed(source);screens.append({'source':name,'controls':parser.result()})
        inline_modules.append((name,source))
        if name=='apps/projects/index.html':
            encoded=re.search(r'id="dash-tpl"[^>]*>([^<]+)',source)
            if not encoded:raise ValueError('Project dashboard template missing')
            parser=Controls();decoded=gzip.decompress(base64.b64decode(encoded[1])).decode();parser.feed(decoded);inline_modules.append((name+'#dash-tpl',decoded));screens.append({'source':name+'#dash-tpl','controls':parser.result()})
    paths=sorted([p for p in ROOT.glob('*.js')]+[p for app in ['markdown','projects','insight'] for p in (ROOT/'apps'/app).glob('*.js')])
    modules=[]
    sources=[(str(p.relative_to(ROOT)),p.read_text()) for p in paths]
    for name,markup in inline_modules:
        scripts=[body for attrs,body in re.findall(r'<script([^>]*)>([\s\S]*?)</script>',markup) if body.strip() and 'application/octet-stream' not in attrs and 'application/json' not in attrs]
        if scripts:sources.append((name+' (inline)', '\n'.join(scripts)))
    for name,source in sources:
        functions=sorted(set(re.findall(r'(?:^|\n)\s*(?:async\s+)?function\s+([\w$]+)\s*\(',source)))
        # Include factory/helper labels generated in JavaScript, without executing source.
        labels=sorted(set(m[1] for m in re.findall(r'''(?:menuButton|widgetButton|addCheck|addSelect|item)\(\s*(['"])([^'"\n]{1,100})\1''',source)))
        modules.append({'source':name,'functions':functions,'dynamicLabels':labels})
    return {'schemaVersion':1,'screens':screens,'blockCommands':commands(),'modules':modules}

def cell(value):return str(value).replace('|','\\|').replace('\n',' ')
def markdown(data):
    out=['# UI·코드 인벤토리','', '이 파일은 `python scripts/design_inventory.py`로 생성합니다. 정적 제어·기본 선택지와 동적 UI 코드/블록 명령을 설계서와 대조하기 위한 부록입니다. 사용자 데이터나 실행 중 DOM을 수집하지 않습니다.','', '동적 행·상태에 따라 값이 바뀌는 텍스트는 소스 표현식으로 남을 수 있습니다. 개별 조작·권한·오류 상태는 앱별 설계서의 기능 표와 함께 읽습니다. 생성 결과는 런타임 전체 경로가 자동 검증됐다는 뜻이 아닙니다.','']
    for screen in data['screens']:
        out+=['## '+screen['source'],'','컨트롤 수: '+str(len(screen['controls'])),'','| 종류 | ID/이름 | 표시·접근성 이름 | 속성·선택지 |','|---|---|---|---|']
        for r in screen['controls']:
            a=r['attributes'];attributes=', '.join(k+'='+v for k,v in a.items() if k not in {'id','name','aria-label','title','placeholder'})
            options=' / '.join(o['label']+' ['+o['value']+']' for o in r['options'])
            out.append('| '+' | '.join(map(cell,[r['tag'],a.get('id') or a.get('name') or '—',r['label'],attributes+('; '+options if options else '')]))+' |')
        out.append('')
    out+=['## 동적 블록 메뉴 전체 명령','','추천 위치는 사용 이력에 따라 달라집니다. 아래 분류는 선언된 기본 분류이며 현재 추천 순서를 뜻하지 않습니다. 작업/색상 명령은 추천 집계 대상에서 제외합니다.','','| 명령 ID | 표시 이름 | 기본 분류 |','|---|---|---|']
    out+=['| '+' | '.join(cell(r[k]) for k in ['id','label','group'])+' |' for r in data['blockCommands']]
    out+=['','## 동적 UI·처리 모듈','','선택지·행·카드·권한 버튼처럼 런타임에 생성되는 UI의 추적 시작점입니다. 함수 목록은 선언형 함수 기준이며 익명/화살표 콜백 전체를 열거한 목록은 아닙니다.','','| 코드 | 선언 함수 | 추출 UI 라벨/설정 키 |','|---|---|---|']
    for m in data['modules']:out.append('| '+' | '.join(map(cell,[m['source'],', '.join(m['functions']) or 'IIFE/객체/콜백 참조',', '.join(m['dynamicLabels']) or '해당 소스의 생성 로직 참조']))+' |')
    out+=['','정적 컨트롤 합계: '+str(sum(len(s['controls']) for s in data['screens']))+' / 블록 명령: '+str(len(data['blockCommands']))+' / 모듈: '+str(len(data['modules'])),'']
    return '\n'.join(out)

def main():
    args=argparse.ArgumentParser();args.add_argument('--check',action='store_true');options=args.parse_args();data=collect()
    outputs={'ui-inventory.json':json.dumps(data,ensure_ascii=False,indent=2)+'\n','ui-inventory.md':markdown(data)};stale=[]
    for name,text in outputs.items():
        path=OUT/name
        if options.check:
            if not path.exists() or path.read_text()!=text:stale.append(name)
        else:path.write_text(text)
    if stale:print('Regenerate design inventory: '+', '.join(stale),file=sys.stderr);return 1
    print('Design inventory '+('verified' if options.check else 'generated')+': '+str(sum(len(s['controls']) for s in data['screens']))+' controls, '+str(len(data['blockCommands']))+' commands, '+str(len(data['modules']))+' modules')
    return 0
if __name__=='__main__':sys.exit(main())
