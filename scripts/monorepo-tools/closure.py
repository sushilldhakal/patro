import os,re,sys,json
R='/home/user/patro'; W=R+'/apps/web/src'; M=R+'/apps/mobile'; D=R+'/packages/domain/src'
def lib_files(root):
    out={}
    for dp,dn,fn in os.walk(root):
        dn[:]=[d for d in dn if d!='node_modules']
        for f in fn:
            if f.endswith('.ts') and not f.endswith('.d.ts'):
                out[os.path.relpath(os.path.join(dp,f),root)[:-3]]=os.path.join(dp,f)
    return out
wl=lib_files(W+'/lib'); ml=lib_files(M+'/lib')
ml_all={k.replace('.web',''):v for k,v in ml.items()}
dups=sorted(set(wl)&set(ml_all))
domain=set(lib_files(D))
spec_re=re.compile(r'''(import|export)(\s+type)?\s*(\{[^}]*\}|\*[^;]*?|[\w$]+)?\s*(?:,\s*\{[^}]*\})?\s*from\s*(["'])([^"']+)\4|import\(\s*(["'])([^"']+)\6\s*\)''',re.S)
cache={}
def analyze(rel):
    """return (ok, deps_web_rels, reason)"""
    if rel in cache: return cache[rel]
    cache[rel]=(None,[],'cycle')  # optimistic for cycles
    path=wl[rel]; s=open(path).read()
    reasons=[]; deps=[]
    if rel not in('sky3d/sky-geometry','learn/articles/calculation/calc-moonrise') and re.search(r'\b(window|document|localStorage|sessionStorage|navigator)\b\.',re.sub(r'//.*|/\*[\s\S]*?\*/','',s)): reasons.append('browser api')
    if path.endswith('.tsx'): reasons.append('tsx')
    for m in spec_re.finditer(s):
        spec=m.group(5) or m.group(7); isType=bool(m.group(2)); names=m.group(3) or ''
        if m.group(1) is None and m.group(7): isType=True  # dynamic import() in type position assumed
        if spec.startswith('@vedic-patro/domain/'): continue
        if spec=='@vedic-patro/api-client' or spec in('@/lib/api',):
            if not isType: reasons.append('runtime api import'); 
            continue
        if re.match(r'@/i18n/locale$',spec):
            ns={n.strip().replace('type ','') for n in names.strip('{}').split(',') if n.strip()}
            if not ns<= {'normalizeLang','pickLocale','bilingualText','Lang'}: reasons.append('i18n/locale '+','.join(sorted(ns)))
            continue
        if spec=='@/i18n/digits':
            ns={n.strip().replace('type ','') for n in names.strip('{}').split(',') if n.strip()}
            if not ns<= {'formatLocaleDigits','toDevanagariDigits','usesDevanagariDigits'}: reasons.append('i18n/digits '+','.join(sorted(ns)))
            continue
        if spec.startswith('./') or spec.startswith('../') or spec.startswith('@/lib/'):
            if spec.startswith('@/lib/'): r=spec[6:]
            else: r=os.path.normpath(os.path.join(os.path.dirname(rel),spec))
            if r.endswith('.json'):
                if os.path.exists(W+'/lib/'+r): deps.append(r)
                else: reasons.append('json missing '+r)
                continue
            if r in domain: continue
            if r in wl:
                deps.append(r); continue
            reasons.append('lib?'+spec); continue
        if spec in('three','healpix-ts','clsx','tailwind-merge') or spec.startswith('three/'): continue
        reasons.append('ext '+spec)
    ok=not reasons
    if ok:
        for d in deps:
            if d.endswith('.json'): continue
            o,_,why=analyze(d)
            if o is False: ok=False; reasons.append('dep '+d+' ('+why+')')
    res=(ok,deps,'; '.join(reasons))
    cache[rel]=res
    return res
PLATFORM_OK_BROWSER={'sky3d/sky-geometry','learn/articles/calculation/calc-moonrise'}
PLATFORM={'patro-classes','timeline-classes','wheel-classes','wheel-svg-classes','sky3d/sky-textures','sky3d/nebula-sources'}
movable=[];blocked=[]
for rel in dups:
    ok,deps,why=analyze(rel)
    if rel in PLATFORM: ok=False; why='platform styling/assets'
    (movable if ok else blocked).append((rel,deps,why))
if __name__=='__main__':
    mode=sys.argv[1] if len(sys.argv)>1 else 'summary'
    if mode=='blocked':
        for r,d,w in blocked: print(r,'::',w[:150])
    elif mode=='movable':
        todo=[]
        def add(r):
            if r in todo: return
            for d in analyze(r)[1]:
                if not d.endswith('.json'): add(d)
            todo.append(r)
            for d in analyze(r)[1]:
                if d.endswith('.json') and d not in todo: todo.append(d)
        for r,_,_ in movable: add(r)
        print(' '.join(todo))
    else: print(len(movable),'movable;',len(blocked),'blocked')
