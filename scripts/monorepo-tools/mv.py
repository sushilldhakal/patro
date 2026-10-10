#!/usr/bin/env python3
"""usage: mv.py rel[,rel...]  — rel is path under web/src/lib (no ext). Moves web version into domain, drops mobile copy, rewrites importers."""
import os,re,sys,subprocess
R='/home/user/patro'
W=R+'/apps/web/src'; M=R+'/apps/mobile'; D=R+'/packages/domain/src'
def run(*a): subprocess.check_call(a,cwd=R)
rels=[r for r in sys.argv[1:]]
exts=('.ts','.tsx')
targets={}  # absolute path without ext -> domain rel
for rel in rels:
    src=f'{W}/lib/{rel}'
    if rel.endswith('.json'):
        ws=src; ms=f'{M}/lib/{rel}'; key=rel[:-5]; keep=True
    else: ws=src+'.ts'; ms=f'{M}/lib/{rel}.ts'
    dst=f'{D}/{rel}'+('' if rel.endswith('.json') else '.ts')
    os.makedirs(os.path.dirname(dst),exist_ok=True)
    if not os.path.exists(ws): print('missing web',ws); sys.exit(1)
    run('git','mv',ws,dst)
    if os.path.exists(ms): run('git','rm','-qf',ms)
    if not rel.endswith('.json'):
        targets[f'{W}/lib/{rel}']=rel; targets[f'{M}/lib/{rel}']=rel
        for ext in ('.web',): targets[f'{M}/lib/{rel}{ext}']=rel
def resolve(spec,file):
    if spec.startswith('@/'):
        base=W if file.startswith(W) else M
        return os.path.normpath(base+'/'+spec[2:])
    if spec.startswith('.'):
        return os.path.normpath(os.path.join(os.path.dirname(file),spec))
    return None
spec_re=re.compile(r'''(from\s+|import\s*\(\s*|import\s+|vi\.mock\(\s*|require\(\s*)(["'])([^"']+)\2''')
def process(file,indomain=False):
    s=open(file).read(); o=s
    def rep(m):
        spec=m.group(3)
        if indomain:
            if spec.startswith('@vedic-patro/domain/'):
                tgt=D+'/'+spec[len('@vedic-patro/domain/'):]
                rel=os.path.relpath(tgt,os.path.dirname(file))
                if not rel.startswith('.'): rel='./'+rel
                return f'{m.group(1)}{m.group(2)}{rel}{m.group(2)}'
            if re.match(r'@/i18n/(locale|digits)$',spec):
                rel=os.path.relpath(D+'/locale',os.path.dirname(file)); rel=rel if rel.startswith('.') else './'+rel
                return f'{m.group(1)}{m.group(2)}{rel}{m.group(2)}'
            if spec in('@/lib/api',) or (spec=='./api' and not os.path.exists(os.path.dirname(file)+'/api.ts')):
                return f'{m.group(1)}{m.group(2)}@vedic-patro/api-client{m.group(2)}'
            r=resolve(spec,file.replace(D,W+'/lib') if False else file)
            if spec.startswith('@/lib/'):
                tgt=D+'/'+spec[len('@/lib/'):]
                if os.path.exists(tgt+'.ts'):
                    rel=os.path.relpath(tgt,os.path.dirname(file)); rel=rel if rel.startswith('.') else './'+rel
                    return f'{m.group(1)}{m.group(2)}{rel}{m.group(2)}'
            return m.group(0)
        else:
            r=resolve(spec,file)
            if r and r in targets:
                return f'{m.group(1)}{m.group(2)}@vedic-patro/domain/{targets[r]}{m.group(2)}'
            return m.group(0)
    s=spec_re.sub(rep,s)
    if s!=o: open(file,'w').write(s)
def walk(root,indomain=False):
    for dp,dn,fn in os.walk(root):
        dn[:]=[d for d in dn if d not in('node_modules','.expo','dist','.turbo','build')]
        for f in fn:
            if f.endswith(exts): process(os.path.join(dp,f),indomain)
walk(W); walk(M); walk(D,True)
# json moved files: importers use relative ./x.json inside moved ts which still resolve
print('moved',rels)
